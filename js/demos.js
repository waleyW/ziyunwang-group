/* Hands-on demos shown at the top of each field page. Each returns { draw(ctx, w, h, t, mouse), act?, click?, down/move/up?, cam? }. */
const DEMOS = {
  compute() { // three-layer fcc(111) slab with CO hopping between fcc hollow sites
    const cam = { yaw: .5, pitch: .62, d: 14, s: 1, cx: 0, cy: 0, touched: 0, lastDrag: 0 }, atoms = [], sites = [], N = 6, sh = [[0, 0], [.5, .2887], [1, .5774]];
    for (let L = 0; L < 3; L++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) atoms.push({ x: i + j * .5 + sh[L][0] - N * .75 + .25, z: j * .866 + sh[L][1] - N * .433 + .2, y: -L * .82, L });
    for (const a of atoms) if (a.L === 0) { const s = { x: a.x + .5, z: a.z + .2887 }; if (Math.abs(s.x) < 2.2 && Math.abs(s.z) < 1.9) sites.push(s); }
    const cu = [ball("#d38b55"), ball("#b9773f"), ball("#9a6232")], cBall = ball("#7b8794"), oBall = ball("#c8564b");
    let from = sites[Math.floor(sites.length / 2)], to = from, t0 = 0, hops = 0, pending = false;
    const hop = t => { from = to; const near = sites.filter(s => { const d = Math.hypot(s.x - from.x, s.z - from.z); return d > .3 && d < 1.05; }); to = near[Math.floor(Math.random() * near.length)] || from; t0 = t; hops++; };
    return {
      cam, act(a) { if (a === "hop") pending = true; },
      draw(ctx, w, h, t) {
        if (pending || (!REDUCE && t - t0 > 2600)) { pending = false; hop(t); }
        if (!REDUCE && t - cam.touched > 2500) cam.yaw += .003;
        cam.cx = w * .42; cam.cy = h * .56; cam.s = Math.min(w, h) * .17;
        const f = REDUCE ? 1 : clamp((t - t0) / 800, 0, 1), e = f < .5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
        const bx = from.x + (to.x - from.x) * e, bz = from.z + (to.z - from.z) * e, by = .62 + Math.sin(e * Math.PI) * .25;
        const items = atoms.map(a => ({ q: project(a.x, a.y, a.z, cam), s: cu[a.L], r: .5 }));
        items.push({ q: project(bx, by, bz, cam), s: cBall, r: .32 }, { q: project(bx, by + .55, bz, cam), s: oBall, r: .36 });
        items.sort((a, b) => b.q.z - a.q.z);
        for (const it of items) { const r = it.r * cam.s * it.q.f; ctx.drawImage(it.s, it.q.x - r, it.q.y - r, r * 2, r * 2); }
        const pw = Math.min(170, w * .34), ph = 96, px = w - pw - 12, py = 12;
        ctx.fillStyle = "#fbf6e9"; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 4); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#1b4c82"; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= 40; i++) { const u = i / 40, x = px + 14 + u * (pw - 28), y = py + ph - 22 - Math.sin(u * Math.PI) ** 2 * (ph - 46); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
        ctx.fillStyle = "#c39a4c"; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(px + 14 + e * (pw - 28), py + ph - 22 - Math.sin(e * Math.PI) ** 2 * (ph - 46), 5, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = INK; ctx.font = "italic 600 15px Cormorant Garamond, serif"; ctx.textAlign = "center"; ctx.fillText("transition state", px + pw / 2, py + 18); ctx.font = "11px JetBrains Mono, monospace"; ctx.textAlign = "left"; ctx.fillText(`hops ${hops}`, px + 10, py + ph - 6);
      }
    };
  },
  learn() { // message passing over a surface graph
    const atoms = [], edges = [], R = 6, C = 8;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const h = hash(`${r},${c}`); atoms.push({ gx: c + (r % 2) * .5, gy: r * .866, el: h < .16 ? "Pd" : h < .3 ? "Ag" : "Cu", d: Infinity }); }
    for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) if (Math.hypot(atoms[i].gx - atoms[j].gx, atoms[i].gy - atoms[j].gy) < 1.05) edges.push([i, j]);
    const col = { Cu: "#d38b55", Pd: "#3E8EE8", Ag: "#9aa6b2" }, sp = { Cu: ball(col.Cu), Pd: ball(col.Pd), Ag: ball(col.Ag) };
    let src = Math.floor(R / 2) * C + Math.floor(C / 2), t0 = 0, geo = null, restart = true;
    const bfs = s => { atoms.forEach(a => a.d = Infinity); atoms[s].d = 0; const q = [s]; while (q.length) { const u = q.shift(); for (const [a, b] of edges) { const v = a === u ? b : b === u ? a : -1; if (v >= 0 && atoms[v].d === Infinity) { atoms[v].d = atoms[u].d + 1; q.push(v); } } } };
    return {
      act(a) { if (a === "pass") restart = true; },
      click(x, y) { if (!geo) return; let best = -1, bd = 1e9; atoms.forEach((a, i) => { const d = Math.hypot(geo.X(a) - x, geo.Y(a) - y); if (d < bd) { bd = d; best = i; } }); if (bd < geo.s * .6) { src = best; restart = true; } },
      draw(ctx, w, h, t) {
        if (restart) { restart = false; bfs(src); t0 = t; }
        const s = Math.min((w - 160) / (C + .5), (h - 50) / (R * .866)), ox = 24 + s / 2, oy = (h - (R - 1) * .866 * s) / 2;
        geo = { s, X: a => ox + a.gx * s, Y: a => oy + a.gy * s };
        const per = 1100, el = REDUCE ? per * 3.9 : (t - t0), layer = Math.min(3, Math.floor(el / per)), f = (el % per) / per;
        ctx.lineWidth = 2;
        for (const [i, j] of edges) {
          const a = atoms[i], b = atoms[j], lit = Math.max(a.d, b.d) <= layer;
          ctx.strokeStyle = lit ? "rgba(63,143,160,.6)" : "rgba(43,53,80,.14)"; ctx.beginPath(); ctx.moveTo(geo.X(a), geo.Y(a)); ctx.lineTo(geo.X(b), geo.Y(b)); ctx.stroke();
          if (!REDUCE && layer < 3 && el < per * 3) { const [u, v] = a.d === layer && b.d === layer + 1 ? [a, b] : b.d === layer && a.d === layer + 1 ? [b, a] : [null, null]; if (u) { ctx.fillStyle = "#3f8fa0"; ctx.beginPath(); ctx.arc(geo.X(u) + (geo.X(v) - geo.X(u)) * f, geo.Y(u) + (geo.Y(v) - geo.Y(u)) * f, 3.5, 0, 7); ctx.fill(); } }
        }
        const seen = atoms.filter(a => a.d <= layer).length;
        atoms.forEach((a, i) => {
          const lit = a.d <= layer, r = s * .34 * (i === src ? 1.15 : 1);
          ctx.globalAlpha = lit ? 1 : .45; ctx.drawImage(sp[a.el], geo.X(a) - r, geo.Y(a) - r, r * 2, r * 2); ctx.globalAlpha = 1;
          if (lit) { ctx.strokeStyle = i === src ? INK : "rgba(63,143,160,.9)"; ctx.lineWidth = i === src ? 3 : 2; ctx.beginPath(); ctx.arc(geo.X(a), geo.Y(a), r + 3, 0, 7); ctx.stroke(); }
        });
        const rx = w - 134, ry = 14;
        ctx.fillStyle = "#fbf6e9"; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(rx, ry, 122, 96, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = INK; ctx.font = "italic 600 17px Cormorant Garamond, serif"; ctx.textAlign = "left"; ctx.fillText(`Layer ${layer} of 3`, rx + 10, ry + 22);
        ctx.font = "11px JetBrains Mono, monospace"; ctx.fillStyle = "#6c6a72"; ctx.fillText(`sees ${seen} atoms`, rx + 10, ry + 42); ctx.fillText(layer === 3 ? "→ predict ΔE" : "gathering…", rx + 10, ry + 60);
        Object.entries(col).forEach(([k, c], i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(rx + 14 + i * 37, ry + 82, 5, 0, 7); ctx.fill(); ctx.fillStyle = "#6c6a72"; ctx.fillText(k, rx + 22 + i * 37, ry + 86); });
        if (!REDUCE && el > per * 6) restart = true;
      }
    };
  },
  design() { // Pareto front over random candidates
    let pts = [], scanX = null, front = null, born = 0, req = "new";
    const gen = t => { pts = Array.from({ length: 70 }, (_, i) => { const x = Math.random(); return { x, y: clamp(1 - x * .9 + (Math.random() - .5) * .55, .02, .98), i: i + 1 }; }); front = null; scanX = null; born = t; };
    const pareto = () => { const s = [...pts].sort((a, b) => b.x - a.x); let best = -1; const f = []; for (const p of s) if (p.y > best) { f.push(p); best = p.y; } return f; };
    return {
      act(a) { req = a; },
      draw(ctx, w, h, t, m) {
        if (req === "new") { gen(t); req = null; }
        if (req === "front") { req = null; front = pareto(); scanX = REDUCE ? -1 : 1.05; front.forEach(p => p.hit = 0); }
        const L = 52, B = h - 40, T = 18, Rr = w - 18, X = v => L + v * (Rr - L), Y = v => B - v * (B - T);
        ctx.strokeStyle = "rgba(43,53,80,.12)"; ctx.lineWidth = 1; for (let k = 0; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(L, Y(k / 4)); ctx.lineTo(Rr, Y(k / 4)); ctx.stroke(); }
        ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, B); ctx.lineTo(Rr, B); ctx.stroke();
        ctx.fillStyle = INK; ctx.font = "italic 600 16px Cormorant Garamond, serif"; ctx.textAlign = "right"; ctx.fillText("activity →", Rr, B + 28);
        ctx.save(); ctx.translate(20, T + 10); ctx.rotate(-Math.PI / 2); ctx.fillText("stability →", 0, 0); ctx.restore();
        if (scanX !== null && scanX > -.05) { scanX -= .012; ctx.strokeStyle = "rgba(63,143,160,.75)"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(scanX), T); ctx.lineTo(X(scanX), B); ctx.stroke(); ctx.setLineDash([]); }
        const done = front && (scanX === null || scanX <= -.05);
        if (front) { const vis = front.filter(p => p.x >= (scanX ?? -1)); if (vis.length) { ctx.strokeStyle = "#c8564b"; ctx.lineWidth = 2.5; ctx.beginPath(); vis.forEach((p, k) => { if (!k) ctx.moveTo(X(p.x), Y(0)); ctx.lineTo(X(p.x), Y(p.y)); const nx = vis[k + 1]; ctx.lineTo(nx ? X(nx.x) : L, Y(p.y)); }); ctx.stroke(); } }
        let hov = null;
        pts.forEach((p, k) => {
          const age = REDUCE ? 1 : clamp((t - born - k * 12) / 500, 0, 1), onF = front?.includes(p) && p.x >= (scanX ?? -1);
          if (onF && p.hit < 1) p.hit = Math.min(1, (p.hit || 0) + .08);
          const pop = onF ? 1 + Math.sin(p.hit * Math.PI) * .8 : 1, r = (onF ? 8 : 6) * age * pop, x = X(p.x), y = Y(p.y) - (1 - age) * 30;
          ctx.globalAlpha = front && !onF ? .45 : 1; ctx.fillStyle = onF ? "#c39a4c" : "#3E8EE8"; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
          if (Math.hypot(m.x - x, m.y - y) < 9) hov = { p, x, y };
        });
        if (hov) { const s = `candidate #${hov.p.i} · activity ${hov.p.x.toFixed(2)} · stability ${hov.p.y.toFixed(2)}`; ctx.font = "11px JetBrains Mono, monospace"; const tw = ctx.measureText(s).width + 14, bx = clamp(hov.x - tw / 2, 4, w - tw - 4); ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(bx, hov.y - 30, tw, 20, 4); ctx.fill(); ctx.fillStyle = "#fbf6e9"; ctx.textAlign = "left"; ctx.fillText(s, bx + 7, hov.y - 16); }
        if (done) { ctx.fillStyle = INK; ctx.font = "italic 600 17px Cormorant Garamond, serif"; ctx.textAlign = "right"; ctx.fillText(`${front.length} of ${pts.length} candidates sit on the Pareto front`, Rr, T + 14); }
      }
    };
  },
  screen() { // high-throughput screening: candidates stream through a GNN onto a toy volcano
    let cands = [], t0 = 0, running = false, req = null, done = 0;
    const cols = ["#d38b55", "#3E8EE8", "#9aa6b2", "#c8564b", "#2FA57E"];
    const gen = () => { cands = Array.from({ length: 1000 }, (_, i) => ({ i: i + 1, e: (Math.random() + Math.random() + Math.random() - 1.5) * .9, c: [0, 1, 2].map(() => cols[Math.floor(Math.random() * cols.length)]), t: Math.random() })); done = 0; running = false; };
    gen();
    const act = e => Math.min(1.4 * e + 1, -1.1 * e + 1);      // Sabatier-style volcano, peak at 0
    return {
      act(a) { req = a; },
      draw(ctx, w, h, t) {
        if (req === "run") { gen(); running = true; t0 = t; }
        if (req === "reset") gen();
        req = null;
        const n = running ? Math.min(1000, Math.floor((REDUCE ? 1e9 : t - t0) / 5)) : done; if (running) done = n; if (n >= 1000) running = false;
        const narrow = w < 640, poolW = narrow ? w : w * .3, nnX = narrow ? w * .5 : w * .43, plotL = narrow ? 40 : w * .56, plotR = w - 18, plotT = narrow ? h * .42 : 24, plotB = h - 34;
        // pool of waiting candidates
        const per = narrow ? 50 : 25, cell = Math.min((poolW - 30) / per, 9);
        for (let k = n; k < 1000; k++) { const col = k % per, row = Math.floor(k / per); const x = 16 + col * cell, y = 18 + row * cell; if (y > (narrow ? h * .3 : h - 20)) break; ctx.fillStyle = cands[k].c[0]; ctx.globalAlpha = .55; ctx.fillRect(x, y, cell - 2, cell - 2); }
        ctx.globalAlpha = 1;
        // the network box
        const bx = nnX - 56, by = narrow ? h * .3 - 34 : h / 2 - 60, bw = 112, bh = narrow ? 68 : 120;
        ctx.fillStyle = "#fbf6e9"; ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
        const L = [3, 4, 2]; const lit = running ? Math.floor(t / 120) % 3 : -1;
        L.forEach((m, i) => { for (let j = 0; j < m; j++) { const x = bx + 22 + i * 34, y = by + bh / 2 + (j - (m - 1) / 2) * (narrow ? 14 : 22); ctx.fillStyle = i === lit ? "#D9773F" : "#fff"; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.stroke(); } });
        ctx.fillStyle = INK; ctx.font = "italic 600 15px Cormorant Garamond, serif"; ctx.textAlign = "center"; ctx.fillText("GNN", nnX, by - 8);
        // candidates in flight
        if (running) for (let k = Math.max(0, n - 12); k < n; k++) { const f = (n - k) / 12, x = bx + bw + (plotL - bx - bw) * (1 - f), y = by + bh / 2; ctx.fillStyle = cands[k].c[0]; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
        // volcano plot
        const X = e => plotL + (e + 1.6) / 3.2 * (plotR - plotL), Y = a => plotB - clamp((a + 1.4) / 2.5, 0, 1) * (plotB - plotT);
        ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(plotL, plotT); ctx.lineTo(plotL, plotB); ctx.lineTo(plotR, plotB); ctx.stroke();
        ctx.strokeStyle = "rgba(217,119,63,.6)"; ctx.lineWidth = 2; ctx.beginPath(); for (let e = -1.6; e <= 1.6; e += .02) { const x = X(e), y = Y(act(e)); e === -1.6 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
        ctx.fillStyle = INK; ctx.font = "italic 600 14px Cormorant Garamond, serif"; ctx.textAlign = "right"; ctx.fillText("predicted binding energy →", plotR, plotB + 22);
        ctx.save(); ctx.translate(plotL - 10, plotT + 4); ctx.rotate(-Math.PI / 2); ctx.textAlign = "right"; ctx.fillText("activity →", 0, 0); ctx.restore();
        const shown = cands.slice(0, n), best = [...shown].sort((a, b) => Math.abs(a.e) - Math.abs(b.e)).slice(0, 5);
        for (const c of shown) { ctx.globalAlpha = .45; ctx.fillStyle = "#3E8EE8"; ctx.beginPath(); ctx.arc(X(c.e), Y(act(c.e)) + (c.t - .5) * 10, 2.2, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
        for (const c of best) { ctx.fillStyle = "#f3c64e"; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(X(c.e), Y(act(c.e)) + (c.t - .5) * 10, 5, 0, 7); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = INK; ctx.font = "12px JetBrains Mono, monospace"; ctx.textAlign = "left";
        ctx.fillText(`screened ${fmt(n)} / 1,000`, plotL + 8, plotT + 14);
        if (n >= 1000) ctx.fillText(`top picks: ${best.map(b => "#" + b.i).join(" ")}`, plotL + 8, plotT + 32);
      }
    };
  },
  neb() { // nudged elastic band with a climbing image on the Müller–Brown surface (a real calculation)
    const A = [-200, -100, -170, 15], a = [-1, -1, -6.5, .7], b = [0, 0, 11, .6], c = [-10, -10, -6.5, .7], X0 = [1, 0, -.5, -1], Y0 = [0, .5, 1.5, 1];
    const V = (x, y) => { let v = 0; for (let k = 0; k < 4; k++) { const dx = x - X0[k], dy = y - Y0[k]; v += A[k] * Math.exp(a[k] * dx * dx + b[k] * dx * dy + c[k] * dy * dy); } return v; };
    const G = (x, y) => { let gx = 0, gy = 0; for (let k = 0; k < 4; k++) { const dx = x - X0[k], dy = y - Y0[k], e = A[k] * Math.exp(a[k] * dx * dx + b[k] * dx * dy + c[k] * dy * dy); gx += e * (2 * a[k] * dx + b[k] * dy); gy += e * (b[k] * dx + 2 * c[k] * dy); } return [gx, gy]; };
    const MIN = { A: [-.558, 1.442], B: [.623, .028], C: [-.050, .467] }, dom = { x0: -1.5, x1: 1.2, y0: -.25, y1: 2.0 };
    let XA = MIN.A, XB = MIN.B, N = 15, KSP = 600, ends = "AB";
    let P, it = 0, running = false, ci = true, bg = null, bgKey = "", drag = -1, geo = null, req = "reset", conv = false;
    const reset = () => { P = Array.from({ length: N }, (_, i) => { const s = i / (N - 1); return [XA[0] + (XB[0] - XA[0]) * s, XA[1] + (XB[1] - XA[1]) * s]; }); it = 0; running = false; conv = false; };
    reset();
    function step() {
      const E = P.map(p => V(p[0], p[1])), top = E.indexOf(Math.max(...E.slice(1, -1))), Fs = [];
      let fmax = 0;
      for (let i = 1; i < N - 1; i++) {
        const [x, y] = P[i], tp = [P[i + 1][0] - x, P[i + 1][1] - y], tm = [x - P[i - 1][0], y - P[i - 1][1]];
        let tau; // improved tangent (Henkelman & Jónsson 2000)
        if (E[i + 1] > E[i] && E[i] > E[i - 1]) tau = tp; else if (E[i + 1] < E[i] && E[i] < E[i - 1]) tau = tm;
        else { const dmax = Math.max(Math.abs(E[i + 1] - E[i]), Math.abs(E[i - 1] - E[i])), dmin = Math.min(Math.abs(E[i + 1] - E[i]), Math.abs(E[i - 1] - E[i])); tau = E[i + 1] > E[i - 1] ? [tp[0] * dmax + tm[0] * dmin, tp[1] * dmax + tm[1] * dmin] : [tp[0] * dmin + tm[0] * dmax, tp[1] * dmin + tm[1] * dmax]; }
        const tl = Math.hypot(...tau) || 1; tau = [tau[0] / tl, tau[1] / tl];
        const g = G(x, y), gt = g[0] * tau[0] + g[1] * tau[1];
        let F;
        if (ci && it > 120 && i === top) F = [-g[0] + 2 * gt * tau[0], -g[1] + 2 * gt * tau[1]];
        else { const ks = KSP * (Math.hypot(...tp) - Math.hypot(...tm)); F = [-g[0] + gt * tau[0] + ks * tau[0], -g[1] + gt * tau[1] + ks * tau[1]]; }
        fmax = Math.max(fmax, Math.hypot(-g[0] + gt * tau[0], -g[1] + gt * tau[1])); Fs[i] = F;
      }
      for (let i = 1; i < N - 1; i++) { let dx = Fs[i][0] * 1.2e-4, dy = Fs[i][1] * 1.2e-4; const m = Math.hypot(dx, dy); if (m > .01) { dx *= .01 / m; dy *= .01 / m; } P[i][0] += dx; P[i][1] += dy; }
      it++; if (it > 200 && fmax < 3) { running = false; conv = true; }
    }
    function advance() {
      if (req && req.startsWith("ends:")) { ends = req.slice(5); XA = MIN[ends[0]]; XB = MIN[ends[1]]; req = "reset"; }
      if (req && req.startsWith("n:")) { N = +req.slice(2); req = "reset"; }
      if (req && req.startsWith("k:")) { KSP = +req.slice(2); req = null; }
      if (req === "reset") reset(); if (req === "run") { running = true; conv = false; it = 0; } if (req === "ci") ci = !ci; req = null;
      if (running && !REDUCE) for (let s = 0; s < 2; s++) step(); else if (running) { while (running) step(); }
    }
    return {
      act(x) { req = x; }, advance,
      state: () => ({ P, it, running, conv, climbing: ci && it > 120, ends, ci }),
      down(x, y) { if (!geo || running) return; let best = -1, bd = 24; P.forEach((p, i) => { if (i === 0 || i === N - 1) return; const d = Math.hypot(geo.X(p[0]) - x, geo.Y(p[1]) - y); if (d < bd) { bd = d; best = i; } }); drag = best; return best >= 0; },
      move(x, y) { if (drag < 0) return; P[drag] = [geo.ix(x), geo.iy(y)]; conv = false; it = 0; },
      up() { drag = -1; },
      draw(ctx, w, h) {
        advance();
        const narrow = w < 640, mapW = narrow ? w : w * .64, L = 12, T = 12, R = mapW - 8, B = narrow ? h * .66 : h - 12;
        const X = v => L + (v - dom.x0) / (dom.x1 - dom.x0) * (R - L), Y = v => B - (v - dom.y0) / (dom.y1 - dom.y0) * (B - T);
        geo = { X, Y, ix: px => dom.x0 + (px - L) / (R - L) * (dom.x1 - dom.x0), iy: py => dom.y0 + (B - py) / (B - T) * (dom.y1 - dom.y0) };
        const key = `${w}x${h}`;
        if (bgKey !== key) { // shaded surface with contour lines, drawn once per size
          bgKey = key; const cw = Math.round(R - L), ch = Math.round(B - T), img = ctx.createImageData(cw, ch), band = v => Math.floor(Math.min(v, 60) / 18);
          for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
            const x = dom.x0 + i / cw * (dom.x1 - dom.x0), y = dom.y1 - j / ch * (dom.y1 - dom.y0), v = V(x, y), k = clamp((v + 150) / 210, 0, 1);
            const edge = i > 0 && j > 0 && (band(v) !== band(V(dom.x0 + (i - 1) / cw * (dom.x1 - dom.x0), y)) || band(v) !== band(V(x, dom.y1 - (j - 1) / ch * (dom.y1 - dom.y0))));
            const o = 4 * (j * cw + i), r = 40 + k * 208, gg = 90 + k * 152, bb = 160 + k * 66;
            img.data[o] = edge ? r * .78 : r; img.data[o + 1] = edge ? gg * .78 : gg; img.data[o + 2] = edge ? bb * .82 : bb; img.data[o + 3] = 255;
          }
          bg = document.createElement("canvas"); bg.width = cw; bg.height = ch; bg.getContext("2d").putImageData(img, 0, 0);
        }
        ctx.drawImage(bg, L, T);
        const E = P.map(p => V(p[0], p[1])), top = E.indexOf(Math.max(...E.slice(1, -1)));
        ctx.strokeStyle = "#fbf6e9"; ctx.lineWidth = 2.5; ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); ctx.stroke();
        P.forEach((p, i) => { ctx.fillStyle = i === 0 || i === N - 1 ? "#c8564b" : i === top && (ci && it > 120 || conv) ? "#f3c64e" : "#fbf6e9"; ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), i === top ? 6.5 : 5, 0, 7); ctx.fill(); ctx.stroke(); });
        ctx.fillStyle = "#fbf6e9"; ctx.font = "italic 600 15px Cormorant Garamond, serif"; ctx.textAlign = "left"; Object.entries(MIN).forEach(([k2, m]) => ctx.fillText(k2, X(m[0]) + 9, Y(m[1]) - 6));
        // energy profile along the path
        const pl = narrow ? 34 : mapW + 34, pr = w - 14, pt = narrow ? h * .7 : 30, pb = h - 34, s = [0]; for (let i = 1; i < N; i++) s.push(s[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
        const emin = -150, emax = Math.max(0, ...E), SX = v => pl + v / s[N - 1] * (pr - pl), SY = v => pb - (v - emin) / (emax - emin) * (pb - pt);
        ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(pl, pt); ctx.lineTo(pl, pb); ctx.lineTo(pr, pb); ctx.stroke();
        ctx.strokeStyle = "#1b4c82"; ctx.lineWidth = 2; ctx.beginPath(); E.forEach((e, i) => i ? ctx.lineTo(SX(s[i]), SY(e)) : ctx.moveTo(SX(s[i]), SY(e))); ctx.stroke();
        E.forEach((e, i) => { ctx.fillStyle = i === top ? "#f3c64e" : "#1b4c82"; ctx.beginPath(); ctx.arc(SX(s[i]), SY(e), i === top ? 5 : 3, 0, 7); ctx.fill(); });
        ctx.fillStyle = INK; ctx.font = "italic 600 14px Cormorant Garamond, serif"; ctx.textAlign = "right"; ctx.fillText("reaction coordinate →", pr, pb + 22);
        ctx.font = "12px JetBrains Mono, monospace"; ctx.textAlign = "left";
        ctx.fillText(`barrier ${(E[top] - E[0]).toFixed(1)}`, pl + 8, pt + 4);
        ctx.fillText(conv ? "converged" : running ? `iteration ${it}` : "drag a bead, then run", pl + 8, pt + 22);
      }
    };
  },
  active() { // active learning with a real Gaussian process: the visitor or the AI chooses which "calculation" to run next
    const g = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
    const truth = x => .56 * g(x, .74, .03) + .42 * g(x, .3, .1) + .2 * g(x, .52, .04) + .04 * Math.sin(11 * x);
    const xs = Array.from({ length: 241 }, (_, i) => i / 240), tmax = Math.max(...xs.map(truth)), xbest = xs[xs.map(truth).indexOf(tmax)];
    const ell = .04, sf2 = .035, sn2 = 1e-5;
    const k = (a, b) => sf2 * Math.exp(-((a - b) ** 2) / (2 * ell * ell));
    let pts = [], post = null, req = "reset", reveal = false, auto = 0, lastAuto = 0, mode = "", geo = null, flash = null;
    function chol(A) { const n = A.length, L = A.map(r => r.map(() => 0)); for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { let s = A[i][j]; for (let q = 0; q < j; q++) s -= L[i][q] * L[j][q]; L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j][j]; } return L; }
    function solveL(L, b) { const y = []; for (let i = 0; i < b.length; i++) { let s = b[i]; for (let q = 0; q < i; q++) s -= L[i][q] * y[q]; y.push(s / L[i][i]); } return y; }
    function solveLT(L, y) { const n = y.length, x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let q = i + 1; q < n; q++) s -= L[q][i] * x[q]; x[i] = s / L[i][i]; } return x; }
    function fit() {
      if (!pts.length) { post = xs.map(() => ({ m: .2, s: Math.sqrt(sf2) })); return; }
      const mu = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const K = pts.map(a => pts.map(b => k(a.x, b.x))); pts.forEach((_, i) => K[i][i] += sn2);
      const L = chol(K), alpha = solveLT(L, solveL(L, pts.map(p => p.y - mu)));
      post = xs.map(x => { const ks = pts.map(p => k(x, p.x)), v = solveL(L, ks); return { m: mu + ks.reduce((s, kk, i) => s + kk * alpha[i], 0), s: Math.sqrt(Math.max(sf2 - v.reduce((s, vv) => s + vv * vv, 0), 1e-9)) }; });
    }
    const phi = z => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI), Phi = z => .5 * (1 + Math.tanh(.7978845608 * (z + .044715 * z ** 3)));
    function nextEI() { const best = Math.max(...pts.map(p => p.y)); let bi = 0, bv = -1; post.forEach((p, i) => { const z = (p.m - best - .01) / p.s, ei = (p.m - best - .01) * Phi(z) + p.s * phi(z); if (ei > bv && !pts.some(q => Math.abs(q.x - xs[i]) < .004)) { bv = ei; bi = i; } }); return xs[bi]; }
    function run(x, who) { pts.push({ x, y: truth(x), who }); flash = { x, t: performance.now() }; fit(); }
    const found = () => pts.some(p => Math.abs(p.x - xbest) < .012);
    return {
      act(a) { req = a; },
      click(x) { if (!geo || x < geo.L || x > geo.R) return; run(clamp(geo.ix(x), 0, 1), "you"); mode = "you"; },
      draw(ctx, w, h, t) {
        if (req === "reset") { pts = []; reveal = false; auto = 0; mode = ""; [.1, .9].forEach(x => run(x, "start")); }
        if (req === "ai") { run(nextEI(), "ai"); mode = "ai"; }
        if (req === "random") { run(Math.random(), "random"); mode = "random"; }
        if (req === "auto") { auto = 12; }
        if (req === "reveal") reveal = !reveal;
        req = null;
        if (auto > 0 && t - lastAuto > (REDUCE ? 0 : 650)) { lastAuto = t; run(nextEI(), "ai"); auto--; mode = "ai"; }
        const narrow = w < 640, L = 48, R = w - (narrow ? 16 : 230), T = 24, B = h - 46;
        const X = x => L + x * (R - L), Y = y => B - (y + .1) / .8 * (B - T);
        geo = { L, R, ix: px => (px - L) / (R - L) };
        // axes
        ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, B); ctx.lineTo(R, B); ctx.stroke();
        ctx.fillStyle = INK; ctx.font = "italic 600 15px Cormorant Garamond, serif"; ctx.textAlign = "right"; ctx.fillText("alloy composition →", R, B + 26);
        ctx.save(); ctx.translate(18, T + 4); ctx.rotate(-Math.PI / 2); ctx.textAlign = "right"; ctx.fillText("activity →", 0, 0); ctx.restore();
        // uncertainty band and mean, kept inside the plot
        ctx.save(); ctx.beginPath(); ctx.rect(L, T, R - L, B - T); ctx.clip();
        ctx.fillStyle = "rgba(217,119,63,.12)"; ctx.beginPath();
        post.forEach((p, i) => { const x = X(xs[i]), y = Y(p.m + 2 * p.s); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        for (let i = post.length - 1; i >= 0; i--) ctx.lineTo(X(xs[i]), Y(post[i].m - 2 * post[i].s)); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#D9773F"; ctx.lineWidth = 2.2; ctx.beginPath(); post.forEach((p, i) => i ? ctx.lineTo(X(xs[i]), Y(p.m)) : ctx.moveTo(X(xs[i]), Y(p.m))); ctx.stroke();
        ctx.restore();
        if (reveal) { ctx.strokeStyle = "rgba(43,53,80,.55)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4; ctx.beginPath(); xs.forEach((x, i) => i ? ctx.lineTo(X(x), Y(truth(x))) : ctx.moveTo(X(x), Y(truth(x)))); ctx.stroke(); ctx.setLineDash([]); }
        // where the AI would look next
        if (pts.length) { const nx = nextEI(); ctx.strokeStyle = "rgba(63,143,160,.6)"; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(X(nx), T); ctx.lineTo(X(nx), B); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = "#3f8fa0"; ctx.font = "11px JetBrains Mono, monospace"; ctx.textAlign = "center"; ctx.fillText("AI would try here", X(nx), T + 10); }
        // calculations done
        const bestPt = pts.reduce((a, b) => (!a || b.y > a.y ? b : a), null);
        pts.forEach(p => { ctx.fillStyle = p === bestPt ? "#f3c64e" : p.who === "ai" ? "#3f8fa0" : p.who === "random" ? "#9aa6b2" : p.who === "you" ? "#c8564b" : "#fbf6e9"; ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p === bestPt ? 7 : 5.5, 0, 7); ctx.fill(); ctx.stroke(); });
        if (flash && t - flash.t < 600) { const f = (t - flash.t) / 600; ctx.strokeStyle = `rgba(243,198,78,${1 - f})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(flash.x), Y(truth(flash.x)), 6 + f * 22, 0, 7); ctx.stroke(); }
        // scoreboard
        const sx = narrow ? L + 8 : R + 22, sy = narrow ? T + 6 : T + 8;
        ctx.textAlign = "left"; ctx.fillStyle = INK; ctx.font = "italic 600 18px Cormorant Garamond, serif"; ctx.fillText(found() ? "Best composition found!" : "Find the best catalyst", sx, sy + 12);
        ctx.font = "12px JetBrains Mono, monospace"; ctx.fillStyle = "#56697f";
        const lines = [`calculations run: ${pts.length}`, `best so far: ${bestPt ? bestPt.y.toFixed(3) : "–"}`, `true best: ${reveal || found() ? tmax.toFixed(3) : "hidden"}`];
        if (!narrow) lines.push("", "", "tap the plot to run", "a calculation yourself");
        lines.forEach((s, i) => ctx.fillText(s, sx, sy + 34 + i * 18));
        if (!narrow) [["you", "#c8564b"], ["AI", "#3f8fa0"], ["random", "#9aa6b2"]].forEach(([n, c], i) => { const x = sx + i * 62, y = sy + 34 + 4 * 18 - 4; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 5, y, 5, 0, 7); ctx.fill(); ctx.fillStyle = "#56697f"; ctx.fillText(n, x + 14, y + 4); });
      }
    };
  },
  relax() { // an ML adsorption search, as in the Open Catalyst demo: many starting placements, each relaxed with predicted forces
    const cam = { yaw: .35, pitch: .62, d: 14, s: 1, cx: 0, cy: 0, touched: 0, lastDrag: 0 }, atoms = [], sites = [], N = 5, sh = [[0, 0], [.5, .2887], [1, .5774]];
    for (let L = 0; L < 3; L++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) atoms.push({ x: i + j * .5 + sh[L][0] - N * .75 + .25, z: j * .866 + sh[L][1] - N * .433 + .2, y: -L * .82, L });
    const top = atoms.filter(a => a.L === 0);
    for (const a of top) {      // top, bridge and hollow sites; illustrative energies, hollow deepest
      if (Math.abs(a.x) < 1.6 && Math.abs(a.z) < 1.3) sites.push({ x: a.x, z: a.z, e: -.55, k: "top" }, { x: a.x + .5, z: a.z, e: -.78, k: "bridge" }, { x: a.x + .5, z: a.z + .2887, e: -1.0, k: "hollow" });
    }
    const cu = [ball("#d38b55"), ball("#b9773f"), ball("#9a6232")], cB = ball("#7b8794"), oB = ball("#c8564b"), gold = ball("#f3c64e");
    let cands = [], t0 = -1, req = "new";
    const start = t => {
      t0 = t;
      cands = Array.from({ length: 8 }, (_, i) => {
        const x = (Math.random() - .5) * 2.8, z = (Math.random() - .5) * 2.2, s = sites.reduce((b, q) => Math.hypot(q.x - x, q.z - z) < Math.hypot(b.x - x, b.z - z) ? q : b);
        return { x0: x, z0: z, y0: 1.7 + Math.random() * .5, tilt: (Math.random() - .5) * 1.4, site: s, e: s.e + (Math.random() - .5) * .08, delay: i * 420 };
      });
    };
    return {
      cam, act(a) { req = a; },
      draw(ctx, w, h, t) {
        if (req === "new" || t0 < 0) { req = null; start(t); }
        const el = REDUCE ? 1e9 : t - t0;
        if (!REDUCE && t - cam.touched > 2500) cam.yaw += .0025;
        const narrow = w < 640; cam.cx = narrow ? w * .5 : w * .38; cam.cy = h * (narrow ? .42 : .58); cam.s = Math.min(narrow ? w : w * .62, h) * .2;
        const items = atoms.map(a => ({ q: project(a.x, a.y, a.z, cam), s: cu[a.L], r: .5 }));
        let best = null, all = true;
        cands.forEach(c => { const f = clamp((el - c.delay) / 1400, 0, 1); c.f = f; if (f < 1) all = false; });
        const done = cands.filter(c => c.f >= 1); if (done.length) best = done.reduce((a, b) => a.e < b.e ? a : b);
        cands.forEach(c => {
          if (el < c.delay) return;
          const e = 1 - Math.pow(1 - c.f, 3), wob = Math.sin(c.f * 14) * (1 - c.f) * .12;
          const x = c.x0 + (c.site.x - c.x0) * e + wob, z = c.z0 + (c.site.z - c.z0) * e, y = c.y0 + (.62 - c.y0) * e, tl = c.tilt * (1 - e);
          const isBest = all && c === best;
          items.push({ q: project(x, y, z, cam), s: isBest ? gold : cB, r: .3, a: c.f < 1 || isBest ? 1 : .55 });
          items.push({ q: project(x + Math.sin(tl) * .55, y + Math.cos(tl) * .55, z, cam), s: isBest ? gold : oB, r: .34, a: c.f < 1 || isBest ? 1 : .55 });
          if (c.f < 1) { const a = project(x, y + .3, z, cam), b = project(x + (c.site.x - x) * .5, y + .3 + (.62 - y) * .5, z + (c.site.z - z) * .5, cam); items.push({ arrow: [a, b] }); }
        });
        items.sort((a, b) => (b.q ? b.q.z : b.arrow[0].z) - (a.q ? a.q.z : a.arrow[0].z));
        for (const it of items) {
          if (it.arrow) { const [a, b] = it.arrow; ctx.strokeStyle = "#3f8fa0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); const an = Math.atan2(b.y - a.y, b.x - a.x); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - 7 * Math.cos(an - .5), b.y - 7 * Math.sin(an - .5)); ctx.lineTo(b.x - 7 * Math.cos(an + .5), b.y - 7 * Math.sin(an + .5)); ctx.closePath(); ctx.fillStyle = "#3f8fa0"; ctx.fill(); continue; }
          const r = it.r * cam.s * it.q.f; ctx.globalAlpha = it.a ?? 1; ctx.drawImage(it.s, it.q.x - r, it.q.y - r, r * 2, r * 2); ctx.globalAlpha = 1;
        }
        // energies of every relaxed placement
        const pl = narrow ? 24 : w * .7, pr = w - 20, pt = narrow ? h * .72 : h * .2, pb = narrow ? h - 26 : h * .8, bw = (pr - pl) / cands.length;
        ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(pl, pt); ctx.lineTo(pl, pb); ctx.lineTo(pr, pb); ctx.stroke();
        cands.forEach((c, i) => {
          if (el < c.delay) return;
          const hgt = (pb - pt) * clamp(-c.e / 1.1, 0, 1) * (c.f ?? 0);
          ctx.fillStyle = all && c === best ? "#f3c64e" : c.f < 1 ? "rgba(63,143,160,.55)" : "#3f8fa0";
          ctx.fillRect(pl + i * bw + 4, pb - hgt, bw - 8, hgt);
        });
        ctx.fillStyle = INK; ctx.font = "italic 600 15px Cormorant Garamond, serif"; ctx.textAlign = "left";
        ctx.fillText("binding strength of each placement", pl, pt - 10);
        ctx.font = "12px JetBrains Mono, monospace";
        ctx.fillText(all ? `lowest energy: ${best.site.k} site` : `relaxing ${done.length} / ${cands.length}`, pl, pb + 18);
        if (all && !REDUCE && el > cands[cands.length - 1].delay + 1400 + 3500) start(t);
      }
    };
  },
  neb3d() { // the same NEB calculation, drawn on the Müller–Brown surface in 3D
    const base = DEMOS.neb(), cam = { yaw: -.5, pitch: .78, d: 9, s: 1, cx: 0, cy: 0, touched: 0, lastDrag: 0 };
    const A = [-200, -100, -170, 15], a = [-1, -1, -6.5, .7], b = [0, 0, 11, .6], c = [-10, -10, -6.5, .7], X0 = [1, 0, -.5, -1], Y0 = [0, .5, 1.5, 1];
    const V = (x, y) => { let v = 0; for (let k = 0; k < 4; k++) { const dx = x - X0[k], dy = y - Y0[k]; v += A[k] * Math.exp(a[k] * dx * dx + b[k] * dx * dy + c[k] * dy * dy); } return v; };
    const dom = { x0: -1.5, x1: 1.2, y0: -.25, y1: 2.0 }, G = 46, cx0 = (dom.x0 + dom.x1) / 2, cy0 = (dom.y0 + dom.y1) / 2, sc = 1.25;
    const H = v => clamp(v, -150, 40) / 150 * .9;              // height of the surface for an energy
    const W = (x, y, v) => [(x - cx0) * sc, H(v ?? V(x, y)), -(y - cy0) * sc];
    const grid = [];
    for (let j = 0; j <= G; j++) { const row = []; for (let i = 0; i <= G; i++) { const x = dom.x0 + i / G * (dom.x1 - dom.x0), y = dom.y0 + j / G * (dom.y1 - dom.y0), v = V(x, y); row.push({ x, y, v, p: W(x, y, v) }); } grid.push(row); }
    const col = v => { const k = clamp((v + 150) / 190, 0, 1); return [40 + k * 208, 90 + k * 152, 160 + k * 66]; };
    const bead = ball("#fbf6e9"), ends = ball("#c8564b"), ts = ball("#f3c64e");
    return {
      cam, act: base.act,
      draw(ctx, w, h, t) {
        const narrow = w < 640;
        if (!REDUCE && t - cam.touched > 3000) cam.yaw += .0015;
        cam.cx = narrow ? w * .5 : w * .36; cam.cy = h * (narrow ? .36 : .5); cam.s = Math.min(narrow ? w : w * .62, h) * .36;
        base.advance();
        const P = base.state().P, E = P.map(p => V(p[0], p[1])), top = E.indexOf(Math.max(...E.slice(1, -1)));
        // surface quads, far to near, lit from the upper left
        const quads = [];
        for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
          const q = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]], pr = q.map(g => project(...g.p, cam));
          const u = [0, 1, 2].map(k => q[1].p[k] - q[0].p[k]), v = [0, 1, 2].map(k => q[3].p[k] - q[0].p[k]);
          let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; if (n[1] < 0) n = n.map(x => -x);
          const nl = Math.hypot(...n) || 1, lit = clamp(.7 + .35 * ((-.35 * n[0] + .85 * n[1] + .4 * n[2]) / nl), .62, 1.08);
          quads.push({ pr, z: (pr[0].z + pr[2].z) / 2, c: col((q[0].v + q[2].v) / 2), lit, line: (Math.floor(Math.min(q[0].v, 60) / 18) !== Math.floor(Math.min(q[2].v, 60) / 18)) });
        }
        quads.sort((p, q) => q.z - p.z);
        for (const q of quads) {
          ctx.fillStyle = `rgb(${q.c.map(v => Math.round(Math.min(255, v * q.lit * (q.line ? .9 : 1)))).join(",")})`;
          ctx.beginPath(); q.pr.forEach((p, k) => k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .6; ctx.stroke();
        }
        ctx.fillStyle = "#fbf6e9"; ctx.font = "italic 600 18px Cormorant Garamond, serif"; ctx.textAlign = "center";
        for (const [k2, m] of Object.entries({ A: [-.558, 1.442], B: [.623, .028], C: [-.050, .467] })) { const q = project(...W(m[0], m[1]).map((v, i) => i === 1 ? v + .12 : v), cam); ctx.fillText(k2, q.x, q.y); }
        // the band
        const pts = P.map((p, i) => project(...W(p[0], p[1], E[i]).map((v, k) => k === 1 ? v + .04 : v), cam));
        ctx.strokeStyle = "#fbf6e9"; ctx.lineWidth = 2.5; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
        const st = base.state();
        pts.forEach((p, i) => { const s = i === 0 || i === P.length - 1 ? ends : i === top && (st.climbing || st.conv) ? ts : bead, r = (i === top ? 8 : 6) * p.f; ctx.drawImage(s, p.x - r, p.y - r, r * 2, r * 2); });
        // energy along the path
        const pl = narrow ? 34 : w * .72, pr = w - 18, pt = narrow ? h * .72 : h * .2, pb = narrow ? h - 30 : h * .78, s = [0];
        for (let i = 1; i < P.length; i++) s.push(s[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
        const emax = Math.max(0, ...E), SX = v => pl + v / s[s.length - 1] * (pr - pl), SY = v => pb - (v + 150) / (emax + 150) * (pb - pt);
        ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(pl, pt); ctx.lineTo(pl, pb); ctx.lineTo(pr, pb); ctx.stroke();
        ctx.strokeStyle = "#1b4c82"; ctx.lineWidth = 2; ctx.beginPath(); E.forEach((e, i) => i ? ctx.lineTo(SX(s[i]), SY(e)) : ctx.moveTo(SX(s[i]), SY(e))); ctx.stroke();
        E.forEach((e, i) => { ctx.fillStyle = i === top ? "#f3c64e" : "#1b4c82"; ctx.beginPath(); ctx.arc(SX(s[i]), SY(e), i === top ? 5 : 3, 0, 7); ctx.fill(); });
        ctx.fillStyle = INK; ctx.font = "italic 600 15px Cormorant Garamond, serif"; ctx.textAlign = "left"; ctx.fillText("energy along the path", pl, pt - 10);
        ctx.font = "12px JetBrains Mono, monospace"; ctx.fillText(`barrier ${(E[top] - E[0]).toFixed(1)} · ${st.conv ? "converged" : st.running ? "iteration " + st.it : "press Run NEB"}`, pl, pb + 18);
      }
    };
  },
  plasma() { // a plasma discharge over liquid: filaments, radiating glow and N₂ being split
    let fil = [], lastFil = 0, rings = [], mols = [], burst = 0, last = 0;
    const N2 = ball("#3E8EE8"), Nat = ball("#2FA57E");
    return {
      click() { burst = 1; },
      draw(ctx, w, h, t) {
        const dt = Math.min(50, t - (last || t)); last = t;
        const tipX = w / 2, tipY = h * .22, liq = h * .78;
        // glass reactor and liquid
        ctx.fillStyle = "rgba(159,202,203,.35)"; ctx.fillRect(w * .2, liq, w * .6, h - liq - 10);
        ctx.strokeStyle = "rgba(43,53,80,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w * .2, h * .12); ctx.lineTo(w * .2, h - 10); ctx.lineTo(w * .8, h - 10); ctx.lineTo(w * .8, h * .12); ctx.stroke();
        ctx.fillStyle = "#9aa6b2"; ctx.beginPath(); ctx.moveTo(tipX - 9, 0); ctx.lineTo(tipX + 9, 0); ctx.lineTo(tipX + 4, tipY - 10); ctx.lineTo(tipX, tipY); ctx.lineTo(tipX - 4, tipY - 10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#c97d45"; ctx.fillRect(w * .3, h - 22, w * .4, 8);
        // radiating glow
        const glow = ctx.createRadialGradient(tipX, (tipY + liq) / 2, 4, tipX, (tipY + liq) / 2, h * .42);
        const pulse = .55 + .25 * Math.sin(t / 140) + burst * .4;
        glow.addColorStop(0, `rgba(196,120,255,${.55 * pulse})`); glow.addColorStop(.4, `rgba(232,140,220,${.25 * pulse})`); glow.addColorStop(1, "rgba(232,140,220,0)");
        ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
        if (!REDUCE && t - lastFil > 90) { lastFil = t; fil = Array.from({ length: 3 + Math.round(burst * 4) }, () => { const pts = [[tipX, tipY]]; let x = tipX, y = tipY; while (y < liq) { y += 10 + Math.random() * 14; x += (Math.random() - .5) * 26; pts.push([x, Math.min(y, liq)]); } return pts; }); }
        if (!REDUCE && Math.random() < .06 + burst * .3) rings.push({ r: 6, a: 1 });
        rings = rings.filter(r => { r.r += dt * .12; r.a -= dt * .0012; ctx.strokeStyle = `rgba(196,120,255,${Math.max(0, r.a) * .6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tipX, tipY, r.r, 0, 7); ctx.stroke(); return r.a > 0; });
        for (const f of fil) {
          ctx.strokeStyle = "rgba(170,90,255,.35)"; ctx.lineWidth = 7; ctx.beginPath(); f.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke();
          ctx.strokeStyle = "rgba(255,250,255,.95)"; ctx.lineWidth = 1.6; ctx.stroke();
        }
        // N₂ drifting in, split in the discharge, atoms dropping into the liquid
        if (!REDUCE && Math.random() < .08) { const left = Math.random() < .5; mols.push({ x: left ? w * .2 : w * .8, y: h * (.3 + Math.random() * .35), vx: (left ? 1 : -1) * (.03 + Math.random() * .03), split: 0, a: Math.random() * 6 }); }
        mols = mols.filter(m => {
          m.x += m.vx * dt; m.a += dt * .004;
          if (Math.abs(m.x - tipX) < 30 && !m.split) m.split = 1;
          if (m.split) { m.split += dt * .002; m.y += dt * .05; }
          const d = m.split ? 6 + m.split * 18 : 6, r = 6;
          const img = m.split ? Nat : N2;
          for (const s of [-1, 1]) { const x = m.x + s * Math.cos(m.a) * d, y = m.y + s * Math.sin(m.a) * d * .5; ctx.drawImage(img, x - r, y - r, r * 2, r * 2); }
          return m.y < liq && m.x > w * .15 && m.x < w * .85;
        });
        burst = Math.max(0, burst - dt * .0015);
      }
    };
  },
};

