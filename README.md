# Execução Service

Dono do registro de trabalho da ordem: diagnóstico e reparo. Não é o catálogo de mão de obra e não é o dono do status da oficina.

A divisão dos três serviços e a razão de cada banco ficar na própria aplicação estão na ADR do OS Service: `oficina-mecanica-os-service/docs/adr/001-divisao-dos-servicos-e-banco-por-aplicacao.md`.

## O que fica aqui

- Uma etapa por ordem: `DIAGNOSTICO` ou `REPARO`.
- Situação da etapa: `ABERTA` ou `CONCLUIDA`.
- A OS abre a etapa e a conclui. A chamada traz `osId` e a etapa, com o header `x-saga-token`.

## O que não fica aqui

- O cadastro de serviço (nome e preço de mão de obra) fica na OS, porque esse preço compõe o orçamento.
- Estoque, cliente, veículo e status canônico ficam na OS.
- Orçamento e pagamento ficam no billing.
- Este serviço não dá baixa de peça e não decide se o carro pode ser entregue.

## Banco

Postgres `oficina_execucao` neste repositório, porta **5434**. O schema é criado na subida da aplicação. Na AWS a persistência prevista é DynamoDB. O contrato local continua o mesmo: etapa e status por `osId`. Não há conexão com o banco da OS nem com o do billing.

## Execução local

```bash
docker compose up -d
copy .env.example .env
npm install
npm run start:dev
```

- API: http://localhost:3003/api
- Health: http://localhost:3003/api/v1/health
- A OS abre `DIAGNOSTICO` e depois `REPARO` em `POST /api/v1/execucoes`
- A OS conclui a etapa em `POST /api/v1/execucoes/:osId/concluir`

O header das chamadas é `x-saga-token: oficina-local`.
