// 烽火世紀 — 模擬引擎（瀏覽器與 Node 共用）
import { WORLD, rDist, regionName } from './world.js';
import { UNITS, LAND_TYPES, TERRAIN, LAWS, FOCUS, BUILD, DIFFICULTY, TECHS, TECH_MAP, GROUPS, NUKE_HIST } from '../data/rules.js';
import { rand, clamp, pairKey, fmtDate, yearOf } from './util.js';
import { gcDist } from '../data/proj.js';

const R = WORLD.R, NN = WORLD.N, nodes = WORLD.nodes, ADJ = WORLD.adj;
export const HOOKS = { events: null, ai: null, capitulate: null, onWar: null };
export const SEA_SPEED = 300;
const UNIT_REQ = {}; for (const t of TECHS) if (t.e.unlock) UNIT_REQ[t.e.unlock] = t.id;
export { UNIT_REQ };

// ============================================================ 基本查詢
export const alive = (S, t) => !!(t && S.C[t] && S.C[t].exists);
export function liveTags(S) { const out = []; for (const t in S.C) if (S.C[t].exists) out.push(t); return out; }
export function cname(S, t) { return (S.C[t] && S.C[t].name) || (WORLD.countries[t] && WORLD.countries[t].name) || t; }
export function rname(S, r) { return regionName(r, yearOf(S.day)); }
export function atWar(S, a, b) { return a !== b && S.wars[pairKey(a, b)] !== undefined; }
export function isLandUnit(u) { return UNITS[u.t].domain === 'land'; }
export function isAir(u) { return UNITS[u.t].domain === 'air'; }
export function isNaval(u) { return UNITS[u.t].domain === 'sea'; }

const ENEMY_CACHE = new WeakMap();
export function enemySet(S, t) {
  let c = ENEMY_CACHE.get(S);
  if (!c || c.v !== S.wv) {
    c = { v: S.wv, m: new Map() };
    for (const k in S.wars) {
      const [a, b] = k.split('|');
      if (!c.m.has(a)) c.m.set(a, new Set());
      if (!c.m.has(b)) c.m.set(b, new Set());
      c.m.get(a).add(b); c.m.get(b).add(a);
    }
    ENEMY_CACHE.set(S, c);
  }
  return c.m.get(t) || EMPTY_SET;
}
const EMPTY_SET = new Set();
export function atWarAny(S, t) { return enemySet(S, t).size > 0; }
export function friendly(S, a, b) {
  if (a === b) return true;
  const ca = S.C[a], cb = S.C[b];
  if (!ca || !cb) return false;
  if (ca.fac && ca.fac === cb.fac) return true;
  if (ca.subj === b || cb.subj === a) return true;
  if (ca.subj && ca.subj === cb.subj) return true;
  return false;
}
export function coBel(S, a, b) {
  if (a === b) return true;
  if (atWar(S, a, b)) return false;
  const ea = enemySet(S, a), eb = enemySet(S, b);
  if (!ea.size || !eb.size) return false;
  const [s1, s2] = ea.size < eb.size ? [ea, eb] : [eb, ea];
  for (const x of s1) if (s2.has(x)) return true;
  return false;
}
export function allied(S, a, b) { return a === b || friendly(S, a, b) || coBel(S, a, b); }
// 可進入的領土
export function canEnter(S, t, ctrl) { return !ctrl || ctrl === t || allied(S, t, ctrl) || atWar(S, t, ctrl); }

export function addNews(S, text, kind = 'info', tags = []) {
  S.news.push({ d: S.day, t: text, k: kind, c: tags, id: ++S.newsSeq });
  if (S.news.length > 160) S.news.splice(0, S.news.length - 160);
}
export function diffMod(S, tag) {
  const D = DIFFICULTY[S.set.diff] || DIFFICULTY.normal;
  return S.C[tag] && S.C[tag].ai ? D.ai : D.player;
}

// ============================================================ 國家狀態
export function newCountry(S, tag, opts = {}) {
  const def = WORLD.countries[tag];
  if (!def) throw new Error('未定義國家 ' + tag);
  const C = {
    tag, exists: true, name: opts.name || def.name, color: opts.color || def.color, ideo: opts.ideo || def.ideo,
    fac: null, lastFac: null, subj: null, cap: def.capital,
    pp: opts.pp ?? 50, ppd: 0, man: 0,
    laws: { con: 1, eco: def.major ? 1 : 0 },
    techs: (opts.techs || []).slice(), rcat: {},
    res: def.major ? [null, null, null] : [null, null], rsp: 0, nukeSpeed: 0,
    prod: [], focus: { cur: null, prog: 0, done: [] },
    mods: { att: 0, def: 0, armorAtt: 0, air: 0, nav: 0, raid: 0, speed: 0 },
    guar: [], nap: {}, nukes: 0,
    ai: true, pid: null, autoArmy: false, autoProd: false, autoDeploy: true, deploy: -1,
    ic: 0, convoyLoss: 0, stats: { lost: 0, kills: 0 }, aiS: {},
  };
  S.C[tag] = C;
  return C;
}

// ============================================================ 地區轉移 / 建國
export function transferRegion(S, r, to, opts = {}) {
  S.own[r] = to; S.ctrl[r] = to;
  if (opts.core) S.core[r] = to;
  relocateHostile(S, r);
}
export function relocateHostile(S, r) {
  const c = S.ctrl[r];
  for (const u of S.units) {
    if (u.n !== r || u.dead) continue;
    if (u.c === c || allied(S, u.c, c)) continue;
    relocateUnit(S, u);
  }
}
// 把單位送到最近的己方地區；找不到則解散
export function relocateUnit(S, u) {
  const start = u.n;
  const seen = new Uint8Array(NN); seen[start] = 1;
  const q = [start];
  for (let h = 0; h < q.length; h++) {
    const n = q[h];
    for (const e of ADJ[n]) {
      const m = e.to; if (seen[m]) continue; seen[m] = 1;
      if (m < R) {
        if (UNITS[u.t].domain !== 'sea' && (S.ctrl[m] === u.c || (S.ctrl[m] && friendly(S, u.c, S.ctrl[m])))) { u.n = m; u.path = []; u.prog = 0; return true; }
      } else if (UNITS[u.t].domain === 'sea') {
        // 艦隊：靠近己方港口的海域
        if (nodes[m].landNb.some(l => S.ctrl[l] === u.c)) { u.n = m; u.path = []; u.prog = 0; return true; }
      }
      q.push(m);
    }
  }
  killUnit(S, u);
  return false;
}
export function killUnit(S, u) { u.dead = true; u.hp = 0; }

export function regionsOf(S, tag) { const out = []; for (let r = 0; r < R; r++) if (S.own[r] === tag) out.push(r); return out; }

// 建立或復活國家並給予地區
export function createCountry(S, tag, regions, opts = {}) {
  let C = S.C[tag];
  const revived = !C || !C.exists;
  if (!C) C = newCountry(S, tag, opts);
  else if (!C.exists) {
    const keep = { stats: C.stats, focus: C.focus, lastFac: C.lastFac, pid: C.pid, ai: C.ai };
    Object.assign(C, newCountry(S, tag, opts), keep);
    S.C[tag] = C;
  }
  C.exists = true;
  if (opts.ideo) C.ideo = opts.ideo;
  if (opts.name) C.name = opts.name;
  // 科技：沿用來源國
  const src = opts.from && S.C[opts.from];
  if (revived) {
    const y = yearOf(S.day);
    if (src && src.techs) C.techs = src.techs.filter(id => TECH_MAP[id] && !TECH_MAP[id].special && TECH_MAP[id].year <= y - 2);
    else C.techs = techsUpTo(y - 3);
  }
  for (const r of regions) transferRegion(S, r, tag, { core: opts.core !== false });
  if (!regions.includes(C.cap) || S.own[C.cap] !== tag) {
    const def = WORLD.countries[tag];
    C.cap = S.own[def.capital] === tag ? def.capital : (regions.length ? regions.slice().sort((a, b) => nodes[b].vp - nodes[a].vp)[0] : def.capital);
  }
  if (revived) {
    let pop = 0; for (const r of regions) pop += nodes[r].pop;
    C.man = Math.round(pop * 1000 * 0.01);
    if (opts.units !== 0) {
      const n = opts.units ?? Math.max(1, Math.min(6, Math.round(regions.length * 0.8 + pop / 8)));
      for (let i = 0; i < n; i++) spawnUnit(S, tag, 'inf', regions[i % regions.length]);
    }
  }
  if (opts.fac && S.fac[opts.fac]) joinFaction(S, tag, opts.fac);
  if (opts.subj) C.subj = opts.subj;
  return C;
}
// ============================================================ 科技
// 截至某年份的一般科技（不含核武等特殊科技）
export function techsUpTo(year) { return TECHS.filter(t => !t.special && t.year <= year).map(t => t.id); }
// 劇本開局：依落後年數給予科技，並依史實年份給予核武科技
export function grantTechsByYear(S, tag, year, lag, extra = []) {
  const C = S.C[tag]; if (!C) return;
  const set = new Set(C.techs || []);
  for (const id of techsUpTo(year - lag)) set.add(id);
  for (const id of extra) set.add(id);
  const nh = NUKE_HIST[tag];
  if (nh) for (const id in nh) if (nh[id] <= year) set.add(id);
  C.techs = TECHS.filter(t => set.has(t.id)).map(t => t.id);
}
export function grantTech(S, tag, id) {
  const C = S.C[tag]; if (!C || !TECH_MAP[id]) return false;
  if (!C.techs) C.techs = [];
  if (C.techs.includes(id)) return false;
  C.techs.push(id);
  return true;
}
const TB_CACHE = new WeakMap();
const ZERO_U = Object.freeze({});
const TB_KEYS = ['ic', 'rsp', 'fcost', 'escort', 'aa', 'amph', 'medic', 'supply'];
// 科技加成（依已完成科技計算並快取）
export function techBonus(C) {
  const list = (C && C.techs) || [];
  const key = list.length + '|' + (list[list.length - 1] || '');
  const c = TB_CACHE.get(C);
  if (c && c.key === key && c.list === list) return c.tb;
  const tb = { u: {}, flags: new Set(), has: new Set(list), cat: {} };
  for (const k of TB_KEYS) tb[k] = 0;
  for (const id of list) {
    const T = TECH_MAP[id]; if (!T) continue;
    tb.cat[T.cat] = (tb.cat[T.cat] || 0) + 1;
    const e = T.e;
    for (const k of TB_KEYS) if (e[k]) tb[k] += e[k];
    if (e.flag) tb.flags.add(e.flag);
    if (e.u) for (const g in e.u) for (const t of (GROUPS[g] || [g])) { const o = tb.u[t] || (tb.u[t] = {}); for (const st in e.u[g]) o[st] = (o[st] || 0) + e.u[g][st]; }
  }
  if (C) TB_CACHE.set(C, { key, list, tb });
  return tb;
}
export function hasTech(C, id) { return !!C && techBonus(C).has.has(id); }
export function hasFlag(C, f) { return !!C && techBonus(C).flags.has(f); }
function ub(S, u) { const C = S.C[u.c]; return (C && techBonus(C).u[u.t]) || ZERO_U; }
export function unitBonus(S, tag, t) { const C = S.C[tag]; return (C && techBonus(C).u[t]) || ZERO_U; }
function upkeepOf(S, u) {
  const b = ub(S, u);
  const C = S.C[u.c];
  return UNITS[u.t].up * (1 + 0.3 * ((b.att || 0) + (b.def || 0) + (b.air || 0) + (b.bomb || 0) + (b.strat || 0) + (b.naval || 0)) / 2) * (1 - Math.min(0.4, (C && C.mods && C.mods.upk) || 0));
}

