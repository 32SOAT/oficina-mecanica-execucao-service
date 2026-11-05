import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EtapaExecucao, ExecucaoItem } from './execucao.entity';
import { EXECUCAO_STORE, ExecucaoStore } from './execucao.store';

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
}
