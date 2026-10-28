import { EtapaExecucao, ExecucaoItem } from './execucao.entity';

export interface ExecucaoStore {
  findOne(osId: string, etapa: EtapaExecucao): Promise<ExecucaoItem | null>;
  save(item: ExecucaoItem): Promise<ExecucaoItem>;
  findByOs(osId: string): Promise<ExecucaoItem[]>;
}

export const EXECUCAO_STORE = Symbol('EXECUCAO_STORE');
