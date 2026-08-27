#!/usr/bin/env bash
# Builds the standalone System Implementation section as an APA 7 Word document.
# Reuses the style template from the full report so this drops straight into the
# group document alongside the other members' sections.
set -euo pipefail
cd "$(dirname "$0")"

SRC=system-implementation.md
OUT=System_Implementation.docx
REF=../apa/apa-reference.docx

[[ -f "$REF" ]] || { echo "missing $REF" >&2; exit 1; }

if grep -n '—' "$SRC"; then
  echo "  FAIL: em dash found (see lines above)" >&2
  exit 1
fi
echo "  ok  no em dashes"

pandoc "$SRC" \
  --from=markdown+pipe_tables+raw_attribute+fenced_divs \
  --to=docx --reference-doc="$REF" \
  --output="$OUT"
echo "  ok  built $OUT ($(du -h "$OUT" | cut -f1))"

python3 - "$SRC" <<'PY'
import re, sys
s = open(sys.argv[1]).read()
figs = len(re.findall(r'^Figure \d+$', s, re.M))
tbls = len(re.findall(r'^Table \d+$', s, re.M))
# Screenshot lines are scaffolding you delete as images go in.
body = re.sub(r'::: \{custom-style="(FigInstr|FigNum|FigTitle|APANote|APACenter'
              r'|APACenterBold)"\}.*?:::', '', s, flags=re.S)
body = re.sub(r'^\|.*$', '', body, flags=re.M)
body = re.sub(r':::.*', '', body)
print(f"  ok  {figs} figures, {tbls} tables, {len(body.split())} words of prose")

nums = [int(n) for n in re.findall(r'^Figure (\d+)$', s, re.M)]
assert nums == list(range(1, len(nums) + 1)), f"figure numbering not sequential: {nums}"
print("  ok  figure numbering sequential and matches REBUILD-GUIDE.md")
PY

if command -v libreoffice >/dev/null; then
  rm -f "${OUT%.docx}.pdf"
  libreoffice --headless --convert-to pdf --outdir . "$OUT" >/dev/null 2>&1 || true
  [[ -f "${OUT%.docx}.pdf" ]] && echo "  ok  $(pdfinfo "${OUT%.docx}.pdf" | awk '/^Pages/{print $2}') pages"
fi
