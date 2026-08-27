#!/usr/bin/env bash
# FloodGuard deploy helpers. Sourced by every step script.
# Design goals: idempotent, re-runnable, fail loudly, never print secrets.

set -Eeuo pipefail

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$INFRA_DIR/.." && pwd)"
STATE_DIR="$INFRA_DIR/.state"
STATE_FILE="$STATE_DIR/resources.env"
BUILD_DIR="$INFRA_DIR/build"

mkdir -p "$STATE_DIR" "$BUILD_DIR"
touch "$STATE_FILE"

# shellcheck disable=SC1091
source "$INFRA_DIR/config.env"
export AWS_REGION AWS_DEFAULT_REGION="$AWS_REGION"

# ---------- output ----------
if [[ -t 1 ]]; then
  C_RESET=$'\033[0m'; C_BLUE=$'\033[1;34m'; C_GREEN=$'\033[1;32m'
  C_YELLOW=$'\033[1;33m'; C_RED=$'\033[1;31m'; C_DIM=$'\033[2m'
else
  C_RESET=""; C_BLUE=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_DIM=""
fi

log()   { printf '%s==>%s %s\n' "$C_BLUE"   "$C_RESET" "$*"; }
ok()    { printf '%s  ✓%s %s\n' "$C_GREEN"  "$C_RESET" "$*"; }
skip()  { printf '%s  ·%s %s %s(exists)%s\n' "$C_DIM" "$C_RESET" "$*" "$C_DIM" "$C_RESET"; }
warn()  { printf '%s  !%s %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
die()   { printf '%s ERR%s %s\n' "$C_RED"   "$C_RESET" "$*" >&2; exit 1; }

# ---------- state ----------
# Resource IDs discovered/created by earlier steps, so steps compose without
# re-querying AWS and can be re-run in isolation.
state_set() {
  local key="$1" val="$2"
  [[ -n "$val" && "$val" != "None" && "$val" != "null" ]] || die "state_set $key: refusing to store empty value"
  local tmp; tmp="$(mktemp)"
  grep -v "^${key}=" "$STATE_FILE" > "$tmp" 2>/dev/null || true
  printf '%s=%s\n' "$key" "$val" >> "$tmp"
  sort -o "$STATE_FILE" "$tmp" && rm -f "$tmp"
}

state_get() {
  local key="$1"
  sed -n "s/^${key}=//p" "$STATE_FILE" | tail -1
}

state_require() {
  local key val
  for key in "$@"; do
    val="$(state_get "$key")"
    [[ -n "$val" ]] || die "missing state '$key' — run the earlier step first (see: infra/deploy.sh list)"
    export "$key=$val"
  done
}

state_load_all() {
  set -a
  # shellcheck disable=SC1090
  source "$STATE_FILE"
  set +a
}

# ---------- preflight ----------
require_tools() {
  local t missing=()
  for t in "$@"; do command -v "$t" >/dev/null 2>&1 || missing+=("$t"); done
  ((${#missing[@]} == 0)) || die "missing required tool(s): ${missing[*]}"
}

assert_account() {
  local actual
  actual="$(aws sts get-caller-identity --query Account --output text)" \
    || die "AWS credentials are not working — check your default profile"
  [[ "$actual" == "$EXPECTED_ACCOUNT_ID" ]] \
    || die "wrong AWS account: got $actual, expected $EXPECTED_ACCOUNT_ID (fix EXPECTED_ACCOUNT_ID in config.env or switch profile)"
  ok "account $actual / region $AWS_REGION"
}

# ---------- idempotency helpers ----------
# Look up a resource tagged Name=<value>; echo its id or empty string.
find_by_name_tag() {
  local resource="$1" name="$2" query="$3"
  aws ec2 describe-"$resource" \
    --filters "Name=tag:Name,Values=$name" \
    --query "$query" --output text 2>/dev/null | grep -v '^None$' || true
}

# Run a command, tolerating the "already exists" class of errors.
tolerate_exists() {
  local out rc=0
  out="$("$@" 2>&1)" || rc=$?
  if ((rc != 0)); then
    if grep -qiE 'already ?exists|already ?associated|already ?attached|already ?subscribed|Duplicate|EntityAlreadyExists|ResourceInUse|ResourceConflict|ResourceAlreadyExists|AlreadyAssociated|InvalidPermission\.Duplicate|BucketAlreadyOwnedByYou|TableAlreadyExists|QueueAlreadyExists|is already the current' <<<"$out"; then
      return 0
    fi
    printf '%s\n' "$out" >&2
    return $rc
  fi
  printf '%s\n' "$out"
}

my_ip() { curl -fsS --max-time 10 https://checkip.amazonaws.com | tr -d '[:space:]'; }

# Wait for a shell predicate to become true.
wait_for() {
  local desc="$1" timeout="$2"; shift 2
  local waited=0 interval=15
  printf '%s  …%s waiting for %s' "$C_DIM" "$C_RESET" "$desc"
  while ! "$@" >/dev/null 2>&1; do
    ((waited += interval))
    ((waited < timeout)) || { printf '\n'; die "timed out after ${timeout}s waiting for $desc"; }
    printf '.'
    sleep "$interval"
  done
  printf ' ok (%ss)\n' "$waited"
}

account_id() { printf '%s' "$EXPECTED_ACCOUNT_ID"; }

# ---------- diagnostics ----------
# Without this, a `set -e` abort (or a pipefail SIGPIPE) exits silently and the
# operator sees only "step FAILED" with no clue where.
_on_err() {
  local rc=$? line=${BASH_LINENO[0]:-?} src=${BASH_SOURCE[1]:-?} cmd=$BASH_COMMAND
  printf '%s ERR%s %s:%s exited %s\n      command: %s\n' \
    "$C_RED" "$C_RESET" "$(basename "$src")" "$line" "$rc" "$cmd" >&2
  ((rc == 141)) && printf '      hint: rc 141 = SIGPIPE, usually `cmd | head`; wrap in ( set +o pipefail; ... )\n' >&2
  return $rc
}
trap _on_err ERR

