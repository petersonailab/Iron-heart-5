// 地圖建置工具：由 Natural Earth (public domain，經 world-atlas 套件) 產生遊戲用地區/海域幾何與鄰接關係
// 用法：npm run build:map  →  輸出 public/js/data/mapdata.js（以及 tools/out/debug.png）
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { REGION_DEFS, SEA_DEFS, STRAITS, SEA_LINKS } from '../public/js/data/regions.js';
import { W, H, project } from '../public/js/data/proj.js';

const require = createRequire(import.meta.url);
const topo = require('world-atlas/countries-50m.json');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT_DIR = path.join(ROOT, 'tools', 'out');
fs.mkdirSync(OUT_DIR, { recursive: true });

// 現代國碼 → Natural Earth 名稱
const CODE_NAMES = {
  DEU: 'Germany', POL: 'Poland', RUS: 'Russia', AUT: 'Austria', CZE: 'Czechia', SVK: 'Slovakia', UKR: 'Ukraine',
  BLR: 'Belarus', LTU: 'Lithuania', LVA: 'Latvia', EST: 'Estonia', FIN: 'Finland', SWE: 'Sweden', NOR: 'Norway',
  DNK: 'Denmark', GRL: 'Greenland', ISL: 'Iceland', NLD: 'Netherlands', BEL: 'Belgium', LUX: 'Luxembourg',
  FRA: 'France', GBR: 'United Kingdom', IRL: 'Ireland', ESP: 'Spain', PRT: 'Portugal', CHE: 'Switzerland',
  ITA: 'Italy', SVN: 'Slovenia', HRV: 'Croatia', BIH: 'Bosnia and Herz.', SRB: 'Serbia', MNE: 'Montenegro',
  MKD: 'Macedonia', HUN: 'Hungary', ROU: 'Romania', MDA: 'Moldova', BGR: 'Bulgaria', GRC: 'Greece', ALB: 'Albania',
  TUR: 'Turkey', GEO: 'Georgia', AZE: 'Azerbaijan', ARM: 'Armenia', KAZ: 'Kazakhstan', UZB: 'Uzbekistan',
  TKM: 'Turkmenistan', TJK: 'Tajikistan', KGZ: 'Kyrgyzstan', IRN: 'Iran', IRQ: 'Iraq', KWT: 'Kuwait',
  SAU: 'Saudi Arabia', YEM: 'Yemen', OMN: 'Oman', ISR: 'Israel', PSE: 'Palestine', JOR: 'Jordan', SYR: 'Syria',
  LBN: 'Lebanon', CYP: 'Cyprus', AFG: 'Afghanistan', EGY: 'Egypt', LBY: 'Libya', TUN: 'Tunisia', DZA: 'Algeria',
  MAR: 'Morocco', ESH: 'W. Sahara', SEN: 'Senegal', MLI: 'Mali', GIN: 'Guinea', CIV: "Côte d'Ivoire", NER: 'Niger',
  MRT: 'Mauritania', BFA: 'Burkina Faso', BEN: 'Benin', TCD: 'Chad', COG: 'Congo', CAF: 'Central African Rep.',
  CMR: 'Cameroon', MDG: 'Madagascar', DJI: 'Djibouti', NGA: 'Nigeria', GHA: 'Ghana', SLE: 'Sierra Leone',
  SDN: 'Sudan', SSD: 'S. Sudan', KEN: 'Kenya', UGA: 'Uganda', TZA: 'Tanzania', ZMB: 'Zambia', ZWE: 'Zimbabwe',
  MWI: 'Malawi', BWA: 'Botswana', SOM: 'Somalia', SOL: 'Somaliland', ERI: 'Eritrea', ETH: 'Ethiopia',
  COD: 'Dem. Rep. Congo', AGO: 'Angola', MOZ: 'Mozambique', GNB: 'Guinea-Bissau', LBR: 'Liberia',
  ZAF: 'South Africa', NAM: 'Namibia', JPN: 'Japan', KOR: 'South Korea', PRK: 'North Korea', TWN: 'Taiwan',
  CHN: 'China', HKG: 'Hong Kong', MNG: 'Mongolia', VNM: 'Vietnam', LAO: 'Laos', KHM: 'Cambodia', THA: 'Thailand',
  MYS: 'Malaysia', SGP: 'Singapore', MMR: 'Myanmar', IND: 'India', PAK: 'Pakistan', BGD: 'Bangladesh',
  LKA: 'Sri Lanka', NPL: 'Nepal', IDN: 'Indonesia', PHL: 'Philippines', PNG: 'Papua New Guinea',
  SLB: 'Solomon Is.', FJI: 'Fiji', NCL: 'New Caledonia', AUS: 'Australia', NZL: 'New Zealand', PLW: 'Palau',
  MNP: 'N. Mariana Is.', GUM: 'Guam', FSM: 'Micronesia', MHL: 'Marshall Is.', KIR: 'Kiribati',
  USA: 'United States of America', CAN: 'Canada', MEX: 'Mexico', GTM: 'Guatemala', HND: 'Honduras',
  SLV: 'El Salvador', NIC: 'Nicaragua', CRI: 'Costa Rica', PAN: 'Panama', CUB: 'Cuba', HTI: 'Haiti',
  DOM: 'Dominican Rep.', JAM: 'Jamaica', PRI: 'Puerto Rico', BRA: 'Brazil', ARG: 'Argentina', CHL: 'Chile',
  PER: 'Peru', BOL: 'Bolivia', PRY: 'Paraguay', URY: 'Uruguay', COL: 'Colombia', VEN: 'Venezuela', ECU: 'Ecuador',
  GUY: 'Guyana', SUR: 'Suriname', FLK: 'Falkland Is.', TLS: 'Timor-Leste', MLT: 'Malta',
};

