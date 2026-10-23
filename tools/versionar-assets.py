#!/usr/bin/env python3
"""Atualiza ?v=<hash> dos assets com cache 'immutable' em todos os .html.
Rode depois de editar bundle.min.js, style.css ou zap-companion.css:
    python3 tools/versionar-assets.py"""
import re, glob, hashlib, os, sys
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
skip = set(sys.argv[1:])
H = {a: hashlib.md5(open(a, 'rb').read()).hexdigest()[:8]
     for a in ('bundle.min.js', 'style.css', 'zap-companion.css') if os.path.exists(a) and a not in skip}
pat = re.compile(r'((?:src|href)=["\'])(/?)(' + '|'.join(map(re.escape, H)) + r')(\?v=[^"\']*)?(["\'])')
n = 0
for f in glob.glob('*.html'):
    s = open(f, encoding='utf-8').read()
    t = pat.sub(lambda m: f'{m[1]}{m[2]}{m[3]}?v={H[m[3]]}{m[5]}', s)
    if t != s:
        open(f, 'w', encoding='utf-8').write(t); n += 1
print('assets:', H, '| html atualizados:', n)