function mountDemo(root) {
  const cv = root.querySelector("canvas"), ctx = cv.getContext("2d"), demo = DEMOS[root.dataset.demo](root);
  let mouse = { x: -1, y: -1 }, visible = false, dragging = false, running = false;
  if (demo.cam) dragRotate(cv, demo.cam); else cv.style.cursor = demo.down ? "grab" : "pointer";
  cv.style.touchAction = demo.down ? "none" : "pan-y";
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  root.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => { demo.act?.(b.dataset.act); kick(); }));
  cv.addEventListener("pointerdown", e => { if (demo.down && demo.down(...pos(e))) { dragging = true; cv.setPointerCapture?.(e.pointerId); kick(); } });
  cv.addEventListener("pointermove", e => { const [x, y] = pos(e); mouse = { x, y }; if (dragging) demo.move(x, y); kick(); });
  cv.addEventListener("pointerup", () => { if (dragging) { dragging = false; demo.up?.(); kick(); } });
  cv.addEventListener("pointerleave", () => { mouse = { x: -1, y: -1 }; });
  cv.addEventListener("click", e => { if ((demo.cam?.lastDrag || 0) > 6) return; demo.click?.(...pos(e)); kick(); });
  function frame(t) { running = false; if (!cv.isConnected) return; const [w, h] = hidpi(cv, ctx); ctx.clearRect(0, 0, w, h); demo.draw(ctx, w, h, t, mouse); if (visible && !REDUCE) kick(); }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(cv);
  addEventListener("resize", kick);
  kick();
  return demo;
}
