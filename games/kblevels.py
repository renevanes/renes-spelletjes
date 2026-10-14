import json
def lv(n, t, h, rows):
    W = len(rows[0])
    for i, r in enumerate(rows): assert len(r) == W, (n, i, len(r), W)
    assert len(rows) == 14, (n, len(rows))
    s = ''.join(rows)
    for ch in 'STY': assert s.count(ch) == 1, (n, ch)
    return {'n': n, 't': t, 'h': h, 'm': rows}
E = lambda w: '.' * w
L = []
# 1 ------------------------------------------------------------------
W = 34
L.append(lv('Samen op pad', 'bos', 'Wissel met ⇄ van kabouter. Alleen Snel kan springen: spring over het water en trek met ✋ aan de hendel.', [E(W)] * 9 + [
    E(29) + 'EEE' + '..',
    E(23) + 'H' + '#' * 10,
    '.STY' + E(14) + '!' + E(4) + 'H' + '#' * 10,
    '#' * 13 + 'gg' + '#' * 19,
    '#' * 13 + 'ww' + '#' * 19]))
# 2 ------------------------------------------------------------------
W = 40
L.append(lv('Rotsblok', 'bos', 'Sterk slaat met 🔨 gebarsten rotsen kapot en maakt spinnen af. Laat hem voorop gaan!', [E(W)] * 3 + [
    E(14) + 'X' * 15 + E(11)] * 2 + [E(12) + 'X' * 19 + E(9)] * 5 + [
    E(16) + '%' + E(23),
    '.STY' + E(12) + '%' + E(5) + 'x' + E(3) + 'f' + E(8) + 'EEE' + '..',
    '#' * W, '#' * W]))
# 3 ------------------------------------------------------------------
W = 36
L.append(lv('Zweven', 'bos', 'Te diep om te springen! Kies Schild, zet met 🍄 haar paddenstoel omhoog en zweef naar beneden.', [E(W)] * 3 + [
    '.STY' + E(32),
    '#' * 14 + 'g' * 8 + 'h' + E(13)] + ['#' * 14 + E(8) + 'h' + E(13)] * 6 + [
    '#' * 14 + '^' * 7 + '.' + 'h' + '.' + '!' + E(3) + 'x' + '..' + 'EEE' + '..',
    '#' * W, '#' * W]))
# 4 ------------------------------------------------------------------
W = 44
L.append(lv('Pijlenregen', 'grot', 'Schild vangt pijlen op met haar paddenstoel. Laat haar voorop lopen, dan kan Sterk de boogschutter verjagen.', ['X' * W] * 2 + [E(12) + 'X' * 26 + E(6)] * 8 + [
    E(W),
    '.STY' + E(15) + 'f' + E(15) + 'L' + '...' + 'EEE' + '..',
    '#' * W, '#' * W]))
# 5 ------------------------------------------------------------------
W = 40
L.append(lv('Opstapje', 'grot', 'De richel is te hoog. Zet Schild eronder met de paddenstoel omhoog: dan kan Snel op haar hoed springen!', ['X' * W] * 2 + [E(21) + 'XXX' + E(16)] * 6 + [
    E(12) + '!' + E(8) + 'XXX' + E(16),
    E(10) + '#####' + E(7) + 'a' + E(17),
    E(22) + 'a' + E(17),
    '.STY' + E(18) + 'a' + E(5) + 'x' + E(5) + 'EEE' + '...',
    '#' * W, '#' * W]))
# 6 ------------------------------------------------------------------
W = 44
L.append(lv('Kistenwerk', 'bos', 'Sterk kan kisten duwen. Vul het gat met een kist en zet de andere op de drukplaat: dan blijft de poort open.', [E(27) + 'X' + E(16)] * 9 + [
    E(27) + 'a' + E(16)] * 2 + [
    '.STY' + '..' + 'C' + E(9) + 'C' + E(5) + '.' + E(4) + 'a' + E(4) + 'x' + E(5) + 'EEE' + '...',
    '#' * 12 + '.' + '#' * 9 + '1' + '#' * 21,
    '#' * 12 + 'w' + '#' * 31]))
# 7 ------------------------------------------------------------------
W = 48
def row(W, marks):
    r = ['.'] * W
    for c, ch in marks.items(): r[c] = ch
    return ''.join(r)
rows = ['X' * W] * 2
for r in range(2, 12):
    m = {}
    if r <= 8: m[22] = 'X'
    else: m[22] = '%'
    if r <= 9: m[32] = 'X'
    else: m[32] = 'D'
    if r == 10: m.update({7: '=', 8: '=', 9: '='})
    if r == 8: m.update({11: '=', 12: '=', 13: '='})
    if r == 6: m.update({15: '=', 16: '=', 17: '='})
    if r == 5: m[16] = 'k'
    if r == 11: m.update({1: 'S', 2: 'T', 3: 'Y', 27: 'x', 29: 'f', 37: 'E', 38: 'E', 39: 'E', 45: 'L'})
    rows.append(row(W, m))
rows += ['#' * W] * 2
L.append(lv('Sleutelzoektocht', 'burcht', 'De deur zit op slot. Snel springt het hoogst: haal de sleutel 🗝 boven op de planken.', rows))
# 8 ------------------------------------------------------------------
W = 64
rows = ['X' * W] * 2
for r in range(2, 12):
    m = {}
    m[8] = 'X' if r <= 8 else '%'
    m[23] = 'X' if r <= 8 else 'a'
    m[53] = 'X' if r <= 9 else 'D'
    if r == 9: m.update({c: '#' for c in range(15, 19)})
    if r == 8: m[17] = '!'
    if r >= 6: m[40] = 'H'
    if r == 6: m.update({c: '#' for c in range(41, 50)})
    if r == 5: m[47] = 'k'
    if r == 11: m.update({1: 'S', 2: 'T', 3: 'Y', 12: 'f', 26: 'C', 35: 'x', 44: 'f', 57: 'E', 58: 'E', 59: 'E', 62: 'L'})
    rows.append(row(W, m))
rows += ['#' * 30 + '.' + '#' * 33, '#' * 30 + 'w' + '#' * 33]
L.append(lv('De grote tocht', 'burcht', 'Alles wat je geleerd hebt komt samen. Werk samen en breng alle drie de kabouters naar de uitgang!', rows))
json.dump(L, open('kblevels.json', 'w'), ensure_ascii=False)
for x in L:
    print(x['n']); print('\n'.join(x['m']))
