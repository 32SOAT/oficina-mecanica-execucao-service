import { isSagaCommandMessage, SagaCommandMessage } from './saga-message';

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

describe('Execution Saga command contract', () => {
  it('accepts a valid versioned Execution command', () => {
    expect(isSagaCommandMessage(command)).toBe(true);
  });

  it('accepts EXECUTION_REOPEN with a valid stage and rejects an empty payload', () => {
    expect(
      isSagaCommandMessage({
        ...command,
        type: 'EXECUTION_REOPEN',
        payload: { etapa: 'DIAGNOSTICO' },
      }),
    ).toBe(true);
    expect(
      isSagaCommandMessage({
        ...command,
        type: 'EXECUTION_REOPEN',
        payload: {},
      }),
    ).toBe(false);
  });

  it('rejects unknown versions, commands from another consumer, and bad steps', () => {
    expect(isSagaCommandMessage({ ...command, schemaVersion: 2 })).toBe(false);
    expect(
      isSagaCommandMessage({ ...command, type: 'BILLING_QUOTE_GENERATE' }),
    ).toBe(false);
    expect(
      isSagaCommandMessage({ ...command, payload: { etapa: 'PINTURA' } }),
    ).toBe(false);
    expect(
      isSagaCommandMessage({
        ...command,
        payload: { etapa: 'REPARO', extra: 1 },
      }),
    ).toBe(false);
  });
});
