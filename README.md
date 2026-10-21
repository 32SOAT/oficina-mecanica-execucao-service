# Execução Service

Esqueleto NestJS do microsserviço `execucao-service` da oficina mecânica.

Dono da fila de execução: diagnóstico, reparo e aviso de conclusão ou falha para o serviço de OS.

DynamoDB próprio, ainda não ligado. A tabela entra neste repositório quando as responsabilidades saírem do monólito.

A regra de negócio ainda está no monólito `oficina-mecanica-api` e será transferida para cá.

## Stack

NestJS 11 · TypeScript · Pino · Swagger · Jest · ESLint · Docker

## Execução local

```bash
npm install
copy .env.example .env
npm run start:dev
```

- Health: http://localhost:3003/api/v1/health
- Swagger: http://localhost:3003/api

## Testes

```bash
npm test
npm run test:cov
npm run test:e2e
npm run lint:check
```
