// 電腦 AI：經濟、研究、國策、法律、前線作戰、兩棲登陸、艦隊、空軍、外交
import { WORLD, rDist } from './world.js';
import { UNITS, TERRAIN, TECHS, LAWS } from '../data/rules.js';
import {
  liveTags, alive, atWar, atWarAny, enemySet, friendly, allied, isLandUnit, isAir, isNaval, orderMove, findPath,
  unitAttack, unitDefense, unitEff, deployRegion, canBuild, canResearch, researchCost, focusList, focusAvailable,
  lawAllowed, multiDijkstra, seaBalance, navPower, airRange, HOOKS, regionIndCap, declareWar, makePeace, addNews, cname,
  hasFlag, hasTech,
} from './engine.js';
import { aiAcceptPeace, expirePrompts } from './commands.js';
import { dynamicWars } from './worldevents.js';
import { rand, yearOf } from './util.js';

const R = WORLD.R, NN = WORLD.N, nodes = WORLD.nodes, ADJ = WORLD.adj;
const hashTag = (t) => (t.charCodeAt(0) * 7 + t.charCodeAt(1) * 3 + t.charCodeAt(2)) % 997;

export function aiTick(S) {
  const tags = liveTags(S);
  let idx = null;
  const getIdx = () => {
    if (!idx) { idx = new Map(); for (const u of S.units) { if (u.dead) continue; let a = idx.get(u.n); if (!a) idx.set(u.n, a = []); a.push(u); } }
    return idx;
  };
  for (const t of tags) {
    const C = S.C[t]; if (!C.exists) continue;
    const off = hashTag(t);
    const war = atWarAny(S, t);
    if ((C.ai || C.autoProd) && (S.day + off) % 10 === 0) aiEconomy(S, t);
    if (C.ai && (S.day + off) % 7 === 0) aiPolitics(S, t);
    if (!C.ai && (S.day + off) % 7 === 0) { if (C.autoResearch) aiResearch(S, t); if (C.autoFocus) aiFocus(S, t); }
    const per = war ? 2 : 15;
    if ((S.day + off) % per === 0) {
      const mode = C.ai || C.autoArmy ? 'all' : 'auto';
      if (mode === 'all' || S.units.some(u => u.c === t && u.auto)) { aiMilitary(S, t, mode, getIdx()); idx = null; }
    }
    if ((C.ai || C.autoArmy) && (S.day + off) % 5 === 0) { aiNavy(S, t); aiAir(S, t); }
    if (C.ai && (S.day + off) % 30 === 0) aiDiplomacy(S, t);
  }
  dynamicWars(S);
  expirePrompts(S);
}

