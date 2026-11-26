// 世界大事：
//  1. 歷史事件發生時，所有真人玩家都會收到置中的事件視窗（遊戲強制暫停），並可選擇如何回應（譴責、援助、保證、參戰、擴軍…）
//  2. 有國家向真人玩家宣戰時跳出通知與應對選項
//  3. 虛構戰爭：AI 會向真人玩家提出領土要求（邊境危機），AI 之間也會爆發邊境衝突
import { WORLD } from './world.js';
import {
  HOOKS, alive, atWar, friendly, liveTags, cname, rname, declareWar, makePeace, addNews, spawnUnit, enemySet,
  deployRegion, transferRegion, lawAllowed, bestUnitType,
} from './engine.js';
import { pushPrompt, PROMPT_HANDLERS, canDeclare, applyCommand, aiAcceptPeace } from './commands.js';
import { rand, clamp, pairKey, yearOf } from './util.js';
import { LAWS } from '../data/rules.js';

const R = WORLD.R, nodes = WORLD.nodes;
export const humans = (S) => liveTags(S).filter(t => !S.C[t].ai);

// ------------------------------------------------------------ 事件期間攔截宣戰
let capture = null;
export function beginCapture() { capture = []; }
export function endCapture() { const c = capture || []; capture = null; return c; }
HOOKS.onWar = (S, a, b) => {
  if (capture) capture.push([a, b]);
  warNotices(S, a, b);
};

// 有人向真人玩家（或其陣營）宣戰
function warNotices(S, a, b) {
  for (const h of humans(S)) {
    if (h === a) continue;
    let foe = null, msg = '';
    if (atWar(S, h, a) && S.wars[pairKey(h, a)] === S.day) { foe = a; msg = h === b ? `${cname(S, a)}向你宣戰了！` : `${cname(S, a)}向${cname(S, b)}宣戰，你因盟約或保證而加入戰爭，與${cname(S, a)}進入交戰狀態。`; }
    else if (atWar(S, h, b) && S.wars[pairKey(h, b)] === S.day) { foe = b; msg = `你的陣營領袖${cname(S, a)}向${cname(S, b)}宣戰，你隨同參戰。`; }
    if (!foe) continue;
    if ((S.pending[h] || []).some(p => p.ev === 'war:' + foe)) continue;
    const C = S.C[h];
    const opts = [{ t: '全軍迎戰！', act: 'ok' }];
    const con = C.laws.con;
    if (con < LAWS.con.levels.length - 1 && !lawAllowed(S, h, 'con', con + 1)) opts.push({ t: `全國動員：頒布「${LAWS.con.levels[con + 1].name}」（花費 50 政治點數）`, act: 'react', k: 'mobilize' });
    opts.push({ t: '緊急擴軍（立即獲得 2 個步兵師，花費 30 政治點數）', act: 'react', k: 'arm' });
    opts.push({ t: `向${cname(S, foe)}提議白和平（對方可能拒絕）`, act: 'react', k: 'peace', target: foe });
    pushPrompt(S, h, { ev: 'war:' + foe, kind: 'war', title: '戰爭爆發', text: msg, opts, def: 0, tags: [foe, h] });
  }
}

// ------------------------------------------------------------ 歷史事件 → 世界大事視窗
const clean = (t) => t.replace(/[^。！」]*？$/, '').trim();
// 事件視窗上方要顯示哪些國家的國旗：交戰雙方、事件主角，以及從標題與內文推測的國家
const KEYWORDS = [['德軍', 'GER'], ['德國', 'GER'], ['德奧', 'GER'], ['希特勒', 'GER'], ['日軍', 'JAP'], ['日本', 'JAP'], ['蘇軍', 'SOV'], ['蘇聯', 'SOV'], ['紅軍', 'SOV'], ['美軍', 'USA'], ['美國', 'USA'],
  ['英軍', 'ENG'], ['英國', 'ENG'], ['法軍', 'FRA'], ['法國', 'FRA'], ['英法', 'ENG'], ['英法', 'FRA'], ['義軍', 'ITA'], ['義大利', 'ITA'], ['墨索里尼', 'ITA'], ['國軍', 'CHI'], ['國民政府', 'CHI'], ['蔣', 'CHI'],
  ['中共', 'PRC'], ['解放軍', 'PRC'], ['毛澤東', 'PRC'], ['以色列', 'ISR'], ['埃及', 'EGY'], ['印度', 'IND'], ['巴基斯坦', 'PAK'], ['北韓', 'PRK'], ['南韓', 'KOR'], ['越南', 'VIN'], ['古巴', 'CUB'], ['伊拉克', 'IRQ'], ['伊朗', 'PER']];
