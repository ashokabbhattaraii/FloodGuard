#!/usr/bin/env bash
# Add the API Gateway origin and the /sl/* behaviour to the existing distribution.
#
# Completes the single-front-door design:
#   /*      -> EB frontend      /api/*  -> EB backend (monolith)
#   /sl/*   -> API Gateway (Lambda microservices)
#
# The origin path is /v1 (the API Gateway stage) and the API's resources are rooted
# at /sl, so a viewer request for /sl/reports reaches /v1/sl/reports at the origin
# with no path rewriting — no CloudFront Function or Lambda@Edge needed.
source "$(dirname "$0")/../lib/common.sh"
state_require CLOUDFRONT_ID APIGW_DOMAIN
require_tools jq

CACHE_DISABLED=4135ea2d-6df8-44a3-9df3-4b5a84be39ad
# Host must NOT be forwarded: API Gateway routes on its own hostname and rejects
# a viewer Host header it does not recognise.
ORIGIN_ALL_NO_HOST=b689b0a8-53d0-40ab-baf2-68738e2966ac

log "Reading current distribution config"
aws cloudfront get-distribution-config --id "$CLOUDFRONT_ID" > "$BUILD_DIR/cf-current.json"
ETAG="$(jq -r '.ETag' "$BUILD_DIR/cf-current.json")"

if jq -e '.DistributionConfig.CacheBehaviors.Items[]? | select(.PathPattern=="/sl/*")' \
     "$BUILD_DIR/cf-current.json" >/dev/null; then
  skip "/sl/* behaviour already present"
  ok "serverless path already wired"
  exit 0
fi

# NOTE: every origin must carry CustomHeaders on UpdateDistribution, even when
# empty — omitting it fails with "The OriginCustomHeaders field is missing".
# CreateDistribution defaults it, which is why step 32 did not need it.
log "Adding apigw origin + /sl/* behaviour"
# UpdateDistribution demands the FULL canonical shape for every origin and cache
# behaviour — SmoothStreaming, FieldLevelEncryptionId, LambdaFunctionAssociations,
# TrustedSigners and friends must all be present, and it reports them one at a
# time. Rather than enumerate them, clone an existing element (created by
# CreateDistribution, which fills in every default) and override only what
# differs. This stays correct as CloudFront adds new required fields.
jq \
  --arg dom "$APIGW_DOMAIN" \
  --arg stage "/$APIGW_STAGE" \
  '.DistributionConfig as $cfg
   | ($cfg.Origins.Items[] | select(.Id == "eb-backend")) as $origin_tpl
   | ($cfg.CacheBehaviors.Items[] | select(.PathPattern == "/api/*")) as $behavior_tpl
   | $cfg
   | .Origins.Items += [
       $origin_tpl
       | .Id = "apigw-serverless"
       | .DomainName = $dom
       | .OriginPath = $stage
       | .CustomOriginConfig.OriginProtocolPolicy = "https-only"
       | .CustomOriginConfig.OriginReadTimeout = 30
     ]
   | .Origins.Quantity = (.Origins.Items | length)
   | .CacheBehaviors.Items += [
       $behavior_tpl
       | .PathPattern = "/sl/*"
       | .TargetOriginId = "apigw-serverless"
     ]
   | .CacheBehaviors.Quantity = (.CacheBehaviors.Items | length)' \
  "$BUILD_DIR/cf-current.json" > "$BUILD_DIR/cf-updated.json"

jq -e '.Origins.Items[] | select(.Id=="apigw-serverless")' "$BUILD_DIR/cf-updated.json" >/dev/null \
  || die "origin was not appended — did the eb-backend origin get renamed?"
ok "cloned eb-backend origin shape and /api/* behaviour shape"

aws cloudfront update-distribution --id "$CLOUDFRONT_ID" \
  --if-match "$ETAG" \
  --distribution-config "file://$BUILD_DIR/cf-updated.json" >/dev/null
ok "origin + behaviour added"

wait_for "distribution to redeploy" 1800 \
  aws cloudfront wait distribution-deployed --id "$CLOUDFRONT_ID"

DOMAIN="$(state_get CLOUDFRONT_DOMAIN)"
ok "serverless endpoints live:"
printf '      POST https://%s/sl/reports\n' "$DOMAIN"
printf '      POST https://%s/sl/uploads/presign\n' "$DOMAIN"
