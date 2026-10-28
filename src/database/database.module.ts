import { Module } from '@nestjs/common';
import { EXECUCAO_STORE } from '../fila/execucao.store';
import { DynamoDbExecucaoStore } from './dynamodb-execucao.store';

@Module({
  providers: [
    DynamoDbExecucaoStore,
    {
      provide: EXECUCAO_STORE,
      useExisting: DynamoDbExecucaoStore,
    },
  ],
  exports: [EXECUCAO_STORE],
})
export class DatabaseModule {}
