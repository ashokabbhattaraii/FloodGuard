#!/usr/bin/env bash
# End-to-end verification + load generation.
#
# Two jobs:
#  1. Prove every hop of both pipelines actually works (not just that the
#     resources exist), and print a pass/fail table.
#  2. Generate enough real traffic that the CloudWatch dashboard and X-Ray service
#     map have data to evaluate — the brief asks for the system's performance to be
#     assessed, which needs measurements, not an idle dashboard.
source "$(dirname "$0")/../lib/common.sh"
state_require CLOUDFRONT_DOMAIN APIGW_ENDPOINT DDB_TABLE
require_tools jq curl

CF="https://$(state_get CLOUDFRONT_DOMAIN)"
PASS=0; FAIL=0
declare -a RESULTS

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    RESULTS+=("PASS|$name|$actual")
    ok "$name ($actual)"; ((PASS++)) || true
  else
    RESULTS+=("FAIL|$name|expected $expected, got $actual")
    warn "$name — expected $expected, got $actual"; ((FAIL++)) || true
  fi
}

http_code() { curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$@" || echo "000"; }

log "1. Front door routing (single hostname, three origins)"
check "GET /  -> frontend"            200 "$(http_code "$CF/")"
check "GET /api/health -> monolith"   200 "$(http_code "$CF/api/health")"
check "GET /api/public/stats"         200 "$(http_code "$CF/api/public/stats")"
check "GET /api/docs (swagger)"       200 "$(http_code "$CF/api/docs")"

log "2. Internal API is not publicly reachable"
# A 401 here is the pass condition: the service-to-service surface must reject
# callers that do not hold the shared key from Secrets Manager.
check "GET /api/internal/regions unauthenticated" 401 "$(http_code "$CF/api/internal/regions")"

log "3. Serverless endpoints via /sl/*"
check "POST /sl/uploads/presign" 200 \
  "$(http_code -X POST "$CF/sl/uploads/presign" -H 'content-type: application/json' \
      -d '{"filename":"verify.jpg","contentType":"image/jpeg"}')"
check "POST /sl/uploads/presign rejects .exe" 415 \
  "$(http_code -X POST "$CF/sl/uploads/presign" -H 'content-type: application/json' \
      -d '{"filename":"m.exe","contentType":"application/x-msdownload"}')"
check "POST /sl/reports rejects invalid body" 400 \
  "$(http_code -X POST "$CF/sl/reports" -H 'content-type: application/json' -d '{"description":"x"}')"

REGION_ID="$(aws dynamodb scan --table-name "$DDB_TABLE" --limit 1 \
  --query 'Items[0].regionId.S' --output text 2>/dev/null)"
if [[ -n "$REGION_ID" && "$REGION_ID" != "None" ]]; then
  check "POST /sl/reports accepts valid report" 201 \
    "$(http_code -X POST "$CF/sl/reports" -H 'content-type: application/json' \
        -d "$(jq -nc --arg r "$REGION_ID" '{regionId:$r, description:"automated verification report",
              latitude:26.45, longitude:87.27, severity:"low"}')")"
else
  warn "no DynamoDB snapshot yet — skipping valid-report check; run ./deploy.sh 63 again after an ingest"
fi

log "4. Upload pipeline end-to-end (presign -> S3 PUT -> event -> sniff -> tag)"
# The presign checks above only prove a URL is issued. The S3 -> Lambda leg is the
# part that can silently break (notification config, permissions, prefix filter),
# so actually upload bytes and assert the tag the function writes back.
#
# Two objects, because the interesting behaviour is the disagreement between what
# the client claims and what the bytes say: a real PNG must come back "verified",
# and a text file uploaded under an image/png URL must come back "rejected".
upload_and_tag() {
  local name="$1" payload_cmd="$2" presign
  presign="$(curl -s -X POST "$CF/sl/uploads/presign" -H 'content-type: application/json' \
    -d "{\"filename\":\"$name\",\"contentType\":\"image/png\"}")"
  local url key
  url="$(jq -r '.url' <<<"$presign")"
  key="$(jq -r '.key' <<<"$presign")"
  [[ -z "$key" || "$key" == "null" ]] && { echo "PRESIGN_FAILED"; return; }

  eval "$payload_cmd" > "$BUILD_DIR/$name"
  curl -s -o /dev/null -X PUT --upload-file "$BUILD_DIR/$name" \
    -H 'content-type: image/png' "$url"

  # S3 notification -> Lambda -> PutObjectTagging is asynchronous.
  local tag=""
  for _ in $(seq 1 20); do
    tag="$(aws s3api get-object-tagging --bucket "$(state_get S3_UPLOADS)" --key "$key" \
      --query "TagSet[?Key=='verification'].Value | [0]" --output text 2>/dev/null)"
    [[ -n "$tag" && "$tag" != "None" ]] && break
    sleep 3
  done
  echo "${tag:-none}"
}

# printf writes the 8-byte PNG magic number, which is all the sniffer reads.
check "real PNG upload tagged verified" verified \
  "$(upload_and_tag "verify-real.png" "printf '\\x89PNG\\r\\n\\x1a\\n and some body bytes'")"
check "text-as-PNG upload tagged rejected" rejected \
  "$(upload_and_tag "verify-fake.png" "printf 'this is definitely not a png'")"

log "5. Scheduled ingestion pipeline"
BEFORE="$(aws dynamodb scan --table-name "$DDB_TABLE" --select COUNT --query 'Count' --output text)"
INGEST="$(aws lambda invoke --function-name fg-weather-ingest \
  --payload '{"source":"verify"}' --cli-binary-format raw-in-base64-out \
  "$BUILD_DIR/verify-ingest.json" --query 'StatusCode' --output text)"
check "fg-weather-ingest invocation" 200 "$INGEST"
FAILED_REGIONS="$(jq -r '.failed // "?"' "$BUILD_DIR/verify-ingest.json")"
check "ingest had zero failed regions" 0 "$FAILED_REGIONS"
ENQUEUED="$(jq -r '.enqueued // 0' "$BUILD_DIR/verify-ingest.json")"
ok "enqueued $ENQUEUED region jobs"

log "   waiting 30s for SQS consumers to drain"
sleep 30
AFTER="$(aws dynamodb scan --table-name "$DDB_TABLE" --select COUNT --query 'Count' --output text)"
[[ "$AFTER" -gt "$BEFORE" ]] \
  && { ok "DynamoDB snapshots $BEFORE -> $AFTER"; ((PASS++)) || true; RESULTS+=("PASS|DynamoDB snapshots written|$BEFORE -> $AFTER"); } \
  || { warn "snapshot count did not grow ($BEFORE -> $AFTER)"; ((FAIL++)) || true; RESULTS+=("FAIL|DynamoDB snapshots written|$BEFORE -> $AFTER"); }

log "6. Dead-letter queues must be empty"
for q in "${SQS_FORECAST_QUEUE}-dlq" "${SQS_ALERT_QUEUE}-dlq"; do
  U="$(aws sqs get-queue-url --queue-name "$q" --query QueueUrl --output text)"
  D="$(aws sqs get-queue-attributes --queue-url "$U" \
        --attribute-names ApproximateNumberOfMessages \
        --query 'Attributes.ApproximateNumberOfMessages' --output text)"
  check "$q is empty" 0 "$D"
done

log "7. Alert fan-out with duplicate suppression"
AQ="$(aws sqs get-queue-url --queue-name "$SQS_ALERT_QUEUE" --query QueueUrl --output text)"
STAMP="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
MSG="$(jq -nc --arg r "$REGION_ID" --arg t "$STAMP" '{
  regionId:$r, regionName:"Verification Region", riskLevel:"high", confidence:80,
  score:72, rainfall24h:95.0, rainfall48h:140.0, detectedAt:$t}')"
