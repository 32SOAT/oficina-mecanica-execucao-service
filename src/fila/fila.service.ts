import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EtapaExecucao, ExecucaoItem } from './execucao.entity';
import { EXECUCAO_STORE, ExecucaoStore } from './execucao.store';
import {
  SagaCommandMessage,
  SagaCommandType,
  SagaResultMessage,
} from '../saga/saga-message';
import {
  createSagaResult,
  sagaCommandFingerprint,
} from '../saga/saga-command.utils';

@Injectable()
export class FilaService {
  constructor(
    @Inject(EXECUCAO_STORE)
    private readonly execucoes: ExecucaoStore,
  ) {}

  async abrir(osId: string, etapa: EtapaExecucao): Promise<ExecucaoItem> {
    const existente = await this.execucoes.findOne(osId, etapa);
    if (existente) return existente;
    const agora = new Date().toISOString();
    return this.execucoes.save({
      id: randomUUID(),
      osId,
      etapa,
      status: 'ABERTA',
      createdAt: agora,
      updatedAt: agora,
    });
  }

  async concluir(osId: string, etapa: EtapaExecucao): Promise<ExecucaoItem> {
    const execucao = await this.execucoes.findOne(osId, etapa);
    if (!execucao) {
      throw new NotFoundException(`${etapa} não encontrada para a OS`);
    }
    return this.execucoes.save({
      ...execucao,
      status: 'CONCLUIDA',
      updatedAt: new Date().toISOString(),
    });
  }

  listar(osId: string): Promise<ExecucaoItem[]> {
    return this.execucoes.findByOs(osId);
  }

  async processSagaCommand(
    command: SagaCommandMessage,
  ): Promise<SagaResultMessage> {
    const fingerprint = sagaCommandFingerprint(command);
    const previous = await this.execucoes.findSagaCommand(command.commandId);
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        throw new Error('commandId reutilizado com conteúdo diferente');
      }
      return previous.result;
    }

    const decision = await this.decideSagaCommand(command);
    const result =
      decision.failure === undefined
        ? createSagaResult(command, {
            outcome: 'CONCLUIDA',
            payload: {},
          })
        : createSagaResult(command, {
            outcome: 'FALHA',
            payload: decision.failure,
          });

    await this.execucoes.commitSagaCommand({
      commandId: command.commandId,
      fingerprint,
      result,
      mutation: decision.mutation,
    });
    return result;
  }

  private async decideSagaCommand(command: SagaCommandMessage): Promise<{
    mutation: import('./execucao.store').SagaExecutionMutation;
    failure?: { code: string; message: string; retryable: boolean };
  }> {
    if (
      command.type !== SagaCommandType.ExecutionOpen &&
      command.type !== SagaCommandType.ExecutionComplete &&
      command.type !== SagaCommandType.ExecutionReopen
    ) {
      return {
        mutation: null,
        failure: {
          code: 'COMANDO_NAO_SUPORTADO',
          message: 'Comando não suportado pela Execução',
          retryable: false,
        },
      };
    }

    const etapa = command.payload.etapa;
    const existing = await this.execucoes.findOne(command.osId, etapa);
    if (command.type === SagaCommandType.ExecutionReopen) {
      if (!existing) {
        return {
          mutation: null,
          failure: {
            code: 'ETAPA_NAO_ENCONTRADA',
            message: 'Etapa não encontrada para compensação',
            retryable: false,
          },
        };
      }
      if (existing.status === 'ABERTA') return { mutation: null };
      if (existing.status !== 'CONCLUIDA') {
        return {
          mutation: null,
          failure: {
            code: 'ETAPA_ESTADO_INCOMPATIVEL',
            message: 'Estado atual não permite reabertura',
            retryable: false,
          },
        };
      }
      return {
        mutation: {
          kind: 'REOPEN',
          item: {
            ...existing,
            status: 'ABERTA',
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }
    if (command.type === SagaCommandType.ExecutionOpen) {
      if (existing?.status === 'ABERTA') {
        return { mutation: null };
      }
      if (existing?.status === 'CONCLUIDA') {
        return {
          mutation: null,
          failure: {
            code: 'ETAPA_JA_CONCLUIDA',
            message: 'Etapa já foi concluída e não pode ser reaberta',
            retryable: false,
          },
        };
      }
      if (existing) {
        return {
          mutation: null,
          failure: {
            code: 'ETAPA_ESTADO_INCOMPATIVEL',
            message: 'Estado atual da etapa não permite reabertura',
            retryable: false,
          },
        };
      }

      const now = new Date().toISOString();
      return {
        mutation: {
          kind: 'OPEN',
          item: {
            id: randomUUID(),
            osId: command.osId,
            etapa,
            status: 'ABERTA',
            createdAt: now,
            updatedAt: now,
          },
        },
      };
    }

    if (!existing) {
      return {
        mutation: null,
        failure: {
          code: 'ETAPA_NAO_ABERTA',
          message: 'Etapa não encontrada para a OS',
          retryable: false,
        },
      };
    }
    if (existing.status === 'CONCLUIDA') {
      return {
        mutation: null,
        failure: {
          code: 'ETAPA_JA_CONCLUIDA',
          message: 'Etapa já concluída por outro comando',
          retryable: false,
        },
      };
    }
    if (existing.status !== 'ABERTA') {
      return {
        mutation: null,
        failure: {
          code: 'ETAPA_ESTADO_INCOMPATIVEL',
          message: 'Estado atual da etapa não permite conclusão',
          retryable: false,
        },
      };
    }
    return {
      mutation: {
        kind: 'COMPLETE',
        item: {
          ...existing,
          status: 'CONCLUIDA',
          updatedAt: new Date().toISOString(),
        },
      },
    };
  }
}
