/* ================================================================
   WOORDZOEKER – Dutch word search puzzles. Find the words of a theme in a grid of letters: swipe from the first to the
   last letter (or tap both). Four levels (8x8 up to 14x14, from right/down only to all 8 directions with decoys),
   endless seeded puzzles over 30+ themes, a daily puzzle, hints, and a "geheim woord" spelled by the leftover letters.
   ================================================================ */
const Woordzoeker = (() => {
  /* ================= themes: curated, family-friendly Dutch word lists =================
     Only the letters A-Z (no accents or diaereses: no ë/ï words). IJ is written as the two letters I + J, everywhere.
     Every word is checked by games/wzcore.test.mjs: spelling against the OpenTaal list of Woordbord (proper names
     such as cities, countries and fairy-tale names are listed in NAMES there), no blocklisted part in any direction. */
  const THEMES = [
    { id: 'dieren', name: 'Dieren', ic: '🐘', w: 'OLIFANT GIRAF LEEUW TIJGER ZEBRA AAP GORILLA NIJLPAARD NEUSHOORN KAMEEL DROMEDARIS KANGOEROE KOALA PANDA BEER IJSBEER WOLF VOS HERT REE EEKHOORN EGEL KONIJN HAAS MUIS RAT HAMSTER CAVIA KAT HOND PAARD EZEL OTTER BEVER DAS MOL VLEERMUIS LUIAARD WASBEER ZEEHOND LAMA BUFFEL ANTILOPE GAZELLE JAGUAR LUIPAARD POEMA STOKSTAARTJE' },
    { id: 'vogels', name: 'Vogels', ic: '🐦', w: 'MEEUW MUS MEREL DUIF KRAAI EKSTER SPREEUW ROODBORSTJE KOOLMEES PIMPELMEES VINK ZWALUW SPECHT UIL KAUW REIGER OOIEVAAR ZWAAN EEND GANS KIEVIT GRUTTO SCHOLEKSTER FAZANT PATRIJS HAVIK BUIZERD VALK ADELAAR GIER PAPEGAAI PARKIET KANARIE STRUISVOGEL FLAMINGO PAUW KALKOEN KOEKOEK LEEUWERIK NACHTEGAAL IJSVOGEL TORENVALK PELIKAAN KOLIBRIE TOEKAN WINTERKONING' },
    { id: 'insecten', name: 'Insecten en kriebelbeestjes', ic: '🐞', w: 'MIER BIJ WESP HOMMEL VLINDER RUPS MOT VLIEG MUG LIBEL SPRINKHAAN KREKEL KEVER MEIKEVER MESTKEVER TOR OORWORM ZWEEFVLIEG VLO TERMIET CICADE VUURVLIEG GLIMWORM HORZEL DAGPAUWOOG KOOLWITJE CITROENVLINDER SPIN SLAK WORM DUIZENDPOOT HOOIWAGEN TEEK BLADLUIS ZILVERVISJE WATERJUFFER BOKTOR LARVE COCON VOELSPRIET VLEUGEL ZWERM HONING' },
    { id: 'fruit', name: 'Fruit', ic: '🍓', w: 'APPEL PEER BANAAN SINAASAPPEL MANDARIJN CITROEN LIMOEN DRUIF KERS AARDBEI FRAMBOOS BRAAM BOSBES KRUISBES ANANAS MANGO PAPAJA KIWI MELOEN WATERMELOEN PERZIK NECTARINE ABRIKOOS PRUIM VIJG DADEL GRANAATAPPEL KOKOSNOOT LYCHEE PASSIEVRUCHT GRAPEFRUIT AVOCADO KWEEPEER MOERBEI ROZIJN BES HAZELNOOT WALNOOT AALBES VRUCHT KLOKHUIS' },
    { id: 'groente', name: 'Groente', ic: '🥕', w: 'WORTEL TOMAAT KOMKOMMER SLA SPITSKOOL ANDIJVIE BROCCOLI BLOEMKOOL BOERENKOOL SPRUITJES ZUURKOOL RODEKOOL WITLOF PREI KNOFLOOK PAPRIKA COURGETTE AUBERGINE ERWT BONEN SPERZIEBOON SNIJBOON TUINBOON KAPUCIJNER RADIJS BIET RABARBER ASPERGE ARTISJOK VENKEL SELDERIJ PASTINAAK POMPOEN POSTELEIN RUCOLA KOOLRABI PEULTJES CHAMPIGNON AARDAPPEL SJALOT BIESLOOK PETERSELIE WATERKERS UIEN' },
    { id: 'sport', name: 'Sport', ic: '⚽', w: 'VOETBAL HOCKEY TENNIS ZWEMMEN SCHAATSEN HARDLOPEN FIETSEN TURNEN JUDO KORFBAL HANDBAL BASKETBAL VOLLEYBAL BADMINTON ROEIEN ZEILEN SURFEN GOLF SCHERMEN DAMMEN SCHAKEN BILJART BOWLING ATLETIEK HOOGSPRINGEN VERSPRINGEN KOGELSTOTEN SPEERWERPEN MARATHON WIELRENNEN DUIKEN WATERPOLO HONKBAL RUGBY CRICKET TOERNOOI TAFELTENNIS KLIMMEN PAARDRIJDEN KEEPER DOELPUNT MEDAILLE BEKER WEDSTRIJD TRAINER SPORTVELD' },
    { id: 'beroepen', name: 'Beroepen', ic: '👩‍🚒', w: 'BAKKER SLAGER KAPPER DOKTER TANDARTS VERPLEGER AGENT BRANDWEERMAN LERAAR JUF MEESTER BOER VISSER PILOOT VERKOPER SCHILDER TIMMERMAN LOODGIETER ELEKTRICIEN MONTEUR POSTBODE CHAUFFEUR DIERENARTS ARCHITECT ADVOCAAT RECHTER JOURNALIST FOTOGRAAF ZANGER MUZIKANT ACTEUR SCHRIJVER TUINIER HOVENIER METSELAAR STRATENMAKER GLAZENWASSER SCHOENMAKER KLEERMAKER SMID APOTHEKER DIRECTEUR PROGRAMMEUR ASTRONAUT KAPITEIN MATROOS CONDUCTEUR MACHINIST BOSWACHTER IMKER UITVINDER' },
    { id: 'weer', name: 'Het weer', ic: '🌦️', w: 'ZON REGEN WIND STORM SNEEUW HAGEL MIST WOLK BLIKSEM DONDER ONWEER REGENBOOG IJZEL RIJP DAUW HITTE KOU VORST DOOI MOTREGEN STORTBUI HOOSBUI REGENBUI ORKAAN TORNADO WINDKRACHT TEMPERATUUR THERMOMETER BAROMETER WEERBERICHT ZONNESCHIJN BEWOLKT ZONNIG LUCHTDRUK HITTEGOLF SNEEUWVLOK IJSPEGEL WINDSTIL BRIES WINDHOOS NEERSLAG ZOMER WINTER LENTE HERFST SEIZOEN WEERMAN' },
    { id: 'keuken', name: 'In de keuken', ic: '🍳', w: 'PAN KOEKENPAN STEELPAN OVEN MAGNETRON KOELKAST VRIEZER FORNUIS GARDE MIXER BLENDER SOEPLEPEL VORK MES BORD KOM BEKER GLAS SCHAAL VERGIET RASP SNIJPLANK DEEGROLLER SPATEL POLLEPEL SCHORT OVENWANT THEEDOEK GOOTSTEEN KRAAN WATERKOKER BROODROOSTER THEEPOT SUIKERPOT PEPERMOLEN KURKENTREKKER BLIKOPENER FLESOPENER TRECHTER WEEGSCHAAL MAATBEKER KOOKBOEK RECEPT VAATWASSER SERVIES BESTEK THEELEPEL KOPJE SCHOTEL DIENBLAD BAKBLIK ZEEF' },
    { id: 'school', name: 'Op school', ic: '🏫', w: 'JUF MEESTER KLAS BORD KRIJT POTLOOD GUM PEN LINIAAL SCHRIFT BOEK ETUI SCHOOLTAS RUGZAK PAUZE SCHOOLPLEIN GYMZAAL GYMLES REKENEN TAAL SPELLING LEZEN SCHRIJVEN TEKENEN KNUTSELEN TOPOGRAFIE AARDRIJKSKUNDE GESCHIEDENIS DICTEE TOETS RAPPORT HUISWERK SCHAAR LIJM PASSER GEODRIEHOEK KLEURPOTLOOD STIFT PUNTENSLIJPER LEERLING KLASGENOOT DIRECTEUR BIBLIOTHEEK SCHOOLREISJE SPREEKBEURT SCHOOLBANK AGENDA KALENDER WOORDENBOEK' },
    { id: 'muziek', name: 'Muziekinstrumenten', ic: '🎻', w: 'PIANO GITAAR VIOOL CELLO CONTRABAS HARP FLUIT DWARSFLUIT BLOKFLUIT TROMPET TROMBONE TUBA HOORN SAXOFOON KLARINET HOBO TROM TRIANGEL XYLOFOON KLOKKENSPEL ACCORDEON MONDHARMONICA ORGEL KEYBOARD BANJO UKELELE MANDOLINE TAMBOERIJN DRUMSTEL BEKKEN PAUKEN MARIMBA CASTAGNETTEN BONGO DOEDELZAK SITAR LUIT ALTVIOOL BASGITAAR RAMMELAAR HARMONIUM CORNET LIER BLADMUZIEK DIRIGENT' },
    { id: 'kleding', name: 'Kleding', ic: '👕', w: 'BROEK TRUI JAS SHIRT BLOES JURK ROK SOKKEN SCHOENEN LAARZEN SANDALEN SLIPPERS PANTOFFELS SJAAL MUTS PET HOED HANDSCHOENEN WANTEN VEST PYJAMA BADJAS ONDERBROEK HEMD COLBERT STROPDAS RIEM KOUSEN PANTY LEGGING SPIJKERBROEK REGENJAS PONCHO BLAZER OVERHEMD BIKINI ZWEMBROEK BADPAK GYMPEN KLOMPEN OORWARMERS VLINDERDAS MOUW KRAAG KNOOP RITS CAPUCHON' },
    { id: 'vervoer', name: 'Vervoer', ic: '🚲', w: 'AUTO FIETS BUS TREIN TRAM METRO BOOT SCHIP VLIEGTUIG HELIKOPTER RAKET VRACHTWAGEN BROMMER SCOOTER MOTOR TAXI STEP VEERBOOT ZEILBOOT KANO ROEIBOOT TRACTOR AMBULANCE BRANDWEERAUTO POLITIEAUTO CARAVAN CAMPER BAKFIETS TANDEM DRIEWIELER STOOMTREIN ZEPPELIN LUCHTBALLON KABELBAAN DUIKBOOT GONDEL HUIFKAR KOETS SLEE PONT JACHT VRACHTSCHIP BESTELBUS SKATEBOARD SPOORWEG' },
    { id: 'steden', name: 'Nederlandse steden', ic: '🏙️', w: 'AMSTERDAM ROTTERDAM UTRECHT GRONINGEN LEEUWARDEN ASSEN ZWOLLE LELYSTAD ARNHEM NIJMEGEN HAARLEM LEIDEN DELFT GOUDA BREDA TILBURG EINDHOVEN MAASTRICHT MIDDELBURG ALKMAAR ENSCHEDE DEVENTER APELDOORN AMERSFOORT DORDRECHT SCHIEDAM ZAANDAM HOORN EDAM VOLENDAM VENLO ROERMOND HEERLEN ALMERE ZEIST HILVERSUM HENGELO DRACHTEN SNEEK HARLINGEN KAMPEN ZUTPHEN VLISSINGEN WAGENINGEN EMMEN MEPPEL' },
    { id: 'strand', name: 'Het strand', ic: '🏖️', w: 'ZAND ZEE GOLVEN SCHELP ZANDKASTEEL STRANDBAL EMMER SCHEP PARASOL HANDDOEK ZONNEBRIL BADPAK ZWEMBROEK DUIN DUINEN STRANDSTOEL WINDSCHERM VLIEGER MEEUW KRAB ZEESTER KWAL STRANDTENT IJSJE BOEI VLOED BRANDING PIER VUURTOREN SURFPLANK LUCHTBED ZONNEHOED KUST ZWEMMEN ZONNEN PLONS BADMEESTER STRANDLAKEN ZANDTAART WATERKANT HELMGRAS' },
    { id: 'boerderij', name: 'De boerderij', ic: '🐄', w: 'KOE STIER KALF PAARD VEULEN VARKEN BIG SCHAAP LAM GEIT BOK KIP HAAN KUIKEN EEND GANS KALKOEN KONIJN HOND KAT BOER BOERIN STAL SCHUUR HOOI STRO TRACTOR AKKER WEILAND HEK MELK EIEREN MEST TROG HOOIBERG SILO GRAAN TARWE BIETEN PLOEG KIPPENHOK SCHAAPSKOOI BOOMGAARD MOESTUIN HOOIVORK KLOMPEN MELKBUS ZEUG' },
    { id: 'ruimte', name: 'De ruimte', ic: '🚀', w: 'ZON MAAN AARDE MARS VENUS MERCURIUS JUPITER SATURNUS NEPTUNUS PLANEET STER KOMEET METEOOR METEORIET RAKET ASTRONAUT RUIMTEPAK RUIMTESTATION SATELLIET TELESCOOP STERRENBEELD MELKWEG HEELAL ZWAARTEKRACHT KRATER RUIMTEVAART STERRENWACHT NEVEL SUPERNOVA LICHTJAAR POOLSTER NOORDERLICHT RUIMTESCHIP KOSMOS KOSMONAUT MAANLANDER BAAN LANCEREN GEWICHTLOOS' },
    { id: 'feest', name: 'Feestdagen', ic: '🎉', w: 'KERSTMIS PASEN SINTERKLAAS KONINGSDAG OUDJAAR NIEUWJAAR VERJAARDAG CARNAVAL PINKSTEREN HEMELVAART MOEDERDAG VADERDAG HALLOWEEN SLINGERS TAART CADEAU BALLON KAARS VUURWERK KERSTBOOM PAASEI PAASHAAS PEPERNOTEN MARSEPEIN OLIEBOL KERSTMAN PIEK FEEST GASTEN CONFETTI DANSEN VLAG OPTOCHT KRANS KRUIDNOTEN SURPRISE GEDICHT KERSTSTAL VERKLEDEN SCHIMMEL MIJTER STAF' },
    { id: 'kleuren', name: 'Kleuren en vormen', ic: '🎨', w: 'ROOD BLAUW GEEL GROEN ORANJE PAARS ROZE ZWART WIT GRIJS BRUIN BEIGE TURQUOISE GOUD ZILVER BRONS LILA VIOLET INDIGO MAGENTA OKER MINT BORDEAUX IVOOR ZALMROZE HEMELSBLAUW DONKERBLAUW LICHTBLAUW MOSGROEN GRASGROEN ANTRACIET CIRKEL VIERKANT DRIEHOEK RECHTHOEK OVAAL STER HART RUIT ZESHOEK KUBUS PIRAMIDE BOL KEGEL CILINDER REGENBOOG' },
    { id: 'lichaam', name: 'Het lichaam', ic: '🖐️', w: 'HOOFD HAAR OOG OREN NEUS MOND TAND TONG LIP KIN WANG NEK SCHOUDER ARM ELLEBOOG POLS HAND VINGER DUIM NAGEL BUIK RUG BEEN KNIE ENKEL VOET TEEN HIEL HART LONGEN MAAG HERSENEN BLOED BOT SKELET SPIER HUID WENKBRAUW WIMPERS VOORHOOFD NAVEL KEEL KUIT HEUP LEVER NIEREN ADER RIBBEN SCHEDEL ZENUW SCHOUDERBLAD KNIESCHIJF RUGGENGRAAT SLEUTELBEEN HANDPALM VOETZOOL ONDERARM BOVENBEEN TANDVLEES OORLEL NEUSGAT WIJSVINGER KNOKKEL VINGERTOP' },
    { id: 'bos', name: 'Het bos', ic: '🌳', w: 'BOOM BOS EIK BEUK BERK DEN SPAR WILG LINDE KASTANJE ESDOORN BLAD TAK STAM WORTEL SCHORS EIKEL DENNENAPPEL PADDENSTOEL MOS VAREN STRUIK HEIDE BEEK RIVIER VIJVER HEUVEL WEIDE GRAS BLOEM NEST HOL PAD BOSWACHTER HERT EEKHOORN SPECHT UIL VOS EGEL BOSBES HOUTWORM BOOMSTRONK BOSPAD UITKIJKTOREN' },
    { id: 'speelgoed', name: 'Speelgoed', ic: '🧸', w: 'LAPPENPOP KNUFFEL TEDDYBEER BAL BLOKKEN PUZZEL KNIKKER TOL JOJO VLIEGER STEP SPRINGTOUW HOEPEL TREINBAAN RACEBAAN POPPENHUIS POPPENWAGEN ROBOT DOMINO DOBBELSTEEN BORDSPEL KAARTSPEL GANZENBORD KLEURBOEK KLEI HOBBELPAARD SCHOMMEL GLIJBAAN WIP ZANDBAK BELLENBLAAS RAMMELAAR TRAMPOLINE STELTEN MARIONET HANDPOP BOUWDOOS DRAAITOL SPEELKAMER SPEELTUIN KNIKKERBAAN DIABOLO' },
    { id: 'zee', name: 'De zee', ic: '🐬', w: 'ZEE OCEAAN GOLF GOLVEN VIS WALVIS DOLFIJN HAAI ROG KWAL ZEESTER ZEEPAARDJE KRAB KREEFT GARNAAL OCTOPUS INKTVIS SCHELP KORAAL ZEEWIER ZEEHOND ZEELEEUW SCHILDPAD MOSSEL OESTER HARING KABELJAUW TONIJN ZALM MAKREEL SCHOL DUIKER SCHIP ANKER BOEI VUURTOREN EILAND ZOUT STROMING DIEPZEE ZEEBODEM KUST HAVEN VISSER NET KOMPAS ZEEMEERMIN' },
    { id: 'huis', name: 'In huis', ic: '🏠', w: 'BANK STOEL TAFEL KAST BED LAMP SPIEGEL DEUR RAAM GORDIJN VLOERKLEED TAPIJT KUSSEN DEKEN DEKBED MATRAS BOEKENKAST KLEDINGKAST BUREAU TELEVISIE RADIO KLOK SCHILDERIJ PLANT VAAS KAPSTOK TRAP ZOLDER KELDER WOONKAMER SLAAPKAMER BADKAMER KEUKEN TOILET DOUCHE BAD WASTAFEL WASMACHINE STOFZUIGER BEZEM DWEIL HAARD SLEUTEL BRIEVENBUS DEURBEL VENSTERBANK' },
    { id: 'bloemen', name: 'Bloemen en planten', ic: '🌷', w: 'ROOS TULP NARCIS KROKUS LELIE ZONNEBLOEM MADELIEFJE PAARDENBLOEM HYACINT DAHLIA VIOOLTJE LAVENDEL GERANIUM ORCHIDEE MARGRIET KLAPROOS BOTERBLOEM KLAVER SNEEUWKLOKJE SERING HORTENSIA PIOENROOS CHRYSANT GOUDSBLOEM IRIS ANJER BEGONIA FUCHSIA KAMILLE CACTUS VAREN KLIMOP BLOEMBOL STENGEL KNOP BLAADJE DOORN NECTAR STUIFMEEL ZAADJE BOEKET VAAS' },
    { id: 'tuin', name: 'In de tuin', ic: '🪴', w: 'GIETER HARK SCHEP SCHOFFEL KRUIWAGEN GRASMAAIER TUINSLANG SNOEISCHAAR SCHUURTJE VIJVER HEG GAZON MOESTUIN KAS BLOEMBED POTGROND COMPOST REGENWORM SLAK MOL MIER BIJ VLINDER MEREL EGEL TUINKABOUTER PARASOL LIGSTOEL BARBECUE SCHOMMEL ZANDBAK HEK POORT TERRAS VOGELHUISJE BLOEMPOT ONKRUID TUINBANK SPROEIER HANDSCHOEN TUINTAFEL SCHUTTING' },
    { id: 'lekkers', name: 'Snoep en gebak', ic: '🍰', w: 'TAART KOEKJE KOEK CAKE APPELTAART GEBAK SNOEP DROP ZUURTJE LOLLY KAUWGOM SPEKKIES CHOCOLADE PRALINE BONBON STROOPWAFEL POFFERTJES PANNENKOEK WAFEL OLIEBOL TOMPOUCE SLAGROOM VANILLE KANEEL SUIKERSPIN SPECULAAS HAGELSLAG MUISJES ROOMIJS KARAMEL MARSEPEIN NOUGAT DONUT BOTERKOEK ONTBIJTKOEK MOORKOP KRAKELING ROOMSOES VLAAI PUDDING VLA SUIKER KRENTENBOL BROWNIE' },
    { id: 'reis', name: 'Op vakantie', ic: '🧳', w: 'KOFFER PASPOORT VLIEGVELD VLIEGTUIG HOTEL CAMPING TENT CARAVAN STRAND ZWEMBAD KAART PLATTEGROND ZONNEBRIL TICKET VAKANTIE REIS REISGIDS SOUVENIR ANSICHTKAART FOTOTOESTEL CAMERA RUGZAK SLAAPZAK LUCHTBED BERGEN TOERIST BUITENLAND GRENS EXCURSIE MUSEUM ROUTE BAGAGE TAXI TREIN VEERBOOT ZONNEHOED WANDELEN KAMPVUUR AVONTUUR ZWEMBANDJES' },
    { id: 'winter', name: 'De winter', ic: '⛄', w: 'SNEEUW IJS SNEEUWPOP SLEE SCHAATSEN IJSBAAN SNEEUWBAL WANTEN SJAAL MUTS VORST IJSPEGEL HAGEL SNEEUWVLOK KOU DEKEN HAARDVUUR ERWTENSOEP SNERT STAMPPOT KERST IGLO IJSBEER SCHAATS RENDIER IJZEL DOOI WINTERJAS KOEK ZOPIE SNEEUWSTORM IJSKRISTAL RIJP OORWARMERS KACHEL WARMTE KAARSLICHT WINTERSLAAP SNEEUWSCHOEN WINTERSPORT' },
    { id: 'landen', name: 'Landen', ic: '🌍', w: 'NEDERLAND DUITSLAND FRANKRIJK SPANJE PORTUGAL GRIEKENLAND ENGELAND SCHOTLAND IERLAND IJSLAND NOORWEGEN ZWEDEN FINLAND DENEMARKEN POLEN OOSTENRIJK ZWITSERLAND HONGARIJE TURKIJE LUXEMBURG MALTA CYPRUS ESTLAND LETLAND LITOUWEN SLOWAKIJE BULGARIJE MONACO ANDORRA CANADA MEXICO CHILI PERU EGYPTE MAROKKO KENIA JAPAN CHINA INDIA THAILAND SURINAME CUBA NEPAL VIETNAM' },
    { id: 'sprookjes', name: 'Sprookjes', ic: '🏰', w: 'PRINSES PRINS KONING KONINGIN KASTEEL DRAAK HEKS TOVENAAR FEE KABOUTER REUS DWERG EENHOORN RIDDER ZWAARD SCHILD KROON TOVERSTAF TOVERDRANK ROODKAPJE SNEEUWWITJE ASSEPOESTER DOORNROOSJE KIKKERKONING REPELSTEELTJE TOVERSPREUK BETOVERD KOETS POMPOEN SCHAT TROON TOREN ELFJE SPROOKJESBOS GLAZEN MUILTJE WENS TOVERSPIEGEL ZEEMEERMIN GOUDHAAR' },
    { id: 'gereedschap', name: 'Gereedschap', ic: '🔨', w: 'HAMER ZAAG BOOR SCHROEF MOERSLEUTEL TANG SPIJKER BOUT MOER VIJL BEITEL WATERPAS DUIMSTOK ROLMAAT SCHUURPAPIER LADDER KWAST VERF ROLLER PLAKBAND BIJL SCHEP SPADE KRUIWAGEN BETONMOLEN BOUWKRAAN GRAAFMACHINE BULLDOZER STEIGER BOUWHELM BAKSTEEN CEMENT TEGEL SCHAAF LIJMKLEM PUNTTANG HANDZAAG BOORMACHINE GEREEDSCHAP WERKBANK ZAAGBOK' },
    { id: 'eten', name: 'Eten en drinken', ic: '🥪', w: 'BROOD KAAS MELK BOTER PINDAKAAS HAGELSLAG JAM HONING APPELSAP THEE KOFFIE WATER LIMONADE YOGHURT VLA SOEP PASTA RIJST AARDAPPEL FRIET PIZZA PANNENKOEK HUTSPOT STAMPPOT ERWTENSOEP SPAGHETTI MACARONI LASAGNE OMELET BOTERHAM BESCHUIT KROKET FRIKANDEL SALADE GROENTESOEP SAUS KETCHUP MOSTERD ONTBIJT LUNCH AVONDETEN TOETJE SINAASAPPELSAP CHOCOMELK' },
  ];

  /* ================= the puzzle generator: pure logic, deterministic per seed (also runs in Node: wzsrc/load.mjs) =================
     A puzzle is a square grid of capital letters with the words of one theme hidden in it.
       Makkelijk  8x8   words only to the right and down                       geheim woord
       Normaal   10x10  + the two diagonals that read from left to right       geheim woord
       Moeilijk  12x12  all 8 directions, also backwards                       geheim woord
       Expert    14x14  all 8 directions, more words and overlap, decoys        (filler letters)
     Geheim woord: the words are packed so tightly that only a few cells stay free; those cells, read row by row, spell
     a hidden word (an unused word of the theme, or a compliment). Expert fills its free cells with letters from the
     theme instead, plus "decoys": almost-words (a word minus its last letter, or with one letter changed).
     IJ: always the two letters I and J (as in Woordbord); a word with IJ is found by selecting both cells.
     Guarantees (checked by verify() before a puzzle is returned, and by games/wzcore.test.mjs):
       - every word is in the grid exactly once, in all 8 directions together (no second, accidental copy);
       - no word of the list is part of another word of the same puzzle (forwards or backwards), no palindromes;
       - no blocklisted word anywhere: BLOCK in all 8 directions, BLOCK_FWD in the 4 reading directions (a word whose
         reverse contains one of those, like REGEN or KIP, is only placed in a reading direction). */
  const CORE_V = 1;
  const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];   // [dr, dc]; 0-3 read forwards
  const LEVELS = [
    { id: 'mk', name: 'Makkelijk', n: 8, dirs: 2, words: [7, 13], secret: [5, 14, 10], maxLen: 7, ov: .4, bal: 1.6, desc: '8×8 · naar rechts en naar beneden' },
    { id: 'nm', name: 'Normaal', n: 10, dirs: 4, words: [10, 19], secret: [6, 14, 11], maxLen: 9, ov: .9, bal: 2.6, desc: '10×10 · ook schuin' },
    { id: 'md', name: 'Moeilijk', n: 12, dirs: 8, words: [14, 27], secret: [6, 14, 12], maxLen: 11, ov: 1.2, bal: 1.4, desc: '12×12 · alle kanten op, ook achterstevoren' },
    { id: 'ex', name: 'Expert', n: 14, dirs: 8, words: [22, 28], secret: null, decoys: [6, 10], maxLen: 14, ov: 2.4, bal: .9, desc: '14×14 · veel woorden en lokwoorden' },
  ];
  const BLOCK = ['KUT', 'LUL', 'SEKS', 'SEX', 'NEUK', 'HOER', 'KANKER', 'TYFUS', 'TERING', 'KLOTE', 'PIEMEL', 'TIET', 'SLET', 'KONT', 'FUCK', 'SHIT',
    'NAZI', 'HITLER', 'FLIKKER', 'MONGOOL', 'HOMO', 'GVD', 'KDK', 'TRUT', 'BITCH', 'DIKZAK', 'SUKKEL', 'IDIOOT', 'DEBIEL'];
  const BLOCK_FWD = ['NEGER', 'PIK', 'PIS', 'KAK'];
  // compliments for the hidden word when no unused theme word has the right length (spaces are not in the grid)
  const GENERIC = ['GOED ZO', 'SUPER', 'TOPPER', 'BRAVO', 'PRIMA', 'GEWELDIG', 'FANTASTISCH', 'KNAP GEDAAN', 'GOED GEDAAN', 'LEKKER BEZIG', 'WAT GOED', 'JIJ BENT TOP',
    'GOED GEZOCHT', 'PRACHTIG', 'SCHITTEREND', 'UITSTEKEND', 'KAMPIOEN', 'SPEURNEUS', 'GEVONDEN', 'OPGELOST', 'HARTSTIKKE GOED', 'WAT KNAP', 'HELEMAAL GOED',
    'SUPER GEZOCHT', 'GOED GEKEKEN', 'ALLES GEVONDEN', 'GOED BEZIG', 'TOP GEDAAN', 'WAT SLIM', 'SLIMMERIK', 'GENIAAL', 'TOPPRESTATIE'];
  const REV = new Map(), rev = w => { let r = REV.get(w); if (r === undefined) { r = w.split('').reverse().join(''); if (REV.size > 5000) REV.clear(); REV.set(w, r); } return r; };
  const pal = w => w === rev(w);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const shuffle = (a, R) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const wordsOf = th => th._w || (th._w = [...new Set(th.w.split(/\s+/).filter(Boolean))]);
  const RB = new Map(), revBad = w => { let v = RB.get(w); if (v === undefined) { v = BLOCK_FWD.some(b => rev(w).includes(b)); RB.set(w, v); } return v; };   // only in a reading direction
  const related = (a, b) => a.includes(b) || b.includes(a) || a.includes(rev(b)) || rev(a).includes(b);


  /* ---------- the lines of a grid: rows, columns and both diagonals, each in its reading direction ---------- */
  const LINES = {};
  function linesOf(n) {
    if (LINES[n]) return LINES[n];
    const out = [], at = Array.from({ length: n * n }, () => []);
    const run = (r, c, dr, dc) => { const cells = []; while (r >= 0 && r < n && c >= 0 && c < n) { cells.push(r * n + c); r += dr; c += dc; } if (cells.length >= 3) { cells.forEach(i => at[i].push(out.length)); out.push(cells); } };
    for (let r = 0; r < n; r++) run(r, 0, 0, 1);
    for (let c = 0; c < n; c++) run(0, c, 1, 0);
    for (let k = 0; k < n; k++) { run(0, k, 1, 1); if (k) run(k, 0, 1, 1); }
    for (let k = 0; k < n; k++) { run(n - 1, k, -1, 1); if (k < n - 1) run(k, 0, -1, 1); }
    out.at = at;                                           // at[cell] = the lines through that cell
    return (LINES[n] = out);
  }
  const lineStr = (g, cells) => { let s = ''; for (const i of cells) s += g[i] || '.'; return s; };
  const lineStrs = (g, n) => linesOf(n).map(cells => lineStr(g, cells));
  function countIn(strs, w, r = rev(w)) {
    let k = 0; const both = r !== w;
    for (const s of strs) { for (let i = s.indexOf(w); i >= 0; i = s.indexOf(w, i + 1)) k++; if (both) for (let i = s.indexOf(r); i >= 0; i = s.indexOf(r, i + 1)) k++; }
    return k;
  }
  const BLOCK_R = BLOCK.map(rev);
  function blocked(strs) {
    for (const s of strs) {
      for (let k = 0; k < BLOCK.length; k++) if (s.includes(BLOCK[k]) || s.includes(BLOCK_R[k])) return BLOCK[k];
      for (const b of BLOCK_FWD) if (s.includes(b)) return b;
    }
    return null;
  }
  function cellsOf(p, n) { const [dr, dc] = DIRS[p.d], out = []; for (let k = 0; k < p.w.length; k++) out.push((p.r + dr * k) * n + p.c + dc * k); return out; }
  function freeCells(P) { const used = new Uint8Array(P.n * P.n); for (const p of P.words) for (const i of cellsOf(p, P.n)) used[i] = 1; const out = []; for (let i = 0; i < used.length; i++) if (!used[i]) out.push(i); return out; }
  // every word exactly once, nothing rude, the hidden word right; returns a list of problems (empty = fine)
  function verify(P) {
    const strs = lineStrs(P.grid, P.n), bad = [];
    for (const p of P.words) {
      const k = countIn(strs, p.w); if (k !== 1) bad.push(p.w + ' x' + k);
      if (cellsOf(p, P.n).map(i => P.grid[i]).join('') !== p.w) bad.push(p.w + ' not at its place');
      if (P.words.some(q => q !== p && related(q.w, p.w))) bad.push(p.w + ' inside another word');
    }
    const b = blocked(strs); if (b) bad.push('blocked ' + b);
    if (P.grid.length !== P.n * P.n || P.grid.some(ch => !/^[A-Z]$/.test(ch || ''))) bad.push('empty cell');
    if (P.secret) { const free = freeCells(P); if (free.map(i => P.grid[i]).join('') !== P.secret.replace(/ /g, '')) bad.push('secret'); }
    return bad;
  }

  /* ---------- placing words ---------- */
  // a board under construction keeps its line strings up to date, so checking a new word only touches its own lines
  function board(n) {
    const g = new Array(n * n).fill(''), L = linesOf(n), strs = L.map(c => '.'.repeat(c.length));
    return {
      n, g, strs,
      set(cells, letters) { const touched = new Set(); cells.forEach((i, k) => { g[i] = letters[k]; for (const l of L.at[i]) touched.add(l); }); for (const l of touched) strs[l] = lineStr(g, L[l]); return [...touched]; },
    };
  }
  // the best spot for word w (or null): new cells it covers, letters it shares with words already there, edges, a little chance
  function bestSpot(g, n, w, dirs, R, ovW, minFree, free, db) {
    let best = null, bs = -1e9; const len = w.length, fwdOnly = revBad(w), last = n - 1;
    for (let d = 0; d < dirs; d++) {
      if (fwdOnly && d >= 4) continue;
      const dr = DIRS[d][0], dc = DIRS[d][1], step = dr * n + dc;
      const r0 = dr < 0 ? len - 1 : 0, r1 = dr > 0 ? n - len : last, c0 = dc < 0 ? len - 1 : 0, c1 = dc > 0 ? n - len : last;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        let ov = 0, edge = 0, k = 0, i = r * n + c, rr = r, cc = c;
        for (; k < len; k++, i += step, rr += dr, cc += dc) {
          const ch = g[i];
          if (ch) { if (ch !== w[k]) break; ov++; }
          else { if (rr === 0 || rr === last) edge++; if (cc === 0 || cc === last) edge++; }
        }
        if (k < len || ov > len - 2) continue;
        const nw = len - ov;
        if (free - nw < minFree) continue;
        const sc = nw + ov * ovW + edge * .2 + R() * 2.2 + (db ? db[d] : 0);
        if (sc > bs) { bs = sc; best = { r, c, d, ov, nw }; }
      }
    }
    return best;
  }
  // put word w at spot s; false (and nothing changed) if that makes a second copy of any word or something rude
  function tryPut(B, placed, w, s, decoy) {
    const n = B.n, cells = cellsOf({ w, r: s.r, c: s.c, d: s.d }, n), old = cells.map(i => B.g[i]);
    const touched = B.set(cells, w), loc = touched.map(l => B.strs[l]);
    let ok = (decoy || countIn(B.strs, w) === 1) && !blocked(loc);
    for (let k = 0; ok && k < placed.length; k++) if (countIn(loc, placed[k].w, placed[k].r_) !== placed[k].here(touched)) ok = false;
    if (!ok) { B.set(cells, old); return false; }
    return true;
  }
  function placeRec(n, w, s) {
    const p = { w, r: s.r, c: s.c, d: s.d }, cells = cellsOf(p, n), L = linesOf(n), own = new Set();
    for (const i of cells) for (const l of L.at[i]) own.add(l);
    // how often the word itself is in a set of lines: once in its own line, never in lines that only cross it
    const mine = L.findIndex(c => cells.every(i => c.includes(i)));
    Object.defineProperties(p, { r_: { value: rev(w) }, here: { value: lines => lines.includes(mine) ? 1 : 0 } });
    return p;
  }

  function attempt(Lv, th, R) {
    const n = Lv.n, N = n * n, B = board(n), g = B.g;
    const smin = Lv.secret ? Lv.secret[0] : 0, smax = Lv.secret ? Lv.secret[1] : N;
    // geheim woord: pick it first (a theme word that will not be hidden), then pack the others until exactly that many cells are left
    let hid = null;
    if (Lv.secret) { const opts = wordsOf(th).filter(w => w.length >= smin && w.length <= Lv.secret[2]); if (opts.length) hid = opts[Math.floor(R() * opts.length)]; }
    const pool = shuffle(wordsOf(th).filter(w => w.length >= 3 && w.length <= Lv.maxLen && !pal(w) && (!hid || (w !== hid && !related(w, hid)))), R);
    const placed = []; let free = N;
    const target = Lv.words[0] + Math.floor(R() * (Lv.words[1] - Lv.words[0] + 1));
    const stop = hid ? hid.length : smin + 1 + Math.floor(R() * (smax - smin - 1));
    while (placed.length < Lv.words[1]) {
      if (Lv.secret && free <= stop && placed.length >= Lv.words[0]) break;
      if (!Lv.secret && placed.length >= target) break;
      const cand = pool.filter(w => !placed.some(p => p.w === w || related(p.w, w)));
      if (!cand.length) break;
      // long words first while the grid is empty, shorter ones to plug the last holes
      const full = 1 - free / N, early = full < .55, lw = early ? .3 : 0;
      cand.sort((a, b) => (b.length - a.length) * (early ? 1 : -.4) + (R() - .5) * 5);
      const keepFree = !hid ? (Lv.secret ? smin : 0) : placed.length + 1 < Lv.words[0] ? hid.length + 3 : hid.length;
      // mix the directions: a direction that is used less than its share gets a bonus (words cross instead of lining up in rows)
      const cnt = new Array(Lv.dirs).fill(0); for (const p of placed) cnt[p.d]++;
      const db = cnt.map(c => Lv.bal * ((placed.length + 1) / Lv.dirs - c));
      let best = null;
      for (const w of cand.slice(0, Lv.secret && full >= .8 ? 16 : 6)) {
        const s = bestSpot(g, n, w, Lv.dirs, R, Lv.ov, keepFree, free, db);
        if (s) { s.v = s.nw + s.ov * Lv.ov + w.length * lw + (hid && free - s.nw === hid.length ? 4 : 0); if (!best || s.v > best.s.v) best = { w, s }; }
      }
      if (!best) break;
      if (!tryPut(B, placed, best.w, best.s)) { pool.splice(pool.indexOf(best.w), 1); continue; }   // never this word in this puzzle
      placed.push(placeRec(n, best.w, best.s)); free -= best.s.nw;
    }
    if (placed.length < Lv.words[0]) return null;
    const P = { v: CORE_V, n, lv: LEVELS.indexOf(Lv), th: th.id, words: placed.map(p => ({ w: p.w, r: p.r, c: p.c, d: p.d })), grid: g, secret: null, decoys: [] };
    const freeIdx = []; for (let i = 0; i < N; i++) if (!g[i]) freeIdx.push(i);
    if (Lv.secret) {
      if (free < smin || free > smax) return null;
      const themed = shuffle(wordsOf(th).filter(w => w.length === free && w !== hid && !placed.some(p => p.w === w)), R);
      if (hid && hid.length === free) themed.unshift(hid);
      for (const s of [...themed, ...shuffle(GENERIC.filter(w => w.replace(/ /g, '').length === free), R)]) {
        B.set(freeIdx, s.replace(/ /g, ''));
        if (placed.every(p => countIn(B.strs, p.w, p.r_) === 1) && !blocked(B.strs)) { P.secret = s; return P; }
      }
      return null;
    }
    // Expert: decoys (a word without its last letter or two, or with one letter changed), then filler letters from the theme's own words
    const want = Lv.decoys[0] + Math.floor(R() * (Lv.decoys[1] - Lv.decoys[0] + 1));
    for (let t = 0; t < want * 14 && P.decoys.length < want; t++) {
      const src = placed[Math.floor(R() * placed.length)].w; if (src.length < 5) continue;
      let dw;
      if (R() < .55) dw = src.slice(0, src.length - 1 - (R() < .3 ? 1 : 0));
      else { const k = 1 + Math.floor(R() * (src.length - 2)), al = 'AEIOURSTLNKD'.replace(src[k], ''); dw = src.slice(0, k) + al[Math.floor(R() * al.length)] + src.slice(k + 1); }
      if (placed.some(p => p.w === dw) || pal(dw) || revBad(dw)) continue;
      const s = bestSpot(g, n, dw, Lv.dirs, R, 1.5, 0, free);
      if (!s) continue;
      if (!tryPut(B, placed, dw, s, true)) continue;
      free -= s.nw; P.decoys.push({ w: dw, r: s.r, c: s.c, d: s.d });
    }
    const bag = placed.map(p => p.w).join('') + 'EEEAANNRRTTOOIISSLLDDKKGGMMUUBBPPVVHHWWZZJC';
    const rest = freeIdx.filter(i => !g[i]);
    for (let t = 0; t < 30; t++) {
      B.set(rest, rest.map(i => (t && g[i] && R() < .6) ? g[i] : bag[Math.floor(R() * bag.length)]));
      if (placed.every(p => countIn(B.strs, p.w, p.r_) === 1) && !blocked(B.strs)) return P;
    }
    return null;
  }
  // one puzzle: level 0-3, any 32-bit seed, optionally a theme id; the same input always gives the same puzzle
  function generate(lv, seed, themeId) {
    const Lv = LEVELS[lv], R = rng(seed);
    const fixed = themeId && THEMES.find(t => t.id === themeId);
    for (let k = 0; k < 400; k++) {
      const th = fixed || THEMES[Math.floor(R() * THEMES.length)];
      const P = attempt(Lv, th, R);
      if (P) { P.seed = seed >>> 0; P.tries = k + 1; return P; }
    }
    return null;
  }
  const dailySeed = day => hashStr('woordzoeker ' + day);

  /* ---------- selecting ---------- */
  // which word lies between two cells (either way round)? -1: none
  function wordAt(P, a, b) {
    for (let k = 0; k < P.words.length; k++) {
      const c = cellsOf(P.words[k], P.n), s = c[0], e = c[c.length - 1];
      if ((a === s && b === e) || (a === e && b === s)) return k;
    }
    return -1;
  }
  // the straight line of cells from a towards b, snapped to the nearest of the 8 directions (fr, fc: the finger, in cells)
  function snapLine(n, a, fr, fc) {
    const r0 = Math.floor(a / n), c0 = a % n, dr = fr - r0, dc = fc - c0;
    if (Math.hypot(dr, dc) < .5) return [a];
    const oct = ((Math.round(Math.atan2(dr, dc) / (Math.PI / 4)) % 8) + 8) % 8;
    const sr = Math.round(Math.sin(oct * Math.PI / 4)), sc = Math.round(Math.cos(oct * Math.PI / 4));
    const along = sr && sc ? (dr * sr + dc * sc) / 2 : dr * sr + dc * sc;          // projection onto that direction, in steps
    const len = Math.max(0, Math.round(along)), out = [a];
    for (let k = 1; k <= len; k++) { const r = r0 + sr * k, c = c0 + sc * k; if (r < 0 || r >= n || c < 0 || c >= n) break; out.push(r * n + c); }
    return out;
  }

  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* ================= settings, progress ================= */
  const opt = Object.assign({ sound: true, lv: 1, theme: '' }, store.get('wz.settings', {}));
  if (!(opt.lv >= 0 && opt.lv < LEVELS.length)) opt.lv = 1;
  if (opt.theme && !THEMES.some(t => t.id === opt.theme)) opt.theme = '';
  const saveOpt = () => store.set('wz.settings', opt);
  Sfx.gate('wz', () => opt.music !== false); if (opt.music === undefined) opt.music = opt.sound !== false;
  const sfx = n => { if (opt.sound) Sfx.play(n); };
  const stats = Object.assign({ played: 0, solved: 0, words: 0, hints: 0, secrets: 0, best: {}, byLv: {}, daily: {}, dailyWon: 0, expNoHint: 0, fast: 0, time: 0, recent: [] }, store.get('wz.stats', {}));
  const saveStats = () => store.set('wz.stats', stats);
  const COLS = ['#ff8a7a', '#ffc94d', '#6fd6e8', '#9adf8c', '#c99cf0', '#ffa86b', '#7fb6ff', '#ff8fc0', '#c6e36a', '#a99cff', '#5fe0bf', '#ffb3a6'];
  const thOf = id => THEMES.find(t => t.id === id) || THEMES[0];
  const dayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fmtTime = s => { s = Math.max(0, Math.round(Number.isFinite(s) ? s : 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const T = () => performance.now() / 1000;

  /* ================= state =================
     P: the puzzle (pure data from generate()), G: this game (found words in the order found, hints, time, phase).
     Everything on screen is drawn from P and G: after resume, restart or a resize the view is rebuilt from them. */
  let P = null, G = null, LY = null;
  const scr = $('#wz'), main = $('#wzMain'), box = $('#wzBox'), cvB = $('#wzBoard'), cvF = $('#wzFx'), bctx = cvB.getContext('2d'), fctx = cvF.getContext('2d');
  const newG = (daily = null) => ({ found: [], hints: 0, hint: {}, lastHint: -1, time: 0, phase: 'play', daily, tiles: null, slots: [], secOk: null, wrong: 0 });

  /* ================= layout: the grid as big as fits, the word list below (portrait) or beside it (landscape) ================= */
  let fitKey = '';
  function colW() {
    const big = document.documentElement.classList.contains('big-text'), m = Math.max(...P.words.map(p => p.w.length));
    return Math.round(Math.min(220, Math.max(86, m * (big ? 12.4 : 10.2) + (big ? 38 : 32))));
  }
  function fit(force) {
    if (current !== 'wz' || !P) return;
    const land = innerWidth > innerHeight * 1.1; scr.classList.toggle('land', land);
    const m = main.getBoundingClientRect(); if (m.width < 60 || m.height < 60) return;
    const big = document.documentElement.classList.contains('big-text'), cw = colW();
    const key = [m.width, m.height, land, big, P.n, P.seed, P.words.length, cw].join();
    if (!force && key === fitKey && LY) return;
    fitKey = key;
    $('#wzList').style.setProperty('--wzcol', cw + 'px');
    let gs;
    if (land) gs = Math.min(m.height - 12, m.width * .62);
    else {
      const cols = Math.max(1, Math.floor((m.width - 24 + 6) / (cw + 6))), rows = Math.ceil(P.words.length / cols), rowH = big ? 36 : 31;
      const need = (G && G.phase === 'secret' ? 230 : 44 + rows * rowH + 14);
      gs = Math.min(m.width - 16, m.height - 14 - Math.min(need, m.height * .42));
    }
    gs = Math.floor(Math.max(140, Math.min(gs, 640)));
    box.style.width = box.style.height = gs + 'px';
    const pad = Math.max(6, gs * .025), dpr = Math.min(2.5, devicePixelRatio || 1);
    LY = { gs, pad, cs: (gs - 2 * pad) / P.n, dpr, land };
    for (const c of [cvB, cvF]) { c.width = Math.round(gs * dpr); c.height = Math.round(gs * dpr); }
    paintBoard(); requestFx();
    if (G && G.phase !== 'play') renderSecret();
  }
  const cellXY = i => [LY.pad + (i % P.n + .5) * LY.cs, LY.pad + (Math.floor(i / P.n) + .5) * LY.cs];

  /* ================= drawing ================= */
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function capsulePath(g, a, b, w) {
    const [x0, y0] = cellXY(a), [x1, y1] = cellXY(b), len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0), r = w / 2;
    g.save(); g.translate(x0, y0); g.rotate(ang);
    g.beginPath(); g.moveTo(0, -r); g.lineTo(len, -r); g.arc(len, 0, r, -Math.PI / 2, Math.PI / 2); g.lineTo(0, r); g.arc(0, 0, r, Math.PI / 2, Math.PI * 1.5); g.closePath();
    g.restore();
  }
  function capsule(g, a, b, col, fillA, lineA, scale = 1) {
    capsulePath(g, a, b, LY.cs * .8 * scale);
    g.fillStyle = hexA(col, fillA); g.fill();
    if (lineA) { g.lineWidth = Math.max(1.5, LY.cs * .07); g.strokeStyle = hexA(col, lineA); g.stroke(); }
  }
  let painted = { found: -1, phase: '' };
  function paintBoard() {
    if (!LY || !P) return;
    const g = bctx, { gs, dpr, cs } = LY, n = P.n;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cvB.width, cvB.height); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // faint cell rows, like squared paper
    g.fillStyle = 'rgba(120,90,40,.055)';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if ((r + c) % 2 === 0) g.fillRect(LY.pad + c * cs, LY.pad + r * cs, cs, cs);
    const done = G && G.phase !== 'play';
    // the letters that are left over (geheim woord): a warm glow
    if (done && P.secret) for (const i of freeCells(P)) { const [x, y] = cellXY(i); g.fillStyle = 'rgba(255,196,60,.42)'; rr(g, x - cs * .42, y - cs * .42, cs * .84, cs * .84, cs * .2); g.fill(); }
    // found words: coloured capsules under the letters
    if (G) G.found.forEach((k, j) => { const c = cellsOf(P.words[k], n); capsule(g, c[0], c[c.length - 1], COLS[j % COLS.length], .5, .95); });
    // letters of hinted words: a dashed ring
    if (G && G.phase === 'play') for (const [k, lv] of Object.entries(G.hint)) {
      if (G.found.includes(+k)) continue;
      cellsOf(P.words[+k], n).slice(0, lv).forEach(i => { const [x, y] = cellXY(i); g.beginPath(); g.arc(x, y, cs * .4, 0, 7); g.setLineDash([cs * .12, cs * .08]); g.lineWidth = Math.max(1.5, cs * .07); g.strokeStyle = 'rgba(230,150,0,.95)'; g.stroke(); g.setLineDash([]); });
    }
    g.fillStyle = '#1e2c38'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 ${Math.round(cs * .6)}px system-ui,Roboto,"Segoe UI",sans-serif`;
    for (let i = 0; i < n * n; i++) { const [x, y] = cellXY(i); g.fillText(P.grid[i], x, y + cs * .04); }
    painted = { found: G ? G.found.length : 0, phase: G ? G.phase : '' };
    void gs;
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // the effects layer: the live selection, the first tapped letter, hint pulses, pops and sparkles. It only runs while something moves.
  let raf = 0, anims = [], parts = [], frames = [], drawHist = [];
  const requestFx = () => { if (!raf) raf = requestAnimationFrame(frameFx); };
  function frameFx(ts) {
    raf = 0; frames.push(ts); if (frames.length > 600) frames.splice(0, 300);
    if (current !== 'wz' || !LY || !P) { anims = []; parts = []; return; }
    const t0 = performance.now(), more = drawFx(); drawHist.push(performance.now() - t0); if (drawHist.length > 400) drawHist.splice(0, 200);
    if (more) requestFx();
  }
  function drawFx() {
    const g = fctx, { dpr, cs } = LY, t = T();
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cvF.width, cvF.height); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    let busy = false;
    anims = anims.filter(A => Number.isFinite(A.t0) && t < A.t0 + A.dur);
    for (const A of anims) {
      const u = Math.max(0, Math.min(1, (t - A.t0) / A.dur)); busy = true;
      if (A.k === 'pop') { capsule(g, A.a, A.b, A.col, .45 * (1 - u), .9 * (1 - u), 1 + .35 * u); }
      else if (A.k === 'bad') { const sh = Math.sin(u * Math.PI * 5) * cs * .08 * (1 - u); g.save(); g.translate(sh, 0); capsule(g, A.a, A.b, '#ff6a5a', .35 * (1 - u), .8 * (1 - u)); g.restore(); }
      else if (A.k === 'hint') {
        const p = .5 + .5 * Math.sin((t - A.t0) * 7), fade = Math.min(1, (A.t0 + A.dur - t) / .4);
        A.cells.forEach((i, j) => { const [x, y] = cellXY(i); g.beginPath(); g.arc(x, y, cs * (.46 + .08 * p), 0, 7); g.fillStyle = `rgba(255,214,60,${(.5 - j * .08) * fade})`; g.fill(); g.lineWidth = 2.5; g.strokeStyle = `rgba(255,170,0,${.9 * fade})`; g.stroke(); });
      }
    }
    if (parts.length) {
      busy = true;
      parts = parts.filter(q => t < q.t0 + q.life);
      for (const q of parts) {
        const u = (t - q.t0) / q.life, x = q.x + q.vx * u * q.life - 0, y = q.y + q.vy * u * q.life + 60 * (u * q.life) ** 2, s = q.s * (1 - u * .6);
        g.fillStyle = hexA(q.col, 1 - u); g.beginPath();
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr2 = k % 2 ? s * .38 : s; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
        g.closePath(); g.fill();
      }
    }
    // the first letter after a tap (waiting for the last one)
    if (pend >= 0) { const [x, y] = cellXY(pend); g.beginPath(); g.arc(x, y, cs * .44, 0, 7); g.fillStyle = hexA(COLS[(G ? G.found.length : 0) % COLS.length], .55); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(30,44,56,.6)'; g.stroke(); }
    // the live selection while dragging
    if (drag && drag.sel.length) { const s = drag.sel, col = COLS[(G ? G.found.length : 0) % COLS.length]; capsule(g, s[0], s[s.length - 1], col, .55, 1); }
    // letters on top of the effects stay readable: redraw those that are covered
    const cover = new Set();
    if (drag) drag.sel.forEach(i => cover.add(i)); if (pend >= 0) cover.add(pend);
    for (const A of anims) if (A.k === 'hint') A.cells.forEach(i => cover.add(i));
    if (cover.size) {
      g.fillStyle = '#1e2c38'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${Math.round(cs * .6)}px system-ui,Roboto,"Segoe UI",sans-serif`;
      for (const i of cover) { const [x, y] = cellXY(i); g.fillText(P.grid[i], x, y + cs * .04); }
    }
    return busy;
  }
  function sparkle(cells, col, n = 14) {
    const t = T();
    for (let k = 0; k < n; k++) {
      const i = cells[Math.floor(Math.random() * cells.length)], [x, y] = cellXY(i), a = Math.random() * 6.28, sp = LY.cs * (1.2 + Math.random() * 2);
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - LY.cs, s: LY.cs * (.12 + Math.random() * .12), col: k % 3 ? col : '#fff6c0', t0: t, life: .5 + Math.random() * .4 });
    }
    if (parts.length > 160) parts.splice(0, parts.length - 160);
    requestFx();
  }
  function confetti() {
    const el = $('#wzConf'); el.innerHTML = '';
    for (let i = 0; i < 46; i++) {
      const e = document.createElement('i'), w = 7 + Math.random() * 6;
      e.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;width:${w.toFixed(0)}px;height:${(w * .55).toFixed(0)}px;background:${COLS[i % COLS.length]};animation-duration:${(2.2 + Math.random() * 1.4).toFixed(2)}s;animation-delay:${(Math.random() * .6).toFixed(2)}s;--dx:${((Math.random() - .5) * 80).toFixed(0)}px;--r:${(360 + Math.random() * 720).toFixed(0)}deg`;
      el.appendChild(e);
    }
    clearTimeout(confT); confT = setTimeout(() => { el.innerHTML = ''; }, 4500);
  }
  let confT = 0;

  /* ================= the word list and the header ================= */
  function renderList() {
    if (!P) return;
    const order = P.words.map((p, k) => k).sort((a, b) => P.words[a].w.localeCompare(P.words[b].w));
    $('#wzList').innerHTML = order.map(k => {
      const j = G ? G.found.indexOf(k) : -1, f = j >= 0;
      return `<div class="wz-w${f ? ' f' : ''}${G && G.phase === 'play' && !f && G.hint[k] ? ' hint' : ''}" data-k="${k}"${f ? ` style="--c:${COLS[j % COLS.length]}"` : ''}><i></i><span>${esc(P.words[k].w)}</span></div>`;
    }).join('');
    hud();
  }
  function hud() {
    if (!P) return;
    const th = thOf(P.th);
    $('#wzTitle').textContent = `${th.ic} ${th.name}`;
    $('#wzSub').textContent = LEVELS[P.lv].name + (G && G.daily ? ' · Dagpuzzel' : '') + (G && G.preview ? '' : '');
    $('#wzCount').textContent = `${G ? G.found.length : 0}/${P.words.length}`;
    $('#wzTheme').textContent = P.secret ? '🤫 met geheim woord' : P.lv === 3 ? '🎭 met lokwoorden' : '';
    const hn = $('#wzHintN'); hn.textContent = G && G.hints ? G.hints : ''; hn.classList.toggle('on', !!(G && G.hints));
    const sec = !!(G && (G.phase === 'secret' || (G.phase === 'done' && P.secret && G.tiles)));
    $('#wzSecret').hidden = !sec; $('#wzList').hidden = sec;
    showClock();
  }
  function showClock() { $('#wzClock').textContent = fmtTime(G ? G.time : 0); }
  let toastT = 0;
  function toast(t, ms = 2400) { const el = $('#wzToast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }

  /* ================= the clock: runs only while you can play ================= */
  let clockT = 0, lastTick = 0;
  const running = () => current === 'wz' && P && G && !G.preview && (G.phase === 'play' || G.phase === 'secret') && !document.hidden && !anyModal();
  function tick() {
    const t = performance.now(), dt = (t - lastTick) / 1000; lastTick = t;
    if (G && running() && dt > 0 && dt < 5) G.time += dt;
    if (G && !Number.isFinite(G.time)) G.time = 0;
    showClock();
  }
  function startClock() { lastTick = performance.now(); clearInterval(clockT); clockT = setInterval(tick, 500); showClock(); }
  function stopClock() { if (clockT) tick(); clearInterval(clockT); clockT = 0; }

  /* ================= playing ================= */
  function pickTheme() {
    if (opt.theme) return opt.theme;
    const recent = stats.recent || [], free = THEMES.filter(t => !recent.includes(t.id));
    const th = (free.length ? free : THEMES)[Math.floor(Math.random() * (free.length || THEMES.length))].id;
    stats.recent = [th, ...recent.filter(x => x !== th)].slice(0, 8);
    return th;
  }
  function begin(p, daily) {
    if (!p) { toast('Er ging iets mis bij het maken van de puzzel. Probeer het nog eens.'); return; }
    closeModals(); $('#wzConf').innerHTML = ''; clearTimeout(toastT); $('#wzToast').classList.remove('show');
    P = p; G = newG(daily); pend = -1; drag = null; anims = []; parts = [];
    stats.played++; saveStats();
    LY = null; renderList(); fit(true); startClock(); saveNow();
    scr.classList.remove('intro'); void scr.offsetWidth; scr.classList.add('intro');
  }
  function newPuzzle(lv = opt.lv, theme) {
    const seed = (Math.random() * 4294967296) >>> 0;
    begin(generate(lv, seed, theme || pickTheme()) || generate(lv, seed ^ 0x5bd1e995), null);
  }
  function startDaily() { const d = dayStr(); begin(generate(1, dailySeed(d)), d); }
  function restart() { if (!P || !G) return; const daily = G.daily; G = newG(daily); pend = -1; drag = null; anims = []; parts = []; rebuild(); startClock(); save(); }
  function rebuild() { closeModals(); renderList(); renderSecret(); LY = null; fit(true); hud(); }

  // a straight selection from cell a to cell b: a word of the list (once), a word found before, or nothing
  function commit(cells) {
    if (!P || !G || G.phase !== 'play' || cells.length < 2) return -1;
    const a = cells[0], b = cells[cells.length - 1], k = wordAt(P, a, b);
    if (k >= 0 && P.words[k].w.length === cells.length) {
      if (G.found.includes(k)) { sfx('wzDup'); toast(`${P.words[k].w} had je al gevonden.`, 1600); return k; }
      found(k); return k;
    }
    G.wrong++;
    anims.push({ k: 'bad', a, b, t0: T(), dur: .5 }); requestFx(); sfx('wzNo'); vibrate(8);
    if (cells.length >= 3 && G.wrong <= 2) toast('Dat woord staat niet in de lijst.', 1600);
    return -1;
  }
  function found(k) {
    const j = G.found.length, col = COLS[j % COLS.length], c = cellsOf(P.words[k], P.n);
    G.found.push(k); if (G.lastHint === k) G.lastHint = -1;
    stats.words++; saveStats();
    paintBoard(); renderList();
    const el = $(`#wzList [data-k="${k}"]`), lst = $('#wzList');
    if (el) { el.classList.add('new'); const top = el.offsetTop - lst.offsetTop; if (top < lst.scrollTop || top + el.offsetHeight > lst.scrollTop + lst.clientHeight) lst.scrollTop = top - lst.clientHeight / 2; }   // only the list scrolls
    anims.push({ k: 'pop', a: c[0], b: c[c.length - 1], col, t0: T(), dur: .45 }); sparkle(c, col, 12);
    sfx('wzFound'); vibrate(12);
    if (G.found.length === P.words.length) allFound(); else save();
  }
  function allFound() {
    const game = G;
    sfx('wzAll'); vibrate(25);
    P.words.forEach((p, j) => setTimeout(() => { if (G === game && current === 'wz' && LY) { const c = cellsOf(p, P.n); sparkle(c, COLS[j % COLS.length], 4); } }, j * 40));
    if (P.secret) { G.phase = 'secret'; startSecret(); save(); }
    else finish();
  }

  /* ---------- the hidden word ---------- */
  const leftover = () => freeCells(P).map(i => P.grid[i]).join('');
  function startSecret() {
    const L = leftover(); let order = L.split('').map((_, i) => i);
    for (let t = 0; t < 8; t++) { for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } if (order.map(i => L[i]).join('') !== L) break; }
    G.tiles = order; G.slots = []; G.secOk = null;
    paintBoard(); hud(); renderSecret(); fit(true);
  }
  function renderSecret() {
    if (!P || !G || !(G.phase === 'secret' || G.phase === 'done') || !G.tiles) return;
    const L = leftover(); let j = 0;
    $('#wzSlots').className = '';
    // all slots on one line: as wide as fits (a phrase keeps a small gap per space)
    const avail = ($('#wzSecret').clientWidth || 360) - 8, nL = P.secret.replace(/ /g, '').length, nS = P.secret.length - nL;
    const big = document.documentElement.classList.contains('big-text'), sw = Math.max(18, Math.min(big ? 34 : 30, (avail - 4 * (nL + nS - 1) - nS * 10) / nL));
    $('#wzSlots').style.setProperty('--sw', sw.toFixed(1) + 'px');
    $('#wzSlots').innerHTML = P.secret.split('').map(ch => ch === ' ' ? '<b class="sp"></b>' : (() => { const t = G.slots[j++]; return t === undefined ? '<b></b>' : `<b class="on" data-s="${j - 1}">${L[t]}</b>`; })()).join('');
    $('#wzTiles').innerHTML = G.tiles.map(t => `<button data-t="${t}" class="${G.slots.includes(t) ? 'used' : ''}">${L[t]}</button>`).join('');
    $('#wzSecTxt').textContent = `Alle woorden gevonden! De ${L.length} letters die over zijn, vormen samen ${P.secret.includes(' ') ? 'een paar woorden' : 'een woord'}. Tik ze in de goede volgorde.`;
  }
  let secBusy = 0;
  function tapTile(t) {
    if (!G || G.phase !== 'secret' || secBusy || G.slots.includes(t) || !G.tiles.includes(t)) return;
    const L = leftover(); if (G.slots.length >= L.length) return;
    G.slots.push(t); sfx('wzSlot'); renderSecret(); save();
    if (G.slots.length === L.length) checkSecret();
  }
  function checkSecret() {
    const L = leftover(), guess = G.slots.map(t => L[t]).join(''), game = G;
    if (guess === L) { secretDone(true); return; }
    $('#wzSlots').classList.add('bad'); sfx('wzNo'); vibrate(10); secBusy = 1;
    setTimeout(() => { secBusy = 0; if (G !== game || G.phase !== 'secret') return; G.slots = []; renderSecret(); save(); }, 750);
  }
  function secretDone(ok) {
    if (!G || G.phase !== 'secret') return;
    const L = leftover();
    if (!ok) { const used = new Set(); G.slots = L.split('').map(ch => { const t = G.tiles.find(x => !used.has(x) && L[x] === ch); used.add(t); return t; }); }
    G.secOk = ok; renderSecret(); $('#wzSlots').classList.add('good');
    if (ok) { stats.secrets++; saveStats(); sfx('wzSecret'); sparkle(freeCells(P), '#ffd84a', 26); }
    else sfx('wzHint');
    finish();
  }
  function secretHint() {
    const L = leftover(); let j = 0; while (j < G.slots.length && L[G.slots[j]] === L[j]) j++;
    if (j >= L.length) return;
    G.slots.length = j;
    const t = G.tiles.find(x => !G.slots.includes(x) && L[x] === L[j]);
    G.slots.push(t); G.hints++; stats.hints++; saveStats();
    sfx('wzHint'); renderSecret(); hud(); save();
    if (G.slots.length === L.length) checkSecret();
  }

  /* ---------- hints: the first letter of a word lights up; asking again for the same word shows one letter more ---------- */
  function useHint() {
    if (!P || !G || G.preview || anyModal()) return false;
    if (G.phase === 'secret') { if (!secBusy) secretHint(); return true; }
    if (G.phase !== 'play') return false;
    let k = G.lastHint;
    if (k < 0 || G.found.includes(k) || (G.hint[k] || 0) >= P.words[k].w.length - 1) {
      const left = P.words.map((_, i) => i).filter(i => !G.found.includes(i));
      if (!left.length) return false;
      const fresh = left.filter(i => !G.hint[i]);
      k = (fresh.length ? fresh : left)[Math.floor(Math.random() * (fresh.length || left.length))];
    }
    G.hint[k] = Math.min(P.words[k].w.length - 1, (G.hint[k] || 0) + 1); G.lastHint = k;
    G.hints++; stats.hints++; saveStats();
    const cells = cellsOf(P.words[k], P.n).slice(0, G.hint[k]);
    anims = anims.filter(A => A.k !== 'hint'); anims.push({ k: 'hint', cells, t0: T(), dur: 2.8 });
    pend = -1; sfx('wzHint'); paintBoard(); renderList(); requestFx(); save();
    return k;
  }

  /* ---------- the end ---------- */
  function finish() {
    const game = G, lv = LEVELS[P.lv].id, t = Math.max(1, Math.round(G.time));
    G.phase = 'done'; stopClock(); pend = -1; drag = null;
    stats.solved++; stats.byLv[lv] = (stats.byLv[lv] || 0) + 1; stats.time = (stats.time || 0) + t;
    const prev = stats.best[lv] || 0, rec = !prev || t < prev; if (rec) stats.best[lv] = t;
    if (G.daily && !stats.daily[G.daily]) { stats.dailyWon++; stats.daily[G.daily] = t; const ks = Object.keys(stats.daily).sort(); while (ks.length > 60) delete stats.daily[ks.shift()]; }
    if (P.lv === 3 && !G.hints) stats.expNoHint = (stats.expNoHint || 0) + 1;
    if (P.lv >= 1 && t <= 180) stats.fast = (stats.fast || 0) + 1;
    saveStats(); store.del('wz.save');
    G.res = { t, rec, prev };
    paintBoard(); hud();
    setTimeout(() => { if (G === game && current === 'wz') confetti(); }, 250);
    setTimeout(() => { if (G === game && current === 'wz') openEnd(); }, P.secret ? 1700 : 1300);
  }
  function openEnd() {
    if (!G || !G.res) return;
    const { t, rec, prev } = G.res, lvn = LEVELS[P.lv].name;
    $('#wzEndEmoji').textContent = rec && prev ? '🏆' : G.secOk ? '🤫' : '🎉';
    $('#wzEndTitle').textContent = G.daily ? 'Dagpuzzel opgelost!' : rec && prev ? 'Nieuw record!' : 'Opgelost!';
    $('#wzEndStats').innerHTML = `<div><b>${fmtTime(t)}</b><small>Tijd</small></div><div><b>${G.hints}</b><small>${G.hints === 1 ? 'Hint' : 'Hints'}</small></div><div class="${rec ? 'rec' : ''}"><b>${fmtTime(stats.best[LEVELS[P.lv].id])}</b><small>Beste ${esc(lvn.toLowerCase())}</small></div>`;
    let tx = `Alle ${P.words.length} woorden gevonden.`;
    if (P.secret) tx += `<br>Geheim woord: <b>${esc(P.secret)}</b>` + (G.secOk ? ' <span class="wz-gold">geraden! 🤫</span>' : '');
    if (rec && prev) tx += `<br><span class="wz-gold">${fmtTime(prev - t)} sneller dan je vorige record</span>`;
    $('#wzEndText').innerHTML = tx;
    openModal('wzEndModal');
  }

  /* ================= input: drag from the first to the last letter, or tap the first and then the last ================= */
  let drag = null, pend = -1;
  function cellAt(e) {
    const r = cvF.getBoundingClientRect(), k = LY.gs / (r.width || LY.gs), x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;   // k: the board may be scaled (intro animation)
    const fc = (x - LY.pad) / LY.cs - .5, fr = (y - LY.pad) / LY.cs - .5, c = Math.round(fc), rw = Math.round(fr);
    return { fr, fc, i: rw >= 0 && rw < P.n && c >= 0 && c < P.n ? rw * P.n + c : -1 };
  }
  cvF.addEventListener('pointerdown', e => {
    if (!P || !G || !LY || G.phase !== 'play' || G.preview || anyModal() || drag) return;
    e.preventDefault();
    const h = cellAt(e); if (h.i < 0) return;
    try { cvF.setPointerCapture(e.pointerId); } catch (er) { /* no capture: fine */ }
    drag = { id: e.pointerId, a: h.i, fr: Math.floor(h.i / P.n), fc: h.i % P.n, sel: [h.i], moved: false };
    requestFx();
  });
  cvF.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id || !P) return;
    const h = cellAt(e);
    if (!drag.moved && Math.hypot(h.fr - drag.fr, h.fc - drag.fc) < .55) return;
    if (!drag.moved) { drag.moved = true; pend = -1; }
    const sel = snapLine(P.n, drag.a, h.fr, h.fc);
    if (sel.length !== drag.sel.length || sel[sel.length - 1] !== drag.sel[drag.sel.length - 1]) { drag.sel = sel; if (sel.length > 1) sfx('wzTick' + Math.min(8, sel.length - 1)); requestFx(); }
  });
  function endDrag(e, cancel) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag; drag = null;
    if (cancel || !G || G.phase !== 'play') { requestFx(); return; }
    if (d.moved) { if (d.sel.length >= 2) commit(d.sel); requestFx(); return; }
    // a tap: the first letter, then the last one
    const i = d.a;
    if (pend < 0) { pend = i; sfx('wzTap'); }
    else if (pend === i) pend = -1;
    else {
      const r = Math.floor(i / P.n), c = i % P.n, line = snapLine(P.n, pend, r, c);
      if (line[line.length - 1] === i) { pend = -1; commit(line); }
      else { pend = i; sfx('wzTap'); }
    }
    requestFx();
  }
  cvF.addEventListener('pointerup', e => endDrag(e, false));
  cvF.addEventListener('pointercancel', e => endDrag(e, true));
  cvF.addEventListener('lostpointercapture', e => { if (drag && e.pointerId === drag.id) endDrag(e, false); });

  // buttons in the game answer on pointerup: Chrome drops the click of a tap that comes right after a swipe on the grid (it is taken as
  // stopping a fling), and of quick taps in a row. click stays for mouse and keyboard.
  function onTap(root, sel, fn) {
    let dn = null, last = 0;
    root.addEventListener('pointerdown', e => { dn = e.target.closest(sel); });
    root.addEventListener('pointercancel', () => { dn = null; });
    root.addEventListener('pointerup', e => { const el = e.target.closest(sel); if (el && el === dn) { last = performance.now(); fn(el); } dn = null; });
    root.addEventListener('touchend', e => { if (performance.now() - last < 100 && e.cancelable) e.preventDefault(); }, { passive: false });   // no ghost click on what appears under the finger
    root.addEventListener('click', e => { const el = e.target.closest(sel); if (el && performance.now() - last > 600) fn(el); });
  }
  onTap($('#wzTiles'), 'button[data-t]', b => tapTile(+b.dataset.t));
  onTap($('#wzSlots'), 'b[data-s]', b => { if (!G || G.phase !== 'secret' || secBusy) return; G.slots.length = +b.dataset.s; sfx('wzTap'); renderSecret(); save(); });
  onTap($('#wzSecClear'), 'button', () => { if (!G || G.phase !== 'secret' || secBusy) return; G.slots = []; renderSecret(); save(); });
  onTap($('#wzSecShow'), 'button', () => { if (!G || G.phase !== 'secret' || secBusy) return; secretDone(false); });
  $('#wzList').addEventListener('click', e => { const w = e.target.closest('.wz-w'); if (w && w.classList.contains('f')) { const k = +w.dataset.k, j = G.found.indexOf(k), c = cellsOf(P.words[k], P.n); anims.push({ k: 'pop', a: c[0], b: c[c.length - 1], col: COLS[j % COLS.length], t0: T(), dur: .5 }); requestFx(); } });
  onTap($('#wzHint'), 'button', () => { if (G && G.phase === 'done') return; useHint(); });
  onTap($('#wzBack'), 'button', () => leave());
  onTap($('#wzMenu'), 'button', () => openStart());
  onTap($('#wzRetry'), 'button', async () => {
    if (!P || !G || G.preview || G.phase === 'done') return;
    if ((G.found.length || G.hints) && !(await askConfirm('Opnieuw beginnen?', 'Je begint deze puzzel opnieuw: alle gevonden woorden en de tijd gaan terug naar nul.', 'Opnieuw'))) return;
    restart();
  });
  window.addEventListener('resize', () => { if (current === 'wz') setTimeout(() => fit(), 60); });

  /* ================= save / resume ================= */
  let saveTm = 0;
  const live = () => !!(P && G && !G.preview && G.phase !== 'done');
  function saveNow() {
    clearTimeout(saveTm); saveTm = 0;
    if (!live()) return;
    store.set('wz.save', { v: CORE_V, P: Object.assign({}, P, { grid: P.grid.join('') }), G: Object.assign({}, G, { res: undefined }) });
  }
  const save = () => { clearTimeout(saveTm); saveTm = setTimeout(saveNow, 300); };
  document.addEventListener('visibilitychange', () => { if (current !== 'wz') return; if (document.hidden) { tick(); saveNow(); } else lastTick = performance.now(); });
  function restoreSaved(sv) {
    const p = Object.assign({}, sv.P, { grid: String(sv.P.grid).split('') });
    if (!LEVELS[p.lv] || !THEMES.some(t => t.id === p.th) || verify(p).length) throw new Error('save');
    const g = Object.assign(newG(), sv.G);
    g.found = [...new Set((g.found || []).filter(k => Number.isInteger(k) && k >= 0 && k < p.words.length))];
    if (!Number.isFinite(g.time) || g.time < 0) g.time = 0;
    if (!['play', 'secret'].includes(g.phase)) g.phase = 'play';
    if (g.phase === 'secret' && (!p.secret || g.found.length !== p.words.length)) g.phase = 'play';
    if (g.phase === 'play' && g.found.length === p.words.length) g.phase = p.secret ? 'secret' : 'play';
    const L = freeCells(p).length;
    if (g.phase === 'secret' && !(Array.isArray(g.tiles) && g.tiles.length === L && new Set(g.tiles).size === L && g.tiles.every(t => t >= 0 && t < L))) { g.tiles = null; }
    g.slots = Array.isArray(g.slots) && g.tiles ? g.slots.filter((t, i, a) => g.tiles.includes(t) && a.indexOf(t) === i) : [];
    g.hint = g.hint && typeof g.hint === 'object' ? g.hint : {};
    P = p; G = g; pend = -1; drag = null; anims = []; parts = [];
    if (G.phase === 'secret' && !G.tiles) startSecret();
  }
  function preview() {                                            // a puzzle behind the start dialog
    P = generate(opt.lv, 20240 + opt.lv); G = Object.assign(newG(), { preview: true }); pend = -1; drag = null;
    LY = null; renderList(); fit(true);
  }

  /* ================= start dialog ================= */
  function renderStart() {
    const img = $('#wzHeroImg'); if (!img.src && typeof GameIcons !== 'undefined') img.src = GameIcons.url('wz');
    const lv = live();
    $('#wzCont').hidden = !lv;
    if (lv) $('#wzCont').innerHTML = `<span class="ic">${thOf(P.th).ic}</span><span class="tx"><b>Verder spelen</b><small>${esc(thOf(P.th).name)} · ${LEVELS[P.lv].name} · ${G.found.length}/${P.words.length} gevonden · ${fmtTime(G.time)}</small></span><em>Verder ▶</em>`;
    const d = dayStr(), dn = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }), done = stats.daily[d];
    $('#wzDaily').innerHTML = `<span class="ic">📅</span><span class="tx"><b>Puzzel van de dag</b><small>${esc(dn)} · Normaal · voor iedereen dezelfde</small></span><em>${done ? '✓ ' + fmtTime(done) : 'Speel ▶'}</em>`;
    $('#wzDaily').classList.toggle('done', !!done);
    $('#wzLevels').innerHTML = LEVELS.map((L, i) => `<button data-lv="${i}" class="${opt.lv === i ? 'on' : ''}"><b>${L.name}</b><small>${L.desc}</small><em>${stats.best[L.id] ? '🏆 ' + fmtTime(stats.best[L.id]) : '&nbsp;'}</em></button>`).join('');
    const th = opt.theme ? thOf(opt.theme) : null;
    $('#wzThemeSum').textContent = 'Thema: ' + (th ? `${th.ic} ${th.name}` : '🎲 Verrassing');
    $('#wzThemes').innerHTML = `<button data-th="" class="${!opt.theme ? 'on' : ''}">🎲 Verrassing</button>` + THEMES.map(t => `<button data-th="${t.id}" class="${opt.theme === t.id ? 'on' : ''}">${t.ic} ${esc(t.name)}</button>`).join('');
    $('#wzOpts').innerHTML = [['sound', 'Geluidseffecten'], ['music', 'Achtergrondmuziek']]
      .map(([k, l]) => `<div class="opt"><div class="opt-label">${l}</div><div class="seg">${[[true, 'Aan'], [false, 'Uit']].map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${(opt[k] !== false) === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`).join('');
    $('#wzStats').innerHTML = [['Opgelost', stats.solved], ['Woorden', stats.words], ['Geheime woorden', stats.secrets]].map(([l, v]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join('');
    $('#wzGo').textContent = `${LEVELS[opt.lv].name} ▶`;
  }
  function openStart() { pend = -1; drag = null; requestFx(); renderStart(); openModal('wzStartModal'); }
  async function confirmNew() { return !(live() && (G.found.length || G.hints)) || await askConfirm('Nieuwe puzzel?', 'Je stopt met de puzzel die je nu speelt.', 'Nieuwe puzzel'); }
  $('#wzLevels').addEventListener('click', e => { const b = e.target.closest('button[data-lv]'); if (!b) return; opt.lv = +b.dataset.lv; saveOpt(); renderStart(); });
  $('#wzThemes').addEventListener('click', e => { const b = e.target.closest('button[data-th]'); if (!b) return; opt.theme = b.dataset.th; saveOpt(); renderStart(); });
  $('#wzOpts').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; opt[b.dataset.k] = b.dataset.v === 'true'; saveOpt(); renderStart(); Sfx.refresh && Sfx.refresh(); });
  $('#wzGo').addEventListener('click', async () => { if (await confirmNew()) newPuzzle(opt.lv); else openStart(); });
  $('#wzDaily').addEventListener('click', async () => { if (G && G.daily === dayStr() && live()) { closeModals(); return; } if (await confirmNew()) startDaily(); else openStart(); });
  $('#wzCont').addEventListener('click', () => { closeModals(); lastTick = performance.now(); });
  $('#wzStartBack').addEventListener('click', () => { closeModals(); leave(); });
  $('#wzEndMenu').addEventListener('click', () => { closeModals(); openStart(); });
  $('#wzEndNext').addEventListener('click', () => { const d = G && G.daily; newPuzzle(d ? 1 : P ? P.lv : opt.lv); });

  function enter() {
    show('wz');
    const sv = store.get('wz.save', null);
    if ((!P || !G || G.preview || G.phase === 'done') && sv && sv.P) { try { restoreSaved(sv); } catch (e) { P = null; G = null; store.del('wz.save'); } }
    if (live()) { rebuild(); startClock(); requestAnimationFrame(() => fit()); if (G.phase === 'play' && G.found.length === P.words.length) allFound(); }
    else { preview(); openStart(); }
  }
  function leave() {
    tick(); saveNow(); stopClock(); closeModals();
    $('#wzConf').innerHTML = ''; clearTimeout(toastT); $('#wzToast').classList.remove('show');
    drag = null; pend = -1; anims = []; parts = [];
    if (G && (G.phase === 'done' || G.preview)) { P = null; G = null; }
    show('menu'); refreshMenu();
  }

  /* ================= test hooks ================= */
  window.__wz = {
    get P() { return P; }, get G() { return G; }, get LY() { return LY; }, LEVELS, THEMES, opt, stats: () => stats,
    generate, verify, cellsOf, freeCells, wordAt, snapLine, newPuzzle, startDaily, restart, useHint, commit, tapTile, leftover, fit, enter, leave,
    cur: () => current, loopOn: () => !!raf, clockOn: () => !!clockT, frames: () => frames.slice(), busy: () => anims.length + parts.length,
    begin: (lv, seed, th) => begin(generate(lv, seed, th), null),
    // the middle of cell i on the screen
    xy(i) { const r = cvF.getBoundingClientRect(), k = r.width / LY.gs, [x, y] = cellXY(i); return { x: r.left + x * k, y: r.top + y * k }; },
    drawMs: () => drawHist.slice(),
    // the view must agree with the rules state (call when nothing moves)
    check() {
      const bad = [];
      if (!P) return bad;
      if (!LY || ![LY.gs, LY.cs, LY.pad].every(Number.isFinite)) bad.push('layout');
      if (G && !Number.isFinite(G.time)) bad.push('time');
      if (anims.some(A => !Number.isFinite(A.t0) || !Number.isFinite(A.dur))) bad.push('anim time');
      if (G && painted.found !== G.found.length) bad.push('board paints ' + painted.found + ' of ' + G.found.length);
      if (G && painted.phase !== G.phase) bad.push('board phase ' + painted.phase + ' vs ' + G.phase);
      const items = [...document.querySelectorAll('#wzList .wz-w')];
      if (items.length !== P.words.length) bad.push('list length');
      for (const el of items) { const k = +el.dataset.k; if (el.classList.contains('f') !== !!(G && G.found.includes(k))) bad.push('list ' + P.words[k].w); }
      if (G && new Set(G.found).size !== G.found.length) bad.push('found twice');
      if ($('#wzCount').textContent !== `${G ? G.found.length : 0}/${P.words.length}`) bad.push('count');
      if (G && ($('#wzSecret').hidden !== !(G.phase === 'secret' || (G.phase === 'done' && P.secret && G.tiles)))) bad.push('secret panel');
      const shown = id => getComputedStyle($(id)).display !== 'none';
      if (shown('#wzSecret') === shown('#wzList')) bad.push('list and hidden-word panel both ' + (shown('#wzList') ? 'shown' : 'hidden'));
      if (G && G.phase === 'secret') { const L = leftover(); if (document.querySelectorAll('#wzTiles button').length !== L.length) bad.push('tiles'); if (document.querySelectorAll('#wzSlots b.on').length !== G.slots.length) bad.push('slots'); }
      return bad;
    },
  };
  return { enter, leave, hasSave: () => !!store.get('wz.save', null) };

})();
$('#tileWz').addEventListener('click', () => Woordzoeker.enter());
