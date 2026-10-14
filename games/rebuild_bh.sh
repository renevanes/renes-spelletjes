#!/bin/sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S/gfx"; ln -sfn "$ROOT/games" "$S/newgames"
# Bushalte: (re)generate levels if asked (GEN=1 or no levels yet), build bh.js / bh.json, install into a TEST COPY
# of index.html and syntax-check the result.   Usage: sh rebuild_bh.sh   |   GEN=1 sh rebuild_bh.sh
set -e

mkdir -p $S/bhtest
cd $S/newgames
if [ "$GEN" = "1" ] || [ ! -f bhsrc/levels.json ]; then node bhgen.mjs; fi
python3 bhbuild.py
cp $ROOT/app/src/main/assets/index.html $S/bhtest/index.html
INDEX=$S/bhtest/index.html python3 addgame.py bh.json
python3 -c "
s=open('$S/bhtest/index.html').read(); i=s.rindex('<script>'); j=s.rindex('</script>'); open('$S/bhtest/check.js','w').write(s[i+8:j])"
node --check $S/bhtest/check.js && echo SYNTAX_OK
