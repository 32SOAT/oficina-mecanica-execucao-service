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
} from '@aws-sdk/lib-dynamodb';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EtapaExecucao, ExecucaoItem } from '../fila/execucao.entity';
import { ExecucaoStore } from '../fila/execucao.store';

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
    try {
      await this.client.send(
        new CreateTableCommand({
          TableName: this.table,
          BillingMode: 'PAY_PER_REQUEST',
          AttributeDefinitions: [
            { AttributeName: 'osId', AttributeType: 'S' },
            { AttributeName: 'etapa', AttributeType: 'S' },
          ],
          KeySchema: [
            { AttributeName: 'osId', KeyType: 'HASH' },
            { AttributeName: 'etapa', KeyType: 'RANGE' },
          ],
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
}
