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
node games/rkfuzz.mjs
```

Wereldmacht (`rk`) heeft een eigen kaart met 42 landen, twee tot zes spelers, drie computerniveaus, kaarten, dobbelsteengevechten en doorspelen per profiel. Spelers kunnen samen op één toestel spelen. Startlanden en legers worden automatisch verdeeld; bij twee spelers zijn er geen neutrale legers. De opgeslagen toestand bevat de toevalsgenerator, zodat herladen een gevecht niet opnieuw gooit.

Bewerk het spel in `games/rksrc/` en bouw het pakket met `python games/rkbuild.py`. Installeer een nieuw pakket met `python games/addgame.py games/rk.json`; dat hulpmiddel weigert een tweede installatie. Bij een bestaande installatie werkt `rkbuild.py` alleen de gemarkeerde spelcode, stijl en opmaak bij.

De gedeelde opslag-, menu- en toegankelijkheidshulpen staan in `tools/lib/`. Na een wijziging daar werkt `python tools/install_app_improvements.py` alleen de gemarkeerde kopieën in de appbron bij. Voor nieuwe spellen moeten de back-upsleutels en opgeslagen-spelschema's ook worden toegevoegd aan `persistence.js`.

De build behoudt de bestaande Content Security Policy en maakt één offline HTML-bestand. De CI bouwt en test branches en PR's. Na samenvoegen op `main` regelt de Release-workflow versies, ondertekening, webbundel en APK; bewerk de gepubliceerde bestanden nooit met de hand. Native zoomgedrag moet aanvullend op een Android-toestel worden beoordeeld.
