import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Execução Service')
    .setDescription(
      'O worker consome comandos e publica resultados por SQS. As rotas HTTP internas de execução estão marcadas como legadas e exigem x-saga-token; o estado da Saga deve ser consultado na API da OS.',
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-saga-token',
        description: 'Token para as rotas HTTP internas legadas da Execução.',
      },
      'SagaToken',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
}
