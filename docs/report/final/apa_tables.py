#!/usr/bin/env python3
"""Force every table in a pandoc-generated .docx into strict APA 7 form.

APA 7 tables carry exactly three horizontal rules: above the column headings,
below the column headings, and below the final row. There are no vertical rules
and no interior horizontal rules. Column headings are centred. Body text may be
set smaller than the surrounding prose, which is what keeps a wide table on the
page. This runs after pandoc because style inheritance in Word puts the
paragraph style ahead of the table style, so a table style alone does not win.
"""
import re, shutil, subprocess, sys, zipfile, os, tempfile
from lxml import etree

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
def q(t): return f'{{{W}}}{t}'

RULE = '8'          # eighths of a point: 1pt rules
FONT_HALFPT = '20'  # 10 pt inside tables


def el(tag, **attrs):
    e = etree.Element(q(tag))
    for k, v in attrs.items():
        e.set(q(k), v)
    return e


def borders(**sides):
    b = etree.Element(q('tblBorders'))
    for name in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = etree.SubElement(b, q(name))
        if sides.get(name):
            e.set(q('val'), 'single'); e.set(q('sz'), RULE)
            e.set(q('space'), '0'); e.set(q('color'), '000000')
        else:
            e.set(q('val'), 'none'); e.set(q('sz'), '0')
            e.set(q('space'), '0'); e.set(q('color'), 'auto')
    return b


def ensure_first(parent, tag, order):
    """Return parent's child <tag>, inserting it at its schema position."""
    found = parent.find(q(tag))
    if found is not None:
        return found
    node = etree.Element(q(tag))
    idx = order.index(tag)
    for i, child in enumerate(parent):
        name = etree.QName(child).localname
        if name in order and order.index(name) > idx:
            parent.insert(i, node); return node
    parent.append(node); return node


TR_ORDER = ['tblPrEx', 'trPr']
P_ORDER = ['pPr']


def style_table(tbl):
    tblPr = tbl.find(q('tblPr'))
    if tblPr is None:
        tblPr = etree.Element(q('tblPr')); tbl.insert(0, tblPr)
    for old in tblPr.findall(q('tblBorders')):
        tblPr.remove(old)
    tblPr.append(borders(top=True, bottom=True))

    rows = tbl.findall(q('tr'))
    if not rows:
        return
    last = len(rows) - 1
    for i, tr in enumerate(rows):
        head = (i == 0)
        foot = (i == last)
        if head:
            trPr = tr.find(q('trPr'))
            if trPr is None:
                trPr = etree.Element(q('trPr')); tr.insert(0, trPr)
            if trPr.find(q('tblHeader')) is None:
                trPr.append(etree.Element(q('tblHeader')))
        for col, tc in enumerate(tr.findall(q('tc'))):
            tcPr = tc.find(q('tcPr'))
            if tcPr is None:
                tcPr = etree.Element(q('tcPr')); tc.insert(0, tcPr)
            for old in tcPr.findall(q('tcBorders')):
                tcPr.remove(old)
            # A cell border overrides the table border, so the three APA rules
            # have to be restated on the cells that carry them.
            tb = etree.Element(q('tcBorders'))
            ruled = {'top': head, 'bottom': head or foot}
            for name in ('top', 'left', 'bottom', 'right'):
                e = etree.SubElement(tb, q(name))
                if ruled.get(name):
                    e.set(q('val'), 'single'); e.set(q('sz'), RULE)
                    e.set(q('space'), '0'); e.set(q('color'), '000000')
                else:
                    e.set(q('val'), 'none'); e.set(q('sz'), '0')
                    e.set(q('space'), '0'); e.set(q('color'), 'auto')
            tcPr.append(tb)
            text = ''.join(t.text or '' for t in tc.iter(q('t')))
            # Short values read better centred under a centred heading; prose
            # cells stay flush left, because centred sentences are unreadable.
            short = len(text.strip()) <= 20
            for p in tc.iter(q('p')):
                pPr = p.find(q('pPr'))
                if pPr is None:
                    pPr = etree.Element(q('pPr')); p.insert(0, pPr)
                for old in pPr.findall(q('jc')):
                    pPr.remove(old)
                jc = etree.Element(q('jc'))
                # Headings centre; the stub column stays left; data columns
                # centre under their headings.
                if head:
                    jc.set(q('val'), 'center')
                elif col > 0 and short:
                    jc.set(q('val'), 'center')
                else:
                    jc.set(q('val'), 'left')
                pPr.append(jc)
                for r in p.findall(q('r')):
                    rPr = r.find(q('rPr'))
                    if rPr is None:
                        rPr = etree.Element(q('rPr')); r.insert(0, rPr)
                    for tag in ('sz', 'szCs'):
                        for old in rPr.findall(q(tag)):
                            rPr.remove(old)
                        s = etree.SubElement(rPr, q(tag))
                        s.set(q('val'), FONT_HALFPT)



