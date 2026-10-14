import sys
from PIL import Image
# usage: sheet.py out.png cols width img...
out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ims = [Image.open(p).convert('RGB') for p in sys.argv[4:]]
th = [int(im.height * w / im.width) for im in ims]
rows = (len(ims) + cols - 1) // cols
rh = [max(th[r * cols:(r + 1) * cols]) for r in range(rows)]
S = Image.new('RGB', (cols * w + (cols + 1) * 6, sum(rh) + (rows + 1) * 6), (24, 24, 24))
y = 6
for r in range(rows):
    for c in range(cols):
        i = r * cols + c
        if i < len(ims): S.paste(ims[i].resize((w, th[i])), (6 + c * (w + 6), y))
    y += rh[r] + 6
S.save(out)
