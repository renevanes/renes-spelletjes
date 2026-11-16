# contact sheet of the Woordzoeker screenshots: python3 games/wzsheet.py  ->  build/gfx/wz_sheet.png
import os
from PIL import Image, ImageDraw
G = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'build', 'gfx')
port = ['start', 'howto', 'themes', 'makkelijk', 'normaal_drag', 'moeilijk_hint', 'expert', 'secret', 'solved', 'bigtext']
land = ['landscape', 'landscape_secret', 'landscape_start']
pw, ph, cols = 300, 666, 5
names = [n for n in port if os.path.exists(os.path.join(G, f'wz_{n}.png'))]
rows = (len(names) + cols - 1) // cols
lw = 2 * pw + 10; lh = round(lw * 412 / 915)
W = cols * (pw + 10) + 10
H = rows * (ph + 26) + 10 + ((len(land) + 1) // 2) * (lh + 26) + 10
sheet = Image.new('RGB', (W, H), '#0f2638'); d = ImageDraw.Draw(sheet)
for k, n in enumerate(names):
    im = Image.open(os.path.join(G, f'wz_{n}.png')).convert('RGB').resize((pw, ph))
    x, y = 10 + (k % cols) * (pw + 10), 10 + (k // cols) * (ph + 26); sheet.paste(im, (x, y)); d.text((x + 4, y + ph + 6), n, fill='#cfe3f2')
y0 = 10 + rows * (ph + 26)
for k, n in enumerate(land):
    p = os.path.join(G, f'wz_{n}.png')
    if not os.path.exists(p): continue
    x, y = 10 + (k % 2) * (lw + 10), y0 + (k // 2) * (lh + 26)
    sheet.paste(Image.open(p).convert('RGB').resize((lw, lh)), (x, y)); d.text((x + 4, y + lh + 6), n, fill='#cfe3f2')
p = os.path.join(G, 'wz_menu_tile.png')
if os.path.exists(p):
    im = Image.open(p).convert('RGB'); s = min((lw - 20) / im.width, 1.0); im = im.resize((round(im.width * s), round(im.height * s)))
    x, y = 10 + lw + 10, y0 + lh + 26; sheet.paste(im, (x, y)); d.text((x + 2, y + im.height + 4), 'menu_tile', fill='#cfe3f2')
sheet.save(os.path.join(G, 'wz_sheet.png')); print(sheet.size)
