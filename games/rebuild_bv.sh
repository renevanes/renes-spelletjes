#!/bin/sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S/gfx"; ln -sfn "$ROOT/games" "$S/newgames"

cd $S/newgames && python3 bvbuild.py && cp $ROOT/app/src/main/assets/index.html $S/bvtest/index.html && INDEX=$S/bvtest/index.html python3 addgame.py bv.json && python3 -c "
s=open('$S/bvtest/index.html').read(); i=s.rindex('<script>'); j=s.rindex('</script>'); open('$S/bvtest/check.js','w').write(s[i+8:j])" && node --check $S/bvtest/check.js && echo SYNTAX_OK
