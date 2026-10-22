import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SagaTokenGuard } from '../saga/saga-token.guard';
import { EtapaExecucao } from './execucao.entity';
import { FilaService } from './fila.service';

@ApiTags('Execução')
@UseGuards(SagaTokenGuard)
@Controller('execucoes')
export class FilaController {
  constructor(private readonly fila: FilaService) {}

  @Post()
  abrir(@Body() dto: { osId: string; etapa: EtapaExecucao }) {
    return this.fila.abrir(dto.osId, dto.etapa);
  }

  @Post(':osId/concluir')
  concluir(
    @Param('osId', ParseUUIDPipe) osId: string,
    @Body() dto: { etapa: EtapaExecucao },
  ) {
    return this.fila.concluir(osId, dto.etapa);
  }

  @Get(':osId')
  listar(@Param('osId', ParseUUIDPipe) osId: string) {
    return this.fila.listar(osId);
  }
}
