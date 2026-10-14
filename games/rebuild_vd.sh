#!/bin/sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S/gfx"; ln -sfn "$ROOT/games" "$S/newgames"
# Vuistduel: build vd.js / vd.json from vdsrc/, install into a TEST COPY of index.html (scratchpad/vdtest/index.html)
# and syntax-check the result.   Usage: sh rebuild_vd.sh
set -e

mkdir -p $S/vdtest
cd $S/newgames
python3 vdbuild.py
cp $ROOT/app/src/main/assets/index.html $S/vdtest/index.html
INDEX=$S/vdtest/index.html python3 addgame.py vd.json
python3 -c "
s=open('$S/vdtest/index.html').read(); i=s.rindex('<script>'); j=s.rindex('</script>'); open('$S/vdtest/check.js','w').write(s[i+8:j])"
node --check $S/vdtest/check.js && echo SYNTAX_OK
ls -l $S/vdtest/index.html vd.json
