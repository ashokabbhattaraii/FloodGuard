#!/usr/bin/env bash
# API Gateway REST API fronting the Lambda microservices.
#
# THIS IS THE RELOCATION. In the original diagram API Gateway sat in "Public Entry
# Points" pointing at the Elastic Beanstalk backend (arrow 3), behind a CloudFront
# distribution that already terminated TLS and routed to the same ALB — an extra
# hop with no capability added, and no part of the system actually made serverless.
# Here it fronts Lambda, which is what turns those functions into independently
# addressable microservices.
#
# REST API (v1), not HTTP API (v2), for one concrete reason: HTTP APIs do not
# support X-Ray. With v1 the trace map starts at the front door and runs
# API Gateway -> Lambda -> SQS -> Lambda -> SNS. With v2 the first segment is
# simply missing. The cost difference ($3.50 vs $1.00 per million) is irrelevant here.
#
# Resource paths are rooted at /sl so CloudFront can forward /sl/* with an origin
# path of /v1 and reach /v1/sl/... with no path rewriting (no CloudFront Function).
source "$(dirname "$0")/../lib/common.sh"
require_tools jq

ACC="$EXPECTED_ACCOUNT_ID"

log "REST API"
API_ID="$(aws apigateway get-rest-apis --query "items[?name=='${APIGW_NAME}'].id | [0]" --output text)"
if [[ -z "$API_ID" || "$API_ID" == "None" ]]; then
  API_ID="$(aws apigateway create-rest-api --name "$APIGW_NAME" \
    --description "FloodGuard serverless microservices (Task #2)" \
    --endpoint-configuration types=REGIONAL \
    --tags "Project=$PROJECT" \
    --query 'id' --output text)"
  ok "created $API_ID"
else
  skip "api $API_ID"
fi
state_set APIGW_ID "$API_ID"

ROOT_ID="$(aws apigateway get-resources --rest-api-id "$API_ID" \
  --query "items[?path=='/'].id | [0]" --output text)"

# Create (or find) a path segment under a parent resource.
ensure_resource() {
  local parent="$1" part="$2" full="$3" id
  id="$(aws apigateway get-resources --rest-api-id "$API_ID" --limit 500 \
    --query "items[?path=='${full}'].id | [0]" --output text)"
  if [[ -z "$id" || "$id" == "None" ]]; then
    id="$(aws apigateway create-resource --rest-api-id "$API_ID" \
      --parent-id "$parent" --path-part "$part" --query 'id' --output text)"
    ok "resource $full" >&2
  else
    skip "resource $full" >&2
  fi
  printf '%s' "$id"
}