const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const N = W * H;

// ---------------------------------------------------------------- 1. 柵格化國家
const fc = feature(topo, topo.objects.countries);
const countryNames = [];
const nameToIdx = new Map();
for (const f of fc.features) {
  const nm = f.properties.name;
  if (nm === 'Antarctica' || nm === 'Fr. S. Antarctic Lands') continue;
  if (!nameToIdx.has(nm)) { nameToIdx.set(nm, countryNames.length); countryNames.push(nm); }
}
const codeToCountry = new Map();
for (const [code, nm] of Object.entries(CODE_NAMES)) {
  if (nameToIdx.has(nm)) codeToCountry.set(code, nameToIdx.get(nm));
}
function countryIndexForCode(code) {
  if (codeToCountry.has(code)) return codeToCountry.get(code);
  // 不存在於 Natural Earth 的地方（如直布羅陀）：建立虛擬國家
  const idx = countryNames.length; countryNames.push('*' + code); codeToCountry.set(code, idx); return idx;
}

const cgrid = new Int16Array(N).fill(-1);
function rasterizeRings(rings, value) {
  // even-odd 掃描線填充；rings: 投影後座標陣列
  let minY = Infinity, maxY = -Infinity;
  const edges = [];
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      if (a[1] === b[1]) continue;
      edges.push(a[0], a[1], b[0], b[1]);
      minY = Math.min(minY, a[1], b[1]); maxY = Math.max(maxY, a[1], b[1]);
    }
  }
  const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(H - 1, Math.ceil(maxY));
  const xs = [];
  for (let y = y0; y <= y1; y++) {
    const sy = y + 0.5;
    xs.length = 0;
    for (let e = 0; e < edges.length; e += 4) {
      const ax = edges[e], ay = edges[e + 1], bx = edges[e + 2], by = edges[e + 3];
      if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) {
        xs.push(ax + (sy - ay) / (by - ay) * (bx - ax));
      }
    }
    if (xs.length < 2) continue;
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(W - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = xa; x <= xb; x++) cgrid[y * W + x] = value;
    }
  }
}
for (const f of fc.features) {
  const nm = f.properties.name;
  if (!nameToIdx.has(nm)) continue;
  const idx = nameToIdx.get(nm);
  const g = f.geometry; if (!g) continue;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  for (const poly of polys) {
    // 將跨越 ±180 經線的環展開為連續座標，再以 -W/0/+W 平移各填一次
    let minX = Infinity, maxX = -Infinity;
    const rings = poly.map(ring => {
      const out = []; let prev = null;
      for (const [lon0, lat] of ring) {
        let lon = lon0;
        if (prev !== null) { while (lon - prev > 180) lon -= 360; while (lon - prev < -180) lon += 360; }
        prev = lon;
        const pt = project(lon, lat); out.push(pt);
        minX = Math.min(minX, pt[0]); maxX = Math.max(maxX, pt[0]);
      }
      return out;
    });
    for (const off of [-W, 0, W]) {
      if (maxX + off < 0 || minX + off > W) continue;
      rasterizeRings(off === 0 ? rings : rings.map(r => r.map(([x, y]) => [x + off, y])), idx);
    }
  }
}
log('rasterized countries', countryNames.length);

