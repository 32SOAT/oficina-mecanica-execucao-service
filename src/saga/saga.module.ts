import { Module } from '@nestjs/common';
import { FilaModule } from '../fila/fila.module';
import { SagaCommandConsumer } from './sqs/saga-command-consumer';
import { SqsClientModule } from './sqs/sqs-client.module';

@Module({
  imports: [FilaModule, SqsClientModule],
  providers: [SagaCommandConsumer],
})
export class SagaModule {}
