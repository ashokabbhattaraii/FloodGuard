#!/usr/bin/env bash
# Build the NestJS backend LOCALLY and ship a pre-built artifact.
#
# Never compile on the instance: `nest build` on a t3.small pegs CPU/RAM, the EB
# command hangs ~35 min, the deploy aborts and the environment can wedge so badly
# that the control plane stops accepting abort/update (see docs/deployment-guide.md
# "Deployment philosophy"). The instance only runs `npm install --production`.
source "$(dirname "$0")/../lib/common.sh"
source "$INFRA_DIR/lib/eb.sh"
state_require RDS_ENDPOINT SECRET_ARN S3_ARTIFACTS
require_tools pnpm zip jq

BACKEND="$REPO_DIR/backend"
LABEL="backend-$(date -u +%Y%m%d-%H%M%S)"
ZIP="$BUILD_DIR/${LABEL}.zip"

log "Compiling TypeScript"
(cd "$BACKEND" && pnpm install --frozen-lockfile >/dev/null && pnpm build) || die "backend build failed"
[[ -f "$BACKEND/dist/src/main.js" ]] || die "expected dist/src/main.js — check nest-cli.json outDir"
ok "dist/src/main.js built"

log "Packaging bundle"
rm -f "$ZIP"
# .ebextensions is regenerated below with NO secrets in it; the committed copy in
# Task #1 carried the live DB password and JWT secret into git history.
STAGE="$BUILD_DIR/backend-stage"
rm -rf "$STAGE"; mkdir -p "$STAGE/.ebextensions"
cp -r "$BACKEND/dist" "$STAGE/dist"
cp -r "$BACKEND/prisma" "$STAGE/prisma"
cp "$BACKEND/package.json" "$BACKEND/Procfile" "$BACKEND/Buildfile" "$STAGE/"
cp "$BACKEND/prisma.config.ts" "$STAGE/" 2>/dev/null || true
cp "$BACKEND/.npmrc" "$STAGE/" 2>/dev/null || true

cat > "$STAGE/.ebextensions/01-platform.config" <<'CFG'
# Non-secret platform configuration only.
# All credentials arrive as environment properties set via update-environment
# from Secrets Manager, so nothing sensitive is committed or shipped in the bundle.
option_settings:
  aws:elasticbeanstalk:command:
    Timeout: "1800"
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /api/health
CFG

(cd "$STAGE" && zip -qr "$ZIP" . -x '*.map')
ok "bundle $(du -h "$ZIP" | cut -f1)"

log "Elastic Beanstalk application"
if aws elasticbeanstalk describe-applications --application-names "$EB_APP_BACKEND" \
     --query 'Applications[0].ApplicationName' --output text 2>/dev/null | grep -qw "$EB_APP_BACKEND"; then
  skip "application $EB_APP_BACKEND"
else
  aws elasticbeanstalk create-application --application-name "$EB_APP_BACKEND" \
    --description "FloodGuard NestJS API" >/dev/null
  ok "created application $EB_APP_BACKEND"
fi

VERSION="$(eb_publish_version "$EB_APP_BACKEND" "$ZIP" "$LABEL")"

log "Resolving runtime configuration"
SECRET_JSON="$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --query SecretString --output text)"
DB_PASSWORD="$(jq -r .db_password <<<"$SECRET_JSON")"
JWT_SECRET="$(jq -r .jwt_secret <<<"$SECRET_JSON")"
INTERNAL_KEY="$(jq -r .internal_api_key <<<"$SECRET_JSON")"

# CORS origins: filled in properly once CloudFront exists (step 32 re-runs this).
FRONTEND_ORIGINS="$(state_get CLOUDFRONT_FRONTEND_URL)"
FRONTEND_ORIGINS="${FRONTEND_ORIGINS:+${FRONTEND_ORIGINS},}http://localhost:3000,http://localhost:3001"

