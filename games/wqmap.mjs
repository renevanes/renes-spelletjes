// Wereldquiz – map data prep: Natural Earth 1:10m admin-0 (public domain, via npm world-atlas, ISC) -> simplified with mapshaper
// -> one outline per quiz country (+ neutral land) -> packed as varint deltas of lon/lat in 1/100 degree.
// Writes wqsrc/map.bin (raw, gzipped later by wqpack.mjs) and wqsrc/mapinfo.json (anchors, bboxes, neighbours, colours).
// Usage: node wqmap.mjs     (env WQDATA = folder with node_modules: world-atlas, topojson-client, mapshaper; default ../wqdata)
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { COUNTRIES, EXTRA } from './wqcountries.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const D = process.env.WQDATA || path.resolve(here, '..', 'wqdata');
const require = createRequire(path.join(D, 'package.json'));
const topo = require('topojson-client'), mapshaper = require('mapshaper');
const PCT = process.env.PCT || '7%';

const t = require('world-atlas/countries-10m.json');
const fc = topo.feature(t, t.objects.countries);
const ROWS = [...COUNTRIES, ...EXTRA];
const byNum = new Map(ROWS.filter(r => r[1]).map(r => [r[1], r[0]]));
const BYNAME = { Kosovo: 'XK', Somaliland: 'SO', 'N. Cyprus': 'CY', 'Cyprus U.N. Buffer Zone': 'CY', Akrotiri: 'CY', Dhekelia: 'CY', 'USNB Guantanamo Bay': 'CU', Baikonur: 'KZ', 'Åland': 'FI', 'W. Sahara': '_WS', 'Siachen Glacier': '_N' };
const DROP = new Set(['Antarctica', 'Indian Ocean Ter.', 'Coral Sea Is.', 'Spratly Is.', 'Clipperton I.', 'Bajo Nuevo Bank', 'Serranilla Bank', 'Scarborough Reef', 'Fr. S. Antarctic Lands', 'Heard I. and McDonald Is.', 'S. Geo. and the Is.', 'Br. Indian Ocean Ter.', 'Ashmore and Cartier Is.']);
const inRing = (p, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
const feats = [], unknown = new Set();
for (const f of fc.features) {
  const nm = f.properties.name; if (DROP.has(nm)) continue;
  let code = f.id ? byNum.get(f.id) : null;
  if (!code && BYNAME[nm]) code = BYNAME[nm];
  if (!code) { code = '_N'; unknown.add(nm); }
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const pc0 of polys) {
    // world-atlas keeps rings that cross the date line in one piece (for spherical rendering); make their longitudes
    // continuous (e.g. Fiji 177..182 instead of jumping between 180 and -180), otherwise planar simplification makes slivers
    const pc = pc0.map(r => { const q = r.map(p => p.slice()); for (let i = 1; i < q.length; i++) { const d = q[i][0] - q[i - 1][0]; if (d > 180) q[i][0] -= 360; else if (d < -180) q[i][0] += 360; } return q; });
    let c = code;
    // Crimea: Natural Earth (de facto) draws it as part of Russia; the UN (and the Netherlands) recognise it as part of Ukraine
    if (code === 'RU' && inRing([34.1, 45.0], pc[0])) c = 'UA';
    feats.push({ type: 'Feature', properties: { code: c }, geometry: { type: 'Polygon', coordinates: pc } });
  }
}
console.log('neutral land:', [...unknown].join(', '));
const input = { type: 'FeatureCollection', features: feats };
const out = await mapshaper.applyCommands(`-i in.json -dissolve code -simplify ${PCT} weighted keep-shapes -o out.json format=topojson`, { 'in.json': input });
const tj = JSON.parse(out['out.json']);
const objName = Object.keys(tj.objects)[0];
const geoms = tj.objects[objName].geometries;
const nb = topo.neighbors(geoms);
const ff = topo.feature(tj, tj.objects[objName]).features;
// Ramer-Douglas-Peucker for the original outlines of small island states (tolerance in degrees; keeps at least 4 points)
function rdp(r, tol) {
  if (r.length <= 5) return r;
  const keep = new Uint8Array(r.length); keep[0] = keep[r.length - 1] = 1;
  const st = [[0, r.length - 1]];
  while (st.length) {
    const [i, j] = st.pop(); let md = -1, mk = -1; const [ax, ay] = r[i], [bx, by] = r[j], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    for (let k = i + 1; k < j; k++) { const d = L ? Math.abs(dy * r[k][0] - dx * r[k][1] + bx * ay - by * ax) / L : Math.hypot(r[k][0] - ax, r[k][1] - ay); if (d > md) { md = d; mk = k; } }
    if (md > tol) { keep[mk] = 1; st.push([i, mk], [mk, j]); }
  }
  const out = r.filter((p, k) => keep[k]);
  return out.length >= 4 ? out : r;
}
const area = r => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a / 2); };
const cosA = r => Math.cos((r.reduce((s, p) => s + p[1], 0) / r.length) * Math.PI / 180);
// ---- per-code polygons; drop specks of large countries (keeps every island of the small island states)
const order = ROWS.map(r => r[0]).concat(['_WS', '_N']);
const recs = {};
let nPts = 0, nRings = 0, nOrig = 0;
ff.forEach((f0, gi) => {
  let f = f0;
  const code = f.properties.code; if (!order.includes(code)) { console.log('skip', code); return; }
  // micro-states and small island states: the original outlines (simplification would drop most of their islands,
  // e.g. the Maldives, Kiribati or Tonga would keep a single island); they are small, so this costs only a few kB
  const origA = feats.filter(o => o.properties.code === code).reduce((s, o) => s + area(o.geometry.coordinates[0]) * cosA(o.geometry.coordinates[0]), 0);
  const nOrigP = feats.filter(o => o.properties.code === code).length, nNowP = !f.geometry ? 0 : f.geometry.type === 'Polygon' ? 1 : f.geometry.coordinates.length;
  if (!f.geometry || (origA < 2.5 && code[0] !== '_' && !nb[gi].length && nOrigP > nNowP)) {      // (islands only: no land borders to match)
    const orig = feats.filter(o => o.properties.code === code); if (!f.geometry) console.log('original outline for', code, orig.length); else nOrig++;
    f = { properties: f.properties, geometry: { type: 'MultiPolygon', coordinates: orig.map(o => o.geometry.coordinates.map(r => rdp(r, .012))) } };
  }
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
  if (process.env.DBG) { const no = feats.filter(o => o.properties.code === code).length; if (no > polys.length * 1.5 && no > 2) console.log('polys', code, no, '->', polys.length); }
  const pa = polys.map(pc => area(pc[0]) * cosA(pc[0]));
  const mx = Math.max(...pa);
  const keep = polys.filter((pc, i) => pa[i] >= mx * .999 || pa[i] > (mx > 50 ? .06 : mx > 2 ? .012 : 0));
  const rings = [];
  for (const pc of keep) for (const r of pc) {
    const q = []; for (const [x, y] of r) { const p = [Math.round(x * 100), Math.round(y * 100)]; const l = q[q.length - 1]; if (!l || l[0] !== p[0] || l[1] !== p[1]) q.push(p); }
    if (q.length > 1 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1]) q.pop();
    if (q.length >= 3) { rings.push(q); nPts += q.length; nRings++; }
  }
  // main body: largest polygon; anchor = centroid of its outer ring (area weighted)
  const big = polys[pa.indexOf(mx)][0];
  let cx = 0, cy = 0, A = 0; for (let i = 0, j = big.length - 1; i < big.length; j = i++) { const k = big[j][0] * big[i][1] - big[i][0] * big[j][1]; A += k; cx += (big[j][0] + big[i][0]) * k; cy += (big[j][1] + big[i][1]) * k; }
  let anchor = A ? [cx / (3 * A), cy / (3 * A)] : big[0];
  if (!inRing(anchor, big)) anchor = big.reduce((s, p) => [s[0] + p[0] / big.length, s[1] + p[1] / big.length], [0, 0]);
  // bbox of the main body: the largest polygon + polygons of at least 15 % of it that lie close to it (within 12 degrees),
  // so overseas parts far away (French Guiana for France) do not count
  const pbb = pc => pc[0].reduce((q, [x, y]) => [Math.min(q[0], x), Math.min(q[1], y), Math.max(q[2], x), Math.max(q[3], y)], [1e9, 1e9, -1e9, -1e9]);
  let bb = pbb(polys[pa.indexOf(mx)]);
  const near = (q, r, g) => q[0] <= r[2] + g && q[2] >= r[0] - g && q[1] <= r[3] + g && q[3] >= r[1] - g;
  for (let k = 0; k < 2; k++) polys.forEach((pc, i) => { if (pa[i] < mx * .15) return; const q = pbb(pc); if (near(q, bb, 12)) bb = [Math.min(bb[0], q[0]), Math.min(bb[1], q[1]), Math.max(bb[2], q[2]), Math.max(bb[3], q[3])]; });
  recs[code] = { polys, rings, anchor: anchor.map(v => +v.toFixed(2)), bb: bb.map(v => +v.toFixed(2)), area: +pa.reduce((a, b) => a + b, 0).toFixed(4), nb: nb[gi].map(j => ff[j].properties.code) };
});
// anchors for archipelagos: the capital's island
const ANCH = { KI: [173.0, 1.4], MH: [171.38, 7.1], FM: [158.2, 6.9], TV: [179.2, -8.52], MV: [73.5, 4.17], SC: [55.45, -4.65], BS: [-77.4, 25.05], PW: [134.6, 7.45], TO: [-175.2, -21.15], SB: [159.95, -9.43], VU: [168.3, -17.7], FJ: [178.1, -17.8], KM: [43.3, -11.7], CV: [-23.5, 15.1], ST: [6.65, 0.3], NR: [166.93, -0.53], WS: [-171.8, -13.85], GQ: [10.3, 1.6], MT: [14.45, 35.9], US: [-98.5, 39.5], NZ: [172.5, -41.5], JP: [138.5, 36.4], PH: [122, 12.5], ID: [113.5, -1.5], GB: [-1.8, 52.6], DK: [9.3, 56.0], NO: [9.5, 61.3], CA: [-100, 56], RU: [60, 58], FR: [2.4, 46.6], NL: [5.5, 52.2], CL: [-71, -33], MY: [102.3, 3.8], GR: [22.5, 39.4], HR: [16, 45.3], IT: [12.5, 43], ES: [-3.7, 40.2], PT: [-8.2, 39.6], EC: [-78.4, -1.5], GL: [-41, 72] };
for (const [k, v] of Object.entries(ANCH)) if (recs[k]) {
  const R = recs[k]; R.anchor = v;
  // when the anchor (the capital's island) is not in the main box (Kiribati: Kiritimati is the largest island, Tarawa has
  // the capital): the box is made of the islands around the anchor instead
  const dl = x => ((x - v[0] + 540) % 360) - 180;
  if (!(dl(R.bb[0]) <= 1 && dl(R.bb[2]) >= -1 && R.bb[1] <= v[1] + 1 && R.bb[3] >= v[1] - 1)) {
    let bb = [v[0] - .3, v[1] - .3, v[0] + .3, v[1] + .3];
    for (const pc of R.polys) for (const [x, y] of pc[0]) { const xx = v[0] + dl(x); if (Math.abs(xx - v[0]) < 6 && Math.abs(y - v[1]) < 6) bb = [Math.min(bb[0], xx), Math.min(bb[1], y), Math.max(bb[2], xx), Math.max(bb[3], y)]; }
    R.bb = bb.map(x => +x.toFixed(2)); console.log('box around the anchor for', k, R.bb.join(','));
    if (process.env.DBG) console.log(R.polys.length, R.polys.slice(0, 4).map(pc => pc[0].slice(0, 2)));
  }
}
for (const r of ROWS) if (!recs[r[0]]) console.log('NO GEOMETRY', r[0], r[2]);
// ---- colour index per country: greedy graph colouring so neighbours differ (5 shades)
const codes = order.filter(c => recs[c]);
const col = {};
for (const c of [...codes].sort((a, b) => recs[b].nb.length - recs[a].nb.length)) { const used = new Set(recs[c].nb.map(n => col[n])); let k = 0; while (used.has(k)) k++; col[c] = k; }
// ---- pack: [nCodes] then per code: nRings, per ring: nPts, first point (zigzag varint), deltas (zigzag varint)
const bytes = [];
const vu = v => { while (v > 127) { bytes.push((v & 127) | 128); v >>>= 7; } bytes.push(v); };
const zz = v => vu(v >= 0 ? v * 2 : -v * 2 - 1);
vu(codes.length);
for (const c of codes) {
  const R = recs[c].rings; vu(R.length);
  for (const r of R) { vu(r.length); let px = 0, py = 0; for (const [x, y] of r) { zz(x - px); zz(y - py); px = x; py = y; } }
}
fs.writeFileSync(path.join(here, 'wqsrc', 'map.bin'), Buffer.from(bytes));
const info = { codes, meta: Object.fromEntries(codes.map(c => [c, { a: recs[c].anchor, b: recs[c].bb, s: recs[c].area, n: recs[c].nb.filter(x => x[0] !== '_'), k: col[c] }])) };
fs.writeFileSync(path.join(here, 'wqsrc', 'mapinfo.json'), JSON.stringify(info));
console.log('original outlines for', nOrig, 'small countries');
console.log('codes', codes.length, 'rings', nRings, 'points', nPts, 'bytes', bytes.length, 'colours', Math.max(...Object.values(col)) + 1);
