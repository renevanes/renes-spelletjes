# contact sheet of the Bushalte screenshots: python3 bhsheet.py  ->  ../gfx/bh_sheet.png
import os
from PIL import Image, ImageDraw
G = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'gfx')
port = ['start', 'l1', 'drive', 'board', 'bump', 'early', 'mid', 'late', 'stuck', 'extrabay', 'shuffle', 'crane', 'win', 'cb', 'bigtext']
land = ['startL', 'land', 'winL']
H = 640
def load(n):
    im = Image.open(os.path.join(G, f'bh_{n}.png')).convert('RGB'); return im.resize((round(im.width * H / im.height), H))
ims = [load(n) for n in port if os.path.exists(os.path.join(G, f'bh_{n}.png'))]
cols = 8; w = ims[0].width; rows = (len(ims) + cols - 1) // cols
lims = [load(n) for n in land]
lh = 330; lims = [im.resize((round(im.width * lh / im.height), lh)) for im in lims]
W = max(cols * (w + 10) + 10, sum(i.width + 10 for i in lims) + 10)
sheet = Image.new('RGB', (W, rows * (H + 30) + lh + 60), '#20262e'); d = ImageDraw.Draw(sheet)
names = [n for n in port if os.path.exists(os.path.join(G, f'bh_{n}.png'))]
for k, im in enumerate(ims):
    x, y = 10 + (k % cols) * (w + 10), 10 + (k // cols) * (H + 30); sheet.paste(im, (x, y)); d.text((x + 4, y + H + 4), names[k], fill='#ddd')
x, y = 10, rows * (H + 30) + 20
for n, im in zip(land, lims): sheet.paste(im, (x, y)); d.text((x + 4, y + lh + 4), n, fill='#ddd'); x += im.width + 10
menu = Image.open(os.path.join(G, 'bh_menu.png')).convert('RGB'); sheet.paste(menu.resize((menu.width * 2 // 3, menu.height * 2 // 3)), (x + 10, y))
sheet.save(os.path.join(G, 'bh_sheet.png')); print(sheet.size)
