import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecucaoEntity } from './execucao.entity';
import { FilaController } from './fila.controller';
import { FilaService } from './fila.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExecucaoEntity])],
  controllers: [FilaController],
  providers: [FilaService],
})
export class FilaModule {}