export function killCountry(S, tag, by) {
  const C = S.C[tag]; if (!C || !C.exists) return;
  for (let r = 0; r < R; r++) if (S.own[r] === tag) { S.own[r] = by || S.ctrl[r]; if (S.ctrl[r] === tag) S.ctrl[r] = S.own[r]; }
  // 滅亡國家佔領中的他國領土：歸還原主（原主也不存在時交給接收者）
  for (let r = 0; r < R; r++) if (S.ctrl[r] === tag) S.ctrl[r] = S.own[r] && S.own[r] !== tag && alive(S, S.own[r]) ? S.own[r] : (by || S.own[r]);
  for (const u of S.units) if (u.c === tag) killUnit(S, u);
  endAllWars(S, tag);
  if (C.fac) { C.lastFac = C.fac; leaveFaction(S, tag, true); }
  for (const t in S.C) { const o = S.C[t]; o.guar = o.guar.filter(x => x !== tag); if (o.subj === tag) o.subj = null; }
  for (const k of Object.keys(S.lend)) if (k.startsWith(tag + '>') || k.endsWith('>' + tag)) delete S.lend[k];
  C.exists = false; C.prod = []; C.pp = 0; C.deadDay = S.day;
  delete S.pending[tag];
  addNews(S, `${C.name}已不復存在。`, 'major', [tag]);
}
function endAllWars(S, tag) {
  for (const k of Object.keys(S.wars)) { const [a, b] = k.split('|'); if (a === tag || b === tag) delete S.wars[k]; }
  S.wv++;
}

// ============================================================ 陣營
export function makeFaction(S, id, name, leader, members = []) {
  S.fac[id] = { id, name, leader, members: [] };
  joinFaction(S, leader, id);
  for (const m of members) joinFaction(S, m, id);
  return S.fac[id];
}
export function joinFaction(S, tag, id) {
  const F = S.fac[id], C = S.C[tag]; if (!F || !C || !C.exists) return;
  if (C.fac === id) return;
  if (C.fac) leaveFaction(S, tag, true);
  C.fac = id; C.lastFac = id;
  if (!F.members.includes(tag)) F.members.push(tag);
}
export function leaveFaction(S, tag, silent) {
  const C = S.C[tag]; if (!C || !C.fac) return;
  const F = S.fac[C.fac];
  C.fac = null;
  if (F) {
    F.members = F.members.filter(m => m !== tag);
    if (F.leader === tag) {
      if (F.members.length) F.leader = F.members.slice().sort((a, b) => (S.C[b].ic || 0) - (S.C[a].ic || 0))[0];
      else delete S.fac[F.id];
    }
    if (F.members.length === 0) delete S.fac[F.id];
  }
  if (!silent) addNews(S, `${C.name}退出了${F ? F.name : '陣營'}。`, 'info', [tag]);
}

// ============================================================ 戰爭與和平
export function setWar(S, a, b) {
  if (a === b || !alive(S, a) || !alive(S, b)) return false;
  const k = pairKey(a, b);
  if (S.wars[k] !== undefined) return false;
  S.wars[k] = S.day; S.wv++;
  return true;
}
export function declareWar(S, a, b, opts = {}) {
  if (a === b || !alive(S, a) || !alive(S, b) || atWar(S, a, b)) return false;
  const A = S.C[a], B = S.C[b];
  const tags = liveTags(S);
  const att = new Set([a]), def = new Set([b]);
  if (opts.limited) {
    if (!setWar(S, a, b)) return false;
    S.tension = clamp(S.tension + 3, 0, 100);
    if (!opts.silent) addNews(S, `${A.name}向${B.name}宣戰！`, 'war', [a, b]);
    if (HOOKS.onWar) HOOKS.onWar(S, a, b);
    return true;
  }
  if (!opts.solo) {
    if (A.fac && S.fac[A.fac] && S.fac[A.fac].leader === a) for (const m of S.fac[A.fac].members) att.add(m);
    for (const t of tags) if (S.C[t].subj === a) att.add(t);
  }
  if (B.fac && S.fac[B.fac]) for (const m of S.fac[B.fac].members) def.add(m);
  for (const t of tags) if (S.C[t].subj === b) def.add(t);
  if (B.subj && alive(S, B.subj)) def.add(B.subj);
  const guarantors = [];
  for (const t of tags) {
    if (t === a || att.has(t)) continue;
    if (S.C[t].guar.includes(b)) {
      guarantors.push(t); def.add(t);
      const G = S.C[t];
      if (G.fac && S.fac[G.fac]) {
        if (!B.fac && !opts.noJoin) joinFaction(S, b, G.fac);
        for (const m of S.fac[G.fac].members) def.add(m);
      }
    }
  }
  for (const t of [...att]) if (def.has(t) && t !== a) att.delete(t);
  for (const t of [...def]) if (att.has(t) && t !== b) def.delete(t);
  const joinedA = [], joinedD = [];
  for (const x of att) for (const y of def) {
    if (x === y) continue;
    if (S.C[x].fac && S.C[x].fac === S.C[y].fac) continue;
    if (setWar(S, x, y)) { if (x !== a && !joinedA.includes(x)) joinedA.push(x); if (y !== b && !joinedD.includes(y)) joinedD.push(y); }
  }
  const major = WORLD.countries[b].major || WORLD.countries[a].major;
  S.tension = clamp(S.tension + (major ? 8 : 4), 0, 100);
  if (!opts.silent) {
    let txt = `${A.name}向${B.name}宣戰！`;
    if (joinedA.length) txt += `（${joinedA.map(t => cname(S, t)).join('、')}隨同參戰）`;
    if (joinedD.length) txt += `（${joinedD.map(t => cname(S, t)).join('、')}加入${B.name}一方）`;
    addNews(S, txt, 'war', [a, b]);
  }
  if (HOOKS.onWar) HOOKS.onWar(S, a, b);
  return true;
}
function peaceGroup(S, t, other) {
  const g = new Set([t]);
  const C = S.C[t];
  if (C.fac && S.fac[C.fac] && S.fac[C.fac].leader === t) for (const m of S.fac[C.fac].members) if (atWar(S, m, other)) g.add(m);
  for (const x of liveTags(S)) if (S.C[x].subj === t) g.add(x);
  return g;
}
// type: white（白和平，歸還佔領地）/ status（維持現狀，佔領地割讓）
export function makePeace(S, a, b, type = 'white', opts = {}) {
  if (!atWar(S, a, b)) return false;
  const ga = peaceGroup(S, a, b), gb = peaceGroup(S, b, a);
  const ended = [];
  for (const x of ga) for (const y of gb) {
    if (!atWar(S, x, y)) continue;
    delete S.wars[pairKey(x, y)]; ended.push([x, y]);
    if (S.lim) delete S.lim[pairKey(x, y)];
  }
  S.wv++;
  for (let r = 0; r < R; r++) {
    const o = S.own[r], c = S.ctrl[r];
    if (o === c) continue;
    for (const [x, y] of ended) {
      if ((o === x && c === y) || (o === y && c === x)) {
        if (type === 'status') S.own[r] = c; else S.ctrl[r] = o;
      }
    }
  }
  for (let r = 0; r < R; r++) relocateHostile(S, r);
  if (!opts.silent) addNews(S, `${cname(S, a)}與${cname(S, b)}簽訂${type === 'status' ? '停戰協定（維持現有控制線）' : '和平條約（恢復戰前邊界）'}。`, 'peace', [a, b]);
  return true;
}

