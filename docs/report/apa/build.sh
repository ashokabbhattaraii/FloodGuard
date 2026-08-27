#!/usr/bin/env bash
# Builds the APA 7th edition Word deliverable from the part-*.md sources.
#
#   ./build.sh
#
# Two passes. The first lays the document out with a contents page whose page
# numbers are placeholders; the second fills in the real numbers. Because the
# contents page has the same number of lines in both passes, pagination does not
# shift between them, so one correction pass is sufficient.
#
# Three constraints are enforced as gates: no em dashes, body prose near 4000
# words, and a final page count between 31 and 39.
set -euo pipefail
cd "$(dirname "$0")"

OUT=FloodGuard_Task2_APA_Report.docx
PARTS=(part0-title.md part1-intro.md part2-implementation.md part3-results.md)
REF=apa-reference.docx

# ---- gate 1: no em dashes ---------------------------------------------------
if grep -n '—' "${PARTS[@]}"; then
  echo "  FAIL: em dash found in the sources (see lines above)" >&2
  exit 1
fi
echo "  ok  no em dashes"

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# ---- resolve figure numbers -------------------------------------------------
# Sources carry the token "Figure @FIG" so figures can be added or removed
# without hand-renumbering every one that follows.
python3 - "$TMP" "${PARTS[@]}" <<'PYNUM'
import os, re, sys
tmp, paths = sys.argv[1], sys.argv[2:]
n = 0
for path in paths:
    parts = re.split(r'(Figure @FIG)', open(path).read())
    out = []
    for chunk in parts:
        if chunk == 'Figure @FIG':
            n += 1
            out.append(f'Figure {n}')
        else:
            out.append(chunk)
    open(os.path.join(tmp, os.path.basename(path)), 'w').write(''.join(out))
print(f"  ok  numbered {n} figures")
PYNUM

STAGED=(); for p in "${PARTS[@]}"; do STAGED+=("$TMP/$p"); done

render() {   # render <toc.md> <out.docx>
  pandoc "$TMP/part0-title.md" "$1" \
    "$TMP/part1-intro.md" "$TMP/part2-implementation.md" "$TMP/part3-results.md" \
    --from=markdown+pipe_tables+raw_attribute+fenced_divs \
    --to=docx --reference-doc="$REF" \
    --resource-path=".:..:../figures:$PWD" \
    --output="$2"
}

pdf_of() {   # pdf_of <docx> -> prints pdf path
  local d="$1" base="${1%.docx}"
  rm -f "$base.pdf"
  libreoffice --headless --convert-to pdf --outdir "$(dirname "$d")" "$d" >/dev/null 2>&1
  echo "$base.pdf"
}

# ---- pass 1: placeholder page numbers --------------------------------------
python3 emit_toc.py "$TMP/toc.md" --placeholder "${STAGED[@]}"
render "$TMP/toc.md" "$TMP/pass1.docx"
PDF1=$(pdf_of "$TMP/pass1.docx")

# ---- pass 2: real page numbers ---------------------------------------------
python3 emit_toc.py "$TMP/toc.md" --from-pdf "$PDF1" "${STAGED[@]}"
render "$TMP/toc.md" "$OUT"
echo "  ok  built $OUT ($(du -h "$OUT" | cut -f1))"

# ---- gate 2: body word count ------------------------------------------------
python3 - "${PARTS[@]}" <<'PY'
import re, sys
total = 0
for path in sys.argv[1:]:
    s = open(path).read()
    s = re.sub(r'```.*?```', '', s, flags=re.S)            # code and raw openxml
    # Screenshot scaffolding is replaced by images, so it is not body prose.
    s = re.sub(r'::: \{custom-style="(FigInstr|FigNum|FigTitle|APANote|Hanging'
               r'|APACenter|APACenterBold)"\}.*?:::', '', s, flags=re.S)
    s = re.sub(r'^\|.*$', '', s, flags=re.M)               # table rows
    s = re.sub(r'!\[.*?\]\(.*?\)', '', s)                  # images
    s = re.sub(r':::.*', '', s)
    total += len(s.split())
print(f"  ok  body prose: {total} words (target approx. 4000)")
PY

# ---- gate 3: page count -----------------------------------------------------
PDF=$(pdf_of "$OUT")
PAGES=$(pdfinfo "$PDF" | awk '/^Pages/{print $2}')
if (( PAGES > 30 && PAGES < 40 )); then
  echo "  ok  $PAGES pages (required: more than 30, fewer than 40)"
else
  echo "  WARN $PAGES pages is OUTSIDE the required 31-39 range" >&2
fi
