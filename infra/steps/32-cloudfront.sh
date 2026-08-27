#!/usr/bin/env bash
# ONE CloudFront distribution as the single public hostname, with path-based routing:
#
#   /*               -> Elastic Beanstalk frontend (Next.js)
#   /_next/static/*  -> same origin, but cached aggressively (immutable hashed assets)
#   /api/*           -> Elastic Beanstalk backend  (the Task #1 monolith)
#   /sl/*            -> API Gateway               (the Task #2 Lambdas; added in step 48)
#
# This is what makes moving API Gateway off the monolith work cleanly. Task #1 ran
# THREE distributions (two frontend, one backend) on separate hostnames, which
# forced CORS configuration and a frontend rebuild whenever a domain changed.
# One distribution with four behaviours gives same-origin requests instead.
source "$(dirname "$0")/../lib/common.sh"
state_require EB_BACKEND_CNAME EB_FRONTEND_CNAME
require_tools jq

# AWS managed policies — stable well-known IDs.
CACHE_DISABLED=4135ea2d-6df8-44a3-9df3-4b5a84be39ad
CACHE_OPTIMIZED=658327ea-f89d-4fab-a63d-7e88639e58f6
# Forwards everything EXCEPT Host. Forwarding the viewer's Host to an EB origin
# makes the ALB receive a hostname it does not serve, which 404s or loops.
ORIGIN_ALL_NO_HOST=b689b0a8-53d0-40ab-baf2-68738e2966ac

CALLER_REF="floodguard-$(state_get CLOUDFRONT_CALLER_REF || true)"
if [[ "$CALLER_REF" == "floodguard-" ]]; then
  CALLER_REF="floodguard-$(date -u +%Y%m%d%H%M%S)"
fi

EXISTING_ID="$(state_get CLOUDFRONT_ID)"
if [[ -n "$EXISTING_ID" ]] && aws cloudfront get-distribution --id "$EXISTING_ID" >/dev/null 2>&1; then
  skip "distribution $EXISTING_ID"
  DOMAIN="$(aws cloudfront get-distribution --id "$EXISTING_ID" \
    --query 'Distribution.DomainName' --output text)"
else
  log "Building distribution config"
  CONFIG="$BUILD_DIR/cloudfront-config.json"
  jq -n \
    --arg ref "$CALLER_REF" \
    --arg fe "$EB_FRONTEND_CNAME" \
    --arg be "$EB_BACKEND_CNAME" \
    --arg cd "$CACHE_DISABLED" \
    --arg co "$CACHE_OPTIMIZED" \
    --arg orp "$ORIGIN_ALL_NO_HOST" \
    '{
      CallerReference: $ref,
      Comment: "FloodGuard single front door (frontend + /api monolith + /sl serverless)",
      Enabled: true,
      HttpVersion: "http2and3",
      PriceClass: "PriceClass_100",
      Origins: {
        Quantity: 2,
        Items: [
          { Id: "eb-frontend", DomainName: $fe,
            CustomOriginConfig: { HTTPPort: 80, HTTPSPort: 443,
              OriginProtocolPolicy: "http-only",
              OriginSslProtocols: { Quantity: 1, Items: ["TLSv1.2"] },
              OriginReadTimeout: 30, OriginKeepaliveTimeout: 5 } },
          { Id: "eb-backend", DomainName: $be,
            CustomOriginConfig: { HTTPPort: 80, HTTPSPort: 443,
              OriginProtocolPolicy: "http-only",
              OriginSslProtocols: { Quantity: 1, Items: ["TLSv1.2"] },
              OriginReadTimeout: 60, OriginKeepaliveTimeout: 5 } }
        ]
      },
      DefaultCacheBehavior: {
        TargetOriginId: "eb-frontend",
        ViewerProtocolPolicy: "redirect-to-https",
        AllowedMethods: { Quantity: 7,
          Items: ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"],
          CachedMethods: { Quantity: 2, Items: ["GET","HEAD"] } },
        CachePolicyId: $cd,
        OriginRequestPolicyId: $orp,
        Compress: true
      },
      CacheBehaviors: {
        Quantity: 2,
        Items: [
          { PathPattern: "/_next/static/*",
            TargetOriginId: "eb-frontend",
            ViewerProtocolPolicy: "redirect-to-https",
            AllowedMethods: { Quantity: 2, Items: ["GET","HEAD"],
              CachedMethods: { Quantity: 2, Items: ["GET","HEAD"] } },
            CachePolicyId: $co,
            Compress: true },
          { PathPattern: "/api/*",
            TargetOriginId: "eb-backend",
            ViewerProtocolPolicy: "redirect-to-https",
            AllowedMethods: { Quantity: 7,
              Items: ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"],
              CachedMethods: { Quantity: 2, Items: ["GET","HEAD"] } },
            CachePolicyId: $cd,
            OriginRequestPolicyId: $orp,
            Compress: true }
        ]
      }
    }' > "$CONFIG"

  log "Creating distribution"
  RESULT="$(aws cloudfront create-distribution --distribution-config "file://$CONFIG")"
  EXISTING_ID="$(jq -r '.Distribution.Id' <<<"$RESULT")"
  DOMAIN="$(jq -r '.Distribution.DomainName' <<<"$RESULT")"
  state_set CLOUDFRONT_CALLER_REF "${CALLER_REF#floodguard-}"
  ok "created $EXISTING_ID ($DOMAIN)"
fi

state_set CLOUDFRONT_ID "$EXISTING_ID"
state_set CLOUDFRONT_DOMAIN "$DOMAIN"
state_set CLOUDFRONT_FRONTEND_URL "https://${DOMAIN}"
state_set CLOUDFRONT_BACKEND_URL "https://${DOMAIN}"

log "Waiting for edge propagation (typically 3-8 min)"
wait_for "distribution $EXISTING_ID to deploy" 1800 \
  aws cloudfront wait distribution-deployed --id "$EXISTING_ID"

log "Smoke tests through CloudFront"
for path in "/" "/api/health" "/api/public/stats"; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://${DOMAIN}${path}" || true)"
  if [[ "$CODE" == "200" ]]; then ok "GET $path -> 200"
  else warn "GET $path -> $CODE (edge caches can lag a minute; retry manually)"; fi
done

ok "single front door live: https://${DOMAIN}"
warn "re-run './deploy.sh 30 44' so the backend CORS list and the Lambdas' BACKEND_URL pick up HTTPS"
