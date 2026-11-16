# contact sheet of the Logigram screenshots: python3 games/lgsheet.py  ->  build/gfx/lg_sheet.png
import os
from PIL import Image, ImageDraw
G = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'build', 'gfx')
port = ['start_p', 'play_p', 'hint_p', 'summary_p', 'menu_p', 'solved_p', 'fit_p', 'big_p']
land = ['start_l', 'play_l', 'hint_l', 'expert_l']
ph = 640; pw = round(ph * 412 / 915); lw, lh = 620, round(620 * 412 / 915)
cols = 4
W = 10 + cols * (pw + 10) + 2 * (lw + 10)
rows = (len(port) + cols - 1) // cols
H = max(10 + rows * (ph + 30), 10 + 2 * (lh + 30) + 360)
sheet = Image.new('RGB', (W, H), '#0f1b29'); d = ImageDraw.Draw(sheet)
for k, n in enumerate(port):
    f = os.path.join(G, f'lg_{n}.png')
    if not os.path.exists(f): continue
    x, y = 10 + (k % cols) * (pw + 10), 10 + (k // cols) * (ph + 30)
    sheet.paste(Image.open(f).convert('RGB').resize((pw, ph)), (x, y)); d.text((x + 4, y + ph + 8), n, fill='#cfe3ee')
x0 = 10 + cols * (pw + 10)
for k, n in enumerate(land):
    f = os.path.join(G, f'lg_{n}.png')
    if not os.path.exists(f): continue
    x, y = x0 + (k % 2) * (lw + 10), 10 + (k // 2) * (lh + 30)
    sheet.paste(Image.open(f).convert('RGB').resize((lw, lh)), (x, y)); d.text((x + 4, y + lh + 8), n, fill='#cfe3ee')
y = 10 + 2 * (lh + 30); x = x0
for n in ['icon', 'menu_tile']:
    f = os.path.join(G, f'lg_{n}.png')
    if not os.path.exists(f): continue
    im = Image.open(f).convert('RGB'); s = min(320 / im.height, (lw * 2 - 340) / im.width if n == 'menu_tile' else 1, 1.0)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))))
    sheet.paste(im, (x, y)); d.text((x + 2, y + im.height + 4), n, fill='#cfe3ee'); x += im.width + 20
sheet.save(os.path.join(G, 'lg_sheet.png')); print(sheet.size)
