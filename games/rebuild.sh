ROOT="$(cd "$(dirname "$0")/.." && pwd)"; S="$ROOT/build/work"; mkdir -p "$S/gfx"; ln -sfn "$ROOT/games" "$S/newgames"
set -e
cd "$(dirname "$0")"
python3 kblevels.py >/dev/null && python3 kbbuild.py && cp ../index.pre-kb.html $ROOT/app/src/main/assets/index.html && python3 addgame.py kb.json
