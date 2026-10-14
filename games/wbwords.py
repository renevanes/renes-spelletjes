# Woordbord word list builder.
# Source: OpenTaal wordlist (https://github.com/OpenTaal/opentaal-wordlist), dual-licensed BSD / CC BY 3.0.
# Usage: python3 wbwords.py [path/to/opentaal-wordlist]  ->  wbdict.txt (filtered words) + wbdict.b64 (front-coded, gzip + base64)
#
# Filter: 2..15 letters, only a-z (lines with capitals = proper nouns/acronyms, digits, hyphens, apostrophes,
# spaces and accents are dropped), at least one vowel (drops most abbreviations like km, tv, hst), minus a
# small list of lower-case abbreviations. 'ij' is simply the two letters i + j.
#
# Output format: front-coded sorted list (see below), gzip + base64 -> wbdict.b64. The game unpacks it with
# DecompressionStream('gzip') and builds a trie in typed arrays in one linear pass (first child = next node).
import sys, os, re, gzip, base64
here = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', 'wbsrc', 'opentaal-wordlist')
ABBR = set('''apr aug okt nov dec jan feb mrt alv anw bijv enz etc evt ivm mevr resp vnl ca ib ub ud ic ia eg bv
 ahs ahd adi aiv bijl blz ca cao cie corp dhr drs ds esa euro afd afl alg arr bep betr bijz biz bv
 dgl dir doc dw fa fig geb gem gld insp jl jr kap kol kon luit max min mld mln mr mw nat ned nl nr
 pag pct penn plm prof prov red sec secr sr st tel temp th uitg vert vgl vlg vs vz wo zg zgn zo ae
 oa ow ie io co em eo ao ea eu oe aa'''.split())
# keep real words that happen to be in the list above
for w in 'euro aa ie zo oe eu co aug dec min max nat red tel temp prof doc sec gem kap kol arr wo mw'.split(): ABBR.discard(w)
words = set()
for line in open(os.path.join(src, 'wordlist.txt'), encoding='utf-8'):
    w = line.rstrip('\n')
    if not re.fullmatch(r'[a-z]{2,15}', w): continue
    if not re.search(r'[aeiouy]', w): continue
    if w in ABBR: continue
    words.add(w)
words = sorted(words)
open(os.path.join(here, 'wbdict.txt'), 'w').write('\n'.join(words) + '\n')

# ---- front coding: one char (48 + length of the prefix shared with the previous word) + the rest of the word.
# The marker chars ('0'..'>') never collide with letters, so no separators are needed. gzip (level 9) + base64.
out = []; prev = ''
for w in words:
    cp = 0
    while cp < min(len(w), len(prev)) and w[cp] == prev[cp]: cp += 1
    out.append(chr(48 + cp) + w[cp:]); prev = w
raw = ''.join(out).encode()
gz = gzip.compress(raw, 9, mtime=0)
b64 = base64.b64encode(gz).decode()
open(os.path.join(here, 'wbdict.b64'), 'w').write(b64)
print('words', len(words), 'front-coded', len(raw), 'gzip', len(gz), 'base64', len(b64))