// ============================================================ 經濟
function aiEconomy(S, t) {
  const C = S.C[t];
  const war = atWarAny(S, t);
  const ic = C.ic || 0;
  let land = 0, tanks = 0, ftrs = 0, bmbs = 0, nav = 0, cars = 0;
  for (const u of S.units) if (u.c === t && !u.dead) {
    const T = UNITS[u.t];
    if (T.domain === 'land') { land++; if (T.armor) tanks++; }
    else if (T.domain === 'air') { if (T.cls === 'ftr') ftrs++; else bmbs++; }
    else { nav++; if (u.t === 'car') cars++; }
  }
  const y = yearOf(S.day);
  const bestOf = (list) => { for (const x of list) if (!canBuild(S, t, x)) return x; return null; };
  const major = WORLD.countries[t].major;
  const navyPref = WORLD.countries[t].navy;
  const coastal = deployRegion(S, t, 'flt') !== undefined;
  const want = [];
  let factoriesFree = false;
  for (let r = 0; r < R; r++) if (S.own[r] === t && S.ctrl[r] === t && S.core[r] === t && S.ind[r] < regionIndCap(r)) { factoriesFree = true; break; }
  const aggr = C.ideo === 'fas' || C.ideo === 'com' ? 2 : 1;
  let nRegions = 0; for (let r = 0; r < R; r++) if (S.own[r] === t) nRegions++;
  // 和平時期的陸軍上限（工業很大時也不會無限擴軍）
  const peaceCap = Math.min(Math.max(3 + nRegions * 0.8, 3 + ic * 0.22 * aggr) + (S.tension > 50 ? ic * 0.15 * aggr : 0), 20 + nRegions * 1.6);
  // 和平時期裁軍：超出上限太多時解散最弱的部隊（開局一年內不裁軍）
  if (!war && land > peaceCap * 1.4 && C.ai && S.day > (S.startDay || 0) + 365) {
    const mine = S.units.filter(u => u.c === t && !u.dead && isLandUnit(u) && !u.path.length).sort((a, b) => a.hp - b.hp);
    for (const u of mine.slice(0, Math.min(3, Math.ceil(land - peaceCap * 1.4)))) { u.dead = true; C.man += UNITS[u.t].man * 0.5; }
  }
  const upkeepHeavy = (C.upkeep || 0) > ic * 0.75;
  const threatened = (C.surrender || 0) > 0.1;
  if (!war && factoriesFree && ic > 2 && (S.tension < 45 || land > peaceCap * 0.7)) want.push(['factory', 1]);
  if (war && factoriesFree && ic > 40 && !threatened && rand(S) < 0.4) want.push(['factory', 1]);
  const manOk = C.man > 30;
  // 戰時的陸軍上限：二戰期間與本土遭入侵時不設限；冷戰時期的戰爭則有上限（避免部隊數量爆炸）
  const warCap = y < 1950 || (C.surrender || 0) > 0.05 ? Infinity : peaceCap * 1.7;
  if (manOk && land < (war ? warCap : peaceCap) && !upkeepHeavy) {
    want.push(['inf', war ? 3 : 2]);
    const tank = bestOf(['mbt', 'arm', 'ltk']);
    if (tank && ic >= 10 && tanks < land * (major ? 0.4 : 0.22) + 1) {
      // 二戰中後期的強權偶爾生產重型坦克
      const heavy = major && war && ic >= 40 && tank === 'arm' && !canBuild(S, t, 'htk') && rand(S) < 0.3;
      want.push([heavy ? 'htk' : tank, war ? 2 : 1]);
    }
    if (ic >= 25 && !canBuild(S, t, 'mec') && rand(S) < 0.5) want.push(['mec', 1]);
  }
  const fighter = bestOf(['jet', 'ftr']);
  if (ic >= 7 && fighter && ftrs < Math.max(2, land * 0.2)) want.push([fighter, 1]);
  if (ic >= 15 && bmbs < Math.max(1, ftrs * 0.7)) {
    const opts = [];
    if (!canBuild(S, t, 'cas')) opts.push('cas');
    if (!canBuild(S, t, 'bmb')) opts.push('bmb');
    if (y >= 1965 && !canBuild(S, t, 'hel')) opts.push('hel');
    if (major && ic >= 60 && !canBuild(S, t, 'str')) opts.push('str', 'str');
    if (navyPref && coastal && !canBuild(S, t, 'nvb')) opts.push('nvb');
    if (opts.length) want.push([opts[Math.floor(rand(S) * opts.length)], 1]);
  }
  if (coastal && ic >= 14 && (navyPref || (major && nav < 3)) && nav < Math.max(2, land * (navyPref ? 0.3 : 0.1))) {
    let ship = navyPref ? 'flt' : 'sub';
    if (navyPref && !canBuild(S, t, 'car') && cars < nav * 0.4 + 1) ship = 'car';
    want.push([ship, 1]);
  }
  if (coastal && navyPref && ic >= 20 && war && nav < land * 0.5) want.push(['sub', 1]);
  if (war && manOk && (t === 'USA' || t === 'JAP' || t === 'ENG') && rand(S) < 0.5) want.push(['mar', 1]);
  if (hasFlag(C, 'nuke') && ic >= 50 && C.nukes < (S.tension > 60 ? 12 : 5) && rand(S) < 0.3) want.push(['nuke', 1]);
  const maxLines = Math.min(6, 2 + Math.floor(ic / 18));
  const lines = [];
  for (const [type, weight] of want) {
    if (lines.length >= maxLines) break;
    if (canBuild(S, t, type)) continue;
    for (let i = 0; i < weight && lines.length < maxLines; i++) {
      const ex = C.prod.find(l => l.type === type && !lines.includes(l));
      lines.push(ex || { type, n: -1, prog: 0, tgt: -1 });
    }
  }
  // 保留玩家/事件指定的建築
  for (const l of C.prod) if (l.tgt >= 0 && !lines.includes(l) && lines.length < 8) lines.push(l);
  // 沒有需要生產的項目時清空生產線（避免舊的無限生產線一直生產下去）
  C.prod = lines;
}

