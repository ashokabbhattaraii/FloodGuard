#!/usr/bin/env bash
# Builds the Task #2 Word deliverable from the Markdown source.
#
#   ./build.sh
#
# Figure 1 (the team's originally-proposed architecture diagram) is optional: drop
# it in as figures/proposed-architecture.png and it is embedded automatically,
# replacing the placeholder block.
set -euo pipefail
cd "$(dirname "$0")"

SRC=G1_Task_2_Final_Report.md
OUT=G1_Task_2_Final_Report.docx
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
STAGED="$TMP/report.md"

cp "$SRC" "$STAGED"

if [[ -f figures/proposed-architecture.png ]]; then
  # Swap the placeholder block for the real figure.
  python3 - "$STAGED" <<'PY'
import re, sys
p = sys.argv[1]
s = open(p).read()
s = re.sub(
    r'> \*\*\[FIGURE 1 — PROPOSED ARCHITECTURE\]\*\*.*?(?=\n\n)',
    '![Figure 1 — Task #2 architecture as originally proposed.]'
    '(figures/proposed-architecture.png)',
    s, flags=re.S)
open(p, 'w').write(s)
PY
  echo "  ✓ Figure 1 embedded from figures/proposed-architecture.png"
else
  echo "  ! figures/proposed-architecture.png not found — Figure 1 stays a placeholder"
fi

# Word has no \newpage; the docx writer takes a raw OpenXML page break instead.
python3 - "$STAGED" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
s = s.replace('\\newpage',
              '```{=openxml}\n<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n```')
open(p, 'w').write(s)
PY

pandoc "$STAGED" \
  --from=markdown+pipe_tables+raw_attribute \
  --to=docx \
  --resource-path=.:"$PWD" \
  --toc --toc-depth=2 \
  --highlight-style=tango \
  --output="$OUT"

echo "  ✓ $OUT ($(du -h "$OUT" | cut -f1))"

WORDS=$(python3 - "$SRC" <<'PY'
import re, sys
s = re.sub(r'^---\n.*?\n---\n', '', open(sys.argv[1]).read(), flags=re.S)
s = re.sub(r'```.*?```', '', s, flags=re.S)
total = len(s.split())
# Placeholder instructions disappear once real screenshots are pasted in.
ph = sum(len(m.split()) for m in
         re.findall(r'^> \*\*\[(?:SCREENSHOT|FIGURE).*?(?=\n\n)', s, flags=re.S | re.M))
print(f"{total - ph} words (excluding code and screenshot placeholders); limit 4000")
PY
)
echo "  ✓ $WORDS"
