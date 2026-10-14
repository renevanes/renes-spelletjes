#!/usr/bin/env python3
"""Build the geographic Wereldmacht board from the app's Natural Earth outlines.

Offline; optional regeneration requires Shapely 2.x (`pip install shapely`).
The normal game/app builds use the committed map.json and need no GIS packages.
Natural Earth is public domain. Game-region divisions and presentation are original.
"""
import json
import math
from pathlib import Path
from shapely.geometry import Polygon, MultiPolygon, box
from shapely.ops import unary_union
from shapely import make_valid

ROOT = Path(__file__).resolve().parent
raw = (ROOT / 'wqsrc/map.bin').read_bytes()
codes = json.loads((ROOT / 'wqsrc/mapinfo.json').read_text())['codes']
cursor = 0


def vu():
    global cursor
    value, shift = 0, 0
    while True:
        byte = raw[cursor]
        cursor += 1
        value |= (byte & 127) << shift
        if byte < 128:
            return value
        shift += 7


def zz():
    v = vu()
    return -(v + 1) // 2 if v % 2 else v // 2


assert vu() == len(codes)
geo = {}
for code in codes:
    rings = []
    for _ in range(vu()):
        x = y = 0
        points = []
        for _ in range(vu()):
            x += zz()
            y += zz()
            points.append((x / 100, y / 100))
        # Retain the data's continuous longitudes, then bring complete islands into the world frame.
        mean = sum(p[0] for p in points) / len(points)
        off = -360 if mean > 180 else 360 if mean < -180 else 0
        rings.append(make_valid(Polygon([(x + off, y) for x, y in points])))
    # Keep inland waters as holes, rather than treating their rings as separate land.
    outer = []
    for poly in sorted(rings, key=lambda p: p.area, reverse=True):
        parent = next((i for i, p in enumerate(outer) if p.covers(poly.representative_point())), None)
        if parent is None:
            outer.append(poly)
        else:
            outer[parent] = outer[parent].difference(poly)
    geo[code] = unary_union(outer)

ids = ['alaska', 'nw', 'greenland', 'alberta', 'ontario', 'quebec', 'westus', 'eastus', 'central', 'venezuela', 'peru', 'brazil', 'argentina', 'iceland', 'scandinavia', 'ukraine', 'britain', 'northeu', 'westeu', 'southeu', 'northaf', 'egypt', 'eastaf', 'congo', 'southaf', 'madagascar', 'ural', 'siberia', 'yakutsk', 'kamchatka', 'irkutsk', 'mongolia', 'japan', 'afghan', 'middleeast', 'india', 'china', 'siam', 'indonesia', 'newguinea', 'westaus', 'eastaus']
parts = {id: [] for id in ids}
used = set()


def group(id, countries):
    for c in countries.split():
        assert c not in used, c
        used.add(c)
        parts[id].append(geo[c])


group('greenland', 'GL')
group('central', 'MX GT BZ HN SV NI CR PA CU JM HT DO BS TT BB DM GD LC VC KN AG AW CW SX PR BM')
group('venezuela', 'VE CO GY SR')
group('peru', 'PE EC BO')
group('brazil', 'BR')
group('argentina', 'AR CL PY UY')
group('iceland', 'IS')
group('scandinavia', 'NO SE FI DK FO')
group('britain', 'GB IE')
group('northeu', 'DE NL BE LU PL CZ SK AT')
group('ukraine', 'UA BY EE LV LT MD')
group('westeu', 'ES PT AD MC GI')
group('southeu', 'IT CH SI HR BA RS ME AL MK GR BG RO HU MT XK LI SM VA')
group('northaf', 'MA DZ TN LY _WS MR ML NE NG GH CI BF GN GW SL LR SN GM CM TD BJ TG CV')
group('egypt', 'EG SD')
group('eastaf', 'ET ER SO DJ KE TZ UG SS RW BI')
group('congo', 'CD CG GA GQ AO CF ST')
group('southaf', 'ZA NA BW ZW ZM MZ MW SZ LS')
group('madagascar', 'MG KM MU SC')
group('afghan', 'KZ UZ TM TJ KG AF')
group('middleeast', 'TR GE AM AZ IR IQ SY LB IL JO SA YE OM AE QA BH KW PS CY')
group('india', 'IN PK NP BT BD LK MV')
group('china', 'CN TW HK MO')
group('mongolia', 'MN KP KR')
group('japan', 'JP')
group('siam', 'MM TH LA KH VN SG')
group('indonesia', 'PH BN TL')
group('newguinea', 'PG SB')


def cut(id, country, bounds):
    parts[id].append(geo[country].intersection(box(*bounds)))


