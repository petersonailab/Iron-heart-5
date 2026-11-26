// 國旗繪製：把 data/flags.js 的簡化圖形畫到 Canvas，並快取（地圖用 Canvas、介面用 dataURL 圖片）
import { flagSpec } from '../data/flags.js';

const CACHE = new Map();
const URLS = new Map();
const TAU = Math.PI * 2;

function bands(g, W, H, cols, vertical) {
  const parts = cols.map(c => { const [col, w] = String(c).split('*'); return [col, Number(w || 1)]; });
  const tot = parts.reduce((s, p) => s + p[1], 0);
  let o = 0;
  for (const [col, w] of parts) {
    g.fillStyle = col;
    const a = (o / tot), b = ((o + w) / tot);
    if (vertical) g.fillRect(Math.floor(a * W), 0, Math.ceil((b - a) * W) + 1, H);
    else g.fillRect(0, Math.floor(a * H), W, Math.ceil((b - a) * H) + 1);
    o += w;
  }
}
function starPath(g, x, y, r, rot = 0, pts = 5, inner = 0.382) {
  g.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = -Math.PI / 2 + (rot * Math.PI / 180) + i * Math.PI / pts;
    const rr = i % 2 ? r * inner : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}
function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
function shieldPath(g, cx, cy, w, h) {
  g.beginPath();
  g.moveTo(cx - w / 2, cy - h / 2); g.lineTo(cx + w / 2, cy - h / 2); g.lineTo(cx + w / 2, cy + h * 0.1);
  g.quadraticCurveTo(cx + w / 2, cy + h * 0.4, cx, cy + h / 2);
  g.quadraticCurveTo(cx - w / 2, cy + h * 0.4, cx - w / 2, cy + h * 0.1);
  g.closePath();
}
function union(g, X, Y, w, h) {
  g.save();
  g.beginPath(); g.rect(X, Y, w, h); g.clip();
  g.fillStyle = '#012169'; g.fillRect(X, Y, w, h);
  g.lineCap = 'butt';
  g.strokeStyle = '#fff'; g.lineWidth = h * 0.2;
  g.beginPath(); g.moveTo(X, Y); g.lineTo(X + w, Y + h); g.moveTo(X + w, Y); g.lineTo(X, Y + h); g.stroke();
  g.strokeStyle = '#c8102e'; g.lineWidth = h * 0.067;
  g.beginPath(); g.moveTo(X, Y); g.lineTo(X + w, Y + h); g.moveTo(X + w, Y); g.lineTo(X, Y + h); g.stroke();
  g.fillStyle = '#fff'; g.fillRect(X + w / 2 - h * 0.167, Y, h * 0.333, h); g.fillRect(X, Y + h / 2 - h * 0.167, w, h * 0.333);
  g.fillStyle = '#c8102e'; g.fillRect(X + w / 2 - h * 0.1, Y, h * 0.2, h); g.fillRect(X, Y + h / 2 - h * 0.1, w, h * 0.2);
  g.restore();
}
const OPS = {
  bg: (g, W, H, c) => { g.fillStyle = c; g.fillRect(0, 0, W, H); },
  h: (g, W, H, cols) => bands(g, W, H, cols, false),
  v: (g, W, H, cols) => bands(g, W, H, cols, true),
  stripes: (g, W, H, [n, a, b]) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(0, Math.floor(i * H / n), W, Math.ceil(H / n) + 1); } },
  rect: (g, W, H, [c, x, y, w, h]) => { g.fillStyle = c; g.fillRect(x * W, y * H, w * W, h * H); },
  canton: (g, W, H, [c, w, h]) => { g.fillStyle = c; g.fillRect(0, 0, w * W, h * H); },
  disc: (g, W, H, [c, x, y, r]) => { g.fillStyle = c; g.beginPath(); g.arc(x * W, y * H, r * H, 0, TAU); g.fill(); },
  ring: (g, W, H, [c, x, y, r, lw]) => { g.strokeStyle = c; g.lineWidth = lw * H; g.beginPath(); g.arc(x * W, y * H, r * H, 0, TAU); g.stroke(); },
  blob: (g, W, H, [c, x, y, rx, ry]) => { g.fillStyle = c; g.beginPath(); g.ellipse(x * W, y * H, rx * W, ry * H, -0.15, 0, TAU); g.fill(); },
  star: (g, W, H, [c, x, y, r, rot]) => { g.fillStyle = c; starPath(g, x * W, y * H, r * H, rot); g.fill(); },
  pent: (g, W, H, [c, x, y, r, lw]) => { g.strokeStyle = c; g.lineWidth = lw * H; g.beginPath(); for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; g.lineTo(x * W + Math.cos(a) * r * H, y * H + Math.sin(a) * r * H); } g.stroke(); },
  cross: (g, W, H, [c, cx, th]) => { g.fillStyle = c; g.fillRect(cx * W - th * H / 2, 0, th * H, H); g.fillRect(0, H / 2 - th * H / 2, W, th * H); },
  cross2: (g, W, H, [c, th]) => { g.fillStyle = c; g.fillRect(W / 2 - th * H / 2, 0, th * H, H); g.fillRect(0, H / 2 - th * H / 2, W, th * H); },
  ccross: (g, W, H, [c, cw, ch, th]) => { g.fillStyle = c; g.fillRect(cw * W / 2 - th * H / 2, 0, th * H, ch * H); g.fillRect(0, ch * H / 2 - th * H / 2, cw * W, th * H); },
  saltire: (g, W, H, [c, th]) => { g.strokeStyle = c; g.lineWidth = th * H; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, H); g.moveTo(W, 0); g.lineTo(0, H); g.stroke(); },
  tri: (g, W, H, [c, w]) => { g.fillStyle = c; poly(g, [0, 0, w * W, H / 2, 0, H]); g.fill(); },
  trap: (g, W, H, [c, w]) => { g.fillStyle = c; poly(g, [0, 0, w * W, H / 3, w * W, H * 2 / 3, 0, H]); g.fill(); },
  sidetri: (g, W, H, [c]) => { g.fillStyle = c; poly(g, [0, 0, W / 2, H / 2, 0, H]); g.fill(); poly(g, [W, 0, W / 2, H / 2, W, H]); g.fill(); },
  diag: (g, W, H, [a, b, c]) => {
    g.fillStyle = a; poly(g, [0, 0, W, 0, 0, H]); g.fill();
    g.fillStyle = c; poly(g, [W, 0, W, H, 0, H]); g.fill();
    g.strokeStyle = b; g.lineWidth = H * 0.3; g.beginPath(); g.moveTo(-W * 0.1, H * 1.07); g.lineTo(W * 1.1, -H * 0.07); g.stroke();
  },
  diamond: (g, W, H, [c, x, y, rw, rh]) => { g.fillStyle = c; poly(g, [x * W - rw * W, y * H, x * W, y * H - rh * H, x * W + rw * W, y * H, x * W, y * H + rh * H]); g.fill(); },
  crescent: (g, W, H, [c, bg, x, y, r, off]) => {
    g.fillStyle = c; g.beginPath(); g.arc(x * W, y * H, r * H, 0, TAU); g.fill();
    g.fillStyle = bg; g.beginPath();
    if (off >= 0) g.arc(x * W + off * r * H, y * H, r * H * 0.8, 0, TAU); else g.arc(x * W, y * H + off * r * H, r * H * 0.8, 0, TAU);
    g.fill();
  },
  union: (g, W, H, [x, y, w, h]) => union(g, x * W, y * H, w * W, h * H),
  dots: (g, W, H, [c, cw, ch, rows, cols]) => {
    g.fillStyle = c;
    const dx = cw * W / cols, dy = ch * H / rows, r = Math.min(dx, dy) * 0.28;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { g.beginPath(); g.arc(dx * (j + 0.5), dy * (i + 0.5), r, 0, TAU); g.fill(); }
  },
  arc: (g, W, H, [c, x, y, r, n]) => { g.fillStyle = c; for (let i = 0; i < n; i++) { const a = Math.PI + (i + 0.5) * Math.PI / n; starPath(g, x * W + Math.cos(a) * r * H * 1.6, y * H + Math.sin(a) * r * H, r * H * 0.22); g.fill(); } },
  spokes: (g, W, H, [c, x, y, r, n]) => { g.strokeStyle = c; g.lineWidth = Math.max(0.6, H * 0.012); g.beginPath(); for (let i = 0; i < n; i++) { const a = i * TAU / n; g.moveTo(x * W, y * H); g.lineTo(x * W + Math.cos(a) * r * H, y * H + Math.sin(a) * r * H); } g.stroke(); },
  rays: (g, W, H, [a, b, n, x, y, r0, rlen, half]) => {
    const R = rlen ? rlen * H : Math.hypot(W, H);
    const span = half ? Math.PI : Math.PI * 2;
    for (let i = 0; i < n * 2; i++) {
      const col = i % 2 ? b : a; if (!col) continue;
      const a0 = -Math.PI + i * span / (n * 2), a1 = a0 + span / (n * 2);
      g.fillStyle = col; g.beginPath();
      g.moveTo(x * W + Math.cos(a0) * (r0 || 0) * H, y * H + Math.sin(a0) * (r0 || 0) * H);
      g.lineTo(x * W + Math.cos(a0) * R, y * H + Math.sin(a0) * R); g.lineTo(x * W + Math.cos(a1) * R, y * H + Math.sin(a1) * R);
      g.lineTo(x * W + Math.cos(a1) * (r0 || 0) * H, y * H + Math.sin(a1) * (r0 || 0) * H);
      g.closePath(); g.fill();
    }
  },
  mount: (g, W, H, [c, x, base]) => { g.fillStyle = c; poly(g, [x * W - 0.42 * W, H, x * W, base * H, x * W + 0.42 * W, H]); g.fill(); },
  triup: (g, W, H, [c, x, y, s]) => { g.fillStyle = c; poly(g, [x * W - s * H, y * H + s * H * 0.8, x * W, y * H - s * H, x * W + s * H, y * H + s * H * 0.8]); g.fill(); },
  shield: (g, W, H, [c, x, y, w, h]) => { g.fillStyle = c; shieldPath(g, x * W, y * H, w * H, h * H); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = H * 0.015; g.stroke(); },
  savoy: (g, W, H, [x, y, s]) => {
    const cx = x * W, cy = y * H, w = s * H * 0.62, h = s * H * 0.78;
    g.fillStyle = '#0046ae'; shieldPath(g, cx, cy, w, h); g.fill();
    g.fillStyle = '#d00'; shieldPath(g, cx, cy, w * 0.78, h * 0.8); g.fill();
    g.fillStyle = '#fff'; g.fillRect(cx - w * 0.08, cy - h * 0.36, w * 0.16, h * 0.68); g.fillRect(cx - w * 0.33, cy - h * 0.1, w * 0.66, h * 0.15);
  },
  checker: (g, W, H, [x, y, s]) => {
    const n = 5, cs = s * H / n, x0 = x * W - s * H / 2, y0 = y * H - s * H / 2;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? '#fff' : '#ff0000'; g.fillRect(x0 + j * cs, y0 + i * cs, cs + 0.5, cs + 0.5); }
    g.strokeStyle = '#171796'; g.lineWidth = H * 0.02; g.strokeRect(x0, y0, s * H, s * H);
  },
  hs: (g, W, H, [c, x, y, s]) => {
    const cx = x * W, cy = y * H, S = s * H;
    g.strokeStyle = c; g.lineCap = 'round'; g.lineWidth = S * 0.13;
    g.beginPath(); g.arc(cx + S * 0.02, cy - S * 0.02, S * 0.34, Math.PI * 0.15, Math.PI * 1.35); g.stroke();
    g.beginPath(); g.moveTo(cx - S * 0.18, cy + S * 0.22); g.lineTo(cx - S * 0.36, cy + S * 0.42); g.stroke();
    g.beginPath(); g.moveTo(cx - S * 0.32, cy + S * 0.38); g.lineTo(cx + S * 0.2, cy - S * 0.16); g.stroke();
    g.lineWidth = S * 0.16; g.beginPath(); g.moveTo(cx + S * 0.06, cy - S * 0.32); g.lineTo(cx + S * 0.34, cy - S * 0.04); g.stroke();
  },
  hammer: (g, W, H, [c, x, y, s]) => {
    const cx = x * W, cy = y * H, S = s * H;
    g.strokeStyle = c; g.lineWidth = S * 0.16; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - S * 0.5, cy + S * 0.55); g.lineTo(cx, cy - S * 0.55); g.lineTo(cx + S * 0.5, cy + S * 0.55); g.stroke();
    g.beginPath(); g.moveTo(cx - S * 0.35, cy - S * 0.2); g.lineTo(cx + S * 0.35, cy - S * 0.2); g.stroke();
  },
  sun: (g, W, H, [x, y, r]) => {
    const cx = x * W, cy = y * H, R = r * H;
    g.fillStyle = '#fff';
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + i * TAU / 12, d = TAU / 24 * 0.9;
      poly(g, [cx + Math.cos(a) * R, cy + Math.sin(a) * R, cx + Math.cos(a + d) * R * 0.55, cy + Math.sin(a + d) * R * 0.55, cx + Math.cos(a - d) * R * 0.55, cy + Math.sin(a - d) * R * 0.55]); g.fill();
    }
    g.fillStyle = '#000095'; g.beginPath(); g.arc(cx, cy, R * 0.56, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, R * 0.47, 0, TAU); g.fill();
  },
  eagle: (g, W, H, [c, x, y, s]) => {
    const cx = x * W, cy = y * H, S = s * H;
    g.fillStyle = c;
    poly(g, [cx, cy - S * 0.35, cx + S * 0.9, cy - S * 0.55, cx + S * 0.55, cy - S * 0.05, cx + S * 0.75, cy + S * 0.05, cx + S * 0.25, cy + S * 0.25, cx + S * 0.18, cy + S * 0.75, cx, cy + S * 0.45, cx - S * 0.18, cy + S * 0.75, cx - S * 0.25, cy + S * 0.25, cx - S * 0.75, cy + S * 0.05, cx - S * 0.55, cy - S * 0.05, cx - S * 0.9, cy - S * 0.55]);
    g.fill();
    g.beginPath(); g.arc(cx - S * 0.16, cy - S * 0.52, S * 0.13, 0, TAU); g.arc(cx + S * 0.16, cy - S * 0.52, S * 0.13, 0, TAU); g.fill();
  },
  script: (g, W, H, [c, x, y, w]) => {
    g.strokeStyle = c; g.lineWidth = H * 0.04; g.lineCap = 'round';
    const x0 = x * W - w * W / 2, y0 = y * H;
    g.beginPath();
    for (let i = 0; i <= 12; i++) { const px = x0 + i * w * W / 12; g.lineTo(px, y0 + Math.sin(i * 1.7) * H * 0.06); }
    g.stroke();
    for (let i = 0; i < 5; i++) { g.beginPath(); const px = x0 + (i + 0.6) * w * W / 5; g.moveTo(px, y0 - H * 0.12); g.lineTo(px, y0 + H * 0.02); g.stroke(); }
  },
  tulip: (g, W, H, [c, x, y, s]) => {
    const cx = x * W, cy = y * H, S = s * H;
    g.strokeStyle = c; g.lineWidth = S * 0.18; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, cy - S); g.lineTo(cx, cy + S); g.stroke();
    g.beginPath(); g.arc(cx - S * 0.35, cy, S * 0.55, -1.2, 1.2); g.stroke();
    g.beginPath(); g.arc(cx + S * 0.35, cy, S * 0.55, Math.PI - 1.2, Math.PI + 1.2); g.stroke();
  },
  leaf: (g, W, H, [c, x, y, s]) => {
    const cx = x * W, cy = y * H, S = s * H;
    const P = [0, -1, 0.15, -0.65, 0.42, -0.75, 0.33, -0.3, 0.75, -0.5, 0.62, -0.18, 0.95, -0.05, 0.62, 0.15, 0.7, 0.42, 0.1, 0.32, 0.06, 0.9, -0.06, 0.9, -0.1, 0.32, -0.7, 0.42, -0.62, 0.15, -0.95, -0.05, -0.62, -0.18, -0.75, -0.5, -0.33, -0.3, -0.42, -0.75, -0.15, -0.65];
    g.fillStyle = c; poly(g, P.map((v, i) => (i % 2 ? cy + v * S : cx + v * S))); g.fill();
  },
  tree: (g, W, H, [c, x, y, s]) => {
    const cx = x * W, cy = y * H, S = s * H;
    g.fillStyle = c;
    for (let i = 0; i < 3; i++) { const yy = cy - S * 0.8 + i * S * 0.45, w = S * (0.45 + i * 0.25); poly(g, [cx, yy, cx + w, yy + S * 0.55, cx - w, yy + S * 0.55]); g.fill(); }
    g.fillRect(cx - S * 0.08, cy + S * 0.6, S * 0.16, S * 0.35);
  },
  temple: (g, W, H, [c, x, y, s]) => {
    const cx = x * W, cy = y * H, S = s * H;
    g.fillStyle = c;
    g.fillRect(cx - S * 0.9, cy + S * 0.15, S * 1.8, S * 0.3);
    for (const [dx, hh] of [[-0.55, 0.55], [0, 0.85], [0.55, 0.55]]) { poly(g, [cx + (dx - 0.18) * S, cy + 0.15 * S, cx + dx * S, cy - hh * S, cx + (dx + 0.18) * S, cy + 0.15 * S]); g.fill(); }
  },
  taeguk: (g, W, H, [x, y, r]) => {
    const cx = x * W, cy = y * H, R = r * H;
    g.save(); g.translate(cx, cy); g.rotate(0.588);
    g.fillStyle = '#cd2e3a'; g.beginPath(); g.arc(0, 0, R, Math.PI, 0); g.fill();
    g.fillStyle = '#0047a0'; g.beginPath(); g.arc(0, 0, R, 0, Math.PI); g.fill();
    g.fillStyle = '#cd2e3a'; g.beginPath(); g.arc(-R / 2, 0, R / 2, 0, TAU); g.fill();
    g.fillStyle = '#0047a0'; g.beginPath(); g.arc(R / 2, 0, R / 2, 0, TAU); g.fill();
    g.restore();
    g.fillStyle = '#000';
    for (const [dx, dy, rot] of [[-0.3, -0.3, 0.588], [0.3, 0.3, 0.588], [0.3, -0.3, -0.588], [-0.3, 0.3, -0.588]]) {
      g.save(); g.translate(x * W + dx * W, y * H + dy * H); g.rotate(rot);
      for (let i = 0; i < 3; i++) g.fillRect(-R * 0.35, -R * 0.32 + i * R * 0.25, R * 0.7, R * 0.15);
      g.restore();
    }
  },
  hexagram: (g, W, H, [c, x, y, r, lw]) => {
    g.strokeStyle = c; g.lineWidth = lw * H;
    for (const off of [-Math.PI / 2, Math.PI / 2]) { g.beginPath(); for (let i = 0; i < 3; i++) { const a = off + i * TAU / 3; g.lineTo(x * W + Math.cos(a) * r * H, y * H + Math.sin(a) * r * H); } g.closePath(); g.stroke(); }
  },
  nepal: (g, W, H) => {
    const w = H * 0.82, x0 = (W - w) / 2;
    const P = [x0, 0, x0 + w * 0.95, H * 0.45, x0 + w * 0.34, H * 0.45, x0 + w * 0.95, H, x0, H];
    g.fillStyle = '#003893'; poly(g, P); g.fill();
    g.save(); g.translate(x0 + w * 0.42, H * 0.5); g.scale(0.84, 0.88); g.translate(-(x0 + w * 0.42), -H * 0.5);
    g.fillStyle = '#dc143c'; poly(g, P); g.fill(); g.restore();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x0 + w * 0.3, H * 0.3, H * 0.07, 0, Math.PI); g.fill();
    starPath(g, x0 + w * 0.3, H * 0.75, H * 0.09, 0, 12, 0.6); g.fill();
  },
};

function render(spec, W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  for (const op of spec) {
    const k = Object.keys(op)[0];
    const f = OPS[k];
    if (!f) continue;
    try { if (k === 'bg') f(g, W, H, op.bg); else f(g, W, H, op[k]); } catch (e) { /* 單一圖形錯誤不影響其他 */ }
  }
  return c;
}
// 取得某國在某年的國旗 Canvas（像素尺寸 W×H）
export function flagCanvas(tag, year, W = 48, H = 32) {
  const s = flagSpec(tag, year);
  if (!s || typeof document === 'undefined') return null;
  const key = `${tag}|${s.era}|${W}x${H}`;
  let c = CACHE.get(key);
  if (!c) { c = render(s.spec, W, H); CACHE.set(key, c); }
  return c;
}
export function flagURL(tag, year) {
  const s = flagSpec(tag, year);
  if (!s) return null;
  const key = `${tag}|${s.era}`;
  let u = URLS.get(key);
  if (!u) { const c = flagCanvas(tag, year, 96, 64); u = c ? c.toDataURL('image/png') : null; URLS.set(key, u); }
  return u;
}
