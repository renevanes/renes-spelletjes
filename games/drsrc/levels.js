  /* ================= levels.js: the handmade levels and the endless-run generator ================= */
  const MEDALS = /*MEDALS*/null;          // per level [gold, silver, bronze] in frames, measured from the test bot's run (drsolve.mjs)
  const LEVELS = [
    /* ---------- world 1: the old town ---------- */
    { n: 'Eerste stappen', w: 0, p: [
      R(16, 5, hint(1, 'Houd ▶ ingedrukt om te rennen.', 'r')),
      G(2, hint(-7, 'Tik op Springen om over het gat te springen. Langer vasthouden = hoger!', 'j')),
      R(12, 5, coin(6, 2.6)), G(3), R(10, 6, hint(1, 'Pak de gouden schoentjes!', 'c'), coin(5, 1.2)), G(3),
      R(14, 5, cp(2)), G(4), R(8, 5), G(3), R(10, 6), G(2), R(8, 7), G(4), R(12, 5, coin(4, 3)), G(3), R(16, 6, fin(11)),
    ] },
    { n: 'Bukken en glijden', w: 0, p: [
      R(16, 5, hint(2, 'Houd Glijden ingedrukt om onder de buis door te glijden.', 's'), low(10, 3)),
      G(3), R(18, 5, low(5, 3), coin(6, .5), hint(10, 'Ren hard tegen een laag blok: je springt er vanzelf overheen!', 'r'), box(14, 1, 1, 1)), G(3),
      R(18, 6, cp(1), box(6), low(11, 4), coin(13, .5)),
      G(4), R(20, 6, box(3), low(8, 3), box(14), coin(14, 2.2)), G(3), R(16, 6, low(3, 3), box(10), box(11)), G(3), R(16, 6, fin(12)),
    ] },
    { n: 'Muurloop', w: 0, p: [
      R(14, 5, hint(3, 'Spring tegen de hoge muur: je rent er een stukje tegenop en grijpt de rand!', 'j')),
      R(12, 9, coin(6, 1.3)), G(3), R(10, 8), D(3), R(6, null, hint(0, 'Spring vlak voor de muur, dan kom je het hoogst.', 'j')), R(14, 10, cp(3), coin(10, 1.3)),
      G(4), R(8, 7), R(10, 11, coin(4, 2.2)), G(3), R(10, 9), R(10, 14), G(3), R(8, 12), D(3), R(12, null), G(3), R(16, 9, fin(10)),
    ] },
    { n: 'Salto!', w: 0, p: [
      R(14, 12, hint(2, 'Houd in de lucht ↻ of ↺ ingedrukt voor een salto. Laat los als je weer rechtop bent!', 'f')),
      G(2), R(12, 6, hint(4, 'Land op je voeten: dan krijg je extra vaart!', 'f'), coin(9, 1.3)),
      R(6, 9), G(3), R(12, 4, cp(3), coin(8, 3.5)), R(4, null, spring(1)), R(16, 9, hint(-3, 'Een springveer! Daarmee spring je extra hoog.', 'j'), coin(8, 1.3)),
      G(3), R(10, 6), R(4, null, spring(1)), R(10, 12), G(2), R(16, 5), G(3), R(16, 4, fin(11)),
    ] },
    { n: 'Schoorsteenklimmen', w: 0, p: [
      R(16, 5, hint(5, 'In een smalle schacht: spring heen en weer tegen de muren omhoog!', 'j'), blk(12, 3, 1, 10, 1)),
      R(10, 14, wp(1), coin(5, 1.3)), G(3), R(12, 12, cp(2)),
      R(3, 12, blk(-1, 2, 1, 10, 1)), R(8, 21, wp(1), coin(4, 1.3)), G(4), R(14, 17, coin(7, 2.4)), G(3), R(10, 13), G(3), R(12, 11, blk(8, 3, 1, 9, 1)), R(8, 19, wp(1)), G(4), R(16, 14, fin(10)),
    ] },
    { n: 'Pannendaken', w: 0, p: [
      R(8, 6), U(3, hint(-4, 'Houd Glijden ingedrukt op een schuin dak: zo ga je steeds sneller!', 's')), R(3, null), D(5), R(6, null), G(4),
      R(6, 7, coin(3, 1.3)), Ug(3), R(2, null), Dg(3), R(4, null), G(5, coin(2, 3)),
      R(10, 6, cp(3)), U(4), R(2, null), D(6), R(4, null), G(6), R(8, 5, coin(4, 1.3)), U(3), G(5), R(8, 7), Ug(2), R(2, null), D(5), R(4, null), G(5), R(10, 6), U(2), G(4), R(14, 7, fin(9)),
    ] },
    { n: 'Brokkelige dakpannen', w: 0, p: [
      R(14, 6, hint(4, 'Pas op: deze dakpannen brokkelen af. Blijf rennen!', 'r')),
      G(8, crum(0, 8)), R(10, 6, coin(5, 1.3)), G(10, crum(0, 3), crum(5, 2), coin(5, 2.2)), R(12, 6, cp(2), spring(9)),
      R(8, 11), G(9, crum(0, 9, 1)), R(10, 9, coin(7, 1.3)), G(4), R(10, 6), G(12, crum(0, 4), crum(7, 5)), R(8, 6, spring(5)), R(10, 11), G(3), R(16, 8, fin(10)),
    ] },
    { n: 'Over de grachten', w: 0, p: [
      R(14, 6, box(7), low(11, 2)), G(4), R(10, 9, coin(5, 1.3)), G(3), R(8, 7), D(2), R(8, null, low(1, 4)), R(10, 9),
      G(3), R(14, 6, cp(2), blk(8, 3, 1, 9, 1)), R(10, 14, wp(1), coin(5, 1.3)), G(2), R(6, 13), D(6), R(4, null), G(7, coin(3, 2)),
      R(12, 6, cp(3), crum(5, 3)), R(4, null, spring(1)), R(8, 11), G(4), R(10, 9, box(3), box(7)), G(3), R(16, 7, fin(10)),
    ] },
    /* ---------- world 2: the building site ---------- */
    { n: 'Steigers', w: 1, p: [
      R(12, 5, hint(3, 'Op steigerplanken kun je van onderaf springen en erop landen.', 'j')),
      G(14, plank(0, 4, 2), plank(5, 4, 4), plank(10, 4, 3), coin(7, 5.5)), R(10, 8, cp(4)),
      G(12, plank(1, 3, 0), plank(5, 3, 2), plank(9, 3, 1), coin(10, 2.4)), R(8, 6), R(10, 11, plank(-4, 3, -2.5), coin(6, 1.3)),
      G(4), R(12, 7, cp(2)), G(14, plank(1, 3, 1), plank(5, 3, 3), plank(9, 3, 5)), R(10, 12), G(10, plank(2, 3, -2), plank(6, 3, -4)), R(16, 7, fin(10)),
    ] },
    { n: 'Lopende band', w: 1, p: [
      R(10, 5), R(14, 5, belt(1, 12, 1), hint(1, 'Een lopende band: hiermee ga je extra snel!', 'r')), G(6),
      R(16, 5, belt(2, 12, -1), hint(2, 'Deze band gaat de andere kant op. Spring eroverheen of ren hard!', 'j'), coin(8, 2.4)), G(3),
      R(12, 7, cp(2), belt(4, 7, 1)), G(7, coin(3, 3)), R(10, 6, low(3, 4)), R(16, 6, belt(0, 10, -1), box(13), coin(13, 2.2)), G(3), R(12, 7, cp(2), belt(2, 9, 1)), G(8), R(8, 6, low(2, 3)), R(16, 9, belt(1, 12, -1)), G(4), R(10, 8, belt(0, 8, 1)), G(7), R(14, 6, fin(9)),
    ] },
    { n: 'Kraanwerk', w: 1, p: [
      R(14, 6, hint(5, 'Spring op de lading van de kraan en laat je meevoeren.', 'j')),
      G(14, plat(1, 0, 4, 7, 0, 260, 0, 1), coin(8, 2.5)), R(10, 6, cp(3)),
      G(12, plat(1, -1, 3, 0, 5, 220, .5, 1), coin(2, 6)), R(8, 10), G(14, plat(1, 0, 4, 8, 0, 280, .25, 1)), R(10, 10, coin(5, 1.3)), G(4), R(12, 8, cp(2)), G(16, plat(1, 0, 3, 5, 0, 200, 0, 1), plat(9, 2, 3, 0, 4, 200, .5, 1)), R(10, 11), G(3), R(14, 7, fin(9)),
    ] },
    { n: 'Vallende kisten', w: 1, p: [
      R(22, 6, hint(2, 'Kijk uit voor vallende kisten. Blijf doorrennen!', 'r'), crate(14, 4)), G(3),
      R(18, 6, crate(5, 4), crate(12, 4), coin(9, 1.3)), G(4), R(16, 7, cp(2), crate(10, 4), low(12, 3)),
      G(3), R(12, 8, coin(6, 3)), G(3), R(20, 6, crate(6, 4), box(11), crate(16, 4), coin(16, 2.3)), G(3), R(12, 7, cp(2)), R(14, 7, crate(4, 4), crate(9, 4), low(11, 2)), G(4), R(8, 9), G(3), R(16, 7, crate(5, 4), crate(11, 4)), G(3), R(14, 6, fin(9)),
    ] },
    { n: 'Springplanken', w: 1, p: [
      R(12, 5, spring(8)), R(10, 11, coin(5, 1.3)), G(6), R(12, 5, cp(3), spring(9, 1, 1), hint(5, 'Een groene veer lanceert je ook vooruit. Probeer een salto!', 'f')),
      G(10, coin(5, 5)), R(10, 6, spring(6)), R(6, 12), G(4), R(8, 9, coin(4, 1.3)), G(3), R(12, 6, cp(2), spring(8, 1, 1)), G(9), R(8, 6, spring(4)), R(8, 12), G(5), R(10, 8), G(3), R(16, 6, fin(10)),
    ] },
    { n: 'Rekstok', w: 1, p: [
      R(14, 6, hint(5, 'Spring naar de stang: je zwaait mee. Tik op Springen om los te laten!', 'j')),
      G(7, bar(3, 3.3)), R(10, 6, coin(5, 1.3)), G(8, bar(3, 3.3), coin(5, 4)), R(10, 6, cp(2)),
      G(12, bar(3, 3.3), bar(8, 3.3)), R(12, 7, coin(6, 1.3)), G(4), R(12, 6, cp(2)), G(9, bar(3, 3.3)), R(6, 8), G(14, bar(3, 3.3), bar(9, 3.3)), R(10, 7), G(3), R(14, 6, fin(9)),
    ] },
    { n: 'Zaagwerk', w: 1, p: [
      R(20, 6, hint(3, 'Zaagbladen! Spring eroverheen of wacht tot ze weg zijn.', 'j'), saw(12, .7, .7)), G(3),
      R(18, 6, saw(6, 3.3, .8, 0, -2.6, 140), coin(10, 1.3), saw(14, .7, .7)), G(4), R(14, 6, cp(2)),
      R(16, 6, saw(4, 1, .8, 6, 0, 180), low(12, 3), coin(14, .5)), G(5, saw(2.5, 1, .9, 0, -4, 150)), R(12, 6, coin(6, 2.4)), G(3), R(12, 6, cp(2)), R(18, 6, saw(5, 1, .8, 0, -3, 120), saw(10, 1, .8, 0, -3, 120, .5), saw(15, .7, .7)), G(4, saw(1.5, 2, .8, 0, -3, 130)), R(12, 7), G(3), R(14, 6, fin(9)),
    ] },
    { n: 'Hoogbouw', w: 1, p: [
      R(12, 5, plank(6, 3, 2)), R(10, 9, coin(5, 1.3)), R(8, 13), G(10, plat(1, -2, 3, 0, 5, 220, 0, 1)), R(14, 16, cp(2)),
      G(9, bar(3, 3.3), coin(3, 5.5)), R(10, 15, crate(6, 4)), G(4, plank(0, 4, -3)), R(8, 11), D(4), R(12, null, belt(0, 8, 1), coin(9, 2.4)),
      G(4), R(14, 8, cp(2), spring(10)), R(10, 14), G(4), R(12, 12, saw(6, .7, .7)), G(6, plank(1, 4, 2)), R(10, 13, crate(6, 4)), G(8, bar(3, 3.3)), R(16, 12, fin(10)),
    ] },
    /* ---------- world 3: the harbour ---------- */
    { n: 'Containerkade', w: 2, p: [
      R(14, 5, hint(4, 'Val niet in het water! Dan begin je bij de laatste vlag.', 'j')),
      G(4), R(10, 7, coin(5, 1.3)), G(4), R(12, 5), R(8, 9), G(5, coin(2, 2)), R(12, 7, cp(2)), G(4), R(6, 9), G(3), R(10, 11, coin(5, 1.3)), D(4), G(5), R(12, 6, cp(2)), G(5), R(8, 8, box(4)), G(3), R(6, 10), G(5), R(10, 7, low(3, 3)), G(4), R(16, 6, fin(10)),
    ] },
    { n: 'Kabelbaan', w: 2, p: [
      R(14, 9, hint(4, 'Spring naar de kabel: je glijdt vanzelf naar beneden. Tik op Springen om los te laten.', 'j')),
      G(18, zip(1, 3.4, 16, -2)), R(10, 6, coin(5, 1.3)), R(8, 11), G(20, zip(1, 3.4, 18, -3), coin(10, 1.5)),
      R(10, 7, cp(3)), R(6, 10), G(16, zip(1, 3.4, 15, -1)), R(12, 8, coin(6, 1.3)), G(4), R(10, 9, cp(2)), R(8, 13), G(22, zip(1, 3.4, 10, 0), zip(12, -.4, 21, -2.5)), R(12, 9), G(4), R(14, 6, fin(9)),
    ] },
    { n: 'Havenkranen', w: 2, p: [
      R(14, 6), G(16, plat(1, 0, 4, 9, 0, 300, 0, 1), coin(8, 2.4)), R(10, 6, cp(3)),
      G(10, plat(4, 0, 3, 0, 6, 240, .5, 1)), R(8, 12, coin(4, 1.3)), G(16, plat(1, 1, 4, 9, 0, 300, .3, 1), plat(1, -4, 3, 9, 0, 300, .8, 1)),
      R(10, 9), G(5, coin(2.5, 2.4)), R(12, 7, cp(2)), G(18, plat(1, 0, 3, 6, 0, 240, 0, 1), plat(10, 2, 3, 6, 0, 240, .5, 1)), R(10, 9), G(3), R(16, 7, fin(10)),
    ] },
    { n: 'Stangen boven het water', w: 2, p: [
      R(14, 7), G(8, bar(3, 3.3)), R(6, 7), G(14, bar(3, 3.3), bar(9, 3.6), coin(6, 4.5)), R(10, 8, cp(2)),
      G(9, bar(3, 3.3)), R(6, 8, coin(3, 1.3)), G(16, bar(3, 3.3), bar(8, 3.5), bar(13, 3.2)), R(12, 7, coin(6, 2.4)), G(4), R(12, 8, cp(2)), G(12, bar(3, 3.3), bar(8, 3.3)), R(6, 9), G(9, bar(3, 3.3)), R(8, 8), G(4), R(14, 7, fin(9)),
    ] },
    { n: 'Scheepsventilatoren', w: 2, p: [
      R(14, 6, hint(5, 'Een luchtstroom tilt je omhoog. Spring erin!', 'j')),
      G(6, vent(1, 4, 6, -4)), R(10, 10, coin(5, 1.3)), G(8, vent(2, 4, 9, -8)), R(12, 9, cp(2)),
      R(4, 4, vent(0, 4, 11, 0)), R(10, 14, coin(5, 1.3)), G(5), R(10, 11), G(6, vent(1, 4, 8, -6), coin(3, 3)), R(12, 9, cp(2)), G(10, vent(3, 4, 12, -8)), R(10, 13), G(5), R(8, 10), G(8, vent(2, 4, 9, -6)), R(14, 11, fin(9)),
    ] },
    { n: 'Glibberige kade', w: 2, p: [
      R(12, 6, belt(3, 8, -1)), G(9, crum(0, 9)), R(10, 6, coin(5, 1.3)), G(4), R(14, 8, cp(2), belt(2, 10, 1)),
      G(8, crum(0, 3, -1), crum(5, 3, -1), coin(4, 2)), R(10, 7), G(10, zip(1, 3.2, 9, 0)), R(12, 7, belt(0, 8, -1), coin(9, 2.4)), G(4), R(12, 7, cp(2), belt(2, 8, 1)), G(10, crum(0, 10)), R(10, 7, belt(0, 6, -1)), G(12, zip(1, 3.2, 11, 0)), R(10, 6), G(4), R(14, 7, fin(9)),
    ] },
    { n: 'Het grote schip', w: 2, p: [
      R(12, 6), G(4), R(40, 8, low(6, 3), box(12), box(13), coin(13, 2.2), spring(20), blk(22, 5, 6, 1), coin(25, 6.5), crate(32, 4), cp(17)),
      G(5), R(10, 11), G(14, zip(1, 3.4, 13, -1)), R(10, 9, coin(5, 1.3)), G(4), R(36, 9, cp(2), low(5, 4), box(12), box(16), spring(22), crate(28, 4), low(31, 3)), G(4), R(16, 7, fin(10)),
    ] },
    { n: 'Storm in de haven', w: 2, p: [
      R(12, 7), G(8, bar(3, 3.3)), R(8, 7, coin(4, 1.3)), G(14, plat(1, 0, 3, 9, 0, 260, 0, 1)), R(10, 7, cp(2)),
      G(18, zip(1, 3.4, 16, -1)), R(6, 9), R(3, 9, blk(-1, 2, 1, 10, 1)), R(8, 17, wp(1), coin(4, 1.3)), G(6), R(10, 12, crum(2, 4)),
      G(6, vent(1, 4, 8, -6)), R(12, 12, cp(2), coin(8, 2.4)), G(12, bar(3, 3.3), bar(8, 3.3)), R(16, 10, fin(10)),
    ] },
    /* ---------- world 4: neon night city ---------- */
    { n: 'Neonlichten', w: 3, p: [
      R(18, 6, hint(5, 'Laserhekken! Ren erdoor als ze uit zijn.', 'r'), laser(12, 4, 150, .5)), G(3),
      R(18, 6, laser(6, 4, 120, .45, .3), coin(10, 1.3), laser(14, 2, 100, .6)), G(4), R(14, 7, cp(2)),
      R(16, 7, laser(5, 4, 160, .5, .5), low(9, 3), coin(10, .5)), G(4), R(12, 8, laser(6, 2, 90, .5), coin(6, 3)), G(3), R(12, 7, cp(2)), R(20, 7, laser(4, 4, 140, .5), laser(9, 4, 140, .5, .3), laser(14, 4, 140, .5, .6)), G(4), R(10, 8, laser(5, 2, 80, .5)), G(3), R(14, 7, fin(9)),
    ] },
    { n: 'Ventilatoren', w: 3, p: [
      R(14, 6), G(6, vent(1, 4, 8, -4)), R(10, 11, coin(5, 1.3)), G(10, vent(3, 4, 10, -7), coin(5, 6)), R(10, 13, cp(3)),
      G(8, vent(2, 4, 12, -10)), R(8, 14), G(5), R(10, 10, coin(5, 1.3)), G(6, vent(1, 4, 7, -4)), R(12, 11, cp(2)), G(12, vent(2, 3, 9, -6), vent(8, 3, 9, -6)), R(10, 12, laser(5, 4, 140, .5)), G(8, vent(2, 4, 12, -9)), R(14, 13, fin(9)),
    ] },
    { n: 'Laserdans', w: 3, p: [
      R(24, 6, laser(6, 4, 120, .5), laser(11, 4, 120, .5, .5), laser(16, 4, 120, .5), coin(11, 2.6)), G(3),
      R(12, 7, cp(2)), G(10, bar(3, 3.3)), R(18, 7, laser(5, 2, 80, .5), laser(10, 2, 80, .5, .5), low(13, 3), coin(14, .5)),
      G(4), R(16, 8, laser(4, 4, 140, .4), laser(9, 4, 140, .4, .45), coin(12, 1.3)), G(3), R(12, 7, cp(2)), R(22, 7, laser(3, 2, 70, .5), laser(7, 2, 70, .5, .5), laser(11, 4, 120, .45), laser(16, 2, 70, .5), laser(19, 2, 70, .5, .5)), G(5, bar(2, 3.3)), R(14, 7, fin(9)),
    ] },
    { n: 'Zagen in de nacht', w: 3, p: [
      R(16, 6, saw(9, 1, .8, 0, 0, 120), saw(13, 3.5, .8, 0, -2.6, 130)), G(4, saw(2, 1.5, .9, 0, -3, 110)), R(12, 7, coin(6, 1.3)),
      G(3), R(16, 7, cp(2), laser(6, 4, 130, .5), saw(11, 1, .8, 4, 0, 160)), G(5, bar(2, 3.3)), R(12, 8, coin(6, 2.4)),
      G(4), R(18, 8, saw(5, .7, .7), laser(10, 2, 90, .5), saw(14, .7, .7), coin(14, 2.4)), G(3), R(12, 8, cp(2)), G(6, saw(3, 3.5, .9, 0, 0, 100)), R(16, 8, saw(4, 1, .8, 7, 0, 150), low(12, 3)), G(4, saw(1.5, 2, .8, 0, -3, 110)), R(14, 7, fin(9)),
    ] },
    { n: 'Wolkenkrabbers', w: 3, p: [
      R(16, 6, blk(12, 3, 1, 12, 1)), R(10, 17, wp(1), coin(5, 1.3)), G(22, zip(1, 3.4, 21, -2)), R(12, 12, cp(3)),
      R(10, 12), G(3), R(8, 12, blk(4, 3, 1, 10, 1)), R(10, 20, wp(1), coin(5, 1.3)), G(24, zip(1, 3.4, 22, -4), coin(12, -1.6)), R(12, 10, cp(2)), R(12, 10, blk(8, 3, 1, 12, 1)), R(10, 19, wp(1)), G(5), R(8, 16), G(20, zip(1, 3.4, 19, -3)), R(16, 13, fin(10)),
    ] },
    { n: 'Daklichtjes', w: 3, p: [
      R(12, 6, spring(8)), R(10, 12), G(10, crum(0, 10)), R(10, 12, coin(5, 1.3)), G(6, vent(1, 4, 6, -5)), R(12, 10, cp(2), spring(8, 1, 1)),
      G(12, coin(6, 6)), R(10, 8), G(8, crum(0, 3), crum(5, 3), coin(4, 2)), R(12, 8, laser(6, 4, 150, .5)), G(4), R(12, 8, cp(2)), R(4, null, spring(1)), R(10, 13), G(10, crum(0, 10)), R(8, 13, laser(4, 4, 120, .5)), G(6, vent(1, 4, 6, -4)), R(14, 11, fin(10)),
    ] },
    { n: 'Middernachtsrun', w: 3, p: [
      R(10, 14), D(6), R(4, null), G(7), R(10, 7, belt(0, 9, 1), coin(5, 2.2)), G(7), R(10, 7, low(3, 5)), U(3), G(6),
      R(12, 9, cp(2)), D(4), R(4, null, coin(2, 1.3)), G(8), R(12, 5, low(4, 4), coin(10, 3)), R(6, 5, belt(0, 6, 1)), G(8), R(10, 7, cp(2)), R(8, 12), D(5), R(4, null), G(8), R(10, 6, belt(0, 10, 1)), G(7), R(8, 6, low(2, 3)), U(3), G(7), R(16, 7, fin(10)),
    ] },
    { n: 'Koning van de daken', w: 3, p: [
      R(14, 6, low(6, 3), box(11)), G(6, vent(1, 4, 8, -4)), R(10, 11, laser(5, 4, 120, .5), coin(8, 1.3)), G(14, zip(1, 3.4, 13, -1)), R(10, 11, cp(2)),
      G(9, bar(3, 3.3)), R(8, 11, saw(4, .7, .7)), G(12, plat(1, 0, 3, 7, 0, 240, 0, 1), coin(6, 2.5)), R(14, 11, cp(2), blk(10, 3, 1, 10, 1)), R(10, 19, wp(1), coin(5, 1.3)),
      G(6), R(8, 15), D(5), R(4, null), G(8), R(10, 8, crum(3, 3), spring(8)), R(10, 13), G(4), R(18, 11, fin(12)),
    ] },
  ];
  if (MEDALS) LEVELS.forEach((L, i) => { if (MEDALS[i]) L.medals = MEDALS[i]; });

  /* the endless run: an ever longer rooftop route from safe pieces */
  function genEndless(seed, n = 140) {
    const r = rng(seed), p = [R(20, 6)];
    let h = 6;
    const pick = a => a[Math.floor(r() * a.length)];
    for (let i = 0; i < n; i++) {
      const lvl = Math.min(1, i / 60), k = r();
      const nh = Math.max(3, Math.min(10, h + pick([-2, -1, 0, 0, 1, 1, 2]))), w = 8 + Math.floor(r() * 10);
      const gap = 2 + Math.floor(r() * (2 + lvl * 2.5));
      const it = [];
      if (k < .25) it.push(box(2 + Math.floor(r() * (w - 4))));
      else if (k < .45 && w > 8) it.push(low(2 + Math.floor(r() * (w - 6)), 3));
      else if (k < .55 && lvl > .3) it.push(spikes(3 + Math.floor(r() * (w - 6)), 1));
      if (r() < .35) it.push(coin(Math.floor(w / 2), 1.3 + r() * 1.5));
      p.push(G(nh > h ? Math.min(gap, 3) : gap)); p.push(R(w, nh, ...it)); h = nh;
    }
    return { n: 'Eindeloze run', w: 0, p, seed };
  }
