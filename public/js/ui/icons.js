// 圖示集：兵種剪影（地圖部隊標誌與介面共用）、介面圖示、地圖設施圖示，以及科技樹的歷史型號剪影
// 路徑模式：f 填滿、e 填滿（奇偶規則，可挖出輪子等鏤空）、s 描線

// ------------------------------------------------------------ 兵種剪影（24×16，陸海軍為側面、空軍為俯視）
const WHEELS = (xs, y, r) => xs.map(x => `M${x + r} ${y}A${r} ${r} 0 1 0 ${x - r} ${y}A${r} ${r} 0 1 0 ${x + r} ${y}Z`).join('');
const TRACK = (x0, x1, y0, y1) => { const r = (y1 - y0) / 2; return `M${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}H${x0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`; };
const SOLDIER = [
  ['M8.2 4.3C8.2 2.4 9.6 1.3 11.2 1.3S14.2 2.4 14.2 4.3Z', 'f'], ['M7.4 4.1H15V5H7.4Z', 'f'], ['M9.6 5H12.6V6.6H9.6Z', 'f'],
  ['M8.4 6.8H13.8L14.6 11.4H7.8Z', 'f'], ['M8.2 11.4H10.4L9.8 15.4H7.6Z', 'f'], ['M11.6 11.4H13.8L14.8 15.4H12.6Z', 'f'],
  ['M6.4 7.2H8.4V10.6H6.4Z', 'f'], ['M3.4 13.6L18.8 3.4L19.5 4.3L4.1 14.5Z', 'f'],
];
export const GLYPHS = {
  inf: SOLDIER,
  mar: [...SOLDIER, ['M20.2 9.4V14.8M18.6 10.9H21.8M18 13.2Q20.2 16.2 22.4 13.2', 's']],
  mec: [['M2.4 6.8H15.4L18.6 9H21.8V11.8H2.4Z', 'f'], [TRACK(2.4, 14.8, 12, 15.8) + WHEELS([4.6, 8.4, 12.4], 13.9, 1.1), 'e'], [WHEELS([19.4], 13.9, 1.9), 'f'], ['M5 6.8V5.2H11V6.8Z', 'f']],
  ltk: [[TRACK(3, 18.6, 11.2, 15.8) + WHEELS([5.3, 8.9, 12.6, 16.3], 13.5, 1.2), 'e'], ['M3 8.6H17.2L19 11.2H2.6Z', 'f'], ['M7.4 6H12.4L13 8.6H7Z', 'f'], ['M12.8 6.8H18.4V7.6H12.8Z', 'f']],
  arm: [[TRACK(2, 20, 11, 15.9) + WHEELS([4.6, 8.3, 12, 15.7], 13.45, 1.25), 'e'], ['M2.2 8H17.8L20.4 11H1.8Z', 'f'], ['M6.8 4.8H13.4L14.4 8H6.2Z', 'f'], ['M14 5.8H22.8V6.9H14Z', 'f']],
  htk: [[TRACK(1.4, 20.6, 11, 15.9) + WHEELS([4, 7.6, 11.2, 14.8, 18.2], 13.45, 1.3), 'e'], ['M1.4 7.2H18.6L21 11H1Z', 'f'], ['M5.8 3.4H14.6L15.5 7.2H5.2Z', 'f'], ['M15 4.6H23.4V6H15Z', 'f'], ['M22.2 4.1H23.8V6.5H22.2Z', 'f']],
  mbt: [[TRACK(1.6, 20.4, 11.2, 15.9) + WHEELS([4, 7.7, 11.4, 15.1, 18.2], 13.55, 1.2), 'e'], ['M1.6 8.4H18.4L21.2 11.2H1.2Z', 'f'], ['M5.6 6H15.6L17.4 7.5L15.6 8.4H5.6Z', 'f'], ['M16.4 6.5H23.8V7.4H16.4Z', 'f']],
  ftr: [['M12 1.6L13.1 6L21.5 7.8L21.5 9.2L13.1 9.4L12.9 12.3L15.2 13.6L15.2 14.4L12 13.7L8.8 14.4L8.8 13.6L11.1 12.3L10.9 9.4L2.5 9.2L2.5 7.8L10.9 6Z', 'f']],
  jet: [['M12 1.2L13.6 6.6L21.5 12.2L21.5 13.4L13.6 11.6L13.2 13.1L14.8 14.6L9.2 14.6L10.8 13.1L10.4 11.6L2.5 13.4L2.5 12.2L10.4 6.6Z', 'f']],
  cas: [['M12 2.5L13 6.2L20 5.4L21.5 7.6L13 8.8L12.9 12.1L15 13.5L9 13.5L11.1 12.1L11 8.8L2.5 7.6L4 5.4L11 6.2Z', 'f'], ['M11 14.4h2v1.4h-2z', 'f']],
  bmb: [['M12 1.4L13.1 4.8L22.3 6.8L22.3 8.9L13.1 9.4L13 12.4L16.2 13.9L16.2 14.6L7.8 14.6L7.8 13.9L11 12.4L10.9 9.4L1.7 8.9L1.7 6.8L10.9 4.8Z', 'f'], ['M6 5.6h1.6v3.2H6zM16.4 5.6h1.6v3.2h-1.6z', 'f']],
  str: [['M12 0.8L13.2 4.2L23.4 6.8L23.4 9L13.2 9.4L13.1 12.4L17.5 14.4L17.5 15.2L6.5 15.2L6.5 14.4L10.9 12.4L10.8 9.4L0.6 9L0.6 6.8L10.8 4.2Z', 'f'], ['M4 5.4h1.4v3.4H4zM7.6 4.8H9v3.6H7.6zM15 4.8h1.4v3.6H15zM18.6 5.4H20v3.4h-1.4z', 'f']],
  nvb: [['M12 1.2L13 4.4L21 6.2L21 8L13 8.4L12.9 10.6L15.4 11.8L8.6 11.8L11.1 10.6L11 8.4L3 8L3 6.2L11 4.4Z', 'f'], ['M3 14.6q2.25-1.6 4.5 0t4.5 0t4.5 0t4.5 0', 's']],
  hel: [['M2 3.6H22', 's'], ['M12 3.6V6.4', 's'], ['M8.2 6.4H14.6A3.3 3.3 0 0 1 14.6 13H8.2A3.3 3.3 0 0 1 8.2 6.4Z', 'f'], ['M17.6 9.4H23M22.6 7.8V11', 's'], ['M7 14.6H16', 's']],
  flt: [['M1.5 9.6H22.5L19.4 14H4.6Z', 'f'], ['M7.6 9.6V6.8H10.6V4.4H13V6.8H16.4V9.6Z', 'f'], ['M16.8 8.4H21.4V9.2H16.8ZM2.6 8.4H7.2V9.2H2.6Z', 'f']],
  car: [['M0.8 8.6H23.2L20.2 13.2H3.8Z', 'f'], ['M16 8.6V5.2H18.6V8.6Z', 'f'], ['M0.4 7.6H23.6V8.6H0.4Z', 'f']],
  sub: [['M2.6 10.2A3 2.6 0 0 1 5.6 7.6H19A3 2.6 0 0 1 19 12.8H5.6A3 2.6 0 0 1 2.6 10.2Z', 'f'], ['M9.6 7.6V4.8H12.8V7.6Z', 'f']],
};
function svgPaths(list, extraAttr = '') {
  return list.map(([d, m]) => m === 's'
    ? `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"${extraAttr}/>`
    : `<path d="${d}" fill="currentColor"${m === 'e' ? ' fill-rule="evenodd"' : ''}${extraAttr}/>`).join('');
}
// DOM 用的 SVG 字串
export function glyphSVG(t, cls = 'gl') {
  const g = GLYPHS[t]; if (!g) return '';
  return `<svg class="${cls}" viewBox="0 0 24 16" aria-hidden="true">${svgPaths(g)}</svg>`;
}
// Canvas 用：快取 Path2D
const P2 = {};
function paths(key, list) {
  if (P2[key]) return P2[key];
  if (typeof Path2D === 'undefined') return [];
  return (P2[key] = (list || []).map(([d, m]) => [new Path2D(d), m]));
}
function drawPaths(ctx, ps, x, y, sx, sy, color, lw) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(sx, sy);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [p, m] of ps) { if (m === 's') ctx.stroke(p); else ctx.fill(p, m === 'e' ? 'evenodd' : 'nonzero'); }
  ctx.restore();
}
export function drawGlyph(ctx, t, x, y, w, h, color) {
  const ps = paths('g:' + t, GLYPHS[t]); if (!ps.length) return;
  drawPaths(ctx, ps, x, y, w / 24, h / 16, color, 1.6);
}

