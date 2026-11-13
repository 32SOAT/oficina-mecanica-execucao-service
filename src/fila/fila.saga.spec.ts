import { FilaService } from './fila.service';
import { CommitSagaCommandInput, ExecucaoStore } from './execucao.store';
import { SagaCommandMessage, SagaResultMessage } from '../saga/saga-message';
import { sagaCommandFingerprint } from '../saga/saga-command.utils';

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

describe('FilaService Saga commands', () => {
  it('opens an execution step and stores its command result idempotently', async () => {
    const commitSagaCommand = jest
      .fn<Promise<void>, [CommitSagaCommandInput]>()
      .mockResolvedValue(undefined);
    const store: ExecucaoStore = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
      findByOs: jest.fn().mockResolvedValue([]),
      findSagaCommand: jest.fn().mockResolvedValue(null),
      commitSagaCommand,
    };
    const service = new FilaService(store);

    const result = await service.processSagaCommand(command);

    expect(result.outcome).toBe('CONCLUIDA');
    expect(commitSagaCommand).toHaveBeenCalledTimes(1);
    expect(commitSagaCommand.mock.calls[0][0]).toMatchObject({
      commandId: command.commandId,
      mutation: { kind: 'OPEN', item: { status: 'ABERTA' } },
    });
  });

  it('returns a previously persisted result without applying the command again', async () => {
    const findOne = jest.fn();
    const commitSagaCommand = jest.fn();
    const priorResult: SagaResultMessage = {
      messageId: '00000000-0000-4000-8000-000000000006',
      commandId: command.commandId,
      sagaId: command.sagaId,
      osId: command.osId,
      occurredAt: '2026-11-08T10:01:00.000Z',
      correlationId: command.correlationId,
      causationId: command.messageId,
      schemaVersion: 1,
      type: 'SAGA_STEP_RESULT',
      outcome: 'CONCLUIDA',
      payload: {},
    };
    const store: ExecucaoStore = {
      findOne,
      save: jest.fn(),
      findByOs: jest.fn(),
      findSagaCommand: jest.fn().mockResolvedValue({
        fingerprint: sagaCommandFingerprint(command),
        result: priorResult,
      }),
      commitSagaCommand,
    };
    const service = new FilaService(store);

    await expect(service.processSagaCommand(command)).resolves.toEqual(
      priorResult,
    );
    expect(findOne).not.toHaveBeenCalled();
    expect(commitSagaCommand).not.toHaveBeenCalled();
  });

  it('records an incompatible completion as a non-retryable result without changing execution state', async () => {
    const commitSagaCommand = jest
      .fn<Promise<void>, [CommitSagaCommandInput]>()
      .mockResolvedValue(undefined);
    const store: ExecucaoStore = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
      findByOs: jest.fn().mockResolvedValue([]),
      findSagaCommand: jest.fn().mockResolvedValue(null),
      commitSagaCommand,
    };
    const service = new FilaService(store);
    const completion = {
      ...command,
      type: 'EXECUTION_COMPLETE',
      payload: { etapa: 'DIAGNOSTICO' },
    } as SagaCommandMessage;

    const result = await service.processSagaCommand(completion);

    expect(result.outcome).toBe('FALHA');
    if (result.outcome === 'FALHA')
      expect(result.payload.retryable).toBe(false);
    expect(commitSagaCommand).toHaveBeenCalledTimes(1);
    expect(commitSagaCommand.mock.calls[0][0]).toMatchObject({
      commandId: command.commandId,
      mutation: null,
    });
  });

  it('rejects reuse of a commandId for another command payload', async () => {
    const store: ExecucaoStore = {
      findOne: jest.fn(),
      save: jest.fn(),
      findByOs: jest.fn(),
      findSagaCommand: jest.fn().mockResolvedValue({
        fingerprint: 'different-fingerprint',
        result: {} as SagaResultMessage,
      }),
      commitSagaCommand: jest.fn(),
    };
    const service = new FilaService(store);

    await expect(service.processSagaCommand(command)).rejects.toThrow(
      'commandId reutilizado com conteúdo diferente',
    );
  });

  it('completes an open step through the transactional mutation', async () => {
    const commitSagaCommand = jest
      .fn<Promise<void>, [CommitSagaCommandInput]>()
      .mockResolvedValue(undefined);
    const store: ExecucaoStore = {
      findOne: jest.fn().mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000007',
        osId: command.osId,
        etapa: 'DIAGNOSTICO',
        status: 'ABERTA',
        createdAt: command.occurredAt,
        updatedAt: command.occurredAt,
      }),
      save: jest.fn(),
      findByOs: jest.fn().mockResolvedValue([]),
      findSagaCommand: jest.fn().mockResolvedValue(null),
      commitSagaCommand,
    };
    const service = new FilaService(store);

    const result = await service.processSagaCommand({
      ...command,
      type: 'EXECUTION_COMPLETE',
    });

    expect(result.outcome).toBe('CONCLUIDA');
    expect(commitSagaCommand).toHaveBeenCalledTimes(1);
    expect(commitSagaCommand.mock.calls[0][0]).toMatchObject({
      mutation: { kind: 'COMPLETE', item: { status: 'CONCLUIDA' } },
    });
  });

  it('does not reopen a completed step', async () => {
    const commitSagaCommand = jest
      .fn<Promise<void>, [CommitSagaCommandInput]>()
      .mockResolvedValue(undefined);
    const store: ExecucaoStore = {
      findOne: jest.fn().mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000007',
        osId: command.osId,
        etapa: 'DIAGNOSTICO',
        status: 'CONCLUIDA',
        createdAt: command.occurredAt,
        updatedAt: command.occurredAt,
      }),
      save: jest.fn(),
      findByOs: jest.fn().mockResolvedValue([]),
      findSagaCommand: jest.fn().mockResolvedValue(null),
      commitSagaCommand,
    };
    const service = new FilaService(store);

    const result = await service.processSagaCommand(command);

    expect(result.outcome).toBe('FALHA');
    expect(commitSagaCommand).toHaveBeenCalledTimes(1);
    expect(commitSagaCommand.mock.calls[0][0]).toMatchObject({
      mutation: null,
    });
  });

  it('reopens a completed execution stage as an idempotent Saga compensation', async () => {
    const commitSagaCommand = jest
      .fn<Promise<void>, [CommitSagaCommandInput]>()
      .mockResolvedValue(undefined);
    const store: ExecucaoStore = {
      findOne: jest.fn().mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000007',
        osId: command.osId,
        etapa: 'DIAGNOSTICO',
        status: 'CONCLUIDA',
        createdAt: command.occurredAt,
        updatedAt: command.occurredAt,
      }),
      save: jest.fn(),
      findByOs: jest.fn(),
      findSagaCommand: jest.fn().mockResolvedValue(null),
      commitSagaCommand,
    };
    const result = await new FilaService(store).processSagaCommand({
      ...command,
      type: 'EXECUTION_REOPEN',
    });
    expect(result.outcome).toBe('CONCLUIDA');
    expect(commitSagaCommand.mock.calls[0][0]).toMatchObject({
      mutation: { kind: 'REOPEN', item: { status: 'ABERTA' } },
    });
  });

  it('does not create a missing execution stage during compensation', async () => {
    const commitSagaCommand = jest
      .fn<Promise<void>, [CommitSagaCommandInput]>()
      .mockResolvedValue(undefined);
    const store: ExecucaoStore = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
      findByOs: jest.fn(),
      findSagaCommand: jest.fn().mockResolvedValue(null),
      commitSagaCommand,
    };
    const result = await new FilaService(store).processSagaCommand({
      ...command,
      type: 'EXECUTION_REOPEN',
    });
    expect(result.outcome).toBe('FALHA');
    expect(commitSagaCommand.mock.calls[0][0]).toMatchObject({
      mutation: null,
    });
  });

  it('rejects a new completion command for an already completed stage', async () => {
    const store: ExecucaoStore = {
      findOne: jest.fn().mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000007',
        osId: command.osId,
        etapa: 'DIAGNOSTICO',
        status: 'CONCLUIDA',
        createdAt: command.occurredAt,
        updatedAt: command.occurredAt,
      }),
      save: jest.fn(),
      findByOs: jest.fn(),
      findSagaCommand: jest.fn().mockResolvedValue(null),
      commitSagaCommand: jest.fn(),
    };
    const result = await new FilaService(store).processSagaCommand({
      ...command,
      type: 'EXECUTION_COMPLETE',
    });
    expect(result.outcome).toBe('FALHA');
  });
});
