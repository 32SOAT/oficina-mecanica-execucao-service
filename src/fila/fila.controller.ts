import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiNotFoundResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { SagaTokenGuard } from '../saga/saga-token.guard';
import { FilaService } from './fila.service';
import {
  AbrirExecucaoRequestDto,
  ApiExecucaoDataResponse,
  ConcluirExecucaoRequestDto,
  ExecucaoOpenApiDto,
} from './fila.openapi';
import { EtapaExecucao } from './execucao.entity';

type AbrirExecucaoRequest = { osId: string; etapa: EtapaExecucao };
type ConcluirExecucaoRequest = { etapa: EtapaExecucao };

@ApiTags('Execução HTTP legada')
@ApiSecurity('SagaToken')
@UseGuards(SagaTokenGuard)
@Controller('execucoes')
export class FilaController {
  constructor(private readonly fila: FilaService) {}

  @Post()
  @ApiOperation({
    summary: 'Abrir etapa por HTTP (legado)',
    description:
      'A Saga atual envia EXECUTION_OPEN à fila SQS da Execução. Esta rota HTTP interna foi mantida para compatibilidade e não é chamada pela OS.',
    deprecated: true,
  })
  @ApiBody({ type: AbrirExecucaoRequestDto })
  @ApiExecucaoDataResponse(ExecucaoOpenApiDto, 'Etapa aberta (legado)', {
    status: 201,
  })
  abrir(@Body() dto: AbrirExecucaoRequest) {
    return this.fila.abrir(dto.osId, dto.etapa);
  }

  @Post(':osId/concluir')
  @ApiOperation({
    summary: 'Concluir etapa por HTTP (legado)',
    description:
      'A Saga atual envia EXECUTION_COMPLETE à fila SQS da Execução. Esta rota HTTP interna foi mantida para compatibilidade e não é chamada pela OS.',
    deprecated: true,
  })
  @ApiBody({ type: ConcluirExecucaoRequestDto })
  @ApiExecucaoDataResponse(ExecucaoOpenApiDto, 'Etapa concluída (legado)', {
    status: 201,
  })
  @ApiNotFoundResponse({ description: 'Etapa não encontrada para a OS.' })
  concluir(
    @Param('osId', ParseUUIDPipe) osId: string,
    @Body() dto: ConcluirExecucaoRequest,
  ) {
    return this.fila.concluir(osId, dto.etapa);
  }

  @Get(':osId')
  @ApiOperation({
    summary: 'Listar etapas por HTTP (legado interno)',
    description:
      'O estado técnico da orquestração deve ser consultado na API de Saga da OS. Esta rota retorna somente registros locais da Execução.',
    deprecated: true,
  })
  @ApiExecucaoDataResponse(ExecucaoOpenApiDto, 'Etapas da OS', {
    isArray: true,
  })
  listar(@Param('osId', ParseUUIDPipe) osId: string) {
    return this.fila.listar(osId);
  }
}
