export type EtapaExecucao = 'DIAGNOSTICO' | 'REPARO';
export type StatusExecucao = 'ABERTA' | 'CONCLUIDA';

export type ExecucaoItem = {
  id: string;
  osId: string;
  etapa: EtapaExecucao;
  status: StatusExecucao;
  createdAt: string;
  updatedAt: string;
};
