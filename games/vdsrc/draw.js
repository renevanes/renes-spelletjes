  /* ================= draw.js: camera, stage layers, fighters, projectiles, effects, HUD and banners =================
     Everything is drawn into one canvas. The stage is pre-painted into three layer canvases; text (names, banners,
     the timer) comes from a small sprite cache; effects live in a fixed pool, so a frame allocates next to nothing. */
  const Draw = (() => {
    const TAU = Math.PI * 2, VIEW_H = 440, FLOOR_PAD = 52, TOP = 480, BOT = -100;
    const FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
    /* ---------- text sprites ---------- */
    const TXT = new Map();
    function text(str, px, fill, o = {}) {
      const key = str + '|' + px + '|' + fill + '|' + (o.stroke || '') + '|' + (o.w || 900) + (o.italic ? 'i' : '');
      let s = TXT.get(key); if (s) return s;
      const c = document.createElement('canvas'), g = c.getContext('2d'), sw = o.stroke ? Math.max(2, px * (o.sw || .16)) : 0;
      const font = `${o.italic ? 'italic ' : ''}${o.w || 900} ${px}px ${FONT}`; g.font = font;
      const w = Math.ceil(g.measureText(str).width + sw * 2 + 6), h = Math.ceil(px * 1.3 + sw * 2);
      c.width = w; c.height = h; g.font = font; g.textBaseline = 'middle'; g.textAlign = 'center'; g.lineJoin = 'round';
      if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = sw * 2; g.strokeText(str, w / 2, h / 2); }
      if (Array.isArray(fill)) { const gr = g.createLinearGradient(0, h * .2, 0, h * .8); fill.forEach((f, i) => gr.addColorStop(i / (fill.length - 1), f)); g.fillStyle = gr; } else g.fillStyle = fill;
      g.fillText(str, w / 2, h / 2);
      s = { c, w, h }; if (TXT.size > 400) TXT.clear(); TXT.set(key, s); return s;
    }
    const POWS = ['POW!', 'BAM!', 'KNAL!', 'BOEM!', 'PATS!', 'TOK!', 'WHAM!'];
    /* ---------- projectile sprites (painted once) ---------- */
    const SPR = {};
    function sprite(key, w, h, fn) { if (SPR[key]) return SPR[key]; const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); return (SPR[key] = c); }
    function pjSprite(k) {
      switch (k) {
        case 'golf': return sprite(k, 128, 128, (g, w, h) => { g.translate(64, 64);
          const gr = g.createLinearGradient(-50, 0, 50, 0); gr.addColorStop(0, 'rgba(60,150,230,0)'); gr.addColorStop(.6, '#3fa3ee'); gr.addColorStop(1, '#bfe8ff');
          g.fillStyle = gr; g.beginPath(); g.moveTo(-56, 40); g.quadraticCurveTo(10, 50, 34, 10); g.quadraticCurveTo(48, -30, 14, -52); g.quadraticCurveTo(50, -40, 52, 0); g.quadraticCurveTo(50, 46, -56, 40); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(14, -50); g.quadraticCurveTo(48, -36, 46, 4); g.stroke();
          g.fillStyle = '#fff'; for (const [x, y, r] of [[30, -54, 6], [44, -44, 5], [52, -26, 4], [-20, 44, 4], [4, 46, 5]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } });
        case 'waf': return sprite(k, 64, 64, (g) => { g.translate(32, 32); g.fillStyle = '#c98a3a'; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill(); g.strokeStyle = '#7a4a1a'; g.lineWidth = 3; g.stroke();
          g.save(); g.clip(); g.strokeStyle = 'rgba(110,60,20,.6)'; g.lineWidth = 2.5; for (let x = -30; x < 30; x += 8) { g.beginPath(); g.moveTo(x, -30); g.lineTo(x + 30, 30); g.moveTo(x + 30, -30); g.lineTo(x, 30); g.stroke(); } g.restore();
          g.fillStyle = 'rgba(255,230,160,.4)'; g.beginPath(); g.ellipse(-8, -10, 10, 5, -.6, 0, TAU); g.fill(); });
        case 'vuist': return sprite(k, 140, 64, (g) => { const fl = g.createLinearGradient(0, 0, 80, 0); fl.addColorStop(0, 'rgba(255,90,20,0)'); fl.addColorStop(.6, '#ff8a2a'); fl.addColorStop(1, '#ffe66a');
          g.fillStyle = fl; g.beginPath(); g.moveTo(4, 32); g.quadraticCurveTo(50, 8, 84, 22); g.lineTo(84, 42); g.quadraticCurveTo(50, 56, 4, 32); g.fill();
          g.fillStyle = '#a9bccf'; g.strokeStyle = '#1d1424'; g.lineWidth = 3; g.beginPath(); g.roundRect(78, 14, 40, 36, 10); g.fill(); g.stroke(); g.fillStyle = '#ff8a2a'; g.fillRect(110, 18, 6, 28); g.fillStyle = '#7d90a6'; g.fillRect(70, 20, 10, 24); });
        case 'zout': return sprite(k, 96, 96, (g) => { g.translate(48, 48); for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 8 + (i * 7) % 30; g.fillStyle = `rgba(255,255,255,${.5 + (i % 3) * .2})`; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r * .8, 3 + (i % 4), 0, TAU); g.fill(); }
          g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill(); });
        case 'ster': return sprite(k, 48, 48, (g) => { g.translate(24, 24); g.fillStyle = '#c9d2e0'; g.strokeStyle = '#1d1424'; g.lineWidth = 2.4; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 6 : 20, a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#3a3a4a'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); });
        case 'klap': return sprite(k, 120, 80, (g) => { const gr = g.createLinearGradient(0, 80, 0, 0); gr.addColorStop(0, '#ffcf3a'); gr.addColorStop(1, 'rgba(255,140,40,0)'); g.fillStyle = gr;
          g.beginPath(); g.moveTo(0, 80); g.quadraticCurveTo(30, 10, 60, 0); g.quadraticCurveTo(90, 10, 120, 80); g.fill(); g.fillStyle = '#8a6a4a'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(14 + i * 13, 64 - (i % 3) * 14, 5, 0, TAU); g.fill(); } });
        case 'nevel': return sprite(k, 112, 112, (g) => { g.translate(56, 56); const gr = g.createRadialGradient(0, 0, 4, 0, 0, 54); gr.addColorStop(0, '#fff'); gr.addColorStop(.25, '#e0a0ff'); gr.addColorStop(.6, 'rgba(150,60,220,.75)'); gr.addColorStop(1, 'rgba(90,30,160,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 54, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, 22 + i * 9, i * 2, i * 2 + 2); g.stroke(); } });
      }
      return null;
    }
    /* ---------- the renderer ----------
       Most of what moves is composited, not painted: the stage layers and their animated bits (sails, boats,
       lanterns...) are canvases painted once and moved with CSS transforms; each fighter has its own small canvas that
       gets a cached pose bitmap only when the pose changes; projectiles are images; the HUD, banners and texts are
       HTML. Only sparks, dust, afterimages and dizzy stars are drawn per frame, as small bitmaps on one canvas. */
    function create(cv, host) {
      const g = cv.getContext('2d');
      const css = 'position:absolute;left:0;top:0;pointer-events:none;transform-origin:0 0';
      const el = (tag, extra, cls) => { const e = document.createElement(tag); e.style.cssText = css + ';' + (extra || ''); if (cls) e.className = cls; return e; };
      const shadows = [0, 1].map(() => el('div', 'width:100px;height:24px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.42),rgba(0,0,0,.25) 60%,rgba(0,0,0,0));will-change:transform,opacity'));
      const dimEl = el('div', 'width:100%;height:100%;background:rgba(8,4,20,.58);opacity:0;transition:opacity .12s');
      const raysEl = el('div', 'width:200px;height:200px;border-radius:50%;opacity:0;background:repeating-conic-gradient(rgba(255,220,90,.28) 0deg 9deg,rgba(255,220,90,0) 9deg 30deg);will-change:transform;transform-origin:100px 100px');
      const fcs = [0, 1].map(() => el('div', ''));   // one holder per fighter; each cached pose is its own canvas in it
      const pjLayer = el('div', 'width:100%;height:100%;overflow:hidden');
      const fxLayer = el('div', 'width:100%;height:100%;overflow:hidden'), afterLayer = el('div', 'width:100%;height:100%;overflow:hidden');
      const flashEl = el('div', 'width:100%;height:100%;background:#fff;opacity:0');
      const hud = document.createElement('div'); hud.className = 'vdh';
      hud.innerHTML = [0, 1].map(i => `<div class="vdh-side ${i ? 'r' : 'l'}"><div class="vdh-bar"><b></b><i></i></div><div class="vdh-row"><span class="vdh-name"></span><span class="vdh-meter"><i></i><em>SUPER</em></span><span class="vdh-stars"><s></s><s></s></span></div></div>`).join('')
        + '<div class="vdh-timer"></div><div class="vdh-combo l"></div><div class="vdh-combo r"></div><div class="vdh-super"></div><div class="vdh-ban"></div><div class="vdh-ban"></div><div class="vdh-inputs"></div>';
      // order: stage layers, shadows, dim, rays, afterimages, fighters, projectiles, effects, (VS canvas), HUD, flash
      for (const e of [...shadows, dimEl, raysEl, afterLayer, ...fcs, pjLayer, fxLayer]) host.insertBefore(e, cv);
      cv.after(hud); hud.after(flashEl);
      const H$ = q => hud.querySelector(q), sides = [...hud.querySelectorAll('.vdh-side')].map(s => ({ s, bar: s.querySelector('.vdh-bar'), tr: s.querySelector('.vdh-bar b'), hp: s.querySelector('.vdh-bar i'), nm: s.querySelector('.vdh-name'),
        mt: s.querySelector('.vdh-meter'), mi: s.querySelector('.vdh-meter i'), st: [...s.querySelectorAll('.vdh-stars s')], k: {} }));
      const timerEl = H$('.vdh-timer'), comboEls = [...hud.querySelectorAll('.vdh-combo')], superEl = H$('.vdh-super'), banEls = [...hud.querySelectorAll('.vdh-ban')], inputsEl = H$('.vdh-inputs');
      // per fighter: the pose shown (s), the element showing it (el) and a 'fresh' canvas for poses whose image is not ready yet
      const fstate = fcs.map(c => { const fc = el('canvas', 'will-change:transform;visibility:hidden'); fc.width = fc.height = 2; c.appendChild(fc); return { c, fc, fg: fc.getContext('2d'), fresh: null, fw: 0, fh: 0, s: null, el: null, vis: '' }; });
      const unshow = f => { if (f.el) f.el.style.visibility = 'hidden'; f.el = null; f.s = null; };
      const R = { cv, g, fcs, hud, layerEls: {}, W: 1, H: 1, dpr: 1, cd: 1, hi: false, zb: 1, z: 1, camX: 600, shakeT: 0, shakeA: 0, stage: null, layers: null, fx: [], t: 0,
        after: [[], []], optShake: true, poseEvery: 2, level: 0, budget: 1, trail: [1, 1], cvDirty: true, order: '', sprites: [], tick: null, banI: 0, hk: {} };
      for (let i = 0; i < 160; i++) R.fx.push({ on: false });
      function sizeCv() { R.cd = R.hi ? R.dpr : Math.min(1, R.dpr); cv.width = Math.round(R.W * R.cd); cv.height = Math.round(R.H * R.cd); R.cvDirty = true; }
      R.resize = (W, H, dpr) => {
        R.W = W; R.H = H; R.dpr = dpr; sizeCv();
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        R.zb = H / VIEW_H; R.floorY = H - FLOOR_PAD * R.zb; R.layers = null; R.hk = {};
        hud.style.setProperty('--s', Math.min(1.25, Math.max(.7, H / 400)).toFixed(3));
        const S = R.zb * Math.min(dpr, 1.6) * (R.level >= 2 ? .72 : 1.02); if (Math.abs(S - (R.sprS || 0)) > 1e-3) { R.sprS = S; flushSprites(); } R.sprBudget = 10e6;
      };
      R.hiRes = on => { if (R.hi !== on) { R.hi = on; sizeCv(); } cv.style.visibility = on ? '' : 'hidden'; };   // only the VS screen draws on the canvas (full resolution)
      R.setStage = id => { R.stage = Stages.S[id] || Stages.S.haven; R.stageId = id; R.layers = null; };
      // A canvas layer is re-sent to the compositor on every frame, so everything painted once becomes an <img>
      // (blob URL) as soon as it is encoded and decoded; until then the canvas itself is shown.
      // (encoded off the main thread by toBlob; read back as a data URL, which costs less than a blob URL here)
      function blobImg(c, done) {
        if (!c.toBlob || typeof FileReader === 'undefined' || window.__vdNoImg) return;
        c.toBlob(b => { if (!b) return; const fr = new FileReader();
          fr.onload = () => { const im = new Image(); im.src = fr.result; (im.decode ? im.decode() : Promise.resolve()).then(() => done(im, null), () => {}); };
          fr.readAsDataURL(b); });
      }
      function toImg(c, apply) { blobImg(c, im => { if (!c.isConnected) return; im.style.cssText = c.style.cssText; c.replaceWith(im); apply(im, null); }); }
      const unuse = o => { o.c.remove(); };
      function buildLayers() {
        const zr = Math.min(R.zb * 1.1 * R.dpr, 1.6), half = R.W / (2 * R.zb) + 30, L = { zr };
        for (const s of R.sprites) unuse(s); R.sprites = [];
        for (const [name, p] of [['far', .25], ['mid', .55], ['floor', 1]]) {
          const u0 = Math.floor(half * p - half - 20), u1 = Math.ceil((Core.SW - half) * p + half + 20), c = document.createElement('canvas');
          c.width = Math.ceil((u1 - u0) * zr); c.height = Math.ceil((TOP - BOT) * zr);
          const lg = c.getContext('2d'); lg.setTransform(zr, 0, 0, -zr, -u0 * zr, TOP * zr);
          try { R.stage[name](lg, u0, u1); } catch (e) { console.error(e); }
          L[name] = { c, u0, u1, p, tf: '' };
          const old = R.layerEls[name]; if (old) old.remove();
          c.style.cssText = css + ';will-change:transform'; R.layerEls[name] = c;
          toImg(c, im => { L[name].c = im; if (R.layerEls[name] === c) R.layerEls[name] = im; });
          host.insertBefore(c, shadows[0]);
        }
        R.layers = L;
        // the stage's moving bits: little canvases painted once, placed every frame
        const before = { far: L.mid.c, mid: L.floor.c, floor: shadows[0] };
        const add = (layer, box, paint) => {
          const c = document.createElement('canvas'), w = Math.max(1, Math.ceil((box[2] - box[0]) * zr)), h = Math.max(1, Math.ceil((box[3] - box[1]) * zr));
          c.width = w; c.height = h; const sg = c.getContext('2d'); sg.setTransform(zr, 0, 0, -zr, -box[0] * zr, box[3] * zr);
          try { paint(sg); } catch (e) { console.error(e); }
          c.style.cssText = css + ';will-change:transform';
          host.insertBefore(c, before[layer]);
          const s = { c, l: L[layer], box, u: 0, y: 0, rot: 0, sx: 1, sy: 1, op: 1, tf: '', ops: '1', set(u, y, rot = 0, sx = 1, sy = 1, op = 1) { this.u = u; this.y = y; this.rot = rot; this.sx = sx; this.sy = sy; this.op = op; } };
          R.sprites.push(s); toImg(c, im => { s.c = im; }); return s;
        };
        R.tick = null; try { R.tick = R.stage.sprites ? R.stage.sprites(add, L) : null; } catch (e) { console.error(e); }
      }
      R.reset = () => { R.fx.forEach(fxFree); AFT.forEach(afterOff); STEL.forEach(e => { if (!e.style.visibility) e.style.visibility = 'hidden'; }); R.shakeT = 0; R.snap = true; R.trail = [1, 1]; R.hk = {};
        banEls.forEach(b => { b.className = 'vdh-ban'; }); comboEls.forEach(c => { c.className = c.className.replace(/ pop/, ''); }); superEl.className = 'vdh-super'; inputsEl.textContent = ''; flashEl.style.opacity = '0'; dimEl.style.opacity = '0'; raysEl.style.opacity = '0'; };
      R.clearHud = () => { hud.style.visibility = 'hidden'; };
      R.layersVisible = on => { const v = on ? '' : 'hidden'; for (const k in R.layerEls) R.layerEls[k].style.visibility = v; for (const s of R.sprites) s.c.style.visibility = v; for (const e of [hud, pjLayer, fxLayer, afterLayer, ...shadows, ...fcs, dimEl, raysEl]) e.style.visibility = v; if (on) fstate.forEach(f => { f.vis = ''; }); };
      // ---- effects ----
      // every effect is a small pooled DOM element (img or div) with its own compositor layer: only those little
      // rectangles change on screen, never a full-screen canvas
      function fx(type, x, y, o) { let f = null; for (const e of R.fx) if (!e.on) { f = e; break; } if (!f) { f = R.fx[(Math.random() * R.fx.length) | 0]; fxFree(f); }
        f.on = true; f.type = type; f.x = x; f.y = y; f.t = 0; f.life = o.life || 20; f.vx = o.vx || 0; f.vy = o.vy || 0; f.s = o.s || 1; f.c = o.c || '#fff'; f.a = o.a || 0; f.spr = o.spr || null; f.g = o.g || 0;
        const src = type === 'spark' ? sparkU(f.c) : type === 'ring' ? ringU(f.c | 0) : type === 'block' ? blockU() : type === 'pow' ? f.spr.url : type === 'streak' ? '#' + f.c
          : blobU(type === 'dust' ? '#d8d0c4' : type === 'smoke' ? (f.c !== '#fff' ? f.c : '#e6e2ee') : f.c);
        f.src = src; f.e = fxEl(src); f.bw = type === 'pow' ? f.spr.w : BASE[src] || 64; f.bh = type === 'pow' ? f.spr.h : f.bw; f.ts = ''; f.os = '';
        return f; }
      R.shake = (a, t) => { if (!R.optShake) return; R.shakeA = Math.max(R.shakeA, a); R.shakeT = Math.max(R.shakeT, t); };
      // banners and texts: HTML with CSS animations (the compositor animates them)
      function restart(e, cls) { e.className = cls; void e.offsetWidth; e.className = cls + ' on'; }
      for (const e of [...banEls, ...comboEls, superEl]) e.addEventListener('animationend', () => { e.classList.remove('on'); });   // hidden again: nothing left to composite
      R.banner = (str, o = {}) => { const e = banEls[R.banI++ % 2]; e.textContent = str; e.style.setProperty('--b', (o.big || 1).toFixed(2)); e.style.setProperty('--d', ((o.life || 70) / 60).toFixed(2) + 's'); restart(e, 'vdh-ban ' + (o.kind || 'gold')); };
      R.event = (M, e) => {
        const P = M.P;
        switch (e.t) {
          case 'hit': { const V = P[e.side], a = e.a, heavy = a.heavy;
            V.hl = a.y < 105 ? 'b' : 'h'; V.vflash = 3;
            fx('spark', a.x, a.y, { life: heavy ? 16 : 11, s: heavy ? 1.5 : 1, c: a.kind === 'u' ? 1 : 0 });
            for (let i = 0; i < (heavy ? 7 : 4); i++) { const an = Math.random() * TAU, sp = 3 + Math.random() * 5; fx('streak', a.x, a.y, { vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: 10 + Math.random() * 6, c: i % 2 ? '#ffd23a' : '#fff' }); }
            if (heavy && R.t - (R.powT || -99) > 16) { R.powT = R.t; fx('pow', a.x + (Math.random() - .5) * 30, a.y + 40, { life: 34, spr: textBmp(POWS[(Math.random() * POWS.length) | 0]), a: (Math.random() - .5) * .4 }); }
            if (heavy) R.shake(a.kind === 'u' ? 7 : 5, 10);
            if (a.combo >= 2) { const c = comboEls[1 - e.side]; c.textContent = a.combo + ' treffers!'; restart(c, 'vdh-combo ' + (e.side ? 'l' : 'r')); }
            break; }
          case 'block': fx('block', e.a.x, e.a.y, { life: 12, s: e.a.heavy ? 1.3 : 1 }); break;
          case 'throwhit': fx('spark', e.a.x, e.a.y, { life: 16, s: 1.6 }); R.powT = R.t; fx('pow', e.a.x, e.a.y + 50, { life: 34, spr: textBmp(e.a.last ? 'WORP!' : 'HUP!'), a: -.1 }); R.shake(6, 12); break;
          case 'down': for (let i = 0; i < 6; i++) fx('dust', e.a.x + (Math.random() - .5) * 70, 6, { vx: (Math.random() - .5) * 3, vy: Math.random() * 1.5, life: 26, s: 1 + Math.random() }); R.shake(4, 8); break;
          case 'land': case 'dash': { const F = P[e.side]; for (let i = 0; i < 3; i++) fx('dust', F.x + (Math.random() - .5) * 40, 4, { vx: (Math.random() - .5) * 2, vy: Math.random(), life: 18, s: .7 }); break; }
          case 'clash': fx('ring', e.a.x, e.a.y, { life: 18, s: 1.2 }); fx('spark', e.a.x, e.a.y, { life: 14, s: 1.4 }); break;
          case 'super': { const F = P[e.side]; superEl.textContent = e.a.nm + '!'; restart(superEl, 'vdh-super ' + (e.side ? 'r' : 'l')); fx('ring', F.x, F.y + 110, { life: 40, s: 3, c: 1 }); break; }
          case 'ko': R.flashT = 12; R.shake(9, 22); R.banner('K.O.!', { life: 120, big: 1.5, kind: 'red' }); fx('ring', e.a.x, e.a.y, { life: 30, s: 3.5 }); break;
          case 'round': R.banner(e.a.final ? 'Laatste ronde' : 'Ronde ' + e.a.n, { life: 55 }); break;
          case 'fight': R.banner('Vecht!', { life: 50, big: 1.4 }); break;
          case 'timeup': R.banner('Tijd!', { life: 100, big: 1.3 }); break;
          case 'doubleko': R.banner('Dubbel K.O.!', { life: 100 }); break;
          case 'tech': fx('ring', P[e.side].x, 110, { life: 16, s: 1.2, c: 2 }); R.banner('Losgebroken!', { life: 40, big: .6, kind: 'blue' }); break;
          case 'counter': fx('ring', e.a.x, e.a.y, { life: 20, s: 1.6, c: 1 }); R.banner('Tegenzet!', { life: 40, big: .6 }); break;
          case 'armor': fx('ring', e.a.x, e.a.y, { life: 14, s: 1.1, c: 1 }); break;
          case 'tele': for (let i = 0; i < 10; i++) fx('smoke', e.a.x + (Math.random() - .5) * 50, 40 + Math.random() * 120, { vx: (Math.random() - .5) * 2, vy: Math.random() * 1.5, life: 26, s: 1 + Math.random() }); break;
          case 'dizzy': R.banner('Duizelig!', { life: 40, big: .6, kind: 'blue' }); break;
          case 'pjgone': if (e.a.k === 'waf' || e.a.k === 'klap') fx('dust', e.a.x, 4, { life: 18, s: 1 }); else fx('ring', e.a.x, e.a.y, { life: 10, s: .6 }); break;
          case 'roundend': if (e.a.perfect) R.banner('Perfect!', { life: 90, big: 1.2, kind: 'blue' }); break;
        }
      };
      // ---- camera ----
      function camera(M) {
        const [A, B] = M.P, sep = Math.abs(A.x - B.x);
        const zt = R.zb * (1 + Math.max(0, Math.min(1, (420 - sep) / 300)) * .07), mid = (A.x + B.x) / 2;
        R.z = R.snap ? zt : R.z + (zt - R.z) * .08;
        const half = R.W / (2 * R.z), ct = Math.max(half, Math.min(Core.SW - half, mid));
        R.camX = R.snap ? ct : R.camX + (ct - R.camX) * .18; R.camX = Math.max(half, Math.min(Core.SW - half, R.camX)); R.snap = false;
        R.sx = 0; R.sy = 0;
        if (R.shakeT > 0) { R.shakeT--; R.sx = (Math.random() - .5) * 2 * R.shakeA; R.sy = (Math.random() - .5) * 2 * R.shakeA * .6; R.shakeA *= .9; }
      }
      const W2 = [0, 0], W2S = (x, y) => { W2[0] = R.W / 2 + (x - R.camX) * R.z + R.sx; W2[1] = R.floorY - y * R.z + R.sy; return W2; };
      const f1 = v => Math.round(v * 10) / 10;
      // ---- the frame ----
      const BT = new Float64Array(6), PO = { alpha: 1, after: 0, stars: 0, time: 0, flash: false, vx: 0 };
      R.frame = (M, opt) => {
        R.t++; const t = R.t;
        if (!R.layers) buildLayers();
        camera(M);
        const L = R.layers;
        for (const name of ['far', 'mid', 'floor']) place(L[name]);
        if (R.tick) { try { R.tick(t); } catch (e) {} for (const s of R.sprites) placeSprite(s); }
        // super flash: dim the world, rays behind the one doing the super
        const fl = M.fl; dimEl.style.opacity = fl ? '1' : '0';
        if (fl) { const F = M.P[fl.side], [x, y] = W2S(F.x, F.y + 100), r = Math.max(R.W, R.H) * 1.2; raysEl.style.opacity = '1'; raysEl.style.transform = `translate3d(${f1(x - 100)}px,${f1(y - 100)}px,0) rotate(${(t * 2) % 360}deg) scale(${(r / 100).toFixed(3)})`; }
        else if (raysEl.style.opacity !== '0') raysEl.style.opacity = '0';
        // shadows
        for (let i = 0; i < 2; i++) { const F = M.P[i], [x, y] = W2S(F.x, 0), k = Math.max(.25, 1 - F.y / 260), w = .92 * F.C.W * R.z * k;
          const tf = `translate3d(${f1(x - 50 * w)}px,${f1(y - 10 * w)}px,0) scale(${w.toFixed(3)})`; if (shadows[i].tf !== tf) { shadows[i].tf = tf; shadows[i].style.transform = tf; shadows[i].style.opacity = (k * .95).toFixed(2); } }
        // fighters: the one attacking on top
        const order = M.P[0].st === 'move' || M.P[0].st === 'throw' ? '10' : '01';
        if (order !== R.order) { R.order = order; host.insertBefore(fcs[+order[1]], pjLayer); }
        R.budget = R.level >= 2 ? (t % 2 ? 0 : 1) : R.level >= 1 ? 1 : 2;
        drawFighters(M);
        projectiles(M);
        // effects canvas: only when there is something on it
        if (R.cvDirty && !R.hi) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); R.cvDirty = false; }
        domFx(); afterimages(); stars();
        if (R.flashT > 0) R.flashT--; const fo = R.flashT > 0 ? (R.flashT / 12 * .7).toFixed(2) : '0'; if (flashEl.style.opacity !== fo) flashEl.style.opacity = fo;
        if (!opt.noHud) { if (hud.style.visibility) hud.style.visibility = ''; hudUpdate(M, opt); } else if (!hud.style.visibility) hud.style.visibility = 'hidden';
      };
      function place(l) {                                        // move a layer canvas with a CSS transform
        const z = R.z, k = z / R.layers.zr, x = R.W / 2 + (l.u0 - R.camX * l.p) * z + R.sx, y = R.floorY - TOP * z + R.sy;
        const tf = `translate3d(${f1(x)}px,${f1(y)}px,0) scale(${k.toFixed(5)})`;
        if (tf !== l.tf) { l.tf = tf; l.c.style.transform = tf; }
      }
      function placeSprite(s) {
        const z = R.z, zr = R.layers.zr, k = z / zr, X = R.W / 2 + (s.u - R.camX * s.l.p) * z + R.sx, Y = R.floorY - s.y * z + R.sy;
        const tf = `translate3d(${f1(X)}px,${f1(Y)}px,0)${s.rot ? ` rotate(${(-s.rot).toFixed(1)}deg)` : ''} scale(${(k * s.sx).toFixed(4)},${(k * s.sy).toFixed(4)}) translate(${f1(s.box[0] * zr)}px,${f1(-s.box[3] * zr)}px)`;
        if (tf !== s.tf) { s.tf = tf; s.c.style.transform = tf; }
        const op = s.op >= 1 ? '1' : s.op.toFixed(2); if (op !== s.ops) { s.ops = op; s.c.style.opacity = op; s.c.style.visibility = s.op <= 0 ? 'hidden' : ''; }
      }
      // ---- fighter sprites: every (quantised) pose is painted once into a bitmap ----
      const SPRC = new Map(), BB = new Float64Array(4); let sprPx = 0;
      R.spriteStats = () => ({ n: SPRC.size, px: sprPx, hits: R.hits || 0, miss: R.miss || 0 });
      const PO2 = { alpha: 1, after: 0, stars: 0, time: 0, flash: false, vx: 0 };
      // New poses are painted here, at most a few per frame (R.budget); when the budget is used up the fighter keeps the
      // pose it had for a frame. (Web workers are not allowed by the app's content security policy.) A new pose is shown at
      // once on the fighter's 'fresh' canvas and encoded in the background into an <img>; cached poses are those images,
      // so showing one only flips visibility and nothing is re-uploaded to the compositor.
      function drop(e) { e.dead = true; if (e.c) unuse(e); e.tmp = null; sprPx -= e.px; }
      function trim() { for (const [k2, e] of SPRC) { if (sprPx <= R.sprBudget || SPRC.size <= 8) break; if (fstate[e.i].s === e) continue; SPRC.delete(k2); drop(e); } }
      function toFresh(f, s) {
        const c = f.fc; if (c.width < s.w || c.height < s.h) { c.width = Math.max(c.width, s.w + 40); c.height = Math.max(c.height, s.h + 40); } else f.fg.clearRect(0, 0, f.fw + 1, f.fh + 1);
        f.fg.drawImage(s.tmp, 0, 0); f.fw = s.w; f.fh = s.h; f.fresh = s; c.__tf = '';
      }
      function sprite(i, F, p, flash, force) {
        const C = F.C, f = fstate[i], q = Rig.quant(p), ph = Rig.cloth(C) ? (Math.floor(R.t / 12) % 8) : 0, mv = C.id === 'kiki' && Math.abs(F.vx) > 1 ? 'm' : '';
        const key = i + Rig.keyOf(C, F.pal, q, ph, mv + (flash ? 'F' : ''));
        let s = SPRC.get(key);
        if (s) { SPRC.delete(key); SPRC.set(key, s);
          if (s.c || f.fresh === s) { R.hits = (R.hits || 0) + 1; return s; }
          if (s.tmp && (force || R.budget > 0)) { R.budget--; toFresh(f, s); return s; }   // image still on its way: show the painted copy
          return null; }
        if (R.budget <= 0 && !force) return null;             // raster budget used up: keep the previous pose for a frame
        const S = R.sprS, b = Rig.bounds(C, F.pal, q, BB), w = Math.max(2, Math.ceil((b[2] - b[0]) * S)), h = Math.max(2, Math.ceil((b[3] - b[1]) * S));
        R.budget--; R.miss = (R.miss || 0) + 1;
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        Rig.baseT(BT, S, -b[0] * S, b[3] * S, 1); PO2.time = ph * 12; PO2.vx = mv ? 6 : 0; PO2.flash = flash;
        Rig.draw(c.getContext('2d'), BT, C, F.pal, q, PO2);
        s = { c: null, tmp: c, i, ox: -b[0] * S, oy: b[3] * S, w, h, px: w * h, op: '' }; SPRC.set(key, s); sprPx += s.px;
        toFresh(f, s);
        const done = im => { im.style.cssText = css + ';will-change:transform;visibility:hidden'; fcs[i].appendChild(im); s.c = im; s.tmp = null; };
        blobImg(c, im => { if (!s.dead) done(im); });
        trim();
        return s;
      }
      function flushSprites() { fstate.forEach(unshow); for (const e of SPRC.values()) drop(e); SPRC.clear(); sprPx = 0; }
      R.flushSprites = flushSprites;
      const STARS = [null, null];
      function drawFighters(M) {
        for (let i = 0; i < 2; i++) {
          const F = M.P[i], f = fstate[i], o = PO; o.time = R.t; o.vx = F.vx; o.flash = F.vflash > 0; if (F.vflash > 0) F.vflash--;
          if (F.st === 'stand' && F.walk) F.wph = (F.wph || 0) + Math.abs(F.vx) * 3.6;
          const sk = F.st + (F.mv ? F.mv.id : '') + F.mser + F.face + o.flash;
          let p;
          if (R.t % R.poseEvery && f.p && f.sk === sk && !o.flash) { p = f.p; o.alpha = f.alpha; o.after = f.after; o.stars = f.stars; }   // poses animate at 30 fps, positions at 60
          else { p = Rig.poseOf(F, M, o); f.p = f.p || Rig.P({}); Rig.copy(f.p, p); p = f.p; f.sk = sk; f.alpha = o.alpha; f.after = o.after; f.stars = o.stars; }
          const vis = F.hid || o.alpha <= .02 ? 'hidden' : '';
          if (vis !== f.vis) { f.vis = vis; f.c.style.visibility = vis; }
          STARS[i] = o.stars ? { s: o.stars, h: Rig.headOf(F.C, p).slice(), F } : null;
          const A = AFT[i];
          if (!(o.after && !F.hid) && A.on) afterOff(A);
          if (vis) continue;
          let s = sprite(i, F, p, o.flash, !f.s) || f.s;
          if (!s.c && f.fresh !== s) { s = sprite(i, F, p, o.flash, true) || s; if (!s.c && f.fresh !== s) continue; }
          if (o.after && R.t % 3 === 0) afterPush(A, F, s);
          const e = s.c || f.fc, sh = F.shake > 0 && F.freeze > 0 ? (R.t % 2 ? 2.5 : -2.5) : 0, [x, y] = W2S(F.x + sh, F.y), k = R.z / R.sprS;
          const tf = `translate3d(${f1(x)}px,${f1(y)}px,0) scale(${(k * F.face).toFixed(4)},${k.toFixed(4)}) translate(${f1(-s.ox)}px,${f1(-s.oy)}px)`;
          if (tf !== e.__tf) { e.__tf = tf; e.style.transform = tf; }
          const op = o.alpha < 1 ? o.alpha.toFixed(2) : '';
          if (op !== (e.__op || '')) { e.__op = op; e.style.opacity = op; }
          if (e !== f.el) { if (f.el) f.el.style.visibility = 'hidden'; e.style.visibility = ''; f.el = e; }
          f.s = s;
        }
      }
      // afterimages: a few small canvases per fighter holding copies of recent pose bitmaps, faded out
      const AFT = [0, 1].map(() => ({ on: false, n: 0, c: [0, 1, 2, 3].map(() => { const c = el('canvas', 'will-change:transform,opacity;visibility:hidden'); afterLayer.appendChild(c); return { c, g: c.getContext('2d'), age: 99, x: 0, y: 0, face: 1, ox: 0, oy: 0, tf: '', op: '' }; }) }));
      function afterOff(A) { A.on = false; for (const a of A.c) { a.age = 99; if (!a.c.style.visibility) a.c.style.visibility = 'hidden'; } }
      function afterPush(A, F, s) {
        const a = A.c[A.n++ % A.c.length], c = a.c; A.on = true;
        if (c.width < s.w || c.height < s.h) { c.width = Math.max(c.width, s.w + 32); c.height = Math.max(c.height, s.h + 32); } else a.g.clearRect(0, 0, c.width, c.height);
        a.g.drawImage(s.c || s.tmp, 0, 0); a.age = 0; a.x = F.x; a.y = F.y; a.face = F.face; a.ox = s.ox; a.oy = s.oy;
        for (const b of A.c) if (b !== a) b.age++;
      }
      function afterimages() {
        const k = R.z / R.sprS;
        for (const A of AFT) { if (!A.on) continue;
          for (const a of A.c) { const vis = a.age < 4 ? '' : 'hidden'; if (a.c.style.visibility !== vis) a.c.style.visibility = vis; if (vis) continue;
            const [x, y] = W2S(a.x, a.y), tf = `translate3d(${f1(x)}px,${f1(y)}px,0) scale(${(k * a.face).toFixed(4)},${k.toFixed(4)}) translate(${f1(-a.ox)}px,${f1(-a.oy)}px)`;
            if (tf !== a.tf) { a.tf = tf; a.c.style.transform = tf; }
            const op = (.34 - a.age * .07).toFixed(2); if (op !== a.op) { a.op = op; a.c.style.opacity = op; } } }
      }
      // particle images (painted once, used as data URLs)
      const PU = {}, BASE = {}, POOLS = {};
      function durl(key, size, paint) { if (PU[key]) return PU[key]; const c = document.createElement('canvas'); c.width = c.height = size; paint(c.getContext('2d'), size / 2); const u = c.toDataURL(); BASE[u] = size; return (PU[key] = u); }
      const sparkU = k => durl('sp' + k, 128, (q, r) => { q.translate(r, r); q.fillStyle = k === 1 ? '#ffe36a' : '#fff6c0'; q.beginPath(); for (let i = 0; i < 16; i++) { const rr = i % 2 ? r * .38 : r * .96, a = i * Math.PI / 8; q.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } q.closePath(); q.fill(); q.fillStyle = '#fff'; q.beginPath(); q.arc(0, 0, r * .3, 0, TAU); q.fill(); });
      const ringU = k => durl('rg' + k, 128, (q, r) => { q.strokeStyle = ['#ffffff', '#ffe36a', '#9ae0ff'][k] || '#fff'; q.lineWidth = r * .12; q.beginPath(); q.arc(r, r, r * .9, 0, TAU); q.stroke(); });
      const blockU = () => durl('bk', 128, (q, r) => { q.strokeStyle = '#9ae0ff'; q.lineCap = 'round'; q.lineWidth = r * .14; q.beginPath(); q.arc(r, r, r * .82, -1.1, 1.1); q.stroke(); q.strokeStyle = '#fff'; q.lineWidth = r * .05; q.beginPath(); q.arc(r, r, r * .82, -.9, .9); q.stroke(); });
      const blobU = c => durl('bl' + c, 64, (q, r) => { const gr = q.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, c); gr.addColorStop(.7, c); gr.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = gr; q.beginPath(); q.arc(r, r, r, 0, TAU); q.fill(); });
      const starU = c => durl('st' + c, 32, (q, r) => starShape(q, r, r, r * .92, c));
      function fxEl(src) {
        const pool = POOLS[src] || (POOLS[src] = []); let e = pool.pop();
        if (e) { e.style.visibility = ''; return e; }
        if (src[0] === '#') { e = el('div', `width:20px;height:4px;border-radius:2px;background:${src.slice(1)};will-change:transform,opacity`); }
        else { e = el('img', 'will-change:transform,opacity'); e.src = src; }
        fxLayer.appendChild(e); return e;
      }
      function fxFree(f) { if (f.e) { f.e.style.visibility = 'hidden'; (POOLS[f.src] || (POOLS[f.src] = [])).push(f.e); f.e = null; } f.on = false; }
      function domFx() {
        const z = R.z;
        for (const f of R.fx) {
          if (!f.on) continue;
          f.t++; if (f.t > f.life) { fxFree(f); continue; }
          const u = f.t / f.life;
          f.x += f.vx; f.y += f.vy; f.vy -= f.g;
          const [X, Y] = W2S(f.x, f.y); let tf, op = 1 - u, r = 0, rot = 0;
          switch (f.type) {
            case 'spark': r = (16 + 40 * Math.sqrt(u)) * f.s * z; rot = f.t * .05; break;
            case 'streak': { const dx = -f.vx * 3 * z, dy = f.vy * 3 * z, len = Math.max(4, Math.hypot(dx, dy) + 3 * z);
              tf = `translate3d(${f1(X)}px,${f1(Y)}px,0) rotate(${Math.atan2(dy, dx).toFixed(3)}rad) scale(${(len / 20).toFixed(3)},${(.75 * z).toFixed(3)}) translate(-2px,-2px)`; break; }
            case 'pow': { const sc = (u < .15 ? .4 + u / .15 * .8 : 1.2 - (u - .15) * .3) * z * .9; op = u > .7 ? (1 - u) / .3 : 1;
              tf = `translate3d(${f1(X)}px,${f1(Y - u * 20 * z)}px,0) rotate(${f.a.toFixed(3)}rad) scale(${sc.toFixed(3)}) translate(${f1(-f.bw / 2)}px,${f1(-f.bh / 2)}px)`; break; }
            case 'block': r = (22 + 20 * u) * f.s * z; break;
            case 'dust': r = (8 + 16 * u) * f.s * z; op = .5 * (1 - u); break;
            case 'smoke': r = (10 + 18 * u) * f.s * z; op = .55 * (1 - u); break;
            case 'ring': r = (10 + 60 * Math.sqrt(u)) * f.s * z; break;
            case 'drop': r = 3 * z; break;
          }
          if (!tf) tf = `translate3d(${f1(X)}px,${f1(Y)}px,0)${rot ? ` rotate(${rot.toFixed(2)}rad)` : ''} scale(${(2 * r / f.bw).toFixed(3)}) translate(${-f.bw / 2}px,${-f.bw / 2}px)`;
          if (tf !== f.ts) { f.ts = tf; f.e.style.transform = tf; }
          const os = op.toFixed(2); if (os !== f.os) { f.os = os; f.e.style.opacity = os; }
        }
      }
      // dizzy stars circling the head
      const STEL = [];
      function stars() {
        for (let i = 0; i < 2; i++) { const st = STARS[i];
          for (let j = 0; j < 4; j++) { const n = i * 4 + j;
            if (!st) { if (STEL[n] && !STEL[n].style.visibility) STEL[n].style.visibility = 'hidden'; continue; }
            let e = STEL[n]; if (!e) { e = STEL[n] = el('img', 'will-change:transform'); e.src = starU(j % 2 ? '#ffe36a' : '#fff'); fxLayer.appendChild(e); }
            if (e.style.visibility) e.style.visibility = '';
            const F = st.F, [X, Y] = W2S(F.x + st.h[0] * F.face, F.y + st.h[1] + 30), rs = 7 * R.z * st.s, a = R.t / 10 + j * TAU / 4;
            e.style.transform = `translate3d(${f1(X + Math.cos(a) * 26 * R.z - rs)}px,${f1(Y + Math.sin(a) * 7 * R.z - rs)}px,0) scale(${(rs / 16).toFixed(3)})`; } }
      }
      function starShape(g, x, y, r, c) { g.fillStyle = c; g.strokeStyle = '#3a2a10'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * .45 : r, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke(); }
      // projectiles as images in their own layer
      const PJ = new Map(), PJURL = {};
      function projectiles(M) {
        for (const e of PJ.values()) e.seen = false;
        for (const p of M.pj) {
          let e = PJ.get(p.ser);
          if (!e) {
            if (p.k === 'laser') e = { el: el('div', 'height:60px;border-radius:30px;background:linear-gradient(180deg,rgba(90,240,255,0),#5ff6ff 30%,#fff 50%,#5ff6ff 70%,rgba(90,240,255,0));transform-origin:0 50%;will-change:transform') };
            else { const s = pjSprite(p.k); if (!PJURL[p.k]) PJURL[p.k] = s.toDataURL(); const im = el('img', 'will-change:transform'); im.src = PJURL[p.k]; im.width = s.width; im.height = s.height; e = { el: im, w: s.width, h: s.height }; }
            pjLayer.appendChild(e.el); PJ.set(p.ser, e);
          }
          e.seen = true; const [x, y] = W2S(p.x, p.y), dir = p.vx >= 0 ? 1 : -1;
          if (p.k === 'laser') { const O = M.P[p.o], ox = W2S(O.x + O.face * 70, p.y)[0], tip = x + dir * 52 * R.z, x0 = Math.min(ox, tip), len = Math.abs(tip - ox), hh = .5 * R.z * (1 + Math.sin(R.t * .8) * .1);
            e.el.style.width = Math.max(1, len) + 'px'; e.el.style.transform = `translate3d(${f1(x0)}px,${f1(y - 30)}px,0) scaleY(${(hh * 2).toFixed(3)})`; continue; }
          const sc = R.z * (p.k === 'golf' ? .85 * (1 + Math.sin(R.t / 4) * .06) : p.k === 'nevel' ? 1.1 : p.k === 'klap' ? .7 : p.k === 'vuist' ? .7 : p.k === 'zout' ? 1 : .9);
          const rot = p.k === 'waf' || p.k === 'ster' ? R.t * (p.k === 'ster' ? .5 : .25) : p.k === 'nevel' ? R.t * .05 : 0, yo = p.k === 'klap' ? 26 * R.z : 0;
          e.el.style.transform = `translate3d(${f1(x)}px,${f1(y - yo)}px,0) scale(${(dir * sc).toFixed(3)},${sc.toFixed(3)}) rotate(${(rot * 57.3 % 360).toFixed(1)}deg) translate(${-e.w / 2}px,${-e.h / 2}px)`;
          if (p.k === 'golf' && R.t % 3 === 0) fx('drop', p.x - dir * 20, p.y + 10 + Math.random() * 30, { vx: -dir * 1.5, vy: 2 + Math.random() * 2, g: .3, life: 20, c: '#bfe8ff' });
          if (p.k === 'vuist' && R.t % 2 === 0) fx('smoke', p.x - dir * 50, p.y, { vx: -dir, vy: .4, life: 18, s: .7 });
          if (p.k === 'nevel' && R.t % 3 === 0) fx('smoke', p.x - dir * 20, p.y + (Math.random() - .5) * 30, { vx: -dir * .6, vy: .3, life: 24, s: .9, c: 'rgba(180,90,240,.6)' });
        }
        for (const [k, e] of PJ) if (!e.seen) { e.el.remove(); PJ.delete(k); }
      }
      // ---- the HUD (HTML): only what changed is touched ----
      const setTf = (e, k, v) => { if (R.hk[k] !== v) { R.hk[k] = v; e.style.transform = v; } };
      const setTx = (e, k, v) => { if (R.hk[k] !== v) { R.hk[k] = v; e.textContent = v; } };
      const setCl = (e, k, c, on) => { const kk = k + c; if (R.hk[kk] !== on) { R.hk[kk] = on; e.classList.toggle(c, on); } };
      function hudUpdate(M, opt) {
        for (let i = 0; i < 2; i++) {
          const F = M.P[i], S = sides[i], frac = Math.max(0, F.hp / F.mhp);
          if (R.trail[i] < frac) R.trail[i] = frac; else if (F.st !== 'hit' && F.st !== 'fall' && F.st !== 'block' || R.trail[i] - frac > .3) R.trail[i] = Math.max(frac, R.trail[i] - .006);
          setTf(S.hp, 'hp' + i, `scaleX(${frac.toFixed(4)})`); setTf(S.tr, 'tr' + i, `scaleX(${R.trail[i].toFixed(3)})`); setCl(S.bar, 'b' + i, 'low', frac < .25);
          setTx(S.nm, 'n' + i, F.C.nm);
          setTf(S.mi, 'm' + i, `scaleX(${Math.min(1, F.meter / 100).toFixed(3)})`); setCl(S.mt, 'm' + i, 'full', F.meter >= 100);
          S.st.forEach((st, k) => setCl(st, 's' + i + k, 'on', M.wins[i] > k));
        }
        setTx(timerEl, 'tm', M.train ? '∞' : String(Math.ceil(M.timer / 60)));
        setCl(timerEl, 'tm', 'blink', !M.train && M.timer < 600 && M.phase === 'fight');
        const inp = opt.inputs; if (inp) { const k = (inp.n || 0) + ':' + inp.length; if (R.hk.inp !== k) { R.hk.inp = k; const ARR = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 6: '→', 7: '↖', 8: '↑', 9: '↗', 5: '•' };
          inputsEl.innerHTML = inp.slice().reverse().map(e => `<div>${ARR[e.d] || ''}${e.b ? ' <b>' + e.b + '</b>' : ''}</div>`).join(''); } } else if (R.hk.inp) { R.hk.inp = ''; inputsEl.textContent = ''; }
      }
      const TB = {};
      function textBmp(str) { if (TB[str]) return TB[str]; const t = text(str, 42, ['#fffbe0', '#ffd23a', '#ff6a1a'], { stroke: '#2a0e3a', sw: .14 });
        return (TB[str] = { url: t.c.toDataURL(), w: t.w, h: t.h }); }
      // quality ladder (the game steps down when frames are slow): pixels, pose rate and pose detail
      R.setLevel = lv => { R.level = lv; R.poseEvery = lv >= 2 ? 3 : 2; Rig.QA.a = lv >= 2 ? 6 : 4; Rig.QA.x = lv >= 2 ? 2 : 1.5; Rig.QA.steps = lv >= 2 ? 4 : lv >= 1 ? 6 : 0; };
      R.idle = () => !R.fx.some(f => f.on) && R.shakeT <= 0 && R.flashT <= 0;
      return R;
    }
    // a still portrait of a fighter (for the character select and results): returns a canvas
    function portrait(C, pal, w, h, poseKey, flip) {
      const c = document.createElement('canvas'), d = Math.min(2, window.devicePixelRatio || 1); c.width = Math.round(w * d); c.height = Math.round(h * d);
      const g = c.getContext('2d'), B = new Float64Array(6), sc = h / 120 * d;
      Core.prep(C); const k = Rig.kit(g, C, pal);
      Rig.baseT(B, sc, c.width * .5, c.height + 92 * sc, flip ? -1 : 1);
      const p = Rig.pose(poseKey || 'guard'); Rig.draw(g, B, C, pal, p, { time: 0 });
      return c;
    }
    // a full-body render (character select preview, VS screen)
    function body(g, C, pal, poseKey, x, y, sc, face, t) {
      const B = new Float64Array(6); Core.prep(C); Rig.baseT(B, sc, x, y, face);
      const p = typeof poseKey === 'string' ? Rig.pose(poseKey) : poseKey; Rig.draw(g, B, C, pal, p, { time: t || 0 });
    }
    return { create, text, portrait, body };
  })();
