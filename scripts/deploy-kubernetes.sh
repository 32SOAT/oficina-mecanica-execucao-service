#!/usr/bin/env bash
set -Eeuo pipefail

service_name=oficina-execution
namespace=oficina-mecanica
base_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../kubernetes/base" && pwd)"
: "${IMAGE_REF:?IMAGE_REF is required}"
[[ "$IMAGE_REF" =~ ^[0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com/[a-z0-9/_-]+@sha256:[0-9a-f]{64}$ ]] || { echo 'Invalid ECR image digest' >&2; exit 1; }
[[ "$IMAGE_REF" == */oficina-mecanica-execucao-service@sha256:* ]] || { echo 'ECR repository does not belong to this service' >&2; exit 1; }
for required in DYNAMODB_REGION DYNAMODB_TABLE DYNAMODB_SAGA_COMMANDS_TABLE SQS_COMMANDS_QUEUE_URL SQS_RESULTS_QUEUE_URL SQS_WORKER_ENABLED SAGA_TOKEN; do
  [[ -n "${!required:-}" ]] || { echo "Missing deployment variable: $required" >&2; exit 1; }
done
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
umask 077
printf 'NODE_ENV=production\nAPP_PORT=3000\n' > "$work_dir/config.env"
for key in DYNAMODB_REGION DYNAMODB_TABLE DYNAMODB_SAGA_COMMANDS_TABLE SQS_COMMANDS_QUEUE_URL SQS_RESULTS_QUEUE_URL SQS_WORKER_ENABLED; do printf '%s=%s\n' "$key" "${!key}" >> "$work_dir/config.env"; done
printf 'SQS_REGION=%s\n' "${AWS_REGION}" >> "$work_dir/config.env"
printf 'SAGA_TOKEN=%s\n' "$SAGA_TOKEN" >> "$work_dir/secret.env"
kubectl -n "$namespace" create configmap "$service_name-config" --from-env-file="$work_dir/config.env" --dry-run=client -o yaml | kubectl apply -f -
kubectl -n "$namespace" create secret generic "$service_name-secret" --from-env-file="$work_dir/secret.env" --dry-run=client -o yaml | kubectl apply -f -
kubectl -n "$namespace" apply -f "$base_dir/service-account.yaml"
: "${SERVICE_ROLE_ARN:?SERVICE_ROLE_ARN is required for SQS and DynamoDB}"
kubectl -n "$namespace" annotate serviceaccount "$service_name" eks.amazonaws.com/role-arn="$SERVICE_ROLE_ARN" --overwrite
sed "s|image: oficina-execution$|image: $IMAGE_REF|" "$base_dir/deployment.yaml" > "$work_dir/deployment.yaml"
kubectl -n "$namespace" apply -f "$base_dir/service.yaml"
kubectl -n "$namespace" apply -f "$work_dir/deployment.yaml"
kubectl -n "$namespace" rollout status "deployment/oficina-execution" --timeout=5m
kubectl -n "$namespace" run "oficina-execution-smoke-${GITHUB_RUN_ID:-local}" --image=curlimages/curl:8.11.1 --restart=Never --rm -i --quiet -- \
  curl --fail --silent --show-error "http://oficina-execution/api/v1/health" >/dev/null
