// Feedback-ontvanger voor Rene's spelletjes (Cloudflare Worker).
// De app stuurt feedback hierheen; de worker maakt er een GitHub-issue van in een PRIVÉ repository.
// Geheimen (GITHUB_TOKEN) staan alleen in Cloudflare, nooit in de app.
const MAX = 20000;
const TYPES = { idee: '💡 Idee', probleem: '🐞 Probleem', compliment: '❤️ Compliment' };

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === 'GET') return new Response('Rene\'s spelletjes feedback: ok', { status: 200 });
    if (req.method !== 'POST' || url.pathname !== '/feedback') return new Response('Not found', { status: 404 });
    if (req.headers.get('X-App') !== 'renes-spelletjes') return new Response('Forbidden', { status: 403 });

    // eenvoudige limiet: maximaal 10 berichten per uur per IP-adres
    const ip = req.headers.get('CF-Connecting-IP') || 'onbekend';
    const key = new Request(`https://rate.local/${encodeURIComponent(ip)}/${Math.floor(Date.now() / 3600000)}`);
    const cache = caches.default, hit = await cache.match(key), n = hit ? +(await hit.text()) : 0;
    if (n >= 10) return new Response('Too many', { status: 429 });
    ctx.waitUntil(cache.put(key, new Response(String(n + 1), { headers: { 'Cache-Control': 'max-age=3600' } })));

    const text = await req.text();
    if (text.length > MAX) return new Response('Too large', { status: 413 });
    let f; try { f = JSON.parse(text); } catch (e) { return new Response('Bad JSON', { status: 400 }); }
    const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').slice(0, n);
    const msg = clean(f.msg, 2000).trim();
    if (f.app !== 'renes-spelletjes' || msg.length < 3) return new Response('Bad request', { status: 400 });
    const type = TYPES[f.type] ? f.type : 'idee', game = clean(f.game, 20).replace(/[^a-z]/g, ''), version = clean(f.v, 12);
    const rating = Math.max(0, Math.min(5, Math.round(+f.rating || 0)));

    const title = `${TYPES[type]}${game ? ` [${game}]` : ''}: ${msg.replace(/\s+/g, ' ').slice(0, 70)}${msg.length > 70 ? '…' : ''}`;
    const quote = s => s.split('\n').map(l => '> ' + l).join('\n');
    let body = `${quote(msg)}\n\n| | |\n|---|---|\n| Soort | ${TYPES[type]} |\n| Spel | ${game || 'algemeen'} |\n| Waardering | ${rating ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : '–'} |\n| Versie | ${version} |\n| Datum | ${clean(f.t, 30)} |\n| Contact | ${clean(f.contact, 80).replace(/[|<>]/g, '') || '–'} |\n| Id | ${clean(f.id, 24)} |\n`;
    if (f.tech && typeof f.tech === 'object') {
      const t = f.tech, errs = Array.isArray(t.errors) ? t.errors.slice(0, 5) : [];
      body += `\n<details><summary>Technische gegevens</summary>\n\n- Toestel: \`${clean(t.ua, 200)}\`\n- Scherm: ${clean(t.screen, 40)} · Taal: ${clean(t.lang, 12)}\n` +
        (errs.length ? '\nFoutmeldingen:\n```\n' + errs.map(e => `${clean(e.t, 30)} [${clean(e.s, 20)}] ${clean(e.m, 300)} (${clean(e.w, 120)})`).join('\n') + '\n```\n' : '') + '</details>\n';
    }
    const labels = ['feedback', type].concat(game ? ['spel:' + game] : []).concat(version ? ['v' + version] : []);

    const r = await fetch(`https://api.github.com/repos/${env.REPO}/issues`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'renes-spelletjes-feedback', 'X-GitHub-Api-Version': '2022-11-28' },
      body: JSON.stringify({ title, body, labels })
    });
    if (!r.ok) return new Response('GitHub error ' + r.status, { status: 502 });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
};
