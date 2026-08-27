# Before you submit

The document builds clean and is APA 7 throughout. Five things still need your input.

## 1. Replace the placeholders

| Placeholder | Where | Count |
|---|---|---|
| `NP0698[##]` | Title page, one per member | 4 |
| `[LECTURER NAME]` | Title page | 1 |
| `[SUBMISSION DATE]` | Title page | 1 |
| `G[GROUP NUMBER]` | Title page | 1 |

Edit these in `src/part0-title.md` and rebuild, or type over them in Word.
Rebuilding is safer, because the contents page page numbers are regenerated.

## 2. Paste the six interface screenshots

Figures 17 to 22 are marked `[PASTE SCREENSHOT: ...]` under the heading *System
Functionality Post-Implementation*. Each block says exactly what to capture.
Select the bracketed line and paste the image over it.

**Keep each image about 2.2 inches (5.5 cm) tall.** The document is 35 pages and
the limit is 40, so six images at that height land it near 37 or 38.

## 3. Confirm the member to role mapping

Names came from the previous report and the work breakdown. Check that M1 to M4
in the reflections and in Table 9 match who actually did what.

## 4. Rename for Moodle

The brief asks for `G1_Task_2_Final Report.docx`, with a space before "Report"
and your real group number in place of `1`.

## 5. Note on the word count

Body prose is **3,691 words**, within the 4,000 limit. Word's own count of the
whole file reads about 5,970, because it also counts the contents page, all nine
tables, every figure caption, and the reference list. If your marker counts the
whole file rather than the prose, tell me and I will cut the prose back.

---

# Rebuilding

```bash
python3 extract_figures.py     # once, pulls screenshots from ../impl
./build.sh
```

`build.sh` refuses to finish quietly: it fails on an em dash, reports the word
count against the 4,000 limit, and reports the page count against the 40 limit.
Figure numbers and every cross-reference to them are resolved from labels at
build time, so adding or removing a figure never leaves a stale "see Figure 12".
