import { EtapaExecucao, ExecucaoItem } from './execucao.entity';
import { SagaResultMessage } from '../saga/saga-message';

export type PersistedSagaCommand = {
  fingerprint: string;
  result: SagaResultMessage;
};

export type SagaExecutionMutation =
  | { kind: 'OPEN'; item: ExecucaoItem }
  | { kind: 'COMPLETE'; item: ExecucaoItem }
  | null;

export type CommitSagaCommandInput = {
  commandId: string;
  fingerprint: string;
  result: SagaResultMessage;
  mutation: SagaExecutionMutation;
};

export interface ExecucaoStore {
  findOne(osId: string, etapa: EtapaExecucao): Promise<ExecucaoItem | null>;
  save(item: ExecucaoItem): Promise<ExecucaoItem>;
  findByOs(osId: string): Promise<ExecucaoItem[]>;
  findSagaCommand(commandId: string): Promise<PersistedSagaCommand | null>;
  commitSagaCommand(input: CommitSagaCommandInput): Promise<void>;
}

export const EXECUCAO_STORE = Symbol('EXECUCAO_STORE');
