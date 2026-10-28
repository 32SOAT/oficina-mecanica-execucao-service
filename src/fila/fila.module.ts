import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FilaController } from './fila.controller';
import { FilaService } from './fila.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FilaController],
  providers: [FilaService],
})
export class FilaModule {}
