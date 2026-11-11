# Execução Service

Dono do registro de trabalho da ordem: diagnóstico e reparo. Não é o catálogo de mão de obra e não é o dono do status da oficina.

A divisão dos três serviços e a razão de cada banco ficar na própria aplicação estão na ADR do OS Service: `oficina-mecanica-os-service/docs/adr/001-divisao-dos-servicos-e-banco-por-aplicacao.md`.

## O que fica aqui

- Uma etapa por ordem: `DIAGNOSTICO` ou `REPARO`.
- Situação da etapa: `ABERTA` ou `CONCLUIDA`.
- O worker SQS da Execução aplica os comandos da Saga usando `osId` e etapa. O serviço persiste o resultado idempotente por `commandId` e o devolve à fila da OS.

## O que não fica aqui

- O cadastro de serviço (nome e preço de mão de obra) fica na OS, porque esse preço compõe o orçamento.
- Estoque, cliente, veículo e status canônico ficam na OS.
- Orçamento e pagamento ficam no billing.
- Este serviço não dá baixa de peça e não decide se o carro pode ser entregue.

## Banco

DynamoDB neste repositório. Localmente o container `amazon/dynamodb-local` escuta a porta **8000**. A tabela `execucao` é criada na subida da aplicação, com chave `osId` + `etapa`. Na AWS o mesmo código usa a tabela real: basta não definir `DYNAMODB_ENDPOINT`. Não há conexão com o banco da OS nem com o do billing.

O worker da Saga cria a tabela `execucao_saga_commands` (configurável por `DYNAMODB_SAGA_COMMANDS_TABLE`) para deduplicar `commandId` e guardar o resultado. A gravação do marcador e a abertura/conclusão de etapa são feitas em uma única transação DynamoDB.

## Mensageria da Saga

O worker SQS aceita abrir e concluir diagnóstico/reparo. A mudança na tabela `execucao` e o marcador idempotente por `commandId` são gravados na mesma transação DynamoDB. Em uma redelivery ele reutiliza o resultado persistido; só confirma a mensagem depois de publicar o resultado na fila da OS. Mensagens inválidas seguem para a DLQ pela política de redrive.

O `.env.example` inclui endpoint, região e URLs das filas FIFO. Para iniciar o worker, defina `SQS_WORKER_ENABLED=true` depois de copiar o arquivo para `.env` e confirmar que filas, DLQs e permissões já estão disponíveis. Localmente, as filas são criadas pelo Floci no compose do OS Service (`docker compose up -d db floci`, dentro de `oficina-mecanica-os-service`). Em AWS, configure as URLs de saída do Terraform, deixe `SQS_ENDPOINT_URL` vazio/ausente e use a role IAM do serviço. A OS publica comandos pela outbox SQS. Consulte o [guia de operação da Saga](../oficina-mecanica-os-service/docs/operacao-saga-sqs.md) para a ordem de rollout, reconciliação e redrive seguro.

## Execução local

```bash
docker compose up -d
copy .env.example .env
npm install
npm run start:dev
```

- API: http://localhost:3003/api
- Health: http://localhost:3003/api/v1/health
- A OS envia comandos SQS para abrir `DIAGNOSTICO` e depois `REPARO`; o worker aplica as etapas no DynamoDB e publica os resultados para a fila da OS.
- A conclusão de cada etapa também chega por comando SQS, com o mesmo fluxo de resultado correlacionado.

As chamadas HTTP internas legadas, quando usadas diretamente, exigem `x-saga-token: oficina-local`; o fluxo da Saga usa IAM e filas SQS.
