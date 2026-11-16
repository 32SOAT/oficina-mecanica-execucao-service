import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiProperty,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

export class AbrirExecucaoRequestDto {
  @ApiProperty({ format: 'uuid' })
  osId: string;

  @ApiProperty({ enum: ['DIAGNOSTICO', 'REPARO'] })
  etapa: 'DIAGNOSTICO' | 'REPARO';
}

export class ConcluirExecucaoRequestDto {
  @ApiProperty({ enum: ['DIAGNOSTICO', 'REPARO'] })
  etapa: 'DIAGNOSTICO' | 'REPARO';
}

export class ExecucaoOpenApiDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  osId: string;

  @ApiProperty({ enum: ['DIAGNOSTICO', 'REPARO'] })
  etapa: 'DIAGNOSTICO' | 'REPARO';

  @ApiProperty({ enum: ['ABERTA', 'CONCLUIDA'] })
  status: 'ABERTA' | 'CONCLUIDA';

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export function ApiExecucaoDataResponse(
  type: Type<unknown>,
  description: string,
  options: { isArray?: boolean; status?: number } = {},
) {
  const { isArray = false, status = 200 } = options;
  return applyDecorators(
    ApiExtraModels(type),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        properties: {
          data: isArray
            ? { type: 'array', items: { $ref: getSchemaPath(type) } }
            : { $ref: getSchemaPath(type) },
        },
        required: ['data'],
      },
    }),
  );
}