// ---------------------------------------------------------------- 2. 種子對位、補島
const R = REGION_DEFS.length, S = SEA_DEFS.length;
const WASTE = R + S, LAKE = R + S + 1;
const regionSeed = new Int32Array(R);
const regionCode = new Int32Array(R);
const warnings = [];
function wrapX(x) { return ((x % W) + W) % W; }
function findNear(x0, y0, pred, maxR) {
  for (let r = 0; r <= maxR; r++) {
    let best = -1, bd = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const y = y0 + dy; if (y < 0 || y >= H) continue;
        const x = wrapX(x0 + dx); const p = y * W + x;
        if (pred(p)) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = p; } }
      }
    }
    if (best >= 0) return best;
  }
  return -1;
}
function paintCircle(cx, cy, rad, value, overrideLand) {
  for (let dy = -Math.ceil(rad); dy <= Math.ceil(rad); dy++) {
    for (let dx = -Math.ceil(rad); dx <= Math.ceil(rad); dx++) {
      if (dx * dx + dy * dy > rad * rad) continue;
      const y = Math.floor(cy) + dy; if (y < 0 || y >= H) continue;
      const p = y * W + wrapX(Math.floor(cx) + dx);
      if (overrideLand || cgrid[p] < 0) cgrid[p] = value;
    }
  }
}
const usedSeedPix = new Set();
for (let r = 0; r < R; r++) {
  const [id, , lon, lat, code] = REGION_DEFS[r];
  const ci = countryIndexForCode(code);
  regionCode[r] = ci;
  const [fx, fy] = project(lon, lat);
  const x0 = wrapX(Math.floor(fx)), y0 = Math.min(H - 1, Math.max(0, Math.floor(fy)));
  let p = findNear(x0, y0, q => cgrid[q] === ci && !usedSeedPix.has(q), countryNames[ci].startsWith('*') ? 0 : 14);
  if (p < 0) {
    // 補島（小島嶼或資料中不存在的領地）
    const isOverride = countryNames[ci].startsWith('*');
    paintCircle(fx, fy, isOverride ? 1.6 : 2.6, ci, isOverride);
    p = findNear(x0, y0, q => cgrid[q] === ci && !usedSeedPix.has(q), 4);
    warnings.push(`injected island for ${id} (${code})`);
  }
  if (p < 0) throw new Error('cannot place seed ' + id);
  // 過小的島嶼：放大成可點擊的大小（只覆蓋海面）
  {
    const px = p % W, py = Math.floor(p / W);
    let cnt = 0;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const y = py + dy; if (y < 0 || y >= H) continue;
      if (cgrid[y * W + wrapX(px + dx)] === ci) cnt++;
    }
    if (cnt < 12 && !countryNames[ci].startsWith('*')) { paintCircle(px + 0.5, py + 0.5, 2.6, ci, false); warnings.push(`enlarged island ${id}`); }
  }
  usedSeedPix.add(p);
  regionSeed[r] = p;
}
log('seeds placed');

