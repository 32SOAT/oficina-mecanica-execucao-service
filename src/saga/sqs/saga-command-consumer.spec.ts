import {
  DeleteMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { ConfigService } from '@nestjs/config';
import { SagaCommandConsumer } from './saga-command-consumer';
import { SagaCommandMessage } from '../saga-message';

const command: SagaCommandMessage = {
  messageId: '00000000-0000-4000-8000-000000000001',
  commandId: '00000000-0000-4000-8000-000000000002',
  sagaId: '00000000-0000-4000-8000-000000000003',
  osId: '00000000-0000-4000-8000-000000000004',
  occurredAt: '2026-11-08T10:00:00.000Z',
  correlationId: '00000000-0000-4000-8000-000000000003',
  causationId: null,
  schemaVersion: 1,
  type: 'EXECUTION_OPEN',
  payload: { etapa: 'DIAGNOSTICO' },
};

describe('Execution SagaCommandConsumer', () => {
  it('publishes a FIFO result before deleting the command message', async () => {
    const calls: string[] = [];
    const client = {
      send: jest.fn((input: unknown) => {
        if (input instanceof SendMessageCommand) calls.push('publish');
        if (input instanceof DeleteMessageCommand) calls.push('delete');
        return Promise.resolve({});
      }),
    };
    const handler = {
      processSagaCommand: jest.fn().mockResolvedValue({
        ...command,
        messageId: '00000000-0000-4000-8000-000000000006',
        causationId: command.messageId,
        type: 'SAGA_STEP_RESULT',
        outcome: 'CONCLUIDA',
        payload: {},
      }),
    };
    const consumer = new SagaCommandConsumer(
      client as unknown as SQSClient,
      handler as never,
      new ConfigService({
        sqs: {
          enabled: true,
          region: 'us-east-1',
          endpoint: 'http://localhost:4566',
          commandQueueUrl: 'commands',
          resultsQueueUrl: 'results',
          pollIntervalMs: 1000,
        },
      }),
    );

    await consumer.processMessage({
      Body: JSON.stringify(command),
      MessageId: 'sqs-id',
      ReceiptHandle: 'receipt',
    });

    expect(calls).toEqual(['publish', 'delete']);
    const publish = client.send.mock.calls[0][0] as SendMessageCommand;
    expect(publish.input.MessageGroupId).toBe(command.osId);
    expect(publish.input.MessageDeduplicationId).toBe(command.commandId);
  });

  it('does not delete the command when result publishing fails', async () => {
    const client = {
      send: jest
        .fn<Promise<unknown>, [unknown]>()
        .mockRejectedValue(new Error('unavailable')),
    };
    const handler = {
      processSagaCommand: jest.fn().mockResolvedValue({
        ...command,
        type: 'SAGA_STEP_RESULT',
        outcome: 'CONCLUIDA',
        payload: {},
      }),
    };
    const consumer = new SagaCommandConsumer(
      client as unknown as SQSClient,
      handler as never,
      new ConfigService({ sqs: { enabled: true } }),
    );

    await expect(
      consumer.processMessage({
        Body: JSON.stringify(command),
        MessageId: 'sqs-id',
        ReceiptHandle: 'receipt',
      }),
    ).rejects.toThrow('unavailable');
    expect(client.send).toHaveBeenCalledTimes(1);
    expect(client.send.mock.calls[0][0]).toBeInstanceOf(SendMessageCommand);
  });

  it('leaves malformed commands for SQS redrive', async () => {
    const client = { send: jest.fn() };
    const handler = { processSagaCommand: jest.fn() };
    const consumer = new SagaCommandConsumer(
      client as unknown as SQSClient,
      handler as never,
      new ConfigService({ sqs: { enabled: true } }),
    );

    await consumer.processMessage({
      Body: JSON.stringify({ ...command, schemaVersion: 99 }),
      MessageId: 'invalid',
      ReceiptHandle: 'receipt',
    });

    expect(handler.processSagaCommand).not.toHaveBeenCalled();
    expect(client.send).not.toHaveBeenCalled();
  });
});
