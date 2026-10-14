#!/usr/bin/env python3
"""Build the web bundle of the app: app/src/main/assets/index.html -> build/web/index.html.

Needs no Android tools, so every agent can build and test locally:
    python3 tools/build_web.py                  # version from the manifest, minified when the minifier is installed
    python3 tools/build_web.py --no-minify      # readable output for debugging
The release pipeline (tools/release.py) calls this with the new version and the updated version history.
"""
import argparse, datetime, json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'app', 'src', 'main', 'assets', 'index.html')
MANIFEST = os.path.join(ROOT, 'app', 'src', 'main', 'AndroidManifest.xml')


def manifest_version():
    m = re.search(r'android:versionName="([^"]+)"', open(MANIFEST, encoding='utf-8').read())
    return m.group(1) if m else '0.0'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--version', help='version name shown in the app (default: from the manifest)')
    ap.add_argument('--changelog', default=os.path.join(ROOT, 'changelog.json'), help='version history (oldest first)')
    ap.add_argument('--out', default=os.path.join(ROOT, 'build', 'web', 'index.html'))
    ap.add_argument('--no-minify', action='store_true')
    a = ap.parse_args()

    version = a.version or manifest_version()
    html = open(SRC, encoding='utf-8').read()
    if '__VERSION__' not in html or '/*CL*/[]/*CL*/' not in html:
        sys.exit('build_web: placeholders __VERSION__ or /*CL*/[]/*CL*/ missing in index.html')
    cl = json.load(open(a.changelog, encoding='utf-8')) if os.path.exists(a.changelog) else []
    html = (html.replace('__VERSION__', version)
                .replace('/*CL*/[]/*CL*/', json.dumps(cl[::-1], ensure_ascii=False))
                .replace('__BUILD_DATE__', datetime.datetime.now().strftime('%d-%m-%Y %H:%M')))
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    tmp = a.out + '.tmp.html'
    open(tmp, 'w', encoding='utf-8').write(html)

    mini = os.path.join(ROOT, 'node_modules', '.bin', 'html-minifier-terser')
    if not a.no_minify and os.path.exists(mini):
        subprocess.run([mini, '--collapse-whitespace', '--conservative-collapse', '--remove-comments', '--minify-css', 'true',
                        '--minify-js', '{"compress":{"passes":2},"mangle":true,"format":{"comments":false}}',
                        '-o', a.out, tmp], check=True)
        os.remove(tmp)
    else:
        if not a.no_minify:
            print('build_web: html-minifier-terser not installed (run `npm ci`), writing unminified output', file=sys.stderr)
        shutil.move(tmp, a.out)

    # sanity: the last <script> must be valid JavaScript
    out = open(a.out, encoding='utf-8').read()
    scripts = re.findall(r'<script>(.*?)</script>', out, re.S)
    if scripts and shutil.which('node'):
        chk = os.path.join(os.path.dirname(a.out), 'check.js')
        open(chk, 'w', encoding='utf-8').write(scripts[-1])
        r = subprocess.run(['node', '--check', chk], capture_output=True, text=True)
        os.remove(chk)
        if r.returncode:
            sys.exit('build_web: JavaScript syntax error\n' + r.stderr[-2000:])
    print(f'build_web: {os.path.relpath(a.out, ROOT)} v{version} ({len(out):,} bytes)')


if __name__ == '__main__':
    main()
