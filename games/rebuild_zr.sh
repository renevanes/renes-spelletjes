#!/bin/sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S" "$ROOT/build/gfx"
# Zandrijk: build zr.js / zr.json from zrsrc/, install into a TEST COPY of index.html (build/work/zrtest/index.html)
# and syntax-check the result.   Usage: sh games/rebuild_zr.sh   (MIN=1: also a minified build in build/work/zrtest/min/index.html)
set -e
mkdir -p $S/zrtest
cd $ROOT/games
python3 zrbuild.py
cp $ROOT/app/src/main/assets/index.html $S/zrtest/index.html
INDEX=$S/zrtest/index.html python3 addgame.py zr.json
python3 -c "
s=open('$S/zrtest/index.html').read(); i=s.rindex('<script>'); j=s.rindex('</script>'); open('$S/zrtest/check.js','w').write(s[i+8:j])"
node --check $S/zrtest/check.js && echo SYNTAX_OK
if [ "$MIN" = "1" ]; then
  python3 - "$S/zrtest" <<'EOF'
import sys, re, subprocess, os
d = sys.argv[1]; root = os.path.abspath(os.path.join(d, '..', '..', '..'))
html = open(os.path.join(d, 'index.html'), encoding='utf-8').read().replace('__VERSION__', 'test').replace('/*CL*/[]/*CL*/', '[]').replace('__BUILD_DATE__', 'test')
os.makedirs(os.path.join(d, 'min'), exist_ok=True); tmp = os.path.join(d, 'min', 'tmp.html'); open(tmp, 'w', encoding='utf-8').write(html)
subprocess.run([os.path.join(root, 'node_modules', '.bin', 'html-minifier-terser'), '--collapse-whitespace', '--conservative-collapse', '--remove-comments', '--minify-css', 'true',
  '--minify-js', '{"compress":{"passes":2},"mangle":true,"format":{"comments":false}}', '-o', os.path.join(d, 'min', 'index.html'), tmp], check=True)
os.remove(tmp); print('minified', os.path.getsize(os.path.join(d, 'min', 'index.html')))
EOF
fi
ls -l $S/zrtest/index.html zr.json