// ---------------------------------------------------------------- 3. 地區成長（受現代國界約束的測地 Voronoi）
const label = new Int32Array(N).fill(-1);
class Heap {
  constructor(cap = 1 << 20) { this.d = new Float64Array(cap); this.p = new Int32Array(cap); this.l = new Int32Array(cap); this.n = 0; }
  push(d, p, l) {
    if (this.n >= this.d.length) {
      const c = this.d.length * 2;
      const d2 = new Float64Array(c); d2.set(this.d); this.d = d2;
      const p2 = new Int32Array(c); p2.set(this.p); this.p = p2;
      const l2 = new Int32Array(c); l2.set(this.l); this.l = l2;
    }
    let i = this.n++;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (this.d[par] <= d) break;
      this.d[i] = this.d[par]; this.p[i] = this.p[par]; this.l[i] = this.l[par]; i = par;
    }
    this.d[i] = d; this.p[i] = p; this.l[i] = l;
  }
  pop() {
    const rd = this.d[0], rp = this.p[0], rl = this.l[0];
    const n = --this.n;
    if (n > 0) {
      const d = this.d[n], p = this.p[n], l = this.l[n];
      let i = 0;
      while (true) {
        let c = 2 * i + 1; if (c >= n) break;
        if (c + 1 < n && this.d[c + 1] < this.d[c]) c++;
        if (this.d[c] >= d) break;
        this.d[i] = this.d[c]; this.p[i] = this.p[c]; this.l[i] = this.l[c]; i = c;
      }
      this.d[i] = d; this.p[i] = p; this.l[i] = l;
    }
    this.popD = rd; this.popP = rp; this.popL = rl;
  }
}
function seedDist(p, seedPix) {
  const x = p % W, y = (p / W) | 0, sx = seedPix % W, sy = (seedPix / W) | 0;
  let dx = Math.abs(x - sx); if (dx > W / 2) dx = W - dx;
  const dy = y - sy; return dx * dx + dy * dy;
}
function neighbors4(p, out) {
  const x = p % W, y = (p / W) | 0;
  out[0] = y * W + (x === W - 1 ? 0 : x + 1);
  out[1] = y * W + (x === 0 ? W - 1 : x - 1);
  out[2] = y > 0 ? p - W : -1;
  out[3] = y < H - 1 ? p + W : -1;
}
const nb = new Int32Array(4);
function growVoronoi(seeds, labels, canEnter) {
  const heap = new Heap();
  for (let i = 0; i < seeds.length; i++) heap.push(0, seeds[i], labels[i]);
  const seedOf = new Map(); for (let i = 0; i < seeds.length; i++) seedOf.set(labels[i], seeds[i]);
  while (heap.n > 0) {
    heap.pop();
    const p = heap.popP, l = heap.popL;
    if (label[p] !== -1) continue;
    label[p] = l;
    const sp = seedOf.get(l);
    neighbors4(p, nb);
    for (let k = 0; k < 4; k++) {
      const q = nb[k];
      if (q < 0 || label[q] !== -1 || !canEnter(q, l)) continue;
      heap.push(seedDist(q, sp), q, l);
    }
  }
}
{
  const seeds = [], labs = [];
  for (let r = 0; r < R; r++) { seeds.push(regionSeed[r]); labs.push(r); }
  growVoronoi(seeds, labs, (q, l) => cgrid[q] === regionCode[l]);
}
log('step1 land growth done');