# Sent twice deliberately: SQS is at-least-once, so the second must be suppressed
# rather than producing a second alert to every resident.
aws sqs send-message --queue-url "$AQ" --message-body "$MSG" >/dev/null
sleep 20
aws sqs send-message --queue-url "$AQ" --message-body "$MSG" >/dev/null
sleep 25
# awk-sum the pages: the CLI auto-paginates, so `length(events)` can print once
# PER PAGE ("1\n0"), and a multi-line value breaks the [[ -ge ]] test below.
SUPPRESSED="$(aws logs filter-log-events --log-group-name /aws/lambda/fg-alert-dispatch \
  --start-time $(( ($(date +%s) - 120) * 1000 )) \
  --filter-pattern '"duplicate suppressed"' --query 'length(events)' --output text 2>/dev/null \
  | awk '{s+=$1} END{print s+0}')"
[[ "${SUPPRESSED:-0}" -ge 1 ]] \
  && { ok "duplicate alert suppressed (idempotency holds)"; ((PASS++)) || true; RESULTS+=("PASS|duplicate alert suppressed|yes"); } \
  || { warn "no suppression logged — check the dedupe window in InternalService"; ((FAIL++)) || true; RESULTS+=("FAIL|duplicate alert suppressed|not observed"); }

log "8. Load generation for performance metrics"
# Sequential-with-parallel-bursts: enough volume for p95/p99 to be meaningful
# without tripping the Lambda concurrency alarms we just configured.
#
# BURST must stay under this account's 10-concurrent-execution Lambda quota.
# At 12 the presign function was throttled and API Gateway surfaced it as 500,
# which measures the quota rather than the system's latency. 8 leaves headroom
# for the SQS consumers that share the same pool.
REQS=120
BURST=8
log "   issuing $REQS requests across /api and /sl to populate latency percentiles"
START=$SECONDS
for i in $(seq 1 $REQS); do
  {
    curl -s -o /dev/null --max-time 20 "$CF/api/public/stats"
    curl -s -o /dev/null --max-time 20 -X POST "$CF/sl/uploads/presign" \
      -H 'content-type: application/json' \
      -d "{\"filename\":\"load-${i}.jpg\",\"contentType\":\"image/jpeg\"}"
  } &
  (( i % BURST == 0 )) && wait
