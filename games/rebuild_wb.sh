#!/bin/sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S/gfx"; ln -sfn "$ROOT/games" "$S/newgames"
# rebuild wb.js / wb.json and integrate into a TEST COPY of index.html, then syntax-check
set -e

mkdir -p $S/wbtest
cd $S/newgames && python3 wbbuild.py
cp $ROOT/app/src/main/assets/index.html $S/wbtest/index.html
INDEX=$S/wbtest/index.html python3 addgame.py wb.json
python3 -c "
s=open('$S/wbtest/index.html').read(); i=s.rindex('<script>'); j=s.rindex('</script>'); open('$S/wbtest/check.js','w').write(s[i+8:j])"
node --check $S/wbtest/check.js && echo SYNTAX_OK