export function inferTags(S, e, wars) {
  const out = [];
  const add = (t) => { if (t && S.C[t] && S.C[t].exists !== false && !out.includes(t)) out.push(t); };
  for (const [a, b] of wars) { add(a); add(b); }
  if (e.who) add(e.who);
  const txt = (e.title || '') + (e.text || '');
  for (const [k, t] of KEYWORDS) if (out.length < 4 && txt.includes(k)) add(t);
  if (out.length < 4) for (const t of liveTags(S)) { const n = S.C[t].name; if (n && n.length >= 2 && txt.includes(n)) add(t); if (out.length >= 4) break; }
  return out.slice(0, 4);
}
export function worldReact(S, e, wars, skip, only) {
  const hs = humans(S).filter(h => h !== skip && (!only || h === only));
  if (!hs.length) return;
  const tags = inferTags(S, e, wars);
  for (const h of hs) {
    const opts = reactionOpts(S, h, wars, e);
    pushPrompt(S, h, { ev: e.id, kind: 'world', title: e.title, text: clean(e.text) + (e.decision ? `\n\n${e.decision}` : ''), opts, def: 0, tags });
  }
}
function reactionOpts(S, h, wars, e) {
  const C = S.C[h];
  const opts = [{ t: '了解（靜觀其變）', act: 'ok' }];
  const w = wars.find(([a, b]) => a !== h && b !== h && alive(S, a) && alive(S, b) && !atWar(S, h, a) && !atWar(S, h, b));
  if (w) {
    const [a, b] = w;
    const A = cname(S, a), B = cname(S, b);
    if (!friendly(S, h, a)) opts.push({ t: `譴責${A}（政治點數 +15，世界緊張度 +1）`, act: 'react', k: 'condemn', a, b });
    if (!friendly(S, h, a) && !S.lend[h + '>' + b]) opts.push({ t: `軍援${B}（每天提供 10% 軍工產能）`, act: 'react', k: 'lend', target: b });
    if (!friendly(S, h, a) && !C.guar.includes(b) && C.pp >= 25) opts.push({ t: `保證${B}的獨立（25 政治點數）`, act: 'react', k: 'guar', target: b });
    if (!canDeclare(S, h, a) && !friendly(S, h, a)) opts.push({ t: `⚔ 對${A}宣戰，支援${B}`, act: 'react', k: 'war', target: a });
    if (!canDeclare(S, h, b) && (friendly(S, h, a) || C.ideo === S.C[a].ideo) && !friendly(S, h, b)) opts.push({ t: `⚔ 加入${A}一方，對${B}宣戰`, act: 'react', k: 'war', target: b });
  }
  if (w || e.kind === 'war') opts.push({ t: '趁勢擴軍備戰（2 個步兵師，30 政治點數）', act: 'react', k: 'arm' });
  else opts.push({ t: '加強宣傳（政治點數 +10，世界緊張度 +1）', act: 'react', k: 'pp' });
  return opts.slice(0, 6);
}
function armUp(S, tag, n) {
  const C = S.C[tag];
  for (let i = 0; i < n; i++) spawnUnit(S, tag, 'inf', deployRegion(S, tag, 'inf'), { auto: !C.ai && C.autoDeploy });
}
PROMPT_HANDLERS.ok = () => {};
PROMPT_HANDLERS.react = (S, tag, p, k, o) => {
  const C = S.C[tag];
  const fail = (m) => addNews(S, `無法執行：${m}`, 'info', [tag]);
  switch (o.k) {
    case 'condemn': C.pp += 15; S.tension = clamp(S.tension + 1, 0, 100); addNews(S, `${C.name}公開譴責${cname(S, o.a)}的侵略行為。`, 'diplo', [tag, o.a]); break;
    case 'pp': C.pp += 10; S.tension = clamp(S.tension + 1, 0, 100); break;
    case 'lend': { const r = applyCommand(S, tag, { type: 'lend', target: o.target, pct: 0.1 }); if (!r.ok) fail(r.msg); break; }
    case 'guar': { const r = applyCommand(S, tag, { type: 'guarantee', target: o.target }); if (!r.ok) fail(r.msg); break; }
    case 'war': { const r = applyCommand(S, tag, { type: 'declare', target: o.target }); if (!r.ok) fail(r.msg); break; }
    case 'arm': { if (C.pp < 30) { fail('政治點數不足（需要 30）'); break; } C.pp -= 30; armUp(S, tag, 2); addNews(S, `${C.name}緊急擴編了 2 個步兵師。`, 'info', [tag]); break; }
    case 'mobilize': {
      const lvl = C.laws.con + 1;
      if (C.pp < 50) { fail('政治點數不足（需要 50）'); break; }
      if (lvl >= LAWS.con.levels.length || lawAllowed(S, tag, 'con', lvl)) { fail('目前無法提升徵兵法'); break; }
      C.pp -= 50; C.laws.con = lvl; addNews(S, `${C.name}頒布「${LAWS.con.levels[lvl].name}」，全國進入動員狀態。`, 'info', [tag]); break;
    }
    case 'peace': {
      const T = o.target;
      if (!atWar(S, tag, T)) break;
      if (S.C[T] && S.C[T].ai && aiAcceptPeace(S, T, tag, 'white')) makePeace(S, tag, T, 'white');
      else addNews(S, `${cname(S, T)}拒絕了和平提議。`, 'diplo', [tag, T]);
      break;
    }
  }
};
PROMPT_HANDLERS.peaceOffer = (S, tag, p, k, o) => { if (atWar(S, o.a, o.b)) makePeace(S, o.a, o.b, o.kind || 'white'); };

