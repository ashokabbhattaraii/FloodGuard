#!/usr/bin/env bash
# Push the Prisma schema to RDS and seed reference data.
#
# Run from the operator's machine, not from EB. Compiling/migrating on a t3.small
# was the failure that wedged the Task #1 environment (see docs/deployment-guide.md
# "Deployment philosophy"). RDS is publicly accessible precisely so this works.
source "$(dirname "$0")/../lib/common.sh"
state_require RDS_ENDPOINT SECRET_ARN
require_tools pnpm psql

BACKEND="$REPO_DIR/backend"

log "Reading credentials from Secrets Manager"
SECRET_JSON="$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" \
  --query SecretString --output text)"
DB_PASSWORD="$(jq -r .db_password <<<"$SECRET_JSON")"
[[ -n "$DB_PASSWORD" && "$DB_PASSWORD" != "null" ]] || die "db_password missing from $SECRET_NAME"

# sslmode=require: RDS accepts plaintext by default, so this is what actually
# forces TLS on the wire. prisma.config.ts strips the param and configures the
# pg pool's ssl option itself, so both paths end up encrypted.
export DATABASE_URL="postgresql://${RDS_USER}:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/${RDS_DB_NAME}?sslmode=require"

log "Verifying connectivity"
PGPASSWORD="$DB_PASSWORD" psql "$DATABASE_URL" -tAc 'select 1' >/dev/null \
  || die "cannot reach $RDS_ENDPOINT — is your IP still allowed? re-run ./deploy.sh 11"
ok "connected to $RDS_DB_NAME"

log "Installing backend dependencies"
if [[ -d "$BACKEND/node_modules" ]]; then
  skip "node_modules present"
else
  (cd "$BACKEND" && pnpm install --frozen-lockfile) || die "pnpm install failed"
  ok "dependencies installed"
fi

log "Generating Prisma client"
(cd "$BACKEND" && pnpm prisma generate) >/dev/null || die "prisma generate failed"
ok "client generated"

log "Pushing schema"
TABLES_BEFORE="$(PGPASSWORD="$DB_PASSWORD" psql "$DATABASE_URL" -tAc \
  "select count(*) from information_schema.tables where table_schema='public'")"
(cd "$BACKEND" && pnpm prisma db push) || die "prisma db push failed"
TABLES_AFTER="$(PGPASSWORD="$DB_PASSWORD" psql "$DATABASE_URL" -tAc \
  "select count(*) from information_schema.tables where table_schema='public'")"
ok "schema in sync (tables: $TABLES_BEFORE -> $TABLES_AFTER)"

log "Seeding reference data"
USER_COUNT="$(PGPASSWORD="$DB_PASSWORD" psql "$DATABASE_URL" -tAc \
  'select count(*) from "users"' 2>/dev/null || echo 0)"
if [[ "${USER_COUNT:-0}" -gt 0 ]]; then
  skip "database already has $USER_COUNT users — not re-seeding (drop tables to reseed)"
else
  (cd "$BACKEND" && pnpm seed) || die "seed failed"
  ok "seeded"
fi

log "Row counts"
PGPASSWORD="$DB_PASSWORD" psql "$DATABASE_URL" -c "
  select 'users' t, count(*) n from \"users\"
  union all select 'regions', count(*) from \"regions\"
  union all select 'alerts',  count(*) from \"alerts\"
  union all select 'reports', count(*) from \"reports\"
  order by t;"

state_set DB_SCHEMA_APPLIED "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
