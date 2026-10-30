#!/bin/sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S/wktest" "$ROOT/build/gfx"
# Woef tegen Karel: build wk.js / wk.json from wksrc/, install into a TEST COPY of index.html (build/work/wktest/index.html),
# syntax-check it and (MIN=1) also make a minified build of that copy in build/work/wkweb/index.html.
#   Usage: sh games/rebuild_wk.sh   |   MIN=1 sh games/rebuild_wk.sh
set -e
cd "$ROOT/games"
python3 wkbuild.py
cp "$ROOT/app/src/main/assets/index.html" "$S/wktest/index.html"
INDEX="$S/wktest/index.html" python3 addgame.py wk.json
python3 -c "
s=open('$S/wktest/index.html').read(); i=s.rindex('<script>'); j=s.rindex('</script>'); open('$S/wktest/check.js','w').write(s[i+8:j])"
node --check "$S/wktest/check.js" && echo SYNTAX_OK
if [ "$MIN" = "1" ]; then
  mkdir -p "$S/wkweb"
  python3 -c "
import runpy, sys
m = runpy.run_path('$ROOT/tools/build_web.py', run_name='lib')
m['main'].__globals__['SRC'] = '$S/wktest/index.html'
sys.argv = ['build_web', '--out', '$S/wkweb/index.html']
m['main']()"
fi
ls -l "$S/wktest/index.html" wk.json
