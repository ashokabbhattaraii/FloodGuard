#!/usr/bin/env bash
# Tiered security groups: EB instances accept web traffic, RDS accepts Postgres
# ONLY from the EB security group plus the operator's IP for prisma push/seed.
# Note: no 0.0.0.0/0 on 5432. The Task #2 Lambdas never touch Postgres directly
# (the monolith owns RDS), which is precisely what lets this stay closed.
source "$(dirname "$0")/../lib/common.sh"
state_require VPC_ID

sg_id() { aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$1" "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null | grep -v '^None$' || true; }

ensure_sg() {
  local name="$1" desc="$2" id
  id="$(sg_id "$name")"
  if [[ -z "$id" ]]; then
    id="$(aws ec2 create-security-group --group-name "$name" --description "$desc" \
      --vpc-id "$VPC_ID" \
      --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$name},{Key=Project,Value=$PROJECT}]" \
      --query 'GroupId' --output text)"
    ok "created $name $id" >&2
  else
    skip "sg $name $id" >&2
  fi
  printf '%s' "$id"
}

log "Security groups"
EB_SG="$(ensure_sg "$PROJECT-eb-sg"  "FloodGuard Elastic Beanstalk instances + ALB")"
RDS_SG="$(ensure_sg "$PROJECT-rds-sg" "FloodGuard RDS PostgreSQL")"
state_set EB_SG "$EB_SG"
state_set RDS_SG "$RDS_SG"

log "Ingress rules"
# Web tier: HTTP/HTTPS from anywhere (CloudFront fronts this; ALB terminates).
for port in 80 443; do
  tolerate_exists aws ec2 authorize-security-group-ingress --group-id "$EB_SG" \
    --protocol tcp --port "$port" --cidr 0.0.0.0/0 >/dev/null && ok "eb-sg :$port from 0.0.0.0/0"
done

# Data tier: reference the SG, not a CIDR, so it survives instance replacement.
tolerate_exists aws ec2 authorize-security-group-ingress --group-id "$RDS_SG" \
  --protocol tcp --port 5432 --source-group "$EB_SG" >/dev/null \
  && ok "rds-sg :5432 from $PROJECT-eb-sg"

# Operator IP: needed for `prisma db push` and seeding from a laptop.
IP="$(my_ip)" || die "could not determine your public IP"
if aws ec2 describe-security-groups --group-ids "$RDS_SG" \
     --query 'SecurityGroups[0].IpPermissions[].IpRanges[].CidrIp' --output text | grep -qw "$IP/32"; then
  skip "rds-sg :5432 from $IP/32"
else
  aws ec2 authorize-security-group-ingress --group-id "$RDS_SG" \
    --protocol tcp --port 5432 --cidr "$IP/32" >/dev/null
  ok "rds-sg :5432 from $IP/32 (operator)"
fi
state_set OPERATOR_IP "$IP"

warn "if local prisma commands start timing out later, your ISP changed your IP — re-run: ./deploy.sh 11"
