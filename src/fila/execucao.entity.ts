import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type EtapaExecucao = 'DIAGNOSTICO' | 'REPARO';
export type StatusExecucao = 'ABERTA' | 'CONCLUIDA';

@Entity('execucao')
@Unique(['osId', 'etapa'])
export class ExecucaoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  osId: string;

  @Column()
  etapa: EtapaExecucao;

  @Column({ default: 'ABERTA' })
  status: StatusExecucao;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