cut('alaska', 'US', (-180, 50, -130, 90))
cut('westus', 'US', (-130, 15, -100, 50))
cut('eastus', 'US', (-100, 15, -50, 50))
cut('nw', 'CA', (-180, 57, -80, 90))
cut('alberta', 'CA', (-180, 40, -110, 57))
cut('ontario', 'CA', (-110, 40, -80, 57))
cut('quebec', 'CA', (-80, 40, 0, 90))
cut('westeu', 'FR', (-12, 35, 12, 60))
cut('venezuela', 'FR', (-60, -5, -45, 10))
cut('siam', 'MY', (90, -10, 105, 30))
cut('indonesia', 'MY', (105, -10, 125, 30))
cut('indonesia', 'ID', (85, -30, 130, 25))
cut('newguinea', 'ID', (130, -30, 150, 25))
cut('westaus', 'AU', (100, -60, 134, 5))
cut('eastaus', 'AU', (134, -60, 180, 5))
cut('ukraine', 'RU', (0, 35, 60, 90))
cut('ural', 'RU', (60, 35, 80, 90))
cut('siberia', 'RU', (80, 57, 110, 90))
cut('yakutsk', 'RU', (110, 63, 150, 90))
cut('irkutsk', 'RU', (80, 35, 110, 57))
cut('irkutsk', 'RU', (110, 53, 150, 63))
cut('mongolia', 'RU', (110, 35, 150, 53))
cut('kamchatka', 'RU', (150, 35, 195, 90))
cut('kamchatka', 'RU', (-180, 35, -150, 90))
used.update(['US', 'CA', 'FR', 'RU', 'MY', 'ID', 'AU'])

# Locations are selected inside each game region. Names may use a nearby label leader in crowded Europe.
anchors = [(-151, 64), (-109, 65), (-42, 73), (-123, 53), (-95, 51), (-66, 54), (-115, 38), (-85, 36), (-94, 19), (-66, 7), (-74, -12), (-51, -10), (-65, -37), (-19, 65), (20, 65), (40, 55), (-3, 54), (14, 50), (0, 43), (22, 44), (5, 21), (31, 23), (38, 2), (21, -7), (26, -25), (47, -20), (68, 61), (91, 65), (128, 70), (163, 61), (110, 58), (109, 46), (139, 37), (66, 41), (46, 29), (80, 22), (107, 32), (105, 16), (114, -3), (143, -6), (121, -25), (145, -25)]
labels = ['ALASKA', 'NOORDWEST', 'GROENLAND', 'ALBERTA', 'ONTARIO', 'QUEBEC', 'WESTELIJKE VS', 'OOSTELIJKE VS', 'MIDDEN-AMERIKA', 'VENEZUELA', 'PERU', 'BRAZILIË', 'ARGENTINIË', 'IJSLAND', 'SCANDINAVIË', 'OEKRAÏNE', 'GROOT-BRITTANNIË', 'NOORD-EUROPA', 'WEST-EUROPA', 'ZUID-EUROPA', 'NOORD-AFRIKA', 'EGYPTE', 'OOST-AFRIKA', 'CONGO', 'ZUID-AFRIKA', 'MADAGASKAR', 'OERAL', 'SIBERIË', 'JAKOETSK', 'KAMTSJATKA', 'IRKOETSK', 'MONGOLIË', 'JAPAN', 'AFGHANISTAN', 'MIDDEN-OOSTEN', 'INDIA', 'CHINA', 'SIAM', 'INDONESIË', 'NIEUW-GUINEA', 'WEST-AUSTRALIË', 'OOST-AUSTRALIË']
W, H = 1440, 760


def natural(lon, lat):
    l, f = math.radians(lon), math.radians(lat)
    f2, f4 = f*f, f**4
    return (l * (.8707 - .131979*f2 + f4*(-.013791 + f4*(.003971*f2 - .001529*f4))), -f*(1.007226 + f2*(.015085 + f4*(-.044475 + .028874*f2 - .005916*f4))))


def project(lon, lat):
    x, y = natural(lon, lat)
    return [round(W/2 + x*252, 1), round(432 + y*252, 1)]


def polygons(g):
    if g.geom_type == 'Polygon':
        yield g
    elif hasattr(g, 'geoms'):
        for p in g.geoms:
            yield from polygons(p)


def path(g):
    commands = []
    for p in polygons(g):
        if p.area < .08:
            continue
        for ring in [p.exterior, *p.interiors]:
            points = [project(*q) for q in ring.coords]
            commands.append('M' + 'L'.join(f'{x:g},{y:g}' for x, y in points) + 'Z')
    return ''.join(commands)


regions = []
for i, id in enumerate(ids):
    g = make_valid(unary_union(parts[id])).intersection(box(-180, -58, 180, 85))
    assert g.area > 0, id
    # Coasts keep their detail. All game borders share the same input geometry and cut lines.
    g = g.simplify(.07, preserve_topology=True)
    coords = [project(*point) for poly in polygons(g) for point in poly.exterior.coords]
    bb = [min(p[0] for p in coords), min(p[1] for p in coords), max(p[0] for p in coords), max(p[1] for p in coords)]
    regions.append({'id': id, 'path': path(g), 'anchor': project(*anchors[i]), 'label': labels[i], 'bounds': bb})

neutral = unary_union([geo[c] for c in codes if c not in used]).intersection(box(-180, -58, 180, 85)).simplify(.1, preserve_topology=True)
graticule = []
for lon in range(-180, 181, 30):
    graticule.append('M' + 'L'.join(','.join(map(str, project(lon, lat))) for lat in range(-55, 85, 3)))
for lat in range(-30, 81, 30):
    graticule.append('M' + 'L'.join(','.join(map(str, project(lon, lat))) for lon in range(-180, 181, 3)))
out = {'width': W, 'height': H, 'source': 'Natural Earth — publiek domein', 'regions': regions, 'neutral': path(neutral), 'graticule': ''.join(graticule)}
(ROOT / 'rksrc/map.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'Geographic board: {len(regions)} territories, {sum(len(r["path"]) for r in regions):,} path characters')
