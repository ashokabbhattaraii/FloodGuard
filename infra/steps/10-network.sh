#!/usr/bin/env bash
# VPC, Internet Gateway, two public subnets across 2 AZs, public route table.
# Two AZs are mandatory: an RDS DB subnet group requires >=2, even single-AZ.
source "$(dirname "$0")/../lib/common.sh"

log "VPC"
VPC_ID="$(find_by_name_tag vpcs "$PROJECT-vpc" 'Vpcs[0].VpcId')"
if [[ -z "$VPC_ID" ]]; then
  VPC_ID="$(aws ec2 create-vpc --cidr-block "$VPC_CIDR" \
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$PROJECT-vpc},{Key=Project,Value=$PROJECT}]" \
    --query 'Vpc.VpcId' --output text)"
  ok "created $VPC_ID ($VPC_CIDR)"
else
  skip "vpc $VPC_ID"
fi
# RDS hands out a public DNS name only when both attributes are on.
aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames
aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support
state_set VPC_ID "$VPC_ID"

log "Internet Gateway"
IGW_ID="$(find_by_name_tag internet-gateways "$PROJECT-igw" 'InternetGateways[0].InternetGatewayId')"
if [[ -z "$IGW_ID" ]]; then
  IGW_ID="$(aws ec2 create-internet-gateway \
    --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$PROJECT-igw},{Key=Project,Value=$PROJECT}]" \
    --query 'InternetGateway.InternetGatewayId' --output text)"
  ok "created $IGW_ID"
else
  skip "igw $IGW_ID"
fi
tolerate_exists aws ec2 attach-internet-gateway --vpc-id "$VPC_ID" --internet-gateway-id "$IGW_ID" >/dev/null
state_set IGW_ID "$IGW_ID"

log "Subnets"
make_subnet() {
  local name="$1" cidr="$2" az="$3" out
  out="$(find_by_name_tag subnets "$name" 'Subnets[0].SubnetId')"
  if [[ -z "$out" ]]; then
    out="$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block "$cidr" \
      --availability-zone "$az" \
      --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$name},{Key=Project,Value=$PROJECT}]" \
      --query 'Subnet.SubnetId' --output text)"
    ok "created $name $out ($cidr in $az)" >&2
  else
    skip "subnet $name $out" >&2
  fi
  # "Public" also needs auto-assign public IPv4 so EB instances get addresses.
  aws ec2 modify-subnet-attribute --subnet-id "$out" --map-public-ip-on-launch
  printf '%s' "$out"
}
SUBNET_A="$(make_subnet "$PROJECT-public-1a" "$SUBNET_A_CIDR" "$AZ_A")"
SUBNET_B="$(make_subnet "$PROJECT-public-1b" "$SUBNET_B_CIDR" "$AZ_B")"
state_set SUBNET_A "$SUBNET_A"
state_set SUBNET_B "$SUBNET_B"

log "Route table"
RT_ID="$(find_by_name_tag route-tables "$PROJECT-public-rt" 'RouteTables[0].RouteTableId')"
if [[ -z "$RT_ID" ]]; then
  RT_ID="$(aws ec2 create-route-table --vpc-id "$VPC_ID" \
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$PROJECT-public-rt},{Key=Project,Value=$PROJECT}]" \
    --query 'RouteTable.RouteTableId' --output text)"
  ok "created $RT_ID"
else
  skip "route table $RT_ID"
fi
# A subnet is only truly public once 0.0.0.0/0 -> IGW exists AND it is associated.
tolerate_exists aws ec2 create-route --route-table-id "$RT_ID" \
  --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW_ID" >/dev/null
for s in "$SUBNET_A" "$SUBNET_B"; do
  if ! aws ec2 describe-route-tables --route-table-ids "$RT_ID" \
        --query 'RouteTables[0].Associations[].SubnetId' --output text | grep -qw "$s"; then
    aws ec2 associate-route-table --route-table-id "$RT_ID" --subnet-id "$s" >/dev/null
    ok "associated $s"
  else
    skip "association $s"
  fi
done
state_set ROUTE_TABLE_ID "$RT_ID"

ok "network ready: $VPC_ID with $SUBNET_A ($AZ_A) + $SUBNET_B ($AZ_B)"
