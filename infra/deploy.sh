#!/usr/bin/env bash
# FloodGuard — single entrypoint for all infrastructure and app deploys.
#
#   ./deploy.sh list                 show every step and whether it has run
#   ./deploy.sh all                  run every step in order (safe to re-run)
#   ./deploy.sh 10 20 30             run specific steps by number prefix
#   ./deploy.sh phase1               Task #1 stack (network → data → compute → CDN)
#   ./deploy.sh phase2               Task #2 serverless layer
#   ./deploy.sh phase3               monitoring (CloudWatch dashboard, alarms, X-Ray)
#   ./deploy.sh outputs              print all discovered endpoints & resource IDs
#
# Every step is idempotent: re-running converges rather than duplicating.

set -Eeuo pipefail
INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$INFRA_DIR/lib/common.sh"

steps_all()   { find "$INFRA_DIR/steps" -maxdepth 1 -name '[0-9][0-9]-*.sh' | sort; }
steps_phase() { steps_all | grep -E "/$1" || true; }

usage() { sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; }

run_step() {
  local script="$1" name; name="$(basename "$script" .sh)"
  printf '\n%s┌─ %s %s%s\n' "$C_BLUE" "$name" "$(printf '─%.0s' $(seq 1 $((60 - ${#name}))))" "$C_RESET"
  local start; start=$SECONDS
  if bash "$script"; then
    ok "$name completed in $((SECONDS - start))s"
    state_set "STEP_${name%%-*}_DONE" "1"
  else
    die "$name FAILED — fix the error above, then re-run: ./deploy.sh ${name%%-*}"
  fi
}

cmd="${1:-list}"; shift || true

case "$cmd" in
  -h|--help|help) usage; exit 0 ;;

  list)
    require_tools aws
    printf '\n%sFloodGuard deployment steps%s  (region %s, account %s)\n\n' \
      "$C_BLUE" "$C_RESET" "$AWS_REGION" "$EXPECTED_ACCOUNT_ID"
    while read -r s; do
      n="$(basename "$s" .sh)"
      if [[ -n "$(state_get "STEP_${n%%-*}_DONE")" ]]; then
        printf '  %s✓%s %s\n' "$C_GREEN" "$C_RESET" "$n"
      else
        printf '  %s·%s %s\n' "$C_DIM" "$C_RESET" "$n"
      fi
    done < <(steps_all)
    printf '\n'
    ;;

  all)
    require_tools aws curl zip jq; assert_account
    while read -r s; do run_step "$s"; done < <(steps_all)
    ok "ALL STEPS COMPLETE — run './deploy.sh outputs' for endpoints"
    ;;

  phase1|phase2|phase3)
    require_tools aws curl zip jq; assert_account
    case "$cmd" in
      phase1) pat='[123][0-9]-' ;;
      phase2) pat='[45][0-9]-' ;;
      phase3) pat='[6][0-9]-' ;;
    esac
    mapfile -t sel < <(steps_all | grep -E "/${pat}")
    ((${#sel[@]})) || die "no steps match $cmd"
    for s in "${sel[@]}"; do run_step "$s"; done
    ;;

  outputs)
    printf '\n%sFloodGuard — deployed resources%s\n\n' "$C_BLUE" "$C_RESET"
    [[ -s "$STATE_FILE" ]] || die "no state yet — run ./deploy.sh phase1"
    column -t -s= "$STATE_FILE" | grep -v '^STEP_' | sed 's/^/  /'
    printf '\n'
    ;;

  *)
    require_tools aws curl zip jq; assert_account
    for want in "$cmd" "$@"; do
      mapfile -t sel < <(steps_all | grep -E "/${want}-")
      ((${#sel[@]})) || die "no step matching '$want' — try: ./deploy.sh list"
      for s in "${sel[@]}"; do run_step "$s"; done
    done
    ;;
esac
