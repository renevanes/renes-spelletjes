import sys, importlib.util
spec = importlib.util.spec_from_file_location('l', 'levels.py'); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
sel = [int(a) - 1 for a in sys.argv[1:]] or range(len(m.LEVELS))
for i in sel:
    L = m.LEVELS[i]; print(f'--- {i+1} {L["n"]}  {len(L["m"][0])}x{len(L["m"])}')
    print('    ' + ''.join(str(c // 10) for c in range(len(L['m'][0]))))
    print('    ' + ''.join(str(c % 10) for c in range(len(L['m'][0]))))
    for r, row in enumerate(L['m']): print(f'{r:3} {row}  ' + ' '.join(f'{ch}@{c}' for c, ch in enumerate(row) if ch in L.get('o', {}) or ch in '123C*'))