# Wire POST <resource> -> Lambda via AWS_PROXY, plus a MOCK OPTIONS for preflight.
wire_lambda() {
  local resource_id="$1" fn="$2" path="$3"
  local fn_arn="arn:aws:lambda:${AWS_REGION}:${ACC}:function:${fn}"

  aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$resource_id" \
    --http-method POST --authorization-type NONE --no-api-key-required >/dev/null 2>&1 || true

  # AWS_PROXY passes the raw request through, so the handler owns routing and
  # response shape — no mapping templates to keep in sync with the code.
  aws apigateway put-integration --rest-api-id "$API_ID" --resource-id "$resource_id" \
    --http-method POST --type AWS_PROXY --integration-http-method POST \
    --uri "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${fn_arn}/invocations" \
    --timeout-in-millis 29000 >/dev/null

  # OPTIONS via MOCK so the API is directly usable from a browser even when not
  # being reached same-origin through CloudFront.
  aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$resource_id" \
    --http-method OPTIONS --authorization-type NONE >/dev/null 2>&1 || true
  aws apigateway put-integration --rest-api-id "$API_ID" --resource-id "$resource_id" \
    --http-method OPTIONS --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\":200}"}' >/dev/null
  aws apigateway put-method-response --rest-api-id "$API_ID" --resource-id "$resource_id" \
    --http-method OPTIONS --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Origin":true,"method.response.header.Access-Control-Allow-Headers":true,"method.response.header.Access-Control-Allow-Methods":true}' >/dev/null 2>&1 || true
  aws apigateway put-integration-response --rest-api-id "$API_ID" --resource-id "$resource_id" \
    --http-method OPTIONS --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'","method.response.header.Access-Control-Allow-Headers":"'"'"'content-type'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'POST,OPTIONS'"'"'"}' >/dev/null 2>&1 || true

  # Resource-based permission so API Gateway may invoke the function. Scoped to
  # this API and this method, not "any caller".
  aws lambda add-permission --function-name "$fn" \
    --statement-id "apigw-${fn}" --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${AWS_REGION}:${ACC}:${API_ID}/*/POST${path}" \
    >/dev/null 2>&1 || true

  ok "POST $path -> $fn"
}

log "Resources and integrations"
SL_ID="$(ensure_resource "$ROOT_ID" "sl" "/sl")"
REPORTS_ID="$(ensure_resource "$SL_ID" "reports" "/sl/reports")"
UPLOADS_ID="$(ensure_resource "$SL_ID" "uploads" "/sl/uploads")"
PRESIGN_ID="$(ensure_resource "$UPLOADS_ID" "presign" "/sl/uploads/presign")"

wire_lambda "$REPORTS_ID" fg-report-intake   "/sl/reports"
wire_lambda "$PRESIGN_ID" fg-upload-presign  "/sl/uploads/presign"

log "Deploying stage $APIGW_STAGE"
aws apigateway create-deployment --rest-api-id "$API_ID" --stage-name "$APIGW_STAGE" \
  --description "deployed $(date -u +%Y-%m-%dT%H:%M:%SZ)" >/dev/null
ok "deployment created"

# API Gateway execution logging is gated on an ACCOUNT-level (per region) role
# ARN, not a per-API setting. A fresh account has none, so enabling
# /*/*/logging/loglevel fails with "CloudWatch Logs role ARN must be set in
# account settings". This is a one-time bootstrap.
log "Account-level CloudWatch Logs role for API Gateway"
CW_ROLE="fg-apigw-cloudwatch-role"
if aws iam get-role --role-name "$CW_ROLE" >/dev/null 2>&1; then
  skip "role $CW_ROLE"
else
  aws iam create-role --role-name "$CW_ROLE" \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"apigateway.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
    --tags "Key=Project,Value=$PROJECT" >/dev/null
  ok "created $CW_ROLE"
fi
aws iam attach-role-policy --role-name "$CW_ROLE" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs >/dev/null 2>&1 || true

CW_ROLE_ARN="arn:aws:iam::${ACC}:role/${CW_ROLE}"
CURRENT_ROLE="$(aws apigateway get-account --query 'cloudwatchRoleArn' --output text 2>/dev/null)"
if [[ "$CURRENT_ROLE" == "$CW_ROLE_ARN" ]]; then
  skip "account cloudwatchRoleArn already set"
else
  # IAM propagation: API Gateway validates it can assume the role, which can fail
  # for a few seconds after creation.
  for attempt in 1 2 3 4 5 6; do
    if aws apigateway update-account \
         --patch-operations "op=replace,path=/cloudwatchRoleArn,value=${CW_ROLE_ARN}" >/dev/null 2>&1; then
      ok "account cloudwatchRoleArn set"
      break
    fi
    ((attempt == 6)) && die "could not set account cloudwatchRoleArn after 6 attempts"
    sleep 10
  done
fi

# X-Ray + detailed CloudWatch metrics on the stage. tracingEnabled is the setting
# HTTP APIs lack entirely, and metricsEnabled is what produces per-method
# Latency/4XX/5XX metrics for the dashboard in step 62.
aws apigateway update-stage --rest-api-id "$API_ID" --stage-name "$APIGW_STAGE" \
  --patch-operations \
    'op=replace,path=/tracingEnabled,value=true' \
    'op=replace,path=/*/*/metrics/enabled,value=true' \
    'op=replace,path=/*/*/logging/loglevel,value=INFO' \
    'op=replace,path=/*/*/logging/dataTrace,value=false' >/dev/null
ok "X-Ray tracing + detailed metrics enabled on stage"

ENDPOINT="https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${APIGW_STAGE}"
state_set APIGW_ENDPOINT "$ENDPOINT"
state_set APIGW_DOMAIN "${API_ID}.execute-api.${AWS_REGION}.amazonaws.com"
ok "API live at $ENDPOINT/sl/..."