// ============================================================ 研究 / 國策 / 法律
// 依史實模式下 AI 開始研發原子彈的年份（研究約需一年）
const NUKE_YEAR = { USA: 1944, SOV: 1948, ENG: 1951, FRA: 1959, PRC: 1963, RAJ: 1973, IND: 1973, ISR: 1966, PAK: 1987 };
function aiResearch(S, t) {
  const C = S.C[t];
  const major = WORLD.countries[t].major;
  const navy = WORLD.countries[t].navy;
  const y = yearOf(S.day);
  const CW = { ind: y < 1946 ? 1.4 : 1.1, inf: 1.0, arm: major ? 1.0 : 0.55, air: 0.9, nav: navy ? 1.0 : (major ? 0.45 : 0.12), sci: 0.8, doc: 0.85 };
  for (let i = 0; i < C.res.length; i++) {
    if (C.res[i]) continue;
    let best = null, bs = -1;
    for (const T of TECHS) {
      if (canResearch(S, t, T.id)) continue;
      if (T.id === 'nuc1' && S.set.hist && y < (NUKE_YEAR[t] || 1970)) continue;
      let w = CW[T.cat];
      if (T.special) w = major ? (y >= 1942 ? 2.2 : 0.3) : (y >= 1960 && (C.indTotal || 0) > 120 ? 0.6 : 0.05);
      else if (T.cat === 'air' && T.lane === 4 && !major) w *= 0.3;
      else if (T.cat === 'air' && T.lane === 5 && !navy) w *= 0.3;
      else if (T.cat === 'arm' && T.lane === 2 && !major) w *= 0.4;
      if (T.e.unlock) w *= 1.3;
      const sc = w / researchCost(S, t, T.id) * (0.8 + 0.4 * rand(S));
      if (sc > bs) { bs = sc; best = T.id; }
    }
    if (best) C.res[i] = { id: best, prog: 0 };
  }
}
function aiFocus(S, t) {
  const C = S.C[t];
  if (C.focus.cur) return;
  const list = focusList(S, t);
  let avail = list.filter(f => !focusAvailable(S, t, f));
  // 歷史模式：AI 不走架空路線、不以國策主動開戰
  if (S.set.hist) avail = avail.filter(f => !f.alt && !f.eff.war && !f.eff.joinFac && !f.eff.ideo);
  if (!avail.length) return;
  const hist = avail.filter(f => f.hist);
  const pool = hist.length ? hist : avail;
  const f = pool[Math.floor(rand(S) * Math.min(2, pool.length))];
  C.focus.cur = f.id; C.focus.prog = 0;
}
function aiPolitics(S, t) {
  const C = S.C[t];
  aiResearch(S, t);
  aiFocus(S, t);
  for (const law of ['eco', 'con']) {
    const max = LAWS[law].levels.length;
    for (let lvl = max - 1; lvl > C.laws[law]; lvl--) {
      if (lawAllowed(S, t, law, lvl)) continue;
      if (law === 'con' && lvl >= 3 && (C.surrender || 0) < 0.15) continue;
      if (C.pp >= 100) { C.pp -= 80; C.laws[law] = lvl; }
      break;
    }
  }
}

