#!/bin/sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S/gfx"; ln -sfn "$ROOT/games" "$S/newgames"
# Bellenschieter: (re)generate levels if asked (GEN=1 or no levels yet), build bs.js / bs.json, install into a TEST COPY
# of index.html and syntax-check the result.   Usage: sh rebuild_bs.sh   |   GEN=1 sh rebuild_bs.sh
set -e

mkdir -p $S/bstest
cd $S/newgames
if [ "$GEN" = "1" ] || [ ! -f bssrc/levels.json ]; then node bsgen.mjs; fi
python3 bsbuild.py
cp $ROOT/app/src/main/assets/index.html $S/bstest/index.html
INDEX=$S/bstest/index.html python3 addgame.py bs.json
python3 -c "
s=open('$S/bstest/index.html').read(); i=s.rindex('<script>'); j=s.rindex('</script>'); open('$S/bstest/check.js','w').write(s[i+8:j])"
node --check $S/bstest/check.js && echo SYNTAX_OK