// 步驟 2：同一現代國家的離島 → 經由海面最近的同國地區（距離上限 80 像素）
function bfsAssign(sourcesFilter, passable, claimable, maxD) {
  const dist = new Int16Array(N).fill(-1);
  const src = new Int32Array(N).fill(-1);
  const queue = new Int32Array(N);
  let qh = 0, qt = 0;
  for (let p = 0; p < N; p++) {
    if (label[p] >= 0 && label[p] < R && sourcesFilter(p)) { dist[p] = 0; src[p] = label[p]; queue[qt++] = p; }
  }
  let claimed = 0;
  while (qh < qt) {
    const p = queue[qh++];
    if (dist[p] >= maxD) continue;
    neighbors4(p, nb);
    for (let k = 0; k < 4; k++) {
      const q = nb[k];
      if (q < 0 || dist[q] !== -1) continue;
      if (label[q] === -1 && claimable(q, src[p])) {
        label[q] = src[p]; claimed++;
        dist[q] = dist[p] + 1; src[q] = src[p]; queue[qt++] = q;
      } else if (passable(q)) {
        dist[q] = dist[p] + 1; src[q] = src[p]; queue[qt++] = q;
      }
    }
  }
  return claimed;
}
{
  // 依國家逐一處理（只處理有未指派像素的國家）
  const pending = new Map();
  for (let p = 0; p < N; p++) if (cgrid[p] >= 0 && label[p] === -1) pending.set(cgrid[p], (pending.get(cgrid[p]) || 0) + 1);
  const hasRegion = new Set(Array.from(regionCode));
  for (const ci of pending.keys()) {
    if (!hasRegion.has(ci)) continue;
    bfsAssign(p => regionCode[label[p]] === ci, q => cgrid[q] < 0, (q, s) => cgrid[q] === ci && regionCode[s] === ci, 80);
  }
}
log('step2 same-country islands done');
// 步驟 3：其餘無主陸地 → 最近地區（距離上限 60 像素），之外為荒地
bfsAssign(() => true, q => cgrid[q] < 0 || label[q] === -1, q => cgrid[q] >= 0, 60);
let waste = 0;
for (let p = 0; p < N; p++) if (cgrid[p] >= 0 && label[p] === -1) { label[p] = WASTE; waste++; }
log('step3 done, waste pixels', waste);

// ---------------------------------------------------------------- 4. 海域
{
  const seeds = [], labs = [];
  for (let s = 0; s < S; s++) {
    const [id, , lon, lat] = SEA_DEFS[s];
    const [fx, fy] = project(lon, lat);
    const p = findNear(wrapX(Math.floor(fx)), Math.min(H - 1, Math.max(0, Math.floor(fy))), q => cgrid[q] < 0 && label[q] === -1, 40);
    if (p < 0) throw new Error('sea seed on land: ' + id);
    seeds.push(p); labs.push(R + s);
  }
  growVoronoi(seeds, labs, q => cgrid[q] < 0);
}
let lakes = 0;
for (let p = 0; p < N; p++) if (label[p] === -1) { label[p] = LAKE; lakes++; }
log('seas done, lake pixels', lakes);

// ---------------------------------------------------------------- 5. 統計 / 鄰接
const area = new Int32Array(R + S + 2);
for (let p = 0; p < N; p++) area[label[p]]++;
for (let r = 0; r < R; r++) if (area[r] < 6) warnings.push(`tiny region ${REGION_DEFS[r][0]} area=${area[r]}`);
for (let s = 0; s < S; s++) if (area[R + s] < 50) warnings.push(`tiny sea ${SEA_DEFS[s][0]} area=${area[R + s]}`);

const pairCount = new Map();
function addPair(a, b) {
  if (a === b || a >= WASTE || b >= WASTE) return;
  const k = a < b ? a * 10000 + b : b * 10000 + a;
  pairCount.set(k, (pairCount.get(k) || 0) + 1);
}
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const p = y * W + x, a = label[p];
    addPair(a, label[y * W + (x === W - 1 ? 0 : x + 1)]);
    if (y < H - 1) addPair(a, label[p + W]);
  }
}
const idIndex = new Map();
REGION_DEFS.forEach((d, i) => idIndex.set(d[0], i));
SEA_DEFS.forEach((d, i) => idIndex.set(d[0], R + i));
const adj = [];
const adjSet = new Set();
for (const [k, c] of pairCount) {
  const a = Math.floor(k / 10000), b = k % 10000;
  const isSeaA = a >= R, isSeaB = b >= R;
  const min = (isSeaA && isSeaB) ? 3 : 2;
  if (c < min) continue;
  adj.push([a, b, c, 0]); adjSet.add(k);
}
for (const [ia, ib] of STRAITS) {
  const a = idIndex.get(ia), b = idIndex.get(ib);
  if (a === undefined || b === undefined) throw new Error('bad strait ' + ia + ' ' + ib);
  const k = a < b ? a * 10000 + b : b * 10000 + a;
  if (adjSet.has(k)) continue;
  adj.push([Math.min(a, b), Math.max(a, b), 1, 1]); adjSet.add(k);
}
for (const [ia, ib] of SEA_LINKS) {
  const a = idIndex.get(ia), b = idIndex.get(ib);
  if (a === undefined || b === undefined) throw new Error('bad sea link ' + ia + ' ' + ib);
  const k = a < b ? a * 10000 + b : b * 10000 + a;
  if (adjSet.has(k)) continue;
  adj.push([Math.min(a, b), Math.max(a, b), 1, 2]); adjSet.add(k);
}
// 檢查孤立節點
const degree = new Int32Array(R + S);
for (const [a, b] of adj) { degree[a]++; degree[b]++; }
for (let i = 0; i < R + S; i++) if (degree[i] === 0) warnings.push(`isolated node ${i < R ? REGION_DEFS[i][0] : SEA_DEFS[i - R][0]}`);
for (let r = 0; r < R; r++) {
  // 有海岸但無海域鄰接的島嶼
  if (!adj.some(([a, b]) => (a === r && b >= R) || (b === r && a >= R)) && !adj.some(([a, b]) => (a === r || b === r))) warnings.push('no neighbors ' + REGION_DEFS[r][0]);
}
log('adjacency', adj.length);