// ============================================================ 軍事
function defenseAt(S, r, tag, idx) {
  const list = idx.get(r); if (!list) return 0;
  const T = TERRAIN[nodes[r].terrain];
  let d = 0;
  for (const u of list) if (!u.dead && isLandUnit(u) && atWar(S, u.c, tag)) d += unitDefense(S, u) * unitEff(S, u);
  return d * T.def * (1 + 0.15 * S.fort[r]);
}
function hostileAttackNear(S, r, tag, idx) {
  let a = 0;
  for (const m of nodes[r].landNb) {
    const list = idx.get(m); if (!list) continue;
    for (const u of list) if (!u.dead && isLandUnit(u) && atWar(S, u.c, tag)) a += unitAttack(S, u, nodes[r].terrain) * unitEff(S, u);
  }
  return a;
}
// 歷史模式下的作戰姿態：民主國家（1942 前）與中國（1944 前）只收復失地、不主動入侵
export function posture(S, t) {
  const C = S.C[t];
  if (!S.set.hist || !C.ai) return 'normal';
  const y = yearOf(S.day);
  if ((t === 'CHI' || t === 'PRC') && y < 1944) return 'defensive';
  if (C.ideo === 'dem' && y < 1942 && WORLD.countries[t].major) return 'defensive';
  if (!WORLD.countries[t].major) {
    for (const e of enemySet(S, t)) if (WORLD.countries[e] && WORLD.countries[e].major && (S.C[e].ic || 0) > (C.ic || 0)) return 'defensive';
  }
  return 'normal';
}
// 目標是否允許攻擊：有限戰爭只打爭議地區；防禦姿態只收復失地
function isRecapture(S, t, e) {
  const o = S.own[e], c = S.core[e];
  return o === t || c === t || (o && friendly(S, t, o)) || (c && alive(S, c) && friendly(S, t, c));
}
function targetAllowed(S, t, e, post) {
  const ec = S.ctrl[e];
  const k = t < ec ? t + '|' + ec : ec + '|' + t;
  const lim = S.lim && S.lim[k];
  // 對真人玩家：AI 不受有限戰爭與防守姿態的限制，會全力進攻
  const vsHuman = S.set.aiVsHuman !== false && S.C[ec] && !S.C[ec].ai;
  if (lim && !vsHuman) return (lim[t] || []).includes(e) || (!(lim.nr && lim.nr.includes(t)) && isRecapture(S, t, e));
  if (post === 'defensive' && !isRecapture(S, t, e) && !vsHuman) return false;
  if (S.noAttack && S.noAttack[t] && S.noAttack[t].includes(S.own[e])) return false;
  return true;
}
function aiMilitary(S, t, mode, idx) {
  const C = S.C[t];
  const post = posture(S, t);
  const mine = S.units.filter(u => u.c === t && !u.dead && isLandUnit(u) && (mode === 'all' || u.auto));
  if (!mine.length) return;
  const enemies = enemySet(S, t);
  if (!enemies.size) { if ((S.day + hashTag(t)) % 15 === 0) peaceDeploy(S, t, mine, idx); return; }

  // ---------- 前線
  const front = new Map();
  const myUnitsAt = new Map();
  for (const u of mine) { if (u.n < R) { let a = myUnitsAt.get(u.n); if (!a) myUnitsAt.set(u.n, a = []); a.push(u); } }
  for (let r = 0; r < R; r++) {
    const c = S.ctrl[r];
    if (!(c === t || allied(S, t, c))) continue;
    let adjE = null;
    for (const e of ADJ[r]) { if (e.to >= R) continue; if (enemies.has(S.ctrl[e.to])) (adjE || (adjE = [])).push(e.to); }
    if (!adjE) continue;
    if (c !== t && !myUnitsAt.has(r)) {
      // 盟國前線：僅在鄰近本國領土時協防
      let near = false;
      for (const m of nodes[r].landNb) if (S.ctrl[m] === t) { near = true; break; }
      if (!near) continue;
    }
    front.set(r, { adjE, threat: hostileAttackNear(S, r, t, idx), own: c === t });
  }

  // ---------- 取消無望的進攻
  const attackers = new Map();
  for (const u of mine) {
    if (!u.path.length) continue;
    const tg = u.path[0];
    if (tg < R && enemies.has(S.ctrl[tg]) && (idx.get(tg) || []).some(x => !x.dead && isLandUnit(x) && atWar(S, x.c, t))) {
      let a = attackers.get(tg); if (!a) attackers.set(tg, a = []); a.push(u);
    }
  }
  for (const [tg, us] of attackers) {
    const D = defenseAt(S, tg, t, idx);
    const A = us.reduce((s, u) => s + unitAttack(S, u, nodes[tg].terrain) * unitEff(S, u), 0);
    if (A < D * 0.65 || us.every(u => u.org < 10)) for (const u of us) { u.path = []; u.prog = 0; }
  }

  const idle = mine.filter(u => !u.path.length && u.n < R && u.org > 8);
  const idleAt = new Map();
  for (const u of idle) { let a = idleAt.get(u.n); if (!a) idleAt.set(u.n, a = []); a.push(u); }
  const used = new Set();

  // ---------- 進攻：每個敵方目標統計可用兵力
  const ecap = new Map();
  for (const e of enemies) { const K = S.C[e]; if (K) ecap.set(e, K.cap); }
  const targets = new Map();
  for (const [f, info] of front) {
    if (!idleAt.has(f)) continue;
    for (const e of info.adjE) {
      if (!targetAllowed(S, t, e, post)) continue;
      let T = targets.get(e); if (!T) targets.set(e, T = { r: e, from: [] });
      T.from.push(f);
    }
  }
  const tlist = [...targets.values()].map(T => {
    const D = defenseAt(S, T.r, t, idx);
    const ec = S.ctrl[T.r];
    const capR = ecap.get(ec);
    const dcap = capR !== undefined ? rDist(T.r, capR) : 3000;
    const vsHuman = S.C[ec] && !S.C[ec].ai ? 1.4 : 1; // 優先攻擊真人玩家
    const score = (nodes[T.r].vp + 1.5 + S.ind[T.r] * 0.5) * (D < 1 ? 3 : 1) / (D + 8) * (1 + 1000 / (dcap + 500)) * (0.85 + 0.3 * rand(S)) * vsHuman;
    return { ...T, D, score };
  }).sort((a, b) => b.score - a.score);
  const keepAt = new Map();
  for (const [f, info] of front) {
    const need = info.threat > 0 ? Math.min(3, Math.ceil(info.threat / 22)) : 0;
    keepAt.set(f, need);
  }
  for (const T of tlist) {
    const pool = [];
    for (const f of T.from) {
      const us = (idleAt.get(f) || []).filter(u => !used.has(u));
      const keep = keepAt.get(f) || 0;
      const avail = us.slice().sort((a, b) => unitAttack(S, b, nodes[T.r].terrain) - unitAttack(S, a, nodes[T.r].terrain));
      pool.push(...avail.slice(0, Math.max(0, avail.length - keep)).map(u => [u, f]));
    }
    if (!pool.length) continue;
    const terr = nodes[T.r].terrain;
    if (T.D < 1) {
      // 空城：派最快的一個單位
      pool.sort((a, b) => UNITS[b[0].t].speed - UNITS[a[0].t].speed);
      const [u] = pool[0];
      if (orderMove(S, u, T.r)) used.add(u);
      continue;
    }
    const width = TERRAIN[terr].width;
    let A = 0; const sel = [];
    pool.sort((a, b) => unitAttack(S, b[0], terr) * unitEff(S, b[0]) - unitAttack(S, a[0], terr) * unitEff(S, a[0]));
    for (const [u] of pool) {
      if (sel.length >= width + 2) break;
      sel.push(u); A += unitAttack(S, u, terr) * unitEff(S, u);
      if (A > T.D * 1.6) break;
    }
    const aggressive = (C.mods.att || 0) > 0.05 ? 1.15 : 1.3;
    if (A >= T.D * aggressive) {
      for (const u of sel) if (orderMove(S, u, T.r)) used.add(u);
    }
  }

  // ---------- 增援：把後方單位送往缺兵的前線
  const rest = idle.filter(u => !used.has(u));
  if (!rest.length) return;
  const need = [];
  for (const [f, info] of front) {
    const have = (myUnitsAt.get(f) || []).length;
    const want = Math.max(info.own ? 1 : 0, Math.min(6, Math.ceil(info.threat / 18) + (info.adjE.length > 1 ? 1 : 0)));
    if (have < want) need.push([f, want - have, info]);
  }
  // 沿海重鎮防登陸
  let enemyNavy = false;
  for (const e of enemies) if (WORLD.countries[e] && WORLD.countries[e].navy) { enemyNavy = true; break; }
  if (enemyNavy) {
    for (let r = 0; r < R; r++) {
      if (S.ctrl[r] !== t || S.own[r] !== t || !nodes[r].coastal || nodes[r].vp < 5 || front.has(r)) continue;
      const want = nodes[r].vp >= 20 ? 3 : nodes[r].vp >= 10 ? 2 : 1;
      const have = (myUnitsAt.get(r) || []).length;
      if (have < want) need.push([r, want - have, { threat: 0, own: true, adjE: [] }]);
    }
  }
  if (!need.length) {
    // 沒有缺口：全部送往威脅最大的前線
    let best = null, bv = -1;
    for (const [f, info] of front) { const v = info.threat + (info.own ? 5 : 0) + rand(S); if (v > bv) { bv = v; best = f; } }
    if (best !== null) need.push([best, rest.length, front.get(best)]);
  }
  if (!need.length) return;
  const srcs = need.map(n => n[0]);
  const { dist } = multiDijkstra(S, t, srcs, 'land');
  const remaining = new Map(need.map(n => [n[0], n[1]]));
  const frontSet = new Set([...front.keys(), ...need.map(n => n[0])]);
  // 已在前線的閒置單位保持不動
  const movers = rest.filter(u => !frontSet.has(u.n) || (myUnitsAt.get(u.n) || []).length > 3);
  movers.sort((a, b) => dist[a.n] - dist[b.n]);
  for (const u of movers) {
    if (frontSet.has(u.n) && (myUnitsAt.get(u.n) || []).length <= 3) continue;
    let best = -1, bd = Infinity;
    for (const [f, k] of remaining) {
      if (k <= 0) continue;
      const d = (u.n === f ? 0 : approxDist(u.n, f));
      if (d < bd) { bd = d; best = f; }
    }
    if (best < 0) { best = srcs[Math.floor(rand(S) * srcs.length)]; }
    if (best === u.n) continue;
    if (orderMove(S, u, best)) { remaining.set(best, (remaining.get(best) || 1) - 1); const a = myUnitsAt.get(u.n); if (a) { const k = a.indexOf(u); if (k >= 0) a.splice(k, 1); } }
  }

  // ---------- 兩棲登陸
  if ((S.day + hashTag(t)) % 12 === 0) aiInvade(S, t, mine.filter(u => !u.path.length && u.n < R && u.org > 30 && u.hp > 70), idx, front);
}
function approxDist(a, b) { return a < R && b < R ? rDist(a, b) : 5000; }