// ============================================================ 佔領 / 解放
function captureRegion(S, r, by) {
  const prev = S.ctrl[r], core = S.core[r];
  let newCtrl = by;
  if (core && core !== by) {
    const K = S.C[core];
    if (K && K.exists) {
      if (core !== prev && !atWar(S, core, by) && (friendly(S, core, by) || coBel(S, core, by))) newCtrl = core;
    } else if (K && S.day - (K.deadDay || -9999) > 365 && canLiberate(S, by, core, prev) && liberationReady(S, by, core, r)) {
      const byC = S.C[by];
      const sameFac = K.lastFac && byC.fac === K.lastFac && S.fac[K.lastFac];
      const ideo = sameFac ? WORLD.countries[core].ideo : (byC.ideo === 'com' ? 'com' : WORLD.countries[core].ideo);
      createCountry(S, core, [], { ideo, units: 0 });
      S.own[r] = core; S.ctrl[r] = core; S.core[r] = core;
      if (sameFac) joinFaction(S, core, K.lastFac);
      else if (byC.fac) joinFaction(S, core, byC.fac);
      if (!sameFac && byC.ideo === 'com') S.C[core].subj = by;
      for (const e of enemySet(S, by)) if (!friendly(S, core, e)) setWar(S, core, e);
      S.C[core].cap = r;
      spawnUnit(S, core, 'inf', r);
      if (!sameFac) {
        // 一次交還解放者已控制的全部核心地區
        for (let q = 0; q < R; q++) if (q !== r && S.core[q] === core && S.own[q] !== by && !(S.own[q] && friendly(S, by, S.own[q])) && (S.ctrl[q] === by || (S.ctrl[q] && friendly(S, by, S.ctrl[q])))) { S.own[q] = core; S.ctrl[q] = core; }
        spawnUnit(S, core, 'inf', r); spawnUnit(S, core, 'inf', r);
      }
      addNews(S, `${cname(S, by)}解放了${rname(S, r)}，${cname(S, core)}政府重新建立！`, 'major', [by, core]);
      newCtrl = core;
    }
  }
  S.ctrl[r] = newCtrl;
  // 收復自己的核心領土（被他國吞併過的）
  if (core === newCtrl && S.own[r] !== newCtrl && (!alive(S, S.own[r]) || atWar(S, S.own[r], newCtrl))) S.own[r] = newCtrl;
  if (newCtrl !== by && S.own[r] !== newCtrl && atWar(S, S.own[r], by)) S.own[r] = newCtrl;
  relocateHostile(S, r);
}
function liberationReady(S, by, core, r) {
  const K = S.C[core];
  if (K.lastFac && S.C[by].fac === K.lastFac) return true;
  let tot = 0, held = 0;
  for (let q = 0; q < R; q++) {
    if (S.core[q] !== core) continue;
    if (S.own[q] === by || (S.own[q] && friendly(S, by, S.own[q]))) continue; // 解放者自己吞併的領土不算
    tot++;
    if (q === r || S.ctrl[q] === by || (S.ctrl[q] && friendly(S, by, S.ctrl[q]))) held++;
  }
  return tot > 0 && held / tot >= 0.5;
}
function canLiberate(S, by, core, prev) {
  const K = S.C[core]; if (!K || !K.lastFac) return false;
  if (S.C[by].fac === K.lastFac && S.fac[K.lastFac]) return true;
  const F = S.fac[K.lastFac]; if (!F) return false;
  const ep = enemySet(S, prev);
  return F.members.some(m => ep.has(m));
}

// ============================================================ 投降
function capitulate(S, tag) {
  const C = S.C[tag];
  const occ = {};
  let ownedVP = 0;
  for (let r = 0; r < R; r++) {
    if (S.own[r] !== tag) continue;
    ownedVP += vpWeight(S, r, tag);
    const c = S.ctrl[r];
    if (c !== tag && atWar(S, c, tag)) occ[c] = (occ[c] || 0) + nodes[r].vp + 1;
  }
  let main = null, best = -1;
  for (const t in occ) if (occ[t] > best) { best = occ[t]; main = t; }
  if (!main) main = [...enemySet(S, tag)][0];
  if (HOOKS.capitulate && HOOKS.capitulate(S, tag, main)) return;
  // 扶植傀儡政權
  if (main && S.puppet[main + '>' + tag]) {
    for (const e of [...enemySet(S, tag)]) delete S.wars[pairKey(tag, e)];
    S.wv++;
    for (let r = 0; r < R; r++) if (S.own[r] === tag) S.ctrl[r] = tag;
    for (let r = 0; r < R; r++) relocateHostile(S, r);
    if (C.fac) leaveFaction(S, tag, true);
    C.subj = main; C.ideo = S.C[main].ideo;
    if (S.C[main].fac) joinFaction(S, tag, S.C[main].fac);
    for (const u of S.units) if (u.c === tag && !u.dead && u.hp < 50) u.hp = 50;
    addNews(S, `${C.name}向${cname(S, main)}投降，成為其附庸國。`, 'major', [tag, main]);
    delete S.puppet[main + '>' + tag];
    return;
  }
  for (const u of S.units) if (u.c === tag) killUnit(S, u);
  let remainVP = 0; const remain = [];
  for (let r = 0; r < R; r++) {
    if (S.own[r] !== tag) continue;
    const c = S.ctrl[r];
    if (c !== tag && atWar(S, c, tag)) S.own[r] = c;
    else { S.ctrl[r] = tag; remain.push(r); remainVP += vpWeight(S, r, tag); }
  }
  // 殘存政府只有在擁有海外領土時才能維持（如流亡殖民地），否則全境遭瓜分
  const overseas = remain.some(r => C.cap >= 0 && rDist(r, C.cap) > 1500);
  const enemies = [...enemySet(S, tag)];
  for (const e of enemies) delete S.wars[pairKey(tag, e)];
  S.wv++;
  if (C.fac) { C.lastFac = C.fac; leaveFaction(S, tag, true); }
  const civil = main && S.flags['civil:' + pairKey(tag, main)];
  if (remain.length === 0 || remainVP < ownedVP * 0.25 || civil || !overseas) {
    // 剩餘領土交給最近的佔領國
    for (const r of remain) {
      let to = main;
      const seen = new Set([r]); const q = [r];
      outer: for (let h = 0; h < q.length; h++) {
        for (const m of nodes[q[h]].landNb) {
          if (seen.has(m)) continue; seen.add(m);
          if (S.own[m] !== tag && enemies.includes(S.ctrl[m])) { to = S.ctrl[m]; break outer; }
          if (S.own[m] === tag) q.push(m);
        }
      }
      S.own[r] = to; S.ctrl[r] = to;
    }
    addNews(S, `${C.name}全境淪陷，向${cname(S, main)}投降。`, 'major', [tag, main]);
    killCountry(S, tag, main);
  } else {
    if (S.ctrl[C.cap] !== tag) C.cap = remain.slice().sort((a, b) => nodes[b].vp - nodes[a].vp)[0];
    addNews(S, `${C.name}向${cname(S, main)}投降，被佔領的領土遭到割讓，殘存政府退出戰爭。`, 'major', [tag, main]);
  }
  for (let r = 0; r < R; r++) relocateHostile(S, r);
}

// ============================================================ 單位
// 事件／國策給予的部隊：依科技升級為較新的同類兵種
export function bestUnitType(S, tag, type) {
  const C = S.C[tag]; if (!C) return type;
  const ok = (x) => !UNIT_REQ[x] || hasTech(C, UNIT_REQ[x]);
  if (type === 'arm' || type === 'ltk') return ok('mbt') ? 'mbt' : ok('arm') || type === 'arm' ? 'arm' : 'ltk';
  if (type === 'ftr') return ok('jet') ? 'jet' : 'ftr';
  return type;
}
export function spawnUnit(S, tag, t, at, opts = {}) {
  const T = UNITS[t];
  let n = at;
  if (T.domain === 'sea' && n !== undefined && n < R) {
    const sea = nodes[n].seaNb; n = sea.length ? sea[0] : undefined;
  }
  if (n === undefined) return null;
  const u = { id: S.nid++, c: tag, t, n, hp: opts.hp ?? 100, org: opts.org ?? (T.org || 60), path: [], prog: 0, ent: 0, sup: 1 };
  if (opts.auto) u.auto = true;
  S.units.push(u);
  return u;
}
export function maxOrg(S, u) { return (UNITS[u.t].org || 60) * (1 + (ub(S, u).org || 0)); }
export function unitAttack(S, u, terr) {
  const T = UNITS[u.t], C = S.C[u.c];
  let a = (T.att || 0) * (1 + (ub(S, u).att || 0) + C.mods.att + (T.armor ? C.mods.armorAtt : 0));
  if (T.armor) a *= TERRAIN[terr].arm;
  return a * diffMod(S, u.c);
}
export function unitDefense(S, u) {
  const T = UNITS[u.t], C = S.C[u.c];
  return (T.def || 0) * (1 + (ub(S, u).def || 0) + C.mods.def) * diffMod(S, u.c);
}
export function unitEff(S, u) { return (u.hp / 100) * (0.3 + 0.7 * u.org / maxOrg(S, u)) * (u.sup ? 1 : 0.6 + Math.min(0.2, techBonus(S.C[u.c]).supply)); }
export function unitSpeed(S, u, dest) {
  const T = UNITS[u.t], C = S.C[u.c];
  if (T.domain === 'sea') return T.speed;
  if (dest >= R || u.n >= R) return SEA_SPEED;
  let sp = T.speed * (1 + C.mods.speed + (ub(S, u).speed || 0));
  sp *= TERRAIN[nodes[dest].terrain].move;
  if (!u.sup) sp *= 0.7;
  return sp;
}
export function airPower(S, u) { const T = UNITS[u.t], C = S.C[u.c]; return (T.air || 0) * (1 + (ub(S, u).air || 0) + C.mods.air) * u.hp / 100; }
export function bombPower(S, u) { const T = UNITS[u.t], C = S.C[u.c]; return (T.bomb || 0) * (1 + (ub(S, u).bomb || 0) + C.mods.air * 0.5) * u.hp / 100; }
export function stratPower(S, u) { const T = UNITS[u.t]; return (T.strat || 0) * (1 + (ub(S, u).strat || 0)) * u.hp / 100; }
export function navalStrike(S, u) { const T = UNITS[u.t], C = S.C[u.c]; return (T.naval || 0) * (1 + (ub(S, u).naval || 0) + C.mods.nav * 0.5) * u.hp / 100; }
export function airRange(S, u) { return (UNITS[u.t].range || 0) * (1 + (ub(S, u).range || 0)); }
export function navPower(S, u, def) { const T = UNITS[u.t], C = S.C[u.c], b = ub(S, u); return (def ? T.def : T.att) * (1 + ((def ? b.def : b.att) || 0) + C.mods.nav) * u.hp / 100; }
function edgeOf(a, b) { for (const e of ADJ[a]) if (e.to === b) return e; return null; }
export function edgeDist(a, b) { const e = edgeOf(a, b); return e ? e.d : 9999; }