// ---------------------------------------------------------------- 6. 向量化（保持拓撲的邊界追蹤）
const OUTSIDE = -1;
const lab = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? OUTSIDE : label[y * W + x];
const VW = W + 1;
function isJunction(vx, vy) {
  const a = lab(vx - 1, vy - 1), b = lab(vx, vy - 1), c = lab(vx - 1, vy), d = lab(vx, vy);
  const set = new Set([a, b, c, d]);
  if (set.size >= 3) return true;
  if (set.size === 2 && a === d && b === c && a !== b) return true;
  return false;
}
// 方向：0 東（上緣）、1 南（右緣）、2 西（下緣）、3 北（左緣）；內部在右手邊
const FX = [1, 0, -1, 0], FY = [0, 1, 0, -1], RX = [0, -1, 0, 1], RY = [1, 0, -1, 0];
// 每條邊的起點相對於像素左上角的偏移
const SX = [0, 1, 1, 0], SY = [0, 0, 1, 1];
const visited = new Uint8Array(N);
function isBoundary(x, y, d) {
  const L = label[y * W + x];
  const nx = x - RX[d], ny = y - RY[d];
  return lab(nx, ny) !== L;
}
const arcs = []; // {pts: [vid...], key}
const arcByKey = new Map();
const labelRings = Array.from({ length: R + S + 2 }, () => []);
function vid(x, y) { return y * VW + x; }
function traceRing(x0, y0, d0) {
  const L = label[y0 * W + x0];
  const verts = []; // 每條邊的起點
  let x = x0, y = y0, d = d0;
  let guard = 0;
  do {
    visited[y * W + x] |= (1 << d);
    verts.push(vid(x + SX[d], y + SY[d]));
    const ax = x + FX[d], ay = y + FY[d];
    const bx = ax - RX[d], by = ay - RY[d];
    const aL = lab(ax, ay) === L, bL = lab(bx, by) === L;
    if (aL && bL) { x = bx; y = by; d = (d + 3) & 3; }
    else if (aL) { x = ax; y = ay; }
    else { d = (d + 1) & 3; }
    if (++guard > 20000000) throw new Error('trace runaway');
  } while (!(x === x0 && y === y0 && d === d0));
  return { L, verts };
}
function chainKey(verts, closed) {
  if (!closed) {
    const n = verts.length;
    const f = verts[0] * 1e8 + verts[1];
    const r = verts[n - 1] * 1e8 + verts[n - 2];
    return f < r ? [f, false] : [r, true];
  }
  let mi = 0; for (let i = 1; i < verts.length; i++) if (verts[i] < verts[mi]) mi = i;
  const n = verts.length;
  const nf = verts[(mi + 1) % n], nr = verts[(mi - 1 + n) % n];
  return nf < nr ? ['c' + verts[mi] + ':' + nf, false] : ['c' + verts[mi] + ':' + nr, true];
}
function vxy(v) { return [v % VW, Math.floor(v / VW)]; }
// Douglas-Peucker
function simplify(pts, eps) {
  if (pts.length <= 2) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    const [ax, ay] = pts[i], [bx, by] = pts[j];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    let md = -1, mk = -1;
    for (let k = i + 1; k < j; k++) {
      const [px, py] = pts[k];
      const dd = len > 0 ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / len : Math.hypot(px - ax, py - ay);
      if (dd > md) { md = dd; mk = k; }
    }
    if (md > eps && mk > 0) { keep[mk] = 1; stack.push([i, mk], [mk, j]); }
  }
  return pts.filter((_, k) => keep[k]);
}
function makeArc(verts, closed) {
  // verts: 頂點序列（closed 時不重複起點）
  let pts = verts.map(vxy);
  if (closed) {
    // 由最遠點切成兩半各自簡化
    const p0 = pts[0]; let far = 0, fd = -1;
    for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - p0[0], pts[k][1] - p0[1]); if (d > fd) { fd = d; far = k; } }
    const a = simplify(pts.slice(0, far + 1), 0.85), b = simplify(pts.slice(far).concat([p0]), 0.85);
    pts = a.concat(b.slice(1));
    if (pts.length < 4) pts = [pts[0], ...pts.slice(1)];
  } else {
    pts = simplify(pts, 0.85);
  }
  return pts;
}
let ringCount = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const p = y * W + x;
    for (let d = 0; d < 4; d++) {
      if (visited[p] & (1 << d)) continue;
      if (!isBoundary(x, y, d)) continue;
      const { L, verts } = traceRing(x, y, d);
      ringCount++;
      // 去除直線上的中間點以外：先找出接點
      const n = verts.length;
      const jIdx = [];
      for (let i = 0; i < n; i++) { const [vx, vy] = vxy(verts[i]); if (isJunction(vx, vy)) jIdx.push(i); }
      const refs = [];
      if (jIdx.length === 0) {
        const [key, rev] = chainKey(verts, true);
        let ai = arcByKey.get(key);
        if (ai === undefined) {
          // 以標準方向建立
          let mi = 0; for (let i = 1; i < n; i++) if (verts[i] < verts[mi]) mi = i;
          let seq = verts.slice(mi).concat(verts.slice(0, mi));
          if (rev) seq = [seq[0], ...seq.slice(1).reverse()];
          ai = arcs.length; arcs.push({ pts: makeArc(seq, true), closed: true, sides: [] });
          arcByKey.set(key, ai);
        }
        arcs[ai].sides.push(L);
        refs.push(rev ? ~ai : ai);
      } else {
        for (let j = 0; j < jIdx.length; j++) {
          const s = jIdx[j], e = jIdx[(j + 1) % jIdx.length];
          const seq = [];
          if (e > s) for (let i = s; i <= e; i++) seq.push(verts[i]);
          else { for (let i = s; i < n; i++) seq.push(verts[i]); for (let i = 0; i <= e; i++) seq.push(verts[i]); }
          const [key, rev] = chainKey(seq, false);
          let ai = arcByKey.get(key);
          if (ai === undefined) {
            const canon = rev ? seq.slice().reverse() : seq;
            ai = arcs.length; arcs.push({ pts: makeArc(canon, false), closed: false, sides: [] });
            arcByKey.set(key, ai);
          }
          arcs[ai].sides.push(L);
          refs.push(rev ? ~ai : ai);
        }
      }
      labelRings[L].push(refs);
    }
  }
}
log('vectorized: rings', ringCount, 'arcs', arcs.length);

