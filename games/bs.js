/* ================================================================
   BELLENSCHIETER – an original bubble shooter. Aim with a finger, release to shoot; three or more bubbles of one colour
   pop and whatever no longer hangs on the ceiling falls. 60 levels in six worlds (each one played to the end by a bot
   with the game's own rules to set its shot limit) and an endless mode where new rows keep coming.
   ================================================================ */
const Bellenschieter = (() => {
  const LEVELS = [{"id":1,"w":0,"name":"Eerste bellen","goal":"clear","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx"],"seed":1007,"cl":0.6,"pal":[0,1,2],"tip":"aim","lim":14,"st":[5,10]},{"id":2,"w":0,"name":"Wissel maar","goal":"clear","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx"],"seed":1014,"cl":0.5,"pal":[0,1,2],"tip":"swap","lim":13,"st":[5,10]},{"id":3,"w":0,"name":"Golfjes","goal":"clear","rows":["x0x0000xx00","111x111111","22xx222222x","x0000000x0","11111111x11","2222222222"],"seed":1021,"cl":0.45,"pal":[0,1,2],"tip":"bounce","lim":42,"st":[15,26]},{"id":4,"w":0,"name":"Trechter","goal":"clear","rows":["xxxxxxxxxxx","xxxxxxxxxx",".xxxxxxxxx.",".xxxxxxxx.","..xxxxxxx..","..xxxxxx..","...xxxxx...","...xxxx...","....xxx...."],"seed":1028,"cl":0.45,"pal":[0,1,2,3],"lim":30,"st":[13,19]},{"id":5,"w":0,"name":"Sterren in zee","goal":"stars","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx"],"seed":1035,"cl":0.5,"pal":[0,1,2,3],"sp":["","","",".*","......*.*"],"tip":"stars","lim":32,"st":[5,14]},{"id":6,"w":0,"name":"Visje","goal":"clear","rows":["xxxxxxxxxxx","x.x.x.x.x.","x.x.xxx.x..","x.x51555x.","x2xx55xx45.","22551xx5x.","2x.5xx5155.","x..x15x5.."],"seed":1042,"cl":0.2,"pal":[1,2,4,5],"lim":29,"st":[15,20]},{"id":7,"w":0,"name":"Zeewier","goal":"top","rows":["xxxxxxxxxxx",".x..x..x.x",".x..x..x..x",".x..x..x.x",".x..x..x..x",".x..x..x.x",".x..x..x..x",".x..x..x.x",".x..x..x..x",".x..x..x.."],"seed":1049,"cl":0.55,"pal":[0,1,2,3],"tip":"top","lim":19,"st":[12,16]},{"id":8,"w":0,"name":"Ruit","goal":"clear","rows":[".....x.....","...xxxx...","..xxxxxxx..",".xxxxxxxx.","xxxxxxxxxxx",".xxxxxxxx.","..xxxxxxx..","...xxxx...",".....x....."],"seed":1056,"cl":0.45,"pal":[0,1,2,3],"lim":21,"st":[9,16]},{"id":9,"w":0,"name":"Diepzee","goal":"stars","rows":["x0112233001","0x1223x001","0011223xx01","0112233x01","00xx2233x01","0112233001","00112233001","0112233x01"],"seed":1063,"cl":0.45,"pal":[0,1,2,3],"sp":["","","",".*..*","....*"],"lim":23,"st":[9,16]},{"id":10,"w":0,"name":"Kwal","goal":"clear","rows":["xxxxxxxxxxx","xx444x442x","xxx4x4xx22x","x2x24xxx2x","x..x2xxx..x","x0xx.1...1","x.00..x1.1.","xx.0..x1x.","xx..0.1.x..","00..01..1."],"seed":1070,"cl":0.2,"pal":[0,1,2,4],"lim":34,"st":[19,25]},{"id":11,"w":1,"name":"Boem!","goal":"clear","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx"],"seed":1077,"cl":0.45,"pal":[0,1,2,3],"sp":["","","@","","..........@","......@"],"tip":"bomb","lim":17,"st":[10,13]},{"id":12,"w":1,"name":"Dennenboom","goal":"clear","rows":["xxxxxxxxxxx","..x.x3x.x.","..x3xxx3x..","..xx3x3.x.","..33x033x..",".3xx3xx33.","....555....","....55....","....x55....","....55....","....x55...."],"seed":1084,"cl":0.2,"pal":[0,1,3,5],"lim":32,"st":[14,19]},{"id":13,"w":1,"name":"Het plafond zakt","goal":"clear","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx"],"seed":1091,"cl":0.5,"pal":[0,1,2,3],"ceil":7,"tip":"ceil","st":[5,14]},{"id":14,"w":1,"name":"Paddenstoel","goal":"stars","rows":["xxxxxxxxxxx","x.xx110.xx","x.0xx1x10.x","x01x0xx10x","x0x10x0000x","00000xx0x0","....5xx....","...5x5x...","...x5x55...","...xxx5..."],"seed":1098,"cl":0.2,"pal":[0,1,2,5],"sp":["","","...*","..*","",".....*"],"lim":18,"st":[7,13]},{"id":15,"w":1,"name":"Ruitjes","goal":"clear","rows":["x31x0022331","311002x331","1100x233110","10022331x0","002233110x2","0x2331xx02","2x33110022x","233110x223"],"seed":1105,"cl":0.45,"pal":[0,1,2,3],"sp":["","","","@","........@","","......@"],"lim":27,"st":[13,18]},{"id":16,"w":1,"name":"Lianen","goal":"top","rows":["xxxxxxxxxxx","x..x..x..x","x..x..x..x.","x..x..x..x","x..x..x..x.","x..x..x..x","x..x..x..x.","x..x..x..x","x..x..x..x.","x..x..x..x","x..x..x..x."],"seed":1112,"cl":0.55,"pal":[0,1,2,3],"ceil":9,"st":[8,12]},{"id":17,"w":1,"name":"Bergpad","goal":"stars","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxx.xxxxxx","xxx..xxxxxx","xx...xxxxx","x......xx..",".......x.."],"seed":1119,"cl":0.45,"pal":[0,1,2,3,4],"sp":["",".*....*","........*",".......*"],"lim":29,"st":[8,20]},{"id":18,"w":1,"name":"Bloem","goal":"clear","rows":["xxxxxxxxxxx","..xx004.x.","..440044x..","..44x10xx.","...00xx00..","....4xx...",".....3333..","....3x....",".....3.....","....3.....",".....x....."],"seed":1126,"cl":0.2,"pal":[0,1,3,4],"lim":26,"st":[15,20]},{"id":19,"w":1,"name":"Bosbrand","goal":"clear","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx"],"seed":1133,"cl":0.4,"pal":[0,1,2,3,4],"sp":["","","","","@","","","",".........@"],"ceil":9,"st":[9,18]},{"id":20,"w":1,"name":"Uil","goal":"clear","rows":["xxxxxxxxxxx","x.xx3x3.xx","x53x33x335x","x3xx111x3x","x312x31213x","x31x111133",".333353xxx.","x3xx553x3x",".3x553x53x.","..x535x3..","...3553x..."],"seed":1140,"cl":0.2,"pal":[1,2,3,5],"lim":21,"st":[7,14]},{"id":21,"w":2,"name":"Regenboog","goal":"clear","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx"],"seed":1147,"cl":0.45,"pal":[0,1,2,3,4],"sp":["","","","%","..%","","...%"],"tip":"rain","lim":32,"st":[16,25]},{"id":22,"w":2,"name":"IJsje","goal":"clear","rows":["xxxxxxxxxxx","..x00333x.","..0000333..","..0003xx..","...0043x...","...4x4x...","...xx445...","...x11x...","....x55....","....x1....",".....1....."],"seed":1154,"cl":0.2,"pal":[0,1,3,4,5],"lim":36,"st":[19,24]},{"id":23,"w":2,"name":"Zuurstok","goal":"clear","rows":["x1144220011","114422xxx1","1144x200114","4422001144","xxx20011442","2x00114422","x2001x44220","00114x22x0","xx1x4422001"],"seed":1161,"cl":0.45,"pal":[0,1,2,4],"lim":33,"st":[14,23]},{"id":24,"w":2,"name":"Lolly","goal":"top","rows":["xxxxxxxxxxx","x33xxx3333",".....4.....","....44....","....xx0....","..0000x1..","..0222001..","..x210x1..","..02111x1..","...2211...",".....2....."],"seed":1168,"cl":0.2,"pal":[0,1,2,3,4],"lim":21,"st":[11,16]},{"id":25,"w":2,"name":"Snoepregen","goal":"clear","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx"],"seed":1175,"cl":0.45,"pal":[0,1,2,3,4],"sp":["","","%...%","","","......%"],"ceil":8,"st":[29,40]},{"id":26,"w":2,"name":"Cupcake","goal":"stars","rows":["xxxxxxxxxxx","x.x.xxx.xx","x.xx14x4x.x","x1414141xx","xx441x441xx","4x4x4xx141","..3232xx3..","..23x3x3..","..32x2323..","..x32323.."],"seed":1182,"cl":0.2,"pal":[0,1,2,3,4],"sp":["","",".....*","...*","","......*"],"lim":37,"st":[16,26]},{"id":27,"w":2,"name":"Toverringen","goal":"clear","rows":["xxxxxxxxxxx","x.x33x3xxx","x.3x22233.x","xx32x2x33x","x3221xx2x3x","xx21x012xx",".xxx1x1x23.","4321111x3x",".432x22x34.","..3333xx..","...443x4..."],"seed":1189,"cl":0.2,"pal":[0,1,2,3,4],"sp":["","","%","...%"],"lim":56,"st":[27,38]},{"id":28,"w":2,"name":"Snoephart","goal":"clear","rows":["xxxxxxxxxxx","x44xx4x4x4","44xx0xx0xx4","x40x0000x4","440x000xx4x","4x000000x4",".x4x00xx44.",".4x400x44.","...44044...","...4x44...",".....4....."],"seed":1196,"cl":0.2,"pal":[0,1,2,3,4],"sp":["","",".@","","......@"],"lim":40,"st":[20,31]},{"id":29,"w":2,"name":"Snoepdoos","goal":"stars","rows":["x0x4x13x220","0441133220","441133x2x04","41133x2x04","1133x2xx441","13322004x1","332x00x4x13","3220x44113","220044x1x3x"],"seed":1203,"cl":0.45,"pal":[0,1,2,3,4],"sp":["","","@.%","",".........@",".*....*%","......*",".......*"],"lim":34,"st":[6,17]},{"id":30,"w":2,"name":"Grote snoepje","goal":"clear","rows":["xxxxxxxxxxx","x.x.x.x.xx","x.x.x01.x.x","x.x101x.x4","4x4x01xx444","xxx0x01044","x..0xx10..4"],"seed":1210,"cl":0.2,"pal":[0,1,2,3,4],"sp":["","%","","","","....%"],"ceil":9,"st":[17,26]},{"id":31,"w":3,"name":"Steenhard","goal":"clear","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx"],"seed":1217,"cl":0.45,"pal":[0,1,2,3],"sp":["","",".#..#","","#.#","","..#"],"tip":"stone","lim":32,"st":[15,22]},{"id":32,"w":3,"name":"Cactus","goal":"clear","rows":["xxxxxxxxxxx","..x.x0x.x.","..x.33x.3..",".x3.33.33.","..3.x33.3..",".333xxx3..","...x333....","....33....","....3x3....","..55xx55..","...x555x..."],"seed":1224,"cl":0.2,"pal":[0,1,2,3,5],"sp":["","","","","",".#.#","","","......#"],"lim":36,"st":[17,22]},{"id":33,"w":3,"name":"Piramide","goal":"top","rows":["xxxxxxxxxxx","x.x.x5x.xx","x.x.111.x.x","x.x55555xx","x.xx55555.x","xx1x11111x","5x55555555x","11x111x111","5x5x5x5xxx5","11111111x1","111xx1x1111"],"seed":1231,"cl":0.2,"pal":[0,1,2,3,5],"lim":68,"st":[27,46]},{"id":34,"w":3,"name":"Woestijnzon","goal":"clear","rows":["xxxxxxxxxxx","x.x0x.x0xx","x...0.0.x.x","x...5x..xx","x0x5x5x50xx","x..511x..x","x..51115..x","0005115000",".0..5x5..x.","...x..0...","...00.0x..."],"seed":1238,"cl":0.2,"pal":[0,1,2,3,5],"sp":["","","....#","#",".....#...#"],"lim":68,"st":[31,40]},{"id":35,"w":3,"name":"Zandstorm","goal":"clear","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx"],"seed":1245,"cl":0.45,"pal":[0,1,2,3,4],"sp":["","","#","........#","....#..#"],"ceil":8,"st":[13,21]},{"id":36,"w":3,"name":"Palmboom","goal":"clear","rows":["xxxxxxxxxxx","xxx3x1x33x","x3x33xxxx3x","x3x.55.3x3","33....5..33",".....1....",".....5x....","....xx....",".....x.....","....x.....","....1......"],"seed":1252,"cl":0.2,"pal":[0,1,2,3,5],"lim":56,"st":[23,33]},{"id":37,"w":3,"name":"Schatkist","goal":"stars","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx"],"seed":1259,"cl":0.45,"pal":[0,1,2,3,4],"sp":["","","","","",".##....##","..*..##.*",".....*"],"lim":32,"st":[13,21]},{"id":38,"w":3,"name":"Woestijnruit","goal":"clear","rows":[".....x.....","...xxxx...","...xxxxx...",".xxxxxxxx.","xxxxxxxxxxx","xxxxxxxxxx","..xxxxxxx..","..xxxxxx..","....xxx....","....xx...."],"seed":1266,"cl":0.45,"pal":[0,1,2,3,4],"sp":["","","","....##","....###","....##","....###"],"lim":29,"st":[7,18]},{"id":39,"w":3,"name":"Duinen","goal":"clear","rows":["xxxxxxxxxxx","xxx.xxxxx.","xxx..xxxx..","xx...xxx..","xxx...xx...","xx....x...",".x........."],"seed":1273,"cl":0.45,"pal":[0,1,2,3,4],"sp":["","","#@#...@@","","..#"],"ceil":10,"st":[9,15]},{"id":40,"w":3,"name":"Slang","goal":"top","rows":["xxxxxxxxxxx","x.x.x.x.xx","x.x.x1x.x.x","x.x31xx.xx","x.x3..3.x.0","x.1...3.x1","13x....1x3.","x3.....x3.",".x......3.."],"seed":1280,"cl":0.2,"pal":[0,1,2,3,4],"lim":57,"st":[28,35]},{"id":41,"w":4,"name":"Bevroren","goal":"clear","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx"],"seed":1287,"cl":0.45,"pal":[0,1,2,3],"sp":["","",".~......~",".........~","..........~",".....~","......~"],"tip":"ice","lim":34,"st":[20,27]},{"id":42,"w":4,"name":"Sneeuwpop","goal":"clear","rows":["xxxxxxxxxxx","..x.x2x.x.","..x.424.x..","..x22xx.x.","..x0000xx..","..x2442.x.","..x22xx2x..","..x22xx2x.","..2224x22..","..xxxx22..","....22x...."],"seed":1294,"cl":0.2,"pal":[0,1,2,3,4],"lim":52,"st":[25,32]},{"id":43,"w":4,"name":"Sneeuwvlok","goal":"clear","rows":["xxxxxxxxxxx","..x.x4x.x.","..x.x23.x..",".4xxx2x34.","..x2222x2..","..3244xx..","..322xxx3..",".42222x2x.","..x3x23x4..","....x2....",".....4....."],"seed":1301,"cl":0.2,"pal":[0,1,2,3,4],"sp":["","....~~","",".~",".......~","",".......~",".~"],"lim":50,"st":[27,33]},{"id":44,"w":4,"name":"Pinguïn","goal":"stars","rows":["xxxxxxxxxxx","..x.x4x.x.","..x4x444x..","..x144xxx.","..444x444..",".x4x2x244.","..4x222xx..",".4x2xx244.","..x2x2x24..","..42222x..","....2xx...."],"seed":1308,"cl":0.2,"pal":[0,1,2,3,4],"sp":["","",".....*","","","....*.*"],"lim":27,"st":[8,17]},{"id":45,"w":4,"name":"IJstijd","goal":"clear","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx"],"seed":1315,"cl":0.45,"pal":[0,1,2,3,4],"sp":["","~~","","...~","","~~...~"],"ceil":8,"st":[14,22]},{"id":46,"w":4,"name":"Iglo","goal":"top","rows":["xxxxxxxxxxx","x.xx232.xx","x.2x22322.x","223x2x22x2","x2x3xx3xxxx","32xxxx3233","x23xxx42332","3x3x4x32x3","x2x32332xx2","32332332x3","..x323x23.."],"seed":1322,"cl":0.2,"pal":[0,1,2,3,4],"sp":["","","..~..~~","........~",".........~"],"lim":83,"st":[24,35]},{"id":47,"w":4,"name":"IJsschatten","goal":"stars","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx"],"seed":1329,"cl":0.45,"pal":[0,1,2,3,4],"sp":["","","","","","~~......~~","~*~.~~~~~*~","~~.~*~*~~~"],"lim":52,"st":[27,39]},{"id":48,"w":4,"name":"IJspegels","goal":"clear","rows":["xxxxxxxxxxx","x2222xxxx2","x22x2222222","2222222xxx","2xx33.2x333","33.x.22.33",".3..4.xx.x.","33....x...",".x....3....","......x..."],"seed":1336,"cl":0.2,"pal":[0,1,2,3,4],"sp":["",".~..~",".#",".........~","~...#",".....#...~"],"lim":45,"st":[18,25]},{"id":49,"w":4,"name":"Noorderlicht","goal":"clear","rows":["xxxxxxxxxxx","x.x1x110xx","x.112221x.x","xx12xx211x","x1xxx44x2xx","0xx4x34x10",".1x4434x21.","xx24xxx2x0",".x12222xx0.","..1111x1..","...0x1x0..."],"seed":1343,"cl":0.2,"pal":[0,1,2,3,4],"sp":["","...~.~","..%","","","",".....~",".%.....~","",".......~"],"lim":48,"st":[26,35]},{"id":50,"w":4,"name":"Kristal","goal":"clear","rows":["xxxxxxxxxxx","xxx332233x","x223x32233x","x2x332x3x2","4x444x22222",".44xx2222.","..4442222..","..44xx22..","....x22....","....4x....",".....2....."],"seed":1350,"cl":0.2,"pal":[0,1,2,3,4],"sp":["","..~.....~",".....~",".~.......~","","","........~"],"ceil":10,"st":[30,39]},{"id":51,"w":5,"name":"Kleurwissel","goal":"clear","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx"],"seed":1357,"cl":0.45,"pal":[0,1,2,3,4],"sp":["","",".?","","........?","","..?.....?"],"tip":"chg","lim":40,"st":[13,20]},{"id":52,"w":5,"name":"Raket","goal":"clear","rows":["xxxxxxxxxxx","..x.x0x.x.","..x.000.x..","..xxx00.x.","..x2x1x2x..","..x21x2.x.","..x2xx22x..","..022x2xx.","..00x550x..","....11....",".....1....."],"seed":1364,"cl":0.2,"pal":[0,1,2,3,5],"lim":36,"st":[20,27]},{"id":53,"w":5,"name":"Ringplaneet","goal":"clear","rows":["xxxxxxxxxxx","x.x.x.x.xx","x.x.x.x.x.x","x.xx1xx.xx","x44x55x5x.x",".444x5xxxx","...1x44xx.x","..555x4444","...11x1x.xx","....x5...."],"seed":1371,"cl":0.2,"pal":[0,1,2,4,5],"sp":["","","..?","...?","......?"],"lim":49,"st":[22,30]},{"id":54,"w":5,"name":"Ruimtewezen","goal":"stars","rows":["xxxxxxxxxxx",".x1.x.x1x.","...x3333...","..x33xx3..","..33333xx..",".34444443.",".xx3x33333.",".3x3x3x33.","..x300033..","..3333x3..","....3x3...."],"seed":1378,"cl":0.2,"pal":[0,1,2,3,4],"sp":["","","","...*","","..*","........*"],"lim":42,"st":[13,20]},{"id":55,"w":5,"name":"Meteorenregen","goal":"clear","rows":["xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx","xxxxxxxxxxx","xxxxxxxxxx"],"seed":1385,"cl":0.5,"pal":[0,1,2,3,4,5],"sp":["",".?@","","........?",".....@","...?"],"ceil":9,"st":[12,20]},{"id":56,"w":5,"name":"Vallende ster","goal":"stars","rows":["xxxxxxxxxxx","..x.x.x.x.","..x.xxx.x..","..x.1xx.x.","..x.11x.x..",".x1xx51xx.","..x15x511..","...555x...","...1x511...","..11..11..","...1...1..."],"seed":1392,"cl":0.2,"pal":[0,1,2,3,5],"sp":["","","....#","....#*",".....*",".....*","......*","......#"],"lim":18,"st":[7,13]},{"id":57,"w":5,"name":"Vliegende schotel","goal":"top","rows":["xxxxxxxxxxx","x.xx222.xx","x.x22x22x.x","x.x222x.xx","4x41x22414x","1441x14444",".....x.....","....x3....","....33x....","...33x3..."],"seed":1399,"cl":0.2,"pal":[0,1,2,3,4],"sp":["","","..?","","",".........?"],"lim":37,"st":[19,28]},{"id":58,"w":5,"name":"Ruimtestation","goal":"clear","rows":["x01xx2x34xx","x1x223x4x5","11223344550","1223xxx550","x2334455001","23x4x55001","33445500112","3x4550011x","4x550011223"],"seed":1406,"cl":0.45,"pal":[0,1,2,3,4,5],"sp":["","",".??.##~@~","........@","","","~","","....#"],"lim":44,"st":[18,28]},{"id":59,"w":5,"name":"Melkweg","goal":"clear","rows":["xxxxxxxxxxx","x.x444x2xx","x.444x4xx.x","x4111x442x","x4x111xx42x","41112444xx",".xxx2x442x.",".xxxxx22x.","..1xxx22x..","..x11111.."],"seed":1413,"cl":0.2,"pal":[0,1,2,3,4],"sp":["","","...?%","...??","....%"],"ceil":10,"st":[17,27]},{"id":60,"w":5,"name":"Maangezicht","goal":"clear","rows":["xxxxxxxxxxx","x.xxxxx.xx","x.551xxxx.x","x15111111x","x1xx212x11x","xx1x1xxxx1",".11x1111x1.",".xxx11055.","..1100015..","..x1x11x..",".....1....."],"seed":1420,"cl":0.2,"pal":[0,1,2,3,5],"sp":["","","...~*#@",".....~",".......**.@","...*..~.#","","....#",".....~"],"lim":48,"st":[20,31]}];
  /* ================= rules (pure: no DOM, no timing; the level generator runs this same file in Node) =================
     Field units: 1 = one bubble diameter. Hex rows: row r is shifted half a bubble to the right when (r + par) is odd,
     shifted rows hold one bubble less. A shot is traced exactly (ray against circles, wall bounces), snaps into the
     nearest free cell that hangs on something, and is resolved instantly; the visuals replay the returned events. */
  const NC = 11, LIMIT = 14, ROWS = LIMIT + 3, RH = Math.sqrt(3) / 2, FW = NC;
  const R_HIT = .8, R_FIRE = .92, BOOM_R = 1.8, AMIN = 9 * Math.PI / 180, POP_STEP = .045;
  const LX = FW / 2, LY = .5 + (LIMIT - 1) * RH + 1.95, DEAD = (LIMIT - 1) * RH + 1, MUZ = 1.45, FH = LY + 1.3;
  const K_N = 0, K_STAR = 1, K_BOMB = 2, K_RAIN = 3, K_STONE = 4, K_ICE = 5, K_CHG = 6, NCOL = 6;

  function rnd(o) { let t = o.seed = (o.seed + 0x6D2B79F5) | 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const mkR = seed => { const o = { seed: seed | 0 }; return () => rnd(o); };
  const isOff = (S, r) => ((r + S.par) & 1) === 1;
  const rowLen = (S, r) => isOff(S, r) ? NC - 1 : NC;
  const cxOf = (S, r, c) => c + .5 + (isOff(S, r) ? .5 : 0);
  const cyOf = (S, r) => (r + S.drop) * RH + .5;
  const valid = (S, r, c) => r >= 0 && r < ROWS && c >= 0 && c < rowLen(S, r);
  const key = (r, c) => r * 16 + c;
  function nbrs(S, r, c) {
    const o = [], add = (a, b) => { if (valid(S, a, b)) o.push([a, b]); };
    add(r, c - 1); add(r, c + 1);
    if (isOff(S, r)) { add(r - 1, c); add(r - 1, c + 1); add(r + 1, c); add(r + 1, c + 1); }
    else { add(r - 1, c - 1); add(r - 1, c); add(r + 1, c - 1); add(r + 1, c); }
    return o;
  }
  const mc = e => e && (e.k === K_N || e.k === K_STAR || e.k === K_CHG) ? e.c : -1;     // matchable colour, -1 = none
  function each(S, fn) { for (let r = 0; r < ROWS; r++) { const row = S.g[r], n = rowLen(S, r); for (let c = 0; c < n; c++) if (row[c]) fn(row[c], r, c); } }
  function count(S) { let n = 0; each(S, () => n++); return n; }
  function lowest(S) { let lo = -1; each(S, (e, r) => { if (r + S.drop > lo) lo = r + S.drop; }); return lo; }
  function row0(S) { let n = 0; for (let c = 0; c < rowLen(S, 0); c++) if (S.g[0][c]) n++; return n; }
  function present(S) {                                          // colours a shot may have: those still on the board
    const has = new Array(NCOL).fill(0), ice = new Array(NCOL).fill(0);
    each(S, e => { const m = mc(e); if (m >= 0) has[m]++; else if (e.k === K_ICE) ice[e.c]++; });
    let l = []; for (let c = 0; c < NCOL; c++) if (has[c]) l.push(c);
    if (!l.length) for (let c = 0; c < NCOL; c++) if (ice[c]) l.push(c);
    if (!l.length) l = S.pal.slice();
    return l;
  }
  const pick = S => { const l = present(S); return { k: 'n', c: l[Math.floor(rnd(S) * l.length) % l.length] }; };
  function fixShots(S) {
    const l = present(S), fix = s => { if (s && s.k === 'n' && !l.includes(s.c)) s.c = l[Math.floor(rnd(S) * l.length) % l.length]; };
    fix(S.cur); fix(S.nxt); fix(S.stash);
  }

  /* ---------- levels ----------
     row strings: '.' empty, '0'-'5' a colour, 'x' a colour from the level palette (clustered), '*' star,
     '#' stone, '~' ice, '@' bomb, '%' rainbow, '?' colour changer */
  function cellFrom(S, ch, r, c, R, cl) {
    const rc = () => {
      if (R() < cl) {                                            // copy a neighbour that is already placed: pleasant clusters
        const n = nbrs(S, r, c).filter(([a, b]) => (a < r || (a === r && b < c)) && mc(S.g[a][b]) >= 0);
        if (n.length) { const [a, b] = n[Math.floor(R() * n.length) % n.length]; return S.g[a][b].c; }
      }
      return S.pal[Math.floor(R() * S.pal.length) % S.pal.length];
    };
    if (ch >= '0' && ch <= '5') return { k: K_N, c: +ch };
    switch (ch) {
      case 'x': return { k: K_N, c: rc() };
      case '*': return { k: K_STAR, c: S.pal[Math.floor(R() * S.pal.length) % S.pal.length] };
      case '#': return { k: K_STONE, c: -1, h: 2 };
      case '~': return { k: K_ICE, c: rc() };
      case '@': return { k: K_BOMB, c: -1 };
      case '%': return { k: K_RAIN, c: -1 };
      case '?': return { k: K_CHG, c: S.pal[Math.floor(R() * S.pal.length) % S.pal.length] };
    }
    return null;
  }
  function blank(mode) {
    const S = { v: 1, mode, lv: 0, g: [], par: 0, drop: 0, seed: 1, pal: [0, 1, 2, 3], goal: 'clear', lim: 0, ceil: 0, ceilIn: 0, extra: 0, shots: 0, score: 0,
      streak: 0, maxStreak: 0, pops: 0, falls: 0, bigDrop: 0, fire: 0, stars: 0, starsTotal: 0, cur: null, nxt: null, stash: null, won: false, lost: false, why: '',
      pushes: 0, missN: 0, missLeft: 0, bonus: 0 };
    for (let r = 0; r < ROWS; r++) S.g.push(new Array(NC).fill(null));
    return S;
  }
  function newState(L, seed) {
    const S = blank('lvl'); S.lv = L.id; S.seed = (seed >>> 0) || 1; S.pal = L.pal.slice(); S.goal = L.goal || 'clear';
    S.lim = L.lim || 0; S.ceil = L.ceil || 0; S.ceilIn = S.ceil;
    const R = mkR(L.seed || 7), cl = L.cl == null ? .45 : L.cl;
    L.rows.forEach((row, r) => { for (let c = 0; c < row.length && c < rowLen(S, r); c++) { const e = cellFrom(S, row[c], r, c, R, cl); if (e) S.g[r][c] = e; } });
    (L.sp || []).forEach((row, r) => {                           // specials on top of a coloured picture keep its colour
      for (let c = 0; c < row.length && c < rowLen(S, r); c++) {
        const ch = row[c]; if (ch === '.' || ch === ' ') continue;
        const base = S.g[r][c], col = mc(base) >= 0 ? base.c : S.pal[Math.floor(R() * S.pal.length) % S.pal.length];
        const other = S.pal.filter(x => x !== col), sc = other.length ? other[Math.floor(R() * other.length) % other.length] : col;   // a star stands out
        S.g[r][c] = ch === '*' ? { k: K_STAR, c: sc } : ch === '~' ? { k: K_ICE, c: col } : ch === '?' ? { k: K_CHG, c: col } : cellFrom(S, ch, r, c, R, cl);
      }
    });
    each(S, e => { if (e.k === K_STAR) S.starsTotal++; });
    S.cur = pick(S); S.nxt = pick(S);
    return S;
  }
  const missFor = S => Math.max(3, 6 - Math.floor(S.pushes / 7));
  function newEndless(seed) {
    const S = blank('end'); S.seed = (seed >>> 0) || 1; S.pal = [0, 1, 2, 3];
    for (let i = 0; i < 6; i++) pushRow(S, true);
    S.pushes = 0; S.missN = S.missLeft = missFor(S);
    S.cur = pick(S); S.nxt = pick(S);
    return S;
  }
  function pushRow(S, init) {                                    // endless: a new row slides in from the top
    S.g.pop(); S.g.unshift(new Array(NC).fill(null)); S.par ^= 1;
    if (!init) S.pushes++;
    const ncol = Math.min(6, 4 + Math.floor(S.pushes / 9)); S.pal = [0, 1, 2, 3, 4, 5].slice(0, ncol);
    const n = rowLen(S, 0), sp = S.pushes;
    for (let c = 0; c < n; c++) {
      const u = rnd(S);
      if (sp > 6 && u < .03) { S.g[0][c] = { k: K_BOMB, c: -1 }; continue; }
      if (sp > 10 && u < .05) { S.g[0][c] = { k: K_STONE, c: -1, h: 2 }; continue; }
      if (sp > 4 && u < .075) { S.g[0][c] = { k: K_STAR, c: S.pal[Math.floor(rnd(S) * ncol)] }; continue; }
      if (sp > 14 && u < .095) { S.g[0][c] = { k: K_ICE, c: S.pal[Math.floor(rnd(S) * ncol)] }; continue; }
      if (sp > 18 && u < .11) { S.g[0][c] = { k: K_CHG, c: S.pal[Math.floor(rnd(S) * ncol)] }; continue; }
      if (sp > 8 && u < .125) { S.g[0][c] = { k: K_RAIN, c: -1 }; continue; }
      let col = S.pal[Math.floor(rnd(S) * ncol)];
      const left = c > 0 && S.g[0][c - 1], below = nbrs(S, 0, c).filter(([a]) => a === 1).map(([a, b]) => S.g[a][b]).filter(e => mc(e) >= 0);
      const v = rnd(S);
      if (v < .32 && mc(left) >= 0) col = left.c; else if (v < .55 && below.length) col = below[Math.floor(rnd(S) * below.length)].c;
      S.g[0][c] = { k: K_N, c: col };
    }
  }

  /* ---------- tracing a shot: ray against circles, bouncing off the side walls ---------- */
  function trace(S, ang, fire) {
    const yc = S.drop * RH + .5, cells = [];
    each(S, (e, r, c) => cells.push([r, c, cxOf(S, r, c), cyOf(S, r)]));
    let x = LX, y = LY, dx = Math.cos(ang), dy = -Math.sin(ang), hit = null, len = 0;
    const pts = [[x, y]], bounces = [], burn = [], burnt = new Set();
    if (!(dy < -1e-6)) dy = -1e-6;
    for (let seg = 0; seg < 60; seg++) {
      const tw = dx > 1e-9 ? (FW - .5 - x) / dx : dx < -1e-9 ? (.5 - x) / dx : Infinity;
      const tc = Math.max(0, (yc - y) / dy);
      let th = Infinity, hc = null;
      if (!fire) for (const q of cells) {
        const fx = x - q[2], fy = y - q[3], b = fx * dx + fy * dy, cc = fx * fx + fy * fy - R_HIT * R_HIT;
        if (cc > 0 && b > 0) continue;
        const disc = b * b - cc; if (disc < 0) continue;
        const t = Math.max(0, -b - Math.sqrt(disc)); if (t < th) { th = t; hc = q; }
      }
      const t = Math.max(0, Math.min(tw, tc, th));
      if (fire) for (const q of cells) {
        const k = key(q[0], q[1]); if (burnt.has(k)) continue;
        const s = Math.max(0, Math.min(t, (q[2] - x) * dx + (q[3] - y) * dy)), ex = x + dx * s - q[2], ey = y + dy * s - q[3];
        if (ex * ex + ey * ey < R_FIRE * R_FIRE) { burnt.add(k); burn.push([q[0], q[1], len + s]); }
      }
      x += dx * t; y += dy * t; len += t; pts.push([x, y]);
      if (t === th) { hit = [hc[0], hc[1]]; break; }
      if (t === tc || t !== tw) break;
      dx = -dx; bounces.push(len);
    }
    return { pts, len, hit, x, y, bounces, burn };
  }
  function attachable(S, r, c) { return r === 0 || nbrs(S, r, c).some(([a, b]) => S.g[a][b]); }
  function snap(S, px, py) {                                     // nearest free cell that hangs on the ceiling or a bubble
    let best = null, bd = 1e9;
    for (let pass = 0; pass < 2 && !best; pass++) for (let r = 0; r < ROWS; r++) {
      const y = cyOf(S, r); if (!pass && Math.abs(y - py) > 1.7) continue;
      for (let c = 0; c < rowLen(S, r); c++) {
        if (S.g[r][c]) continue;
        const d = (cxOf(S, r, c) - px) ** 2 + (y - py) ** 2;
        if (d < bd && (pass || attachable(S, r, c))) { bd = d; best = [r, c]; }
      }
    }
    return best;
  }

  /* ---------- resolving a shot ---------- */
  function groupD(S, r0, c0, col) {                              // flood fill with distances; rainbow bubbles join any colour
    const seen = new Set([key(r0, c0)]), out = [[r0, c0, 0]];
    for (let i = 0; i < out.length; i++) {
      const [r, c, d] = out[i];
      for (const [a, b] of nbrs(S, r, c)) {
        const k = key(a, b); if (seen.has(k)) continue; const e = S.g[a][b];
        if (e && (e.k === K_RAIN || mc(e) === col)) { seen.add(k); out.push([a, b, d + 1]); }
      }
    }
    return out;
  }
  function clone(S) { const T = Object.assign({}, S); T.g = S.g.map(row => row.map(e => e && Object.assign({}, e))); T.pal = S.pal.slice(); T.cur = S.cur && Object.assign({}, S.cur); T.nxt = S.nxt && Object.assign({}, S.nxt); T.stash = S.stash && Object.assign({}, S.stash); return T; }
  function swapShots(S) { if (!S.cur || !S.nxt || S.stash || S.cur.k !== 'n') return false; const t = S.cur; S.cur = S.nxt; S.nxt = t; return true; }
  function armSpecial(S, k) { if (!S.cur || S.won || S.lost) return false; if (S.cur.k !== 'n') { S.cur = { k }; return true; } S.stash = S.cur; S.cur = { k }; return true; }
  const starsFor = (L, shots) => !L || !L.st ? 3 : shots <= L.st[0] ? 3 : shots <= L.st[1] ? 2 : 1;
  function shoot(S, ang) {
    ang = Math.max(AMIN, Math.min(Math.PI - AMIN, +ang || Math.PI / 2));
    const shot = S.cur || { k: 'n', c: 0 }, fire = shot.k === 'fire', tr = trace(S, ang, fire);
    const ev = { ang, shot, tr, cell: null, cxy: null, placed: false, removed: [], falls: [], thaw: [], crack: [], chg: [], boom: [], stars: 0, pts: 0, fallPts: 0, starPts: 0, push: 0, drop: false, miss: false, streak: 0, won: false, lost: false };
    const removed = new Map();
    const del = (r, c, d, how) => { const k = key(r, c), e = S.g[r][c]; if (!e || removed.has(k)) return false; const x = { r, c, e, d, how, x: cxOf(S, r, c), y: cyOf(S, r) }; removed.set(k, x); ev.removed.push(x); S.g[r][c] = null; return true; };
    const bombs = [], exploded = new Set();
    const qBomb = (r, c, t, center) => { const k = key(r, c); if (exploded.has(k)) return; exploded.add(k); bombs.push([r, c, t, center ? cxOf(S, r, c) : null, center ? cyOf(S, r) : null]); if (!center) del(r, c, t, 'boom'); };
    if (fire) {
      for (const [r, c, s] of tr.burn.sort((a, b) => a[2] - b[2])) { const e = S.g[r][c]; if (!e) continue; const d = s - tr.len; if (e.k === K_BOMB) qBomb(r, c, d); else del(r, c, d, 'burn'); }
    } else {
      const cell = snap(S, tr.x, tr.y);
      if (cell) {
        const [r0, c0] = cell; ev.cell = cell; ev.cxy = [cxOf(S, r0, c0), cyOf(S, r0)];
        if (shot.k === 'bomb') qBomb(r0, c0, 0, true);
        else {
          S.g[r0][c0] = shot.k === 'rain' ? { k: K_RAIN, c: -1 } : { k: K_N, c: shot.c }; ev.placed = true;
          let grp = [];
          if (shot.k === 'rain') { const cols = new Set(); for (const [a, b] of nbrs(S, r0, c0)) { const m = mc(S.g[a][b]); if (m >= 0) cols.add(m); } for (const col of cols) { const g = groupD(S, r0, c0, col); if (g.length > grp.length) grp = g; } }
          else grp = groupD(S, r0, c0, shot.c);
          if (grp.length >= 3) for (const [r, c, d] of grp) del(r, c, d * POP_STEP, 'pop');
          for (const [a, b] of nbrs(S, r0, c0)) { const e = S.g[a][b]; if (e && e.k === K_BOMB) qBomb(a, b, .06); }
        }
        for (const x of ev.removed.slice()) for (const [a, b] of nbrs(S, x.r, x.c)) { const e = S.g[a][b]; if (e && e.k === K_BOMB) qBomb(a, b, x.d + .06); }
      }
    }
    for (let i = 0; i < bombs.length; i++) {                     // explosions, chained
      const [br, bc, t0, ox, oy] = bombs[i], bx = ox != null ? ox : removed.get(key(br, bc)).x, by = oy != null ? oy : removed.get(key(br, bc)).y;
      ev.boom.push([bx, by, t0]);
      const R = ox != null ? BOOM_R + .5 : BOOM_R;              // the bomb booster reaches a little further
      each(S, (e, r, c) => { const d = Math.hypot(cxOf(S, r, c) - bx, cyOf(S, r) - by); if (d <= R) { if (e.k === K_BOMB) qBomb(r, c, t0 + .14); else del(r, c, t0 + d * .035, 'boom'); } });
    }
    const touched = new Set();                                   // pops crack stones and thaw ice next to them
    for (const x of ev.removed.slice()) for (const [a, b] of nbrs(S, x.r, x.c)) {
      const e = S.g[a][b], k = key(a, b); if (!e || touched.has(k)) continue;
      if (e.k === K_ICE) { touched.add(k); e.k = K_N; ev.thaw.push([cxOf(S, a, b), cyOf(S, a), x.d + .08, e.c]); }
      else if (e.k === K_STONE) { touched.add(k); e.h = (e.h || 2) - 1; if (e.h <= 0) del(a, b, x.d + .1, 'crack'); else ev.crack.push([cxOf(S, a, b), cyOf(S, a), x.d + .08]); }
    }
    const conn = new Set(), q = [];                              // everything that no longer hangs on the ceiling falls
    for (let c = 0; c < rowLen(S, 0); c++) if (S.g[0][c]) { conn.add(key(0, c)); q.push([0, c]); }
    for (let i = 0; i < q.length; i++) for (const [a, b] of nbrs(S, q[i][0], q[i][1])) { const k = key(a, b); if (!conn.has(k) && S.g[a][b]) { conn.add(k); q.push([a, b]); } }
    each(S, (e, r, c) => { if (!conn.has(key(r, c))) { ev.falls.push({ r, c, e, x: cxOf(S, r, c), y: cyOf(S, r) }); S.g[r][c] = null; } });
    const nPop = ev.removed.length, nFall = ev.falls.length;
    ev.stars = ev.removed.filter(x => x.e.k === K_STAR).length + ev.falls.filter(x => x.e.k === K_STAR).length;
    if (nPop) S.streak++; else S.streak = 0;
    S.maxStreak = Math.max(S.maxStreak, S.streak); ev.streak = S.streak; ev.miss = !nPop;
    const mult = 1 + .5 * Math.min(6, Math.max(0, S.streak - 1));
    ev.pts = Math.round((nPop * 10 + Math.max(0, nPop - 5) * 20) * mult);
    ev.fallPts = nFall ? Math.round((20 * nFall + 5 * nFall * nFall) * mult) : 0;
    ev.starPts = ev.stars * 250;
    S.score += ev.pts + ev.fallPts + ev.starPts; S.stars += ev.stars; S.pops += nPop; S.falls += nFall; S.bigDrop = Math.max(S.bigDrop, nFall);
    if (!fire) S.fire = Math.min(1, S.fire + (nPop + 2 * nFall) / 110 * (S.streak >= 3 ? 1.4 : 1));
    each(S, (e, r, c) => { if (e.k === K_CHG) { const i = S.pal.indexOf(e.c); e.c = S.pal[(i + 1) % S.pal.length]; ev.chg.push([cxOf(S, r, c), cyOf(S, r), e.c]); } });
    S.shots++;
    if (S.mode === 'lvl' && S.ceil) { if (--S.ceilIn <= 0) { S.drop++; S.ceilIn = S.ceil; ev.drop = true; } }
    if (S.mode === 'end') {
      if (ev.miss && --S.missLeft <= 0) { pushRow(S); ev.push = 1; S.missN = S.missLeft = missFor(S); }
      if (!count(S)) { for (let i = 0; i < 4; i++) pushRow(S); ev.push += 4; S.score += 1000; ev.bonus = 1000; S.missN = S.missLeft = missFor(S); }
      else for (let i = 0; i < 2 && count(S) < 26; i++) { pushRow(S); ev.push++; }   // a nearly empty board is topped up
    }
    if (S.stash) { S.cur = S.stash; S.stash = null; } else { S.cur = S.nxt; S.nxt = pick(S); }
    fixShots(S);
    if (S.mode === 'lvl') {
      const n = count(S), done = S.goal === 'stars' ? S.stars >= S.starsTotal : S.goal === 'top' ? row0(S) === 0 : n === 0;
      if (done) { S.won = true; ev.won = true; if (S.lim) { S.bonus = Math.max(0, S.lim + S.extra - S.shots) * 100; S.score += S.bonus; } }
    }
    if (!S.won) {
      if (lowest(S) >= LIMIT) { S.lost = true; S.why = 'line'; ev.lost = true; }
      else if (S.mode === 'lvl' && S.lim && S.shots >= S.lim + S.extra) { S.lost = true; S.why = 'shots'; ev.lost = true; }
    }
    return ev;
  }

  /* ---------- save format ---------- */
  const ENC = e => !e ? '.' : e.k === K_N ? 'abcdef'[e.c] : e.k === K_STAR ? 'ABCDEF'[e.c] : e.k === K_ICE ? 'ghijkl'[e.c] : e.k === K_CHG ? 'GHIJKL'[e.c] : e.k === K_BOMB ? '@' : e.k === K_RAIN ? '%' : e.h === 1 ? '$' : '#';
  function DEC(ch) {
    let i;
    if ((i = 'abcdef'.indexOf(ch)) >= 0) return { k: K_N, c: i };
    if ((i = 'ABCDEF'.indexOf(ch)) >= 0) return { k: K_STAR, c: i };
    if ((i = 'ghijkl'.indexOf(ch)) >= 0) return { k: K_ICE, c: i };
    if ((i = 'GHIJKL'.indexOf(ch)) >= 0) return { k: K_CHG, c: i };
    return ch === '@' ? { k: K_BOMB, c: -1 } : ch === '%' ? { k: K_RAIN, c: -1 } : ch === '#' ? { k: K_STONE, c: -1, h: 2 } : ch === '$' ? { k: K_STONE, c: -1, h: 1 } : null;
  }
  const gridKey = (g, S) => g.map((row, r) => row.slice(0, rowLen(S, r)).map(ENC).join('')).join('/');
  function serialize(S) { const o = Object.assign({}, S); o.g = gridKey(S.g, S); return JSON.parse(JSON.stringify(o)); }
  function deserialize(o) {
    const S = Object.assign(blank(o.mode), o); S.g = [];
    const rows = String(o.g || '').split('/');
    for (let r = 0; r < ROWS; r++) { const row = new Array(NC).fill(null), s = rows[r] || ''; for (let c = 0; c < s.length && c < NC; c++) row[c] = DEC(s[c]); S.g.push(row); }
    if (!S.cur) S.cur = pick(S); if (!S.nxt) S.nxt = pick(S);
    return S;
  }

  /* ---------- a simple bot (used to prove the levels are winnable; it shoots through the normal rules) ---------- */
  function evalMove(S0, T, ev) {
    if (T.won) return 1e6 - T.shots * 10 + T.score / 1e4;
    if (T.lost) return -1e6;
    let v = ev.removed.length * 10 + ev.falls.length * 15 + (T.stars - S0.stars) * 90;
    if (T.goal === 'top') v += 22 * (row0(S0) - row0(T));
    if (T.goal === 'stars') {                                   // fewer bubbles on top of the stars is better
      const cover = S => { let n = 0; each(S, (e, r, c) => { if (e.k === K_STAR) { const x = cxOf(S, r, c); each(S, (f, a, b) => { if (a > r && Math.abs(cxOf(S, a, b) - x) < (a - r) * .6 + .6) n++; }); } }); return n; };
      v += (cover(S0) - cover(T)) * 1.5;
    }
    if (ev.placed && !ev.removed.length) {
      const [r, c] = ev.cell; let same = 0, near = 0;
      for (const [a, b] of nbrs(T, r, c)) { const e = T.g[a][b]; if (!e) continue; near++; if (ev.shot.k === 'n' && mc(e) === ev.shot.c) same++; }
      v += same * 5 - (r + T.drop) * .5 - (near - same) * .5;
    }
    const lo = lowest(T), danger = T.mode === 'end' || T.ceil ? LIMIT - 5 : LIMIT - 3;
    if (lo >= danger) v -= (lo - danger + 1) * (T.ceil || T.mode === 'end' ? 30 : 12);
    return v;
  }
  function botMove(S, n = 161) {
    let best = null;
    const opts = [{ swap: false, shot: S.cur }];
    if (S.cur && S.cur.k === 'n' && S.nxt && S.nxt.k === 'n' && S.nxt.c !== S.cur.c && !S.stash) opts.push({ swap: true, shot: S.nxt });
    for (const o of opts) {
      const fire = o.shot.k === 'fire', runs = [];
      for (let i = 0; i < n; i++) {
        const a = AMIN + (Math.PI - 2 * AMIN) * (i + .5) / n, tr = trace(S, a, fire), cell = fire ? 'f' + Math.round(i / 6) : (snap(S, tr.x, tr.y) || []).join();
        const last = runs[runs.length - 1]; if (last && last.k === cell) { last.i1 = i; last.a1 = a; } else runs.push({ k: cell, i0: i, i1: i, a0: a, a1: a });
      }
      for (const run of runs) {
        const a = (run.a0 + run.a1) / 2, T = clone(S); if (o.swap) swapShots(T);
        const ev = shoot(T, a); let v = evalMove(S, T, ev) + Math.min(3, run.i1 - run.i0) * .2;
        if (!best || v > best.v) best = { v, ang: a, swap: o.swap, w: run.i1 - run.i0 + 1 };
      }
    }
    return best;
  }

  const C_trace = trace, C_snap = snap, C_shoot = shoot, C_new = newState, C_newEnd = newEndless, C_ser = serialize, C_deser = deserialize, C_swap = swapShots, C_arm = armSpecial, C_clone = clone;
  /* ================= art: pre-rendered sprites (one canvas per bubble kind and colour), scenery, the launcher ================= */
  const TAU = Math.PI * 2, FONT = 'system-ui,Roboto,"Segoe UI",sans-serif';
  const PAL = [
    { n: 'rood', b: '#f2394c', l: '#ff9aa2', d: '#8e0c1f' },
    { n: 'geel', b: '#ffcc1a', l: '#fff3a0', d: '#b87800' },
    { n: 'blauw', b: '#2f7cf6', l: '#9cc8ff', d: '#14378f' },
    { n: 'groen', b: '#2fc44b', l: '#a6f2a8', d: '#0f6b25' },
    { n: 'paars', b: '#a45cff', l: '#dcbcff', d: '#4f1a9c' },
    { n: 'oranje', b: '#ff8619', l: '#ffc98a', d: '#a5470a' },
  ];
  const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  function srng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  /* ---------- the glossy ball ---------- */
  function ball(g, R, b, l, d, shadow = true) {
    if (shadow) { const sh = g.createRadialGradient(R * .1, R * .24, R * .55, R * .1, R * .24, R * 1.2); sh.addColorStop(0, 'rgba(0,0,0,.34)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.beginPath(); g.arc(R * .1, R * .24, R * 1.2, 0, TAU); g.fill(); }
    const gr = g.createRadialGradient(-R * .38, -R * .44, R * .04, -R * .08, -R * .08, R * 1.12);
    gr.addColorStop(0, l); gr.addColorStop(.45, b); gr.addColorStop(1, d);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R * .97, 0, TAU); g.fill();
    const gl = g.createRadialGradient(R * .2, R * .58, 0, R * .2, R * .58, R * .66); gl.addColorStop(0, 'rgba(255,255,255,.42)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, R * .96, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = R * .06; g.beginPath(); g.arc(0, 0, R * .94, 0, TAU); g.stroke();
    g.save(); g.translate(-R * .3, -R * .44); g.rotate(-.55);
    const hl = g.createLinearGradient(0, -R * .22, 0, R * .24); hl.addColorStop(0, 'rgba(255,255,255,.96)'); hl.addColorStop(1, 'rgba(255,255,255,.1)');
    g.fillStyle = hl; g.beginPath(); g.ellipse(0, 0, R * .38, R * .2, 0, 0, TAU); g.fill(); g.restore();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(-R * .64, -R * .02, R * .07, 0, TAU); g.fill();
  }
  function sym(g, i, s) {                                        // colour-blind symbols: white with a dark edge
    g.save(); g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = s * .16; g.lineJoin = 'round'; g.beginPath();
    if (i === 0) { g.moveTo(0, s * .8); g.bezierCurveTo(-s * 1.2, -s * .05, -s * .6, -s * .95, 0, -s * .38); g.bezierCurveTo(s * .6, -s * .95, s * 1.2, -s * .05, 0, s * .8); }
    else if (i === 1) g.arc(0, 0, s * .62, 0, TAU);
    else if (i === 2) { g.moveTo(0, -s * .85); g.lineTo(s * .62, 0); g.lineTo(0, s * .85); g.lineTo(-s * .62, 0); }
    else if (i === 3) { g.moveTo(0, -s * .78); g.lineTo(s * .78, s * .6); g.lineTo(-s * .78, s * .6); }
    else if (i === 4) g.rect(-s * .58, -s * .58, s * 1.16, s * 1.16);
    else { const a = s * .26, b = s * .78; g.moveTo(-a, -b); g.lineTo(a, -b); g.lineTo(a, -a); g.lineTo(b, -a); g.lineTo(b, a); g.lineTo(a, a); g.lineTo(a, b); g.lineTo(-a, b); g.lineTo(-a, a); g.lineTo(-b, a); g.lineTo(-b, -a); g.lineTo(-a, -a); }
    g.closePath(); g.stroke(); g.fill(); g.restore();
  }
  function starPath(g, R, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); }
  function goldStar(g, R) {
    const gr = g.createLinearGradient(0, -R, 0, R); gr.addColorStop(0, '#fff7b0'); gr.addColorStop(.5, '#ffd23a'); gr.addColorStop(1, '#e48a00');
    starPath(g, R, R * .46); g.fillStyle = gr; g.strokeStyle = '#fff'; g.lineWidth = R * .2; g.lineJoin = 'round'; g.stroke(); g.fill();
    g.strokeStyle = 'rgba(150,80,0,.5)'; g.lineWidth = R * .07; g.stroke();
  }
  function rainbowBall(g, R) {
    const sh = g.createRadialGradient(R * .1, R * .24, R * .55, R * .1, R * .24, R * 1.2); sh.addColorStop(0, 'rgba(0,0,0,.34)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.beginPath(); g.arc(R * .1, R * .24, R * 1.2, 0, TAU); g.fill();
    for (let i = 0; i < 6; i++) { g.fillStyle = PAL[[0, 5, 1, 3, 2, 4][i]].b; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R * .97, -Math.PI / 2 + i * TAU / 6, -Math.PI / 2 + (i + 1) * TAU / 6 + .02); g.closePath(); g.fill(); }
    const w = g.createRadialGradient(-R * .2, -R * .25, 0, 0, 0, R); w.addColorStop(0, 'rgba(255,255,255,.85)'); w.addColorStop(.4, 'rgba(255,255,255,.25)'); w.addColorStop(1, 'rgba(0,0,0,.25)');
    g.fillStyle = w; g.beginPath(); g.arc(0, 0, R * .97, 0, TAU); g.fill();
    ball(g, R, 'rgba(0,0,0,0)', 'rgba(255,255,255,.0)', 'rgba(0,0,0,0)', false);
    g.save(); g.scale(.9, .9); starPath(g, R * .36, R * .16); g.fillStyle = '#fff'; g.fill(); g.restore();
  }
  function bombBall(g, R) {
    ball(g, R, '#3a4256', '#8f9ab3', '#0d1018');
    g.strokeStyle = '#ff5a3c'; g.lineWidth = R * .1; g.beginPath(); g.arc(0, 0, R * .62, .2, Math.PI - .2); g.stroke();
    g.fillStyle = '#5d6478'; rr(g, R * .18, -R * 1.02, R * .42, R * .3, R * .08); g.save(); g.translate(R * .39, -R * .87); g.rotate(.5); g.fillRect(-R * .2, -R * .14, R * .4, R * .28); g.restore();
    g.strokeStyle = '#a0703a'; g.lineWidth = R * .1; g.lineCap = 'round'; g.beginPath(); g.moveTo(R * .5, -R * .98); g.quadraticCurveTo(R * .7, -R * 1.25, R * .9, -R * 1.12); g.stroke();
    const sp = g.createRadialGradient(R * .92, -R * 1.12, 0, R * .92, -R * 1.12, R * .4); sp.addColorStop(0, '#fff'); sp.addColorStop(.3, '#ffe35a'); sp.addColorStop(1, 'rgba(255,120,0,0)');
    g.fillStyle = sp; g.beginPath(); g.arc(R * .92, -R * 1.12, R * .4, 0, TAU); g.fill();
    g.save(); g.translate(R * .92, -R * 1.12); starPath(g, R * .26, R * .08); g.fillStyle = '#fff6b0'; g.fill(); g.restore();
  }
  function stoneBall(g, R, h) {
    const sh = g.createRadialGradient(R * .1, R * .24, R * .55, R * .1, R * .24, R * 1.2); sh.addColorStop(0, 'rgba(0,0,0,.38)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.beginPath(); g.arc(R * .1, R * .24, R * 1.2, 0, TAU); g.fill();
    const rnd = srng(77); g.beginPath();
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU, q = R * (.9 + rnd() * .08); g.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
    g.closePath();
    const gr = g.createRadialGradient(-R * .35, -R * .4, R * .05, 0, 0, R * 1.1); gr.addColorStop(0, '#e4ded4'); gr.addColorStop(.5, '#9a9187'); gr.addColorStop(1, '#4d463f');
    g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(30,25,20,.5)'; g.lineWidth = R * .06; g.stroke();
    g.fillStyle = 'rgba(60,50,40,.35)'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc((rnd() - .5) * R * 1.1, (rnd() - .5) * R * 1.1, R * (.05 + rnd() * .07), 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-R * .3, -R * .45, R * .3, R * .13, -.5, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(35,28,22,.75)'; g.lineWidth = R * .07; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-R * .1, -R * .85); g.lineTo(R * .05, -R * .45); g.lineTo(-R * .15, -R * .2); g.stroke();
    if (h === 1) { g.lineWidth = R * .08; g.beginPath(); g.moveTo(R * .8, -R * .2); g.lineTo(R * .3, -R * .05); g.lineTo(R * .1, R * .35); g.lineTo(-R * .35, R * .45); g.moveTo(R * .3, -R * .05); g.lineTo(R * .45, R * .55); g.moveTo(-R * .15, -R * .2); g.lineTo(-R * .6, -R * .1); g.stroke(); }
  }
  function iceShell(g, R) {
    g.fillStyle = 'rgba(215,242,255,.5)'; g.beginPath(); g.arc(0, 0, R * .97, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = R * .05; g.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + .26; g.lineTo(Math.cos(a) * R * .62, Math.sin(a) * R * .62); } g.closePath();
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + .26; g.moveTo(Math.cos(a) * R * .62, Math.sin(a) * R * .62); g.lineTo(Math.cos(a) * R * .95, Math.sin(a) * R * .95); }
    g.stroke();
    g.strokeStyle = 'rgba(240,252,255,.95)'; g.lineWidth = R * .12; g.beginPath(); g.arc(0, 0, R * .9, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.save(); g.translate(R * .45, -R * .5); starPath(g, R * .2, R * .06); g.fill(); g.restore();
  }
  function chgArrows(g, R) {
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = R * .13; g.lineCap = 'round';
    for (const a0 of [-.3, Math.PI - .3]) {
      g.beginPath(); g.arc(0, 0, R * .55, a0, a0 + 2.1); g.stroke();
      const a = a0 + 2.1, x = Math.cos(a) * R * .55, y = Math.sin(a) * R * .55, tx = -Math.sin(a), ty = Math.cos(a);
      g.beginPath(); g.moveTo(x + tx * R * .26, y + ty * R * .26); g.lineTo(x - ty * R * .2 - tx * .02, y + tx * R * .2); g.lineTo(x + ty * R * .2, y - tx * R * .2); g.closePath(); g.fill();
    }
  }
  function fireBall(g, R) {
    const o = g.createRadialGradient(0, 0, 0, 0, 0, R * 1.35); o.addColorStop(0, 'rgba(255,240,170,1)'); o.addColorStop(.35, 'rgba(255,190,40,1)'); o.addColorStop(.62, 'rgba(255,90,20,.95)'); o.addColorStop(1, 'rgba(220,30,0,0)');
    g.fillStyle = o; g.beginPath(); g.arc(0, 0, R * 1.35, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(-R * .25, -R * .3, R * .25, R * .14, -.5, 0, TAU); g.fill();
  }

  /* ---------- sprite caches (cleared when the scale changes) ---------- */
  let SPR = new Map(), SPRK = 0;
  const PADU = .2;                                               // margin around a bubble (units) for its shadow and glow
  function scaleCheck(k) { if (k !== SPRK) { SPR = new Map(); SPRK = k; } }
  // e: { k, c, h } (k: kind, or 'fire' / 'bomb' / 'rain' / 'n' for a shot); sprite drawn at k px per unit; anchor at the centre
  function bubbleSprite(e, k, cb) {
    scaleCheck(k);
    const kind = e.k, id = 'b' + kind + '|' + e.c + '|' + (e.h || 0) + '|' + (cb ? 1 : 0);
    let s = SPR.get(id); if (s) return s;
    const size = Math.ceil((1 + PADU * 2) * k) + 2, cv = mkc(size, size), g = cv.getContext('2d'), R = .5 * .98;
    g.setTransform(k, 0, 0, k, size / 2, size / 2);
    const P = PAL[e.c] || PAL[0];
    if (kind === 'fire') fireBall(g, R);
    else if (kind === K_BOMB || kind === 'bomb') bombBall(g, R);
    else if (kind === K_RAIN || kind === 'rain') rainbowBall(g, R);
    else if (kind === K_STONE) stoneBall(g, R, e.h || 2);
    else {
      if (kind === K_ICE) ball(g, R, P.b, '#ffffff', P.d); else ball(g, R, P.b, P.l, P.d);
      if (kind === K_STAR) { const gl = g.createRadialGradient(0, 0, 0, 0, 0, R * .8); gl.addColorStop(0, 'rgba(255,255,220,.7)'); gl.addColorStop(1, 'rgba(255,255,220,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, R * .8, 0, TAU); g.fill(); goldStar(g, R * .58); }
      if (kind === K_CHG) chgArrows(g, R);
      if (cb) { if (kind === K_STAR || kind === K_CHG) { g.save(); g.translate(R * .55, R * .55); sym(g, e.c, R * .3); g.restore(); } else sym(g, e.c, R * .42); }
      if (kind === K_ICE) iceShell(g, R);
    }
    s = { cv, w: size, h: size, a: size / 2 }; SPR.set(id, s);
    return s;
  }
  function dropSprite(col, k) {                                  // a droplet for the pop spray
    scaleCheck(k); const id = 'd' + col; let s = SPR.get(id); if (s) return s;
    const size = Math.ceil(.32 * k) + 2, cv = mkc(size, size), g = cv.getContext('2d');
    g.setTransform(k, 0, 0, k, size / 2, size / 2);
    if (col === 'spark') { const gr = g.createRadialGradient(0, 0, 0, 0, 0, .15); gr.addColorStop(0, '#fff'); gr.addColorStop(.4, 'rgba(255,240,170,.9)'); gr.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, .15, 0, TAU); g.fill(); }
    else if (col === 'ice') { g.fillStyle = 'rgba(225,248,255,.95)'; g.beginPath(); g.moveTo(0, -.13); g.lineTo(.08, 0); g.lineTo(0, .13); g.lineTo(-.08, 0); g.closePath(); g.fill(); }
    else if (col === 'stone') { g.fillStyle = '#8d857b'; g.beginPath(); g.moveTo(-.1, -.08); g.lineTo(.11, -.05); g.lineTo(.06, .1); g.lineTo(-.09, .07); g.closePath(); g.fill(); }
    else if (col === 'fire') { const gr = g.createRadialGradient(0, 0, 0, 0, 0, .15); gr.addColorStop(0, '#fff2a0'); gr.addColorStop(.5, 'rgba(255,140,20,.9)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, .15, 0, TAU); g.fill(); }
    else { const P = PAL[col] || PAL[0]; ball(g, .11, P.b, P.l, P.d, false); }
    s = { cv, w: size, h: size, a: size / 2 }; SPR.set(id, s); return s;
  }
  function dotSprite(col, k) {                                   // aim-line dot, tinted with the colour of the shot
    scaleCheck(k); const id = 'a' + col; let s = SPR.get(id); if (s) return s;
    const size = Math.ceil(.36 * k) + 2, cv = mkc(size, size), g = cv.getContext('2d');
    g.setTransform(k, 0, 0, k, size / 2, size / 2);
    const c = PAL[col] ? PAL[col].l : col === 'fire' ? '#ffb347' : '#ffffff';
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(.012, .02, .11, 0, TAU); g.fill();
    g.fillStyle = c; g.beginPath(); g.arc(0, 0, .1, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-.02, -.025, .055, 0, TAU); g.fill();
    s = { cv, w: size, h: size, a: size / 2 }; SPR.set(id, s); return s;
  }
  function textSprite(txt, col, sz, k) {                         // score popups: drawn once, then only moved
    scaleCheck(k); const id = 't' + txt + col + sz; let s = SPR.get(id); if (s) return s;
    const fpx = Math.max(8, sz * k), m = mkc(10, 10).getContext('2d'); m.font = `900 ${fpx}px ${FONT}`;
    const w = Math.ceil(m.measureText(txt).width + fpx * .5), h = Math.ceil(fpx * 1.45), cv = mkc(w, h), g = cv.getContext('2d');
    g.font = `900 ${fpx}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(20,10,40,.85)'; g.lineWidth = fpx * .22; g.strokeText(txt, w / 2, h / 2); g.fillStyle = col; g.fillText(txt, w / 2, h / 2);
    s = { cv, w, h, a: w / 2, b: h / 2 }; if (SPR.size > 600) SPR.clear(); SPR.set(id, s); return s;
  }

  /* ---------- the launcher: a round little bubble-blower with a brass tube ---------- */
  function drawCritter(g, ang, look, mood) {
    // tube (behind the body), pointing along the aim
    g.save(); g.translate(0, -.12); g.rotate(-ang + Math.PI / 2);
    const tg = g.createLinearGradient(-.3, 0, .3, 0); tg.addColorStop(0, '#9a6510'); tg.addColorStop(.35, '#ffe08a'); tg.addColorStop(.6, '#e0a43a'); tg.addColorStop(1, '#7a4a08');
    g.fillStyle = tg; rr(g, -.25, -1.1, .5, 1.1, .12); g.fill();
    g.fillStyle = 'rgba(80,45,0,.35)'; g.fillRect(-.25, -.84, .5, .06); g.fillRect(-.25, -.7, .5, .04);
    g.fillStyle = tg; rr(g, -.36, -1.18, .72, .24, .1); g.fill(); g.strokeStyle = 'rgba(80,45,0,.45)'; g.lineWidth = .03; g.stroke();
    g.restore();
    // body
    const sh = g.createRadialGradient(0, .98, .1, 0, .98, 1.5); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.beginPath(); g.ellipse(0, .98, 1.5, .32, 0, 0, TAU); g.fill();
    g.fillStyle = '#137485'; g.beginPath(); g.ellipse(-.5, .86, .32, .17, 0, 0, TAU); g.ellipse(.5, .86, .32, .17, 0, 0, TAU); g.fill();
    for (const s of [-1, 1]) { g.fillStyle = '#1b8f9c'; g.beginPath(); g.ellipse(s * .98, .2, .22, .36, s * .5, 0, TAU); g.fill(); }
    const bg = g.createRadialGradient(-.35, -.25, .05, 0, .2, 1.15); bg.addColorStop(0, '#9af2e6'); bg.addColorStop(.45, '#33c3c0'); bg.addColorStop(1, '#0e6d7d');
    g.fillStyle = bg; g.beginPath(); g.ellipse(0, .22, 1.02, .82, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(220,255,248,.75)'; g.beginPath(); g.ellipse(0, .55, .58, .36, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-.48, -.22, .26, .12, -.6, 0, TAU); g.fill();
    // eyes follow the aim
    const lx = Math.cos(look) * .075, ly = -Math.sin(look) * .075;
    for (const s of [-1, 1]) {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(s * .34, .02, .21, .25, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(0,60,70,.35)'; g.lineWidth = .03; g.stroke();
      g.fillStyle = '#18202e'; g.beginPath(); g.arc(s * .34 + lx, .04 + ly, mood === 'wow' ? .13 : .11, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(s * .34 + lx - .04, ly - .02, .04, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(255,120,140,.5)'; g.beginPath(); g.ellipse(-.62, .3, .14, .08, 0, 0, TAU); g.ellipse(.62, .3, .14, .08, 0, 0, TAU); g.fill();
    g.strokeStyle = '#0c4a55'; g.lineWidth = .06; g.lineCap = 'round'; g.beginPath();
    if (mood === 'wow') { g.fillStyle = '#0c4a55'; g.ellipse(0, .36, .08, .1, 0, 0, TAU); g.fill(); } else { g.arc(0, .26, .16, .35, Math.PI - .35); g.stroke(); }
  }
  function dish(g) {                                             // the shell that holds the next bubble
    const gr = g.createLinearGradient(0, -.1, 0, .4); gr.addColorStop(0, '#ffe8c4'); gr.addColorStop(1, '#d99a5e');
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(.05, .42, .6, .12, 0, 0, TAU); g.fill();
    g.fillStyle = gr; g.beginPath(); g.moveTo(-.55, .12); g.quadraticCurveTo(0, .62, .55, .12); g.quadraticCurveTo(0, .28, -.55, .12); g.fill();
    g.strokeStyle = 'rgba(140,80,30,.6)'; g.lineWidth = .035; g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(i * .1, .26); g.lineTo(i * .2, .42); } g.stroke();
  }

  /* ---------- scenery per world (drawn once per level / size into an image) ---------- */
  const WORLD_BG = [
    { top: '#2ab3e6', mid: '#0d5d99', bot: '#06305e', panel: 'rgba(4,30,60,.5)', line: '#9fe6ff' },
    { top: '#c8f0a8', mid: '#5cb768', bot: '#245f33', panel: 'rgba(16,48,24,.5)', line: '#e9ffb0' },
    { top: '#ffd6f0', mid: '#f59ad6', bot: '#9c5ad8', panel: 'rgba(80,20,90,.42)', line: '#fff0fb' },
    { top: '#ffd27a', mid: '#ff9358', bot: '#c5527a', panel: 'rgba(90,30,30,.45)', line: '#fff1c2' },
    { top: '#d9f4ff', mid: '#86c4ee', bot: '#3a6fb8', panel: 'rgba(20,50,100,.42)', line: '#ffffff' },
    { top: '#2a1a5c', mid: '#120d33', bot: '#060515', panel: 'rgba(20,10,60,.45)', line: '#c9b8ff' },
  ];
  function drawScene(g, W, H, w, F) {                            // W,H: stage px; F: field box {x, y, w, h, k}
    const T = WORLD_BG[w] || WORLD_BG[0], R = srng(11 + w * 31), k = F.k;
    const bgr = g.createLinearGradient(0, 0, 0, H); bgr.addColorStop(0, T.top); bgr.addColorStop(.55, T.mid); bgr.addColorStop(1, T.bot);
    g.fillStyle = bgr; g.fillRect(0, 0, W, H);
    const S = Math.max(W, H) / 400;                              // decoration scale
    if (w === 0) {                                               // ocean: light rays, seaweed, sand, rising bubbles, fish
      g.save(); g.globalAlpha = .08; g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const x = R() * W; g.beginPath(); g.moveTo(x - 20 * S, 0); g.lineTo(x + 20 * S, 0); g.lineTo(x + 90 * S, H); g.lineTo(x + 30 * S, H); g.fill(); } g.restore();
      g.fillStyle = '#e8c98a'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 10) g.lineTo(x, H - 26 * S - Math.sin(x / (60 * S)) * 8 * S); g.lineTo(W, H); g.fill();
      g.fillStyle = 'rgba(160,110,50,.25)'; for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(R() * W, H - R() * 18 * S, 1.5 * S, 0, TAU); g.fill(); }
      for (let i = 0; i < 9; i++) { const x = (i < 5 ? R() * .22 : .78 + R() * .22) * W, h = (90 + R() * 160) * S; g.strokeStyle = ['#1f9a5a', '#2cb36a', '#178048'][i % 3]; g.lineWidth = (5 + R() * 5) * S; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, H); for (let t = 0; t <= 1; t += .1) g.lineTo(x + Math.sin(t * 7 + i) * 12 * S, H - t * h); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5 * S; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(R() * W, R() * H, (2 + R() * 6) * S, 0, TAU); g.stroke(); }
      g.fillStyle = 'rgba(4,40,80,.4)'; for (let i = 0; i < 5; i++) { const x = R() * W, y = H * (.15 + R() * .6), s = (8 + R() * 10) * S, d = R() < .5 ? 1 : -1; g.beginPath(); g.ellipse(x, y, s * 1.6, s * .8, 0, 0, TAU); g.moveTo(x - d * s * 1.4, y); g.lineTo(x - d * s * 2.5, y - s * .8); g.lineTo(x - d * s * 2.5, y + s * .8); g.fill(); }
    } else if (w === 1) {                                        // forest: sun, hills, pines, mushrooms, fireflies
      const sun = g.createRadialGradient(W * .82, H * .1, 0, W * .82, H * .1, 160 * S); sun.addColorStop(0, 'rgba(255,255,210,.9)'); sun.addColorStop(1, 'rgba(255,255,210,0)'); g.fillStyle = sun; g.fillRect(0, 0, W, H);
      [['#79c46a', .55, 30], ['#4f9e55', .7, 40], ['#2f7a3e', .85, 30]].forEach(([c, y0, a], j) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, H * y0 - Math.sin(x / (90 * S) + j * 2) * a * S); g.lineTo(W, H); g.fill(); });
      for (let i = 0; i < 12; i++) { const x = (i < 6 ? R() * .25 : .75 + R() * .25) * W, y = H * (.6 + R() * .35), s = (20 + R() * 26) * S; g.fillStyle = '#5a3a22'; g.fillRect(x - s * .1, y, s * .2, s * .5); g.fillStyle = ['#1e6b34', '#25803e', '#195a2c'][i % 3]; for (let t = 0; t < 3; t++) { g.beginPath(); g.moveTo(x, y - s * (1.3 - t * .35)); g.lineTo(x + s * (.45 + t * .12), y - s * (.45 - t * .3)); g.lineTo(x - s * (.45 + t * .12), y - s * (.45 - t * .3)); g.fill(); } }
      for (let i = 0; i < 5; i++) { const x = R() * W, y = H - (6 + R() * 20) * S, s = (6 + R() * 5) * S; g.fillStyle = '#f4ecd8'; g.fillRect(x - s * .25, y - s * .2, s * .5, s * .8); g.fillStyle = '#e8413c'; g.beginPath(); g.arc(x, y - s * .2, s * .75, Math.PI, 0); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - s * .3, y - s * .55, s * .13, 0, TAU); g.arc(x + s * .25, y - s * .45, s * .1, 0, TAU); g.fill(); }
      for (let i = 0; i < 18; i++) { const x = R() * W, y = R() * H * .9, gl = g.createRadialGradient(x, y, 0, x, y, 7 * S); gl.addColorStop(0, 'rgba(255,255,170,.9)'); gl.addColorStop(1, 'rgba(255,255,170,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x, y, 7 * S, 0, TAU); g.fill(); }
    } else if (w === 2) {                                        // candy: stripes, cotton clouds, lollipops, sprinkles
      g.save(); g.globalAlpha = .1; g.fillStyle = '#fff'; for (let x = -H; x < W; x += 40 * S) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 18 * S, 0); g.lineTo(x + 18 * S + H, H); g.lineTo(x + H, H); g.fill(); } g.restore();
      for (let i = 0; i < 6; i++) { const x = R() * W, y = R() * H * .5, s = (16 + R() * 18) * S; g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); for (let j = 0; j < 5; j++) g.arc(x + (j - 2) * s * .7, y + Math.sin(j * 2) * s * .25, s * (.6 + R() * .3), 0, TAU); g.fill(); }
      for (let i = 0; i < 6; i++) { const x = (i < 3 ? .03 + R() * .17 : .8 + R() * .17) * W, y = H * (.45 + R() * .45), s = (14 + R() * 12) * S; g.fillStyle = '#fff7f0'; g.fillRect(x - s * .08, y, s * .16, s * 2.4); for (let j = 0; j < 4; j++) { g.fillStyle = ['#ff5f9e', '#ffd34d', '#7fd3ff', '#9b6bff'][(i + j) % 4]; g.beginPath(); g.arc(x, y, s * (1 - j * .22), 0, TAU); g.fill(); } g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2 * S; g.beginPath(); for (let t = 0; t < 14; t += .2) g.lineTo(x + Math.cos(t) * t / 14 * s, y + Math.sin(t) * t / 14 * s); g.stroke(); }
      for (let i = 0; i < 70; i++) { g.save(); g.translate(R() * W, R() * H); g.rotate(R() * 6); g.fillStyle = ['#ff5f9e', '#ffd34d', '#7fd3ff', '#9b6bff', '#6fe08a', '#fff'][i % 6]; rr(g, -4 * S, -1.3 * S, 8 * S, 2.6 * S, 1.3 * S); g.fill(); g.restore(); }
    } else if (w === 3) {                                        // desert at sunset: sun, far pyramids, dunes, cacti
      const sun = g.createRadialGradient(W * .5, H * .58, 0, W * .5, H * .58, 220 * S); sun.addColorStop(0, 'rgba(255,250,210,1)'); sun.addColorStop(.25, 'rgba(255,236,170,.9)'); sun.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = sun; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(190,90,70,.45)'; for (const [x, s] of [[.18, 70], [.3, 45], [.78, 60]]) { g.beginPath(); g.moveTo(W * x - s * S, H * .66); g.lineTo(W * x, H * .66 - s * .8 * S); g.lineTo(W * x + s * S, H * .66); g.fill(); }
      [['#f6bd6a', .64, 18], ['#e7a04f', .76, 24], ['#cf853c', .88, 18]].forEach(([c, y0, a], j) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, H * y0 - Math.sin(x / (110 * S) + j * 1.7) * a * S); g.lineTo(W, H); g.fill(); });
      for (let i = 0; i < 6; i++) { const x = (i < 3 ? .04 + R() * .18 : .78 + R() * .18) * W, y = H * (.8 + R() * .15), s = (14 + R() * 12) * S; g.strokeStyle = '#3f7d45'; g.lineCap = 'round'; g.lineWidth = s * .45; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 2.2); g.moveTo(x, y - s * 1.1); g.lineTo(x - s * .7, y - s * 1.1); g.lineTo(x - s * .7, y - s * 1.7); g.moveTo(x, y - s * 1.4); g.lineTo(x + s * .6, y - s * 1.4); g.lineTo(x + s * .6, y - s * 2); g.stroke(); }
    } else if (w === 4) {                                        // ice: aurora, snowy peaks, snowflakes
      for (let j = 0; j < 3; j++) { g.fillStyle = ['rgba(120,255,190,.22)', 'rgba(190,140,255,.18)', 'rgba(120,220,255,.2)'][j]; g.beginPath(); g.moveTo(0, H * .1 + j * 30 * S); for (let x = 0; x <= W; x += 10) g.lineTo(x, H * (.12 + j * .06) + Math.sin(x / (70 * S) + j) * 26 * S); for (let x = W; x >= 0; x -= 10) g.lineTo(x, H * (.22 + j * .06) + Math.sin(x / (55 * S) + j * 2) * 30 * S); g.fill(); }
      for (let j = 0; j < 2; j++) { g.fillStyle = j ? '#f4fbff' : '#cfe6f7'; g.beginPath(); g.moveTo(0, H); let x = -40 * S; while (x < W + 60 * S) { const pw = (70 + R() * 80) * S, ph = (60 + R() * 110) * S * (j ? .7 : 1); g.lineTo(x + pw / 2, H * (j ? .9 : .82) - ph); g.lineTo(x + pw, H * (j ? .9 : .82)); x += pw * .8; } g.lineTo(W, H); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(R() * W, R() * H, (1 + R() * 2.4) * S, 0, TAU); g.fill(); }
    } else {                                                     // space: nebula, stars, a ringed planet, a moon
      for (let i = 0; i < 5; i++) { const x = R() * W, y = R() * H, r = (90 + R() * 140) * S, n = g.createRadialGradient(x, y, 0, x, y, r); n.addColorStop(0, ['rgba(150,80,255,.3)', 'rgba(60,140,255,.25)', 'rgba(255,90,180,.2)'][i % 3]); n.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = n; g.fillRect(0, 0, W, H); }
      for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${(.3 + R() * .7).toFixed(2)})`; g.beginPath(); g.arc(R() * W, R() * H, (.5 + R() * 1.4) * S, 0, TAU); g.fill(); }
      const px = W * .12, py = H * .78, pr = 46 * S, pg = g.createRadialGradient(px - pr * .4, py - pr * .4, pr * .1, px, py, pr); pg.addColorStop(0, '#ffcf8a'); pg.addColorStop(1, '#b4532a');
      g.strokeStyle = 'rgba(255,220,170,.55)'; g.lineWidth = 6 * S; g.beginPath(); g.ellipse(px, py, pr * 1.8, pr * .45, -.3, Math.PI, TAU); g.stroke(); g.fillStyle = pg; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill(); g.beginPath(); g.ellipse(px, py, pr * 1.8, pr * .45, -.3, 0, Math.PI); g.stroke();
      const mx = W * .88, my = H * .14, mr = 26 * S, mg = g.createRadialGradient(mx - mr * .3, my - mr * .3, 1, mx, my, mr); mg.addColorStop(0, '#f2f4ff'); mg.addColorStop(1, '#8c93b8'); g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
    }
    // the play field: a glassy panel, side rails, the danger line and the launcher's stand
    g.save(); rr(g, F.x - 3, F.y - 3, F.w + 6, F.h + 6, 14 * k / 30); g.fillStyle = T.panel; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 2; g.stroke(); g.restore();
    const ry = F.y + DEAD * k;
    g.save(); g.setLineDash([k * .22, k * .16]); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1.5, k * .06); g.beginPath(); g.moveTo(F.x + k * .15, ry); g.lineTo(F.x + F.w - k * .15, ry); g.stroke(); g.restore();
    const dz = g.createLinearGradient(0, ry, 0, F.y + F.h); dz.addColorStop(0, 'rgba(255,80,80,.12)'); dz.addColorStop(1, 'rgba(255,80,80,0)'); g.fillStyle = dz; g.fillRect(F.x, ry, F.w, F.h - (ry - F.y));
    const lx = F.x + LX * k, ly = F.y + LY * k, st = g.createRadialGradient(lx, ly + k * .9, k * .2, lx, ly + k * .9, k * 2.2); st.addColorStop(0, 'rgba(255,255,255,.28)'); st.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = st; g.beginPath(); g.ellipse(lx, ly + k * .95, k * 2.2, k * .5, 0, 0, TAU); g.fill();
  }

  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('nl-NL');
  /* ================= settings, progress ================= */
  const LV = LEVELS, NL = LV.length;
  const WORLDS = [['Oceaan', '🌊'], ['Bos', '🌲'], ['Snoepland', '🍭'], ['Woestijn', '🏜️'], ['IJsland', '❄️'], ['Ruimte', '🪐']];
  const opt = Object.assign({ sound: true, aim: true, cb: false, shake: true }, store.get('bs.settings', {}));
  const saveOpt = () => store.set('bs.settings', opt);
  Sfx.gate('bs', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const sfx = (n, a) => { if (opt.sound) Sfx.play(n, a); };
  let stats = Object.assign({ played: 0, won: 0, lost: 0, stars: {}, best: {}, coins: 50, inv: null, endBest: 0, endGames: 0, three: 0, bigDrop: 0, pops: 0, boosts: 0 }, store.get('bs.stats', {}));
  stats.inv = Object.assign({ bomb: 2, rain: 2, aim: 1, plus: 2 }, stats.inv || {});
  const saveStats = () => store.set('bs.stats', stats);
  const BOOST = { bomb: { n: 'Bom', p: 40, i: '💣' }, rain: { n: 'Regenboog', p: 40, i: '🌈' }, aim: { n: 'Lang mikken', p: 30, i: '🎯' }, plus: { n: '+5 schoten', p: 50, i: '➕' } };
  const unlocked = () => { let n = 1; while (n < NL && stats.stars[n]) n++; return n; };
  const totalStars = () => Object.values(stats.stars).reduce((a, b) => a + b, 0);
  const levelOf = id => LV[id - 1];
  const TIPS = {
    aim: 'Sleep je vinger over het speelveld om te mikken en laat los om te schieten. Drie of meer bellen van dezelfde kleur knallen!',
    swap: 'Tik op de bellenblazer of op de bel in het schelpje om je huidige en je volgende bel te wisselen.',
    bounce: 'Mik schuin tegen de zijkant: de bel stuitert terug. Zo kom je ook op plekken achter andere bellen.',
    stars: 'Bevrijd de sterren! Knal een sterbel, of schiet de bellen weg waar hij aan hangt, dan valt hij naar beneden.',
    top: 'Maak de bovenste rij leeg. Alles wat eronder hangt, valt dan vanzelf mee.',
    bomb: 'Een bom ontploft als je hem raakt of als er bellen naast knallen. Alles eromheen gaat mee!',
    ceil: 'Let op: na een paar schoten zakt het plafond een rij. Komen de bellen over de stippellijn, dan is het voorbij.',
    rain: 'De regenboogbel past bij elke kleur. Maak er een groepje van drie mee!',
    stone: 'Steen heeft geen kleur. Laat er twee keer bellen naast knallen, of laat hem vallen.',
    ice: 'Een bevroren bel ontdooit als er een bel naast knalt. Daarna kun je hem gewoon knallen.',
    chg: 'Kameleonbellen wisselen na elk schot van kleur. Kies je moment!',
    fire: 'Je vuurbal is klaar! Tik op 🔥: hij brandt dwars door alle bellen heen.',
  };
  const GOAL = { clear: ['🫧', 'Ruim alles op'], stars: ['⭐', 'Bevrijd de sterren'], top: ['⬆️', 'Maak de bovenste rij leeg'] };

  /* ================= state ================= */
  let S = null, G = null, Lv = null, LO = null, D = null;
  const scr = $('#bs'), stage = $('#bsStage'), field = $('#bsField'), bgc = $('#bsBg'), bgImg = $('#bsBgImg'), gcv = $('#bsGrid'), lcv = $('#bsLaunch'), fcv = $('#bsFx');
  const gctx = gcv.getContext('2d'), lctx = lcv.getContext('2d'), fctx = fcv.getContext('2d');
  const now = () => performance.now() / 1000;
  const clamp01 = u => u < 0 ? 0 : u > 1 ? 1 : u;
  let DUR = 1;                                                   // animation time scale (tests can speed everything up)
  const snapD = () => ({ g: S.g.map(row => row.map(e => e && Object.assign({}, e))), par: S.par, drop: S.drop });
  const theme = () => !G ? 0 : G.mode === 'end' ? Math.floor((S ? S.pushes : 0) / 12) % 6 : (Lv ? Lv.w : 0);

  /* ================= layout ================= */
  function fit(force) {
    if (current !== 'bs' || !S) return;
    const land = innerWidth > innerHeight * 1.1; scr.classList.toggle('land', land);
    const r = stage.getBoundingClientRect(); if (r.width < 40 || r.height < 40) return;
    const hud = $('#bsHud'), hudH = land ? 0 : hud.offsetHeight + 8;
    const c = Math.min((r.width - 10) / FW, (r.height - hudH - 6) / FH, 64);
    const w = FW * c, h = FH * c, x = Math.round((r.width - w) / 2), y = Math.round(hudH + Math.max(0, (r.height - hudH - h) * (land ? .5 : .7)));
    const dpr = Math.min(+(window.__bsDpr || 2), devicePixelRatio || 1), dprB = Math.min(3, devicePixelRatio || 1);
    const sig = [r.width, r.height, c, x, y, dpr, land, theme()].join();
    if (LO && LO.sig === sig && !force) return;
    LO = { c, x, y, w, h, dpr, dprB, k: c * dpr, land, sig, th: theme(), W: r.width, H: r.height, lan: { x0: LX - 3.6, y0: LY - 2.2, w: 7.2, h: FH - (LY - 2.2) } };
    Object.assign(field.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    hud.style.width = land ? Math.max(120, x - 18) + 'px' : '';
    gcv.width = Math.round(w * dpr); gcv.height = Math.round((FH + 2) * c * dpr); Object.assign(gcv.style, { top: (-2 * c) + 'px', width: w + 'px', height: (FH + 2) * c + 'px' });
    fcv.width = Math.round(w * dpr); fcv.height = Math.round(h * dpr); Object.assign(fcv.style, { width: w + 'px', height: h + 'px' });
    const L0 = LO.lan; lcv.width = Math.round(L0.w * c * dpr); lcv.height = Math.round(L0.h * c * dpr);
    Object.assign(lcv.style, { left: L0.x0 * c + 'px', top: L0.y0 * c + 'px', width: L0.w * c + 'px', height: L0.h * c + 'px' });
    drawBg(); redrawGrid(); lanDirty = true; prevBox = null; fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, fcv.width, fcv.height); requestDraw();
  }
  let bgGen = 0, bgUrl = '';
  function drawBg() {
    const W = LO.W, H = LO.H, k = LO.dprB, my = ++bgGen;
    bgc.width = Math.round(W * k); bgc.height = Math.round(H * k);
    const g = bgc.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0);
    drawScene(g, W, H, theme(), { x: LO.x, y: LO.y, w: LO.w, h: LO.h, k: LO.c });
    bgc.style.display = ''; bgImg.style.visibility = 'hidden';
    // the finished scenery becomes a plain image: cheaper for the compositor than a canvas
    if (bgc.toBlob && !window.__bsNoBgImg) bgc.toBlob(b => {
      if (!b || my !== bgGen) return; const url = URL.createObjectURL(b);
      bgImg.onload = () => { if (my !== bgGen) return; bgImg.style.visibility = ''; bgc.style.display = 'none'; if (bgUrl) URL.revokeObjectURL(bgUrl); bgUrl = url; };
      bgImg.src = url;
    });
  }
  function redrawGrid() {
    if (!LO || !D) return;
    const g = gctx, k = LO.k, oy = 2 * k; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, gcv.width, gcv.height);
    const ceil = S && (S.ceil || G.mode === 'end'), cyp = oy + D.drop * RH * k;
    const pg = g.createLinearGradient(0, 0, 0, cyp + .2 * k); pg.addColorStop(0, '#2b3247'); pg.addColorStop(1, '#4d5876');
    g.fillStyle = pg; g.fillRect(0, 0, gcv.width, cyp + .1 * k);
    if (ceil) { g.save(); g.beginPath(); g.rect(0, cyp - .16 * k, gcv.width, .26 * k); g.clip(); g.fillStyle = '#ffcf3a'; g.fillRect(0, cyp - .16 * k, gcv.width, .26 * k); g.fillStyle = '#2b3247'; for (let x = -k; x < gcv.width; x += .5 * k) { g.beginPath(); g.moveTo(x, cyp + .1 * k); g.lineTo(x + .25 * k, cyp - .16 * k); g.lineTo(x + .5 * k, cyp - .16 * k); g.lineTo(x + .25 * k, cyp + .1 * k); g.fill(); } g.restore(); }
    else { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, cyp + .02 * k, gcv.width, .06 * k); }
    if (S && S.goal === 'top' && G.mode !== 'end') { g.fillStyle = '#ffd84a'; g.fillRect(0, cyp + .04 * k, gcv.width, .07 * k); }
    for (let r = 0; r < ROWS; r++) { const row = D.g[r], n = rowLen(D, r), y = cyOf(D, r) * k + oy; for (let c = 0; c < n; c++) { const e = row[c]; if (!e) continue; const s = bubbleSprite(e, k, opt.cb); g.drawImage(s.cv, Math.round(cxOf(D, r, c) * k - s.a), Math.round(y - s.a)); } }
  }

  /* ================= the launcher (own little canvas, redrawn only when the aim or the bubbles change) ================= */
  let lanDirty = true, lastAng = Math.PI / 2, lan = null, mood = '';
  const DISH = [-2.3, .42];
  function drawLauncher(t) {
    lanDirty = false; if (!LO || !S) return;
    const g = lctx, k = LO.k, L0 = LO.lan; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, lcv.width, lcv.height);
    g.setTransform(k, 0, 0, k, (LX - L0.x0) * k, (LY - L0.y0) * k);
    const ang = aim && aim.ok ? aim.a : lastAng;
    g.save(); g.translate(DISH[0], DISH[1]); dish(g); g.restore();
    drawCritter(g, ang, ang, mood);
    const put = (e, x, y, sc) => { if (!e) return; const s = bubbleSprite(e.k === 'n' ? { k: K_N, c: e.c } : { k: e.k, c: e.c }, k, opt.cb), z = s.w / k * sc; g.drawImage(s.cv, x - z / 2, y - z / 2, z, z); };
    const mz = [Math.cos(ang) * MUZ, -Math.sin(ang) * MUZ], dp = [DISH[0] + .02, DISH[1] - .2];
    const u = lan ? clamp01((t - lan.t0) / Math.max(.001, lan.t1 - lan.t0)) : 1, e = u * u * (3 - 2 * u);
    if (lan && lan.kind === 'swap') {                            // the two bubbles trade places along an arc
      const arc = (a, b, s, h) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s - Math.sin(s * Math.PI) * h];
      const p1 = arc(dp, mz, e, .8), p2 = arc(mz, dp, e, -.5);
      put(S.nxt, p2[0], p2[1], .78 + .22 * (1 - e)); put(S.cur, p1[0], p1[1], .78 + .22 * e);
    } else if (lan && lan.kind === 'load') {                     // the next bubble hops into the tube, a new one pops up
      const p = [dp[0] + (mz[0] - dp[0]) * e, dp[1] + (mz[1] - dp[1]) * e - Math.sin(e * Math.PI) * .7];
      put(S.cur, p[0], p[1], .78 + .22 * e); put(S.nxt, dp[0], dp[1], .78 * e);
    } else { put(S.cur, mz[0], mz[1], 1); put(S.nxt, dp[0], dp[1], .78); }
    if (S.cur && S.cur.k === 'fire') { g.fillStyle = 'rgba(255,170,40,.25)'; g.beginPath(); g.arc(mz[0], mz[1], .75, 0, TAU); g.fill(); }
    // right-hand badge: shots left / shots until the ceiling drops / misses until a new row
    g.save(); g.translate(2.3, .3);
    let big = '', small = '', dots = null;
    if (G && G.mode === 'end') { dots = [S.missLeft, S.missN]; small = 'nieuwe rij'; }
    else if (S.ceil) { dots = [S.ceilIn, S.ceil]; small = 'plafond'; }
    else if (S.lim) { big = String(Math.max(0, S.lim + S.extra - S.shots)); small = 'schoten'; }
    const lowShots = !dots && S.lim && S.lim + S.extra - S.shots <= 5;
    const bgr = g.createRadialGradient(-.15, -.2, .05, 0, 0, .62); bgr.addColorStop(0, lowShots ? '#ff9a8a' : '#ffffff'); bgr.addColorStop(1, lowShots ? '#d8343c' : '#c9d7ee');
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(.04, .58, .5, .1, 0, 0, TAU); g.fill();
    g.fillStyle = bgr; g.beginPath(); g.arc(0, 0, .55, 0, TAU); g.fill(); g.strokeStyle = 'rgba(20,30,60,.35)'; g.lineWidth = .04; g.stroke();
    g.setTransform(1, 0, 0, 1, (LX - L0.x0 + 2.3) * k, (LY - L0.y0 + .3) * k);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (dots) {
      const n = Math.min(10, dots[1]), left = Math.max(0, dots[0]), rad = .085 * k, gap = .2 * k, cols = Math.min(n, 5), rows = Math.ceil(n / 5);
      for (let i = 0; i < n; i++) { const cx = ((i % 5) - (cols - 1) / 2) * gap, cy = (Math.floor(i / 5) - (rows - 1) / 2) * gap - .08 * k; g.fillStyle = i < left ? (left <= 1 ? '#e8343c' : '#2f7cf6') : 'rgba(30,40,70,.22)'; g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.fill(); }
      g.font = `800 ${(.15 * k).toFixed(1)}px ${FONT}`; g.fillStyle = '#1d2a44'; g.fillText(small, 0, .3 * k);
    } else if (big) {
      g.font = `900 ${(.42 * k).toFixed(1)}px ${FONT}`; g.fillStyle = lowShots ? '#fff' : '#17233d'; g.fillText(big, 0, -.06 * k);
      g.font = `800 ${(.14 * k).toFixed(1)}px ${FONT}`; g.fillStyle = lowShots ? '#fff' : '#3a4a6a'; g.fillText(small, 0, .3 * k);
    }
    g.restore();
  }

  /* ================= the visual timeline =================
     Rules run instantly (core.js). What you see follows: the shot flies along its traced path, then at the moment of impact
     the drawn grid D is replaced by a copy of the logic grid, and the bubbles that popped or fell become short-lived
     effects. Every restore (resume, restart, level change) throws all of this away and rebuilds D from the logic state. */
  let sched = [], schedSorted = true, fx = [], flight = null, slide = null, pending = null, readyAt = 0, doneAt = 0, token = 0;
  let raf = 0, frames = [], tapAt = 0, tapLat = [], aim = null, aimDirty = false, prevBox = null, box = null, staticAim = false;
  const at = (t, fn) => { if (!Number.isFinite(t)) t = now(); sched.push([t, fn]); schedSorted = false; if (t > doneAt) doneAt = t; requestDraw(); };   // a bad time must never block the timeline
  const until = t => { if (Number.isFinite(t) && t > doneAt) doneAt = t; };
  function rebuildVisual() {
    token++; sched = []; fx = []; flight = null; slide = null; lan = null; pending = null; readyAt = 0; doneAt = now(); mood = '';
    D = S ? snapD() : null; gcv.style.transform = '';
    if (LO) { fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, fcv.width, fcv.height); } prevBox = null;
    redrawGrid(); lanDirty = true; hud(); renderTools(); requestDraw();
  }
  function flushSched() { if (!sched.length) return; sched.sort((a, b) => a[0] - b[0]); const l = sched; sched = []; for (const [, f] of l) { try { f(); } catch (e) { console.error(e); } } }
  function requestDraw() { if (!raf) raf = requestAnimationFrame(frame); }
  const canShoot = () => !!(S && G && !G.preview && !G.over && !S.won && !S.lost && current === 'bs' && !anyModal() && now() >= readyAt);
  function busy(t) { return !!(sched.length || fx.length || flight || slide || lan || pending || aimDirty || lanDirty || (prevBox && !staticAim)) || t < readyAt; }
  function frame(ts) {
    raf = 0; frames.push(ts); if (frames.length > 900) frames.splice(0, 450);
    if (current !== 'bs' || !S || !LO) return;
    const t = now();
    if (sched.length) { if (!schedSorted) { sched.sort((a, b) => a[0] - b[0]); schedSorted = true; } let n = 0; while (sched.length && sched[0][0] <= t && n++ < 400) { const f = sched.shift()[1]; try { f(); } catch (e) { console.error(e); } } }
    if (pending) { if (canShoot()) { const a = pending.a; pending = null; fire(a); } else if (t > pending.until || !S || S.won || S.lost || G.over || anyModal()) pending = null; }
    if (slide) {
      const u = clamp01((t - slide.t0) / Math.max(.001, slide.t1 - slide.t0)), e = 1 - Math.pow(1 - u, 3);
      const off = slide.from * (1 - e); gcv.style.transform = u >= 1 ? '' : `translateY(${(off * LO.c).toFixed(1)}px)`;
      if (u >= 1) slide = null;
    }
    if (lan && t >= lan.t1) { lan = null; lanDirty = true; }
    if (lan || lanDirty) drawLauncher(t);
    drawFx(t);
    if (tapAt) { tapLat.push(performance.now() - tapAt); if (tapLat.length > 80) tapLat.shift(); tapAt = 0; }
    if (busy(t)) requestDraw();
  }
  /* ---------- the effects layer: only the area drawn last frame is cleared ---------- */
  const mark = (x, y, w, h) => { if (!box) box = [x, y, x + w, y + h]; else { if (x < box[0]) box[0] = x; if (y < box[1]) box[1] = y; if (x + w > box[2]) box[2] = x + w; if (y + h > box[3]) box[3] = y + h; } };
  function spr(s, x, y, sc = 1, al = 1) {
    const k = LO.k, w = s.w * sc, h = s.h * sc, px = x * k - s.a * sc, py = y * k - (s.b != null ? s.b : s.a) * sc;
    if (al < 1) fctx.globalAlpha = Math.max(0, al); fctx.drawImage(s.cv, px, py, w, h); if (al < 1) fctx.globalAlpha = 1;
    mark(px, py, w, h);
  }
  function pathAt(P, s) { const c = P.cum; let i = 1; while (i < c.length - 1 && c[i] < s) i++; const a = P.pts[i - 1], b = P.pts[i], d = c[i] - c[i - 1] || 1, u = clamp01((s - c[i - 1]) / d); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; }
  const withCum = tr => { const cum = [0]; for (let i = 1; i < tr.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(tr.pts[i][0] - tr.pts[i - 1][0], tr.pts[i][1] - tr.pts[i - 1][1])); return { pts: tr.pts, cum, len: cum[cum.length - 1] }; };
  let aimCache = null;
  function drawAim() {
    if (!(opt.aim || G.longAim)) return;
    const shot = S.cur || { k: 'n', c: 0 }, fire = shot.k === 'fire', key = aim.a.toFixed(5) + (fire ? 'f' : '') + S.shots + (G.longAim ? 'L' : '') + S.drop + S.par;
    if (!aimCache || aimCache.key !== key) { const tr = C_trace(S, aim.a, fire), P = withCum(tr); aimCache = { key, tr, P, cell: fire ? null : C_snap(S, tr.x, tr.y) }; }
    const { tr, P } = aimCache, long = G.longAim;
    let maxS = P.len; if (!long && tr.bounces.length) maxS = Math.min(P.len, tr.bounces[0] + 3.2);
    const dot = dotSprite(fire ? 'fire' : shot.k === 'n' ? shot.c : 'w', LO.k);
    let i = 0; for (let s = MUZ + .45; s < maxS - .25; s += .5, i++) { const [x, y] = pathAt(P, s); spr(dot, x, y, 1, Math.max(.3, 1 - (s - MUZ) / (maxS + 4))); }
    if (long && aimCache.cell) { const [r, c] = aimCache.cell, sp = bubbleSprite(shot.k === 'n' ? { k: K_N, c: shot.c } : { k: shot.k, c: shot.c }, LO.k, opt.cb); spr(sp, cxOf(S, r, c), cyOf(S, r), 1, .45); }
  }
  const GRAV = 34;
  function drawFx(t) {
    const g = fctx; g.setTransform(1, 0, 0, 1, 0, 0);
    if (prevBox) g.clearRect(prevBox[0] - 2, prevBox[1] - 2, prevBox[2] - prevBox[0] + 4, prevBox[3] - prevBox[1] + 4);
    box = null;
    const aimOn = !!(aim && aim.ok && !G.over && (opt.aim || G.longAim));
    if (aimOn) drawAim();
    const k = LO.k;
    for (let i = 0; i < fx.length; i++) {
      const f = fx[i]; let alive = true;
      if (t < f.t0) { if (f.ty === 'pop' || f.ty === 'fall') spr(bubbleSprite(f.e, k, opt.cb), f.x, f.y); continue; }
      const dt = t - f.t0;
      switch (f.ty) {
        case 'pop': {                                            // swell, fade, burst into droplets
          if (!f.burst) { f.burst = true; burst(f); }
          const u = dt / (.13 * DUR); if (u >= 1) { alive = false; break; }
          spr(bubbleSprite(f.e, k, opt.cb), f.x, f.y, 1 + .35 * u, 1 - u); break;
        }
        case 'fall': {
          const y = f.y + f.vy * dt + .5 * GRAV * dt * dt / (DUR * DUR), x = f.x + f.vx * dt;
          if (y > FH - .45) { alive = false; landed(f, x); break; }
          spr(bubbleSprite(f.e, k, opt.cb), x, y); break;
        }
        case 'part': {
          const u = dt / f.life; if (u >= 1) { alive = false; break; }
          spr(f.s, f.x + f.vx * dt, f.y + f.vy * dt + .5 * f.g * dt * dt, f.sc * (1 - .5 * u), 1 - u * u); break;
        }
        case 'ring': {
          const u = dt / f.life; if (u >= 1) { alive = false; break; }
          const r = (f.r0 + (f.r1 - f.r0) * (1 - (1 - u) * (1 - u))) * k, x = f.x * k, y = f.y * k;
          g.globalAlpha = (1 - u) * (f.a || .9); g.strokeStyle = f.col; g.lineWidth = Math.max(1, f.w * k * (1 - u * .6)); g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.globalAlpha = 1;
          mark(x - r - g.lineWidth, y - r - g.lineWidth, 2 * (r + g.lineWidth), 2 * (r + g.lineWidth)); break;
        }
        case 'flash': {
          const u = dt / f.life; if (u >= 1) { alive = false; break; }
          const r = f.r * k * (.6 + .6 * u), x = f.x * k, y = f.y * k, gr = g.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, `rgba(255,250,210,${(1 - u).toFixed(3)})`); gr.addColorStop(.5, `rgba(255,170,60,${(.7 * (1 - u)).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,90,20,0)');
          g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); mark(x - r, y - r, 2 * r, 2 * r); break;
        }
        case 'text': {
          const u = dt / f.life; if (u >= 1) { alive = false; break; }
          spr(f.s, f.x, f.y - .9 * (1 - (1 - u) * (1 - u)), u < .15 ? .6 + u / .15 * .4 : 1, u > .65 ? (1 - u) / .35 : 1); break;
        }
      }
      if (!alive) fx.splice(i--, 1);
    }
    if (flight) drawFlight(t);
    staticAim = aimOn && !fx.length && !flight;
    prevBox = box; aimDirty = false;
  }
  function drawFlight(t) {
    const F = flight, u = (t - F.t0) / F.dur;
    if (u >= 1) { flight = null; return; }
    const s = F.s0 + (F.P.len - F.s0) * Math.max(0, u), [x, y] = pathAt(F.P, s), k = LO.k;
    if (F.fire) {                                                // a trail of embers
      if (Math.random() < .9) fx.push({ ty: 'part', x, y, vx: (Math.random() - .5) * 1.2, vy: (Math.random() - .2) * 1.2, g: -2, t0: t, life: .35, s: dropSprite('fire', k), sc: 1.6 + Math.random() });
      spr(bubbleSprite({ k: 'fire', c: 0 }, k, false), x, y, 1.15);
    } else spr(bubbleSprite(F.e.k === 'n' ? { k: K_N, c: F.e.c } : { k: F.e.k, c: F.e.c }, k, opt.cb), x, y);
  }
  function burst(f) {                                            // a pop: a ring and a spray of droplets in the bubble's colour
    const t = now(), k = LO.k, col = f.e.k === K_STONE ? 'stone' : f.e.k === K_BOMB || f.e.k === K_RAIN ? 'spark' : f.how === 'burn' ? 'fire' : f.e.c;
    const n = f.how === 'boom' ? 4 : 6;
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 2.2 + Math.random() * 2.6; fx.push({ ty: 'part', x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, g: 12, t0: t, life: .38 + Math.random() * .2, s: dropSprite(col, k), sc: .8 + Math.random() * .6 }); }
    fx.push({ ty: 'ring', x: f.x, y: f.y, t0: t, life: .28, r0: .3, r1: .75, col: f.e.k === K_STONE ? '#d8d0c4' : PAL[f.e.c] ? PAL[f.e.c].l : '#fff', w: .07 });
    if (f.e.k === K_STAR) { fx.push({ ty: 'text', x: f.x, y: f.y, t0: t, life: .9, s: textSprite('⭐', '#ffd84a', .7, k) }); for (let i = 0; i < 6; i++) { const a = Math.random() * TAU; fx.push({ ty: 'part', x: f.x, y: f.y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 - 2, g: 6, t0: t, life: .6, s: dropSprite('spark', k), sc: 1.4 }); } }
  }
  let landN = 0, landPts = 0, landAt = 0;
  function landed(f, x) {
    const t = now(), k = LO.k;
    for (let i = 0; i < 3; i++) fx.push({ ty: 'part', x, y: FH - .45, vx: (Math.random() - .5) * 2.5, vy: -2 - Math.random() * 2, g: 14, t0: t, life: .4, s: dropSprite(f.e.c >= 0 ? f.e.c : 'spark', k), sc: .8 });
    if (f.e.k === K_STAR) fx.push({ ty: 'text', x, y: FH - 1, t0: t, life: .9, s: textSprite('⭐', '#ffd84a', .7, k) });
    if (f.pts && !f.shown) { f.shown = true; fx.push({ ty: 'text', x: Math.max(1.2, Math.min(FW - 1.2, x)), y: FH - 1.4, t0: t, life: 1.1, s: textSprite('+' + fmt(f.pts), '#7dffb0', .55, k) }); }
    if (f.snd) sfx('bsLand');
    void landN; void landPts; void landAt;
  }

  /* ================= shooting ================= */
  function syncD() { flushSched(); flight = null; if (S) { D = snapD(); redrawGrid(); } }
  function fire(a) {
    if (!S || !G || G.preview || G.over || S.won || S.lost) return false;
    if (sched.length || flight) syncD();                        // catch the drawing up first: D must equal the logic grid
    hideTip();
    const shotE = S.cur, isFire = shotE.k === 'fire', t0 = now(), prevNxt = S.nxt;
    const ev = C_shoot(S, a), tr = ev.tr, P = withCum(tr), s0 = Math.min(MUZ, P.len), V = Math.max(isFire ? 24 : 30, (P.len - s0) / 1.1);   // long bank shots fly faster
    const dur = Math.max(.04, (P.len - s0) / V) * DUR, t1 = t0 + dur, tok = token;
    flight = { P, s0, t0, dur, e: shotE, fire: isFire };
    lastAng = a; mood = '';
    for (const b of tr.bounces) if (b > s0) at(t0 + (b - s0) / V * DUR, () => { sfx('bsWall'); });
    lan = { kind: 'load', t0, t1: t0 + .22 * DUR }; lanDirty = true; void prevNxt;
    sfx(isFire ? 'bsFire' : 'bsShoot'); if (isFire) shake(.4);
    const tPop = x => isFire ? t0 + Math.max(0, (x.d + P.len - s0) / V) * DUR : t1 + x.d * DUR;
    let tEnd = t1; for (const x of ev.removed) tEnd = Math.max(tEnd, tPop(x));
    const tFall = tEnd + .06 * DUR, rows = ev.push || (ev.drop ? 1 : 0), tSlide = tEnd + .25 * DUR;
    readyAt = rows ? tSlide + .38 * DUR : t1 + .01; until(readyAt);
    const plan = { ev, t0, t1, tEnd, tFall, tSlide, rows, tPop, tok };
    if (isFire) impact(plan); else at(t1, () => { if (tok === token) impact(plan); });
    if (S.won || S.lost) record();
    hud(); renderTools(); save(); requestDraw();
    return true;
  }
  function impact(p) {
    const { ev, t1, tEnd, tFall, tSlide, rows, tPop } = p, k = LO.k, t = now();
    D = snapD(); redrawGrid();
    if (rows) { slide = { t0: tSlide, t1: tSlide + .38 * DUR, from: -rows * RH }; gcv.style.transform = `translateY(${(-rows * RH * LO.c).toFixed(1)}px)`; at(tSlide, () => sfx('bsPush')); }
    // popping bubbles (with rising notes), exploding bombs, thawing ice, cracking stone
    const pops = ev.removed.slice().sort((a, b) => tPop(a) - tPop(b)), np = pops.length, base = Math.min(3, Math.max(0, ev.streak - 1));
    for (const x of pops) fx.push({ ty: 'pop', x: x.x, y: x.y, e: x.e, t0: tPop(x), how: x.how });
    const ns = Math.min(7, np);
    for (let j = 0; j < ns; j++) { const x = pops[Math.floor(j * np / ns)], how = x.how; at(tPop(x), () => { if (how === 'pop' || how === 'burn') sfx('bsPop' + Math.min(8, 1 + base + j)); }); }
    for (const [bx, by, tb] of ev.boom) { const tt = (ev.shot.k === 'fire' ? tPop({ d: tb }) : t1 + tb * DUR); at(tt, () => { fx.push({ ty: 'flash', x: bx, y: by, t0: now(), life: .45, r: 2.4 }); fx.push({ ty: 'ring', x: bx, y: by, t0: now(), life: .4, r0: .4, r1: 2.1, col: '#ffd27a', w: .14 }); sfx('bsBomb'); shake(.8); vibrate(25); }); }
    for (const [x, y, d] of ev.thaw) at(t1 + d * DUR, () => { const tt = now(); for (let i = 0; i < 6; i++) { const a = Math.random() * TAU; fx.push({ ty: 'part', x, y, vx: Math.cos(a) * 2.6, vy: Math.sin(a) * 2.6 - 1, g: 10, t0: tt, life: .45, s: dropSprite('ice', k), sc: 1.3 }); } fx.push({ ty: 'ring', x, y, t0: tt, life: .3, r0: .3, r1: .7, col: '#e8f8ff', w: .08 }); sfx('bsIce'); });
    for (const [x, y, d] of ev.crack) at(t1 + d * DUR, () => { const tt = now(); for (let i = 0; i < 4; i++) { const a = Math.random() * TAU; fx.push({ ty: 'part', x, y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2 - 1, g: 14, t0: tt, life: .4, s: dropSprite('stone', k), sc: 1.2 }); } sfx('bsStone'); });
    if (ev.removed.some(x => x.e.k === K_STONE)) at(tEnd, () => sfx('bsStone'));
    if (ev.chg.length) at(t1 + .12 * DUR, () => { const tt = now(); for (const [x, y] of ev.chg) fx.push({ ty: 'ring', x, y, t0: tt, life: .35, r0: .2, r1: .62, col: '#ffffff', w: .07 }); sfx('bsChg'); });
    if (ev.placed && !ev.removed.length) { const [x, y] = ev.cxy; fx.push({ ty: 'ring', x, y, t0: t, life: .22, r0: .35, r1: .62, col: 'rgba(255,255,255,.8)', w: .06 }); sfx('bsStick'); }
    if (ev.shot.k === 'rain' && ev.removed.length) at(t1, () => sfx('bsRain'));
    // falling bubbles: they drop with gravity and splash at the bottom
    const nf = ev.falls.length;
    ev.falls.forEach((f, i) => fx.push({ ty: 'fall', x: f.x, y: f.y, e: f.e, t0: tFall + Math.random() * .05 * DUR, vx: (Math.random() - .5) * 1.6 / DUR, vy: (-1.2 - Math.random() * 2) / DUR, pts: i === nf - 1 ? ev.fallPts : 0, snd: i === 0 }));
    if (nf) { at(tFall + .1 * DUR, () => sfx('bsFall')); until(tFall + 1.3 * DUR); }
    // score popups, combo text, stars
    if (ev.pts && np) { let cx = 0, cy = 0; for (const x of pops) { cx += x.x; cy += x.y; } at(tEnd, () => fx.push({ ty: 'text', x: cx / np, y: cy / np, t0: now(), life: 1, s: textSprite('+' + fmt(ev.pts), '#ffffff', .55, LO.k) })); }
    if (ev.stars) at(tEnd + .05, () => sfx('bsStar'));
    if (ev.streak >= 2 && np) at(tEnd, () => combo(ev.streak >= 5 ? `Super combo ×${ev.streak}!` : `Combo ×${ev.streak}!`, ev.streak));
    if (nf >= 8) at(tFall + .2 * DUR, () => { combo(nf >= 15 ? 'Lawine!' : 'Wat een val!', 4); shake(.5); });
    if (ev.bonus) at(tEnd, () => combo('Leeg! +1.000', 5));
    stats.pops += np; if (nf > stats.bigDrop) stats.bigDrop = nf;
    until(tEnd + .5 * DUR);
    if (S.fire >= 1 && !G.fireReady) { G.fireReady = true; at(tEnd + .2, () => { sfx('bsFireOn'); if (!G.fireTold) { G.fireTold = true; showTip('fire'); } renderTools(); }); }
    if (S.won || S.lost) showResult(tFall + (nf ? .8 : .15) * DUR);
    hud(); renderTools();
    if (G.mode === 'end' && theme() !== LO.th) { LO.th = theme(); at(tSlide + .4, () => { if (LO) { LO.sig = ''; fit(true); } }); }
  }
  function combo(txt, lvl) { const el = $('#bsCombo'); el.textContent = txt; el.className = ''; void el.offsetWidth; el.className = 'show l' + Math.min(5, lvl); if (lvl >= 3) sfx('bsCombo'); }
  function shake(a) { if (!opt.shake) return; const el = field; el.classList.remove('bs-shake', 'bs-shake2'); void el.offsetWidth; el.classList.add(a > .6 ? 'bs-shake2' : 'bs-shake'); clearTimeout(shakeT); shakeT = setTimeout(() => el.classList.remove('bs-shake', 'bs-shake2'), 450); }
  let shakeT = 0;
  function requestShot(a) {
    if (!S || !G || G.preview || G.over || S.won || S.lost) return;
    if (canShoot()) fire(a); else { pending = { a, until: now() + 1.6 }; requestDraw(); }
  }
  function doSwap() {
    if (!S || !G || G.preview || G.over || S.won || S.lost) return;
    if (!C_swap(S)) { if (S.cur && S.cur.k !== 'n') toast(S.cur.k === 'fire' ? 'Schiet eerst je vuurbal af.' : 'Schiet eerst je ' + (S.cur.k === 'bomb' ? 'bom' : 'regenboogbel') + ' af.'); return; }
    hideTip(); sfx('bsSwap'); lan = { kind: 'swap', t0: now(), t1: now() + .2 * DUR }; lanDirty = true; save(); requestDraw();
  }

  /* ================= end of a game ================= */
  function record() {                                           // the result is booked the moment the deciding shot is fired
    G.over = true; store.del('bs.save');
    if (G.mode === 'end') {
      const sc = S.score, rec = sc > (stats.endBest || 0); stats.endGames++; if (rec) stats.endBest = sc;
      const coins = Math.min(60, Math.floor(sc / 400)); stats.coins += coins; G.res = { sc, rec, coins };
    } else if (S.won) {
      const st = starsFor(Lv, S.shots), id = G.id, prev = stats.stars[id] || 0;
      const coins = prev ? (st > prev ? (st - prev) * 5 : 2) : 10 + st * 5;
      if (st > prev) stats.stars[id] = st; if (st === 3 && prev < 3) stats.three = (stats.three || 0) + 1;
      const rec = S.score > (stats.best[id] || 0); if (rec) stats.best[id] = S.score;
      stats.won++; stats.coins += coins; G.res = { st, coins, rec };
    } else stats.lost++;
    saveStats();
  }
  function showResult(tDone) {                                     // ... and shown once the bubbles have settled
    const game = G, free = fn => () => { if (G !== game || current !== 'bs') return; if (anyModal()) { setTimeout(free(fn), 300); return; } fn(); };   // never on top of the pause menu
    if (G.mode === 'end') {
      at(tDone + .2, () => { if (G !== game || current !== 'bs') return; sfx('bsLose'); vibrate(40); mood = 'wow'; lanDirty = true; });
      at(tDone + 1, free(openEndless));
    } else if (S.won) {
      at(tDone + .15, () => { if (G !== game || current !== 'bs') return; confetti(); sfx('bsWin'); vibrate(30); mood = 'wow'; lanDirty = true; requestDraw(); });
      at(tDone + 1, free(openEnd));
    } else {
      at(tDone + .3, () => { if (G !== game || current !== 'bs') return; sfx('bsLose'); vibrate(40); });
      at(tDone + .8, free(openLose));
    }
  }
  function openEnd() {
    const { st, coins, rec } = G.res, nx = G.id + 1;
    $('#bsEndStars').innerHTML = [1, 2, 3].map(k => `<span class="${k <= st ? 'on' : ''}" style="animation-delay:${.15 + k * .2}s">★</span>`).join('');
    $('#bsEndTitle').textContent = G.id === NL ? 'Alle levels gehaald!' : ['Gelukt!', 'Prachtig geschoten!', 'Knallend gedaan!'][G.id % 3];
    const left = S.lim ? Math.max(0, S.lim + S.extra - S.shots) : 0;
    $('#bsEndText').innerHTML = `Score: <b>${fmt(S.score)}</b>${rec ? ' · <b>record!</b>' : ''}<br>${S.shots} schoten${left ? ` · ${left} over (+${fmt(S.bonus)})` : ''}<br><span class="bs-coin">🪙 +${coins}</span>`
      + (st < 3 ? `<br><small>3 sterren: in ${Lv.st[0]} schoten of minder.</small>` : '');
    $('#bsEndNext').hidden = nx > NL; $('#bsEndRetry').hidden = false; $('#bsEndMenu').textContent = 'Levels';
    $('#bsEndNext').textContent = 'Volgende ▶';
    openModal('bsEndModal');
  }
  function openEndless() {
    const { sc, rec, coins } = G.res;
    $('#bsEndStars').innerHTML = `<div class="bs-trophy">${rec ? '🏆' : '🫧'}</div>`;
    $('#bsEndTitle').textContent = rec ? 'Nieuw record!' : 'De bellen zijn over de lijn';
    $('#bsEndText').innerHTML = `Score: <b>${fmt(sc)}</b><br>Record: <b>${fmt(stats.endBest)}</b> · ${S.pushes} nieuwe rijen<br><span class="bs-coin">🪙 +${coins}</span>`;
    $('#bsEndNext').hidden = false; $('#bsEndNext').textContent = 'Opnieuw ▶'; $('#bsEndRetry').hidden = true; $('#bsEndMenu').textContent = 'Menu';
    openModal('bsEndModal');
  }
  function openLose() {
    if (!S || !S.lost) return;
    const shots = S.why === 'shots';
    $('#bsLoseTitle').textContent = shots ? 'Geen schoten meer' : 'Over de lijn!';
    $('#bsLoseText').innerHTML = shots ? `Nog net niet gelukt. Met <b>+5 schoten</b> kun je verder, of probeer het opnieuw. <small>(🪙 ${stats.coins})</small>` : 'De bellen zijn over de stippellijn gekomen. Probeer het nog eens!';
    const b = $('#bsLosePlus'); b.hidden = !shots;
    b.innerHTML = stats.inv.plus > 0 ? `➕ +5 schoten (${stats.inv.plus})` : `➕ +5 schoten · 🪙${BOOST.plus.p}`;
    b.disabled = stats.inv.plus <= 0 && stats.coins < BOOST.plus.p;
    openModal('bsLoseEndModal');
  }
  function confetti() {
    const box = $('#bsConf'), cols = PAL.map(p => p.b); box.innerHTML = '';
    for (let i = 0; i < 70; i++) { const e = document.createElement('i'), w = 6 + Math.random() * 6; e.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;width:${w.toFixed(0)}px;height:${(w * .55).toFixed(0)}px;background:${cols[i % cols.length]};animation-duration:${(2.2 + Math.random() * 1.4).toFixed(2)}s;animation-delay:${(Math.random() * .6).toFixed(2)}s;--dx:${((Math.random() - .5) * 80).toFixed(0)}px;--r:${(360 + Math.random() * 720).toFixed(0)}deg`; box.appendChild(e); }
    clearTimeout(confT); confT = setTimeout(() => { box.innerHTML = ''; }, 4500);
  }
  let confT = 0;

  /* ================= boosters ================= */
  function ensure(k) {
    if (stats.inv[k] > 0) return true;
    const p = BOOST[k].p;
    if (stats.coins >= p) { stats.coins -= p; stats.inv[k]++; saveStats(); toast(`${BOOST[k].n} gekocht voor 🪙 ${p}`); return true; }
    toast(`Je hebt geen ${BOOST[k].n} meer. Speel levels om munten 🪙 te verdienen (kost ${p}).`, 3200); return false;
  }
  function consume(k) { stats.inv[k]--; stats.boosts++; G.boosts++; saveStats(); renderTools(); save(); }
  function useBoost(k) {
    if (!S || !G || G.preview || G.over || S.won || S.lost) return false;
    hideTip();
    if (k === 'fire') {
      if (S.cur && S.cur.k === 'fire') { toast('Je vuurbal ligt al klaar. Mik en schiet!'); return false; }
      if (S.fire < 1) { toast(`Knal veel bellen achter elkaar om de vuurbal op te laden (${Math.round(S.fire * 100)}%).`); return false; }
      if (S.cur && S.cur.k !== 'n') { toast('Schiet eerst je ' + (S.cur.k === 'bomb' ? 'bom' : 'regenboogbel') + ' af.'); return false; }
      C_arm(S, 'fire'); S.fire = 0; G.fireReady = false; sfx('bsFireOn'); lan = { kind: 'load', t0: now(), t1: now() + .2 * DUR }; lanDirty = true; renderTools(); save(); requestDraw(); return true;
    }
    if (k === 'bomb' || k === 'rain') {
      if (S.cur && S.cur.k !== 'n') { toast(S.cur.k === k ? 'Die ligt al klaar. Mik en schiet!' : 'Schiet eerst je ' + (S.cur.k === 'fire' ? 'vuurbal' : S.cur.k === 'bomb' ? 'bom' : 'regenboogbel') + ' af.'); return false; }
      if (!ensure(k)) return false;
      C_arm(S, k); consume(k); sfx('bsBoost'); lan = { kind: 'load', t0: now(), t1: now() + .2 * DUR }; lanDirty = true; requestDraw(); return true;
    }
    if (k === 'aim') {
      if (G.longAim) { toast('Lang mikken staat al aan voor dit spel.'); return false; }
      if (!ensure('aim')) return false;
      G.longAim = true; consume('aim'); sfx('bsBoost'); toast('Lang mikken: je ziet de hele baan en waar je bel blijft plakken.'); return true;
    }
    if (k === 'plus') {
      if (!ensure('plus')) return false;
      if (G.mode === 'end') S.missLeft += 5; else if (S.ceil) S.ceilIn += 5; else S.extra += 5;
      consume('plus'); sfx('bsBoost'); lanDirty = true; requestDraw();
      toast(G.mode === 'end' ? 'De volgende rij komt 5 missers later.' : S.ceil ? 'Het plafond wacht 5 schoten langer.' : '5 extra schoten!'); hud(); return true;
    }
    return false;
  }
  let toastT = 0;
  function toast(t, ms = 2400) { const el = $('#bsToast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }
  function renderTools() {
    if (!G) return;
    document.querySelectorAll('#bsTools button[data-b]').forEach(b => {
      const k = b.dataset.b, i = b.querySelector('i');
      if (k === 'fire') { const f = S ? Math.min(1, S.fire) : 0, armed = S && S.cur && S.cur.k === 'fire'; b.style.setProperty('--p', (armed ? 1 : f).toFixed(3)); b.classList.toggle('ready', !!S && (f >= 1 || armed)); i.textContent = armed ? '✓' : f >= 1 ? '!' : Math.round(f * 100) + '%'; i.classList.toggle('buy', false); return; }
      const n = stats.inv[k]; i.textContent = n > 0 ? n : '🪙' + BOOST[k].p; i.classList.toggle('buy', n <= 0);
      b.classList.toggle('on', (k === 'aim' && !!G.longAim) || (!!S && !!S.cur && S.cur.k === k));
      if (k === 'plus') b.querySelector('small').textContent = G.mode === 'end' || (S && S.ceil) ? 'Uitstel' : '+5';
    });
    $('#bsCoins').textContent = stats.coins;
  }
  function hud() {
    if (!S || !G) return;
    $('#bsTitle').textContent = G.mode === 'end' ? 'Eindeloos' : 'Level ' + G.id;
    $('#bsScore').textContent = fmt(S.score);
    const goalEl = $('#bsGoal'), starEl = $('#bsStarHud');
    if (G.mode === 'end') {
      goalEl.innerHTML = `<b>♾️</b><span><em>Eindeloos</em><small>🏆 ${fmt(Math.max(stats.endBest || 0, S.score))}</small></span>`;
      starEl.innerHTML = `<b>${S.pushes}</b><small>rijen</small>`;
    } else {
      const [ic, tx] = GOAL[S.goal] || GOAL.clear;
      const prog = S.goal === 'stars' ? `${S.stars}/${S.starsTotal} ⭐` : S.goal === 'top' ? `nog ${row0(S)}` : `nog ${count(S)}`;
      goalEl.innerHTML = `<b>${ic}</b><span><em>${tx}</em><small>${prog}</small></span>`;
      const st = starsFor(Lv, S.shots + (S.won ? 0 : 1)), sh = S.won ? starsFor(Lv, S.shots) : st;
      starEl.innerHTML = `<b class="bs-st">${[1, 2, 3].map(k => `<i class="${k <= sh ? 'on' : ''}">★</i>`).join('')}</b><small>${sh === 3 ? '≤ ' + Lv.st[0] : sh === 2 ? '≤ ' + Lv.st[1] : 'schoten'}</small>`;
    }
  }
  const TIP_SEEN = () => store.get('bs.tips', {});
  function showTip(key) {
    const el = $('#bsTip'); el.classList.remove('show');
    if (!key || !TIPS[key]) return;
    el.innerHTML = `<b>💡</b><span>${esc(TIPS[key])}</span>`;
    setTimeout(() => { if (current === 'bs') el.classList.add('show'); }, 350);
    const s = TIP_SEEN(); s[key] = 1; store.set('bs.tips', s);
  }
  const hideTip = () => $('#bsTip').classList.remove('show');

  /* ================= starting, saving ================= */
  let nextSeed = 0;
  const newSeed = () => { const s = nextSeed || ((Math.random() * 2 ** 31) >>> 0) || 1; nextSeed = 0; return s; };
  function begin() {
    closeModals(); $('#bsConf').innerHTML = ''; hideTip(); aim = null; down = null;
    LO = null; fit(true); rebuildVisual();
    if (G && !G.preview) { slide = { t0: now(), t1: now() + .5 * DUR, from: -3 * RH }; gcv.style.transform = `translateY(${(-3 * RH * (LO ? LO.c : 0)).toFixed(1)}px)`; readyAt = now() + .45 * DUR; }
    prewarm(); requestDraw();
  }
  function startLevel(id) {
    Lv = levelOf(id); if (!Lv) return;
    S = C_new(Lv, newSeed()); G = { mode: 'lvl', id, boosts: 0, longAim: false, over: false, fireReady: false, fireTold: !!TIP_SEEN().fire };
    stats.played++; saveStats();
    begin(); saveNow();
    showTip(Lv.tip || (id === 1 ? 'aim' : null));
  }
  function startEndless() {
    Lv = null; S = C_newEnd(newSeed()); G = { mode: 'end', id: 0, boosts: 0, longAim: false, over: false, fireReady: false, fireTold: !!TIP_SEEN().fire };
    stats.played++; saveStats();
    begin(); saveNow();
    toast('Eindeloos: na een paar missers schuift er een nieuwe rij bij. Hoe ver kom jij?', 3200);
  }
  function restart() { if (!G) return; if (G.mode === 'end') startEndless(); else startLevel(G.id); }
  let saveTm = 0;
  function saveNow() { clearTimeout(saveTm); saveTm = 0; if (!S || !G || G.preview || G.over || S.won || S.lost) return; store.set('bs.save', { S: C_ser(S), G: { mode: G.mode, id: G.id, boosts: G.boosts, longAim: G.longAim, fireTold: G.fireTold } }); }
  const save = () => { clearTimeout(saveTm); saveTm = setTimeout(saveNow, 300); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'bs') saveNow(); });
  function restoreSaved(sv) {
    const g = sv.G || {}; if (g.mode !== 'end' && !levelOf(g.id)) throw new Error('level');
    Lv = g.mode === 'end' ? null : levelOf(g.id); S = C_deser(sv.S);
    G = { mode: g.mode === 'end' ? 'end' : 'lvl', id: g.id || 0, boosts: g.boosts || 0, longAim: !!g.longAim, over: false, fireReady: S.fire >= 1, fireTold: !!g.fireTold };
    if (S.won || S.lost) throw new Error('over');
  }
  function preview() {                                           // the next level waits behind the start dialog
    const n = unlocked(); Lv = levelOf(n); S = C_new(Lv, 1); G = { mode: 'lvl', id: n, preview: true, boosts: 0, over: false };
    LO = null; fit(true); rebuildVisual();
  }
  let warmT = 0;
  function prewarm() {                                           // draw every sprite this game can need in small idle slices
    clearTimeout(warmT); if (!LO) return;
    const k = LO.k, jobs = [];
    for (let c = 0; c < 6; c++) { for (const kind of [K_N, K_STAR, K_ICE, K_CHG]) jobs.push(() => bubbleSprite({ k: kind, c }, k, opt.cb)); jobs.push(() => dropSprite(c, k)); jobs.push(() => dotSprite(c, k)); }
    for (const kind of [K_BOMB, K_RAIN, 'fire']) jobs.push(() => bubbleSprite({ k: kind, c: -1 }, k, false));
    jobs.push(() => bubbleSprite({ k: K_STONE, c: -1, h: 2 }, k, false), () => bubbleSprite({ k: K_STONE, c: -1, h: 1 }, k, false), () => dropSprite('spark', k), () => dropSprite('ice', k), () => dropSprite('stone', k), () => dropSprite('fire', k), () => dotSprite('fire', k), () => dotSprite('w', k));
    const step = () => { const t0 = performance.now(); while (jobs.length && performance.now() - t0 < 4) jobs.shift()(); if (jobs.length) warmT = setTimeout(step, 30); };
    warmT = setTimeout(step, 80);
  }

  /* ================= start dialog ================= */
  function renderStart() {
    const un = unlocked();
    let h = '';
    LV.forEach((L, i) => {
      if (i % 10 === 0) h += `<div class="bs-world">${WORLDS[L.w][1]} ${WORLDS[L.w][0]}</div>`;
      const n = i + 1, st = stats.stars[n] || 0, lock = n > un;
      h += `<button data-n="${n}" class="${lock ? 'lock' : ''}${n === un && !st ? ' next' : ''}"${lock ? ' aria-disabled="true"' : ''}>${lock ? '<b>🔒</b>' : `<b>${n}</b><span>${[1, 2, 3].map(k => `<i class="${k <= st ? 'on' : ''}">★</i>`).join('')}</span>`}</button>`;
    });
    $('#bsLevels').innerHTML = h;
    $('#bsEndless').innerHTML = `<span class="bs-eico">♾️</span><span class="bs-etx"><b>Eindeloos</b><small>Hoe lang hou jij het vol? Record: ${fmt(stats.endBest || 0)}</small></span><em>Speel ▶</em>`;
    $('#bsShop').innerHTML = `<div class="bs-purse">🪙 <b>${stats.coins}</b><small>munten</small></div>` + Object.entries(BOOST).map(([k, b]) => `<button data-k="${k}"><b>${b.i}</b><span>${b.n}</span><small>× ${stats.inv[k]}</small><em>+1 · 🪙${b.p}</em></button>`).join('');
    $('#bsOptList').innerHTML = [['aim', 'Richtlijn'], ['cb', 'Kleurenblind-hulp'], ['shake', 'Schermschudden'], ['sound', 'Geluidseffecten'], ['music', 'Achtergrondmuziek']]
      .map(([k, l]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${[[true, 'Aan'], [false, 'Uit']].map(([v, t]) => `<button data-k="${k}" data-v='${JSON.stringify(v)}' class="${opt[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
    $('#bsStats').innerHTML = [['Levels', `${Object.keys(stats.stars).length}/${NL}`], ['Sterren', totalStars()], ['Record', fmt(stats.endBest || 0)]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    const live = S && G && !G.over && !G.preview;
    $('#bsResume').hidden = !live;
    $('#bsGo').textContent = live ? 'Verder ▶' : `Level ${un} ▶`;
    $('#bsGo').dataset.n = live ? '' : un;
  }
  function openStart() { aim = null; down = null; pending = null; renderStart(); openModal('bsStartModal'); }

  /* ================= input ================= */
  let down = null;
  const toF = e => { const r = field.getBoundingClientRect(); return { x: (e.clientX - r.left) / LO.c, y: (e.clientY - r.top) / LO.c }; };
  function setAim(p) {
    const dy = LY - p.y, ok = dy > .35, a = Math.max(AMIN, Math.min(Math.PI - AMIN, Math.atan2(Math.max(dy, .01), p.x - LX)));
    aim = { a, ok }; if (ok) lastAng = a; aimDirty = true; lanDirty = true; requestDraw();
  }
  const endAim = () => { if (aim) { aim = null; aimDirty = true; lanDirty = true; requestDraw(); } };
  stage.addEventListener('pointerdown', e => {
    if (!S || !G || !LO || G.preview || current !== 'bs' || anyModal()) return;
    if (e.target.closest && e.target.closest('#bsTip,#bsToast')) return;
    e.preventDefault(); if (G.over) return;
    const p = toF(e);
    const nearL = Math.hypot(p.x - LX, p.y - (LY + .2)) < 1.2 || Math.hypot(p.x - (LX + DISH[0]), p.y - (LY + DISH[1] - .1)) < .85;
    down = { id: e.pointerId, x: p.x, y: p.y, swap: nearL }; tapAt = performance.now(); hideTip();
    if (!nearL) { setAim(p); if (aim && aim.ok) sfx('bsAim'); }
    try { stage.setPointerCapture(e.pointerId); } catch (er) {}
  });
  stage.addEventListener('pointermove', e => {
    if (!down || down.id !== e.pointerId || !LO) return;
    const p = toF(e);
    if (down.swap) { if (Math.hypot(p.x - down.x, p.y - down.y) < .7) return; down.swap = false; }
    const was = aim && aim.ok; setAim(p); if (!was && aim.ok) sfx('bsAim');
  });
  stage.addEventListener('pointerup', e => {
    if (!down || down.id !== e.pointerId || !LO) return;
    const d = down; down = null;
    if (d.swap) { doSwap(); return; }
    setAim(toF(e)); const a = aim && aim.ok ? aim.a : null; endAim();
    if (a != null) requestShot(a);
  });
  stage.addEventListener('pointercancel', () => { down = null; endAim(); });
  $('#bsTools').addEventListener('click', e => { const b = e.target.closest('button[data-b]'); if (b) useBoost(b.dataset.b); });
  $('#bsTip').addEventListener('click', hideTip);
  $('#bsLevels').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (!b) return; if (b.classList.contains('lock')) { menuToast('Haal eerst de levels ervoor.'); return; } startLevel(+b.dataset.n); });
  $('#bsEndless').addEventListener('click', () => startEndless());
  $('#bsShop').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]'); if (!b) return; const k = b.dataset.k, p = BOOST[k].p;
    if (stats.coins < p) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); return; }
    stats.coins -= p; stats.inv[k]++; saveStats(); sfx('bsBoost'); renderStart(); renderTools();
  });
  $('#bsOptList').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    opt[b.dataset.k] = JSON.parse(b.dataset.v); saveOpt(); renderStart(); Sfx.refresh && Sfx.refresh();
    if (b.dataset.k === 'cb') { redrawGrid(); lanDirty = true; prewarm(); requestDraw(); }
  });
  $('#bsGo').addEventListener('click', () => { const n = $('#bsGo').dataset.n; if (n) startLevel(+n); else closeModals(); });
  $('#bsResume').addEventListener('click', () => closeModals());
  $('#bsStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#bsEndMenu').addEventListener('click', () => { closeModals(); if (G && G.mode === 'end') leave(); else openStart(); });
  $('#bsEndRetry').addEventListener('click', () => restart());
  $('#bsEndNext').addEventListener('click', () => { if (!G) return; if (G.mode === 'end') startEndless(); else if (G.id < NL) startLevel(G.id + 1); });
  $('#bsLoseRetry').addEventListener('click', () => restart());
  $('#bsLoseMenu').addEventListener('click', () => { closeModals(); openStart(); });
  $('#bsLosePlus').addEventListener('click', () => {
    if (!S || !S.lost || S.why !== 'shots' || !ensure('plus')) return;
    S.lost = false; S.why = ''; S.extra += 5; G.over = false; consume('plus'); sfx('bsBoost'); closeModals(); lanDirty = true; hud(); readyAt = 0; saveNow(); requestDraw();
  });
  $('#bsBack').addEventListener('click', () => leave());
  $('#bsMenu').addEventListener('click', () => openStart());
  $('#bsRetry').addEventListener('click', async () => {
    if (!S || !G || G.preview) return;
    if (S.shots && !G.over && !(await askConfirm('Opnieuw beginnen?', G.mode === 'end' ? 'Je begint een nieuw eindeloos spel.' : 'Je begint dit level opnieuw.', 'Opnieuw'))) return;
    restart();
  });
  window.addEventListener('resize', () => { if (current === 'bs') setTimeout(() => fit(), 60); });

  function enter() {
    show('bs');
    const sv = store.get('bs.save', null);
    if ((!S || !G || G.preview || G.over) && sv && sv.S) { try { restoreSaved(sv); } catch (e) { S = null; G = null; store.del('bs.save'); } }
    if (S && G && !G.preview && !G.over) { LO = null; fit(true); rebuildVisual(); prewarm(); requestAnimationFrame(() => fit()); }
    else { preview(); renderTools(); openStart(); }
  }
  function leave() { $('#bsConf').innerHTML = ''; saveNow(); closeModals(); hideTip(); aim = null; down = null; pending = null; if (G && G.over) { S = null; G = null; } show('menu'); refreshMenu(); }

  /* ================= test hooks ================= */
  const client = (x, y) => { const r = field.getBoundingClientRect(); return { x: r.left + x * LO.c, y: r.top + y * LO.c }; };
  function floating(T) { const seen = new Set(), q = []; for (let c = 0; c < rowLen(T, 0); c++) if (T.g[0][c]) { seen.add(c); q.push([0, c]); } for (let i = 0; i < q.length; i++) for (const [a, b] of nbrs(T, q[i][0], q[i][1])) { const kk = a * 16 + b; if (!seen.has(kk) && T.g[a][b]) { seen.add(kk); q.push([a, b]); } } let n = 0; each(T, (e, r, c) => { if (!seen.has(r * 16 + c)) n++; }); return n; }
  window.__bs = {
    get S() { return S; }, get G() { return G; }, get D() { return D; }, get LO() { return LO; }, get fx() { return fx.length; }, get sched() { return sched.length; }, get flight() { return !!flight; }, get pending() { return !!pending; },
    LV, opt, stats: () => stats, startLevel, startEndless, useBoost, fit, restart, openStart,
    set seed(v) { nextSeed = v >>> 0; }, set dur(v) { DUR = +v || 1; }, get dur() { return DUR; },
    canShoot, busy: () => busy(now()), doneIn: () => Math.max(0, Math.max(doneAt, readyAt) - now()), readyIn: () => Math.max(0, readyAt - now()),
    finite: () => sched.every(s => Number.isFinite(s[0])) && fx.every(f => Number.isFinite(f.t0)) && Number.isFinite(readyAt) && Number.isFinite(doneAt) && (!flight || Number.isFinite(flight.t0 + flight.dur)),
    drawnKey: () => D && gridKey(D.g, D), logicKey: () => S && gridKey(S.g, S), floating: () => S ? floating(S) : 0,
    aimClient(a, dist = 4) { return client(LX + Math.cos(a) * dist, LY - Math.sin(a) * dist); }, launcherClient: () => client(LX, LY + .2),
    bot: () => S && botMove(S), frames: () => frames.slice(), tapLat: () => tapLat.slice(),
    giveCoins(n) { stats.coins += n; saveStats(); renderTools(); }, setFire(v) { S.fire = v; G.fireReady = false; renderTools(); },
    core: { shoot: C_shoot, trace: C_trace, snap: C_snap, newState: C_new, clone: C_clone, count, nbrs, cxOf, cyOf, rowLen, gridKey, starsFor },
  };
  return { enter, leave, hasSave: () => !!store.get('bs.save', null) };
})();
$('#tileBs').addEventListener('click', () => Bellenschieter.enter());