// ============================================================ 尋路
class MinHeap {
  constructor() { this.k = []; this.v = []; }
  push(key, val) {
    const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v; const rk = k[0], rv = v[0];
    const lk = k.pop(), lv = v.pop();
    if (k.length) {
      let i = 0; const n = k.length;
      while (true) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; }
      k[i] = lk; v[i] = lv;
    }
    this.lastKey = rk; return rv;
  }
  get size() { return this.k.length; }
}
// 陸軍可用的節點與代價
// 有限戰爭：AI 只能進入約定的目標地區（或收復失土）；對真人玩家則不設限
export function limBlocks(S, tag, r) {
  const c = S.ctrl[r]; if (!c || !S.lim) return false;
  const lim = S.lim[pairKey(tag, c)]; if (!lim) return false;
  const K = S.C[c]; if (K && !K.ai && S.set.aiVsHuman !== false) return false;
  if ((lim[tag] || []).includes(r)) return false;
  if (lim.nr && lim.nr.includes(tag)) return true;
  const o = S.own[r], co = S.core[r];
  if (o === tag || co === tag || (o && friendly(S, tag, o)) || (co && alive(S, co) && friendly(S, tag, co))) return false;
  return true;
}
export function pathCostFn(S, tag, kind) {
  if (kind === 'sea') return (from, to, e) => (to < R ? Infinity : e.d);
  const isAI = !!(S.C[tag] && S.C[tag].ai);
  return (from, to, e) => {
    if (to < R) {
      const c = S.ctrl[to];
      if (c === tag || allied(S, tag, c)) return e.d / TERRAIN[nodes[to].terrain].move * (e.t === 1 ? 1.5 : 1);
      if (atWar(S, tag, c)) return isAI && limBlocks(S, tag, to) ? Infinity : e.d / TERRAIN[nodes[to].terrain].move + 400;
      return Infinity;
    }
    // 海上運輸
    return from < R ? 500 : e.d * 0.35;
  };
}
export function findPath(S, u, target) {
  if (u.n === target) return [];
  const kind = UNITS[u.t].domain === 'sea' ? 'sea' : 'land';
  const cost = pathCostFn(S, u.c, kind);
  const dist = new Float64Array(NN).fill(Infinity), prev = new Int32Array(NN).fill(-1);
  const h = new MinHeap();
  dist[u.n] = 0; h.push(0, u.n);
  while (h.size) {
    const n = h.pop(); const d = h.lastKey;
    if (d > dist[n]) continue;
    if (n === target) break;
    // 不穿越敵方地區（除非是目標）— 允許但代價高
    for (const e of ADJ[n]) {
      const m = e.to;
      const c = cost(n, m, e); if (c === Infinity) continue;
      // 海上單位禁止從陸地直接上岸到非目標敵區以外
      const nd = d + c;
      if (nd < dist[m]) { dist[m] = nd; prev[m] = n; h.push(nd, m); }
    }
  }
  if (dist[target] === Infinity) return null;
  const path = [];
  for (let n = target; n !== u.n; n = prev[n]) path.push(n);
  return path.reverse();
}
// 多源 Dijkstra：回傳每個節點到最近來源的距離與下一步
export function multiDijkstra(S, tag, sources, kind = 'land', maxD = Infinity) {
  const cost = pathCostFn(S, tag, kind);
  const dist = new Float64Array(NN).fill(Infinity), next = new Int32Array(NN).fill(-1);
  const h = new MinHeap();
  for (const s of sources) { dist[s] = 0; next[s] = s; h.push(0, s); }
  while (h.size) {
    const n = h.pop(); const d = h.lastKey;
    if (d > dist[n] || d > maxD) continue;
    for (const e of ADJ[n]) {
      const m = e.to;
      const c = cost(m, n, edgeOf(m, n) || e); if (c === Infinity) continue;
      const nd = d + c;
      if (nd < dist[m]) { dist[m] = nd; next[m] = n; h.push(nd, m); }
    }
  }
  return { dist, next };
}
export function orderMove(S, u, target) {
  if (UNITS[u.t].domain === 'air') {
    if (target < R && (S.ctrl[target] === u.c || allied(S, u.c, S.ctrl[target]))) { u.n = target; u.path = []; return true; }
    return false;
  }
  const p = findPath(S, u, target);
  if (!p) return false;
  // 從海上到陸地、陸地到陸地都可
  u.path = p; u.prog = 0;
  return true;
}

