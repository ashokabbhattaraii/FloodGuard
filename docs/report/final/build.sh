#!/usr/bin/env bash
# Builds the APA 7 Word deliverable for FloodGuard Task 2.
set -euo pipefail
cd "$(dirname "$0")"

OUT=G1_Task_2_Final_Report.docx
PARTS=(src/part0-title.md src/part1-design.md src/part2-implementation.md src/part3-results.md src/part4-reflection.md)
REF=apa-reference.docx

if grep -n '—' "${PARTS[@]}"; then echo "  FAIL: em dash present" >&2; exit 1; fi
echo "  ok  no em dashes"

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

python3 - "$TMP" "${PARTS[@]}" <<'PYNUM'
import os, re, sys
tmp, paths = sys.argv[1], sys.argv[2:]
texts = {p: open(p).read() for p in paths}

# Pass one assigns a number to every labelled definition in document order, so
# a figure can be added or removed without renumbering anything by hand.
num, order = {}, 0
for p in paths:
    for m in re.finditer(r'Figure @FIG\((.*?)\)', texts[p]):
        order += 1
        label = m.group(1)
        if label in num:
            sys.exit(f"  FAIL: duplicate figure label {label!r}")
        num[label] = order

# Pass two substitutes definitions and cross-references from the same table, so
# a reference can never disagree with the figure it points at.
for p in paths:
    s = texts[p]
    s = re.sub(r'Figure @FIG\((.*?)\)', lambda m: f'Figure {num[m.group(1)]}', s)
    def ref(m):
        if m.group(1) not in num:
            sys.exit(f"  FAIL: reference to unknown figure label {m.group(1)!r}")
        return f'Figure {num[m.group(1)]}'
    s = re.sub(r'Figure @REF\((.*?)\)', ref, s)
    if '@FIG' in s or '@REF' in s:
        sys.exit("  FAIL: unresolved figure token remains")
    open(os.path.join(tmp, os.path.basename(p)), 'w').write(s)
print(f"  ok  numbered {order} figures, all cross-references resolved")
PYNUM

S=(); for p in "${PARTS[@]}"; do S+=("$TMP/$(basename "$p")"); done

# ---- resolve image widths ---------------------------------------------------
# Every screenshot is set as wide as the text block allows, then pulled back if
# that would make it taller than one figure's fair share of a page, or if the
# capture has too few pixels to survive the enlargement.
python3 - "$TMP" "${S[@]}" <<'PYIMG'
import os, re, sys
from PIL import Image
tmp, paths = sys.argv[1], sys.argv[2:]
MAXW, MAXH, MINDPI = 6.4, 4.2, 115
def width_for(rel):
    im = Image.open(os.path.join('figures', os.path.basename(rel)))
    ar = im.width / im.height
    return round(max(3.0, min(MAXW, MAXH * ar, im.width / MINDPI)), 2)
for path in paths:
    s = open(path).read()
    s = re.sub(r'!\[\]\((.*?)\)\{width=AUTO\}',
               lambda m: f'![]({m.group(1)})' + '{width=%sin}' % width_for(m.group(1)), s)
    open(path, 'w').write(s)
print("  ok  image widths resolved")
PYIMG

render() {
  pandoc "${S[0]}" "$1" "${S[@]:1}" \
    --from=markdown+pipe_tables+raw_attribute+fenced_divs-implicit_figures \
    --to=docx --reference-doc="$REF" --resource-path=".:figures:$PWD" \
    --output="$2"
  python3 apa_tables.py "$2" >/dev/null
  python3 ooxml_order.py "$2" >/dev/null
}

pdf_of() {
  local d="$1" base="${1%.docx}"
  rm -f "$base.pdf"
  soffice --headless --convert-to pdf --outdir "$(dirname "$d")" "$d" >/dev/null 2>&1
  echo "$base.pdf"
}

python3 emit_toc.py "$TMP/toc.md" --placeholder "${S[@]}"
render "$TMP/toc.md" "$TMP/pass1.docx"
PDF1=$(pdf_of "$TMP/pass1.docx")

python3 emit_toc.py "$TMP/toc.md" --from-pdf "$PDF1" "${S[@]}"
render "$TMP/toc.md" "$OUT"
python3 apa_tables.py "$OUT"
python3 ooxml_order.py "$OUT"
echo "  ok  built $OUT ($(du -h "$OUT" | cut -f1))"

python3 - "${PARTS[@]}" <<'PY'
import re, sys
total = 0
for path in sys.argv[1:]:
    s = open(path).read()
    s = re.sub(r'```.*?```', '', s, flags=re.S)
    s = re.sub(r'::: \{custom-style="(FigInstr|FigNum|FigTitle|APANote|Hanging'
               r'|APACenter|APACenterBold)"\}.*?:::', '', s, flags=re.S)
    s = re.sub(r'^\|.*$', '', s, flags=re.M)
    s = re.sub(r'!\[.*?\]\(.*?\)(\{.*?\})?', '', s)
    s = re.sub(r':::.*', '', s)
    total += len(s.split())
print(f"  {'ok ' if total < 4000 else 'FAIL'} body prose: {total} words (limit 4000)")
PY

PDF=$(pdf_of "$OUT")
PAGES=$(pdfinfo "$PDF" | awk '/^Pages/{print $2}')
if (( PAGES <= 40 )); then echo "  ok  $PAGES pages (limit 40)"; else echo "  FAIL $PAGES pages exceeds 40" >&2; fi
