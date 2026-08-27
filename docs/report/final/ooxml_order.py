#!/usr/bin/env python3
"""Put every property element back into the order the OOXML schema demands.

Word validates child order inside pPr, rPr, tcPr, tblPr, trPr, sectPr and the
style element itself. Appending a property is the natural way to write these
patches and produces the wrong order every time, which Word reports on open as
a file needing repair. Rather than hand-place each insertion, this normalises
the order once, at the end of the build.
"""
import os, shutil, sys, tempfile, zipfile
from lxml import etree

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
def q(t): return f'{{{W}}}{t}'

SEQ = {
 'pPr': ['pStyle','keepNext','keepLines','pageBreakBefore','framePr','widowControl',
         'numPr','suppressLineNumbers','pBdr','shd','tabs','suppressAutoHyphens',
         'kinsoku','wordWrap','overflowPunct','topLinePunct','autoSpaceDE',
         'autoSpaceDN','bidi','adjustRightInd','snapToGrid','spacing','ind',
         'contextualSpacing','mirrorIndents','suppressOverlap','jc','textDirection',
         'textAlignment','textboxTightWrap','outlineLvl','divId','cnfStyle','rPr',
         'sectPr','pPrChange'],
 'rPr': ['rStyle','rFonts','b','bCs','i','iCs','caps','smallCaps','strike','dstrike',
         'outline','shadow','emboss','imprint','noProof','snapToGrid','vanish',
         'webHidden','color','spacing','w','kern','position','sz','szCs','highlight',
         'u','effect','bdr','shd','fitText','vertAlign','rtl','cs','em','lang',
         'eastAsianLayout','specVanish','oMath','rPrChange'],
 'tcPr': ['cnfStyle','tcW','gridSpan','hMerge','vMerge','tcBorders','shd','noWrap',
          'tcMar','textDirection','tcFitText','vAlign','hideMark','headers',
          'cellIns','cellDel','cellMerge','tcPrChange'],
 'tblPr': ['tblStyle','tblpPr','tblOverlap','bidiVisual','tblStyleRowBandSize',
           'tblStyleColBandSize','tblW','jc','tblCellSpacing','tblInd',
           'tblBorders','shd','tblLayout','tblCellMar','tblLook','tblCaption',
           'tblDescription','tblPrChange'],
 'trPr': ['cnfStyle','divId','gridBefore','gridAfter','wBefore','wAfter','cantSplit',
          'trHeight','tblHeader','tblCellSpacing','jc','hidden','ins','del','trPrChange'],
 'sectPr': ['headerReference','footerReference','footnotePr','endnotePr','type','pgSz',
            'pgMar','paperSrc','pgBorders','lnNumType','pgNumType','cols','formProt',
            'vAlign','noEndnote','titlePg','textDirection','bidi','rtlGutter','docGrid',
            'printerSettings','sectPrChange'],
 'style': ['name','aliases','basedOn','next','link','autoRedefine','hidden','uiPriority',
           'semiHidden','unhideWhenUsed','qFormat','locked','personal','personalCompose',
           'personalReply','rsid','pPr','rPr','tblPr','trPr','tcPr','tblStylePr'],
 'tblStylePr': ['pPr','rPr','tblPr','trPr','tcPr'],
 # CT_TblBorders and CT_TcBorders both run top, left, bottom, right, then the
 # interior rules; pandoc's reference document emits the interior rules first.
 'tblBorders': ['top','start','left','bottom','end','right','insideH','insideV'],
 'tcBorders': ['top','start','left','bottom','end','right','insideH','insideV',
               'tl2br','tr2bl'],
 'settings': ['writeProtection','view','zoom','removePersonalInformation',
              'removeDateAndTime','doNotDisplayPageBoundaries','displayBackgroundShape',
              'printPostScriptOverText','printFractionalCharacterWidth','printFormsData',
              'embedTrueTypeFonts','embedSystemFonts','saveSubsetFonts','saveFormsData',
              'mirrorMargins','alignBordersAndEdges','bordersDoNotSurroundHeader',
              'bordersDoNotSurroundFooter','gutterAtTop','hideSpellingErrors',
              'hideGrammaticalErrors','activeWritingStyle','proofState','formsDesign',
              'attachedTemplate','linkStyles','stylePaneFormatFilter','stylePaneSortMethod',
              'documentType','mailMerge','revisionView','trackChanges','doNotTrackMoves',
              'doNotTrackFormatting','documentProtection','autoFormatOverride',
              'styleLockTheme','styleLockQFSet','defaultTabStop','autoHyphenation',
              'consecutiveHyphenLimit','hyphenationZone','doNotHyphenateCaps',
              'showEnvelope','summaryLength','clickAndTypeStyle','defaultTableStyle',
              'evenAndOddHeaders','bookFoldRevPrinting','bookFoldPrinting',
              'bookFoldPrintingSheets','drawingGridHorizontalSpacing',
              'drawingGridVerticalSpacing','displayHorizontalDrawingGridEvery',
              'displayVerticalDrawingGridEvery','doNotUseMarginsForDrawingGridOrigin',
              'drawingGridHorizontalOrigin','drawingGridVerticalOrigin',
              'doNotShadeFormData','noPunctuationKerning','characterSpacingControl',
              'printTwoOnOne','strictFirstAndLastChars','noLineBreaksAfter',
              'noLineBreaksBefore','savePreviewPicture','doNotValidateAgainstSchema',
              'saveInvalidXml','ignoreMixedContent','alwaysShowPlaceholderText',
              'doNotDemarcateInvalidXml','saveXmlDataOnly','useXSLTWhenSaving',
              'saveThroughXslt','showXMLTags','alwaysMergeEmptyNamespace',
              'updateFields','hdrShapeDefaults','footnotePr','endnotePr','compat',
              'docVars','rsids','mathPr','themeFontLang','clrSchemeMapping',
              'doNotIncludeSubdocsInStats','doNotAutoCompressPictures','forceUpgrade',
              'captions','readModeInkLockDown','smartTagType','schemaLibrary',
              'shapeDefaults','doNotEmbedSmartTags','decimalSymbol','listSeparator'],
}