// ============================================================ 經濟
export function regionIndCap(r) { return nodes[r].indCap; }
function computeNational(S) {
  const nat = {};
  for (const t in S.C) if (S.C[t].exists) nat[t] = { ind: 0, popCore: 0, popOther: 0, vpOwned: 0, vpHeld: 0, regions: 0, coastal: false };
  for (let r = 0; r < R; r++) {
    const o = S.own[r], c = S.ctrl[r], nd = nodes[r];
    const no = nat[o];
    if (no) {
      const w = vpWeight(S, r, o);
      no.vpOwned += w; no.regions++;
      if (c === o || (c && friendly(S, c, o) && !atWar(S, c, o))) no.vpHeld += w;
    }
    const nc = nat[c];
    if (nc) {
      const coreF = S.core[r] === c ? 1 : (o === c ? 0.4 : 0.15);
      nc.ind += S.ind[r] * (1 - S.dmg[r]) * coreF;
      if (S.core[r] === c) nc.popCore += nd.pop; else nc.popOther += nd.pop;
      if (nd.coastal) nc.coastal = true;
    }
  }
  return nat;
}
// 投降計算用的勝利點權重：殖民地與遠方領土只算 30%
export function vpWeight(S, r, owner) {
  const nd = nodes[r];
  const C = S.C[owner];
  let w = nd.vp + 1;
  if (nd.indep || (C && C.cap >= 0 && rDist(r, C.cap) > 2500 && S.core[r] === owner && nodes[C.cap].mod !== nd.mod)) w *= 0.3;
  if (S.core[r] !== owner) w *= 0.25;
  return w;
}
export function lawAllowed(S, tag, law, lvl) {
  const L = LAWS[law].levels[lvl]; const C = S.C[tag];
  if (!L) return '無此法律';
  const war = atWarAny(S, tag);
  if (L.war && !war) return '必須處於戰爭狀態';
  if (L.tension && !war) {
    const need = C.ideo === 'dem' ? L.tension : Math.max(0, L.tension - 25);
    if (S.tension < need) return `需要世界緊張度 ${need}%`;
  }
  return null;
}
export function researchCost(S, tag, id) {
  const T = TECH_MAP[id]; if (!T) return Infinity;
  const ahead = T.year - (yearOf(S.day) + (S.day % 365) / 365);
  let mul = ahead > 0 ? 1 + 1.0 * ahead : Math.max(0.55, 1 + 0.09 * ahead);
  if (T.special && ahead > 0) mul = 1 + 2.2 * ahead;
  return (T.cost || 100) * mul;
}
export function canResearch(S, tag, id) {
  const C = S.C[tag], T = TECH_MAP[id];
  if (!T) return '無此科技';
  const tb = techBonus(C);
  if (tb.has.has(id)) return '已完成';
  for (const q of T.req) if (!tb.has.has(q)) return `需要先研究「${TECH_MAP[q] ? TECH_MAP[q].name : q}」`;
  if (T.minInd && (C.indTotal || 0) < T.minInd) return `需要國家工業 ${T.minInd} 以上`;
  for (const s of C.res) if (s && s.id === id) return '研究中';
  return null;
}
export function researchSpeed(S, tag, id) {
  const C = S.C[tag], T = TECH_MAP[id]; if (!T) return 1;
  // 工業規模小的國家研究較慢
  const dev = 0.55 + 0.45 * Math.min(1, (C.indTotal || 0) / 50);
  return (1 + (C.rsp || 0) + techBonus(C).rsp + ((C.rcat && C.rcat[T.cat]) || 0)) * dev * (T.special ? 1 + (C.nukeSpeed || 0) : 1) * (C.ai ? 1 : 1.05);
}
// 可用的國策樹（分頁）：本國二戰國策、冷戰國策、通用國策
const FT_CACHE = new WeakMap();
export function focusTrees(S, tag) {
  const C = S.C[tag]; if (!C) return [];
  const y = yearOf(S.day);
  const key = y + '|' + C.focus.done.length;
  const c = FT_CACHE.get(C);
  if (c && c.key === key && c.tag === tag) return c.out;
  const out = [];
  const nat = FOCUS[tag], cold = FOCUS[tag + '_COLD'];
  const done = new Set(C.focus.done);
  if (nat) out.push({ key: tag, name: nat.name, list: nat.list });
  if (cold && (y >= 1946 || !nat)) out.push({ key: tag + '_COLD', name: cold.name, list: cold.list });
  const exhausted = (t) => t.list.every(f => done.has(f.id) || (f.excl && f.excl.some(q => done.has(q))) || (f.alt && S.set.hist && C.ai) || (f.maxYear && y > f.maxYear) || (f.minYear && f.minYear > y + 8));
  if (!nat && !cold) out.push({ key: 'GENERIC', name: FOCUS.GENERIC.name, list: FOCUS.GENERIC.list });
  else if (out.every(exhausted) || C.focus.done.some(id => id.startsWith('n_'))) out.push({ key: 'GENERIC', name: FOCUS.GENERIC.name, list: FOCUS.GENERIC.list });
  if (y >= 1946 && !cold) out.push({ key: 'GENERIC_COLD', name: FOCUS.GENERIC_COLD.name, list: FOCUS.GENERIC_COLD.list });
  FT_CACHE.set(C, { key, tag, out });
  return out;
}
export function focusList(S, tag) { return focusTrees(S, tag).flatMap(t => t.list); }
export function focusDays(S, tag, f) { return f.days; }
export function focusAvailable(S, tag, f) {
  const C = S.C[tag], done = C.focus.done;
  if (done.includes(f.id)) return '已完成';
  if (f.excl && f.excl.some(q => done.includes(q) || C.focus.cur === q)) return '與已選國策互斥';
  if (f.req.some(q => !done.includes(q))) return '需要先完成前置國策';
  if (f.reqAny && !f.reqAny.some(q => done.includes(q))) return '需要先完成任一前置國策';
  const y = yearOf(S.day);
  if (f.minYear && y < f.minYear) return `${f.minYear} 年後可用`;
  if (f.maxYear && y > f.maxYear) return `已超過時限（${f.maxYear} 年）`;
  if (f.coastal && !nodes[C.cap].coastal && !regionsOf(S, tag).some(r => nodes[r].coastal)) return '需要海岸線';
  if (f.eff.war) { const w = f.eff.war; if (!alive(S, w)) return '對象已不存在'; if (atWar(S, tag, w)) return null; if (friendly(S, tag, w)) return '對象是盟友'; }
  if (f.eff.joinFac && !factionFor(S, f.eff.joinFac)) return '目前沒有這個陣營';
  return null;
}
// 依意識形態尋找可加入的陣營
function factionFor(S, ideo) {
  const pref = { dem: ['allies', 'nato'], fas: ['axis'], com: ['comintern', 'warsaw'] }[ideo] || [ideo];
  for (const id of pref) if (S.fac[id] && S.fac[id].members && S.fac[id].members.length) return id;
  for (const id in S.fac) { const F = S.fac[id]; if (F && S.C[F.leader] && S.C[F.leader].ideo === ideo) return id; }
  return null;
}
function applyFocus(S, tag, f) {
  const C = S.C[tag], e = f.eff;
  if (e.ind) addIndustry(S, tag, e.ind);
  if (e.pp) C.pp += e.pp;
  if (e.ppd) C.ppd += e.ppd;
  if (e.res) for (let i = 0; i < e.res; i++) if (C.res.length < 5) C.res.push(null);
  if (e.rsp) C.rsp += e.rsp;
  if (e.nukeSpeed) C.nukeSpeed += e.nukeSpeed;
  for (const k of ['att', 'def', 'armorAtt', 'air', 'nav', 'raid', 'speed', 'icp', 'fcost', 'upk', 'escort']) if (e[k]) C.mods[k] = (C.mods[k] || 0) + e[k];
  if (e.man) C.man = Math.max(0, C.man + e.man);
  if (e.nukes) C.nukes += e.nukes;
  if (e.pp && C.pp < 0) C.pp = 0;
  if (e.ind < 0) removeIndustry(S, tag, -e.ind);
  if (e.ideo) C.ideo = e.ideo;
  if (e.tension) S.tension = clamp(S.tension + e.tension, 0, 100);
  if (e.flag) S.flags[e.flag] = S.day;
  if (e.leaveFac && C.fac) leaveFaction(S, tag);
  if (e.joinFac) { const fid = factionFor(S, e.joinFac); if (fid && C.fac !== fid) { if (C.fac) leaveFaction(S, tag); joinFaction(S, tag, fid); addNews(S, `${C.name}加入了${S.fac[fid].name}。`, 'diplo', [tag]); } }
  if (e.guar) for (const g of e.guar) if (alive(S, g) && g !== tag && !C.guar.includes(g)) C.guar.push(g);
  if (e.nap) for (const o of e.nap) if (alive(S, o) && !atWar(S, tag, o)) { C.nap[o] = S.day + 3650; S.C[o].nap[tag] = S.day + 3650; }
  if (e.coastFort) { const cs = []; for (let r = 0; r < R; r++) if (S.own[r] === tag && S.ctrl[r] === tag && nodes[r].coastal) cs.push(r); cs.sort((a, b) => nodes[b].vp + S.ind[b] - nodes[a].vp - S.ind[a]); for (const r of cs.slice(0, 6)) S.fort[r] = Math.min(5, S.fort[r] + e.coastFort); }
  if (e.war && alive(S, e.war) && !atWar(S, tag, e.war)) {
    if (C.nap[e.war]) { delete C.nap[e.war]; if (S.C[e.war]) delete S.C[e.war].nap[tag]; }
    declareWar(S, tag, e.war);
    if (e.civil) S.flags['civil:' + pairKey(tag, e.war)] = true;
  }
  if (e.techs) for (const id of e.techs) grantTech(S, tag, id);
  if (e.rcat) { if (!C.rcat) C.rcat = {}; for (const k in e.rcat) C.rcat[k] = (C.rcat[k] || 0) + e.rcat[k]; }
  if (e.units) for (const t0 in e.units) { const t = bestUnitType(S, tag, t0); for (let i = 0; i < e.units[t0]; i++) spawnUnit(S, tag, t, deployRegion(S, tag, t), { auto: !C.ai && C.autoDeploy && UNITS[t].domain === 'land' }); }
  if (e.fort) addBorderForts(S, tag, e.fort);
  if (e.fortAt) for (const id of e.fortAt) { const r = WORLD.idx.get(id); if (r !== undefined && S.ctrl[r] === tag) S.fort[r] = Math.min(5, S.fort[r] + e.fortLvl); }
}
function removeIndustry(S, tag, n) {
  const regs = [];
  for (let r = 0; r < R; r++) if (S.own[r] === tag && S.ind[r] > 0) regs.push(r);
  regs.sort((a, b) => S.ind[b] - S.ind[a]);
  for (let i = 0; n > 0 && regs.length && i < 200; i++) { const r = regs[i % regs.length]; if (S.ind[r] > 0) { S.ind[r]--; n--; } }
}
export function addIndustry(S, tag, n) {
  const regs = [];
  for (let r = 0; r < R; r++) if (S.own[r] === tag && S.ctrl[r] === tag && S.core[r] === tag) regs.push(r);
  regs.sort((a, b) => (nodes[b].pop + S.ind[b]) - (nodes[a].pop + S.ind[a]));
  let i = 0, guard = 0;
  while (n > 0 && regs.length && guard++ < 200) {
    const r = regs[i % regs.length];
    if (S.ind[r] < regionIndCap(r)) { S.ind[r]++; n--; }
    i++;
  }
}
function addBorderForts(S, tag, n) {
  const border = [];
  for (let r = 0; r < R; r++) {
    if (S.own[r] !== tag) continue;
    if (nodes[r].landNb.some(m => S.own[m] && S.own[m] !== tag && !friendly(S, tag, S.own[m]))) border.push(r);
  }
  border.sort((a, b) => nodes[b].vp - nodes[a].vp);
  for (const r of border.slice(0, 6)) S.fort[r] = Math.min(5, S.fort[r] + n);
}
export function deployRegion(S, tag, t) {
  const C = S.C[tag];
  let r = C.deploy >= 0 && S.ctrl[C.deploy] === tag ? C.deploy : C.cap;
  if (S.ctrl[r] !== tag) {
    let best = -1, bv = -1;
    for (let i = 0; i < R; i++) if (S.ctrl[i] === tag && nodes[i].vp > bv) { bv = nodes[i].vp; best = i; }
    r = best;
  }
  if (r < 0) return undefined;
  if (UNITS[t].domain === 'sea') {
    if (nodes[r].coastal) return nodes[r].seaNb[0];
    let best = -1, bv = -1;
    for (let i = 0; i < R; i++) if (S.ctrl[i] === tag && nodes[i].coastal && S.ind[i] + nodes[i].vp > bv) { bv = S.ind[i] + nodes[i].vp; best = i; }
    return best >= 0 ? nodes[best].seaNb[0] : undefined;
  }
  return r;
}
export function canBuild(S, tag, type) {
  const C = S.C[tag];
  if (UNITS[type]) {
    const req = UNIT_REQ[type];
    if (req && !hasTech(C, req)) return `需要研究「${TECH_MAP[req].name}」`;
    if (UNITS[type].domain === 'sea' && deployRegion(S, tag, type) === undefined) return '沒有可用的港口';
    return null;
  }
  if (type === 'nuke') return hasFlag(C, 'nuke') ? null : '需要研究「原子彈」';
  if (type === 'factory' || type === 'fort') return null;
  return '未知項目';
}
export function itemCost(type, C) {
  if (UNITS[type]) return UNITS[type].cost;
  if (type === 'factory') return (BUILD.factory.cost + 28 * ((C && C.indTotal) || 0)) * (1 - Math.min(0.5, C ? techBonus(C).fcost + ((C.mods && C.mods.fcost) || 0) : 0));
  if (type === 'nuke' && C && hasFlag(C, 'mirv')) return BUILD.nuke.cost * 0.6;
  return BUILD[type].cost;
}