function peaceDeploy(S, t, units, idx) {
  const C = S.C[t];
  const hints = (S.hints && S.hints[t]) || [];
  const border = [];
  for (let r = 0; r < R; r++) {
    if (S.ctrl[r] !== t) continue;
    let w = 0;
    for (const m of nodes[r].landNb) {
      const o = S.ctrl[m];
      if (!o || o === t || friendly(S, t, o)) continue;
      const K = S.C[o];
      w += 1 + Math.min(4, (K.ic || 0) / 15) + (hints.includes(o) ? 6 : 0) + (K.ideo !== C.ideo ? 1 : 0);
    }
    if (r === C.cap) w += 2;
    if (w > 0) border.push([r, w]);
  }
  if (!border.length) return;
  const tot = border.reduce((s, x) => s + x[1], 0);
  const land = units.filter(u => u.n < R && !u.path.length);
  const counts = new Map();
  for (const u of land) counts.set(u.n, (counts.get(u.n) || 0) + 1);
  const desired = new Map(border.map(([r, w]) => [r, Math.max(0, Math.round(land.length * w / tot))]));
  let moves = Math.max(2, Math.ceil(land.length / 6));
  for (const u of land) {
    if (moves <= 0) break;
    const have = counts.get(u.n) || 0, want = desired.get(u.n) || 0;
    if (have <= want) continue;
    let best = -1, bd = Infinity;
    for (const [r, d] of desired) { if ((counts.get(r) || 0) >= d) continue; const dd = approxDist(u.n, r); if (dd < bd) { bd = dd; best = r; } }
    if (best < 0) break;
    if (orderMove(S, u, best)) { counts.set(u.n, have - 1); counts.set(best, (counts.get(best) || 0) + 1); moves--; }
  }
  void idx;
}

