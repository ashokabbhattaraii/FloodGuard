#!/usr/bin/env python3
"""Rebuild figures/ from the sources already in the repository.

The screenshots live inside ../impl/System_Implementation.docx, so they are not
duplicated here. Run this once after a fresh clone, or after adding screenshots
to that document, then run ./build.sh.
"""
import os, shutil, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
FIGS = os.path.join(HERE, 'figures')
IMPL = os.path.normpath(os.path.join(HERE, '..', 'impl', 'System_Implementation.docx'))
ARCH = os.path.normpath(os.path.join(HERE, '..', 'figures', 'as-built-architecture.png'))

os.makedirs(FIGS, exist_ok=True)
with zipfile.ZipFile(IMPL) as z:
    names = [n for n in z.namelist() if n.startswith('word/media/') and n.endswith('.png')]
    for n in names:
        with z.open(n) as src, open(os.path.join(FIGS, os.path.basename(n)), 'wb') as dst:
            shutil.copyfileobj(src, dst)
shutil.copy(ARCH, FIGS)
print(f"extracted {len(names)} screenshots plus the architecture diagram into figures/")
