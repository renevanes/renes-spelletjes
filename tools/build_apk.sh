#!/bin/bash
# Build and sign the Android APK around an already built web bundle.
# Normally run by tools/release.py inside GitHub Actions (Android SDK from $ANDROID_HOME).
#
# Env:
#   VERSION_CODE, VERSION_NAME   required
#   NATIVE_LEVEL                 optional: overrides Updater.NATIVE_LEVEL in the build copy of the Java source
#   WEB_HTML                     built bundle (default build/web/index.html)
#   KEYS_DIR                     folder with release.p12, update-ec.pem and env (KEYSTORE_PASS=...); default keys/
#   LOCAL_TOOLS                  fallback toolchain dir without an Android SDK (aapt2 via aaptjs3, android.jar, d8 jar, uber-apk-signer)
# Output: build/apk/Renes-spelletjes.apk
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
: "${VERSION_CODE:?}"; : "${VERSION_NAME:?}"
WEB_HTML="${WEB_HTML:-build/web/index.html}"
KEYS_DIR="${KEYS_DIR:-keys}"
[ -f "$KEYS_DIR/env" ] && . "$KEYS_DIR/env"
KEYSTORE="${KEYSTORE:-$KEYS_DIR/release.p12}"; KEYSTORE_PASS="${KEYSTORE_PASS:?keystore password missing (keys/env)}"
B=build/apk; rm -rf "$B"; mkdir -p "$B/res" "$B/gen" "$B/classes" "$B/dex" "$B/assets" "$B/java"

if [ -n "${ANDROID_HOME:-}" ] && [ -d "$ANDROID_HOME/build-tools" ]; then
  BT="$ANDROID_HOME/build-tools/$(ls "$ANDROID_HOME/build-tools" | sort -V | tail -1)"
  PLAT="$(ls -d "$ANDROID_HOME"/platforms/android-* | sort -V | tail -1)"
  AAPT2="$BT/aapt2"; ANDROID_JAR="$PLAT/android.jar"; D8=("$BT/d8"); MODE=sdk
elif [ -n "${LOCAL_TOOLS:-}" ]; then
  AAPT2="$LOCAL_TOOLS/node_modules/aaptjs3/bin/x64/linux/aapt2"; ANDROID_JAR="$LOCAL_TOOLS/ap/android-36/android.jar"
  D8=(java -XX:+UnlockDiagnosticVMOptions -XX:-BytecodeVerificationRemote -cp "$LOCAL_TOOLS/d8-fixed2.jar" com.android.tools.r8.D8); MODE=local
else
  echo "build_apk: no Android SDK (ANDROID_HOME) and no LOCAL_TOOLS" >&2; exit 1
fi
echo "build_apk: $MODE toolchain, android.jar $(basename "$(dirname "$ANDROID_JAR")")"

# assets: the source assets with the built (versioned, minified) web bundle
cp -r app/src/main/assets/. "$B/assets/"; cp "$WEB_HTML" "$B/assets/index.html"
# java: a build copy, so NATIVE_LEVEL can be set by the release without touching the source
cp -r app/src/main/java/. "$B/java/"
if [ -n "${NATIVE_LEVEL:-}" ]; then
  sed -i -E "s/(static final int NATIVE_LEVEL = )[0-9]+;/\1${NATIVE_LEVEL};/" "$B/java/nl/rene/spelletjes/Updater.java"
  grep -q "NATIVE_LEVEL = ${NATIVE_LEVEL};" "$B/java/nl/rene/spelletjes/Updater.java"
fi

"$AAPT2" compile --dir app/src/main/res -o "$B/res/"
"$AAPT2" link -o "$B/unsigned.apk" -I "$ANDROID_JAR" --manifest app/src/main/AndroidManifest.xml \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" --replace-version \
  -A "$B/assets" --java "$B/gen" --min-sdk-version 24 --target-sdk-version 36 "$B"/res/*.flat
javac -nowarn --release 8 -cp "$ANDROID_JAR" -d "$B/classes" $(find "$B/java" "$B/gen" -name '*.java') 2>&1 | grep -v 'JAVA_TOOL\|bootstrap\|obsolete\|warning' || true
"${D8[@]}" --release --min-api 24 --lib "$ANDROID_JAR" --output "$B/dex" $(find "$B/classes" -name '*.class') 2>&1 | grep -v JAVA_TOOL || true
[ -f "$B/dex/classes.dex" ] || { echo "build_apk: d8 produced no classes.dex" >&2; exit 1; }
[ "$MODE" = local ] && python3 tools/fixdex.py "$B/dex/classes.dex"
(cd "$B/dex" && zip -q -j ../unsigned.apk classes.dex)

OUT="$B/Renes-spelletjes.apk"
if [ "$MODE" = sdk ]; then
  "$BT/zipalign" -f -p 4 "$B/unsigned.apk" "$B/aligned.apk"
  "$BT/apksigner" sign --ks "$KEYSTORE" --ks-type PKCS12 --ks-key-alias release --ks-pass "pass:$KEYSTORE_PASS" --key-pass "pass:$KEYSTORE_PASS" \
    --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out "$OUT" "$B/aligned.apk"
  "$BT/apksigner" verify "$OUT"
else
  java -jar "$LOCAL_TOOLS/uber.jar" -a "$B/unsigned.apk" -o "$B/signed" --ks "$KEYSTORE" --ksAlias release \
    --ksPass "$KEYSTORE_PASS" --ksKeyPass "$KEYSTORE_PASS" --allowResign 2>&1 | grep -E "error|ERROR|Successfully" || true
  cp "$B"/signed/*.apk "$OUT"
fi
echo "build_apk: $OUT v$VERSION_NAME ($VERSION_CODE) $(stat -c %s "$OUT") bytes"
