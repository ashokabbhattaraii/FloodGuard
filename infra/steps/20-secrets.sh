#!/usr/bin/env bash
# Generate app secrets and store them in Secrets Manager.
# Task #1 committed the RDS password and JWT_SECRET into
# backend/.ebextensions/env.config (and therefore into git history).
# The new account is the moment to stop doing that: generated here, never printed,
# never written to a tracked file.
source "$(dirname "$0")/../lib/common.sh"

SECRET_ARN="$(aws secretsmanager describe-secret --secret-id "$SECRET_NAME" \
  --query 'ARN' --output text 2>/dev/null || true)"

if [[ -n "$SECRET_ARN" ]]; then
  skip "secret $SECRET_NAME already exists — reusing (delete it to rotate)"
else
  log "Generating credentials"
  # Alphanumeric only: RDS rejects '/', '@', '"' and space in master passwords,
  # and shell-special characters like '!' break .ebextensions interpolation.
  # Subshell disables pipefail: `head` closing the pipe SIGPIPEs `tr` (rc 141).
  gen() { ( set +o pipefail; LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c "$1" ); }
  DB_PASSWORD="$(gen 32)"
  JWT_SECRET="$(gen 48)"
  INTERNAL_API_KEY="$(gen 40)"   # authenticates Lambda -> NestJS internal calls

  PAYLOAD="$(jq -n \
    --arg db "$DB_PASSWORD" --arg jwt "$JWT_SECRET" --arg key "$INTERNAL_API_KEY" \
    --arg user "$RDS_USER" --arg dbname "$RDS_DB_NAME" \
    '{db_password:$db, jwt_secret:$jwt, internal_api_key:$key, db_user:$user, db_name:$dbname}')"

  SECRET_ARN="$(aws secretsmanager create-secret --name "$SECRET_NAME" \
    --description "FloodGuard application secrets (DB, JWT, internal service auth)" \
    --secret-string "$PAYLOAD" \
    --tags "Key=Project,Value=$PROJECT" \
    --query 'ARN' --output text)"
  ok "created secret $SECRET_NAME (values generated, not displayed)"
fi

state_set SECRET_ARN "$SECRET_ARN"
ok "secret ready — read it with: aws secretsmanager get-secret-value --secret-id $SECRET_NAME"
