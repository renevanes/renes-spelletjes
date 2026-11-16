#!/bin/sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S" "$ROOT/build/gfx"
# Logigram: build lg.js / lg.json from lgsrc/, install into a TEST COPY of index.html (build/work/lgtest/index.html)
# and syntax-check the result.   Usage: sh games/rebuild_lg.sh   (MIN=1: also a minified build in build/work/lgtest/min/index.html)
set -e
mkdir -p $S/lgtest
cd $ROOT/games
python3 lgbuild.py
cp $ROOT/app/src/main/assets/index.html $S/lgtest/index.html
INDEX=$S/lgtest/index.html python3 addgame.py lg.json
python3 -c "
s=open('$S/lgtest/index.html').read(); i=s.rindex('<script>'); j=s.rindex('</script>'); open('$S/lgtest/check.js','w').write(s[i+8:j])"
node --check $S/lgtest/check.js && echo SYNTAX_OK
if [ "$MIN" = "1" ]; then
  python3 - "$S/lgtest" <<'EOF'
import sys, re, subprocess, os
d = sys.argv[1]; root = os.path.abspath(os.path.join(d, '..', '..', '..'))
html = open(os.path.join(d, 'index.html'), encoding='utf-8').read().replace('__VERSION__', 'test').replace('/*CL*/[]/*CL*/', '[]').replace('__BUILD_DATE__', 'test')
os.makedirs(os.path.join(d, 'min'), exist_ok=True); tmp = os.path.join(d, 'min', 'tmp.html'); open(tmp, 'w', encoding='utf-8').write(html)
subprocess.run([os.path.join(root, 'node_modules', '.bin', 'html-minifier-terser'), '--collapse-whitespace', '--conservative-collapse', '--remove-comments', '--minify-css', 'true',
  '--minify-js', '{"compress":{"passes":2},"mangle":true,"format":{"comments":false}}', '-o', os.path.join(d, 'min', 'index.html'), tmp], check=True)
os.remove(tmp); print('minified', os.path.getsize(os.path.join(d, 'min', 'index.html')))
EOF
fi
ls -l $S/lgtest/index.html lg.json
