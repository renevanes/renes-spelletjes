(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const palette = { na: "#e9ce76", sa: "#d58f79", eu: "#91bbd7", af: "#c6b4cd", as: "#afd097", au: "#d6ac77" };
  const seas = ["alaska kamchatka", "nw greenland", "ontario greenland", "quebec greenland", "greenland iceland", "iceland britain", "iceland scandinavia", "britain scandinavia", "britain northeu", "britain westeu", "brazil northaf", "southeu northaf", "southeu egypt", "southeu middleeast", "madagascar eastaf", "madagascar southaf", "japan mongolia", "japan kamchatka", "siam indonesia", "indonesia newguinea", "indonesia westaus", "newguinea westaus", "newguinea eastaus"];
  const names = [ ["na", 275, 68], ["sa", 437, 712], ["eu", 736, 93], ["af", 712, 620], ["as", 1163, 64], ["au", 1190, 665] ];
  function create({ engine: E, data: M, onSelect, onActions, onMove }) {
    const viewport = $("rkMapViewport"), svg = $("rkMap"), surface = $("rkMapSurface");
    let zoom = 1, scale = 1, expanded = false, ownership = true, state = null, selection = {}, frame = 0, lastWidth = 0, lastHeight = 0;
    let cameraCenter = [M.width/2, M.height/2], framing = null;
    const pointers = new Map();
    let gesture = null, moved = false;
    const effects = new Set();
    const regions = M.regions.map((g, i) => { if (g.id !== E.territories[i].id) throw new Error("Kaartindeling komt niet overeen met de spelregels"); return g; });
    const mix = (hex, t) => "#" + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t) + 246 * t).toString(16).padStart(2, "0")).join("");
    const routeMarkup = [...new Set([...seas, ...M.seaRoutes.map(pair => pair.join(" "))])].map(pair => {
      const [a, b] = pair.split(" "), i = E.byId[a], j = E.byId[b];
      if (!E.territories[i].neighbors.includes(j)) return "";
      const [x, y] = regions[i].anchor, [tx, ty] = regions[j].anchor;
      const d = a === "alaska" ? `M${x-18},${y}Q${x-85},${y-22} 24,${y-6}M${tx+18},${ty}Q${tx+70},${ty-22} 1416,${y-6}` : `M${x},${y}Q${(x+tx)/2},${(y+ty)/2-14} ${tx},${ty}`;
      return `<path class="rk-sea-route" data-route="${i}-${j}" d="${d}"/><title>Zeeverbinding: ${E.territories[i].name} — ${E.territories[j].name}</title>`;
    }).join("");
    svg.setAttribute("viewBox", `0 0 ${M.width} ${M.height}`);
    svg.setAttribute("data-geographic", "natural-earth");
    svg.innerHTML = `<defs><linearGradient id="rkOcean" x2="0" y2="1"><stop stop-color="#12465e"/><stop offset=".5" stop-color="#2386a2"/><stop offset="1" stop-color="#18516e"/></linearGradient><pattern id="rkPaper" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M0 80L80 0M0 0L80 80" stroke="#b6edff" stroke-width=".65" opacity=".1"/></pattern>${E.COLORS.map((color,i)=>`<linearGradient id="rkLand${i}" x2=".2" y2="1"><stop stop-color="${mix(color,.18)}"/><stop offset="1" stop-color="${color}"/></linearGradient>`).join("")}<marker id="rkAttackArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10Z" fill="#ffe3a0"/></marker></defs>
      <path d="${M.graticule}" class="rk-graticule"/><path d="${M.neutral}" class="rk-neutral-land"/>
      <g class="rk-ocean-labels"><text x="130" y="430">GROTE OCEAAN</text><text x="585" y="405">ATLANTISCHE</text><text x="585" y="426">OCEAAN</text><text x="1020" y="550">INDISCHE OCEAAN</text></g>
      <g class="rk-land-shadow" transform="translate(2 5)">${regions.map(g=>`<path d="${g.path}" fill-rule="evenodd"/>`).join("")}</g><g class="rk-land-regions">${regions.map((g, i) => `<g class="rk-country" data-country="${i}" role="button" tabindex="0"><title>${E.territories[i].name}</title><path class="rk-country-shape" d="${g.path}" fill="${palette[E.territories[i].continent]}" fill-rule="evenodd"/></g>`).join("")}</g>
      <g class="rk-sea-routes">${routeMarkup}</g><path id="rkBattleRoute" class="rk-battle-route" marker-end="url(#rkAttackArrow)"/>
      <g class="rk-region-labels">${regions.map((g, i) => { const [x, y] = g.anchor; const words = g.label.includes("-") ? g.label.split("-") : [g.label]; const [lx,ly] = ({ britain:[x+20,y-43], northeu:[x+34,y-31], westeu:[x-48,y-15], southeu:[x+45,y+7] })[g.id] || [x,y-(words.length>1?38:25)]; return `<text data-label="${i}" x="${lx}" y="${ly}" text-anchor="middle">${words.map((w, n) => `<tspan x="${lx}" dy="${n ? 12 : 0}">${esc(w)}</tspan>`).join("")}</text>`; }).join("")}</g>
      <g class="rk-army-markers">${regions.map((g, i) => `<g data-marker="${i}" data-country-marker="${i}" transform="translate(${g.anchor.join(" ")})"><circle class="rk-marker-halo" r="23"/><ellipse class="rk-marker-base" cy="5" rx="18" ry="17"/><circle class="rk-marker-disc" r="17"/><path class="rk-marker-shine" d="M-13,-7A15,15 0 0,1 12,-9"/><text class="rk-armies" y="6" text-anchor="middle"></text><text class="rk-owner" x="15" y="21" text-anchor="middle"></text><text class="rk-capital" y="-25" text-anchor="middle"></text><text class="rk-preview-armies" y="6" text-anchor="middle"></text></g>`).join("")}</g><g id="rkMapEffects" aria-hidden="true"></g>
      <g class="rk-continent-labels">${names.map(([id, x, y]) => { const c = E.continents.find(c => c.id === id); return `<text x="${x}" y="${y}" text-anchor="middle">${esc(c.name.toUpperCase())} · +${c.bonus}</text>`; }).join("")}</g>
      <g class="rk-compass" transform="translate(118 664)"><circle r="30"/><path d="M0,-37L8,0L0,37L-8,0ZM-37,0L0,8L37,0L0,-8Z"/><text y="-44" text-anchor="middle">N</text></g><text class="rk-map-credit" x="1421" y="742" text-anchor="end">Kustlijnen: Natural Earth · speelgebieden: Wereldmacht</text>`;
    const shapes = [...svg.querySelectorAll(".rk-country")], markers = [...svg.querySelectorAll("[data-marker]")];
    function clearArmyDrag() { markers.forEach(node=>node.classList.remove('rk-drag-target'));viewport.classList.remove('rk-army-dragging');$('rkPoolGhost').hidden=true; }

    function metrics() {
      const width = viewport.clientWidth, height = viewport.clientHeight;
      if (!width || !height) return false;
      scale = Math.min(width / M.width, height / M.height);
      lastWidth = width; lastHeight = height;
      const w = M.width * scale * zoom, h = M.height * scale * zoom;
      surface.style.width = `${Math.max(w, width)}px`;
      surface.style.height = `${Math.max(h, height)}px`;
      svg.style.width = `${w}px`; svg.style.height = `${h}px`;
      svg.style.left = `${Math.max(0, (width-w)/2)}px`;
      svg.style.top = `${Math.max(0,(height-h)/2)}px`;
      svg.classList.toggle("rk-map-detail", scale*zoom >= .55);
      $("rkZoomLabel").textContent = `${Math.round(zoom*100)}%`;
      $("rkZoomOut").disabled = zoom <= 1;
      $("rkZoomIn").disabled = zoom >= 6;
      return true;
    }
    function pointAt(x, y) {
      return [(viewport.scrollLeft + x - parseFloat(svg.style.left || 0)) / (scale*zoom), (viewport.scrollTop + y - parseFloat(svg.style.top || 0)) / (scale*zoom)];
    }
    function rememberCamera() {
      // A resize can clamp scroll offsets before ResizeObserver runs. Only read
      // scroll coordinates while they still belong to the measured viewport.
      if (lastWidth && lastHeight && viewport.clientWidth===lastWidth && viewport.clientHeight===lastHeight)
        cameraCenter = pointAt(lastWidth/2,lastHeight/2);
    }
    function zoomAt(next, x = viewport.clientWidth/2, y = viewport.clientHeight/2, point = pointAt(x, y)) {
      zoom = Math.max(1, Math.min(6, next));
      if (!metrics()) return;
      viewport.scrollLeft = point[0]*scale*zoom + parseFloat(svg.style.left || 0)-x;
      viewport.scrollTop = point[1]*scale*zoom + parseFloat(svg.style.top || 0)-y;
      rememberCamera();
    }
    function fit() { framing=null; zoom = 1; metrics(); viewport.scrollLeft = 0; viewport.scrollTop = 0; cameraCenter=[M.width/2,M.height/2]; }
    function focusPair(from, to) {
      metrics();
      const a = regions[from].anchor, b = regions[to].anchor;
      if ([from,to].includes(E.byId.alaska) && [from,to].includes(E.byId.kamchatka)) { fit(); return; }
      framing={kind:'pair',from,to};
      zoomAt(Math.min(viewport.clientWidth*.64/(Math.abs(a[0]-b[0])+170), viewport.clientHeight*.74/(Math.abs(a[1]-b[1])+115))/scale,
        viewport.clientWidth/2, viewport.clientHeight/2, [(a[0]+b[0])/2,(a[1]+b[1])/2]);
    }
    function snapshot() { rememberCamera(); return {zoom,center:[...cameraCenter]}; }
    function restore(view) { framing=null; if (!view || view.zoom<=1.01) fit(); else { metrics(); zoomAt(view.zoom,viewport.clientWidth/2,viewport.clientHeight/2,view.center); } }
    function focusCountry(id, neighbors = false) {
      metrics();
      framing={kind:'country',id,neighbors};
      const ids = neighbors ? [id,...E.territories[id].neighbors].filter(i=>Math.abs(regions[i].anchor[0]-regions[id].anchor[0])<700) : [id];
      const xs=ids.map(i=>regions[i].anchor[0]), ys=ids.map(i=>regions[i].anchor[1]);
      const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
      zoomAt(Math.min(viewport.clientWidth*.8/(right-left+230),viewport.clientHeight*.78/(bottom-top+180))/scale,
        viewport.clientWidth/2,viewport.clientHeight/2,[(left+right)/2,(top+bottom)/2]);
    }
    function pickCountry(x,y, forgiving = true, from = selection.selected) {
      const hit=document.elementFromPoint(x,y)?.closest('[data-country],[data-country-marker]');
      const direct=hit && svg.contains(hit) ? Number(hit.dataset.country ?? hit.dataset.countryMarker) : null;
      // An actual marker is precise, even beside several small countries.
      if (!forgiving || !state || direct!==null && hit.hasAttribute('data-country-marker')) return direct;
      const matrix=svg.getScreenCTM(); if (!matrix) return direct;
      let nearest=null, distance=22;
      regions.forEach((g,i)=>{
        const country=state.territories[i], current=state.current;
        const candidate=state.pending || selection.handoff || state.players[current].ai ? true :
          ['reinforce','deploy','capital'].includes(state.phase) ? country.owner===current :
          state.phase==='attack' ? country.owner===current && country.armies>1 || from!==null && from!==undefined && country.owner!==current && E.territories[from].neighbors.includes(i) :
          state.phase==='fortify' ? country.owner===current : true;
        if (!candidate) return;
        const p=new DOMPoint(...g.anchor).matrixTransform(matrix), d=Math.hypot(x-p.x,y-p.y);
        if (d<distance) {nearest=i;distance=d;}
      });
      return nearest ?? direct;
    }
    function legalMove(from,to) {
      if (!state || from==null || to==null || from===to || state.pending || selection.handoff || state.players[state.current].ai || selection.target!=null) return false;
      const source=state.territories[from], destination=state.territories[to];
      if (source.owner!==state.current || source.armies<2) return false;
      return state.phase==='attack' ? destination.owner!==state.current && E.territories[from].neighbors.includes(to) :
        state.phase==='fortify' && !state.fortified && destination.owner===state.current && E.connected(state,from,to);
    }
    function clearPreview() {
      markers.forEach(node => { node.classList.remove("rk-previewing"); node.querySelector(".rk-preview-armies").textContent = ""; });
    }
    function preview(from, to, amount) {
      clearPreview();
      [[from,state.territories[from].armies-amount],[to,state.territories[to].armies+amount]].forEach(([i,n])=>{
        markers[i].classList.add("rk-previewing"); markers[i].querySelector(".rk-preview-armies").textContent = n;
        markers[i].querySelector(".rk-preview-armies").style.fontSize = n>999 ? "11px" : n>99 ? "14px" : "18px";
      });
    }
    function previewDraft(to,amount) {
      clearPreview(); const node=markers[to], n=state.territories[to].armies+amount;
      node.classList.add('rk-previewing'); node.querySelector('.rk-preview-armies').textContent=n;
    }
    function effect(id, label) {
      if (document.documentElement.classList.contains("reduced-motion")) return;
      const node = document.createElementNS("http://www.w3.org/2000/svg","text"), [x,y] = regions[id].anchor;
      node.textContent = label; node.setAttribute("x",x); node.setAttribute("y",y-30); node.classList.add("rk-map-pop");
      $("rkMapEffects").append(node);
      const animation = node.animate([{opacity:0,transform:"translateY(8px)"},{opacity:1,offset:.2},{opacity:0,transform:"translateY(-25px)"}],{duration:1000,easing:"ease-out"});
      effects.add(animation); animation.finished.then(()=>{node.remove(); effects.delete(animation);},()=>node.remove());
    }
    function clearEffects() {
      effects.forEach(animation=>animation.cancel());effects.clear();$('rkMapEffects').replaceChildren();
    }
    function focusContinent(id, focus = true) {
      metrics();
      framing={kind:'continent',id};
      const matching = regions.filter((_, i) => E.territories[i].continent === id);
      const b = [Math.min(...matching.map(g => g.bounds[0])), Math.min(...matching.map(g => g.bounds[1])), Math.max(...matching.map(g => g.bounds[2])), Math.max(...matching.map(g => g.bounds[3]))];
      // Ignore the date-line sliver of Kamchatka when fitting Asia.
      if (id === "as") b[0] = regions[E.byId.middleeast].bounds[0];
      zoomAt(Math.min(viewport.clientWidth/(b[2]-b[0]+70), viewport.clientHeight/(b[3]-b[1]+70))/scale, viewport.clientWidth/2, viewport.clientHeight/2, [(b[0]+b[2])/2, (b[1]+b[3])/2]);
      svg.dataset.continent = id;
      if (focus) viewport.focus({ preventScroll: true });
    }
    function expand(value = !expanded) {
      expanded = value;
      $("rk").classList.toggle("rk-expanded", expanded);
      $("rkExpandMap").setAttribute("aria-pressed", String(expanded));
      $("rkExpandMap").textContent = expanded ? "↙ Terug" : "⛶ Grote kaart";
      // Keep keyboard/screen-reader navigation in the visible board while it fills the screen.
      $("rk").querySelectorAll(".rk-topbar,.rk-turn").forEach(el => { el.inert = expanded; });
      $("rkViewMenu").open = false;
      fit();
    }
    function update(next, choice) {
      state = next; selection = choice;
      const { selected, target, handoff } = choice;
      shapes.forEach((node, i) => {
        const t = state.territories[i], p = state.players[t.owner];
        node.querySelector("path").setAttribute("fill", ownership ? `url(#rkLand${E.COLORS.indexOf(p.color)})` : palette[E.territories[i].continent]);
        node.setAttribute("aria-label", `${E.territories[i].name}, ${p.name}, ${t.armies} legers${state.capitals?.includes(i) ? ", hoofdstad, maximaal drie verdedigingsdobbelstenen" : ""}`);
        node.setAttribute("aria-pressed", String(i === selected || i === target));
        node.classList.toggle("selected", i === selected); node.classList.toggle("target", i === target);
        node.classList.toggle("neighbor", selected !== null && E.territories[selected].neighbors.includes(i));
        node.classList.toggle("attackable", !handoff && state.phase === "attack" && selected !== null && state.territories[selected].owner === state.current && state.territories[selected].armies > 1 && t.owner !== state.current && E.territories[selected].neighbors.includes(i));
        node.classList.toggle('reachable', !handoff && state.phase==='fortify' && selected!==null && i!==selected && t.owner===state.current && E.connected(state,selected,i));
        const marker = markers[i];
        const human=!handoff && !state.players[state.current].ai && !state.pending && state.phase!=='won';
        const source=t.owner===state.current && t.armies>1;
        const eligible=human && (['deploy','reinforce','capital'].includes(state.phase) ? t.owner===state.current && (state.phase==='capital'||state.pool>0) :
          state.phase==='attack' ? source && E.territories[i].neighbors.some(j=>state.territories[j].owner!==state.current) || node.classList.contains('attackable') :
          state.phase==='fortify' && !state.fortified ? selected!==null ? node.classList.contains('reachable') || i===selected : source && state.territories.some((other,j)=>j!==i && other.owner===state.current && E.connected(state,i,j)) : false);
        node.classList.toggle('eligible',eligible);marker.classList.toggle('eligible',eligible);
        marker.classList.toggle('unavailable',human && !eligible && i!==selected && i!==target);
        marker.querySelector(".rk-marker-disc").setAttribute("fill", mix(p.color,.18));
        marker.querySelector(".rk-armies").textContent = t.armies;
        marker.querySelector(".rk-armies").style.fontSize = t.armies > 999 ? "11px" : t.armies > 99 ? "14px" : "18px";
        marker.querySelector(".rk-owner").textContent = t.owner + 1;
        marker.querySelector(".rk-capital").textContent = state.capitals?.includes(i) ? "♛" : "";
        marker.classList.toggle("selected", i === selected); marker.classList.toggle("target", i === target);
      });
      svg.querySelectorAll("[data-route]").forEach(route => route.classList.toggle("active", selected !== null && route.dataset.route.split("-").map(Number).includes(selected)));
      const a = selected !== null && target !== null ? regions[selected].anchor : null, b = a && regions[target].anchor;
      const bering = a && [selected,target].includes(E.byId.alaska) && [selected,target].includes(E.byId.kamchatka);
      $("rkBattleRoute").setAttribute("d", bering ? `M${a[0]},${a[1]}L${selected===E.byId.alaska?24:1416},${a[1]}M${selected===E.byId.alaska?1416:24},${b[1]}L${b[0]},${b[1]}` : a ? `M${a[0]},${a[1]}Q${(a[0]+b[0])/2},${(a[1]+b[1])/2-20} ${b[0]},${b[1]}` : "");
      const p = state.players[state.current];
      $("rkMapTurn").textContent = `${p.name} · ${state.pending ? "Bezetten" : { deploy:"Startlegers", capital:"Hoofdstad kiezen", reinforce:"Versterken", attack:"Aanvallen", fortify:"Verplaatsen", won:"Gewonnen" }[state.phase]}`;
      $("rkMapTurn").style.setProperty("--player", p.color);
      $("rkMapSelection").textContent = selected === null ? "Kies een eigen gebied op de kaart" : `${E.territories[selected].name} · ${state.territories[selected].armies} legers${target !== null ? " → " + E.territories[target].name : ""}`;
      $("rkToActions").hidden = selected === null || p.ai || handoff;
      $("rkToActions").textContent = state.pending ? "Legers bezetten →" : state.phase === "reinforce" ? "Legers plaatsen →" : state.phase === "attack" ? "Aanvallen →" : "Spelacties →";
    }
    $("rkOwnership").setAttribute("aria-pressed", "true");
    $("rkZoomIn").addEventListener("click", () => { framing=null; zoomAt(zoom*1.5); });
    $("rkZoomOut").addEventListener("click", () => { framing=null; zoomAt(zoom/1.5); });
    $("rkWorldView").addEventListener("click", fit);
    $("rkExpandMap").addEventListener("click", () => expand());
    $("rkOwnership").addEventListener("click", () => { ownership = !ownership; $("rkViewMenu").open = false; $("rkOwnership").setAttribute("aria-pressed", String(ownership)); if (state) update(state, selection); });
    $("rkToActions").addEventListener("click", () => { if (expanded) expand(false); onActions(); });
    viewport.addEventListener("wheel", event => {
      if (!event.ctrlKey) { framing=null; return; }
      event.preventDefault(); framing=null; const r = viewport.getBoundingClientRect();
      zoomAt(zoom*Math.exp(-event.deltaY*.007), event.clientX-r.left, event.clientY-r.top);
    }, { passive: false });
    function startGesture() {
      const pts = [...pointers.values()], r = viewport.getBoundingClientRect();
      if (pts.length === 2) {
        clearArmyDrag();
        framing=null;
        const x = (pts[0].x+pts[1].x)/2-r.left, y = (pts[0].y+pts[1].y)/2-r.top;
        gesture = { distance: Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y), zoom, anchor: pointAt(x, y) }; moved = true;
      } else if (pts.length === 1) gesture = { x: pts[0].x, y: pts[0].y, left: viewport.scrollLeft, top: viewport.scrollTop };
    }
    viewport.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      if (!pointers.size) moved = false;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      viewport.setPointerCapture(event.pointerId); startGesture();
      if (pointers.size===1 && state && !state.pending && selection.target==null && !state.players[state.current].ai && !selection.handoff && ['attack','fortify'].includes(state.phase)) {
        const from=pickCountry(event.clientX,event.clientY);
        if (from!==null && state.territories[from]?.owner===state.current && state.territories[from].armies>1 && state.territories.some((_,to)=>legalMove(from,to))) {
          const point=new DOMPoint(...regions[from].anchor).matrixTransform(svg.getScreenCTM());
          if(Math.hypot(point.x-event.clientX,point.y-event.clientY)<=Math.max(24,20*scale*zoom)) gesture.army=from;
        }
      }
    });
    viewport.addEventListener("pointermove", event => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x:event.clientX, y:event.clientY });
      if (pointers.size===1 && gesture && "left" in gesture && Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>5) moved = true;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0; if (!gesture) return;
        const pts = [...pointers.values()], r = viewport.getBoundingClientRect();
        if (pts.length === 2 && gesture.distance) zoomAt(gesture.zoom*Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y)/gesture.distance, (pts[0].x+pts[1].x)/2-r.left, (pts[0].y+pts[1].y)/2-r.top, gesture.anchor);
        else if (pts.length === 1 && "left" in gesture) {
          const dx = pts[0].x-gesture.x, dy = pts[0].y-gesture.y;
          if (Math.hypot(dx, dy)>5) moved = true;
          if (gesture.army!==undefined && moved) {
            const to=pickCountry(pts[0].x,pts[0].y,true,gesture.army);
            const legal=legalMove(gesture.army,to);
            const hover=legal?to:null;
            if (gesture.hover!==hover) { if (gesture.hover!=null) markers[gesture.hover].classList.remove('rk-drag-target'); if (hover!==null)markers[hover].classList.add('rk-drag-target'); gesture.hover=hover; }
            viewport.classList.add('rk-army-dragging');
            const ghost=$('rkPoolGhost');ghost.hidden=false;ghost.querySelector('b').textContent=state.territories[gesture.army].armies-1;ghost.style.transform=`translate(${pts[0].x-26}px,${pts[0].y-42}px)`;
          } else { if(moved)framing=null; viewport.scrollLeft = gesture.left-dx; viewport.scrollTop = gesture.top-dy; rememberCamera(); }
        }
      });
    });
    function endPointer(event) {
      if (!pointers.has(event.pointerId)) return;
      const from=gesture?.army;
      if (event.type === "pointerup") {
        const id=pickCountry(event.clientX,event.clientY,true,from ?? selection.selected);
        if (!moved && id!==null) onSelect(id);
        else if (moved && from!==undefined && pointers.size===1 && legalMove(from,id)) onMove?.(from,id);
      }
      clearArmyDrag();
      pointers.delete(event.pointerId);
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      if (pointers.size) startGesture(); else gesture = null;
    }
    viewport.addEventListener("pointerup", endPointer); viewport.addEventListener("pointercancel", endPointer);
    viewport.addEventListener("lostpointercapture", event => { if (pointers.has(event.pointerId)) { pointers.delete(event.pointerId); gesture = null; clearArmyDrag(); } });
    viewport.addEventListener("click", event => {
      event.stopPropagation();
      if (event.detail === 0) { const hit = event.target.closest("[data-country],[data-country-marker]"); if (hit) onSelect(Number(hit.dataset.country ?? hit.dataset.countryMarker)); }
    });
    $("rk").addEventListener("keydown", event => {
      if (event.key === "Escape" && expanded && selection.selected===null && $('rkInspector').hidden && $('rkCountryList').hidden && !$("rk").classList.contains('rk-focus-mode') && !document.querySelector(".modal.show")) { event.preventDefault(); event.stopPropagation(); expand(false); $("rkViewMenu").querySelector("summary").focus(); }
      if (event.key === "Tab" && expanded && !document.querySelector(".modal.show")) {
        const items = [...$("rkBoardPanel").querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')].filter(el => !el.closest('[hidden],[inert]') && el.getClientRects().length);
        if ((event.shiftKey && document.activeElement === items[0]) || (!event.shiftKey && document.activeElement === items.at(-1))) { event.preventDefault(); (event.shiftKey ? items.at(-1) : items[0]).focus(); }
      }
    });
    viewport.addEventListener('scroll',rememberCamera,{passive:true});
    new ResizeObserver(() => {
      if (!viewport.clientWidth || !viewport.clientHeight || viewport.clientWidth===lastWidth && viewport.clientHeight===lastHeight) return;
      const center=[...cameraCenter], focus=framing;
      if (!metrics()) return;
      if (focus?.kind==='pair') focusPair(focus.from,focus.to);
      else if (focus?.kind==='country') focusCountry(focus.id,focus.neighbors);
      else if (focus?.kind==='continent') focusContinent(focus.id,false);
      else if (zoom>1) zoomAt(zoom,viewport.clientWidth/2,viewport.clientHeight/2,center);
      else fit();
    }).observe(viewport);
    return { update, fit, snapshot, restore, focusCountry, pickCountry, focusContinent, focusPair, preview, previewDraft, clearPreview, effect, clearEffects, close: () => { pointers.clear(); gesture = null; cancelAnimationFrame(frame); frame = 0; clearArmyDrag();clearEffects();clearPreview(); if (expanded) expand(false); } };
  }
  window.ReneWereldBoard = { create, palette };
})();