// 重新計算產能等顯示用數值（不推進時間）
export function recalc(S) {
  const nat = computeNational(S);
  for (const t in nat) {
    const C = S.C[t], n = nat[t];
    const law = LAWS.eco.levels[C.laws.eco].prod * LAWS.con.levels[C.laws.con].prod;
    C.indTotal = n.ind; C.vpOwned = n.vpOwned; C.vpHeld = n.vpHeld; C.popCore = n.popCore;
    C.ic = C.icBase = n.ind * law * (1 + techBonus(C).ic + (C.mods.icp || 0)) * (1 - (C.convoyLoss || 0)) * diffMod(S, t);
    C.upkeep = 0;
  }
  for (const u of S.units) { const C = S.C[u.c]; if (C && !u.dead) C.upkeep += upkeepOf(S, u); }
  for (const t in nat) S.C[t].icNet = Math.max(0, S.C[t].ic - S.C[t].upkeep);
}
function economy(S, nat) {
  const y = yearOf(S.day);
  // 工業產出
  for (const t in nat) {
    const C = S.C[t], n = nat[t];
    const law = LAWS.eco.levels[C.laws.eco].prod * LAWS.con.levels[C.laws.con].prod;
    C.indTotal = n.ind;
    C.icBase = n.ind * law * (1 + techBonus(C).ic + (C.mods.icp || 0)) * (1 - C.convoyLoss) * diffMod(S, t);
    C.ic = C.icBase;
    C.upkeep = 0;
  }
  for (const u of S.units) { if (u.dead) continue; const C = S.C[u.c]; if (C && C.upkeep !== undefined) C.upkeep += upkeepOf(S, u); }
  for (const k in S.lend) {
    const [a, b] = k.split('>');
    if (!alive(S, a) || !alive(S, b)) { delete S.lend[k]; continue; }
    const amt = S.C[a].icBase * S.lend[k];
    S.C[a].ic -= amt; S.C[b].ic += amt;
  }
  for (const t in nat) {
    const C = S.C[t], n = nat[t];
    C.vpOwned = n.vpOwned; C.vpHeld = n.vpHeld; C.popCore = n.popCore;
    // 政治點數
    C.pp = Math.min(999, C.pp + 1.1 + (WORLD.countries[t].major ? 0.5 : 0) + C.ppd);
    // 人力
    const rate = LAWS.con.levels[C.laws.con].man;
    C.man += (n.popCore * 1000 + n.popOther * 120) * rate / 365 * diffMod(S, t);
    // 生產
    produce(S, t, C);
    // 研究
    for (let i = 0; i < C.res.length; i++) {
      const s = C.res[i]; if (!s) continue;
      const T = TECH_MAP[s.id];
      if (!T || hasTech(C, s.id)) { C.res[i] = null; continue; }
      s.prog += researchSpeed(S, t, s.id);
      const cost = researchCost(S, t, s.id);
      if (s.prog >= cost) {
        grantTech(S, t, s.id);
        if (!C.ai) addNews(S, `研究完成：${T.name}`, 'tech', [t]);
        if (s.id === 'nuc1') { addNews(S, `${C.name}成功試爆原子彈，核子時代來臨。`, 'major', [t]); S.tension = clamp(S.tension + 5, 0, 100); }
        else if (T.e.unlock && !C.ai) addNews(S, `新兵種可以生產了：${UNITS[T.e.unlock].name}`, 'tech', [t]);
        C.res[i] = null;
      }
    }
    // 國策
    if (C.focus.cur) {
      const f = focusList(S, t).find(x => x.id === C.focus.cur);
      if (!f) C.focus.cur = null;
      else if (++C.focus.prog >= f.days) {
        C.focus.done.push(f.id); C.focus.cur = null; C.focus.prog = 0;
        applyFocus(S, t, f);
        if (!C.ai) addNews(S, `國策完成：${f.name}`, 'focus', [t]);
      }
    }
    // 法律檢查（失去戰爭狀態時降級）
    for (const law of ['con', 'eco']) {
      while (C.laws[law] > 0 && lawAllowed(S, t, law, C.laws[law]) && LAWS[law].levels[C.laws[law]].war) C.laws[law]--;
    }
  }
  void y;
}
function produce(S, t, C) {
  const lines = C.prod; if (!lines.length) return;
  let budget = Math.max(0, C.ic - (C.upkeep || 0));
  const share = budget / lines.length;
  C.icNet = budget;
  let leftover = 0;
  const need = lines.map(l => Math.max(0, itemCost(l.type, C) - l.prog));
  for (let i = 0; i < lines.length; i++) { const g = Math.min(share, need[i]); lines[i].prog += g; leftover += share - g; need[i] -= g; }
  for (let i = 0; i < lines.length && leftover > 0.01; i++) { const g = Math.min(leftover, need[i]); lines[i].prog += g; leftover -= g; }
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const cost = itemCost(l.type, C);
    if (l.prog < cost - 1e-6) continue;
    let done = false;
    if (UNITS[l.type]) {
      const man = UNITS[l.type].man;
      if (C.man < man) { l.wait = 1; continue; }
      const at = deployRegion(S, t, l.type);
      if (at === undefined) { l.n = 0; continue; }
      C.man -= man;
      spawnUnit(S, t, l.type, at, { auto: !C.ai && C.autoDeploy && UNITS[l.type].domain === 'land' });
      done = true;
    } else if (l.type === 'factory') {
      let r = l.tgt;
      if (r === undefined || r < 0 || S.own[r] !== t || S.ctrl[r] !== t || S.ind[r] >= regionIndCap(r)) {
        r = -1; let bv = -1;
        for (let i2 = 0; i2 < R; i2++) if (S.own[i2] === t && S.ctrl[i2] === t && S.core[i2] === t && S.ind[i2] < regionIndCap(i2)) {
          const v = nodes[i2].pop + 1 - S.ind[i2] * 0.5 + (i2 === C.cap ? 2 : 0); if (v > bv) { bv = v; r = i2; }
        }
      }
      if (r >= 0) { S.ind[r]++; done = true; } else l.n = 0;
    } else if (l.type === 'fort') {
      const r = l.tgt;
      if (r >= 0 && S.ctrl[r] === t && S.fort[r] < 5) { S.fort[r]++; done = true; } else l.n = 0;
    } else if (l.type === 'nuke') { C.nukes++; done = true; }
    if (done) { l.prog -= cost; l.wait = 0; if (l.n > 0) l.n--; }
  }
  C.prod = lines.filter(l => l.n !== 0);
}

// ============================================================ 補給與海權
function zonePowers(S) {
  const zp = new Map(); // zone → Map(tag → power)
  for (const u of S.units) {
    if (u.dead || !isNaval(u)) continue;
    let m = zp.get(u.n); if (!m) zp.set(u.n, m = new Map());
    m.set(u.c, (m.get(u.c) || 0) + navPower(S, u, false));
  }
  return zp;
}
export function seaBalance(S, tag, z, zp) {
  const m = zp.get(z); if (!m) return { f: 0, e: 0 };
  let f = 0, e = 0;
  for (const [t, p] of m) { if (allied(S, tag, t)) f += p; else if (atWar(S, tag, t)) e += p; }
  return { f, e };
}
function computeSupply(S, zp) {
  const need = new Set();
  for (const u of S.units) if (!u.dead && !isNaval(u)) need.add(u.c);
  const supplied = {};
  for (const t of need) {
    const C = S.C[t]; if (!C || !C.exists) continue;
    if (!atWarAny(S, t)) { supplied[t] = null; continue; }
    let src = C.cap;
    if (S.ctrl[src] !== t) {
      let bv = -1; src = -1;
      for (let r = 0; r < R; r++) if (S.ctrl[r] === t && nodes[r].vp > bv) { bv = nodes[r].vp; src = r; }
    }
    const ok = new Uint8Array(NN);
    if (src < 0) { supplied[t] = ok; continue; }
    const q = [src]; ok[src] = 1;
    // 盟國首都亦可作為補給來源
    for (const a of liveTags(S)) {
      if (a === t || !friendly(S, t, a)) continue;
      const cp = S.C[a].cap;
      if (cp >= 0 && S.ctrl[cp] === a && !ok[cp]) { ok[cp] = 1; q.push(cp); }
    }
    for (let h = 0; h < q.length; h++) {
      const n = q[h];
      for (const e of ADJ[n]) {
        const m = e.to; if (ok[m]) continue;
        if (m < R) {
          const c = S.ctrl[m];
          if (c === t || allied(S, t, c)) { ok[m] = 1; q.push(m); }
        } else {
          const b = seaBalance(S, t, m, zp);
          if (b.e > 2 * b.f + 5) continue;
          ok[m] = 1; q.push(m);
        }
      }
    }
    supplied[t] = ok;
  }
  for (const u of S.units) {
    if (u.dead || isNaval(u)) continue;
    const ok = supplied[u.c];
    u.sup = ok === null || ok === undefined ? 1 : (ok[u.n] ? 1 : 0);
  }
}

