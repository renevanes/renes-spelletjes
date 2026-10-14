# contact sheet of the Wereldquiz screenshots: python3 wqsheet.py  ->  ../gfx/wq_sheet.png (portrait rows, then landscape, then the menu tile)
import os
from PIL import Image, ImageDraw
G = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'gfx')
ex = lambda n: os.path.exists(os.path.join(G, f'wq_{n}.png'))
port = [n for n in ['start', 'flag', 'flag_ok', 'flag_bad', 'nf', 'capital', 'typing', 'typing_ok', 'clock', 'end', 'map_name', 'map_tiny',
                    'tap_ask', 'tap_tiny_ok', 'tap_wrong', 'tap_zoom', 'atlas', 'progress', 'bigtext'] if ex(n)]
land = [n for n in ['startL', 'flagL', 'mapL', 'map_badL'] if ex(n)]
H = 640
def load(n, h):
    im = Image.open(os.path.join(G, f'wq_{n}.png')).convert('RGB'); return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
ims = [load(n, H) for n in port]
cols = 7; w = ims[0].width; rows = (len(ims) + cols - 1) // cols
lh = 300; lims = [load(n, lh) for n in land]
W = max(cols * (w + 10) + 10, sum(i.width + 10 for i in lims) + 10 + 300)
sheet = Image.new('RGB', (W, rows * (H + 30) + lh + 60), '#20262e'); d = ImageDraw.Draw(sheet)
for k, im in enumerate(ims):
    x, y = 10 + (k % cols) * (w + 10), 10 + (k // cols) * (H + 30); sheet.paste(im, (x, y)); d.text((x + 4, y + H + 6), port[k], fill='#ddd')
x, y = 10, rows * (H + 30) + 20
for n, im in zip(land, lims): sheet.paste(im, (x, y)); d.text((x + 4, y + lh + 6), n, fill='#ddd'); x += im.width + 10
if ex('menu'):
    m = Image.open(os.path.join(G, 'wq_menu.png')).convert('RGB'); sheet.paste(m, (x + 10, y)); d.text((x + 14, y + m.height + 6), 'menu', fill='#ddd')
sheet.save(os.path.join(G, 'wq_sheet.png')); print(sheet.size)
