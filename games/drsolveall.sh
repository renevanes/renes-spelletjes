#!/bin/sh
# Runs the Dakrenner test bot on all levels in two parallel processes and merges the results (drsrc/solutions.json).
# Levels whose stored solution still replays to the finish with all shoes are kept.   Usage: sh games/drsolveall.sh [force]
cd "$(dirname "$0")"
DR_PART=a node drsolve.mjs 1,2,3,4,5,6,7,8,17,18,19,20,21,22,23,24 220 $1 > /tmp/drsolve.a.log 2>&1 &
DR_PART=b node drsolve.mjs 9,10,11,12,13,14,15,16,25,26,27,28,29,30,31,32 220 $1 > /tmp/drsolve.b.log 2>&1 &
wait
cat /tmp/drsolve.a.log /tmp/drsolve.b.log | sort -t' ' -k2 -n
node drsolve.mjs merge