function aiInvade(S, t, idle, idx, front) {
  const C = S.C[t];
  if (idle.length < 4) return;
  const post = posture(S, t);
  if (post === 'defensive') return;
  const enemies = enemySet(S, t);
  // 若已有陸地前線且兵力不足，不進行登陸
  const frontCount = [...front.values()].filter(f => f.own).length;
  if (frontCount > 0 && idle.length < 8) return;
  let myNav = 0, enemyNav = 0;
  for (const u of S.units) {
    if (u.dead || !isNaval(u)) continue;
    if (u.c === t || friendly(S, t, u.c)) myNav += navPower(S, u, false);
    else if (enemies.has(u.c)) enemyNav += navPower(S, u, false);
  }
  if (myNav < 25 || myNav < enemyNav * 0.6) return;
  const maxHops = WORLD.countries[t].navy ? 7 : 2;
  const zp = new Map();
  for (const u of S.units) { if (u.dead || !isNaval(u)) continue; let m = zp.get(u.n); if (!m) zp.set(u.n, m = new Map()); m.set(u.c, (m.get(u.c) || 0) + navPower(S, u, false)); }
  // 候選目標：敵方沿海地區
  const cands = [];
  for (let r = 0; r < R; r++) {
    if (!enemies.has(S.ctrl[r]) || !nodes[r].coastal) continue;
    if (!targetAllowed(S, t, r, post)) continue;
    const D = defenseAt(S, r, t, idx);
    let landLinked = false;
    for (const m of nodes[r].landNb) if (S.ctrl[m] === t || allied(S, t, S.ctrl[m])) { landLinked = true; break; }
    const score = (nodes[r].vp + 2 + S.ind[r]) / (D + 6) * (landLinked ? 0.4 : 1) * (0.7 + 0.6 * rand(S));
    cands.push([score, r, D]);
  }
  cands.sort((a, b) => b[0] - a[0]);
  for (const [, r, D] of cands.slice(0, 4)) {
    const n = Math.min(idle.length, Math.max(3, Math.min(8, Math.ceil(D / 9) + 3)));
    const group = idle.slice().sort((a, b) => (b.t === 'mar') - (a.t === 'mar') || UNITS[b.t].att - UNITS[a.t].att).slice(0, n);
    const p = findPath(S, group[0], r);
    if (!p) continue;
    let ok = true;
    for (const z of p) if (z >= R) { const b = seaBalance(S, t, z, zp); if (b.e > b.f * 0.8) { ok = false; break; } }
    if (!ok) continue;
    if (p.filter(z => z >= R).length > maxHops) continue;
    // 只登陸敵方本土或離本國不遠的目標
    const tgtOwner = S.own[r];
    const homeland = S.core[r] === tgtOwner && rDist(r, S.C[tgtOwner] ? S.C[tgtOwner].cap : r) < 2500;
    const nearMe = rDist(r, C.cap) < 3000;
    if (!homeland && !nearMe && !(S.hints && S.hints[t] && S.hints[t].includes(tgtOwner))) continue;
    for (const u of group) orderMove(S, u, r);
    return;
  }
}