// ---------------------------------------------------------------- 7. 輸出
let totalPts = 0;
const arcData = arcs.map(a => {
  totalPts += a.pts.length;
  const out = [];
  let px = 0, py = 0;
  for (const [x, y] of a.pts) { out.push(x - px, y - py); px = x; py = y; }
  return out;
});
const arcSides = [];
for (const a of arcs) {
  const s = a.sides;
  const l = s[0] ?? OUTSIDE, r = s[1] ?? OUTSIDE;
  arcSides.push(l, r);
}
const anchors = [];
for (let r = 0; r < R; r++) { const p = regionSeed[r]; anchors.push(p % W + 0.5, Math.floor(p / W) + 0.5); }
for (let s = 0; s < S; s++) {
  // 海域錨點：取該海域像素中最接近種子的點
  const [, , lon, lat] = SEA_DEFS[s];
  const [fx, fy] = project(lon, lat);
  const p = findNear(wrapX(Math.floor(fx)), Math.min(H - 1, Math.max(0, Math.floor(fy))), q => label[q] === R + s, 60);
  anchors.push(p % W + 0.5, Math.floor(p / W) + 0.5);
}
const out = {
  W, H, R, S,
  ids: [...REGION_DEFS.map(d => d[0]), ...SEA_DEFS.map(d => d[0])],
  anchors: anchors.map(v => Math.round(v * 2) / 2),
  area: Array.from(area),
  arcs: arcData,
  arcSides,
  rings: labelRings,
  adj,
};
const js = '// 自動產生（tools/build-map.js），請勿手動編輯。地理資料來源：Natural Earth（公有領域）\n' +
  'export const MAP = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(ROOT, 'public/js/data/mapdata.js'), js);