done
wait
ELAPSED=$((SECONDS - START))
ok "$((REQS * 2)) requests in ${ELAPSED}s (~$(( REQS * 2 / (ELAPSED > 0 ? ELAPSED : 1) )) req/s)"

log "9. X-Ray traces recorded"
# get-trace-summaries paginates, and the CLI prints one `length()` per page,
# so the raw output is a column of numbers rather than a single total.
TRACES="$(aws xray get-trace-summaries \
  --start-time "$(date -u -d '15 minutes ago' +%s)" --end-time "$(date -u +%s)" \
  --query 'length(TraceSummaries)' --output text 2>/dev/null \
  | awk '{ n += $1 } END { print n + 0 }')"
[[ "${TRACES:-0}" -gt 0 ]] \
  && { ok "$TRACES traces in the last 15 min"; ((PASS++)) || true; RESULTS+=("PASS|X-Ray traces|$TRACES"); } \
  || { warn "no X-Ray traces yet (they can lag ~1 min)"; RESULTS+=("WARN|X-Ray traces|0"); }

printf '\n%s╭─ VERIFICATION SUMMARY ─────────────────────────────────────╮%s\n' "$C_BLUE" "$C_RESET"
for r in "${RESULTS[@]}"; do
  IFS='|' read -r st name detail <<<"$r"
  case "$st" in
    PASS) printf '  %s✓%s %-42s %s\n' "$C_GREEN" "$C_RESET" "$name" "$detail" ;;
    FAIL) printf '  %s✗%s %-42s %s\n' "$C_RED" "$C_RESET" "$name" "$detail" ;;
    *)    printf '  %s!%s %-42s %s\n' "$C_YELLOW" "$C_RESET" "$name" "$detail" ;;
  esac
done
printf '%s╰────────────────────────────────────────────────────────────╯%s\n' "$C_BLUE" "$C_RESET"
printf '  %s%d passed%s, %s%d failed%s\n\n' "$C_GREEN" "$PASS" "$C_RESET" \
  "$( ((FAIL)) && echo "$C_RED" || echo "$C_GREEN")" "$FAIL" "$C_RESET"

state_set LAST_VERIFY "$(date -u +%Y-%m-%dT%H:%M:%SZ) pass=$PASS fail=$FAIL"
ok "dashboard: $(state_get DASHBOARD_URL)"
((FAIL == 0)) || die "$FAIL check(s) failed"
