#!/bin/sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S/gfx"; ln -sfn "$ROOT/games" "$S/newgames"
# Kleurbuisjes: (re)generate levels if asked (GEN=1 or no levels yet), build ls.js / ls.json, install into a TEST COPY
# of index.html (scratchpad/lstest/index.html) and syntax-check the result.   Usage: sh rebuild_ls.sh   |   GEN=1 sh rebuild_ls.sh
set -e

mkdir -p $S/lstest
cd $S/newgames
if [ "$GEN" = "1" ] || [ ! -f lssrc/levels.json ]; then node lsgen.mjs; fi
python3 lsbuild.py
cp $ROOT/app/src/main/assets/index.html $S/lstest/index.html
INDEX=$S/lstest/index.html python3 addgame.py ls.json
python3 -c "
s=open('$S/lstest/index.html').read(); i=s.rindex('<script>'); j=s.rindex('</script>'); open('$S/lstest/check.js','w').write(s[i+8:j])"
node --check $S/lstest/check.js && echo SYNTAX_OK
