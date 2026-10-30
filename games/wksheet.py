# contact sheet of the Woef tegen Karel screenshots: python3 games/wksheet.py  ->  build/gfx/wk_sheet.png
import os
from PIL import Image, ImageDraw
G = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'build', 'gfx')
land = ['start', 'map_w1', 'map_w2', 'map_w3', 'taunt', 'world1', 'world2', 'world3', 'm_bal', 'm_tik', 'm_kraan', 'm_worst', 'm_fan', 'm_kok', 'm_stempel', 'm_bubbel',
        'm_tand', 'm_weer', 'm_wekker', 'm_taart', 'm_mega', 'hit', 'hint', 'closeup', 'look', 'bark', 'sneeze', 'break', 'flee', 'cage', 'results']
port = ['portrait_start', 'portrait_map', 'portrait']
w, h, cols = 520, 234, 4
names = [n for n in land if os.path.exists(os.path.join(G, f'wk_{n}.png'))]
rows = (len(names) + cols - 1) // cols
ph = 620; pw = round(ph * 412 / 915)
W = cols * (w + 10) + 10 + 3 * (pw + 10)
sheet = Image.new('RGB', (W, max(rows * (h + 24) + 10, ph + 330)), '#20161c'); d = ImageDraw.Draw(sheet)
for k, n in enumerate(names):
    im = Image.open(os.path.join(G, f'wk_{n}.png')).convert('RGB').resize((w, h))
    x, y = 10 + (k % cols) * (w + 10), 10 + (k // cols) * (h + 24); sheet.paste(im, (x, y)); d.text((x + 4, y + h + 5), n, fill='#ddd')
x0 = 10 + cols * (w + 10)
for k, n in enumerate(port):
    p = os.path.join(G, f'wk_{n}.png')
    if os.path.exists(p): sheet.paste(Image.open(p).convert('RGB').resize((pw, ph)), (x0 + k * (pw + 10), 10)); d.text((x0 + k * (pw + 10) + 4, ph + 16), n, fill='#ddd')
for n, y, hh in [('icon', ph + 40, 150), ('menu_tile', ph + 210, 110)]:
    p = os.path.join(G, f'wk_{n}.png')
    if os.path.exists(p): im = Image.open(p).convert('RGB'); im = im.resize((round(im.width * hh / im.height), hh)); sheet.paste(im.crop((0, 0, min(im.width, 3 * (pw + 10)), hh)), (x0, y))
sheet.save(os.path.join(G, 'wk_sheet.png')); print(sheet.size, len(names), 'shots')
