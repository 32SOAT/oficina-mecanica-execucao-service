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

No Kubernetes são usadas as tabelas exclusivas `oficina-execution-<ambiente>` e `oficina-execution-saga-commands-<ambiente>`. O pod usa a role IAM do ServiceAccount `oficina-execution`, sem credenciais locais; o endpoint local de DynamoDB deve ficar vazio em AWS. A role precisa das ações DynamoDB de criação/consulta/leitura/escrita/transação somente nessas duas tabelas.

## Deploy Kubernetes independente

Os recursos AWS próprios e a ordem de configuração estão em [infra/aws/README.md](infra/aws/README.md). Cada ambiente tem state Terraform e ECR separados; execute o apply apenas após revisão da infraestrutura.

`.github/workflows/deploy.yml` valida lint/cobertura/build, publica uma imagem imutável no ECR e faz o rollout em `homolog`/`main` quando `DEPLOY_ENABLED=true` nas variables do repositório. Configure `AWS_REGION`, `AWS_ACCOUNT_ID`, `EKS_CLUSTER_NAME`, `DEPLOY_ROLE_ARN`, `SERVICE_ROLE_ARN`, `ECR_REPOSITORY_URL`, `SQS_COMMANDS_QUEUE_URL` e `SQS_RESULTS_QUEUE_URL` como variables e `SAGA_TOKEN` como secret. ECR, roles OIDC, namespace, filas e permissões DynamoDB precisam existir antes da ativação. O Service Kubernetes é interno (`ClusterIP`).

O worker da Saga cria a tabela `execucao_saga_commands` (configurável por `DYNAMODB_SAGA_COMMANDS_TABLE`) para deduplicar `commandId` e guardar o resultado. A gravação do marcador e a abertura/conclusão de etapa são feitas em uma única transação DynamoDB.

## Mensageria da Saga

O worker SQS aceita abrir, concluir e reabrir diagnóstico/reparo. `EXECUTION_REOPEN` é a compensação enviada pela OS quando a etapa seguinte do Billing falha; ela muda `CONCLUIDA` para `ABERTA` somente com atualização condicional. A mudança na tabela `execucao` e o marcador idempotente por `commandId` são gravados na mesma transação DynamoDB. Em uma redelivery ele reutiliza o resultado persistido; só confirma a mensagem depois de publicar o resultado na fila da OS. Mensagens inválidas seguem para a DLQ pela política de redrive.

Uma nova conclusão com outro `commandId` para etapa já `CONCLUIDA` retorna falha de negócio. O replay do comando original retorna seu resultado gravado, sem repetir a mutação.

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