log('wrote mapdata.js', (js.length / 1024).toFixed(0) + 'KB', 'points', totalPts);

// ---------------------------------------------------------------- 8. 除錯圖（1/3 解析度）
{
  const SC = 3, w = Math.floor(W / SC), h = Math.floor(H / SC);
  const img = Buffer.alloc((w * 3 + 1) * h);
  const col = (l) => {
    if (l === LAKE) return [70, 110, 160];
    if (l === WASTE) return [150, 150, 150];
    if (l >= R) { const s = l - R; return [30 + (s * 37) % 40, 60 + (s * 53) % 50, 110 + (s * 29) % 60]; }
    const h1 = (l * 2654435761) >>> 0;
    return [90 + (h1 & 127), 90 + ((h1 >> 8) & 127), 60 + ((h1 >> 16) & 127)];
  };
  for (let y = 0; y < h; y++) {
    img[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const l = label[(y * SC + 1) * W + x * SC + 1];
      let c = col(l);
      // 邊界加深
      const l2 = label[(y * SC + 1) * W + Math.min(W - 1, x * SC + 3)], l3 = label[Math.min(H - 1, y * SC + 3) * W + x * SC + 1];
      if (l2 !== l || l3 !== l) c = c.map(v => v * 0.45);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2];
    }
  }
  const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (buf) => { let c = -1; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(img)), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(path.join(OUT_DIR, 'debug.png'), png);
  // 局部放大圖（全解析度）
  const crop = (name, cx0, cy0, cw, ch) => {
    const buf = Buffer.alloc((cw * 3 + 1) * ch);
    for (let y = 0; y < ch; y++) {
      buf[y * (cw * 3 + 1)] = 0;
      for (let x = 0; x < cw; x++) {
        const gx = cx0 + x, gy = cy0 + y;
        const l = label[gy * W + gx];
        let c = col(l);
        if (label[gy * W + Math.min(W - 1, gx + 1)] !== l || label[Math.min(H - 1, gy + 1) * W + gx] !== l) c = c.map(v => v * 0.45);
        for (let r = 0; r < R; r++) if (regionSeed[r] === gy * W + gx) c = [255, 0, 0];
        const o = y * (cw * 3 + 1) + 1 + x * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2];
      }
    }
    const ih = Buffer.alloc(13); ih.writeUInt32BE(cw, 0); ih.writeUInt32BE(ch, 4); ih[8] = 8; ih[9] = 2;
    fs.writeFileSync(path.join(OUT_DIR, name), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(buf)), chunk('IEND', Buffer.alloc(0))]));
  };
  crop('europe.png', 1980, 250, 760, 520);
  crop('eastasia.png', 3350, 420, 700, 560);
  crop('mideast.png', 2400, 600, 700, 450);
  // 寫出標籤資訊供檢查
  fs.writeFileSync(path.join(OUT_DIR, 'labels.json'), JSON.stringify({ area: Array.from(area) }));
}
console.log('WARNINGS:\n' + warnings.join('\n'));
log('done');