TEXT_W = 9216   # dxa: 6.4in of text block, matching the figure width


def fit_columns(tbl):
    """Give each column a share of the text block proportional to its content.

    Pandoc derives column widths from the dashes in the markdown separator row,
    which makes every column equal and leaves narrow identifiers hyphenated
    across two lines. Measuring the actual text is both simpler to maintain and
    closer to how the table would be set by hand.
    """
    rows = tbl.findall(q('tr'))
    if not rows:
        return
    ncol = max(len(r.findall(q('tc'))) for r in rows)
    widest = [0] * ncol
    longest_word = [0] * ncol
    for tr in rows:
        for i, tc in enumerate(tr.findall(q('tc'))[:ncol]):
            text = ''.join(t.text or '' for t in tc.iter(q('t'))).strip()
            widest[i] = max(widest[i], len(text))
            for word in text.replace('/', '/ ').split():
                longest_word[i] = max(longest_word[i], len(word))
    # Clamp before normalising: one long prose cell should widen its column,
    # not swallow the table.
    weights = [min(max(w, 6), 55) for w in widest]
    total = sum(weights) or ncol
    dxa = [int(TEXT_W * w / total) for w in weights]

    # A column narrower than its longest single word hyphenates identifiers
    # across two lines, so give every column at least that much and take the
    # difference from whichever column has the most room to spare.
    CH = 105          # dxa per character at 10 pt Times, plus cell padding
    floors = [min(w * CH + 240, 3200) for w in longest_word]
    for i in range(ncol):
        need = floors[i] - dxa[i]
        while need > 0:
            donor = max(range(ncol), key=lambda j: dxa[j] - floors[j] if j != i else -10**9)
            spare = dxa[donor] - floors[donor]
            if spare <= 0:
                break
            take = min(spare, need)
            dxa[donor] -= take; dxa[i] += take; need -= take
    slack = TEXT_W - sum(dxa)
    dxa[weights.index(max(weights))] += slack

    tblPr = tbl.find(q('tblPr'))
    for old in tblPr.findall(q('tblW')) + tblPr.findall(q('tblLayout')):
        tblPr.remove(old)
    tw = etree.SubElement(tblPr, q('tblW'))
    tw.set(q('w'), str(TEXT_W)); tw.set(q('type'), 'dxa')
    lay = etree.SubElement(tblPr, q('tblLayout')); lay.set(q('type'), 'fixed')

    for old in tbl.findall(q('tblGrid')):
        tbl.remove(old)
    grid = etree.Element(q('tblGrid'))
    for w in dxa:
        gc = etree.SubElement(grid, q('gridCol')); gc.set(q('w'), str(w))
    tbl.insert(list(tbl).index(tblPr) + 1, grid)

    for tr in rows:
        for i, tc in enumerate(tr.findall(q('tc'))[:ncol]):
            tcPr = tc.find(q('tcPr'))
            for old in tcPr.findall(q('tcW')):
                tcPr.remove(old)
            cw = etree.SubElement(tcPr, q('tcW'))
            cw.set(q('w'), str(dxa[i])); cw.set(q('type'), 'dxa')


def main(path):
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile(path) as z:
        z.extractall(tmp)
        names = z.namelist()
    doc = os.path.join(tmp, 'word/document.xml')
    tree = etree.parse(doc)
    tables = tree.getroot().iter(q('tbl'))
    n = 0
    for tbl in tables:
        style_table(tbl); fit_columns(tbl); n += 1
    tree.write(doc, xml_declaration=True, encoding='UTF-8', standalone=True)
    out = path
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for name in names:
            z.write(os.path.join(tmp, name), name)
    shutil.rmtree(tmp)
    print(f"  ok  {n} tables set to APA 7 rules")


if __name__ == '__main__':
    main(sys.argv[1])
