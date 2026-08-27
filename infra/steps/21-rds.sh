#!/usr/bin/env bash
# RDS PostgreSQL: single-AZ db.t3.micro (free-tier eligible), publicly accessible
# so `prisma db push` and seeding can run from a laptop.
#
# The ChatGPT diagram showed "Multi-AZ standby". That is NOT free-tier: it roughly
# doubles instance cost for a standby you cannot query. Deliberately single-AZ here;
# the DB subnet group still spans 2 AZs (an AWS requirement) so Multi-AZ can be
# switched on later with one modify-db-instance call if the report needs it.
source "$(dirname "$0")/../lib/common.sh"
state_require VPC_ID SUBNET_A SUBNET_B RDS_SG SECRET_ARN

SUBNET_GROUP="$PROJECT-db-subnet-group"

log "DB subnet group"
if aws rds describe-db-subnet-groups --db-subnet-group-name "$SUBNET_GROUP" >/dev/null 2>&1; then
  skip "subnet group $SUBNET_GROUP"
else
  aws rds create-db-subnet-group --db-subnet-group-name "$SUBNET_GROUP" \
    --db-subnet-group-description "FloodGuard DB subnets (2 AZs)" \
    --subnet-ids "$SUBNET_A" "$SUBNET_B" \
    --tags "Key=Project,Value=$PROJECT" >/dev/null
  ok "created $SUBNET_GROUP spanning $AZ_A + $AZ_B"
fi

log "PostgreSQL instance"
if aws rds describe-db-instances --db-instance-identifier "$RDS_ID" >/dev/null 2>&1; then
  skip "db instance $RDS_ID"
else
  DB_PASSWORD="$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" \
    --query SecretString --output text | jq -r .db_password)"
  [[ -n "$DB_PASSWORD" && "$DB_PASSWORD" != "null" ]] || die "could not read db_password from $SECRET_NAME"

  aws rds create-db-instance \
    --db-instance-identifier "$RDS_ID" \
    --db-instance-class "$RDS_CLASS" \
    --engine postgres --engine-version "$RDS_ENGINE_VERSION" \
    --master-username "$RDS_USER" \
    --master-user-password "$DB_PASSWORD" \
    --db-name "$RDS_DB_NAME" \
    --allocated-storage "$RDS_STORAGE_GB" --storage-type gp3 \
    --no-multi-az \
    --db-subnet-group-name "$SUBNET_GROUP" \
    --vpc-security-group-ids "$RDS_SG" \
    --publicly-accessible \
    --backup-retention-period 1 \
    --no-auto-minor-version-upgrade \
    --no-deletion-protection \
    --no-enable-performance-insights \
    --tags "Key=Project,Value=$PROJECT" >/dev/null
  ok "creating $RDS_ID (postgres $RDS_ENGINE_VERSION, $RDS_CLASS) — this takes 5-10 min"
  unset DB_PASSWORD
fi

wait_for "RDS $RDS_ID to become available" 1200 \
  aws rds wait db-instance-available --db-instance-identifier "$RDS_ID"

ENDPOINT="$(aws rds describe-db-instances --db-instance-identifier "$RDS_ID" \
  --query 'DBInstances[0].Endpoint.Address' --output text)"
state_set RDS_ENDPOINT "$ENDPOINT"
state_set RDS_SUBNET_GROUP "$SUBNET_GROUP"
ok "RDS available at $ENDPOINT:5432/$RDS_DB_NAME"