// ============================================================ 陸戰
function buildUnitIndex(S) {
  const at = new Map();
  for (const u of S.units) { if (u.dead) continue; let a = at.get(u.n); if (!a) at.set(u.n, a = []); a.push(u); }
  return at;
}
function hostileDefendersAt(S, r, tag, idx) {
  const list = idx.get(r); if (!list) return [];
  return list.filter(u => !u.dead && isLandUnit(u) && atWar(S, u.c, tag));
}
function collectBattles(S, idx) {
  const map = new Map();
  for (const u of S.units) {
    if (u.dead || !isLandUnit(u) || !u.path.length) continue;
    const t = u.path[0]; if (t >= R) continue;
    const c = S.ctrl[t];
    if (!atWar(S, u.c, c)) continue;
    const defs = hostileDefendersAt(S, t, u.c, idx);
    if (!defs.length) continue;
    if (u.org < 1 || u.hp < 5) { u.path = []; continue; }
    if (!map.has(t)) map.set(t, { r: t, att: [], def: defs, ac: u.c, dc: defs[0].c });
    map.get(t).att.push(u);
  }
  return [...map.values()];
}
function airPhase(S, battles) {
  const airUnits = S.units.filter(u => !u.dead && isAir(u) && u.n < R);
  for (const a of airUnits) { a._loss = 0; a._busy = false; }
  const isBomber = (a) => UNITS[a.t].cls === 'bmb';
  for (const b of battles) {
    let fa = 0, fd = 0, ba = 0, bd = 0;
    const inA = [], inD = [];
    for (const a of airUnits) {
      if (a.hp < 15) continue;
      if (rDist(a.n, b.r) > airRange(S, a)) continue;
      const sideA = allied(S, a.c, b.ac) && atWar(S, a.c, b.dc);
      const sideD = !sideA && allied(S, a.c, b.dc) && atWar(S, a.c, b.ac);
      if (!sideA && !sideD) continue;
      const p = airPower(S, a), bp = bombPower(S, a);
      if (sideA) { fa += p; ba += bp; inA.push(a); } else { fd += p; bd += bp; inD.push(a); }
      a._busy = true;
    }
    // 防空火力削弱敵機
    const aaA = Math.min(0.5, techBonus(S.C[b.ac]).aa), aaD = Math.min(0.5, techBonus(S.C[b.dc]).aa);
    fa *= 1 - aaD * 0.5; fd *= 1 - aaA * 0.5; ba *= 1 - aaD; bd *= 1 - aaA;
    const sup = fa + fd > 0 ? fa / (fa + fd) : 0.5;
    b.airA = fa + fd > 0 ? 0.88 + 0.27 * sup : 1;
    b.airD = fa + fd > 0 ? 0.88 + 0.27 * (1 - sup) : 1;
    b.bombA = ba * (0.35 + 0.65 * sup); b.bombD = bd * (0.35 + 0.65 * (1 - sup));
    b.sup = sup; b.fa = fa; b.fd = fd;
    const lossA = Math.min(4, 3 * fd / (fa + fd + 1)), lossD = Math.min(4, 3 * fa / (fa + fd + 1));
    for (const a of inA) a._loss = Math.max(a._loss, lossA * (isBomber(a) ? 1.3 : 1) + (isBomber(a) ? aaD * 1.5 : 0));
    for (const a of inD) a._loss = Math.max(a._loss, lossD * (isBomber(a) ? 1.3 : 1) + (isBomber(a) ? aaA * 1.5 : 0));
  }
  // 戰略轟炸（每 2 天）
  if (S.day % 2 === 0) {
    for (const a of airUnits) {
      if (a._busy || !UNITS[a.t].strat || a.hp < 30) continue;
      const en = enemySet(S, a.c); if (!en.size) continue;
      const rng = airRange(S, a);
      let best = -1, bv = 0;
      for (let r = 0; r < R; r++) {
        if (!en.has(S.ctrl[r]) || S.ind[r] < 1) continue;
        if (rDist(a.n, r) > rng) continue;
        const v = S.ind[r] * (1 - S.dmg[r]); if (v > bv) { bv = v; best = r; }
      }
      if (best < 0) continue;
      let fdef = 0; const icp = [];
      for (const f of airUnits) if (UNITS[f.t].cls === 'ftr' && atWar(S, f.c, a.c) && rDist(f.n, best) <= airRange(S, f)) { fdef += airPower(S, f); icp.push(f); }
      const aa = Math.min(0.5, techBonus(S.C[S.ctrl[best]] || null).aa);
      const pw = stratPower(S, a) * (1 - aa * 0.6);
      S.dmg[best] = Math.min(0.6, S.dmg[best] + 0.006 * pw / 10 * (fdef > 0 ? 0.5 : 1));
      a._busy = true;
      a._loss = Math.max(a._loss, Math.min(5, 4 * fdef / (fdef + pw + 5)) + aa * 1.5);
      for (const f of icp) f._loss = Math.max(f._loss, 0.5);
    }
  }
  navalAir(S, airUnits);
  for (const a of airUnits) {
    if (a._loss > 0) { a.hp -= a._loss; if (a.hp <= 0) { killUnit(S, a); S.C[a.c].stats.lost++; } }
    else if (a.hp < 100 && S.C[a.c].man > 1) { a.hp = Math.min(100, a.hp + 2); S.C[a.c].man -= UNITS[a.t].man * 0.02; }
  }
}
// 海軍航空：海軍轟炸機（陸基）與航艦艦載機攻擊航程內的敵艦
const SEA_D = new Map();
function landSeaDist(a, z) {
  const k = a * 4096 + z;
  let d = SEA_D.get(k);
  if (d === undefined) { d = gcDist(nodes[a].lon, nodes[a].lat, nodes[z].lon, nodes[z].lat); SEA_D.set(k, d); }
  return d;
}
function navalAir(S, airUnits) {
  const fleets = S.units.filter(u => !u.dead && isNaval(u) && u.n >= R);
  if (!fleets.length) return;
  const byZone = new Map();
  for (const f of fleets) { let a = byZone.get(f.n); if (!a) byZone.set(f.n, a = []); a.push(f); }
  const strikers = [];
  for (const a of airUnits) if (!a._busy && UNITS[a.t].naval && a.hp >= 30) strikers.push(a);
  for (const f of fleets) if (f.t === 'car' && f.hp >= 30) strikers.push(f);
  for (const a of strikers) {
    const en = enemySet(S, a.c); if (!en.size) continue;
    const carrier = a.n >= R;
    const rng = carrier ? 520 : airRange(S, a);
    let best = null, bv = 0;
    for (const [z, list] of byZone) {
      const tg = list.filter(f => en.has(f.c) && !f.dead);
      if (!tg.length) continue;
      const d = carrier ? (z === a.n ? 0 : gcDist(nodes[a.n].lon, nodes[a.n].lat, nodes[z].lon, nodes[z].lat)) : landSeaDist(a.n, z);
      if (d > rng) continue;
      const v = tg.reduce((s2, f) => s2 + UNITS[f.t].cost, 0) / (1 + d / 400);
      if (v > bv) { bv = v; best = { z, tg }; }
    }
    if (!best) continue;
    // 敵方空中掩護：該海域的敵航艦 + 航程內的敵戰鬥機
    let cover = 0;
    for (const f of best.tg) if (f.t === 'car') cover += 8 * f.hp / 100;
    for (const f of airUnits) if (UNITS[f.t].cls === 'ftr' && en.has(f.c) && landSeaDist(f.n, best.z) <= airRange(S, f)) cover += airPower(S, f) * 0.5;
    const target = best.tg.slice().sort((x, y) => UNITS[y.t].cost - UNITS[x.t].cost)[0];
    let dmg = navalStrike(S, a) * 0.35 * (0.7 + 0.6 * rand(S)) * 10 / (10 + cover);
    if (target.t === 'sub') dmg *= 0.5;
    target.hp -= dmg;
    if (target.hp <= 0) { killUnit(S, target); S.C[target.c].stats.lost++; S.C[a.c].stats.kills++; addNews(S, `${cname(S, a.c)}的${carrier ? '艦載機' : '海軍航空隊'}擊沉了${cname(S, target.c)}的${UNITS[target.t].name}。`, 'info', [a.c, target.c]); }
    else if (target.hp < 25 && !target.path.length) relocateUnit(S, target);
    if (!carrier) { a._busy = true; a._loss = Math.max(a._loss, Math.min(5, 1 + cover * 0.12)); }
  }
}
function retreatUnit(S, u, from, battlesTargets) {
  const cands = [];
  for (const m of nodes[from].landNb) {
    const c = S.ctrl[m];
    if (!(c === u.c || allied(S, u.c, c))) continue;
    let score = 0;
    if (battlesTargets.has(m)) score -= 5;
    if (c === u.c) score += 1;
    score += rand(S);
    cands.push([score, m]);
  }
  for (const e of ADJ[from]) if (e.t === 1 && e.to < R) {
    const c = S.ctrl[e.to]; if (c === u.c || allied(S, u.c, c)) cands.push([-3 + rand(S), e.to]);
  }
  if (!cands.length) return false;
  cands.sort((a, b) => b[0] - a[0]);
  u.n = cands[0][1]; u.path = []; u.prog = 0; u.ent = 0; u.org = 0;
  u.hp = Math.max(1, u.hp - 4);
  return true;
}
function landCombat(S, battles) {
  const targets = new Set(battles.map(b => b.r));
  S.battles = [];
  for (const b of battles) {
    const r = b.r, terr = nodes[r].terrain, Tm = TERRAIN[terr];
    const width = Tm.width;
    const atts = b.att.filter(u => !u.dead), defs = b.def.filter(u => !u.dead);
    if (!atts.length || !defs.length) continue;
    const attScore = atts.map(u => {
      let a = unitAttack(S, u, terr) * unitEff(S, u) * b.airA;
      if (u.n >= R) a *= UNITS[u.t].amph ? 0.85 : 0.45 + Math.min(0.3, techBonus(S.C[u.c]).amph * 0.6);
      else { const e = edgeOf(u.n, r); if (e && e.t === 1) a *= UNITS[u.t].amph ? 0.9 : 0.7 + Math.min(0.15, techBonus(S.C[u.c]).amph * 0.3); }
      return [a, u];
    }).sort((x, y) => y[0] - x[0]);
    const defScore = defs.map(u => [unitDefense(S, u) * unitEff(S, u) * Tm.def * (1 + 0.2 * S.fort[r]) * (1 + Math.min(0.2, u.ent * 0.01)) * b.airD, u]).sort((x, y) => y[0] - x[0]);
    const aFront = attScore.slice(0, width), dFront = defScore.slice(0, width);
    const A = aFront.reduce((s, x) => s + x[0], 0) * (0.85 + 0.3 * rand(S));
    const D = dFront.reduce((s, x) => s + x[0], 0) * (0.85 + 0.3 * rand(S));
    const ratio = A / Math.max(1, D);
    const rp = Math.pow(ratio, 0.9);
    const orgDef = Math.min(30, 7 * rp), hpDef = Math.min(10, 1.5 * rp);
    const orgAtt = Math.min(30, 6 / rp), hpAtt = Math.min(10, 1.3 / rp);
    const bombOnDef = b.bombA * 0.08 / dFront.length, bombOnAtt = b.bombD * 0.08 / aFront.length;
    for (const [, u] of dFront) {
      u.org -= orgDef * (0.8 + 0.4 * rand(S));
      const loss = hpDef * (0.8 + 0.4 * rand(S)) + bombOnDef;
      u.hp -= loss; S.C[u.c].man -= 0; // 損失記錄
    }
    for (const [, u] of aFront) {
      u.org -= orgAtt * (0.8 + 0.4 * rand(S));
      u.hp -= hpAtt * (0.8 + 0.4 * rand(S)) + bombOnAtt;
    }
    let defLeft = 0;
    for (const [, u] of defScore) {
      if (u.hp <= 0) { killUnit(S, u); S.C[u.c].stats.lost++; S.C[b.ac].stats.kills++; continue; }
      if (u.org <= 0) {
        if (!retreatUnit(S, u, r, targets)) {
          killUnit(S, u); S.C[u.c].stats.lost++; S.C[b.ac].stats.kills++;
          if (!S._encircled) S._encircled = 0; S._encircled++;
        }
        continue;
      }
      defLeft++;
    }
    for (const [, u] of attScore) {
      if (u.hp <= 0) { killUnit(S, u); S.C[u.c].stats.lost++; S.C[b.dc].stats.kills++; continue; }
      if (u.org <= 1) { u.path = []; u.org = Math.max(0, u.org); }
      if (u.n >= R && u.org <= 1) { relocateUnit(S, u); }
    }
    if (!defLeft) {
      // 突破：進攻方推進
      for (const [, u] of attScore) if (!u.dead && u.path.length && u.path[0] === r) u.prog = Math.max(u.prog, edgeDist(u.n, r) * 0.5);
    }
    let dOrg = 0, dMax = 0;
    for (const [, u] of defScore) if (!u.dead) { dOrg += u.org; dMax += maxOrg(S, u); }
    S.battles.push({ r, from: [...new Set(atts.map(u => u.n))], ac: b.ac, dc: b.dc, ratio: Math.round(ratio * 100) / 100, prog: dMax ? 1 - dOrg / dMax : 1, na: atts.length, nd: defs.length, sup: b.sup ?? 0.5, amph: atts.some(u => u.n >= R) });
  }
}

// ============================================================ 移動
function movement(S, idx) {
  for (const u of S.units) {
    if (u.dead || !u.path.length || isAir(u)) continue;
    const next = u.path[0];
    const land = isLandUnit(u);
    if (land && next < R) {
      const c = S.ctrl[next];
      if (!canEnter(S, u.c, c)) { u.path = []; u.prog = 0; continue; }
      if (atWar(S, u.c, c) && hostileDefendersAt(S, next, u.c, idx).length) continue; // 戰鬥中
    }
    if (!land && next < R) { u.path = []; continue; }
    const sp = unitSpeed(S, u, next);
    u.prog += sp;
    u.ent = 0;
    const d = edgeDist(u.n, next);
    if (d >= 9999) { u.path = []; u.prog = 0; continue; }
    if (u.prog >= d) {
      // 抵達
      if (land && next < R) {
        const c = S.ctrl[next];
        if (atWar(S, u.c, c)) {
          if (hostileDefendersAt(S, next, u.c, idx).length) { u.prog = d - 1; continue; }
          captureRegion(S, next, u.c);
        }
      }
      const old = u.n;
      u.n = next; u.path.shift(); u.prog = 0;
      // 更新索引
      const la = idx.get(old); if (la) { const k = la.indexOf(u); if (k >= 0) la.splice(k, 1); }
      let lb = idx.get(next); if (!lb) idx.set(next, lb = []); lb.push(u);
    }
  }
}