// ------------------------------------------------------------ 介面圖示（24×24）
export const UI_ICONS = {
  ic: [['M2 21V11.5L7 14.5V11.5L12 14.5V7.5H13.6V3H16.6V7.5H18V21Z', 'f'], ['M4.5 17h2.5v2H4.5zM9.5 17H12v2H9.5zM14.5 17H17v2h-2.5z', 'f']],
  man: [['M8.5 4.5a3.3 3.3 0 1 1 0 6.6a3.3 3.3 0 1 1 0-6.6Z', 'f'], ['M2 20.5c0-4.2 2.9-7.4 6.5-7.4s6.5 3.2 6.5 7.4Z', 'f'], ['M16.6 5.8a2.8 2.8 0 1 1 0 5.6a2.8 2.8 0 1 1 0-5.6Z', 'f'], ['M15.8 13.4c3.6-.6 6.4 2.4 6.4 6.6h-5.6c0-2.6-.3-4.7-.8-6.6Z', 'f']],
  pp: [['M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9Z', 'f']],
  nuke: [['M12 10a2 2 0 1 1 0 4a2 2 0 1 1 0-4Z', 'f'], ['M10.6 10.2L7 3.9A9 9 0 0 0 3 11h7.3Q10.2 10.6 10.6 10.2Z', 'f'], ['M13.4 10.2L17 3.9A9 9 0 0 1 21 11h-7.3Q13.8 10.6 13.4 10.2Z', 'f'], ['M10.7 13.9L7 20.2a9 9 0 0 0 10 0l-3.7-6.3Q12 14.6 10.7 13.9Z', 'f']],
  flag: [['M5 2.5V21.5', 's'], ['M5.8 3.5H19L16.2 8L19 12.5H5.8Z', 'f']],
  politics: [['M3 9L12 3L21 9Z', 'f'], ['M4 10H20V11.6H4Z', 'f'], ['M5.6 12.6H7.8V18H5.6ZM10.9 12.6h2.2V18h-2.2zM16.2 12.6h2.2V18h-2.2z', 'f'], ['M3 19H21V21H3Z', 'f']],
  research: [['M9 2.5H15V4.3H14V9.2L19.6 19C20.4 20.4 19.4 22 17.8 22H6.2C4.6 22 3.6 20.4 4.4 19L10 9.2V4.3H9Z', 'f']],
  production: [['M2 21V11.5L7 14.5V11.5L12 14.5V7.5H13.6V3H16.6V7.5H18V21Z', 'f']],
  diplomacy: [['M4 2.5H14.5L19 7V21.5H4ZM6.8 8V9.4H13V8ZM6.8 11.2V12.6H16.2V11.2ZM6.8 14.4V15.8H12V14.4Z', 'e'], ['M17 15.5a3.6 3.6 0 1 1 0 7.2a3.6 3.6 0 1 1 0-7.2Z', 'f']],
  army: [['M3 15.5C3 9.4 7 5 12 5S21 9.4 21 15.5Z', 'f'], ['M1.5 16H22.5V18.2H1.5Z', 'f']],
  news: [['M3 5H17.5V19H5.2A2.2 2.2 0 0 1 3 16.8ZM17.5 8.5H21V17A2 2 0 0 1 19 19H17.5ZM5.6 7.6V11.4H15V7.6ZM5.6 13H15V14.4H5.6ZM5.6 15.8H15V17.2H5.6Z', 'e']],
  airfield: [['M2 19H22V21H2Z', 'f'], ['M12 2.5L13.4 8.4L21 11.2V12.8L13.4 11.4L13 15.6L15.4 17V18L12 17.2L8.6 18V17L11 15.6L10.6 11.4L3 12.8V11.2L10.6 8.4Z', 'f']],
  port: [['M12 3a1.8 1.8 0 1 1 0 3.6A1.8 1.8 0 1 1 12 3Z', 'f'], ['M12 6.6V20M7.5 9.5H16.5M4 13.5Q5 20 12 20Q19 20 20 13.5', 's']],
  fort: [['M2 21V9H5V6H8V9H10V6H14V9H16V6H19V9H22V21H14V16A2 2 0 0 0 10 16V21Z', 'f']],
  rail: [['M8 2L5 22M16 2L19 22', 's'], ['M6 5H18M5.6 9H18.4M5 13.5H19M4.4 18H19.6', 's']],
  tank: GLYPHS.arm, plane: GLYPHS.ftr,
};
export function uiIcon(name, cls = 'ui-svg') {
  const g = UI_ICONS[name]; if (!g) return '';
  const vb = name === 'tank' || name === 'plane' ? '0 0 24 16' : '0 0 24 24';
  return `<svg class="${cls}" viewBox="${vb}" aria-hidden="true">${svgPaths(g)}</svg>`;
}
export function drawUiIcon(ctx, name, x, y, size, color) {
  const ps = paths('u:' + name, UI_ICONS[name]); if (!ps.length) return;
  drawPaths(ctx, ps, x, y, size / 24, size / 24, color, 2.2);
}

