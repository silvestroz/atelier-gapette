#!/usr/bin/env python3
"""Check that every bundled text font covers the allowed character set.
Usage: pip install fonttools brotli && python3 tools/check-glyphs.py
Run it before adding a font id to assets/src/schema.js and includes/class-ag-schema.php."""
import glob, os, sys
from fontTools.ttLib import TTFont
ALLOWED = [chr(c) for c in list(range(0x41, 0x5B)) + list(range(0x61, 0x7B)) + list(range(0x30, 0x3A))
           + [c for c in range(0xC0, 0x100) if c not in (0xD7, 0xF7)]] + list("Œœ .,'’!?&:;()/+#@*\"«»…€-")
root = os.path.join(os.path.dirname(__file__), '..', 'assets', 'fonts')
ok = True
for f in sorted(glob.glob(os.path.join(root, '*.woff2'))):
    cmap = TTFont(f).getBestCmap()
    missing = ''.join(c for c in ALLOWED if ord(c) not in cmap)
    print(f"{os.path.basename(f):48s} {'OK' if not missing else 'MANQUANT : ' + missing}")
    ok &= not missing
sys.exit(0 if ok else 1)
