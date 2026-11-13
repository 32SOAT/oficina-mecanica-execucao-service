import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface AppConfig {
  environment: string;
  port: number;
  serviceName: string;
}

export const appConfig = registerAs('app', (): AppConfig => ({
  environment: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.APP_PORT ?? '3003', 10),
  serviceName: process.env.SERVICE_NAME ?? 'execucao-service',
}));

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  APP_PORT: Joi.number().default(3003),
  SERVICE_NAME: Joi.string().default('execucao-service'),
  DYNAMODB_ENDPOINT: Joi.string().uri().allow('').optional(),
  DYNAMODB_REGION: Joi.string().default('us-east-1'),
  DYNAMODB_TABLE: Joi.string().default('execucao'),
  DYNAMODB_SAGA_COMMANDS_TABLE: Joi.string().default('execucao_saga_commands'),
  AWS_ACCESS_KEY_ID: Joi.string().default('local'),
  AWS_SECRET_ACCESS_KEY: Joi.string().default('local'),
  SAGA_TOKEN: Joi.string().default('oficina-local'),
  SQS_WORKER_ENABLED: Joi.boolean().default(false),
  SQS_ENDPOINT_URL: Joi.string().uri().allow('').optional(),
  SQS_REGION: Joi.string().default('us-east-1'),
  SQS_COMMANDS_QUEUE_URL: Joi.when('SQS_WORKER_ENABLED', {
    is: true,
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().optional(),
  }),
  SQS_RESULTS_QUEUE_URL: Joi.when('SQS_WORKER_ENABLED', {
    is: true,
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().optional(),
  }),
});
