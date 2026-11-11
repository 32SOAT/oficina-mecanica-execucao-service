import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDbExecucaoStore } from './dynamodb-execucao.store';
import { SagaResultMessage } from '../saga/saga-message';

describe('DynamoDbExecucaoStore Saga transactions', () => {
  afterEach(() => jest.restoreAllMocks());

  it('writes the execution transition and command result marker atomically', async () => {
    const send = jest
      .spyOn(DynamoDBDocumentClient.prototype, 'send')
      .mockResolvedValue({} as never);
    const store = new DynamoDbExecucaoStore();
    const result: SagaResultMessage = {
      messageId: '00000000-0000-4000-8000-000000000006',
      commandId: '00000000-0000-4000-8000-000000000002',
      sagaId: '00000000-0000-4000-8000-000000000003',
      osId: '00000000-0000-4000-8000-000000000004',
      occurredAt: '2026-11-08T10:01:00.000Z',
      correlationId: '00000000-0000-4000-8000-000000000003',
      causationId: '00000000-0000-4000-8000-000000000001',
      schemaVersion: 1,
      type: 'SAGA_STEP_RESULT',
      outcome: 'CONCLUIDA',
      payload: {},
    };

    await store.commitSagaCommand({
      commandId: result.commandId,
      fingerprint: 'fingerprint',
      result,
      mutation: {
        kind: 'OPEN',
        item: {
          id: '00000000-0000-4000-8000-000000000007',
          osId: result.osId,
          etapa: 'DIAGNOSTICO',
          status: 'ABERTA',
          createdAt: result.occurredAt,
          updatedAt: result.occurredAt,
        },
      },
    });

    expect(send).toHaveBeenCalledTimes(1);
    const transaction = send.mock.calls[0][0] as TransactWriteCommand;
    expect(transaction).toBeInstanceOf(TransactWriteCommand);
    expect(transaction.input.TransactItems).toHaveLength(2);
    expect(transaction.input.TransactItems?.[0].Put?.ConditionExpression).toBe(
      'attribute_not_exists(osId)',
    );
    expect(transaction.input.TransactItems?.[1].Put?.ConditionExpression).toBe(
      'attribute_not_exists(commandId)',
    );
  });

  it('conditions completion on the current execution being open', async () => {
    const send = jest
      .spyOn(DynamoDBDocumentClient.prototype, 'send')
      .mockResolvedValue({} as never);
    const store = new DynamoDbExecucaoStore();
    const result: SagaResultMessage = {
      messageId: '00000000-0000-4000-8000-000000000006',
      commandId: '00000000-0000-4000-8000-000000000002',
      sagaId: '00000000-0000-4000-8000-000000000003',
      osId: '00000000-0000-4000-8000-000000000004',
      occurredAt: '2026-11-08T10:01:00.000Z',
      correlationId: '00000000-0000-4000-8000-000000000003',
      causationId: '00000000-0000-4000-8000-000000000001',
      schemaVersion: 1,
      type: 'SAGA_STEP_RESULT',
      outcome: 'CONCLUIDA',
      payload: {},
    };

    await store.commitSagaCommand({
      commandId: result.commandId,
      fingerprint: 'fingerprint',
      result,
      mutation: {
        kind: 'COMPLETE',
        item: {
          id: '00000000-0000-4000-8000-000000000007',
          osId: result.osId,
          etapa: 'DIAGNOSTICO',
          status: 'CONCLUIDA',
          createdAt: result.occurredAt,
          updatedAt: result.occurredAt,
        },
      },
    });

    const transaction = send.mock.calls[0][0] as TransactWriteCommand;
    expect(transaction.input.TransactItems?.[0].Update?.ConditionExpression).toBe(
      '#status = :expectedStatus',
    );
    expect(
      transaction.input.TransactItems?.[0].Update?.ExpressionAttributeValues,
    ).toMatchObject({ ':expectedStatus': 'ABERTA', ':status': 'CONCLUIDA' });
    expect(transaction.input.TransactItems).toHaveLength(2);
  });
});