def reorder(root):
    changed = 0
    for node in root.iter():
        name = etree.QName(node).localname
        seq = SEQ.get(name)
        if not seq:
            continue
        kids = list(node)
        def key(i_child):
            i, child = i_child
            local = etree.QName(child).localname
            return (seq.index(local) if local in seq else len(seq), i)
        ordered = [c for _, c in sorted(enumerate(kids), key=key)]
        if ordered != kids:
            for c in kids:
                node.remove(c)
            for c in ordered:
                node.append(c)
            changed += 1
    return changed


def main(path):
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile(path) as z:
        z.extractall(tmp); names = z.namelist()
    total = 0
    for part in ('word/document.xml', 'word/styles.xml', 'word/settings.xml',
                 'word/numbering.xml', 'word/footnotes.xml', 'word/header1.xml'):
        full = os.path.join(tmp, part)
        if not os.path.exists(full):
            continue
        tree = etree.parse(full)
        total += reorder(tree.getroot())
        if part.endswith('numbering.xml'):
            # w:nsid takes an eight digit hexadecimal value; a shorter one is
            # rejected outright rather than padded.
            for n in tree.getroot().iter(q('nsid')):
                v = n.get(q('val')) or ''
                if len(v) != 8:
                    n.set(q('val'), v.rjust(8, '0')[-8:])
        tree.write(full, xml_declaration=True, encoding='UTF-8', standalone=True)
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        for name in names:
            z.write(os.path.join(tmp, name), name)
    shutil.rmtree(tmp)
    print(f"  ok  {total} property groups reordered to the OOXML schema")


if __name__ == '__main__':
    main(sys.argv[1])
