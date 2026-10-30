#!/bin/sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S" "$ROOT/build/gfx"
# Dakrenner: (re)solve the levels with the test bot if asked (SOLVE=1, or no solutions yet), build dr.js / dr.json from drsrc/,
# install into a TEST COPY of index.html (build/work/drtest/index.html) and syntax-check the result.
#   Usage: sh games/rebuild_dr.sh   |   SOLVE=1 sh games/rebuild_dr.sh
set -e
mkdir -p $S/drtest
cd $ROOT/games
if [ "$SOLVE" = "1" ] || [ ! -f drsrc/solutions.json ]; then node drsolve.mjs; fi
python3 drbuild.py
cp $ROOT/app/src/main/assets/index.html $S/drtest/index.html
INDEX=$S/drtest/index.html python3 addgame.py dr.json
python3 -c "
s=open('$S/drtest/index.html').read(); i=s.rindex('<script>'); j=s.rindex('</script>'); open('$S/drtest/check.js','w').write(s[i+8:j])"
node --check $S/drtest/check.js && echo SYNTAX_OK
ls -l $S/drtest/index.html dr.json
