import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtapaExecucao, ExecucaoEntity } from './execucao.entity';

@Injectable()
export class FilaService {
  constructor(
    @InjectRepository(ExecucaoEntity)
    private readonly execucoes: Repository<ExecucaoEntity>,
  ) {}

  async abrir(osId: string, etapa: EtapaExecucao): Promise<ExecucaoEntity> {
    const existente = await this.execucoes.findOne({ where: { osId, etapa } });
    if (existente) return existente;
    return this.execucoes.save(
      this.execucoes.create({ osId, etapa, status: 'ABERTA' }),
    );
  }

  async concluir(osId: string, etapa: EtapaExecucao): Promise<ExecucaoEntity> {
    const execucao = await this.execucoes.findOne({ where: { osId, etapa } });
    if (!execucao) {
      throw new NotFoundException(`${etapa} não encontrada para a OS`);
    }
    execucao.status = 'CONCLUIDA';
    return this.execucoes.save(execucao);
  }

  listar(osId: string): Promise<ExecucaoEntity[]> {
    return this.execucoes.find({ where: { osId } });
  }
}
