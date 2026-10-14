#!/bin/sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S/gfx"; ln -sfn "$ROOT/games" "$S/newgames"
# Wereldquiz: (re)prepare the data if asked (PREP=1 or no data yet), build wq.js / wq.json, install into a TEST COPY
# of index.html (scratchpad/wqtest/index.html) and syntax-check the result.   Usage: sh rebuild_wq.sh   |   PREP=1 sh rebuild_wq.sh
set -e

mkdir -p $S/wqtest
cd $S/newgames
if [ "$PREP" = "1" ] || [ ! -f wqsrc/countries.json ] || [ ! -f wqsrc/map.bin ]; then sh wqprep.sh; fi
python3 wqbuild.py
cp $ROOT/app/src/main/assets/index.html $S/wqtest/index.html
INDEX=$S/wqtest/index.html python3 addgame.py wq.json
python3 -c "
s=open('$S/wqtest/index.html').read(); i=s.rindex('<script>'); j=s.rindex('</script>'); open('$S/wqtest/check.js','w').write(s[i+8:j])"
node --check $S/wqtest/check.js && echo SYNTAX_OK
ls -l $S/wqtest/index.html $ROOT/app/src/main/assets/index.html
