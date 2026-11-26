// 靜態世界資料：節點（地區+海域）、鄰接、距離、國家定義
import { REGION_DEFS, SEA_DEFS } from '../data/regions.js';
import { MAP } from '../data/mapdata.js';
import { COUNTRY_DEFS } from '../data/countries.js';
import { gcDist } from '../data/proj.js';
import { TERRAIN } from '../data/rules.js';

function build() {
  const R = REGION_DEFS.length, S = SEA_DEFS.length, N = R + S;
  if (MAP.R !== R || MAP.S !== S) console.warn('mapdata 與 regions.js 不一致，請重新執行 npm run build:map');
  const nodes = [];
  const idx = new Map();
  REGION_DEFS.forEach((d, i) => {
    const [id, name, lon, lat, mod, terr, ind, vp, pop, owner, opts = {}] = d;
    nodes.push({
      i, id, name, kind: 'land', lon, lat, mod, terrain: terr, ind, vp, pop, owner, opts,
      x: MAP.anchors[i * 2], y: MAP.anchors[i * 2 + 1], area: MAP.area[i],
      nm: opts.nm || null, fort: opts.fort || 0, ssr: opts.ssr || null, indep: opts.ind || null, zone: opts.zone || null,
    });
    idx.set(id, i);
  });
  SEA_DEFS.forEach((d, s) => {
    const i = R + s;
    const [id, name, lon, lat] = d;
    nodes.push({ i, id, name, kind: 'sea', lon, lat, x: MAP.anchors[i * 2], y: MAP.anchors[i * 2 + 1], area: MAP.area[i] });
    idx.set(id, i);
  });
  // 鄰接
  const adj = Array.from({ length: N }, () => []);
  for (const [a, b, len, type] of MAP.adj) {
    const na = nodes[a], nb = nodes[b];
    let d;
    if (na.kind === 'land' && nb.kind === 'land') d = Math.max(60, gcDist(na.lon, na.lat, nb.lon, nb.lat));
    else if (na.kind === 'sea' && nb.kind === 'sea') d = Math.max(150, gcDist(na.lon, na.lat, nb.lon, nb.lat));
    else d = 120; // 上下船
    adj[a].push({ to: b, d, t: type, len });
    adj[b].push({ to: a, d, t: type, len });
  }
  for (const n of nodes) {
    n.landNb = adj[n.i].filter(e => nodes[e.to].kind === 'land').map(e => e.to);
    n.seaNb = adj[n.i].filter(e => nodes[e.to].kind === 'sea').map(e => e.to);
    if (n.kind === 'land') n.coastal = n.seaNb.length > 0;
  }
  // 地區間距離矩陣（空軍航程用）
  const dist = new Float32Array(R * R);
  for (let a = 0; a < R; a++) {
    for (let b = a + 1; b < R; b++) {
      const d = gcDist(nodes[a].lon, nodes[a].lat, nodes[b].lon, nodes[b].lat);
      dist[a * R + b] = d; dist[b * R + a] = d;
    }
  }
  // 國家
  const countries = {};
  for (const [tag, name, color, ideo, capId, opts = {}] of COUNTRY_DEFS) {
    countries[tag] = { tag, name, color, ideo, capital: idx.get(capId), major: !!opts.major, cap: opts.cap ?? 0.5, navy: !!opts.navy, full: opts.full || name, nm: opts.nm || null };
    if (countries[tag].capital === undefined) console.warn('首都不存在', tag, capId);
  }
  // 各地區上限工業
  for (const n of nodes) if (n.kind === 'land') n.indCap = Math.min(16, Math.max(2, Math.round(2 + n.ind * 1.3 + n.pop * 0.5)));
  return { R, S, N, nodes, idx, adj, dist, countries, MAP, TERRAIN };
}

export const WORLD = build();

export function regionName(i, year) {
  const n = WORLD.nodes[i];
  if (!n.nm || !year) return n.name;
  let name = n.name;
  for (const [y, nm] of n.nm) if (year >= y) name = nm;
  return name;
}
export function rDist(a, b) { return WORLD.dist[a * WORLD.R + b]; }
export function isLand(i) { return i < WORLD.R; }
export function nodeId(i) { return WORLD.nodes[i].id; }
export function ridx(id) {
  const i = WORLD.idx.get(id);
  if (i === undefined) throw new Error('未知地區 ' + id);
  return i;
}
