#!/usr/bin/env bash
# Build the Next.js frontend locally and ship the standalone output.
#
# CRITICAL: NEXT_PUBLIC_* variables are inlined by Next at BUILD time. Task #1 set
# NEXT_PUBLIC_API_URL in frontend/.ebextensions/env.config, which never reached
# browser code at all — by the time the instance read that env var, the bundle had
# already been compiled with the fallback. It must be exported before `next build`.
#
# The value is the RELATIVE path "/api": the browser then calls the same origin it
# loaded from, and CloudFront routes /api/* to the backend. That means no CORS
# preflight, and no frontend rebuild when a domain changes.
source "$(dirname "$0")/../lib/common.sh"
source "$INFRA_DIR/lib/eb.sh"
state_require S3_ARTIFACTS
require_tools zip jq

FRONTEND="$REPO_DIR/frontend"
LABEL="frontend-$(date -u +%Y%m%d-%H%M%S)"
ZIP="$BUILD_DIR/${LABEL}.zip"
API_BASE="/api"

# npm, NOT pnpm, for the frontend specifically.
#
# `output: standalone` traces the dependency graph and copies what it finds into
# .next/standalone/node_modules. pnpm's store is symlink-based, so that copy
# reproduces pnpm's layout: a .pnpm/ directory plus top-level symlinks. Packages
# that are transitive-only — @swc/helpers, pulled in by Next's SWC transform
# output — never get a top-level entry, so the compiled app cannot resolve them
# and the instance dies on startup with:
#     Error: Cannot find module '@swc/helpers/_/_interop_require_default'
# which surfaces as a bare nginx 502 and a Red environment.
#
# npm's flat/hoisted node_modules is what standalone tracing assumes.
# package-lock.json is committed for exactly this build.
log "Installing frontend dependencies (npm — see comment on standalone tracing)"
if [[ -d "$FRONTEND/node_modules" && ! -d "$FRONTEND/node_modules/.pnpm" ]]; then
  skip "npm node_modules present"
else
  [[ -d "$FRONTEND/node_modules/.pnpm" ]] && {
    warn "removing pnpm-linked node_modules — incompatible with output:'standalone'"
    rm -rf "$FRONTEND/node_modules"
  }
  (cd "$FRONTEND" && npm install --no-audit --no-fund) >/dev/null || die "npm install failed"
  ok "installed"
fi

log "Building Next.js (NEXT_PUBLIC_API_URL=$API_BASE inlined now)"
rm -rf "$FRONTEND/.next"
(cd "$FRONTEND" && NEXT_PUBLIC_API_URL="$API_BASE" NODE_ENV=production npm run build) \
  || die "next build failed"

# Guard the exact failure above: assert the module actually resolves before we
# ship a bundle that would 502 on the instance.
[[ -e "$FRONTEND/.next/standalone/node_modules/@swc/helpers/package.json" ]] \
  || die "standalone bundle is missing @swc/helpers — node_modules layout is wrong (pnpm?), delete frontend/node_modules and re-run"
[[ -f "$FRONTEND/.next/standalone/server.js" ]] \
  || die "expected .next/standalone/server.js — is output:'standalone' still set in next.config.ts?"
ok "standalone server built"

log "Packaging bundle"
# `output: standalone` emits a self-contained server but deliberately omits static
# assets and public/ — they must be copied in or every CSS/JS/image 404s.
STAGE="$BUILD_DIR/frontend-stage"
rm -rf "$STAGE" "$ZIP"; mkdir -p "$STAGE/.ebextensions"
cp -r "$FRONTEND/.next/standalone/." "$STAGE/"
mkdir -p "$STAGE/.next/static"
cp -r "$FRONTEND/.next/static/." "$STAGE/.next/static/"
[[ -d "$FRONTEND/public" ]] && cp -r "$FRONTEND/public" "$STAGE/public"

# The standalone server already bundles its dependencies, so it starts directly —
# no npm install on the instance at all.
cat > "$STAGE/Procfile" <<'CFG'
web: node server.js
CFG

cat > "$STAGE/.ebextensions/01-platform.config" <<'CFG'
option_settings:
  aws:elasticbeanstalk:command:
    Timeout: "1800"
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /
CFG

(cd "$STAGE" && zip -qr "$ZIP" .)
ok "bundle $(du -h "$ZIP" | cut -f1)"

log "Elastic Beanstalk application"
if aws elasticbeanstalk describe-applications --application-names "$EB_APP_FRONTEND" \
     --query 'Applications[0].ApplicationName' --output text 2>/dev/null | grep -qw "$EB_APP_FRONTEND"; then
  skip "application $EB_APP_FRONTEND"
else
  aws elasticbeanstalk create-application --application-name "$EB_APP_FRONTEND" \
    --description "FloodGuard Next.js web app" >/dev/null
  ok "created application $EB_APP_FRONTEND"
fi

VERSION="$(eb_publish_version "$EB_APP_FRONTEND" "$ZIP" "$LABEL")"

ENV_KV="$(jq -n --arg api "$API_BASE" \
  '{NODE_ENV:"production", PORT:"8080", NEXT_PUBLIC_API_URL:$api}')"
OPTS="$BUILD_DIR/eb-frontend-options.json"
eb_option_settings "$EB_ENV_TYPE_FRONTEND" "$EB_INSTANCE_TYPE_FRONTEND" "/" \
  "$(eb_env_settings "$ENV_KV")" "$OPTS"
ok "$(jq 'length' "$OPTS") option settings prepared ($EB_ENV_TYPE_FRONTEND)"

PLATFORM_ARN="$(aws elasticbeanstalk list-platform-versions \
  --filters 'Type=PlatformName,Operator=contains,Values=Node.js' \
  --query "PlatformSummaryList[?contains(PlatformArn,'Node.js 22') && PlatformStatus=='Ready'] | [0].PlatformArn" \
  --output text)"

STATUS="$(eb_env_status "$EB_ENV_FRONTEND")"
if [[ -z "$STATUS" ]]; then
  log "Creating environment $EB_ENV_FRONTEND"
  aws elasticbeanstalk create-environment \
    --application-name "$EB_APP_FRONTEND" --environment-name "$EB_ENV_FRONTEND" \
    --platform-arn "$PLATFORM_ARN" --version-label "$VERSION" \
    --option-settings "file://$OPTS" >/dev/null
  ok "environment creation started (5-10 min)"
else
  log "Updating environment $EB_ENV_FRONTEND (status: $STATUS)"
  [[ "$STATUS" == "Ready" ]] || eb_wait_ready "$EB_ENV_FRONTEND"
  aws elasticbeanstalk update-environment \
    --environment-name "$EB_ENV_FRONTEND" --version-label "$VERSION" \
    --option-settings "file://$OPTS" >/dev/null
  ok "update started"
fi

eb_wait_ready "$EB_ENV_FRONTEND"
CNAME="$(aws elasticbeanstalk describe-environments --environment-names "$EB_ENV_FRONTEND" \
  --query 'Environments[?Status!=`Terminated`].CNAME' --output text)"
state_set EB_FRONTEND_CNAME "$CNAME"
state_set EB_FRONTEND_VERSION "$VERSION"
ok "frontend at http://${CNAME}"

log "Smoke test"
for i in $(seq 1 20); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://${CNAME}/" || true)"
  [[ "$CODE" == "200" ]] && { ok "GET / -> 200"; break; }
  ((i == 20)) && die "frontend never returned 200 (last: $CODE)"
  sleep 10
done
