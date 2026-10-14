#!/bin/sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S/gfx"; ln -sfn "$ROOT/games" "$S/newgames"
# rebuild mj.js / mj.json and integrate into a TEST COPY of index.html, then syntax-check
set -e

mkdir -p $S/mjtest
cd $S/newgames && python3 mjbuild.py
cp $ROOT/app/src/main/assets/index.html $S/mjtest/index.html
INDEX=$S/mjtest/index.html python3 addgame.py mj.json
python3 -c "
s=open('$S/mjtest/index.html').read(); i=s.rindex('<script>'); j=s.rindex('</script>'); open('$S/mjtest/check.js','w').write(s[i+8:j])"
node --check $S/mjtest/check.js && echo SYNTAX_OK
