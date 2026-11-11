import {
  CreateTableCommand,
  DynamoDBClient,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EtapaExecucao, ExecucaoItem } from '../fila/execucao.entity';
import {
  CommitSagaCommandInput,
  ExecucaoStore,
  PersistedSagaCommand,
} from '../fila/execucao.store';

function tabelaJaExiste(error: unknown): boolean {
  return (
    error instanceof ResourceInUseException ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'ResourceInUseException')
  );
}

@Injectable()
export class DynamoDbExecucaoStore implements ExecucaoStore, OnModuleInit {
  private readonly table = process.env.DYNAMODB_TABLE ?? 'execucao';
  private readonly sagaCommandsTable =
    process.env.DYNAMODB_SAGA_COMMANDS_TABLE ?? 'execucao_saga_commands';
  private readonly client: DynamoDBClient;
  private readonly documents: DynamoDBDocumentClient;

  constructor() {
    this.client = new DynamoDBClient({
      region: process.env.DYNAMODB_REGION ?? 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'local',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
      },
    });
    this.documents = DynamoDBDocumentClient.from(this.client);
  }

  async onModuleInit(): Promise<void> {
    await this.ensureTable(
      this.table,
      [
        { AttributeName: 'osId', AttributeType: 'S' },
        { AttributeName: 'etapa', AttributeType: 'S' },
      ],
      [
        { AttributeName: 'osId', KeyType: 'HASH' },
        { AttributeName: 'etapa', KeyType: 'RANGE' },
      ],
    );
    await this.ensureTable(
      this.sagaCommandsTable,
      [{ AttributeName: 'commandId', AttributeType: 'S' }],
      [{ AttributeName: 'commandId', KeyType: 'HASH' }],
    );
  }

  private async ensureTable(
    tableName: string,
    attributes: Array<{ AttributeName: string; AttributeType: 'S' }>,
    keys: Array<{ AttributeName: string; KeyType: 'HASH' | 'RANGE' }>,
  ): Promise<void> {
    try {
      await this.client.send(
        new CreateTableCommand({
          TableName: tableName,
          BillingMode: 'PAY_PER_REQUEST',
          AttributeDefinitions: attributes,
          KeySchema: keys,
        }),
      );
    } catch (error) {
      if (tabelaJaExiste(error)) return;
      throw error;
    }
  }

  async findOne(
    osId: string,
    etapa: EtapaExecucao,
  ): Promise<ExecucaoItem | null> {
    const result = await this.documents.send(
      new GetCommand({
        TableName: this.table,
        Key: { osId, etapa },
      }),
    );
    return (result.Item as ExecucaoItem | undefined) ?? null;
  }

  async save(item: ExecucaoItem): Promise<ExecucaoItem> {
    await this.documents.send(
      new PutCommand({
        TableName: this.table,
        Item: item,
      }),
    );
    return item;
  }

  async findByOs(osId: string): Promise<ExecucaoItem[]> {
    const result = await this.documents.send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: 'osId = :osId',
        ExpressionAttributeValues: { ':osId': osId },
      }),
    );
    return (result.Items as ExecucaoItem[] | undefined) ?? [];
  }

  async findSagaCommand(
    commandId: string,
  ): Promise<PersistedSagaCommand | null> {
    const result = await this.documents.send(
      new GetCommand({
        TableName: this.sagaCommandsTable,
        Key: { commandId },
      }),
    );
    const item = result.Item as PersistedSagaCommand | undefined;
    return item ?? null;
  }

  async commitSagaCommand(input: CommitSagaCommandInput): Promise<void> {
    const transactions: NonNullable<
      ConstructorParameters<typeof TransactWriteCommand>[0]['TransactItems']
    > = [];

    if (input.mutation?.kind === 'OPEN') {
      transactions.push({
        Put: {
          TableName: this.table,
          Item: input.mutation.item,
          ConditionExpression: 'attribute_not_exists(osId)',
        },
      });
    }
    if (input.mutation?.kind === 'COMPLETE') {
      transactions.push({
        Update: {
          TableName: this.table,
          Key: {
            osId: input.mutation.item.osId,
            etapa: input.mutation.item.etapa,
          },
          UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
          ConditionExpression: '#status = :expectedStatus',
          ExpressionAttributeNames: {
            '#status': 'status',
            '#updatedAt': 'updatedAt',
          },
          ExpressionAttributeValues: {
            ':status': 'CONCLUIDA',
            ':updatedAt': input.mutation.item.updatedAt,
            ':expectedStatus': 'ABERTA',
          },
        },
      });
    }

    transactions.push({
      Put: {
        TableName: this.sagaCommandsTable,
        Item: {
          commandId: input.commandId,
          fingerprint: input.fingerprint,
          result: input.result,
        },
        ConditionExpression: 'attribute_not_exists(commandId)',
      },
    });
    await this.documents.send(
      new TransactWriteCommand({ TransactItems: transactions }),
    );
  }
}
