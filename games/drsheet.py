# contact sheet of the Dakrenner screenshots: python3 games/drsheet.py  ->  build/gfx/dr_sheet.png
import os
from PIL import Image, ImageDraw
G = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'build', 'gfx')
land = ['start', 'levels', 'levels_w2', 'levels_w4', 'world1', 'world2', 'world3', 'world4', 'flip', 'flip_land', 'slide', 'wallrun', 'vault', 'bar',
        'zip', 'crane', 'saws', 'vents', 'crumble', 'neon', 'crash', 'ghost', 'pause', 'results', 'lowquality']
port = ['portrait_start', 'portrait_levels', 'portrait']
w, h, cols = 610, 275, 4
names = [n for n in land if os.path.exists(os.path.join(G, f'dr_{n}.png'))]
rows = (len(names) + cols - 1) // cols
ph = 560; pw = round(ph * 412 / 915)
W = cols * (w + 10) + 10 + 3 * (pw + 10)
sheet = Image.new('RGB', (W, max(rows * (h + 26) + 10, ph + 300)), '#1c2030'); d = ImageDraw.Draw(sheet)
for k, n in enumerate(names):
    im = Image.open(os.path.join(G, f'dr_{n}.png')).convert('RGB').resize((w, h))
    x, y = 10 + (k % cols) * (w + 10), 10 + (k // cols) * (h + 26); sheet.paste(im, (x, y)); d.text((x + 4, y + h + 6), n, fill='#ddd')
x0 = 10 + cols * (w + 10)
for k, n in enumerate(port):
    p = os.path.join(G, f'dr_{n}.png')
    if os.path.exists(p): sheet.paste(Image.open(p).convert('RGB').resize((pw, ph)), (x0 + k * (pw + 10), 10)); d.text((x0 + k * (pw + 10) + 4, ph + 16), n, fill='#ddd')
for n, y in [('icon', ph + 40), ('menu_tile', ph + 200)]:
    p = os.path.join(G, f'dr_{n}.png')
    if os.path.exists(p): im = Image.open(p).convert('RGB'); im = im.resize((round(im.width * 140 / im.height), 140)); sheet.paste(im.crop((0, 0, min(im.width, 3 * (pw + 10)), 140)), (x0, y))
sheet.save(os.path.join(G, 'dr_sheet.png')); print(sheet.size)