ENV_KV="$(jq -n \
  --arg dburl "postgresql://${RDS_USER}:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/${RDS_DB_NAME}?sslmode=require" \
  --arg jwt "$JWT_SECRET" \
  --arg ikey "$INTERNAL_KEY" \
  --arg origins "$FRONTEND_ORIGINS" \
  --arg region "$AWS_REGION" \
  --arg bucket "$S3_UPLOADS_BUCKET" \
  --arg topic "$(state_get SNS_ALERTS_ARN)" \
  '{
     DATABASE_URL: $dburl,
     JWT_SECRET: $jwt,
     JWT_EXPIRES_IN: "7d",
     INTERNAL_API_KEY: $ikey,
     FRONTEND_URL: $origins,
     NODE_ENV: "production",
     PORT: "8080",
     AWS_REGION: $region,
     S3_BUCKET: $bucket,
     SNS_TOPIC_ARN: $topic,
     FLOOD_MONITOR_ENABLED: "false",
     AWS_XRAY_TRACING_NAME: "floodguard-backend"
   }')"

OPTS="$BUILD_DIR/eb-backend-options.json"
eb_option_settings "$EB_ENV_TYPE_BACKEND" "$EB_INSTANCE_TYPE_BACKEND" "/api/health" \
  "$(eb_env_settings "$ENV_KV")" "$OPTS"
ok "$(jq 'length' "$OPTS") option settings prepared (FLOOD_MONITOR_ENABLED=false)"

PLATFORM_ARN="$(aws elasticbeanstalk list-platform-versions \
  --filters 'Type=PlatformName,Operator=contains,Values=Node.js' \
  --query "PlatformSummaryList[?contains(PlatformArn,'Node.js 22') && PlatformStatus=='Ready'] | [0].PlatformArn" \
  --output text)"
[[ -n "$PLATFORM_ARN" && "$PLATFORM_ARN" != "None" ]] || die "no Ready Node.js 22 platform found"

STATUS="$(eb_env_status "$EB_ENV_BACKEND")"
if [[ -z "$STATUS" ]]; then
  log "Creating environment $EB_ENV_BACKEND ($EB_ENV_TYPE_BACKEND, $EB_INSTANCE_TYPE_BACKEND)"
  aws elasticbeanstalk create-environment \
    --application-name "$EB_APP_BACKEND" --environment-name "$EB_ENV_BACKEND" \
    --platform-arn "$PLATFORM_ARN" --version-label "$VERSION" \
    --option-settings "file://$OPTS" >/dev/null
  ok "environment creation started (5-10 min)"
else
  log "Updating environment $EB_ENV_BACKEND (current status: $STATUS)"
  [[ "$STATUS" == "Ready" ]] || eb_wait_ready "$EB_ENV_BACKEND"
  aws elasticbeanstalk update-environment \
    --environment-name "$EB_ENV_BACKEND" --version-label "$VERSION" \
    --option-settings "file://$OPTS" >/dev/null
  ok "update started"
fi

eb_wait_ready "$EB_ENV_BACKEND"

CNAME="$(aws elasticbeanstalk describe-environments --environment-names "$EB_ENV_BACKEND" \
  --query 'Environments[?Status!=`Terminated`].CNAME' --output text)"
HEALTH="$(aws elasticbeanstalk describe-environments --environment-names "$EB_ENV_BACKEND" \
  --query 'Environments[?Status!=`Terminated`].Health' --output text)"
state_set EB_BACKEND_CNAME "$CNAME"
state_set EB_BACKEND_VERSION "$VERSION"
ok "backend at http://${CNAME} (health: $HEALTH)"

log "Smoke test"
for i in $(seq 1 20); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://${CNAME}/api/health" || true)"
  [[ "$CODE" == "200" ]] && { ok "GET /api/health -> 200"; break; }
  ((i == 20)) && die "health check never returned 200 (last: $CODE) — check: aws elasticbeanstalk retrieve-environment-info"
  sleep 10
done
