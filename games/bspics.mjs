// print all level layouts as text (for checking shapes)
import fs from 'fs';
const L = JSON.parse(fs.readFileSync(new URL('./bssrc/levels.json', import.meta.url)));
const ch = { '0': 'R', '1': 'Y', '2': 'B', '3': 'G', '4': 'P', '5': 'O' };
for (const lv of L) { if (process.argv[2] && +process.argv[2] !== lv.id) continue; console.log('#' + lv.id, lv.name, lv.goal, lv.ceil ? 'ceil' + lv.ceil : 'lim' + lv.lim);
  lv.rows.forEach((row, r) => { let s = r % 2 ? ' ' : ''; for (let c = 0; c < row.length; c++) { const sp = lv.sp && lv.sp[r] && lv.sp[r][c] && lv.sp[r][c] !== '.' ? lv.sp[r][c] : null; s += (sp || ch[row[c]] || row[c]) + ' '; } console.log(s); }); }
