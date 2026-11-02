# contact sheet of the Zandrijk screenshots: python3 games/zrsheet.py  ->  build/gfx/zr_sheet.png
import os
from PIL import Image, ImageDraw
G = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'build', 'gfx')
land = ['start', 'factions', 'campaign', 'briefing', 'base', 'harvesting', 'placing', 'kruiper', 'battle', 'mission', 'pause', 'win']
port = ['portrait_start', 'portrait']
small = ['menu_tile', 'buildbar', 'minimap']
w, h, cols = 610, 275, 3
names = [n for n in land if os.path.exists(os.path.join(G, f'zr_{n}.png'))]
rows = (len(names) + cols - 1) // cols
ph = 600; pw = round(ph * 412 / 915)
W = cols * (w + 10) + 10 + 2 * (pw + 10) + 10
H = max(rows * (h + 26) + 10, ph + 40 + 330)
sheet = Image.new('RGB', (W, H), '#1a120a'); d = ImageDraw.Draw(sheet)
for k, n in enumerate(names):
    im = Image.open(os.path.join(G, f'zr_{n}.png')).convert('RGB').resize((w, h))
    x, y = 10 + (k % cols) * (w + 10), 10 + (k // cols) * (h + 26); sheet.paste(im, (x, y)); d.text((x + 4, y + h + 6), n, fill='#e8d0b0')
x0 = 10 + cols * (w + 10)
for k, n in enumerate(port):
    p = os.path.join(G, f'zr_{n}.png')
    if os.path.exists(p): sheet.paste(Image.open(p).convert('RGB').resize((pw, ph)), (x0 + k * (pw + 10), 10)); d.text((x0 + k * (pw + 10) + 4, ph + 16), n, fill='#e8d0b0')
x, y = x0, ph + 40
for n in small:
    p = os.path.join(G, f'zr_{n}.png')
    if not os.path.exists(p): continue
    im = Image.open(p).convert('RGB'); s = min(280 / im.height, (2 * (pw + 10) - 10) / im.width, 1.0); im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))))
    if x + im.width > W - 10: x = x0; y += 290
    sheet.paste(im, (x, y)); d.text((x + 2, y + im.height + 2), n, fill='#e8d0b0'); x += im.width + 10
sheet.save(os.path.join(G, 'zr_sheet.png')); print(sheet.size)