// ------------------------------------------------------------ 歷史型號剪影（120×60）
// 依參數產生坦克、飛機、艦艇、直升機與裝甲車的剪影，呈現不同年代與國家的外形差異
const r1 = (v) => Math.round(v * 10) / 10;
function tankShape(p) {
  const L = p.L || 90, H = p.H || 14, x0 = 0, x1 = L;
  let d = TRACK(x0, x1, 41, 54);
  const n = Math.max(4, Math.round(L / 15));
  for (let i = 0; i < n; i++) { const cx = x0 + 7 + i * (L - 14) / (n - 1); d += WHEELS([r1(cx)], 47.5, p.big ? 4.6 : 3.4); }
  const hy = 41 - H, sl = (p.slope ?? 0.4) * H * 1.4;
  const out = [[d, 'e'], [`M${x0 + 2} 41L${x0} ${r1(hy + H * 0.35)}L${x0 + 6} ${hy}H${r1(x1 - 6 - sl)}L${x1 + 2} ${r1(hy + H * 0.6)}L${x1 - 1} 41Z`, 'f']];
  if (p.skirt) out.push([`M${x0 + 3} 40H${x1 - 2}V46.5H${x0 + 3}Z`, 'f']);
  // 無砲塔的突擊砲、驅逐戰車與自走砲（固定戰鬥室）
  if (p.casemate) {
    const ch = p.th || 11, cx0 = x0 + L * (p.open ? 0.3 : 0.16), cx1 = x0 + L * 0.84;
    if (p.open) out.push([`M${r1(cx0)} ${hy}V${r1(hy - ch)}H${r1(cx0 + 3)}V${r1(hy - 3)}H${r1(cx1 - 6)}V${r1(hy - ch)}L${r1(cx1)} ${hy}Z`, 'f']);
    else out.push([`M${r1(cx0)} ${hy}L${r1(cx0 + 5)} ${r1(hy - ch)}H${r1(cx1 - ch * (p.slope ?? 0.6) * 1.2)}L${r1(cx1)} ${hy}Z`, 'f']);
    const gy = hy - ch * (p.open ? 0.75 : 0.5), gl = p.gun || 30, gx = p.open ? cx1 - 8 : cx1 - ch * 0.7, gt = p.gt || 2.6;
    if (p.elev) out.push([rotRect(gx, gy, gl, gt + 0.6, p.elev), 'f']);
    else out.push([`M${r1(gx)} ${r1(gy - gt / 2)}H${r1(gx + gl)}V${r1(gy + gt / 2)}H${r1(gx)}Z`, 'f']);
    if (p.muzzle) out.push([`M${r1(gx + gl - 4)} ${r1(gy - gt)}h4v${r1(gt * 2)}h-4Z`, 'f']);
    return { paths: out, w: Math.max(x1 + 2, gx + (p.elev ? Math.cos(p.elev * Math.PI / 180) * gl : gl)) };
  }
  const tw = p.tw || 30, th = p.th || 11, tx = x0 + L * (p.tpos || 0.42);
  if (p.round) out.push([`M${r1(tx - tw / 2)} ${hy}C${r1(tx - tw / 2)} ${r1(hy - th * 1.25)} ${r1(tx + tw / 2)} ${r1(hy - th * 1.35)} ${r1(tx + tw / 2 + 2)} ${hy}Z`, 'f']);
  else if (p.flat) out.push([`M${r1(tx - tw / 2)} ${hy}L${r1(tx - tw / 2 + 2)} ${r1(hy - th)}H${r1(tx + tw / 2 - 5)}L${r1(tx + tw / 2 + 4)} ${r1(hy - th * 0.45)}L${r1(tx + tw / 2)} ${hy}Z`, 'f']);
  else out.push([`M${r1(tx - tw / 2)} ${hy}L${r1(tx - tw / 2 + 3)} ${r1(hy - th)}H${r1(tx + tw / 2 - 2)}L${r1(tx + tw / 2)} ${hy}Z`, 'f']);
  out.push([`M${r1(tx - tw * 0.28)} ${r1(hy - th * (p.round ? 1.05 : 1))}h${r1(tw * 0.2)}v-${r1(th * 0.3)}h-${r1(tw * 0.2)}Z`, 'f']);
  const gy = hy - th * 0.55, gl = p.gun || 30, gt = p.gt || 2.6, gx = tx + tw / 2 - 3;
  out.push([`M${r1(gx)} ${r1(gy - gt / 2)}H${r1(gx + gl)}V${r1(gy + gt / 2)}H${r1(gx)}Z`, 'f']);
  if (p.muzzle) out.push([`M${r1(gx + gl - 4)} ${r1(gy - gt)}h4v${r1(gt * 2)}h-4Z`, 'f']);
  return { paths: out, w: Math.max(x1 + 2, gx + gl) };
}
function apcShape(p) {
  const L = 88;
  const out = [];
  if (p.tracks) { let d = TRACK(0, L, 42, 54); for (let i = 0; i < 6; i++) d += WHEELS([r1(7 + i * (L - 14) / 5)], 48, 3.4); out.push([d, 'e']); }
  else out.push([WHEELS([14, 32, 62, 80], 48, 6.5), 'f']);
  out.push([`M0 42L3 ${p.ifv ? 26 : 24}H${L - 22}L${L + 4} 34L${L} 42Z`, 'f']);
  if (p.half) out.push([`M${L - 20} 30H${L + 6}L${L + 8} 38H${L - 20}Z`, 'f']);
  if (p.ifv) { out.push([`M30 26L33 18H50L53 26Z`, 'f']); out.push([`M50 20H${L + 10}V22H50Z`, 'f']); }
  return { paths: out, w: L + (p.ifv ? 12 : 8) };
}
function planeShape(p) {
  const len = p.len || 84, fw = p.fw || 7, span = p.span || 50, chord = p.chord || 16, taper = p.taper ?? 0.6, rx = len * (p.wx || 0.58), c = 30;
  const out = [];
  out.push([`M0 ${r1(c - fw * 0.35)}L${r1(len * 0.15)} ${r1(c - fw / 2)}H${r1(len * 0.84)}Q${len} ${r1(c - fw / 2)} ${len} ${c}Q${len} ${r1(c + fw / 2)} ${r1(len * 0.84)} ${r1(c + fw / 2)}H${r1(len * 0.15)}L0 ${r1(c + fw * 0.35)}Z`, 'f']);
  const wing = (sgn) => {
    const y0 = c - sgn * fw / 2, y1 = c - sgn * span / 2;
    if (p.wing === 'delta') return `M${r1(rx)} ${r1(y0)}L${r1(rx - chord * 0.9)} ${r1(y1)}L${r1(rx - chord * 1.05)} ${r1(y1)}L${r1(rx - chord * 1.15)} ${r1(y0)}Z`;
    const sw = p.wing === 'swept' ? (p.sweep || chord * 0.9) : p.wing === 'swing' ? (p.sweep || chord * 1.4) : (p.sweep || 0);
    return `M${r1(rx)} ${r1(y0)}L${r1(rx - sw)} ${r1(y1)}L${r1(rx - sw - chord * taper)} ${r1(y1)}L${r1(rx - chord)} ${r1(y0)}Z`;
  };
  out.push([wing(1) + wing(-1), 'f']);
  if (p.bi) out.push([`M${r1(rx + 4)} ${r1(c - span / 2)}h3v${span}h-3Z`, 'f']);
  if (p.tail !== 'none') {
    const ts = p.tspan || span * 0.38, tc = chord * 0.55, tsw = p.wing === 'swept' || p.wing === 'swing' ? tc * 0.8 : 0;
    const tail = (sgn) => `M${r1(len * 0.2)} ${r1(c - sgn * fw * 0.4)}L${r1(len * 0.2 - tsw)} ${r1(c - sgn * ts / 2)}L${r1(len * 0.2 - tsw - tc * 0.7)} ${r1(c - sgn * ts / 2)}L${r1(len * 0.2 - tc)} ${r1(c - sgn * fw * 0.4)}Z`;
    out.push([tail(1) + tail(-1), 'f']);
  }
  const nac = (f) => { const y = span / 2 * f; return `M${r1(rx - chord * 0.15)} ${r1(c - y - 2.6)}h${r1(chord * 0.8)}v5.2h-${r1(chord * 0.8)}ZM${r1(rx - chord * 0.15)} ${r1(c + y - 2.6)}h${r1(chord * 0.8)}v5.2h-${r1(chord * 0.8)}Z`; };
  const pods = (f) => { const y = span / 2 * f; return `M${r1(rx - chord * 0.5)} ${r1(c - y - 2)}h${r1(chord * 0.75)}v4h-${r1(chord * 0.75)}ZM${r1(rx - chord * 0.5)} ${r1(c + y - 2)}h${r1(chord * 0.75)}v4h-${r1(chord * 0.75)}Z`; };
  if (p.eng === 'nose') out.push([`M${len + 1} ${c - 7}h1.6v14h-1.6Z`, 'f']);
  if (p.eng === 'twin') out.push([nac(0.32) + `M${r1(rx + chord * 0.65)} ${r1(c - span * 0.16 - 6)}h1.2v12h-1.2ZM${r1(rx + chord * 0.65)} ${r1(c + span * 0.16 - 6)}h1.2v12h-1.2Z`, 'f']);
  if (p.eng === 'quad') out.push([nac(0.26) + nac(0.5), 'f']);
  if (p.eng === 'twinjet') out.push([pods(0.3), 'f']);
  if (p.eng === 'eight') out.push([pods(0.3) + pods(0.6), 'f']);
  if (p.eng === 'rear') out.push([`M${r1(len * 0.22)} ${c - 9}h${r1(len * 0.14)}v5h-${r1(len * 0.14)}ZM${r1(len * 0.22)} ${c + 4}h${r1(len * 0.14)}v5h-${r1(len * 0.14)}Z`, 'f']);
  if (p.dome) out.push([CIRC(len * 0.38, c, span * 0.17), 'f']);
  if (p.twintail) out.push([`M${r1(len * 0.04)} ${c - 6}h${r1(len * 0.18)}v1.6h-${r1(len * 0.18)}ZM${r1(len * 0.04)} ${c + 4.4}h${r1(len * 0.18)}v1.6h-${r1(len * 0.18)}Z`, 'f']);
  return { paths: out, w: len + 3 };
}
function shipShape(p) {
  const out = [];
  if (p.t === 'ss') {
    const L = p.len || 104;
    out.push([`M0 40Q0 ${p.nuc ? 31 : 34} ${p.nuc ? 16 : 10} ${p.nuc ? 31 : 34}H${L - 16}Q${L} 34 ${L} 40Q${L} 45 ${L - 16} 45H10Q0 45 0 40Z`, 'f']);
    out.push([`M${p.nuc ? L * 0.62 : L * 0.42} ${p.nuc ? 31 : 34}V24H${(p.nuc ? L * 0.62 : L * 0.42) + 12}V${p.nuc ? 31 : 34}Z`, 'f']);
    if (p.slbm) out.push([`M${L * 0.25} 31V28H${L * 0.55}V31Z`, 'f']);
    if (!p.nuc) out.push([`M${L * 0.6} 34V31H${L * 0.66}V34Z`, 'f']);
    return { paths: out, w: L };
  }
  const L = p.len || 108;
  out.push([`M2 38H${L - 10}L${L} 33L${L - 8} 46H8Z`, 'f']);
  if (p.t === 'cv') {
    out.push([`M0 31H${L - 2}V34.5H0Z`, 'f']);
    out.push([`M${L * 0.64} 31V20H${L * 0.74}V31Z`, 'f']); out.push([`M${L * 0.68} 20V12H${L * 0.7}V20Z`, 'f']);
    if (p.angled) out.push([`M${L * 0.08} 29L${L * 0.5} 31H${L * 0.08}Z`, 'f']);
    return { paths: out, w: L };
  }
  // 戰艦、巡洋艦、驅逐艦
  const big = p.t === 'bb';
  out.push([`M${L * 0.38} 38V${big ? 28 : 30}H${L * 0.6}V38Z`, 'f']);
  out.push([`M${L * 0.43} ${big ? 28 : 30}V${big ? 18 : 22}H${L * 0.52}V${big ? 28 : 30}Z`, 'f']);
  out.push([`M${L * 0.47} ${big ? 18 : 22}V${big ? 8 : 12}H${L * 0.49}V${big ? 18 : 22}Z`, 'f']);
  if (!p.missile) out.push([`M${L * 0.62} 38V26H${L * 0.68}V38Z`, 'f']);
  const turret = (x, dir) => `M${x} 38V34H${x + 9}V38ZM${dir > 0 ? x + 7 : x - 10} 35H${dir > 0 ? x + 19 : x + 2}V36.4H${dir > 0 ? x + 7 : x - 10}Z`;
  if (p.missile) { out.push([`M${L * 0.7} 38V33H${L * 0.82}V38ZM${L * 0.16} 38V33H${L * 0.3}V38Z`, 'f']); out.push([`M${L * 0.3} 30V24H${L * 0.34}V30Z`, 'f']); }
  else { out.push([turret(L * 0.7, 1) + (big ? turret(L * 0.8, 1) : '') + turret(L * 0.22, -1), 'f']); }
  return { paths: out, w: L + 2 };
}
function heliShape(p) {
  const out = [];
  out.push(['M48 24Q70 18 84 26Q92 30 86 36H50Q44 36 44 31Q44 26 48 24Z', 'f']);
  out.push(['M48 27L12 25V28.5L48 33Z', 'f']); out.push(['M12 25L8 15H12L17 26Z', 'f']);
  out.push(['M63 18H68V23H63Z', 'f']); out.push(['M16 15.5H114V17.8H16Z', 'f']);
  if (p.tandem) { out.length = 0; out.push(['M10 22Q10 18 16 18H84Q94 18 96 26Q96 36 88 36H16Q10 36 10 30Z', 'f']); out.push(['M12 18L14 10H22L24 18ZM80 18V12H86V18Z', 'f']); out.push(['M0 9.5H44V11.5H0ZM56 9.5H104V11.5H56Z', 'f']); out.push(['M22 36V42H26V36ZM76 36V42H80V36Z', 'f']); return { paths: out, w: 104 }; }
  if (p.attack) { out.push(['M58 31H78V33.5H58Z', 'f']); out.push(['M84 34H98V35.6H84Z', 'f']); out.push(['M56 36H60V42H56ZM76 36H80V42H76Z', 'f']); }
  else out.push(['M50 41.5H88V43.5H50ZM56 36H58V41.5H56ZM78 36H80V41.5H78Z', 'f']);
  return { paths: out, w: 114 };
}
// 旋轉矩形：從 (x, y) 沿角度 ang（度，逆時針）延伸 len，厚度 th
function rotRect(x, y, len, th, ang, back = 0) {
  const a = ang * Math.PI / 180, c = Math.cos(a), s = -Math.sin(a), nx = -s * th / 2, ny = c * th / 2;
  const x0 = x - c * back, y0 = y - s * back, x1 = x + c * len, y1 = y + s * len;
  return `M${r1(x0 + nx)} ${r1(y0 + ny)}L${r1(x1 + nx)} ${r1(y1 + ny)}L${r1(x1 - nx)} ${r1(y1 - ny)}L${r1(x0 - nx)} ${r1(y0 - ny)}Z`;
}
const along = (x, y, len, ang) => { const a = ang * Math.PI / 180; return [x + Math.cos(a) * len, y - Math.sin(a) * len]; };
const CIRC = (x, y, r) => `M${r1(x + r)} ${r1(y)}A${r} ${r} 0 1 0 ${r1(x - r)} ${r1(y)}A${r} ${r} 0 1 0 ${r1(x + r)} ${r1(y)}Z`;
// 輕兵器（側面）：步槍、衝鋒槍、機槍、突擊步槍、無托步槍、狙擊槍、火焰噴射器、榴彈發射器
function gunShape(p) {
  const L = p.L || 104, out = [], kind = p.kind || 'rifle';
  if (kind === 'flame') {
    out.push([`M2 18Q2 12 8 12H16Q22 12 22 18V40Q22 46 16 46H8Q2 46 2 40Z`, 'f']);
    out.push([`M22 20Q34 16 40 26`, 's']);
    out.push([`M36 24H${L - 8}V29H36Z`, 'f']); out.push([`M${L - 8} 23H${L}V30H${L - 8}Z`, 'f']);
    out.push([`M46 29H51L49 38H44Z`, 'f']); out.push([`M70 29H75L73 37H68Z`, 'f']);
    return { paths: out, w: L };
  }
  const bp = !!p.bullpup, y0 = 23.5, y1 = 30;
  const sL = p.stock === 'none' ? 0 : bp ? 0 : L * (p.sl || 0.27);
  const rL = L * (p.rl || (kind === 'smg' ? 0.3 : bp ? 0.46 : 0.24)), rx0 = sL, rx1 = rx0 + rL;
  const thick = kind === 'gl' ? 4 : 0;
  // 槍托
  if (!bp && p.stock !== 'none') {
    if (p.stock === 'skel' || p.stock === 'fold') out.push([`M0 25H${r1(sL)}M0 25V35L${r1(sL)} 30`, 's']);
    else if (p.stock === 'straight') out.push([`M0 24.5H${r1(sL)}V30L0 35Z`, 'f']);
    else out.push([`M0 27L${r1(sL)} ${y0}V${y1}L${r1(sL * 0.6)} 31.5L0 37Z`, 'f']);
  }
  // 機匣
  out.push([`M${r1(rx0)} ${y0 - thick / 2}H${r1(rx1)}V${y1 + thick / 2}H${r1(rx0)}Z`, 'f']);
  if (bp) out.push([`M${r1(rx0)} ${y0 + 1}L${r1(rx0 - 2)} 37H${r1(rx0 + 6)}L${r1(rx0 + 8)} ${y1}Z`, 'f']);
  // 握把
  const gx = bp ? rx0 + rL * 0.62 : rx0 + (p.stock === 'wood' || !p.stock ? 3 : 4);
  if (kind !== 'rifle' || bp || p.stock === 'straight' || p.stock === 'skel' || p.stock === 'fold' || p.stock === 'none') out.push([`M${r1(gx)} ${y1}H${r1(gx + 5)}L${r1(gx + 3)} 40H${r1(gx - 3)}Z`, 'f']);
  else out.push([`M${r1(gx + 4)} ${y1}Q${r1(gx + 7)} 35 ${r1(gx + 11)} ${y1}`, 's']);
  // 護木與槍管
  const hg = p.hg ?? (kind === 'rifle' || kind === 'ar' ? 0.26 : kind === 'smg' ? 0.08 : 0.1);
  const hx1 = rx1 + L * hg;
  if (hg > 0) out.push([`M${r1(rx1)} 24.5H${r1(hx1)}V29H${r1(rx1)}Z`, 'f']);
  const bt = kind === 'gl' ? 9 : kind === 'mg' ? 2.6 : 2;
  out.push([`M${r1(rx1)} ${r1(27 - bt / 2)}H${L}V${r1(27 + bt / 2)}H${r1(rx1)}Z`, 'f']);
  if (p.jacket) out.push([`M${r1(rx1)} 24H${r1(rx1 + L * 0.32)}V30H${r1(rx1)}Z` + [0.06, 0.13, 0.2, 0.27].map(f => CIRC(rx1 + L * f, 27, 1.1)).join(''), 'e']);
  out.push([`M${L - 3} 22H${L - 1.5}V25H${L - 3}Z`, 'f']);
  if (p.muzzle) out.push([`M${L - 5} 24.5H${L}V29.5H${L - 5}Z`, 'f']);
  // 彈匣
  const mx = bp ? rx0 + rL * 0.25 : rx0 + rL * (p.mpos || 0.45);
  const mag = p.mag || (kind === 'rifle' ? 'int' : 'box');
  if (mag === 'int') out.push([`M${r1(mx)} ${y1}h6v3h-6Z`, 'f']);
  else if (mag === 'box') out.push([`M${r1(mx)} ${y1}h6.5v${kind === 'mg' ? 7 : 10}h-6.5Z`, 'f']);
  else if (mag === 'long') out.push([`M${r1(mx)} ${y1}h6v15h-6Z`, 'f']);
  else if (mag === 'curve') out.push([`M${r1(mx)} ${y1}h7l2 6q1 5 4.5 8h-7.5q-3-3-4-8Z`, 'f']);
  else if (mag === 'drum') out.push([CIRC(mx + 4, 37, 7), 'f']);
  else if (mag === 'top') out.push([`M${r1(mx)} ${y0}l2-10h6l-1 10Z`, 'f']);
  else if (mag === 'pan') out.push([`M${r1(mx - 8)} ${y0 - 1}h22v-4h-22Z`, 'f']);
  else if (mag === 'belt') out.push([`M${r1(mx - 2)} ${y1}h12v9h-12Z`, 'f']);
  // 兩腳架、瞄準鏡、提把
  if (p.bip) { const bx = L * (p.bpos || 0.78); out.push([`M${r1(bx)} 28L${r1(bx - 5)} 42M${r1(bx)} 28L${r1(bx + 5)} 42`, 's']); }
  if (p.tripod) out.push([`M${r1(rx0 + rL * 0.5)} 30L${r1(rx0 - 6)} 48M${r1(rx0 + rL * 0.5)} 30L${r1(rx1 + 10)} 48M${r1(rx0 + rL * 0.5)} 30V48`, 's']);
  if (p.scope) out.push([`M${r1(rx0 + 1)} 17H${r1(rx1 + 2)}V21H${r1(rx0 + 1)}ZM${r1(rx0 + 4)} 21h2v3h-2ZM${r1(rx1 - 4)} 21h2v3h-2Z`, 'f']);
  if (p.handle) out.push([`M${r1(rx0 + 2)} ${y0}V18H${r1(rx1 - 3)}V${y0}H${r1(rx1 - 5)}V20H${r1(rx0 + 4)}V${y0}Z`, 'f']);
  if (p.ugl) out.push([`M${r1(rx1)} 30H${r1(rx1 + L * 0.22)}V35H${r1(rx1)}Z`, 'f']);
  return { paths: out, w: L };
}
// 單兵反坦克與防空武器
function launcherShape(p) {
  const out = [], t = p.t || 'tube', L = p.L || 104;
  if (t === 'pf') {
    out.push([`M0 25.5H70V28.5H0Z`, 'f']);
    out.push([`M68 27Q70 18 84 18Q100 18 108 27Q100 36 84 36Q70 36 68 27Z`, 'f']);
    out.push([`M40 22H44V25.5H40Z`, 'f']);
    return { paths: out, w: 108 };
  }
  if (t === 'atgm') {
    out.push([`M48 32L34 52M48 32L62 52M48 32V52`, 's']);
    out.push([`M14 22H${L}V30H14Z`, 'f']); out.push([`M${L} 23L${L + 6} 26L${L} 29Z`, 'f']);
    out.push([`M30 30H46V38H30Z`, 'f']); out.push([`M30 16H40V22H30Z`, 'f']);
    return { paths: out, w: L + 6 };
  }
  if (t === 'recoil') {
    out.push([`M48 32L30 52M48 32L66 52M48 32V52`, 's']);
    out.push([`M0 23H${L}V29H0Z`, 'f']); out.push([`M8 19H26V33H8Z`, 'f']); out.push([`M40 16H62V21H40Z`, 'f']);
    return { paths: out, w: L };
  }
  // 火箭筒、RPG、無後座力砲、肩射飛彈
  const th = t === 'rpg' ? 4.4 : t === 'manpads' ? 5 : 6;
  out.push([`M4 ${r1(27 - th / 2)}H${L - (t === 'rpg' ? 22 : 0)}V${r1(27 + th / 2)}H4Z`, 'f']);
  if (t === 'rpg') { out.push([`M0 22L8 25V29L0 32Z`, 'f']); out.push([`M${L - 24} 27Q${L - 22} 19 ${L - 12} 19Q${L - 2} 20 ${L + 4} 27Q${L - 2} 34 ${L - 12} 35Q${L - 22} 35 ${L - 24} 27Z`, 'f']); }
  else if (t === 'tube') out.push([`M0 21L6 23.5V30.5L0 33Z`, 'f']);
  out.push([`M38 30H43L41 39H36Z`, 'f']); out.push([`M54 30H59L57 38H52Z`, 'f']);
  if (t === 'manpads') { out.push([`M60 24.5V17H74V24.5`, 's']); out.push([`M22 29.5H34V37H22Z`, 'f']); }
  else out.push([`M46 19H54V24H46Z`, 'f']);
  if (t === 'tube') out.push([`M18 30H28V34H18Z`, 'f']);
  return { paths: out, w: L + (t === 'rpg' ? 4 : 0) };
}
// 牽引火砲、山砲、反坦克砲、高射砲、迫擊砲、多管火箭砲
function artyShape(p) {
  const out = [], t = p.t || 'how';
  if (t === 'mortar') {
    out.push([`M24 52H52V55H24Z`, 'f']);
    const ang = 62, len = p.bl || 50, th = p.bt || 5;
    out.push([rotRect(38, 52, len, th, ang), 'f']);
    const [mx, my] = along(38, 52, len * 0.62, ang);
    out.push([`M${r1(mx)} ${r1(my)}L${r1(mx + 14)} 55M${r1(mx)} ${r1(my)}L${r1(mx + 4)} 55`, 's']);
    return { paths: out, w: 80 };
  }
  if (t === 'aa') {
    out.push([`M14 50H92V53H14Z`, 'f']); out.push([`M8 54L14 50H18L12 54ZM98 54L92 50H88L94 54Z`, 'f']);
    out.push([`M44 38H62V50H44Z`, 'f']);
    out.push([rotRect(54, 36, p.bl || 58, p.bt || 4, p.elev || 48, 10), 'f']);
    out.push([`M40 30H58V40H40Z`, 'f']);
    if (p.shield) out.push([`M36 24H44V42H36Z`, 'f']);
    return { paths: out, w: 100 };
  }
  // 車輪與架尾
  const wr = p.wr || (t === 'mtn' ? 6 : t === 'at' ? 7 : 9), wx = 54, wy = 55 - wr;
  out.push([CIRC(wx, wy, wr) + CIRC(wx, wy, wr * 0.35), 'e']);
  out.push([`M${wx} ${r1(wy - 3)}L4 ${r1(wy + wr - 4)}L4 ${r1(wy + wr - 1)}L${wx} ${r1(wy + 2)}Z`, 'f']);
  if (t === 'neb') {
    for (const dy of [-6, 0, 6]) out.push([rotRect(wx - 2, wy - 12 + dy, 44, 6, 22, 8), 'f']);
    return { paths: out, w: 100 };
  }
  const ang = p.elev ?? (t === 'how' ? 22 : t === 'mtn' ? 18 : 6), len = p.bl || (t === 'how' ? 52 : t === 'at' ? 60 : t === 'mtn' ? 40 : 62), th = p.bt || (t === 'how' ? 5.5 : t === 'at' ? 3.2 : 4);
  const py = wy - wr * 0.45;
  out.push([rotRect(wx, py, len, th, ang, 14), 'f']);
  out.push([rotRect(wx, py, 14, th + 4, ang, 12), 'f']);
  if (p.brake) { const [bx, by] = along(wx, py, len - 4, ang); out.push([rotRect(bx, by, 5, th + 3, ang), 'f']); }
  if (p.shield !== 0 && t !== 'mtn') out.push([`M${wx - 4} ${r1(py - 16)}H${wx + 4}V${r1(wy + 2)}H${wx - 4}Z`, 'f']);
  return { paths: out, w: Math.max(100, wx + Math.cos(ang * Math.PI / 180) * len + 4) };
}
// 卡車、火箭發射車、飛彈發射車、輪式裝甲車
function truckShape(p) {
  const out = [], t = p.t || 'cargo', ax = p.ax || 3;
  const L = p.L || 100;
  const xs = ax === 2 ? [18, L - 18] : ax === 4 ? [14, 30, L - 34, L - 16] : [16, 34, L - 18];
  if (p.tracks) { let d = TRACK(2, L - 2, 42, 54); for (let i = 0; i < 6; i++) d += WHEELS([r1(9 + i * (L - 18) / 5)], 48, 3.4); out.push([d, 'e']); }
  else out.push([xs.map(x => CIRC(x, 47, 6.5) + CIRC(x, 47, 2.4)).join(''), 'e']);
  if (t === 'ac') {
    out.push([`M4 44L2 32L10 26H${L - 18}L${L} 34L${L - 4} 44Z`, 'f']);
    if (p.turret !== 0) { out.push([`M${L * 0.36} 26L${L * 0.38} 18H${L * 0.58}L${L * 0.62} 26Z`, 'f']); out.push([`M${L * 0.58} 20.5H${L * 0.58 + (p.gun || 26)}V22.5H${L * 0.58}Z`, 'f']); }
    return { paths: out, w: L + 2 + (p.gun || 0) * 0.2 };
  }
  out.push([`M4 37H${L}V42H4Z`, 'f']);
  if (!p.tracks) out.push([`M${L - 22} 37V24H${L - 8}L${L} 31V37Z`, 'f']);
  const bed = p.tracks ? L - 4 : L - 24;
  if (t === 'cargo') out.push([`M6 37V28Q6 23 11 23H${bed - 4}Q${bed} 23 ${bed} 28V37Z`, 'f']);
  if (t === 'rails') for (const k of [0, 1, 2]) out.push([rotRect(10, 33 - k * 3.6, bed - 6, 2.2, 14), 'f']);
  if (t === 'tubes') out.push([rotRect(8, 30, bed - 14, 14, 12), 'f']);
  if (t === 'tel') { out.push([rotRect(4, 29, bed + 4, 7, 9), 'f']); const [nx, ny] = along(4, 29, bed + 4, 9); out.push([`M${r1(nx)} ${r1(ny - 3.5)}L${r1(nx + 10)} ${r1(ny - 1.5)}L${r1(nx)} ${r1(ny + 3.5)}Z`, 'f']); }
  if (t === 'sam') { out.push([`M${bed * 0.45} 37V30H${bed * 0.6}V37Z`, 'f']); for (const dy of [0, 6]) out.push([rotRect(bed * 0.25, 30 - dy, bed * 0.72, 3.6, 28), 'f']); }
  if (t === 'radar') { out.push([`M${bed * 0.5} 37V20`, 's']); out.push([`M${bed * 0.25} 16Q${bed * 0.5} 26 ${bed * 0.75} 16Z`, 'f']); }
  if (t === 'gun') { out.push([`M${bed * 0.2} 37V24H${bed * 0.8}V37Z`, 'f']); out.push([rotRect(bed * 0.55, 26, 46, 3, 40), 'f']); out.push([rotRect(bed * 0.45, 28, 46, 3, 40), 'f']); }
  return { paths: out, w: L + 2 };
}
// 飛彈與火箭（側面）
function missileShape(p) {
  const out = [], t = p.t || 'v2', L = p.L || 104, th = p.th || (t === 'v2' ? 12 : t === 'icbm' ? 10 : t === 'aam' ? 4 : 7), c = 28;
  const y0 = c - th / 2, y1 = c + th / 2;
  out.push([`M4 ${r1(y0)}H${r1(L - th * 1.6)}Q${L} ${c} ${r1(L - th * 1.6)} ${r1(y1)}H4Z`, 'f']);
  if (t === 'icbm') out.push([`M${r1(L * 0.36)} ${r1(y0 - 0.2)}h1v${th + 0.4}h-1ZM${r1(L * 0.66)} ${r1(y0 - 0.2)}h1v${th + 0.4}h-1Z`, 'f']);
  if (t !== 'icbm') { const f = t === 'v2' ? 11 : t === 'aam' ? 6 : 7; out.push([`M4 ${r1(y0)}L0 ${r1(y0 - f)}H8L${r1(4 + f * 1.4)} ${r1(y0)}ZM4 ${r1(y1)}L0 ${r1(y1 + f)}H8L${r1(4 + f * 1.4)} ${r1(y1)}Z`, 'f']); }
  if (t === 'v1') { out.push([`M0 ${r1(y0 - 9)}H${r1(L * 0.36)}V${r1(y0 - 4)}H0Z`, 'f']); out.push([`M${r1(L * 0.3)} ${r1(y0 - 4)}h3v4h-3Z`, 'f']); out.push([`M${r1(L * 0.48)} ${c - 1}H${r1(L * 0.64)}V${c + 1.5}H${r1(L * 0.48)}Z`, 'f']); }
  if (t === 'cruise') out.push([`M${r1(L * 0.46)} ${c}L${r1(L * 0.52)} ${c + 10}H${r1(L * 0.6)}L${r1(L * 0.58)} ${c}Z`, 'f']);
  if (t === 'aam' || t === 'ssm') out.push([`M${r1(L * 0.72)} ${r1(y0)}L${r1(L * 0.76)} ${r1(y0 - 5)}H${r1(L * 0.8)}L${r1(L * 0.8)} ${r1(y0)}ZM${r1(L * 0.72)} ${r1(y1)}L${r1(L * 0.76)} ${r1(y1 + 5)}H${r1(L * 0.8)}L${r1(L * 0.8)} ${r1(y1)}Z`, 'f']);
  return { paths: out, w: L + 1 };
}
// 小型艦艇：魚雷快艇、飛彈快艇、登陸艇、戰車登陸艦
function boatShape(p) {
  const out = [], t = p.t || 'pt', L = p.len || 80;
  if (t === 'lst') {
    out.push([`M0 33H${L - 6}L${L} 29V43L${L - 4} 45H4Z`, 'f']);
    out.push([`M4 33V20H22V33Z`, 'f']); out.push([`M10 20V12H14V20Z`, 'f']);
    return { paths: out, w: L };
  }
  if (t === 'lcvp') {
    out.push([`M6 34H${L - 4}L${L} 28V44H10Z`, 'f']); out.push([`M10 34V26H22V34Z`, 'f']);
    return { paths: out, w: L };
  }
  out.push([`M2 36H${L - 10}L${L} 30L${L - 6} 43H8Z`, 'f']);
  out.push([`M${r1(L * 0.36)} 36V28H${r1(L * 0.52)}V36Z`, 'f']); out.push([`M${r1(L * 0.44)} 28V20H${r1(L * 0.46)}V28Z`, 'f']);
  if (t === 'msl') out.push([rotRect(L * 0.08, 35, L * 0.24, 5, 10) + rotRect(L * 0.62, 35, L * 0.22, 5, 10), 'f']);
  else out.push([`M${r1(L * 0.1)} 33H${r1(L * 0.3)}V36H${r1(L * 0.1)}ZM${r1(L * 0.62)} 33H${r1(L * 0.84)}V36H${r1(L * 0.62)}Z`, 'f']);
  return { paths: out, w: L };
}
export function modelShape(spec) {
  if (!spec) return null;
  const k = spec.k;
  const f = { tank: tankShape, plane: planeShape, ship: shipShape, heli: heliShape, apc: apcShape, gun: gunShape, launcher: launcherShape, arty: artyShape, truck: truckShape, msl: missileShape, boat: boatShape }[k];
  return f ? f(spec) : null;
}
// 產生剪影 SVG（自動置中縮放到 120×60）
export function modelSVG(spec, cls = 'mdl') {
  const s = modelShape(spec); if (!s) return '';
  const sc = Math.min(1, 116 / s.w), dx = (120 - s.w * sc) / 2;
  const tr = spec.k === 'plane' ? `translate(${r1(dx)} ${r1(30 - 30 * sc)}) scale(${r1(sc * 100) / 100})` : `translate(${r1(dx)} ${r1(56 - 56 * sc)}) scale(${r1(sc * 100) / 100})`;
  return `<svg class="${cls}" viewBox="0 0 120 60" aria-hidden="true"><g transform="${tr}">${svgPaths(s.paths)}</g></svg>`;
}