// ------------------------------------------------------------ 虛構戰爭
export function dynamicWars(S) {
  const lvl = S.set.fakeWars ?? 1;
  if (S.bwars && S.day % 5 === 0) endFakeWars(S);
  if (!lvl) return;
  if (S.set.aiVsHuman !== false && humans(S).length) {
    if (S.nextChallenge === undefined) S.nextChallenge = S.day + 200 + Math.floor(rand(S) * 200);
    if (S.day >= S.nextChallenge) { S.nextChallenge = S.day + (lvl >= 2 ? 180 : 400) + Math.floor(rand(S) * 180); challengeHuman(S); }
  }
  if (S.nextBorderWar === undefined) S.nextBorderWar = S.day + 100 + Math.floor(rand(S) * 150);
  if (S.day >= S.nextBorderWar) { S.nextBorderWar = S.day + (lvl >= 2 ? 75 : 190) + Math.floor(rand(S) * 100); aiBorderWar(S); }
}
function landPower(S, t) { let n = 0; for (const u of S.units) if (u.c === t && !u.dead && u.n < R && (u.t === 'inf' || u.t === 'mar' || u.t === 'mec' || u.t === 'ltk' || u.t === 'arm' || u.t === 'htk' || u.t === 'mbt')) n++; return n; }
const napActive = (S, a, b) => (S.C[a].nap[b] || 0) > S.day;
function borderMap(S, tag) {
  const m = new Map();
  for (let r = 0; r < R; r++) {
    if (S.own[r] !== tag || S.ctrl[r] !== tag) continue;
    for (const x of nodes[r].landNb) {
      const t = S.ctrl[x];
      if (!t || t === tag || S.own[x] !== t) continue;
      let o = m.get(t); if (!o) m.set(t, o = { mine: new Set(), theirs: new Set() });
      o.mine.add(r); o.theirs.add(x);
    }
  }
  return m;
}
function pickRegs(S, tag, set, n) {
  return [...set].filter(r => r !== S.C[tag].cap).sort((a, b) => nodes[a].vp - nodes[b].vp + (rand(S) - 0.5) * 3).slice(0, n);
}
// AI 向真人玩家提出領土要求
function challengeHuman(S) {
  const hs = humans(S).filter(h => enemySet(S, h).size < 2);
  if (!hs.length) return;
  const h = hs[Math.floor(rand(S) * hs.length)];
  const y = yearOf(S.day);
  const myPow = Math.max(1, landPower(S, h));
  let best = null, bs = -1;
  for (const [t, o] of borderMap(S, h)) {
    const K = S.C[t];
    if (!K || !K.ai || !alive(S, t) || K.subj || friendly(S, h, t) || atWar(S, h, t) || napActive(S, h, t)) continue;
    if (enemySet(S, t).size) continue;
    if (S.set.hist && WORLD.countries[t].major && y < 1946) continue;
    const ratio = landPower(S, t) / myPow;
    if (ratio < 0.5) continue;
    const sc = (ratio > 3 ? 0.5 : 1) * (1 + rand(S)) * (K.ideo !== S.C[h].ideo ? 1.3 : 1);
    if (sc > bs) { bs = sc; best = { t, o }; }
  }
  if (!best) return;
  const regs = pickRegs(S, h, best.o.mine, rand(S) < 0.5 ? 1 : 2);
  if (!regs.length) return;
  const t = best.t, names = regs.map(r => rname(S, r)).join('、');
  pushPrompt(S, h, {
    ev: 'ultimatum', kind: 'crisis', title: '邊境危機', tags: [t, h], def: 0,
    text: `${cname(S, t)}聲稱擁有${names}的主權，並在邊境集結大軍，要求你立即割讓，否則將兵戎相見！`,
    opts: [
      { t: '拒絕！準備迎戰', act: 'ulti', k: 'refuse', ai: t, regs },
      { t: `割讓${names}以換取和平`, act: 'ulti', k: 'cede', ai: t, regs },
      { t: '尋求國際調停（50 政治點數，約六成機會化解危機）', act: 'ulti', k: 'mediate', ai: t, regs },
      { t: '先發制人！立即宣戰（一個月內攻擊 +15%）', act: 'ulti', k: 'strike', ai: t, regs },
    ],
  });
  addNews(S, `【邊境危機】${cname(S, t)}向${cname(S, h)}提出領土要求。`, 'war', [t, h]);
}
function startFakeWar(S, a, b, targetsA, targetsB, days) {
  if (!alive(S, a) || !alive(S, b) || atWar(S, a, b)) return false;
  if (!declareWar(S, a, b, { limited: true, silent: true })) return false;
  if (!S.lim) S.lim = {};
  S.lim[pairKey(a, b)] = { [a]: targetsA, [b]: targetsB };
  if (!S.bwars) S.bwars = [];
  S.bwars.push({ a, b, end: S.day + days, regs: targetsA.concat(targetsB) });
  return true;
}
PROMPT_HANDLERS.ulti = (S, h, p, k, o) => {
  const t = o.ai;
  if (!alive(S, t) || !alive(S, h)) return;
  const C = S.C[h];
  const war = (first) => {
    // AI 的目標：要求的地區及其鄰近地區
    const extra = new Set(o.regs);
    for (const r of o.regs) for (const x of nodes[r].landNb) if (S.own[x] === h && x !== C.cap && extra.size < 4) extra.add(x);
    const ok = first ? startFakeWar(S, h, t, [], [...extra], 300 + Math.floor(rand(S) * 150)) : startFakeWar(S, t, h, [...extra], [], 300 + Math.floor(rand(S) * 150));
    if (!ok) return;
    // AI 增派部隊到邊境
    const K = S.C[t];
    const near = [...borderMap(S, t).get(h)?.mine || []];
    for (let i = 0; i < 3; i++) if (near.length) spawnUnit(S, t, bestUnitType(S, t, i === 0 ? 'arm' : 'inf'), near[i % near.length]);
    addNews(S, first ? `${C.name}對${K.name}先發制人，邊境戰爭爆發！` : `${K.name}向${C.name}宣戰，邊境戰爭爆發！`, 'war', [t, h]);
  };
  if (o.k === 'refuse') war(false);
  else if (o.k === 'cede') { for (const r of o.regs) if (S.own[r] === h) transferRegion(S, r, t); addNews(S, `${C.name}割讓${o.regs.map(r => rname(S, r)).join('、')}給${cname(S, t)}。`, 'diplo', [h, t]); }
  else if (o.k === 'mediate') {
    if (C.pp >= 50 && rand(S) < 0.6) { C.pp -= 50; C.nap[t] = S.day + 730; S.C[t].nap[h] = S.day + 730; addNews(S, `國際調停成功，${C.name}與${cname(S, t)}簽訂兩年互不侵犯條約。`, 'diplo', [h, t]); }
    else { if (C.pp >= 50) C.pp -= 50; addNews(S, '國際調停失敗！', 'war', [h, t]); war(false); }
  } else if (o.k === 'strike') {
    war(true);
    C.mods.att += 0.15; (S.temp || (S.temp = [])).push({ tag: h, key: 'att', val: 0.15, until: S.day + 30 });
  }
};
// AI 之間的邊境衝突（小國之間）
function aiBorderWar(S) {
  const y = yearOf(S.day);
  // 歷史模式下不在歐洲與北美製造虛構戰爭（避免干擾二戰與冷戰的主線）
  const westish = (t) => { const n = nodes[S.C[t].cap]; return n && ((n.lat > 35 && n.lon > -25 && n.lon < 45) || (n.lat > 24 && n.lon < -50)); };
  const pool = liveTags(S).filter(t => { const C = S.C[t]; return C.ai && !C.subj && !WORLD.countries[t].major && !enemySet(S, t).size && !C.fac && !(S.set.hist && westish(t)); });
  for (let tries = 0; tries < 12 && pool.length; tries++) {
    const a = pool[Math.floor(rand(S) * pool.length)];
    const bm = borderMap(S, a);
    const cands = [...bm.keys()].filter(b => pool.includes(b) && !napActive(S, a, b) && !friendly(S, a, b));
    if (!cands.length) continue;
    const b = cands[Math.floor(rand(S) * cands.length)];
    const o = bm.get(b);
    const ta = pickRegs(S, b, o.theirs, 2), tb = pickRegs(S, a, o.mine, 1);
    if (!ta.length) continue;
    if (!startFakeWar(S, a, b, ta, tb, 160 + Math.floor(rand(S) * 220))) continue;
    addNews(S, `【邊境衝突】${cname(S, a)}與${cname(S, b)}因邊界爭議爆發戰爭（虛構事件）。`, 'war', [a, b]);
    // 鄰近的真人玩家會收到通知並可介入
    for (const h of humans(S)) {
      if (h === a || h === b) continue;
      const near = borderMap(S, h);
      if (!near.has(a) && !near.has(b) && y > 0) continue;
      worldReact(S, { id: 'border_war', title: '邊境衝突', kind: 'war', text: `${cname(S, a)}與${cname(S, b)}因邊界爭議爆發戰爭（虛構事件）。你的國家與交戰國相鄰，要如何應對？` }, [[a, b]], null, h);
    }
    return;
  }
}
// 虛構戰爭到期：AI 之間自動停戰；有真人玩家參與時由 AI 提出停戰
function endFakeWars(S) {
  for (let i = S.bwars.length - 1; i >= 0; i--) {
    const w = S.bwars[i];
    if (!alive(S, w.a) || !alive(S, w.b) || !atWar(S, w.a, w.b)) { S.bwars.splice(i, 1); continue; }
    if (S.day < w.end) continue;
    const ha = !S.C[w.a].ai, hb = !S.C[w.b].ai;
    if (ha || hb) {
      const h = ha ? w.a : w.b, ai = ha ? w.b : w.a;
      if (ha && hb) { w.end = S.day + 365; continue; }
      const held = w.regs.some(r => S.ctrl[r] === ai && S.own[r] === h);
      pushPrompt(S, h, { ev: 'ceasefire', kind: 'diplo', title: '停戰提議', tags: [ai, h], def: 1,
        text: `${cname(S, ai)}提出停戰${held ? '，要求維持目前的控制線' : '，雙方恢復戰前邊界'}。`,
        opts: [{ t: '繼續作戰', act: 'ok' }, { t: held ? '接受停戰（維持現有控制線）' : '接受停戰（恢復戰前邊界）', act: 'peaceOffer', a: ai, b: h, kind: held ? 'status' : 'white' }] });
      w.end = S.day + 150;
    } else {
      const aHolds = w.regs.some(r => S.ctrl[r] !== S.own[r]);
      makePeace(S, w.a, w.b, aHolds && rand(S) < 0.5 ? 'status' : 'white');
      S.bwars.splice(i, 1);
    }
  }
}
