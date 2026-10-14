#!/bin/sh
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S/gfx"; ln -sfn "$ROOT/games" "$S/newgames"
# dev loop: fresh test copy of the real index.html + install v2 + syntax check
set -e

cp $S/kbtest/index.orig.html $S/kbtest/index.html
INDEX=$S/kbtest/index.html python3 $S/newgames/kb2install.py
python3 -c "
s=open('$S/kbtest/index.html').read(); i=s.rindex('<script>'); j=s.rindex('</script>'); open('$S/kbtest/check.js','w').write(s[i+8:j])"
node --check $S/kbtest/check.js && echo SYNTAX_OK