// ============================================================ 艦隊
function homeZone(S, t) {
  const C = S.C[t];
  if (C.cap >= 0 && nodes[C.cap].coastal && S.ctrl[C.cap] === t) return nodes[C.cap].seaNb[0];
  let best = -1, bv = -1;
  for (let r = 0; r < R; r++) if (S.ctrl[r] === t && nodes[r].coastal && S.ind[r] + nodes[r].vp > bv) { bv = S.ind[r] + nodes[r].vp; best = r; }
  return best >= 0 ? nodes[best].seaNb[0] : -1;
}
function aiNavy(S, t) {
  const fleets = S.units.filter(u => u.c === t && !u.dead && isNaval(u));
  if (!fleets.length) return;
  const enemies = enemySet(S, t);
  const home = homeZone(S, t);
  if (home < 0) return;
  if (!enemies.size) {
    for (const u of fleets) if (!u.path.length && u.n !== home && rand(S) < 0.3) orderMove(S, u, home);
    return;
  }
  // 敵艦位置
  const ez = new Map();
  for (const u of S.units) if (!u.dead && isNaval(u) && enemies.has(u.c)) ez.set(u.n, (ez.get(u.n) || 0) + navPower(S, u, false));
  let myPow = 0; for (const u of fleets) if ((u.t === 'flt' || u.t === 'car') && u.hp > 50) myPow += navPower(S, u, false);
  // 尋找可擊敗的敵艦隊（距離 6 格內）
  const near = new Map(); const q = [home]; near.set(home, 0);
  for (let h = 0; h < q.length; h++) { const z = q[h]; const d = near.get(z); if (d >= 6) continue; for (const e of ADJ[z]) if (e.to >= R && !near.has(e.to)) { near.set(e.to, d + 1); q.push(e.to); } }
  let target = -1, tv = 0;
  for (const [z, p] of ez) { if (!near.has(z)) continue; if (myPow > p * 1.3 && p > tv) { tv = p; target = z; } }
  // 掩護：我方運兵船所在海域
  let escort = -1;
  for (const u of S.units) if (u.c === t && !u.dead && isLandUnit(u) && u.n >= R) { escort = u.n; break; }
  for (const u of fleets) {
    if (u.hp < 40) { if (u.n !== home && !u.path.length) orderMove(S, u, home); continue; }
    if (u.t === 'sub') {
      if (u.path.length) continue;
      // 前往敵方沿海進行破交
      let best = -1, bv = -1;
      for (const [z, d] of near) {
        if (ez.has(z)) continue;
        let v = 0; for (const l of nodes[z].landNb) if (enemies.has(S.ctrl[l])) v += 1 + S.ind[l];
        v = v / (d + 1) + rand(S);
        if (v > bv) { bv = v; best = z; }
      }
      if (best >= 0 && bv > 1.5 && best !== u.n) orderMove(S, u, best);
      else if (bv <= 1.5 && u.n !== home) orderMove(S, u, home);
      continue;
    }
    const dest = target >= 0 ? target : escort >= 0 ? escort : home;
    if (u.n !== dest && (!u.path.length || u.path[u.path.length - 1] !== dest)) orderMove(S, u, dest);
  }
}

