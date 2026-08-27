#!/usr/bin/env bash
# Two buckets:
#   uploads   — user report photos, written via presigned URL, read by fg-image-process
#   artifacts — versioned EB application bundles and Lambda zips
source "$(dirname "$0")/../lib/common.sh"

ensure_bucket() {
  local b="$1"
  if aws s3api head-bucket --bucket "$b" >/dev/null 2>&1; then
    skip "bucket $b" >&2
  else
    # us-east-1 must NOT pass a LocationConstraint — the API rejects it.
    if [[ "$AWS_REGION" == "us-east-1" ]]; then
      aws s3api create-bucket --bucket "$b" >/dev/null
    else
      aws s3api create-bucket --bucket "$b" --region "$AWS_REGION" \
        --create-bucket-configuration "LocationConstraint=$AWS_REGION" >/dev/null
    fi
    ok "created bucket $b" >&2
  fi
  # Buckets are private; browsers reach objects only through presigned URLs.
  aws s3api put-public-access-block --bucket "$b" \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
  aws s3api put-bucket-encryption --bucket "$b" --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  aws s3api put-bucket-tagging --bucket "$b" \
    --tagging "TagSet=[{Key=Project,Value=$PROJECT}]"
}

log "Uploads bucket"
ensure_bucket "$S3_UPLOADS_BUCKET"
# The browser PUTs directly to S3 using a presigned URL, so S3 itself must
# answer the CORS preflight — the API's CORS config does not cover this hop.
aws s3api put-bucket-cors --bucket "$S3_UPLOADS_BUCKET" --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT","GET","HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }]
}'
ok "CORS configured for presigned PUT"

log "Artifacts bucket"
ensure_bucket "$S3_ARTIFACTS_BUCKET"
aws s3api put-bucket-versioning --bucket "$S3_ARTIFACTS_BUCKET" \
  --versioning-configuration Status=Enabled
# Old build bundles have no value after a month; expire them to keep costs at zero.
aws s3api put-bucket-lifecycle-configuration --bucket "$S3_ARTIFACTS_BUCKET" \
  --lifecycle-configuration '{"Rules":[{"ID":"expire-old-builds","Status":"Enabled","Filter":{"Prefix":""},"Expiration":{"Days":30},"NoncurrentVersionExpiration":{"NoncurrentDays":7}}]}'
ok "versioning + 30-day lifecycle configured"

state_set S3_UPLOADS "$S3_UPLOADS_BUCKET"
state_set S3_ARTIFACTS "$S3_ARTIFACTS_BUCKET"
