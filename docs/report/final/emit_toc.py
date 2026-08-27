#!/usr/bin/env python3
"""Emit the contents page for the APA report.

Pandoc's --toc inserts a Word TOC *field*, which every renderer restyles with its
own built-in styles. That makes the contents page double spaced regardless of what
the reference document says, and it costs eight pages. A literal contents page
renders identically everywhere and is fully controllable.

Entries are emitted as raw OpenXML rather than markdown because pandoc normalises
tab characters, which would destroy the right-aligned dot leader.

Usage:
    emit_toc.py OUT.md --placeholder        PART.md...
    emit_toc.py OUT.md --from-pdf PASS1.pdf PART.md...
"""
import re
import subprocess
import sys

PAGE_BREAK = ('```{=openxml}\n'
              '<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n'
              '```\n')

# A contents line: title, then a tab to the right-aligned dot-leader stop, then
# the page number. TOCLine1..3 carry the per-level indent and single spacing.
ENTRY = ('<w:p><w:pPr><w:pStyle w:val="TOCLine{level}"/></w:pPr>'
         '<w:r><w:t xml:space="preserve">{title}</w:t></w:r>'
         '<w:r><w:tab/></w:r>'
         '<w:r><w:t>{page}</w:t></w:r></w:p>')


def xml_escape(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def headings(paths):
    """Return [(level, text)] for every ATX heading, in document order."""
    out = []
    for path in paths:
        body = re.sub(r'```.*?```', '', open(path).read(), flags=re.S)
        for line in body.splitlines():
            m = re.match(r'^(#{1,3})\s+(.*?)\s*$', line)
            if m:
                out.append((len(m.group(1)), m.group(2).replace('*', '')))
    return out


def body_start(pages_lc):
    """Index of the first body page, i.e. the first page after the front matter.

    The contents page repeats every heading verbatim, so a search that began at
    page one would resolve every entry to the contents itself. Front matter is
    the title page plus however many pages the contents runs to. Contents lines
    are recognised by their dot leaders, which no body line contains.
    """
    first_toc = next((i for i, p in enumerate(pages_lc)
                      if 'table of contents' in p), None)
    if first_toc is None:
        return 0
    i = first_toc
    while i < len(pages_lc):
        lines = [l for l in pages_lc[i].split('\n') if l.strip()]
        entryish = sum(1 for l in lines if re.search(r'\.{3,}\s*\d+\s*$', l))
        if lines and entryish < len(lines) * 0.5:
            break                      # this page is prose, not contents
        i += 1
    return i


def page_map(pdf, heads):
    """Locate each heading's page in the pass-1 PDF.

    Matching walks forward only: headings appear in document order, so a cursor
    stops a repeated phrase from resolving to an earlier page.
    """
    raw = subprocess.run(['pdftotext', '-layout', pdf, '-'],
                         capture_output=True, text=True).stdout.split('\f')
    pages_lc = [p.lower() for p in raw]
    flat = [' '.join(p.split()) for p in pages_lc]

    start = body_start(pages_lc)
    numbers, cursor = [], start
    for _, title in heads:
        needle = ' '.join(title.split()).lower()
        # Word boundaries matter: a bare substring search puts "References" on
        # the page that mentions "notification preferences".
        pat = re.compile(r'\b' + re.escape(needle) + r'\b')
        found = None
        for i in range(cursor, len(flat)):
            if pat.search(flat[i]):
                found = i + 1
                cursor = i             # several headings may share a page
                break
        numbers.append(found or (numbers[-1] if numbers else start + 1))
    return numbers


def main():
    out_path, mode = sys.argv[1], sys.argv[2]
    if mode == '--from-pdf':
        pdf, parts = sys.argv[3], sys.argv[4:]
    else:
        pdf, parts = None, sys.argv[3:]

    heads = headings(parts)
    nums = page_map(pdf, heads) if pdf else [0] * len(heads)

    entries = '\n'.join(
        ENTRY.format(level=level, title=xml_escape(title), page=page or 0)
        for (level, title), page in zip(heads, nums))

    out = ['::: {custom-style="APACenterBold"}', 'Table of Contents', ':::', '',
           '```{=openxml}', entries, '```', '', PAGE_BREAK]
    open(out_path, 'w').write('\n'.join(out))
    print(f"  ok  contents page: {len(heads)} entries"
          f"{'' if pdf else ' (placeholder pass)'}")


if __name__ == '__main__':
    main()
