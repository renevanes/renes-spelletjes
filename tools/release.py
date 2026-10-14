#!/usr/bin/env python3
"""Make a release: next version, notes from changes/, build + sign web bundle and APK, write the published files.

Runs in GitHub Actions on every push to main (see .github/workflows/release.yml), one release at a time.
Agents never run this by hand and never edit the published files (update.json, web/, apk/, changelog.json).

    python3 tools/release.py            # needs keys/ (decrypted from secrets/signing.tar.gz.enc)
    python3 tools/release.py --dry-run  # everything into build/, published files untouched (keys still needed for signing)

Versioning: versionCode = previous + 1, versionName = "1.<versionCode-1>" (the app's existing scheme, e.g. 58 -> 1.57).
Native updates: a hash of the Java code, resources and manifest (without version numbers) is kept in update.json.
When it changes, nativeLevel goes up by one and is compiled into the APK, so installed apps ask to install the new APK;
web-only changes are picked up by the app itself without reinstalling.
"""
import argparse, base64, datetime, glob, hashlib, json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda *p: os.path.join(ROOT, *p)
KEYS = os.environ.get('KEYS_DIR', J('keys'))          # signing keys (never committed)


def native_hash():
    h = hashlib.sha256()
    files = sorted(glob.glob(J('app/src/main/java/**/*'), recursive=True) + glob.glob(J('app/src/main/res/**/*'), recursive=True))
    for f in files:
        if os.path.isfile(f):
            h.update(os.path.relpath(f, ROOT).encode()); h.update(open(f, 'rb').read())
    man = open(J('app/src/main/AndroidManifest.xml'), encoding='utf-8').read()
    man = re.sub(r'android:version(Code|Name)="[^"]*"', '', man)
    h.update(man.encode())
    return h.hexdigest()


def source_native_level():
    m = re.search(r'NATIVE_LEVEL = (\d+);', open(J('app/src/main/java/nl/rene/spelletjes/Updater.java'), encoding='utf-8').read())
    return int(m.group(1))


def collect_notes():
    frags = sorted(f for f in glob.glob(J('changes', '*.md')) if os.path.basename(f).lower() != 'readme.md')
    texts = [open(f, encoding='utf-8').read().strip() for f in frags]
    texts = [t for t in texts if t]
    return frags, ('\n'.join(texts) if texts else 'Kleine verbeteringen en reparaties.')


def run(cmd, **kw):
    print('+', ' '.join(cmd) if isinstance(cmd, list) else cmd, flush=True)
    subprocess.run(cmd, check=True, cwd=ROOT, **kw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()

    prev = json.load(open(J('update.json'), encoding='utf-8'))
    code = int(prev['versionCode']) + 1
    name = f"1.{code - 1}"
    nh = native_hash()
    native = max(int(prev.get('nativeLevel', 1)), source_native_level())
    if prev.get('nativeHash') and prev['nativeHash'] != nh:
        native += 1
    frags, notes = collect_notes()
    print(f'release: v{name} (code {code}), nativeLevel {native}{" (raised)" if native > prev.get("nativeLevel", 1) else ""}\nnotes: {notes}')

    # version history embedded in the app (oldest first)
    cl = json.load(open(J('changelog.json'), encoding='utf-8')) if os.path.exists(J('changelog.json')) else []
    cl = [o for o in cl if o['v'] != name] + [{'v': name, 'date': datetime.date.today().isoformat(), 'notes': notes}]
    os.makedirs(J('build'), exist_ok=True)
    json.dump(cl, open(J('build', 'changelog.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

    run([sys.executable, 'tools/build_web.py', '--version', name, '--changelog', 'build/changelog.json'])
    env = dict(os.environ, KEYS_DIR=KEYS, VERSION_CODE=str(code), VERSION_NAME=name, NATIVE_LEVEL=str(native), WEB_HTML='build/web/index.html')
    run(['bash', 'tools/build_apk.sh'], env=env)

    # sign the web bundle (ECDSA P-256; the app verifies it with the public key compiled into it)
    web = J('build', 'web', 'index.html')
    run(['openssl', 'dgst', '-sha256', '-sign', os.path.join(KEYS, 'update-ec.pem'), '-out', 'build/web.sig', web])
    pub = subprocess.run(['openssl', 'ec', '-in', os.path.join(KEYS, 'update-ec.pem'), '-pubout'], capture_output=True, check=True, cwd=ROOT).stdout
    open(J('build', 'update-ec.pub'), 'wb').write(pub)
    run(['openssl', 'dgst', '-sha256', '-verify', 'build/update-ec.pub', '-signature', 'build/web.sig', web])

    upd = {
        'versionCode': code, 'versionName': name, 'nativeLevel': native, 'notes': notes,
        'web': 'web/index.html', 'webSha256': hashlib.sha256(open(web, 'rb').read()).hexdigest(),
        'webSig': base64.b64encode(open(J('build', 'web.sig'), 'rb').read()).decode(),
        'apk': 'apk/Renes-spelletjes.apk', 'feedbackUrl': prev.get('feedbackUrl', ''), 'nativeHash': nh,
    }
    if a.dry_run:
        json.dump(upd, open(J('build', 'update.json'), 'w'), indent=2)
        print('release: dry run, results in build/ (published files untouched)')
        return
    os.makedirs(J('web'), exist_ok=True); os.makedirs(J('apk'), exist_ok=True)
    shutil.copy(web, J('web', 'index.html'))
    shutil.copy(J('build', 'apk', 'Renes-spelletjes.apk'), J('apk', 'Renes-spelletjes.apk'))
    shutil.copy(J('build', 'changelog.json'), J('changelog.json'))
    json.dump(upd, open(J('update.json'), 'w'), indent=2)
    for f in frags:
        os.remove(f)
    open(J('build', 'release.txt'), 'w', encoding='utf-8').write(f'{name}\n{notes}\n')
    print(f'release: published files written for v{name}')


if __name__ == '__main__':
    main()
