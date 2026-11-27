// 地圖繪製與互動（Canvas 2D）
import { WORLD } from '../core/world.js';
import { UNITS, TERRAIN } from '../data/rules.js';
import { IDEOLOGIES } from '../data/countries.js';
import { flagCanvas } from './flags.js';
import { drawGlyph, drawUiIcon } from './icons.js';

const { MAP, nodes, R } = WORLD;
const W = MAP.W, H = MAP.H, NN = WORLD.N;
const TERRAIN_COLORS = { P: '#9bb56b', F: '#4f7a45', H: '#a99a62', M: '#8a7d6b', D: '#d9c58f', J: '#3f6b3a', S: '#6f8d78', U: '#b0a8a0', T: '#c9cfd2' };

// ---------------------------------------------------------------- 幾何
function decodeArcs() {
  return MAP.arcs.map(a => {
    const out = new Float32Array(a.length);
    let x = 0, y = 0;
    for (let i = 0; i < a.length; i += 2) { x += a[i]; y += a[i + 1]; out[i] = x; out[i + 1] = y; }
    return out;
  });
}
const ARCS = decodeArcs();
function ringPoints(ring) {
  const pts = [];
  for (const ref of ring) {
    const a = ARCS[ref < 0 ? ~ref : ref];
    const n = a.length / 2;
    if (ref >= 0) { for (let i = pts.length ? 1 : 0; i < n; i++) pts.push(a[i * 2], a[i * 2 + 1]); }
    else { for (let i = n - 1 - (pts.length ? 1 : 0); i >= 0; i--) pts.push(a[i * 2], a[i * 2 + 1]); }
  }
  return pts;
}
function buildPaths() {
  const paths = [], bbox = [];
  const extra = MAP.rings.length;
  for (let i = 0; i < extra; i++) {
    const p = new Path2D();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const ring of MAP.rings[i]) {
      const pts = ringPoints(ring);
      if (pts.length < 6) continue;
      p.moveTo(pts[0], pts[1]);
      for (let k = 2; k < pts.length; k += 2) p.lineTo(pts[k], pts[k + 1]);
      p.closePath();
      for (let k = 0; k < pts.length; k += 2) { const x = pts[k], y = pts[k + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    paths.push(p); bbox.push([x0, y0, x1, y1]);
  }
  return { paths, bbox };
}
const GEOM = buildPaths();
const WASTE = R + WORLD.S, LAKE = R + WORLD.S + 1;

// 地形紋理（固定螢幕大小的圖樣，疊在政治地圖上）
const TEX = {};
function terrainTexture(t) {
  if (TEX[t] !== undefined) return TEX[t];
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 24;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(0,0,0,0.55)'; g.fillStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.1;
  const P = (pts) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
  if (t === 'M') { P([2, 11, 6, 4, 10, 11]); P([13, 22, 17, 15, 21, 22]); g.strokeStyle = 'rgba(255,255,255,0.35)'; P([6, 4, 7.5, 6.5]); P([17, 15, 18.5, 17.5]); }
  else if (t === 'H') { g.beginPath(); g.arc(6, 10, 4, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(17, 21, 4, Math.PI, 0); g.stroke(); }
  else if (t === 'F') { for (const [x, y] of [[5, 6], [17, 9], [10, 18], [21, 20]]) { g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x + 2.4, y + 1.5); g.lineTo(x - 2.4, y + 1.5); g.closePath(); g.fill(); } }
  else if (t === 'J') { for (const [x, y] of [[3, 4], [11, 6], [19, 3], [7, 13], [15, 15], [22, 12], [3, 20], [12, 22], [20, 21]]) { g.beginPath(); g.arc(x, y, 1.7, 0, Math.PI * 2); g.fill(); } }
  else if (t === 'D') { g.fillStyle = 'rgba(90,60,10,0.45)'; for (const [x, y] of [[4, 5], [14, 3], [20, 11], [9, 14], [3, 20], [16, 20]]) g.fillRect(x, y, 1.4, 1.4); g.strokeStyle = 'rgba(90,60,10,0.35)'; P([2, 10, 6, 9, 10, 10]); P([13, 17, 17, 16, 21, 17]); }
  else if (t === 'S') { g.strokeStyle = 'rgba(0,40,60,0.55)'; P([3, 7, 9, 7]); P([12, 9, 18, 9]); P([6, 16, 12, 16]); P([15, 20, 21, 20]); }
  else if (t === 'T') { g.fillStyle = 'rgba(255,255,255,0.55)'; for (const [x, y] of [[5, 5], [15, 9], [9, 17], [20, 19]]) g.fillRect(x, y, 1.6, 1.6); }
  else if (t === 'U') { g.fillStyle = 'rgba(0,0,0,0.45)'; for (const [x, y] of [[4, 4], [8, 4], [4, 8], [15, 14], [19, 14], [15, 18], [19, 18]]) g.fillRect(x, y, 2.4, 2.4); }
  else { TEX[t] = null; return null; }
  TEX[t] = c;
  return c;
}
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade(hex, f) { const [r, g, b] = hexToRgb(hex); const m = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${m(r)},${m(g)},${m(b)})`; }

export class MapView {
  constructor(canvas, opts = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cam = { x: 2350, y: 520, z: 1.0 }; // 地圖座標中心 + 縮放（螢幕像素/地圖像素）
    this.mode = 'political';
    this.S = null; this.me = null;
    this.sel = new Set(); this.selRegion = -1; this.hover = -1;
    this.dirty = true; this.geoDirty = true;
    this.counterRects = [];
    this.onSelect = opts.onSelect || (() => {});
    this.onOrder = opts.onOrder || (() => {});
    this.onRegion = opts.onRegion || (() => {});
    this.onHover = opts.onHover || (() => {});
    this.patternCache = new Map();
    this.texPat = {};
    this.labelCache = null;
    this.orderMode = false;
    this.bind();
    this.resize();
    this.lastDraw = 0;
    const loop = (t) => {
      if (this.flash && performance.now() > this.flash.until) { this.flash = null; this.dirty = true; }
      if (this.dirty || (this.simDirty && t - this.lastDraw > 90) || (this.flash && t - this.lastDraw > 45)) { this.dirty = false; this.simDirty = false; this.lastDraw = t; this.draw(); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    window.addEventListener('resize', () => this.resize());
  }
  setState(S, me) { this.S = S; this.me = me; this.geoDirty = true; this.dirty = true; }
  refresh(geo) { if (geo) this.geoDirty = true; this.dirty = true; }
  // 讓新獲得的部隊與領土閃爍一段時間
  flashThings(ids, regions, ms = 9000) { this.flash = { ids: new Set(ids || []), regions: regions || [], until: performance.now() + ms }; this.dirty = true; }
  refreshSim(geo) { if (geo) this.geoDirty = true; this.simDirty = true; }
  resize() {
    const r = this.cv.getBoundingClientRect();
    this.vw = Math.max(1, r.width); this.vh = Math.max(1, r.height);
    this.cv.width = Math.round(this.vw * this.dpr); this.cv.height = Math.round(this.vh * this.dpr);
    this.clampCam(); this.dirty = true;
  }
  minZoom() { return Math.max(this.vw / W, this.vh / H) * 1.0; }
  clampCam() {
    const z = this.cam.z = Math.max(this.minZoom(), Math.min(6, this.cam.z));
    const halfH = this.vh / 2 / z;
    this.cam.y = Math.max(halfH, Math.min(H - halfH, this.cam.y));
    this.cam.x = ((this.cam.x % W) + W) % W;
  }
  centerOn(x, y, z) { this.cam.x = x; this.cam.y = y; if (z) this.cam.z = z; this.clampCam(); this.dirty = true; }
  centerOnNode(i, z) { const n = nodes[i]; this.centerOn(n.x, n.y, z || Math.max(this.cam.z, 1.6)); }
  screenToMap(sx, sy) {
    const z = this.cam.z;
    let x = this.cam.x + (sx - this.vw / 2) / z, y = this.cam.y + (sy - this.vh / 2) / z;
    x = ((x % W) + W) % W;
    return [x, y];
  }
  mapToScreen(x, y) {
    const z = this.cam.z;
    let dx = x - this.cam.x; if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W;
    return [this.vw / 2 + dx * z, this.vh / 2 + (y - this.cam.y) * z];
  }

  // ---------------------------------------------------------------- 顏色
  countryColor(t) {
    if (!t || !this.S) return '#777';
    const C = this.S.C[t];
    return (C && C.color) || (WORLD.countries[t] && WORLD.countries[t].color) || '#888';
  }
  regionFill(i) {
    const S = this.S;
    if (i >= R) return null;
    const c = S.ctrl[i];
    if (this.mode === 'terrain') return TERRAIN_COLORS[nodes[i].terrain];
    if (this.mode === 'faction') {
      const C = S.C[c];
      if (!C) return '#666';
      if (C.fac && S.fac[C.fac]) return this.factionColor(C.fac);
      return shade(IDEOLOGIES[C.ideo] ? IDEOLOGIES[C.ideo].color : '#888', 0.55);
    }
    if (this.mode === 'industry') {
      const v = Math.min(1, S.ind[i] / 12);
      return `rgb(${Math.round(60 + 190 * v)},${Math.round(60 + 120 * v)},${Math.round(50)})`;
    }
    if (this.mode === 'supply') {
      return this.countryColor(c);
    }
    return this.countryColor(c);
  }
  factionColor(id) {
    const F = this.S.fac[id]; if (!F) return '#666';
    const map = { allies: '#3d73c4', nato: '#3d73c4', axis: '#4a4a4a', comintern: '#b22a2a', warsaw: '#b22a2a', cosphere: '#d6a93a' };
    return map[id] || this.countryColor(F.leader);
  }
  stripe(color) {
    if (this.patternCache.has(color)) return this.patternCache.get(color);
    const c = document.createElement('canvas'); c.width = c.height = 10;
    const g = c.getContext('2d');
    g.strokeStyle = color; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-2, 12); g.lineTo(12, -2); g.stroke();
    g.beginPath(); g.moveTo(-2, 22); g.lineTo(22, -2); g.stroke();
    const p = this.ctx.createPattern(c, 'repeat');
    this.patternCache.set(color, p);
    return p;
  }

  // ---------------------------------------------------------------- 邊界分組
  rebuildBorders() {
    const S = this.S;
    const country = new Path2D(), region = new Path2D(), coast = new Path2D(), sea = new Path2D();
    const sides = MAP.arcSides;
    for (let a = 0; a < ARCS.length; a++) {
      const l = sides[a * 2], r = sides[a * 2 + 1];
      const pts = ARCS[a];
      let target;
      const lLand = l >= 0 && l < R, rLand = r >= 0 && r < R;
      if (lLand && rLand) target = S.ctrl[l] !== S.ctrl[r] ? country : region;
      else if (lLand || rLand || l === WASTE || r === WASTE) {
        if ((l === WASTE && rLand) || (r === WASTE && lLand)) target = country;
        else if (l === -1 || r === -1) continue;
        else target = coast;
      } else if (l >= R && r >= R && l < WASTE && r < WASTE) target = sea;
      else continue;
      target.moveTo(pts[0], pts[1]);
      for (let k = 2; k < pts.length; k += 2) target.lineTo(pts[k], pts[k + 1]);
    }
    this.borders = { country, region, coast, sea };
    // 國名標籤：每個連通的領土區塊各一個
    const comp = new Int32Array(R).fill(-1);
    const labels = [];
    for (let i = 0; i < R; i++) {
      if (comp[i] >= 0) continue;
      const c = S.ctrl[i]; if (!c) continue;
      const id = labels.length;
      const q = [i]; comp[i] = id;
      let sx = 0, sy = 0, sa = 0; const ref = nodes[i].x;
      for (let h = 0; h < q.length; h++) {
        const r = q[h], a = Math.max(4, nodes[r].area);
        let x = nodes[r].x; if (x - ref > W / 2) x -= W; if (ref - x > W / 2) x += W;
        sx += x * a; sy += nodes[r].y * a; sa += a;
        for (const m of nodes[r].landNb) if (comp[m] < 0 && S.ctrl[m] === c) { comp[m] = id; q.push(m); }
      }
      const cap = S.C[c] && S.C[c].cap;
      labels.push({ t: c, x: ((sx / sa) % W + W) % W, y: sy / sa, a: sa, n: q.length, cap: q.includes(cap) });
    }
    this.labelCache = labels.sort((p, q) => q.a - p.a);
    // 鐵路網：同一國家控制、相鄰且有工業或重要城市的地區之間以鐵路相連
    const caps = new Set(); for (const t in S.C) if (S.C[t].exists && S.C[t].cap >= 0) caps.add(S.C[t].cap);
    const dev = (r) => S.ind[r] >= 1 || nodes[r].vp >= 5 || caps.has(r);
    const rails = [];
    for (let r = 0; r < R; r++) {
      if (!S.ctrl[r] || !dev(r)) continue;
      for (const m of nodes[r].landNb) if (m > r && S.ctrl[m] === S.ctrl[r] && dev(m)) rails.push(r, m);
    }
    this.rails = rails;
  }

  // ---------------------------------------------------------------- 繪製
  draw() {
    const ctx = this.ctx, S = this.S;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const og = ctx.createLinearGradient(0, 0, 0, this.vh);
    og.addColorStop(0, '#173a57'); og.addColorStop(1, '#0f2a42');
    ctx.fillStyle = og;
    ctx.fillRect(0, 0, this.vw, this.vh);
    if (!S) return;
    if (this.geoDirty) { this.rebuildBorders(); this.geoDirty = false; }
    const z = this.cam.z;
    const left = this.cam.x - this.vw / 2 / z, right = this.cam.x + this.vw / 2 / z;
    const offsets = [];
    for (let k = -1; k <= 1; k++) { const o = k * W; if (right > o && left < o + W) offsets.push(o); }
    this.counterRects = [];
    for (const off of offsets) this.drawWorld(off);
    this.drawOverlay(offsets);
  }
  drawWorld(off) {
    const ctx = this.ctx, S = this.S, z = this.cam.z;
    ctx.setTransform(this.dpr * z, 0, 0, this.dpr * z, this.dpr * (this.vw / 2 - (this.cam.x - off) * z), this.dpr * (this.vh / 2 - this.cam.y * z));
    const vx0 = this.cam.x - off - this.vw / 2 / z, vx1 = this.cam.x - off + this.vw / 2 / z;
    const vy0 = this.cam.y - this.vh / 2 / z, vy1 = this.cam.y + this.vh / 2 / z;
    const vis = (i) => { const b = GEOM.bbox[i]; return b[2] >= vx0 && b[0] <= vx1 && b[3] >= vy0 && b[1] <= vy1; };
    // 海域
    for (let i = R; i < R + WORLD.S; i++) {
      if (!vis(i)) continue;
      ctx.fillStyle = (i === this.selRegion || i === this.hover) ? '#22506f' : '#1a4060';
      ctx.fill(GEOM.paths[i]);
    }
    if (GEOM.paths[LAKE]) { ctx.fillStyle = '#1f4b6c'; ctx.fill(GEOM.paths[LAKE]); }
    // 沿岸淺海光暈
    {
      const px0 = 1 / z;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const [w, a] of [[14, 0.05], [8, 0.07], [4, 0.09]]) { ctx.strokeStyle = `rgba(150,210,235,${a})`; ctx.lineWidth = w * px0; ctx.stroke(this.borders.coast); }
    }
    if (GEOM.paths[WASTE]) { ctx.fillStyle = '#6a6a62'; ctx.fill(GEOM.paths[WASTE]); }
    // 陸地
    for (let i = 0; i < R; i++) {
      if (!vis(i)) continue;
      ctx.fillStyle = this.regionFill(i);
      ctx.fill(GEOM.paths[i]);
      if (this.mode === 'political' && S.own[i] !== S.ctrl[i] && S.own[i]) {
        ctx.fillStyle = this.stripe(this.countryColor(S.own[i]));
        ctx.globalAlpha = 0.55; ctx.fill(GEOM.paths[i]); ctx.globalAlpha = 1;
      }
      if (this.mode === 'supply' && this.supplyBad && this.supplyBad.has(i)) { ctx.fillStyle = 'rgba(200,40,40,0.45)'; ctx.fill(GEOM.paths[i]); }
    }
    // 地形紋理（政治與陣營地圖）
    if ((this.mode === 'political' || this.mode === 'faction') && z > 0.75 && typeof DOMMatrix !== 'undefined') {
      ctx.globalAlpha = Math.min(0.32, (z - 0.75) * 0.5);
      const m = new DOMMatrix().scale(1 / z, 1 / z);
      for (let i = 0; i < R; i++) {
        if (!vis(i)) continue;
        const t = nodes[i].terrain;
        let pat = this.texPat[t];
        if (pat === undefined) { const tx = terrainTexture(t); pat = this.texPat[t] = tx ? ctx.createPattern(tx, 'repeat') : null; }
        if (!pat) continue;
        pat.setTransform(m);
        ctx.fillStyle = pat; ctx.fill(GEOM.paths[i]);
      }
      ctx.globalAlpha = 1;
    }
    // 我國高亮
    if (this.me && this.mode === 'political') {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      for (let i = 0; i < R; i++) if (S.ctrl[i] === this.me && vis(i)) ctx.fill(GEOM.paths[i]);
    }
    // 邊界
    const px = 1 / z;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (z > 1.2) { ctx.strokeStyle = 'rgba(140,180,210,0.18)'; ctx.lineWidth = px; ctx.stroke(this.borders.sea); }
    ctx.strokeStyle = 'rgba(20,20,20,0.3)'; ctx.lineWidth = Math.max(0.35, 0.7 * px); ctx.stroke(this.borders.region);
    ctx.strokeStyle = 'rgba(8,22,36,0.9)'; ctx.lineWidth = 1.2 * px; ctx.stroke(this.borders.coast);
    ctx.strokeStyle = 'rgba(12,12,14,0.92)'; ctx.lineWidth = Math.max(0.9, 2.6 * px); ctx.stroke(this.borders.country);
    ctx.strokeStyle = 'rgba(255,240,210,0.16)'; ctx.lineWidth = Math.max(0.3, 0.8 * px); ctx.stroke(this.borders.country);
    // 選取 / 懸停
    for (const i of [this.hover, this.selRegion]) {
      if (i < 0 || !GEOM.paths[i]) continue;
      ctx.strokeStyle = i === this.selRegion ? '#ffd76a' : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = (i === this.selRegion ? 2.4 : 1.4) * px;
      ctx.stroke(GEOM.paths[i]);
    }
    if (this.highlight) {
      ctx.strokeStyle = '#7cf'; ctx.lineWidth = 2 * px;
      for (const i of this.highlight) if (GEOM.paths[i]) ctx.stroke(GEOM.paths[i]);
    }
    if (this.flash && this.flash.regions.length) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 170);
      ctx.fillStyle = `rgba(255,215,90,${0.12 + 0.18 * pulse})`; ctx.strokeStyle = `rgba(255,225,110,${0.55 + 0.4 * pulse})`; ctx.lineWidth = (2 + 1.5 * pulse) * px;
      for (const i of this.flash.regions) if (GEOM.paths[i]) { ctx.fill(GEOM.paths[i]); ctx.stroke(GEOM.paths[i]); }
    }
  }
  drawOverlay(offsets) {
    const ctx = this.ctx, S = this.S, z = this.cam.z;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const inView = (sx, sy, m = 40) => sx > -m && sx < this.vw + m && sy > -m && sy < this.vh + m;
    // 國名
    if (z < 1.6 && this.labelCache) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const yr = this.year || 1936;
      // 先找出要畫的標籤；國旗優先畫在首都所在的領土，否則畫在最大的一塊
      const drawn = [], flagAt = new Map();
      for (const L of this.labelCache) {
        const size = Math.sqrt(L.a) * z * 0.11;
        if (size < 9) continue;
        const [sx, sy] = this.mapToScreen(L.x, L.y);
        if (!inView(sx, sy, 100)) continue;
        drawn.push([L, sx, sy, size]);
        const cur = flagAt.get(L.t);
        if (!cur || (L.cap && !cur.cap)) flagAt.set(L.t, L);
      }
      for (const [L, sx, sy, size] of drawn) {
        const fs = Math.min(30, size);
        ctx.font = `700 ${fs}px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif`;
        const name = (S.C[L.t] && S.C[L.t].name) || L.t;
        // 每個國家最大的一塊領土旁邊畫國旗
        let ox = 0;
        if (flagAt.get(L.t) === L && fs >= 10) {
          const fc = flagCanvas(L.t, yr, 48, 32);
          if (fc) {
            const fh = Math.max(9, fs * 0.82), fw = fh * 1.5, tw = ctx.measureText(name).width;
            const fx = sx - (tw + fw + 5) / 2, fy = sy - fh / 2;
            ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
            ctx.drawImage(fc, fx, fy, fw, fh);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(fx, fy, fw, fh);
            ox = (fw + 5) / 2;
          }
        }
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(3, fs * 0.18); ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeText(name, sx + ox, sy); ctx.fillStyle = 'rgba(255,250,235,0.93)'; ctx.fillText(name, sx + ox, sy);
      }
    }
    // 地區名稱
    if (z >= 2.2) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `500 ${Math.min(13, 9 + (z - 2.2) * 2)}px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif`;
      const y = this.year || 1936;
      for (let i = 0; i < NN; i++) {
        const n = nodes[i];
        if (i >= R && z < 2.6) continue;
        const [sx, sy] = this.mapToScreen(n.x, n.y);
        if (!inView(sx, sy)) continue;
        let name = n.name;
        if (n.nm) for (const [yy, nm] of n.nm) if (y >= yy) name = nm;
        name = name.replace(/\s*\(.*\)$/, '');
        ctx.fillStyle = i >= R ? 'rgba(170,210,240,0.55)' : 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.strokeText(name, sx, sy + 15); ctx.fillText(name, sx, sy + 15);
      }
    }
    this.drawFeatures(inView);
    // 首都
    for (const t in S.C) {
      const C = S.C[t]; if (!C.exists || C.cap < 0 || C.cap === undefined) continue;
      const n = nodes[C.cap]; if (!n) continue;
      const [sx, sy] = this.mapToScreen(n.x, n.y);
      if (!inView(sx, sy) || z < 0.6) continue;
      ctx.shadowColor = 'rgba(255,210,100,0.8)'; ctx.shadowBlur = 6;
      ctx.fillStyle = '#ffe08a'; star(ctx, sx - 13, sy - 10, 5); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(60,40,0,0.9)'; ctx.lineWidth = 1; ctx.stroke();
    }
    // 移動箭頭（自己的部隊）
    const mine = S.units.filter(u => u.c === this.me && u.path && u.path.length);
    ctx.lineWidth = 2;
    for (const u of mine) {
      const sel = this.sel.has(u.id);
      if (!sel && z < 0.9) continue;
      ctx.strokeStyle = sel ? 'rgba(255,230,120,0.95)' : 'rgba(255,255,255,0.45)';
      ctx.setLineDash(sel ? [] : [4, 4]);
      let [x0, y0] = this.mapToScreen(nodes[u.n].x, nodes[u.n].y);
      const pts = sel ? u.path : u.path.slice(0, 1);
      ctx.beginPath(); ctx.moveTo(x0, y0);
      for (const p of pts) { const [x1, y1] = this.mapToScreen(nodes[p].x, nodes[p].y); if (Math.abs(x1 - x0) > this.vw) break; ctx.lineTo(x1, y1); x0 = x1; y0 = y1; }
      ctx.stroke();
      if (sel) arrowHead(ctx, x0, y0, pts.length > 1 ? this.mapToScreen(nodes[pts[pts.length - 2]].x, nodes[pts[pts.length - 2]].y) : this.mapToScreen(nodes[u.n].x, nodes[u.n].y));
    }
    ctx.setLineDash([]);
    // 戰鬥
    for (const b of S.battles || []) {
      const [tx, ty] = this.mapToScreen(nodes[b.r].x, nodes[b.r].y);
      if (!inView(tx, ty)) continue;
      const f = b.from && b.from.length ? nodes[b.from[0]] : null;
      let bx = tx, by = ty;
      if (f) { const [fx, fy] = this.mapToScreen(f.x, f.y); if (Math.abs(fx - tx) < this.vw) { bx = (tx * 2 + fx) / 3; by = (ty * 2 + fy) / 3; } }
      const mineInvolved = b.ac === this.me || b.dc === this.me;
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260);
      if (mineInvolved) { ctx.strokeStyle = `rgba(255,90,60,${0.35 + 0.35 * pulse})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 12 + 2 * pulse, 0, Math.PI * 2); ctx.stroke(); }
      const bg = ctx.createRadialGradient(bx - 2, by - 3, 1, bx, by, 10);
      bg.addColorStop(0, mineInvolved ? '#ff7a55' : '#d0805a'); bg.addColorStop(1, mineInvolved ? '#9a1d10' : '#6a2a1a');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, by, 9.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 1; ctx.stroke();
      // 交叉的劍
      ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx - 4.5, by - 4.5); ctx.lineTo(bx + 4.5, by + 4.5); ctx.moveTo(bx + 4.5, by - 4.5); ctx.lineTo(bx - 4.5, by + 4.5); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(bx - 5.5, by + 1.5); ctx.lineTo(bx - 1.5, by + 5.5); ctx.moveTo(bx + 5.5, by + 1.5); ctx.lineTo(bx + 1.5, by + 5.5); ctx.stroke();
      // 進度條
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 12, by + 10, 24, 4);
      ctx.fillStyle = b.ac === this.me ? '#6c6' : b.dc === this.me ? '#e55' : '#ddd';
      ctx.fillRect(bx - 12, by + 10, 24 * Math.max(0, Math.min(1, b.prog || 0)), 4);
    }
    for (const nb of S.navBattles || []) {
      const [sx, sy] = this.mapToScreen(nodes[nb.z].x, nodes[nb.z].y);
      if (!inView(sx, sy)) continue;
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
      ctx.fillStyle = `rgba(255,170,60,${0.6 + 0.3 * pulse})`;
      star(ctx, sx, sy - 18, 9 + pulse * 2); ctx.fill();
      ctx.fillStyle = '#fff3c0'; star(ctx, sx, sy - 18, 4.5); ctx.fill();
    }
    // 部隊標誌
    this.drawCounters(inView);
    if (this.box) { const [x0, y0, x1, y1] = this.box; ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); ctx.setLineDash([]); }
  }
  // 鐵路、工廠、機場、港口、要塞
  drawFeatures(inView) {
    const ctx = this.ctx, S = this.S, z = this.cam.z;
    if (this.mode === 'terrain') return;
    if (z >= 0.95 && this.rails) {
      const segs = [];
      for (let i = 0; i < this.rails.length; i += 2) {
        const a = nodes[this.rails[i]], b = nodes[this.rails[i + 1]];
        const [x0, y0] = this.mapToScreen(a.x, a.y), [x1, y1] = this.mapToScreen(b.x, b.y);
        if (Math.abs(x1 - x0) > this.vw / 2) continue;
        if (!inView(x0, y0, 80) && !inView(x1, y1, 80)) continue;
        segs.push(x0, y0, x1, y1);
      }
      const path = () => { ctx.beginPath(); for (let i = 0; i < segs.length; i += 4) { ctx.moveTo(segs[i], segs[i + 1]); ctx.lineTo(segs[i + 2], segs[i + 3]); } };
      ctx.lineCap = 'butt';
      path(); ctx.strokeStyle = 'rgba(28,20,12,0.62)'; ctx.lineWidth = Math.min(3.2, 1.6 + z * 0.4); ctx.stroke();
      path(); ctx.strokeStyle = 'rgba(235,215,170,0.55)'; ctx.lineWidth = Math.min(2.2, 1 + z * 0.3); ctx.setLineDash([1.5, 3.5]); ctx.stroke(); ctx.setLineDash([]);
    }
    const showAll = z >= 1.35, indOnly = this.mode === 'industry' && z >= 0.8;
    if (!showAll && !indOnly) return;
    const airAt = new Set();
    if (showAll) for (const u of S.units) if (!u.dead && u.n < R && UNITS[u.t].domain === 'air') airAt.add(u.n);
    ctx.font = 'bold 9px sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    for (let r = 0; r < R; r++) {
      const n = nodes[r];
      const [sx, sy] = this.mapToScreen(n.x, n.y);
      if (!inView(sx, sy, 30)) continue;
      const items = [];
      if (S.ind[r] >= 1) items.push(['ic', S.ind[r], '#f1c76b']);
      if (showAll) {
        if (airAt.has(r)) items.push(['airfield', '', '#bfe0ff']);
        if (n.coastal && (n.vp >= 5 || S.ind[r] >= 3)) items.push(['port', '', '#a9d8f0']);
        if (S.fort[r] >= 1) items.push(['fort', S.fort[r], '#d9d2c2']);
      }
      if (!items.length) continue;
      let w = 4; for (const it of items) w += 12 + (it[1] !== '' ? 7 : 0);
      const x0 = sx - w / 2, y0 = sy - 27;
      ctx.fillStyle = 'rgba(14,18,24,0.72)'; roundRect(ctx, x0, y0, w, 14, 4); ctx.fill();
      let x = x0 + 3;
      for (const [ic, num, col] of items) {
        drawUiIcon(ctx, ic, x, y0 + 1.5, 11, col);
        x += 12;
        if (num !== '') { ctx.fillStyle = '#fff'; ctx.fillText(String(num), x - 0.5, y0 + 7.5); x += 7; }
      }
    }
  }
  drawCounters(inView) {
    const ctx = this.ctx, S = this.S, z = this.cam.z;
    const groups = new Map();
    for (const u of S.units) {
      if (u.dead) continue;
      const key = u.n + ':' + u.c;
      let g = groups.get(key);
      if (!g) groups.set(key, g = { n: u.n, c: u.c, units: [], land: 0, air: 0, sea: 0, hp: 0, org: 0, moving: false, types: {} });
      g.units.push(u);
      const d = UNITS[u.t].domain;
      if (d === 'land') g.land++; else if (d === 'air') g.air++; else g.sea++;
      g.types[u.t] = (g.types[u.t] || 0) + 1;
      g.hp += u.hp; g.org += u.org / (UNITS[u.t].org || 60);
      if (u.path && u.path.length) g.moving = true;
    }
    const byNode = new Map();
    for (const g of groups.values()) { let a = byNode.get(g.n); if (!a) byNode.set(g.n, a = []); a.push(g); }
    const showAll = z >= 1.15;
    const relevant = (c) => c === this.me || (this.me && S.wars && Object.keys(S.wars).some(k => { const [a, b] = k.split('|'); return (a === c || b === c) && (a === this.me || b === this.me || (S.C[this.me] && S.C[this.me].fac && S.C[this.me].fac === (S.C[a === c ? b : a] || {}).fac)); }));
    const relCache = new Map();
    const yr = this.year || 1936;
    // 圖示：選出該堆疊中最具代表性的兵種
    const PRI = ['mbt', 'htk', 'arm', 'ltk', 'mec', 'mar', 'inf', 'jet', 'ftr', 'str', 'bmb', 'cas', 'nvb', 'hel', 'car', 'flt', 'sub'];
    const glyphOf = (g) => {
      const dom = g.land ? 'land' : g.sea ? 'sea' : 'air';
      let best = null, bn = -1;
      for (const t of PRI) { const n = g.types[t] || 0; if (!n || UNITS[t].domain !== dom) continue; const w = n * (t === 'inf' ? 0.6 : 1); if (w > bn) { bn = w; best = t; } }
      return best || 'inf';
    };
    for (const [n, gs] of byNode) {
      const node = nodes[n];
      const [sx, sy] = this.mapToScreen(node.x, node.y);
      if (!inView(sx, sy)) continue;
      gs.sort((a, b) => (b.c === this.me) - (a.c === this.me));
      let row = 0;
      for (const g of gs) {
        if (!showAll && g.c !== this.me) { let rv = relCache.get(g.c); if (rv === undefined) relCache.set(g.c, rv = relevant(g.c)); if (!rv) continue; }
        if (row > 3) break;
        const w = 44, h = 18;
        const x = sx - w / 2 + 6, y = sy - h / 2 + row * (h + 3) - (gs.length > 1 ? 4 : 0);
        const col = this.countryColor(g.c);
        const sel = g.units.some(u => this.sel.has(u.id));
        const mine = g.c === this.me;
        // 外框與底色
        ctx.shadowColor = sel ? 'rgba(255,224,102,0.9)' : 'rgba(0,0,0,0.55)'; ctx.shadowBlur = sel ? 8 : 3;
        const bgr = ctx.createLinearGradient(0, y, 0, y + h);
        bgr.addColorStop(0, '#2b323d'); bgr.addColorStop(1, '#161b22');
        ctx.fillStyle = bgr; roundRect(ctx, x, y, w, h, 3.5); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = sel ? 2.2 : 1.6; ctx.strokeStyle = sel ? '#ffe066' : col; ctx.stroke();
        // 國旗
        const fc = flagCanvas(g.c, yr, 48, 32);
        if (fc) { ctx.drawImage(fc, x + 2, y + 2, 15, h - 4); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.8; ctx.strokeRect(x + 2, y + 2, 15, h - 4); }
        else { ctx.fillStyle = col; ctx.fillRect(x + 2, y + 2, 15, h - 4); }
        // 兵種符號
        const gt = glyphOf(g);
        drawGlyph(ctx, gt, x + 17.5, y + 3, 16.5, h - 6, mine ? '#ffe9b0' : '#efe7d4');
        // 數量
        const count = g.land || g.sea || g.air;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const label = String(count) + (g.land && (g.air || g.sea) ? '+' : '');
        ctx.fillText(label, x + 38, y + h / 2 + 0.5);
        // 組織度／兵力條
        const k = g.units.length;
        const hp = g.hp / k / 100, org = Math.max(0, Math.min(1, g.org / k));
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x + 1, y + h + 1, w - 2, 3.2);
        ctx.fillStyle = org > 0.5 ? '#5fd36a' : org > 0.25 ? '#e3c84a' : '#ea4a3c'; ctx.fillRect(x + 1, y + h + 1, (w - 2) * org, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x + 1, y + h + 3.2, (w - 2) * Math.min(1, hp), 1);
        if (g.moving && mine) { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(x + w - 1.5, y + 1.5, 2.6, 0, Math.PI * 2); ctx.fill(); }
        if (this.flash && this.flash.ids.size && g.units.some(u => this.flash.ids.has(u.id))) {
          const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 150);
          ctx.strokeStyle = `rgba(255,220,90,${0.5 + 0.5 * pulse})`; ctx.lineWidth = 2.5;
          roundRect(ctx, x - 3 - 3 * pulse, y - 3 - 3 * pulse, w + 6 + 6 * pulse, h + 10 + 6 * pulse, 6); ctx.stroke();
          ctx.fillStyle = '#ffd34a'; roundRect(ctx, x + w - 14, y - 11, 24, 11, 3); ctx.fill();
          ctx.fillStyle = '#2a1d00'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NEW', x + w - 2, y - 5.2);
        }
        this.counterRects.push({ x, y, w, h: h + 4, n: g.n, c: g.c, ids: g.units.map(u => u.id) });
        row++;
      }
    }
  }

  // ---------------------------------------------------------------- 點擊判定
  nodeAt(sx, sy) {
    const [mx, my] = this.screenToMap(sx, sy);
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < R; i++) {
      const b = GEOM.bbox[i];
      if (mx < b[0] || mx > b[2] || my < b[1] || my > b[3]) continue;
      if (ctx.isPointInPath(GEOM.paths[i], mx, my, 'evenodd')) return i;
    }
    for (let i = R; i < R + WORLD.S; i++) {
      const b = GEOM.bbox[i];
      if (mx < b[0] || mx > b[2] || my < b[1] || my > b[3]) continue;
      if (ctx.isPointInPath(GEOM.paths[i], mx, my, 'evenodd')) return i;
    }
    // 小島：最近的錨點
    let best = -1, bd = 14 / this.cam.z;
    for (let i = 0; i < R; i++) { if (nodes[i].area > 40) continue; const d = Math.hypot(nodes[i].x - mx, nodes[i].y - my); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  counterAt(sx, sy) {
    for (let k = this.counterRects.length - 1; k >= 0; k--) {
      const r = this.counterRects[k];
      if (sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h) return r;
    }
    return null;
  }

  // ---------------------------------------------------------------- 輸入
  bind() {
    const cv = this.cv;
    let drag = null, pinch = null, moved = false, downAt = 0;
    const pointers = new Map();
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      const sx = e.clientX - r.left, sy = e.clientY - r.top;
      const [mx, my] = this.screenToMap(sx, sy);
      const f = Math.exp(-e.deltaY * 0.0015);
      this.cam.z *= f; this.clampCam();
      // 保持游標下的點不動
      const z = this.cam.z;
      this.cam.x = mx - (sx - this.vw / 2) / z; this.cam.y = my - (sy - this.vh / 2) / z;
      this.clampCam(); this.dirty = true;
    }, { passive: false });
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: this.cam.z };
        drag = null; return;
      }
      drag = { x: e.clientX, y: e.clientY, cx: this.cam.x, cy: this.cam.y, btn: e.button, box: e.shiftKey && e.button === 0 };
      moved = false; downAt = Date.now();
    });
    cv.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect();
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.cam.z = pinch.z * d / pinch.d; this.clampCam(); this.dirty = true; return;
      }
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
        if (moved && drag.box) { this.box = [drag.x - r.left, drag.y - r.top, e.clientX - r.left, e.clientY - r.top]; this.dirty = true; return; }
        if (moved && (drag.btn === 0 || drag.btn === 1)) {
          this.cam.x = drag.cx - dx / this.cam.z; this.cam.y = drag.cy - dy / this.cam.z;
          this.clampCam(); this.dirty = true;
        }
        return;
      }
      if (e.pointerType === 'mouse') {
        const n = this.nodeAt(e.clientX - r.left, e.clientY - r.top);
        if (n !== this.hover) { this.hover = n; this.dirty = true; this.onHover(n, e.clientX, e.clientY); }
      }
    });
    const up = (e) => {
      const r = cv.getBoundingClientRect();
      pointers.delete(e.pointerId);
      if (pinch) { if (pointers.size < 2) pinch = null; return; }
      if (!drag) return;
      const d = drag; drag = null;
      const sx = e.clientX - r.left, sy = e.clientY - r.top;
      if (d.box && this.box) {
        const [x0, y0, x1, y1] = this.box; this.box = null;
        const ids = [];
        for (const c of this.counterRects) if (c.c === this.me && c.x + c.w / 2 >= Math.min(x0, x1) && c.x + c.w / 2 <= Math.max(x0, x1) && c.y >= Math.min(y0, y1) && c.y <= Math.max(y0, y1)) ids.push(...c.ids);
        this.onSelect(ids, false); this.dirty = true; return;
      }
      if (moved) return;
      const longPress = e.pointerType !== 'mouse' && Date.now() - downAt > 500;
      if (d.btn === 2 || longPress || this.orderMode) {
        const n = this.nodeAt(sx, sy);
        if (n >= 0) this.onOrder(n);
        this.orderMode = false;
        return;
      }
      const c = this.counterAt(sx, sy);
      if (c && c.c === this.me) { this.onSelect(c.ids, e.shiftKey); return; }
      const n = this.nodeAt(sx, sy);
      this.onRegion(n, c);
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); drag = null; pinch = null; });
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  ctx.closePath();
}
function arrowHead(ctx, x, y, from) {
  const [fx, fy] = from; const a = Math.atan2(y - fy, x - fx);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9 * Math.cos(a - 0.4), y - 9 * Math.sin(a - 0.4)); ctx.lineTo(x - 9 * Math.cos(a + 0.4), y - 9 * Math.sin(a + 0.4)); ctx.closePath();
  ctx.fillStyle = 'rgba(255,230,120,0.95)'; ctx.fill();
}
export { TERRAIN_COLORS };