// ============================================================ 空軍
function aiAir(S, t) {
  const airs = S.units.filter(u => u.c === t && !u.dead && isAir(u));
  if (!airs.length) return;
  const C = S.C[t];
  const enemies = enemySet(S, t);
  if (!enemies.size) { for (const u of airs) if (u.n !== C.cap && S.ctrl[C.cap] === t) u.n = C.cap; return; }
  const hot = [];
  for (const b of S.battles) if (b.ac === t || b.dc === t || allied(S, t, b.ac) && atWar(S, t, b.dc) || allied(S, t, b.dc) && atWar(S, t, b.ac)) hot.push(b.r);
  if (!hot.length) {
    for (let r = 0; r < R; r++) if (S.ctrl[r] === t && nodes[r].landNb.some(m => enemies.has(S.ctrl[m]))) hot.push(r);
  }
  if (!hot.length) return;
  // 候選基地：我方控制、補給中的地區
  const cands = [];
  const sample = hot.slice(0, 40);
  for (let r = 0; r < R; r++) {
    if (S.ctrl[r] !== t) continue;
    let cover = 0;
    for (const h of sample) { const d = rDist(r, h); if (d < 600) cover += 1 - d / 900; }
    const danger = nodes[r].landNb.some(m => enemies.has(S.ctrl[m])) ? 0.6 : 1;
    if (cover > 0) cands.push([cover * danger, r]);
  }
  cands.sort((a, b) => b[0] - a[0]);
  const bases = cands.slice(0, 3).map(c => c[1]);
  if (!bases.length) return;
  airs.forEach((u, i) => { const b = bases[i % bases.length]; if (u.n !== b && rDist(u.n, b) > 150) u.n = b; });
}

// ============================================================ 外交
function aiDiplomacy(S, t) {
  const C = S.C[t];
  // 求和：AI 之間（只在劣勢明顯且非歷史大戰時）
  if ((C.surrender || 0) > 0.4 && !WORLD.countries[t].major) {
    for (const e of [...enemySet(S, t)]) {
      const K = S.C[e]; if (!K || !K.ai) continue;
      if (aiAcceptPeace(S, e, t, 'white')) { makePeace(S, t, e, 'white'); break; }
    }
  }
  // 非歷史模式：侵略性 AI
  if (S.set.hist && !S.set.aiAggr) return;
  if (atWarAny(S, t)) return;
  if (!(C.ideo === 'fas' || C.ideo === 'com' || S.set.aiAggr >= 2)) return;
  if (!WORLD.countries[t].major && (C.ic || 0) < 25) return;
  if (rand(S) > 0.12 * (S.set.aiAggr || 1)) return;
  const nb = new Set();
  for (let r = 0; r < R; r++) if (S.own[r] === t) for (const m of nodes[r].landNb) { const o = S.ctrl[m]; if (o && o !== t && !friendly(S, t, o)) nb.add(o); }
  let best = null, bv = 0;
  for (const o of nb) {
    const K = S.C[o]; if (!K || !K.exists || (C.nap[o] || 0) > S.day) continue;
    const ratio = (C.ic || 1) / ((K.ic || 1) + 1);
    if (ratio < 1.8) continue;
    if (K.fac && S.fac[K.fac] && S.fac[K.fac].members.some(m => (S.C[m].ic || 0) > (C.ic || 0))) continue;
    const v = ratio + (K.ideo !== C.ideo ? 1 : 0) + rand(S);
    if (v > bv) { bv = v; best = o; }
  }
  if (best && C.pp >= 50) { C.pp -= 50; declareWar(S, t, best); }
}

HOOKS.ai = aiTick;
export { aiEconomy, aiPolitics };
