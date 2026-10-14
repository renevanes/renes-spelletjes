# tweak per-fighter stat line in vdsrc/data.js:  python3 vdtune.py id key=value ...
import re, sys
s = open('vdsrc/data.js').read()
cid = sys.argv[1]
i = s.index("{ id: '%s'," % cid); j = s.index('sp: [', i)
block = s[i:j]
for kv in sys.argv[2:]:
    k, v = kv.split('=')
    block, n = re.subn(r'(\b%s: )([-\d.]+)' % k, r'\g<1>' + v, block, count=1)
    assert n == 1, (cid, k)
s = s[:i] + block + s[j:]
open('vdsrc/data.js', 'w').write(s)
