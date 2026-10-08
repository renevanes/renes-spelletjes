# Feedback-ontvanger voor Rene's spelletjes

De app stuurt feedback naar deze kleine Cloudflare Worker. Die maakt van elk bericht een
GitHub-issue in de privé repository `renevanes/renes-spelletjes-feedback`.

Eenmalig instellen staat in de uitleg die Claude gaf; daarna in `feedback-url.txt` (in de
projectmap) het adres van de worker zetten, bijvoorbeeld
`https://renes-spelletjes-feedback.<jouw-naam>.workers.dev/feedback`, en opnieuw publiceren.
