# Ontwikkeling

De bewerkbare app staat in `app/src/main/assets/index.html`. Volg [AGENTS.md](../AGENTS.md) voor samenwerken en publiceren. De bestaande spellen en gedeelde appbron blijven behouden.

```sh
npm ci
npx playwright install chromium
npm run build
npm test
node --test tests/persistence.test.cjs games/rk.test.cjs
node tests/improvements.mjs
node games/rk1.mjs
node games/rk-mobile.mjs
node games/rkfuzz.mjs
```

Wereldmacht (`rk`) heeft een eigen kaart met 42 landen, twee tot zes spelers, drie computerniveaus, kaarten, dobbelsteengevechten en doorspelen per profiel. Spelers kunnen samen op één toestel spelen. Startlanden en legers worden automatisch verdeeld; bij twee spelers zijn er geen neutrale legers. De opgeslagen toestand bevat de toevalsgenerator, zodat herladen een gevecht niet opnieuw gooit.

Bewerk het spel in `games/rksrc/` en bouw het pakket met `python games/rkbuild.py`. Installeer een nieuw pakket met `python games/addgame.py games/rk.json`; dat hulpmiddel weigert een tweede installatie. Bij een bestaande installatie werkt `rkbuild.py` alleen de gemarkeerde spelcode, stijl en opmaak bij.

De geografische kaart staat in `games/rksrc/map.json`; de kaartbediening staat in `map.js`. De 42 spelgebieden behouden hun vaste ids, waardoor bestaande opgeslagen spellen compatibel blijven. De kaart gebruikt de bestaande Natural Earth-kustlijnen van Wereldquiz (publiek domein) met eigen gebiedsgrenzen. Alleen bij aanpassen van de geografie: installeer Shapely 2.x en draai `python games/rkmap.py` om de kaart opnieuw te genereren. De normale appbouw heeft Shapely niet nodig.

De gedeelde opslag-, menu- en toegankelijkheidshulpen staan in `tools/lib/`. Na een wijziging daar werkt `python tools/install_app_improvements.py` alleen de gemarkeerde kopieën in de appbron bij. Voor nieuwe spellen moeten de back-upsleutels en opgeslagen-spelschema's ook worden toegevoegd aan `persistence.js`.

De build behoudt de bestaande Content Security Policy en maakt één offline HTML-bestand. De CI bouwt en test branches en PR's. Na samenvoegen op `main` regelt de Release-workflow versies, ondertekening, webbundel en APK; bewerk de gepubliceerde bestanden nooit met de hand. Native zoomgedrag moet aanvullend op een Android-toestel worden beoordeeld.

Wereldmacht gebruikt een kaart die het speelveld vult, met gebieden in spelerskleuren en legerfiches. Spelacties verschijnen bij het gekozen gebied; de schuifregelaars werken ook met het toetsenbord. De inklapbare bediening, kaartweergaven en landenlijst blijven beschikbaar in staande en liggende stand. Blitz rolt maximaal drie eerlijke dobbelstenen en stopt zodra de gekozen aanvalslegers op zijn; de kansberekening gebruikt alle mogelijke dobbeluitkomsten (tot 200 tegen 200 legers). Nieuwe spellen bieden wereldverovering (42 gebieden) of snelle verovering (30), met oplopende of vaste kaartbonussen. Bestaande spellen zonder `rules` behouden wereldverovering en oplopende bonussen. Alle spelvormen werken lokaal, tegen de computer of samen op één toestel.

De gameplay biedt ook hoofdstedenverovering, geheime missies en startlegers die spelers om de beurt in groepjes van maximaal drie plaatsen. Hoofdsteden verdedigen met drie dobbelstenen en geven twee legers per beurt; het bezit van alle hoofdsteden wint het spel. Missies worden uniek toegewezen en blijven bij lokale beurtwisseling uit de DOM totdat de speler zijn beurt opent. Blitz is één atomaire, opgeslagen spelactie, met een bezettingsvoorstel dat gereserveerde legers achterlaat. De gebalanceerde variant is een eigen wiskundige uitwerking: de volledige kansverdeling van een gevecht, met de uiterste tien procent aan beide kanten verwijderd en een voorkeur voor de middelste uitkomsten. De bijbehorende winstkans is `q²(3−2q)`, waarbij `q = clamp((p−0,1)/0,8)`. Boven een miljoen combinaties van aanvallende en verdedigende legers wordt de middelste uitkomst van drie volledige simulaties gebruikt. Dit verkleint de uitersten; losse worpen blijven gewone dobbelstenen. Het is geen overname van de SMG-blitzcode. Bestaande saves zonder deze keuzeregels blijven met gewone dobbelstenen en hun oorspronkelijke speldoel werken. `rk-gameplay.test.cjs` controleert de regels en kansen; `rkfuzz.mjs` speelt ook 48 volledige spellen met alle combinaties van doelen, dobbel- en opstellingsvormen.