// ============================================================ 海戰與破交
function navalPhase(S, idx, zp) {
  S.navBattles = [];
  for (const [z, units] of idx) {
    if (z < R) continue;
    const navs = units.filter(u => !u.dead && isNaval(u));
    const transports = units.filter(u => !u.dead && isLandUnit(u));
    if (!navs.length && !transports.length) continue;
    // 決定敵對雙方
    const owners = [...new Set(units.filter(u => !u.dead && !isAir(u)).map(u => u.c))];
    if (owners.length < 2) continue;
    let A = null, B = null;
    outer: for (const a of owners) for (const b of owners) if (atWar(S, a, b)) { A = a; B = b; break outer; }
    if (!A) continue;
    const sideA = navs.filter(u => allied(S, u.c, A) && atWar(S, u.c, B));
    const sideB = navs.filter(u => allied(S, u.c, B) && atWar(S, u.c, A));
    const pa = sideA.reduce((s, u) => s + navPower(S, u, false), 0), pb = sideB.reduce((s, u) => s + navPower(S, u, false), 0);
    const da = sideA.reduce((s, u) => s + navPower(S, u, true), 0) + 1, db = sideB.reduce((s, u) => s + navPower(S, u, true), 0) + 1;
    if (sideA.length && sideB.length) {
      const hitB = Math.min(25, 5 * Math.pow(pa / db, 0.8)), hitA = Math.min(25, 5 * Math.pow(pb / da, 0.8));
      for (const u of sideB) u.hp -= hitB * (0.7 + 0.6 * rand(S)) * (u.t === 'sub' ? 0.8 : 1);
      for (const u of sideA) u.hp -= hitA * (0.7 + 0.6 * rand(S)) * (u.t === 'sub' ? 0.8 : 1);
      S.navBattles.push({ z, a: A, b: B, pa: Math.round(pa), pb: Math.round(pb) });
      for (const u of [...sideA, ...sideB]) {
        if (u.hp <= 0) { killUnit(S, u); S.C[u.c].stats.lost++; continue; }
        if (u.hp < 25) { u.path = []; relocateUnit(S, u); }
      }
    }
    // 運兵船遭攻擊
    for (const u of transports) {
      const own = allied(S, u.c, A) && !atWar(S, u.c, A) ? pa : pb;
      const enemy = allied(S, u.c, A) && !atWar(S, u.c, A) ? pb : pa;
      if (enemy > own) { u.hp -= 6 * (0.5 + rand(S)); u.org -= 8; if (u.hp <= 0) { killUnit(S, u); S.C[u.c].stats.lost++; } }
    }
  }
  // 破交戰：潛艇降低敵國生產
  const raid = {};
  for (const u of S.units) {
    if (u.dead || u.t !== 'sub' || u.n < R) continue;
    const en = enemySet(S, u.c); if (!en.size) continue;
    const p = navPower(S, u, false) * (1 + S.C[u.c].mods.raid);
    const hitTags = new Set();
    for (const l of nodes[u.n].landNb) { const c = S.ctrl[l]; if (en.has(c)) hitTags.add(c); }
    for (const t of hitTags) raid[t] = (raid[t] || 0) + p;
  }
  for (const t in S.C) {
    const C = S.C[t]; if (!C.exists) continue;
    const rp = raid[t] || 0;
    C.convoyLoss = rp > 0 ? Math.min(0.3, rp / (rp + (C.indTotal || 1) * 4 + 20)) * (1 - Math.min(0.7, techBonus(C).escort + (C.mods.escort || 0))) : 0;
  }
  // 艦隊修理
  for (const u of S.units) {
    if (u.dead || !isNaval(u) || u.hp >= 100) continue;
    if (nodes[u.n].landNb.some(l => S.ctrl[l] === u.c || friendly(S, u.c, S.ctrl[l]))) { u.hp = Math.min(100, u.hp + 1.5); }
  }
  void zp;
}

// ============================================================ 恢復與消耗
function recovery(S, battleUnits) {
  for (const u of S.units) {
    if (u.dead || !isLandUnit(u)) continue;
    if (battleUnits.has(u)) continue;
    const C = S.C[u.c];
    const mo = maxOrg(S, u);
    if (u.n >= R) { u.org = Math.max(0, u.org - 0.5); continue; }
    if (u.sup) {
      u.org = Math.min(mo, u.org + 4);
      if (u.hp < 100) {
        const gain = Math.min(3, 100 - u.hp), cost = UNITS[u.t].man * gain / 100 * (1 - Math.min(0.5, techBonus(C).medic));
        if (C.man >= cost) { u.hp += gain; C.man -= cost; }
      }
    } else {
      u.org = Math.min(mo, u.org + 1);
      if (atWarAny(S, u.c)) { u.hp -= 0.8; if (u.hp <= 0) { killUnit(S, u); C.stats.lost++; } }
    }
    if (!u.path.length) u.ent = Math.min(20, u.ent + 1);
  }
}

// ============================================================ 投降檢查
function surrenderCheck(S, nat) {
  for (const t in nat) {
    const C = S.C[t]; if (!C.exists || !atWarAny(S, t)) continue;
    const n = nat[t];
    if (n.vpOwned <= 0) { capitulate(S, t); continue; }
    const th = WORLD.countries[t].cap * (C.laws.con >= 3 ? 0.85 : 1) * (C.capMod || 1);
    C.surrender = 1 - n.vpHeld / n.vpOwned;
    if (n.vpHeld / n.vpOwned < th) capitulate(S, t);
  }
}

// ============================================================ 主迴圈
export function tick(S) {
  if (S.over) return;
  S.day++;
  if (HOOKS.events) HOOKS.events(S);
  let nat = computeNational(S);
  economy(S, nat);
  if (HOOKS.ai) HOOKS.ai(S);
  S.units = S.units.filter(u => !u.dead);
  const zp = zonePowers(S);
  computeSupply(S, zp);
  let idx = buildUnitIndex(S);
  const battles = collectBattles(S, idx);
  airPhase(S, battles);
  landCombat(S, battles);
  const inBattle = new Set();
  for (const b of battles) { for (const u of b.att) inBattle.add(u); for (const u of b.def) inBattle.add(u); }
  S.units = S.units.filter(u => !u.dead);
  idx = buildUnitIndex(S);
  movement(S, idx);
  navalPhase(S, idx, zp);
  recovery(S, inBattle);
  for (let r = 0; r < R; r++) if (S.dmg[r] > 0) S.dmg[r] = Math.max(0, S.dmg[r] - 0.003);
  S.units = S.units.filter(u => !u.dead);
  nat = computeNational(S);
  surrenderCheck(S, nat);
  if (S.day % 7 === 0) S.tension = Math.max(0, S.tension - (atWarCount(S) ? 0.02 : 0.15));
  if (S.temp && S.temp.length) {
    for (const m of S.temp) if (m.until <= S.day && S.C[m.tag]) S.C[m.tag].mods[m.key] -= m.val;
    S.temp = S.temp.filter(m => m.until > S.day);
  }
  if (S.day >= S.endDay) endGame(S, '時間到：冷戰落幕');
}
function atWarCount(S) { return Object.keys(S.wars).length; }
export function endGame(S, reason) {
  if (S.over) return;
  S.over = { reason, day: S.day, scores: scores(S) };
  addNews(S, `遊戲結束：${reason}`, 'major');
}
export function scores(S) {
  const sc = {};
  for (let r = 0; r < R; r++) { const c = S.ctrl[r]; if (c && S.C[c] && S.C[c].exists) sc[c] = (sc[c] || 0) + nodes[r].vp; }
  for (const t in sc) sc[t] = Math.round(sc[t] + (S.C[t].indTotal || 0) * 2);
  return sc;
}

// ============================================================ 核武
export function nukeStrike(S, tag, r, opts = {}) {
  const C = S.C[tag];
  if (!opts.free) { if (C.nukes < 1) return '沒有核子武器'; C.nukes--; }
  const tgt = S.ctrl[r];
  for (const u of S.units) if (u.n === r && !u.dead && (isLandUnit(u) || isAir(u))) { u.hp -= 70; u.org = 0; if (u.hp <= 0) { killUnit(S, u); } }
  S.ind[r] = Math.max(0, Math.floor(S.ind[r] * 0.4));
  S.dmg[r] = 0.6;
  S.tension = clamp(S.tension + 15, 0, 100);
  addNews(S, `☢ ${C.name}對${rname(S, r)}使用了核子武器，城市化為焦土，數十萬平民傷亡。`, 'nuke', [tag, tgt]);
  // 報復：對方若擁有核武則自動回擊
  if (!opts.noRetaliate && tgt && S.C[tgt] && S.C[tgt].nukes > 0) {
    const targets = [];
    for (let i = 0; i < R; i++) if (S.ctrl[i] === tag) targets.push(i);
    targets.sort((a, b) => (nodes[b].vp + S.ind[b]) - (nodes[a].vp + S.ind[a]));
    const n = Math.min(S.C[tgt].nukes, 3);
    for (let k = 0; k < n && k < targets.length; k++) { S.C[tgt].nukes--; nukeStrike(S, tgt, targets[k], { free: true, noRetaliate: true }); }
    if (n > 0) addNews(S, `☢ ${cname(S, tgt)}發動核子報復！相互保證毀滅的陰影籠罩世界。`, 'nuke', [tgt, tag]);
  }
  // 對方首都遭核擊時投降門檻降低
  if (tgt && S.C[tgt]) S.C[tgt].capMod = (S.C[tgt].capMod || 1) * 1.15;
  return null;
}
export { capitulate, captureRegion, computeNational };
