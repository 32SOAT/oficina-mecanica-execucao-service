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
  AWS_ACCESS_KEY_ID: Joi.string().default('local'),
  AWS_SECRET_ACCESS_KEY: Joi.string().default('local'),
  SAGA_TOKEN: Joi.string().default('oficina-local'),
});
