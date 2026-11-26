// 兵種圖示（北約軍隊符號風格）：同一份路徑資料同時用於 DOM（SVG）與地圖（Canvas Path2D）
// 座標系 24×16
const X = 'M3.5 3L20.5 13M20.5 3L3.5 13';
const OVAL = 'M4 8a8 4 0 1 0 16 0a8 4 0 1 0 -16 0';
export const GLYPHS = {
  inf: [[X, 's']],
  mar: [[X, 's'], ['M5 14.2q1.75-1.4 3.5 0t3.5 0t3.5 0t3.5 0', 's']],
  mec: [[X, 's'], ['M7 8a5 2.6 0 1 0 10 0a5 2.6 0 1 0 -10 0', 's']],
  ltk: [['M6.5 8a5.5 2.6 0 1 0 11 0a5.5 2.6 0 1 0 -11 0', 's']],
  arm: [[OVAL, 's']],
  htk: [[OVAL, 's'], ['M7.5 8a4.5 1.8 0 1 0 9 0a4.5 1.8 0 1 0 -9 0', 's']],
  mbt: [[OVAL, 'f']],
  ftr: [['M12 1.6L13.1 6L21.5 7.8L21.5 9.2L13.1 9.4L12.9 12.3L15.2 13.6L15.2 14.4L12 13.7L8.8 14.4L8.8 13.6L11.1 12.3L10.9 9.4L2.5 9.2L2.5 7.8L10.9 6Z', 'f']],
  jet: [['M12 1.2L13.6 6.6L21.5 12.2L21.5 13.4L13.6 11.6L13.2 13.1L14.8 14.6L9.2 14.6L10.8 13.1L10.4 11.6L2.5 13.4L2.5 12.2L10.4 6.6Z', 'f']],
  cas: [['M12 2.5L13 6.2L20 5.4L21.5 7.6L13 8.8L12.9 12.1L15 13.5L9 13.5L11.1 12.1L11 8.8L2.5 7.6L4 5.4L11 6.2Z', 'f'], ['M11 14.4h2v1.4h-2z', 'f']],
  bmb: [['M12 1.4L13.1 4.8L22.3 6.8L22.3 8.9L13.1 9.4L13 12.4L16.2 13.9L16.2 14.6L7.8 14.6L7.8 13.9L11 12.4L10.9 9.4L1.7 8.9L1.7 6.8L10.9 4.8Z', 'f']],
  str: [['M12 0.8L13.2 4.2L23.4 6.8L23.4 9L13.2 9.4L13.1 12.4L17.5 14.4L17.5 15.2L6.5 15.2L6.5 14.4L10.9 12.4L10.8 9.4L0.6 9L0.6 6.8L10.8 4.2Z', 'f']],
  nvb: [['M12 1.2L13 4.4L21 6.2L21 8L13 8.4L12.9 10.6L15.4 11.8L8.6 11.8L11.1 10.6L11 8.4L3 8L3 6.2L11 4.4Z', 'f'], ['M3 14.6q2.25-1.6 4.5 0t4.5 0t4.5 0t4.5 0', 's']],
  hel: [['M2 3.6H22', 's'], ['M12 3.6V6.4', 's'], ['M8.2 6.4H14.6A3.3 3.3 0 0 1 14.6 13H8.2A3.3 3.3 0 0 1 8.2 6.4Z', 'f'], ['M17.6 9.4H23M22.6 7.8V11', 's']],
  flt: [['M1.5 9.6H22.5L19.4 14H4.6Z', 'f'], ['M7.6 9.6V6.8H10.6V4.4H13V6.8H16.4V9.6Z', 'f']],
  car: [['M0.8 8.6H23.2L20.2 13.2H3.8Z', 'f'], ['M16 8.6V5.2H18.6V8.6Z', 'f']],
  sub: [['M2.6 10.2A3 2.6 0 0 1 5.6 7.6H19A3 2.6 0 0 1 19 12.8H5.6A3 2.6 0 0 1 2.6 10.2Z', 'f'], ['M9.6 7.6V4.8H12.8V7.6Z', 'f']],
};
const LANDISH = new Set(['inf', 'mar', 'mec', 'ltk', 'arm', 'htk', 'mbt']);
// DOM 用的 SVG 字串
export function glyphSVG(t, cls = 'gl') {
  const g = GLYPHS[t]; if (!g) return '';
  const frame = LANDISH.has(t) ? '<rect x="0.8" y="0.8" width="22.4" height="14.4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/>' : '';
  return `<svg class="${cls}" viewBox="0 0 24 16" aria-hidden="true">${frame}${g.map(([d, m]) => m === 'f' ? `<path d="${d}" fill="currentColor"/>` : `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`).join('')}</svg>`;
}
// Canvas 用：快取 Path2D
const P2 = {};
function paths(t) {
  if (P2[t]) return P2[t];
  if (typeof Path2D === 'undefined') return [];
  return (P2[t] = (GLYPHS[t] || []).map(([d, m]) => [new Path2D(d), m]));
}
export function drawGlyph(ctx, t, x, y, w, h, color) {
  const ps = paths(t); if (!ps.length) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(w / 24, h / 16);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
  for (const [p, m] of ps) { if (m === 'f') ctx.fill(p); else ctx.stroke(p); }
  ctx.restore();
}
