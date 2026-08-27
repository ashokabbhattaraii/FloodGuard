#!/usr/bin/env bash
# Elastic Beanstalk needs two identities:
#   - a SERVICE role EB itself assumes (health checks, managed updates)
#   - an INSTANCE PROFILE the EC2 boxes assume (logs, S3 artifacts, our buckets)
source "$(dirname "$0")/../lib/common.sh"

trust_doc() { printf '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"%s"},"Action":"sts:AssumeRole"}]}' "$1"; }

ensure_role() {
  local name="$1" principal="$2"
  if aws iam get-role --role-name "$name" >/dev/null 2>&1; then
    skip "role $name" >&2
  else
    aws iam create-role --role-name "$name" \
      --assume-role-policy-document "$(trust_doc "$principal")" \
      --tags "Key=Project,Value=$PROJECT" >/dev/null
    ok "created role $name" >&2
  fi
}

attach() {
  local role="$1" arn="$2"
  if aws iam list-attached-role-policies --role-name "$role" \
       --query 'AttachedPolicies[].PolicyArn' --output text | grep -qw "$arn"; then
    skip "$role <- $(basename "$arn")" >&2
  else
    aws iam attach-role-policy --role-name "$role" --policy-arn "$arn" >&2
    ok "$role <- $(basename "$arn")" >&2
  fi
}

EB_SERVICE_ROLE="$PROJECT-eb-service-role"
EB_INSTANCE_ROLE="$PROJECT-eb-instance-role"

log "EB service role"
ensure_role "$EB_SERVICE_ROLE" elasticbeanstalk.amazonaws.com
attach "$EB_SERVICE_ROLE" arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkEnhancedHealth
attach "$EB_SERVICE_ROLE" arn:aws:iam::aws:policy/AWSElasticBeanstalkManagedUpdatesCustomerRolePolicy

log "EB instance role"
ensure_role "$EB_INSTANCE_ROLE" ec2.amazonaws.com
attach "$EB_INSTANCE_ROLE" arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier
attach "$EB_INSTANCE_ROLE" arn:aws:iam::aws:policy/AWSElasticBeanstalkWorkerTier
# X-Ray + CloudWatch agent so the NestJS monolith can emit traces and metrics.
attach "$EB_INSTANCE_ROLE" arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess
attach "$EB_INSTANCE_ROLE" arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

log "App permissions for instances (S3 uploads, SQS enqueue, SNS publish, Secrets)"
APP_POLICY="$PROJECT-eb-app-policy"
cat > "$BUILD_DIR/eb-app-policy.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "UploadsBucket",
      "Effect": "Allow",
      "Action": ["s3:PutObject","s3:GetObject","s3:DeleteObject"],
      "Resource": "arn:aws:s3:::${S3_UPLOADS_BUCKET}/*"
    },
    {
      "Sid": "EnqueueWork",
      "Effect": "Allow",
      "Action": ["sqs:SendMessage","sqs:GetQueueUrl","sqs:GetQueueAttributes"],
      "Resource": [
        "arn:aws:sqs:${AWS_REGION}:${EXPECTED_ACCOUNT_ID}:${SQS_FORECAST_QUEUE}",
        "arn:aws:sqs:${AWS_REGION}:${EXPECTED_ACCOUNT_ID}:${SQS_ALERT_QUEUE}"
      ]
    },
    {
      "Sid": "PublishAlerts",
      "Effect": "Allow",
      "Action": ["sns:Publish"],
      "Resource": "arn:aws:sns:${AWS_REGION}:${EXPECTED_ACCOUNT_ID}:${SNS_ALERTS_TOPIC}"
    },
    {
      "Sid": "ReadAppSecret",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:${AWS_REGION}:${EXPECTED_ACCOUNT_ID}:secret:${SECRET_NAME}*"
    }
  ]
}
JSON

POLICY_ARN="arn:aws:iam::${EXPECTED_ACCOUNT_ID}:policy/${APP_POLICY}"
if aws iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then
  # Replace the default version so policy edits actually take effect on re-run.
  aws iam create-policy-version --policy-arn "$POLICY_ARN" \
    --policy-document "file://$BUILD_DIR/eb-app-policy.json" --set-as-default >/dev/null 2>&1 \
    && ok "updated $APP_POLICY" || skip "policy $APP_POLICY unchanged"
  # IAM allows max 5 versions; prune the oldest non-default.
  for v in $(aws iam list-policy-versions --policy-arn "$POLICY_ARN" \
      --query 'reverse(sort_by(Versions[?IsDefaultVersion==`false`],&CreateDate))[4:].VersionId' --output text); do
    aws iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "$v" >/dev/null || true
  done
else
  aws iam create-policy --policy-name "$APP_POLICY" \
    --policy-document "file://$BUILD_DIR/eb-app-policy.json" >/dev/null
  ok "created $APP_POLICY"
fi
attach "$EB_INSTANCE_ROLE" "$POLICY_ARN"

log "Instance profile"
if aws iam get-instance-profile --instance-profile-name "$EB_INSTANCE_ROLE" >/dev/null 2>&1; then
  skip "instance profile $EB_INSTANCE_ROLE"
else
  aws iam create-instance-profile --instance-profile-name "$EB_INSTANCE_ROLE" >/dev/null
  ok "created instance profile $EB_INSTANCE_ROLE"
fi
if aws iam get-instance-profile --instance-profile-name "$EB_INSTANCE_ROLE" \
     --query 'InstanceProfile.Roles[].RoleName' --output text | grep -qw "$EB_INSTANCE_ROLE"; then
  skip "role attached to instance profile"
else
  aws iam add-role-to-instance-profile --instance-profile-name "$EB_INSTANCE_ROLE" \
    --role-name "$EB_INSTANCE_ROLE"
  ok "attached role to instance profile"
fi

state_set EB_SERVICE_ROLE "$EB_SERVICE_ROLE"
state_set EB_INSTANCE_PROFILE "$EB_INSTANCE_ROLE"
state_set EB_APP_POLICY_ARN "$POLICY_ARN"
