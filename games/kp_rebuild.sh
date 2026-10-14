#!/bin/sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S/gfx"; ln -sfn "$ROOT/games" "$S/newgames"
set -e

cd $S/newgames && python3 kpbuild.py
cp $ROOT/app/src/main/assets/index.html $S/kptest/index.html
INDEX=$S/kptest/index.html python3 addgame.py kp.json
python3 -c "
s=open('$S/kptest/index.html').read(); i=s.rindex('<script>'); j=s.rindex('</script>'); open('$S/kptest/check.js','w').write(s[i+8:j])"
node --check $S/kptest/check.js && echo SYNTAX_OK
