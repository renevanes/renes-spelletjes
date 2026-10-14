#!/bin/sh
# Wereldquiz data preparation (only needed when the sources change): flags (svgo), map (mapshaper), country table.
# Needs the npm packages in ../wqdata (cd ../wqdata && npm install flag-icons svgo world-atlas topojson-client mapshaper i18n-iso-countries countries-list).
set -e
cd "$(dirname "$0")"
node wqflags.mjs
node wqmap.mjs
node wqdump.mjs
