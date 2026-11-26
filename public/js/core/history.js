// 歷史事件：1936–1991。AI 依歷史選項行動；玩家可自行抉擇改寫歷史。
import { WORLD, ridx } from './world.js';
import {
  alive, atWar, declareWar, setWar, makePeace, transferRegion, createCountry, killCountry, makeFaction, joinFaction,
  leaveFaction, addNews, spawnUnit, cname, enemySet, friendly, liveTags, nukeStrike, relocateHostile, isLandUnit, HOOKS,
} from './engine.js';
import { pushPrompt, PROMPT_HANDLERS } from './commands.js';
import { strToDay, yearOf, dayToDate } from './util.js';
import { UNITS } from '../data/rules.js';

const R = WORLD.R, nodes = WORLD.nodes;

// ------------------------------------------------------------ 事件 API
export function mkApi(S) {
  const rid = (id) => (typeof id === 'number' ? id : ridx(id));
  const A = {
    S,
    rid,
    exists: (t) => alive(S, t),
    owns: (t, id) => S.own[rid(id)] === t,
    ctrl: (id) => S.ctrl[rid(id)],
    ctrls: (t, id) => S.ctrl[rid(id)] === t,
    atWar: (a, b) => atWar(S, a, b),
    war: (a, b, opts = {}) => alive(S, a) && alive(S, b) && !atWar(S, a, b) && declareWar(S, a, b, opts),
    setWar: (a, b) => alive(S, a) && alive(S, b) && setWar(S, a, b),
    peace: (a, b, kind = 'white', silent = false) => atWar(S, a, b) && makePeace(S, a, b, kind, { silent }),
    give: (ids, to, opts = {}) => { for (const id of ids) { const r = rid(id); if (opts.onlyFrom && S.own[r] !== opts.onlyFrom) continue; transferRegion(S, r, to, { core: !!opts.core }); } },
    create: (tag, ids, opts = {}) => {
      const regs = ids.map(rid).filter(r => !opts.onlyFrom || opts.onlyFrom.includes(S.own[r]));
      if (!regs.length && !alive(S, tag) && ids.length) return null;
      return createCountry(S, tag, regs, opts);
    },
    annex: (tag, by) => {
      if (!alive(S, tag)) return;
      for (let r = 0; r < R; r++) if (S.own[r] === tag) transferRegion(S, r, by);
      killCountry(S, tag, by);
    },
    ideo: (t, i) => { if (alive(S, t)) S.C[t].ideo = i; },
    fac: (id, name, leader, members = []) => { if (!alive(S, leader)) return; if (S.fac[id]) return S.fac[id]; return makeFaction(S, id, name, leader, members.filter(m => alive(S, m))); },
    join: (t, id) => { if (alive(S, t) && S.fac[id]) joinFaction(S, t, id); },
    leave: (t) => { if (alive(S, t)) leaveFaction(S, t, true); },
    guar: (a, b) => { if (alive(S, a) && alive(S, b) && !S.C[a].guar.includes(b)) S.C[a].guar.push(b); },
    nap: (a, b, years = 10) => { if (alive(S, a) && alive(S, b)) { S.C[a].nap[b] = S.day + 365 * years; S.C[b].nap[a] = S.day + 365 * years; } },
    news: (text, kind = 'hist') => addNews(S, text, kind),
    units: (tag, spec, id) => {
      if (!alive(S, tag)) return [];
      const r = rid(id); const out = [];
      for (const t in spec) for (let i = 0; i < spec[t]; i++) { const u = spawnUnit(S, tag, t, r); if (u) out.push(u); }
      return out;
    },
    // 兩棲登陸：在目標相鄰海域生成部隊並下令搶灘
    invade: (tag, targetId, spec, seaId) => {
      if (!alive(S, tag)) return [];
      const r = rid(targetId);
      const sea = seaId ? ridx(seaId) : nodes[r].seaNb[0];
      if (sea === undefined) return [];
      const out = [];
      for (const t in spec) for (let i = 0; i < spec[t]; i++) {
        const u = spawnUnit(S, tag, t, sea);
        if (!u) continue;
        if (UNITS[t].domain === 'land') { u.path = [r]; u.prog = 0; }
        out.push(u);
      }
      return out;
    },
    rename: (t, name) => { if (alive(S, t)) S.C[t].name = name; },
    lend: (a, b, p) => { if (alive(S, a) && alive(S, b)) S.lend[a + '>' + b] = p; },
    puppet: (a, b) => { S.puppet[a + '>' + b] = true; },
    subj: (t, o) => { if (alive(S, t)) S.C[t].subj = o; },
    flag: (k, v = true) => { S.flags[k] = v; },
    limit: (a, b, ta = [], tb = []) => { if (!S.lim) S.lim = {}; S.lim[a < b ? a + '|' + b : b + '|' + a] = { [a]: ta.map(rid), [b]: tb.map(rid) }; },
    civil: (a, b) => { S.flags['civil:' + (a < b ? a + '|' + b : b + '|' + a)] = true; },
    tempMod: (t, key, val, days) => { if (!alive(S, t)) return; S.C[t].mods[key] += val; (S.temp || (S.temp = [])).push({ tag: t, key, val, until: S.day + days }); },
    has: (k) => !!S.flags[k],
    isAI: (t) => !!(S.C[t] && S.C[t].ai),
    tech: (t, cat, lvl) => { if (alive(S, t)) S.C[t].tech[cat] = Math.max(S.C[t].tech[cat] || 0, lvl); },
    regionsOf: (t) => { const o = []; for (let r = 0; r < R; r++) if (S.own[r] === t) o.push(r); return o; },
    ctrlAny: (t, ids) => ids.some(id => S.ctrl[rid(id)] === t),
    alliedCtrlAny: (t, ids) => ids.some(id => { const c = S.ctrl[rid(id)]; return c === t || (c && friendly(S, c, t)); }),
    hurtUnits: (tag, pred, hpLoss, orgMul = 1) => { for (const u of S.units) if (u.c === tag && !u.dead && pred(u)) { u.hp = Math.max(5, u.hp - hpLoss); u.org *= orgMul; } },
  };
  return A;
}

// ------------------------------------------------------------ 常用地區清單
const KOREA_N = ['jap_pyongyang', 'jap_wonsan', 'jap_sinuiju', 'jap_chongjin'];
const KOREA_S = ['jap_seoul', 'jap_daejeon', 'jap_gwangju', 'jap_busan'];
const INDOCHINA = ['fra_hanoi', 'fra_vinh', 'fra_hue', 'fra_highlands', 'fra_saigon', 'fra_laos', 'fra_laos_s', 'fra_cambodia'];
const PAK_REGIONS = ['raj_punjab', 'raj_multan', 'raj_peshawar', 'raj_karachi', 'raj_quetta', 'raj_dacca'];
const DEI = ['hol_batavia', 'hol_surabaya', 'hol_sumatra_n', 'hol_palembang', 'hol_borneo', 'hol_celebes', 'hol_moluccas'];
const POL_EAST = ['pol_grodno', 'pol_polesie', 'pol_wilno', 'pol_lwow', 'pol_volhynia'];
const NORTH_ITALY = ['ita_turin', 'ita_milan', 'ita_venice', 'ita_trieste', 'ita_istria', 'ita_bologna', 'ita_florence', 'ita_ancona', 'ita_rome'];
const VICHY_AFRICA = ['fra_rabat', 'fra_marrakesh', 'fra_oran', 'fra_algiers', 'fra_constantine', 'fra_sahara', 'fra_dakar', 'fra_mauritania', 'fra_bamako', 'fra_conakry', 'fra_abidjan', 'fra_ouaga', 'fra_niger', 'fra_dahomey'];
const FREE_FRANCE = ['fra_chad', 'fra_ubangi', 'fra_brazzaville', 'fra_cameroon'];
export const LISTS = { KOREA_N, KOREA_S, INDOCHINA, PAK_REGIONS, DEI, POL_EAST, NORTH_ITALY };

// ------------------------------------------------------------ 戰後安排（可在遊戲中觸發，也供劇本建立使用）
export function germanSettlement(S, A, opts = {}) {
  const west = A.exists('USA') ? 'USA' : A.exists('ENG') ? 'ENG' : 'FRA';
  const east = A.exists('SOV') ? 'SOV' : west;
  for (let r = 0; r < R; r++) {
    const n = nodes[r];
    if (S.core[r] === 'GER' || S.own[r] === 'GER') {
      if (n.zone === 'P') { transferRegion(S, r, A.exists('POL') ? 'POL' : east); S.core[r] = A.exists('POL') ? 'POL' : east; }
      else if (n.zone === 'S') { transferRegion(S, r, east); S.core[r] = east; }
      else if (n.zone === 'E') transferRegion(S, r, east);
      else if (n.zone === 'W') { const c = S.ctrl[r]; transferRegion(S, r, (c === 'ENG' || c === 'FRA' || c === 'USA') ? c : west); }
      else if (S.own[r] === 'GER') transferRegion(S, r, S.core[r] && S.core[r] !== 'GER' && alive(S, S.core[r]) ? S.core[r] : (S.ctrl[r] !== 'GER' ? S.ctrl[r] : west));
    }
  }
  if (alive(S, 'GER')) killCountry(S, 'GER', west);
  // 奧地利、捷克、波蘭等恢復
  restoreCores(S, A, 'AUS', { ideo: 'neu' });
  restoreCores(S, A, 'CZE', { ideo: opts.scenario ? 'com' : 'dem' }, ['cze_ruthenia']);
  A.give(['cze_ruthenia', 'rom_bukovina', 'rom_bessarabia', 'fin_karelia', 'fin_sortavala', ...POL_EAST], east);
  for (const id of ['cze_ruthenia', 'rom_bukovina', 'rom_bessarabia', 'fin_karelia', 'fin_sortavala', ...POL_EAST]) S.core[A.rid(id)] = east;
  restoreCores(S, A, 'POL', { ideo: 'com' });
  for (const t of ['EST', 'LAT', 'LIT']) { for (let r = 0; r < R; r++) if (S.core[r] === t && S.own[r] !== 'SOV') transferRegion(S, r, east); if (alive(S, t)) killCountry(S, t, east); }
  for (const t of ['HOL', 'BEL', 'LUX', 'DEN', 'NOR', 'FRA', 'GRE', 'YUG', 'ALB']) restoreCores(S, A, t, {});
  if (alive(S, 'SLO')) A.annex('SLO', 'CZE');
  if (alive(S, 'CRO')) A.annex('CRO', 'YUG');
  if (S.fac.axis) { for (const m of [...S.fac.axis.members]) leaveFaction(S, m, true); delete S.fac.axis; }
  S.flags.germanySettled = true;
}
function restoreCores(S, A, tag, opts, except = []) {
  const ex = new Set(except.map(A.rid));
  const regs = [];
  for (let r = 0; r < R; r++) if (S.core[r] === tag && S.own[r] !== tag && !ex.has(r)) regs.push(r);
  if (!regs.length && !alive(S, tag)) return;
  createCountry(S, tag, regs, { ideo: opts.ideo || (S.C[tag] ? S.C[tag].ideo : undefined), units: alive(S, tag) ? 0 : undefined });
  if (opts.ideo) S.C[tag].ideo = opts.ideo;
}
export function japanSettlement(S, A) {
  const sov = A.exists('SOV') && atWar(S, 'SOV', 'JAP') ? 'SOV' : null;
  const usa = A.exists('USA') ? 'USA' : (A.exists('ENG') ? 'ENG' : 'CHI');
  const chi = A.exists('CHI') ? 'CHI' : (A.exists('PRC') ? 'PRC' : usa);
  for (const id of KOREA_N) transferRegion(S, A.rid(id), sov || usa);
  for (const id of KOREA_S) transferRegion(S, A.rid(id), usa);
  for (const id of ['jap_taipei', 'jap_kaohsiung', 'jap_dalian']) { transferRegion(S, A.rid(id), chi); S.core[A.rid(id)] = chi; }
  transferRegion(S, A.rid('jap_karafuto'), sov || 'SOV'); S.core[A.rid('jap_karafuto')] = 'SOV';
  for (const id of ['jap_palau', 'jap_saipan', 'jap_truk', 'jap_kwajalein', 'jap_okinawa', 'jap_iwojima']) transferRegion(S, A.rid(id), usa);
  // 滿洲國
  if (alive(S, 'MAN')) {
    for (let r = 0; r < R; r++) if (S.own[r] === 'MAN') { transferRegion(S, r, sov && S.ctrl[r] === 'SOV' ? 'SOV' : chi); S.core[r] = 'CHI'; }
    killCountry(S, 'MAN', chi);
  }
  // 日本佔領的其他地區歸還原主
  for (let r = 0; r < R; r++) {
    if ((S.own[r] === 'JAP' || S.ctrl[r] === 'JAP') && nodes[r].mod !== 'JPN') {
      const core = S.core[r];
      const to = core && core !== 'JAP' && alive(S, core) ? core : (S.ctrl[r] !== 'JAP' ? S.ctrl[r] : usa);
      transferRegion(S, r, to);
    }
  }
  if (alive(S, 'JAP')) {
    for (const e of [...enemySet(S, 'JAP')]) makePeace(S, 'JAP', e, 'white', { silent: true });
    for (let r = 0; r < R; r++) if (S.own[r] === 'JAP') S.ctrl[r] = 'JAP';
    for (const u of S.units) if (u.c === 'JAP' && !u.dead && (u.n >= R || nodes[u.n].mod !== 'JPN')) u.dead = true;
    leaveFaction(S, 'JAP', true);
    S.C['JAP'].ideo = 'dem';
    S.C['JAP'].subj = usa;
    S.C['JAP'].prod = [];
  }
  if (S.fac.cosphere) { for (const m of [...S.fac.cosphere.members]) leaveFaction(S, m, true); delete S.fac.cosphere; }
  S.flags.japanSettled = true;
}

// ------------------------------------------------------------ 投降特例
function onCapitulate(S, tag, main) {
  const A = mkApi(S);
  const westMain = ['ENG', 'USA', 'FRA', 'SOV', 'CAN', 'AST', 'CHI'].includes(main);
  if (tag === 'FRA' && (main === 'GER' || main === 'ITA') && S.set.hist && !S.flags.vichy) {
    S.flags.vichy = true;
    // 敦克爾克大撤退：歐陸上的英法聯軍撤回英國
    const lon = A.rid('eng_london');
    for (const u of S.units) {
      if (u.dead || u.n >= R || !isLandUnit(u)) continue;
      if (!['ENG', 'CAN', 'AST', 'NZL', 'SAF', 'RAJ', 'FRA', 'POL'].includes(u.c)) continue;
      if (!['FRA', 'BEL', 'NLD', 'LUX', 'DEU'].includes(nodes[u.n].mod)) continue;
      if (u.c === 'FRA' && S.ctrl[u.n] !== 'FRA' && Math.random() < 0.5) { u.dead = true; continue; }
      u.n = lon; u.path = []; u.prog = 0; u.org = 0; u.hp = Math.max(20, u.hp - 35);
      if (u.c === 'FRA') u.c = 'FRA';
    }
    for (const u of S.units) if (u.c === 'FRA' && !u.dead) { const c = S.ctrl[u.n] ?? null; if (u.n < R && c !== 'FRA' && u.n !== lon && !friendly(S, 'FRA', c)) u.dead = true; }
    for (let r = 0; r < R; r++) if (S.own[r] === 'FRA' && S.ctrl[r] !== 'FRA' && atWar(S, S.ctrl[r], 'FRA')) S.own[r] = S.ctrl[r];
    const remaining = A.regionsOf('FRA');
    const free = remaining.filter(r => FREE_FRANCE.includes(nodes[r].id));
    const vichy = remaining.filter(r => !free.includes(r));
    if (vichy.length) {
      const capR = vichy.find(r => nodes[r].id === 'fra_massif') ?? vichy[0];
      // 先把位於維琪領土與海上的法軍轉給維琪，再建國（避免被當成敵軍驅離）
      const vset = new Set(vichy);
      for (const u of S.units) {
        if (u.c !== 'FRA' || u.dead) continue;
        if (vset.has(u.n)) u.c = 'VIC';
        else if (u.n >= R) { if (isLandUnit(u)) u.dead = true; else if (!nodes[u.n].landNb.some(l => S.ctrl[l] === 'ENG')) u.c = 'VIC'; }
      }
      createCountry(S, 'VIC', vichy, { ideo: 'fas', units: 0, core: false });
      S.C.VIC.cap = capR;
      for (const u of S.units) if (u.c === 'VIC') { u.path = []; u.prog = 0; }
      for (const r of vichy) S.core[r] = 'FRA';
    }
    if (free.length) {
      S.C.FRA.name = '自由法國'; S.C.FRA.cap = free.find(r => nodes[r].id === 'fra_brazzaville') ?? free[0];
      A.units('FRA', { inf: 2 }, S.C.FRA.cap);
    } else {
      killCountry(S, 'FRA', main);
    }
    A.news('法國戰敗。貝當元帥簽署停戰協定，在維琪成立「法蘭西國」；戴高樂將軍在倫敦發表演說，號召「自由法國」繼續抵抗。');
    for (let r = 0; r < R; r++) relocateHostile(S, r);
    return true;
  }
  if (tag === 'GER' && westMain && S.set.hist) {
    A.news('德國無條件投降，歐洲戰事結束。德國被盟國分區佔領，奧得-尼斯河以東領土劃歸波蘭與蘇聯。');
    for (const e of [...enemySet(S, 'GER')]) delete S.wars[[e, 'GER'].sort().join('|')];
    S.wv++;
    germanSettlement(S, A);
    S.flags.vEDay = S.day;
    return true;
  }
  if (tag === 'JAP' && westMain && S.set.hist) {
    A.news('日本宣布無條件投降，第二次世界大戰結束。朝鮮半島以北緯 38 度線分由蘇美佔領，臺灣與滿洲歸還中國。');
    japanSettlement(S, A);
    S.flags.vjDay = S.day;
    return true;
  }
  if (tag === 'ITA' && ['ENG', 'USA', 'FRA'].includes(main) && S.set.hist) {
    // 義大利戰敗：保留本土、失去殖民地，成為民主國家
    for (const e of [...enemySet(S, 'ITA')]) makePeace(S, 'ITA', e, 'status', { silent: true });
    for (let r = 0; r < R; r++) if (S.core[r] === 'ITA' && nodes[r].mod === 'ITA') transferRegion(S, r, 'ITA');
    leaveFaction(S, 'ITA', true);
    S.C.ITA.ideo = 'dem';
    A.news('義大利投降。法西斯政權垮台，義大利成為盟軍的共同交戰國。');
    return true;
  }
  if (tag === 'YUG' && (main === 'GER' || main === 'ITA') && S.set.hist) {
    S.flags.yugFallen = true;
    return false; // 走一般流程，之後由事件建立克羅埃西亞
  }
  return false;
}

// ------------------------------------------------------------ 事件定義
// kind: war（歷史戰爭，關閉歷史模式時略過）、struct（結構性）、news（新聞）
const E = [];
const ev = (o) => { E.push(o); return o; };

// ===== 1936 =====
ev({ id: 'rhineland', date: '1936-03-07', kind: 'news', title: '萊茵蘭再軍事化', cond: A => A.exists('GER'),
  text: '德軍進入依《凡爾賽條約》劃為非軍事區的萊茵蘭，英法未作出軍事回應。', fire: A => { A.S.C.GER.pp += 20; A.S.tension += 3; } });
ev({ id: 'ethiopia_annex', date: '1936-05-05', until: '1937-12-31', kind: 'war', title: '義大利佔領阿迪斯阿貝巴', cond: A => A.exists('ETH') && A.ctrls('ITA', 'eth_addis'),
  text: '義大利軍隊攻入阿迪斯阿貝巴，海爾·塞拉西一世流亡英國。墨索里尼宣布成立義屬東非帝國。', fire: A => A.annex('ETH', 'ITA') });
ev({ id: 'spanish_civil_war', date: '1936-07-17', kind: 'war', title: '西班牙內戰爆發',
  cond: A => A.exists('SPR') && A.owns('SPR', 'spa_seville') && !A.exists('SPA'),
  text: '佛朗哥將軍率領駐摩洛哥部隊發動政變，國民軍與共和政府爆發全面內戰。德義兩國支援國民軍，蘇聯援助共和派，數萬名國際縱隊志願者奔赴西班牙。',
  fire: A => {
    A.create('SPA', ['spa_seville', 'spa_granada', 'spa_galicia', 'spa_valladolid', 'spa_zaragoza', 'spa_morocco', 'spa_riodeoro', 'spa_badajoz'], { ideo: 'fas', from: 'SPR', units: 6 });
    A.S.C.SPA.cap = A.rid('spa_valladolid');
    A.units('SPA', { inf: 5, arm: 3, ftr: 1 }, 'spa_seville');
    A.units('SPA', { inf: 3 }, 'spa_valladolid');
    A.S.C.SPA.mods.att += 0.2; A.S.C.SPA.mods.def += 0.1; A.S.C.SPA.capMod = 0.5;
    A.tempMod('SPR', 'att', -0.2, 900); A.tempMod('SPR', 'def', -0.1, 900);
    A.war('SPA', 'SPR', { limited: true }); A.civil('SPA', 'SPR');
    A.lend('GER', 'SPA', 0.1); A.lend('ITA', 'SPA', 0.12); A.lend('SOV', 'SPR', 0.05);
  } });
ev({ id: 'axis_1936', date: '1936-10-25', kind: 'news', title: '柏林-羅馬軸心', cond: A => A.exists('GER') && A.exists('ITA'), text: '德義兩國簽訂合作協議，墨索里尼稱之為「柏林-羅馬軸心」。' });
ev({ id: 'anticomintern', date: '1936-11-25', kind: 'news', title: '反共產國際協定', cond: A => A.exists('GER') && A.exists('JAP'), text: '德國與日本簽訂《反共產國際協定》，次年義大利加入。' });
ev({ id: 'xian', date: '1936-12-12', kind: 'news', title: '西安事變', cond: A => A.exists('CHI') && A.exists('PRC'),
  text: '張學良、楊虎城在西安扣押蔣中正，促成停止內戰、一致抗日，第二次國共合作由此展開。', fire: A => A.nap('CHI', 'PRC', 10) });

// ===== 1937 =====
ev({ id: 'marco_polo', date: '1937-07-07', kind: 'war', title: '盧溝橋事變', who: 'JAP',
  cond: A => A.exists('JAP') && A.exists('CHI') && !A.atWar('JAP', 'CHI'),
  text: '日軍藉口士兵失蹤，在北平西南的盧溝橋與中國守軍爆發衝突。是否全面進攻中國？',
  opts: [
    { t: '全面侵華（歷史）', fx: A => { A.war('JAP', 'CHI'); if (A.exists('PRC')) A.setWar('JAP', 'PRC'); if (A.exists('MAN')) { A.setWar('MAN', 'CHI'); if (A.exists('PRC')) A.setWar('MAN', 'PRC'); } A.news('中國全面抗戰爆發，國共兩黨共同對日作戰。'); } },
    { t: '就地停火，避免擴大', fx: A => { A.S.tension = Math.max(0, A.S.tension - 5); A.news('日本政府決定就地解決事變。'); } },
  ] });
ev({ id: 'shanghai', date: '1937-08-13', kind: 'news', title: '淞滬會戰', cond: A => A.atWar('JAP', 'CHI'), text: '中日兩軍在上海展開激戰，歷時三個月，雙方投入近百萬兵力。' });
ev({ id: 'nanjing', date: '1937-11-01', until: '1940-12-31', kind: 'news', title: '南京淪陷', cond: A => A.atWar('JAP', 'CHI') && A.ctrls('JAP', 'chi_nanjing'),
  text: '日軍攻陷中華民國首都南京。其後數週間，日軍對南京平民與戰俘進行大規模屠殺與暴行，史稱「南京大屠殺」。國民政府西遷重慶，堅持抗戰。',
  fire: A => { if (A.ctrls('CHI', 'chi_chongqing')) A.S.C.CHI.cap = A.rid('chi_chongqing'); } });

// ===== 1938 =====
ev({ id: 'anschluss', date: '1938-03-11', kind: 'war', title: '德奧合併', who: 'GER',
  cond: A => A.exists('GER') && A.exists('AUS') && !A.atWar('GER', 'AUS'),
  text: '希特勒向奧地利施壓，要求讓奧地利納粹黨掌權並與德國合併。',
  opts: [{ t: '要求合併（歷史）', fx: A => A.flag('anschluss_demand') }, { t: '放棄要求', fx: () => {} }] });
ev({ id: 'anschluss_aus', date: '1938-03-11', until: '1938-12-31', kind: 'war', title: '德國的最後通牒', who: 'AUS',
  cond: A => A.has('anschluss_demand') && A.exists('AUS'),
  text: '德國要求奧地利接受合併。德軍已在邊境集結。',
  opts: [
    { t: '接受合併（歷史）', fx: A => { A.annex('AUS', 'GER'); A.news('德軍開進奧地利，德奧合併完成。'); A.S.tension += 5; } },
    { t: '武力抵抗！', fx: A => A.war('GER', 'AUS') },
  ] });
ev({ id: 'munich', date: '1938-09-20', kind: 'war', title: '蘇台德危機', who: 'GER',
  cond: A => A.exists('GER') && A.exists('CZE') && A.owns('CZE', 'cze_sudeten') && !A.atWar('GER', 'CZE'),
  text: '德國以保護蘇台德區日耳曼人為由，要求捷克斯洛伐克割讓蘇台德區。',
  opts: [{ t: '提出要求（歷史）', fx: A => A.flag('sudeten_demand') }, { t: '放棄', fx: () => {} }] });
ev({ id: 'munich_cze', date: '1938-09-20', until: '1939-06-30', kind: 'war', title: '慕尼黑協定', who: 'CZE',
  cond: A => A.has('sudeten_demand') && A.exists('CZE') && A.owns('CZE', 'cze_sudeten'),
  text: '英、法、德、義四國在慕尼黑達成協議，要求捷克斯洛伐克將蘇台德區割讓給德國。英法表示不會支持捷克斯洛伐克抵抗。',
  opts: [
    { t: '被迫接受（歷史）', fx: A => { A.give(['cze_sudeten'], 'GER'); A.news('慕尼黑協定簽署，張伯倫宣稱帶回了「我們時代的和平」。'); A.S.tension += 6; } },
    { t: '拒絕並動員抵抗', fx: A => A.war('GER', 'CZE', { limited: true }) },
  ] });
ev({ id: 'kristallnacht', date: '1938-11-09', kind: 'news', title: '水晶之夜', cond: A => A.exists('GER'),
  text: '納粹德國各地爆發針對猶太人的大規模暴力迫害，猶太會堂與商店遭焚毀，數萬人被送往集中營。這是納粹系統性迫害的重大升級，最終演變為奪走約六百萬猶太人生命的大屠殺。' });

// ===== 1939 =====
ev({ id: 'czech_occupation', date: '1939-03-15', kind: 'war', title: '德國佔領捷克', who: 'GER',
  cond: A => A.exists('GER') && A.exists('CZE') && A.owns('GER', 'cze_sudeten') && !A.atWar('GER', 'CZE'),
  text: '斯洛伐克在德國支持下宣布獨立，德軍隨即開進布拉格，建立波希米亞-摩拉維亞保護國。',
  opts: [
    { t: '佔領捷克（歷史）', fx: A => {
      A.create('SLO', ['svk_bratislava', 'svk_kosice'], { ideo: 'fas', from: 'CZE', units: 2, subj: 'GER' });
      A.give(['cze_ruthenia'], 'HUN', { onlyFrom: 'CZE' });
      A.annex('CZE', 'GER'); A.S.tension += 8;
    } },
    { t: '暫緩行動', fx: () => {} },
  ] });
ev({ id: 'guarantee_pol', date: '1939-03-31', kind: 'war', title: '英法保證波蘭獨立', cond: A => A.exists('POL') && (A.exists('ENG') || A.exists('FRA')),
  text: '面對德國擴張，英國與法國公開保證波蘭的獨立，若波蘭遭受攻擊將提供援助。', fire: A => { A.guar('ENG', 'POL'); A.guar('FRA', 'POL'); } });
ev({ id: 'albania', date: '1939-04-07', kind: 'war', title: '義大利入侵阿爾巴尼亞', who: 'ITA',
  cond: A => A.exists('ITA') && A.exists('ALB') && !A.atWar('ITA', 'ALB'),
  text: '義大利軍隊在阿爾巴尼亞登陸，索古國王出逃。',
  opts: [{ t: '入侵（歷史）', fx: A => A.war('ITA', 'ALB', { limited: true }) }, { t: '取消行動', fx: () => {} }] });
ev({ id: 'guarantee_rom_gre', date: '1939-04-13', kind: 'war', title: '英法保證羅馬尼亞與希臘', cond: A => A.exists('ENG'),
  text: '英法將安全保證擴大至羅馬尼亞與希臘。', fire: A => { for (const t of ['ROM', 'GRE']) { A.guar('ENG', t); A.guar('FRA', t); } } });
ev({ id: 'spain_victory', date: '1939-04-01', until: '1941-12-31', kind: 'news', title: '西班牙內戰結束', cond: A => A.exists('SPA') && !A.exists('SPR'),
  text: '國民軍攻佔馬德里，佛朗哥宣布內戰結束，西班牙進入長達三十多年的獨裁統治。', fire: A => { A.rename('SPA', '西班牙'); for (const k of Object.keys(A.S.lend)) if (k.endsWith('>SPA')) delete A.S.lend[k]; } });
ev({ id: 'pact_of_steel', date: '1939-05-22', kind: 'war', title: '鋼鐵條約', cond: A => A.exists('GER') && A.exists('ITA') && !A.S.C.GER.fac,
  text: '德國與義大利簽訂軍事同盟《鋼鐵條約》，軸心國正式成形。', fire: A => { A.fac('axis', '軸心國', 'GER', A.S.C.ITA.fac ? [] : ['ITA']); if (A.exists('SLO')) A.join('SLO', 'axis'); } });
ev({ id: 'khalkhin_gol', date: '1939-05-11', kind: 'news', title: '諾門罕戰役', cond: A => A.exists('JAP') && A.exists('SOV'),
  text: '日蘇兩軍在蒙古與滿洲國邊境的哈拉哈河爆發激戰，朱可夫指揮的蘇蒙聯軍擊敗關東軍，日本此後轉向南進。' });
ev({ id: 'mr_pact', date: '1939-08-23', kind: 'war', title: '德蘇互不侵犯條約', who: 'SOV',
  cond: A => A.exists('GER') && A.exists('SOV') && !A.atWar('GER', 'SOV'),
  text: '德國外長里賓特洛甫與蘇聯外長莫洛托夫簽署互不侵犯條約，秘密議定書劃分了兩國在東歐的勢力範圍。',
  opts: [{ t: '簽署（歷史）', fx: A => { A.nap('GER', 'SOV', 10); A.flag('mr_pact'); } }, { t: '拒絕與德國妥協', fx: () => {} }] });
ev({ id: 'fall_weiss', date: '1939-09-01', kind: 'war', title: '白色方案：入侵波蘭', who: 'GER',
  cond: A => A.exists('GER') && A.exists('POL') && !A.atWar('GER', 'POL'),
  text: '德國捏造格萊維茨電台事件，準備對波蘭發動全面進攻。英法已承諾保證波蘭獨立。',
  opts: [
    { t: '入侵波蘭（歷史）', fx: A => { if (A.exists('SLO')) A.setWar('SLO', 'POL'); A.war('GER', 'POL', { solo: true }); A.news('第二次世界大戰在歐洲爆發。英國與法國對德宣戰。', 'major'); if (A.isAI('GER')) A.S.noAttack = { ...(A.S.noAttack || {}), GER: ['FRA', 'ENG', 'BEL', 'HOL', 'LUX', 'DEN', 'NOR'] }; } },
    { t: '維持和平', fx: () => {} },
  ] });
ev({ id: 'soviet_poland', date: '1939-09-17', until: '1939-12-31', kind: 'war', title: '蘇聯進軍波蘭東部', who: 'SOV',
  cond: A => A.has('mr_pact') && A.exists('SOV') && A.exists('POL') && A.atWar('GER', 'POL') && !A.atWar('SOV', 'POL'),
  text: '依據秘密議定書，紅軍越過邊界進入波蘭東部。',
  opts: [{ t: '進軍（歷史）', fx: A => { A.war('SOV', 'POL', { limited: true }); A.limit('SOV', 'POL', [...POL_EAST, 'pol_bialystok', 'pol_lublin'], []); } }, { t: '保持中立', fx: () => {} }] });
ev({ id: 'winter_war', date: '1939-11-30', kind: 'war', title: '冬季戰爭', who: 'SOV',
  cond: A => A.exists('SOV') && A.exists('FIN') && !A.atWar('SOV', 'FIN') && A.owns('FIN', 'fin_karelia'),
  text: '芬蘭拒絕割讓卡累利阿地峽，蘇聯發動進攻。芬蘭軍民在嚴寒中頑強抵抗。',
  opts: [{ t: '進攻芬蘭（歷史）', fx: A => { A.war('SOV', 'FIN', { limited: true }); A.limit('SOV', 'FIN', ['fin_karelia', 'fin_sortavala', 'fin_kuopio', 'fin_helsinki', 'fin_lapland'], []); } }, { t: '放棄', fx: () => {} }] });

// ===== 1940 =====
ev({ id: 'moscow_peace', date: '1940-01-10', until: '1941-06-01', kind: 'war', title: '莫斯科和約', who: 'FIN',
  cond: A => A.atWar('SOV', 'FIN') && A.exists('FIN') && (A.S.day >= strToDay('1940-03-12') || A.ctrls('SOV', 'fin_karelia') || A.ctrls('SOV', 'fin_helsinki')),
  text: '經過一百零五天的戰鬥，蘇聯提出和平條件：芬蘭須割讓卡累利阿地峽與拉多加湖北岸。',
  opts: [
    { t: '接受和約（歷史）', fx: A => { A.peace('SOV', 'FIN'); A.give(['fin_karelia', 'fin_sortavala'], 'SOV'); A.S.core[A.rid('fin_karelia')] = 'FIN'; } },
    { t: '繼續作戰', fx: () => {} },
  ] });
ev({ id: 'weserubung', date: '1940-04-09', kind: 'war', title: '威瑟堡行動', who: 'GER',
  cond: A => A.exists('GER') && A.exists('NOR') && A.atWar('GER', 'ENG') && !A.atWar('GER', 'NOR'),
  text: '為確保瑞典鐵礦經挪威的運輸線，德軍準備進攻丹麥與挪威。',
  opts: [{ t: '進攻（歷史）', fx: A => { A.war('GER', 'DEN', { solo: true }); A.war('GER', 'NOR', { solo: true }); if (A.S.noAttack && A.S.noAttack.GER) A.S.noAttack.GER = A.S.noAttack.GER.filter(t => t !== 'DEN' && t !== 'NOR'); } }, { t: '取消', fx: () => {} }] });
ev({ id: 'fall_gelb', date: '1940-05-10', kind: 'war', title: '黃色方案：西線攻勢', who: 'GER',
  cond: A => A.exists('GER') && A.atWar('GER', 'FRA') && (A.exists('BEL') || A.exists('HOL')) && !A.atWar('GER', 'BEL'),
  text: '德軍準備經由低地國家發動西線攻勢，主力將穿越阿登森林直取色當。',
  opts: [{ t: '發動攻勢（歷史）', fx: A => {
    for (const t of ['HOL', 'BEL', 'LUX']) A.war('GER', t, { solo: true });
    const S = A.S;
    if (S.noAttack) delete S.noAttack.GER;
    for (const t of ['FRA', 'BEL', 'HOL', 'LUX', 'ENG']) A.hurtUnits(t, u => u.n < R && nodes[u.n].mod !== 'GBR' && nodes[u.n].landNb.some(m => S.ctrl[m] === 'GER'), 0, 0.45);
    A.tempMod('GER', 'att', 0.15, 90); A.tempMod('GER', 'speed', 0.15, 90);
    A.news('德軍裝甲部隊穿越被認為無法通行的阿登森林，在色當突破法軍防線。', 'war');
  } }, { t: '暫緩', fx: () => {} }] });
ev({ id: 'dunkirk', date: '1940-05-26', until: '1940-07-01', kind: 'news', title: '敦克爾克大撤退', cond: A => A.atWar('GER', 'ENG') && A.ctrls('GER', 'fra_lille'),
  text: '英國動員數百艘軍民船隻，從敦克爾克海灘撤出三十多萬名英法士兵。邱吉爾宣示：「我們將戰鬥到底，絕不投降。」' });
ev({ id: 'italy_war', date: '1940-06-10', until: '1941-12-31', kind: 'war', title: '義大利參戰', who: 'ITA',
  cond: A => A.exists('ITA') && A.exists('FRA') && A.atWar('GER', 'FRA') && !A.atWar('ITA', 'FRA') && A.S.C.FRA.name !== '自由法國',
  text: '眼見法國即將崩潰，墨索里尼決定對英法宣戰。',
  opts: [{ t: '對英法宣戰（歷史）', fx: A => { A.war('ITA', 'FRA', { solo: true }); A.war('ITA', 'ENG', { solo: true }); } }, { t: '保持非交戰狀態', fx: () => {} }] });
for (const t of ['EST', 'LAT', 'LIT']) {
  ev({ id: 'baltic_' + t, date: '1940-06-15', until: '1941-06-01', kind: 'war', title: '蘇聯的最後通牒', who: t,
    cond: A => A.has('mr_pact') && A.exists('SOV') && A.exists(t) && !A.atWar('SOV', t) && !A.atWar('SOV', 'GER'),
    text: '蘇聯指控波羅的海國家違反互助條約，要求組建親蘇政府並允許紅軍進駐。',
    opts: [{ t: '屈服（歷史）', fx: A => { A.annex(t, 'SOV'); } }, { t: '抵抗！', fx: A => A.war('SOV', t, { limited: true }) }] });
}
ev({ id: 'bessarabia', date: '1940-06-28', until: '1941-06-01', kind: 'war', title: '比薩拉比亞危機', who: 'ROM',
  cond: A => A.has('mr_pact') && A.exists('ROM') && A.exists('SOV') && A.owns('ROM', 'rom_bessarabia') && !A.atWar('SOV', 'ROM'),
  text: '蘇聯要求羅馬尼亞割讓比薩拉比亞與北布科維納。',
  opts: [{ t: '割讓（歷史）', fx: A => A.give(['rom_bessarabia', 'rom_bukovina'], 'SOV') }, { t: '拒絕', fx: A => A.war('SOV', 'ROM', { limited: true }) }] });
ev({ id: 'battle_britain', date: '1940-07-10', kind: 'news', title: '不列顛空戰', cond: A => A.atWar('GER', 'ENG') && A.exists('ENG'),
  text: '德國空軍對英國展開大規模空襲，英國皇家空軍憑藉雷達網與噴火式戰機頑強迎戰。' });
ev({ id: 'indochina_japan', date: '1940-09-22', until: '1941-12-31', kind: 'war', title: '日本進駐法屬印度支那', who: 'VIC',
  cond: A => A.exists('VIC') && A.exists('JAP') && A.owns('VIC', 'fra_hanoi'),
  text: '日本要求維琪政府允許日軍進駐印度支那，以切斷援華通道。',
  opts: [{ t: '同意（歷史）', fx: A => A.give(INDOCHINA, 'JAP', { onlyFrom: 'VIC' }) }, { t: '拒絕', fx: A => A.war('JAP', 'VIC', { limited: true }) }] });
ev({ id: 'tripartite', date: '1940-09-27', kind: 'news', title: '三國同盟條約', cond: A => A.exists('GER') && A.exists('JAP'), text: '德國、義大利與日本在柏林簽署三國同盟條約，相互承認在歐洲與東亞建立「新秩序」的領導地位。' });
ev({ id: 'greece_italy', date: '1940-10-28', kind: 'war', title: '義大利入侵希臘', who: 'ITA',
  cond: A => A.exists('ITA') && A.exists('GRE') && !A.atWar('ITA', 'GRE') && A.exists('ALB') === false,
  text: '墨索里尼向希臘發出最後通牒，希臘總理梅塔克薩斯以一句「不」回應。',
  opts: [{ t: '進攻希臘（歷史）', fx: A => A.war('ITA', 'GRE', { solo: true }) }, { t: '取消', fx: () => {} }] });
for (const [t, d] of [['HUN', '1940-11-20'], ['ROM', '1940-11-23'], ['BUL', '1941-03-01']]) {
  ev({ id: 'axis_' + t, date: d, until: '1942-12-31', kind: 'war', title: `${t === 'HUN' ? '匈牙利' : t === 'ROM' ? '羅馬尼亞' : '保加利亞'}加入軸心國`, who: t,
    cond: A => A.exists(t) && A.S.fac.axis && !A.S.C[t].fac && !A.atWar(t, 'GER'),
    text: '德國邀請加入三國同盟。',
    opts: [{ t: '加入軸心國（歷史）', fx: A => A.join(t, 'axis') }, { t: '保持中立', fx: () => {} }] });
}

// ===== 1941 =====
ev({ id: 'marita', date: '1941-04-06', kind: 'war', title: '入侵南斯拉夫與希臘', who: 'GER',
  cond: A => A.exists('GER') && A.exists('YUG') && !A.atWar('GER', 'YUG'),
  text: '南斯拉夫發生反軸心政變，希特勒決定同時進攻南斯拉夫並援救在希臘受挫的義大利。',
  opts: [{ t: '發動攻勢（歷史）', fx: A => { A.war('GER', 'YUG'); if (A.exists('GRE')) A.war('GER', 'GRE', { solo: true }); } }, { t: '取消', fx: () => {} }] });
ev({ id: 'ndh', date: '1941-04-10', until: '1944-12-31', kind: 'war', title: '克羅埃西亞獨立國', cond: A => A.has('yugFallen') && !A.exists('CRO') && (A.owns('GER', 'yug_zagreb') || A.owns('ITA', 'yug_zagreb')),
  text: '南斯拉夫被瓜分，德義扶植烏斯塔沙政權建立「克羅埃西亞獨立國」。南斯拉夫各地隨即興起游擊抵抗運動。',
  fire: A => { A.create('CRO', ['yug_zagreb', 'yug_split', 'yug_sarajevo', 'yug_banjaluka'], { ideo: 'fas', onlyFrom: ['GER', 'ITA', 'HUN'], subj: 'GER', units: 2 }); if (A.S.fac.axis) A.join('CRO', 'axis'); } });
ev({ id: 'barbarossa', date: '1941-06-22', kind: 'war', title: '巴巴羅薩行動', who: 'GER',
  cond: A => A.exists('GER') && A.exists('SOV') && !A.atWar('GER', 'SOV'),
  text: '三百萬德軍及其盟軍沿著三千公里的戰線準備進攻蘇聯。史上規模最大的地面戰役即將開始。',
  opts: [
    { t: '發動進攻（歷史）', fx: A => {
      const S = A.S;
      delete S.C.GER.nap.SOV; delete S.C.SOV.nap.GER;
      A.war('GER', 'SOV');
      // 奇襲：邊境蘇軍組織度大減
      A.hurtUnits('SOV', u => u.n < R && nodes[u.n].landNb.some(m => S.ctrl[m] && atWar(S, S.ctrl[m], 'SOV')), 15, 0.3);
      A.tempMod('GER', 'att', 0.1, 150);
      A.news('德軍入侵蘇聯，東線戰爭爆發。蘇聯稱之為「偉大的衛國戰爭」。', 'major');
    } },
    { t: '維持德蘇條約', fx: () => {} },
  ] });
ev({ id: 'continuation_war', date: '1941-06-25', until: '1941-12-31', kind: 'war', title: '繼續戰爭', who: 'FIN',
  cond: A => A.exists('FIN') && A.atWar('GER', 'SOV') && !A.atWar('FIN', 'SOV'),
  text: '芬蘭決定與德國並肩作戰，收復冬季戰爭失去的領土。',
  opts: [{ t: '參戰（歷史）', fx: A => { A.war('FIN', 'SOV', { solo: true }); A.limit('FIN', 'SOV', ['fin_karelia', 'fin_sortavala', 'sov_karelia'], ['fin_karelia', 'fin_sortavala', 'fin_kuopio', 'fin_lapland']); } }, { t: '保持中立', fx: () => {} }] });
ev({ id: 'iran_invasion', date: '1941-08-25', until: '1942-12-31', kind: 'war', title: '英蘇入侵伊朗', who: 'ENG',
  cond: A => A.exists('ENG') && A.exists('SOV') && A.exists('PER') && A.atWar('GER', 'SOV') && !A.atWar('ENG', 'PER'),
  text: '為確保油田與對蘇援助走廊，英國與蘇聯聯合進軍伊朗。',
  opts: [{ t: '進軍（歷史）', fx: A => { A.war('ENG', 'PER', { limited: true }); A.setWar('SOV', 'PER'); A.puppet('ENG', 'PER'); A.puppet('SOV', 'PER'); } }, { t: '取消', fx: () => {} }] });
ev({ id: 'lend_lease', date: '1941-03-11', kind: 'war', title: '租借法案', cond: A => A.exists('USA') && A.atWar('GER', 'ENG') && A.exists('ENG'),
  text: '美國國會通過《租借法案》，「民主兵工廠」開始向同盟國提供大量物資。', fire: A => { if (A.isAI('USA')) A.lend('USA', 'ENG', 0.08); } });
ev({ id: 'lend_lease_sov', date: '1941-10-01', kind: 'war', title: '援蘇租借', cond: A => A.exists('USA') && A.atWar('GER', 'SOV') && A.exists('SOV'),
  text: '美英開始經北極航線與波斯走廊向蘇聯輸送物資。', fire: A => { if (A.isAI('USA')) A.lend('USA', 'SOV', 0.06); if (A.isAI('ENG')) A.lend('ENG', 'SOV', 0.03); } });
ev({ id: 'pearl_harbor', date: '1941-12-07', kind: 'war', title: '偷襲珍珠港', who: 'JAP',
  cond: A => A.exists('JAP') && A.exists('USA') && !A.atWar('JAP', 'USA'),
  text: '美國對日實施石油禁運。日本聯合艦隊航艦部隊已秘密駛向夏威夷，同時準備南下奪取東南亞資源。',
  opts: [
    { t: '發動奇襲（歷史）', fx: A => {
      const S = A.S;
      A.war('JAP', 'USA');
      if (A.exists('ENG')) A.war('JAP', 'ENG');
      if (A.exists('HOL')) A.war('JAP', 'HOL', { solo: true });
      if (S.fac.allies) A.join('USA', 'allies'); else A.fac('allies', '同盟國', 'USA', []);
      for (const u of S.units) if (u.c === 'USA' && !u.dead && u.n === A.rid('sea_hawaii')) u.hp = Math.max(10, u.hp - 60);
      A.news('日本海軍偷襲珍珠港，美國太平洋艦隊損失慘重。羅斯福總統稱這一天是「永遠活在恥辱中的日子」。美國對日宣戰。', 'major');
    } },
    { t: '繼續外交談判', fx: () => {} },
  ] });
ev({ id: 'germany_usa', date: '1941-12-11', until: '1942-12-31', kind: 'war', title: '德國對美宣戰', who: 'GER',
  cond: A => A.exists('GER') && A.exists('USA') && A.atWar('JAP', 'USA') && !A.atWar('GER', 'USA'),
  text: '珍珠港事件後四天，希特勒決定對美國宣戰。',
  opts: [{ t: '對美宣戰（歷史）', fx: A => A.war('GER', 'USA') }, { t: '避免與美國開戰', fx: () => {} }] });
ev({ id: 'thailand', date: '1941-12-21', until: '1942-12-31', kind: 'war', title: '日泰同盟', who: 'SIA',
  cond: A => A.exists('SIA') && A.exists('JAP') && A.atWar('JAP', 'ENG') && !A.S.C.SIA.fac,
  text: '日軍登陸泰國南部後，泰國政府選擇與日本結盟。',
  opts: [{ t: '與日本結盟（歷史）', fx: A => { if (A.S.fac.cosphere) A.join('SIA', 'cosphere'); A.war('SIA', 'ENG', { solo: true }); } }, { t: '保持中立', fx: () => {} }] });
ev({ id: 'ethiopia_restored', date: '1941-01-01', until: '1946-12-31', kind: 'war', title: '衣索比亞光復', cond: A => !A.exists('ETH') && ['ENG', 'SAF', 'RAJ'].includes(A.ctrl('eth_addis')),
  text: '英軍與衣索比亞愛國者擊敗義大利軍隊，海爾·塞拉西一世重返阿迪斯阿貝巴。',
  fire: A => { const regs = []; for (let r = 0; r < R; r++) if (A.S.core[r] === 'ETH' && A.S.ctrl[r] !== 'ITA') regs.push(r); A.create('ETH', regs, { ideo: 'neu', units: 2 }); if (A.S.fac.allies) A.join('ETH', 'allies'); for (const e of enemySet(A.S, 'ENG')) if (e === 'ITA') A.setWar('ETH', 'ITA'); } });

// ===== 1942 =====
ev({ id: 'mexico_war', date: '1942-05-22', until: '1945-01-01', kind: 'war', title: '墨西哥參戰', who: 'MEX', cond: A => A.exists('MEX') && A.atWar('GER', 'USA') && !A.atWar('MEX', 'GER'),
  text: '德國潛艇擊沉墨西哥油輪，墨西哥對軸心國宣戰。', opts: [{ t: '宣戰（歷史）', fx: A => { if (A.S.fac.allies) A.join('MEX', 'allies'); A.war('MEX', 'GER', { solo: true }); } }, { t: '保持中立', fx: () => {} }] });
ev({ id: 'midway', date: '1942-06-04', kind: 'news', title: '中途島海戰', cond: A => A.atWar('JAP', 'USA'), text: '美軍破譯日軍密碼，在中途島擊沉四艘日本航艦，太平洋戰爭的轉捩點。' });
ev({ id: 'brazil_war', date: '1942-08-22', until: '1945-01-01', kind: 'war', title: '巴西參戰', who: 'BRA', cond: A => A.exists('BRA') && A.atWar('GER', 'USA') && !A.atWar('BRA', 'GER'),
  text: '德國潛艇擊沉多艘巴西商船，巴西對德義宣戰。', opts: [{ t: '宣戰（歷史）', fx: A => { if (A.S.fac.allies) A.join('BRA', 'allies'); A.war('BRA', 'GER', { solo: true }); if (A.exists('ITA') && A.atWar('ITA', 'USA')) A.setWar('BRA', 'ITA'); } }, { t: '保持中立', fx: () => {} }] });
ev({ id: 'stalingrad', date: '1942-08-23', kind: 'news', title: '史達林格勒戰役', cond: A => A.atWar('GER', 'SOV') && A.exists('SOV'), text: '德軍進抵伏爾加河畔的史達林格勒，城市在激烈巷戰中化為廢墟。這場戰役最終成為東線戰爭的轉捩點。' });
ev({ id: 'torch', date: '1942-11-08', until: '1944-06-01', kind: 'war', title: '火炬行動', cond: A => A.exists('VIC') && A.exists('USA') && A.atWar('GER', 'USA') && A.owns('VIC', 'fra_algiers'),
  text: '美英聯軍在法屬北非登陸。維琪軍隊短暫抵抗後倒戈加入盟軍；德軍隨即佔領維琪法國本土並搶運部隊進入突尼西亞。',
  fire: A => {
    const S = A.S;
    const afr = A.regionsOf('VIC').filter(r => nodes[r].mod !== 'FRA' && !INDOCHINA.includes(nodes[r].id));
    if (A.exists('FRA')) A.give(afr, 'FRA'); else A.create('FRA', afr, { ideo: 'dem', units: 3 });
    if (S.fac.allies) A.join('FRA', 'allies');
    for (const e of ['GER', 'ITA']) if (A.exists(e)) A.setWar('FRA', e);
    const rest = A.regionsOf('VIC');
    if (A.exists('GER')) { for (const r of rest) if (nodes[r].mod === 'FRA') transferRegion(S, r, 'GER'); }
    if (A.exists('GER')) { A.give(['fra_tunis', 'fra_gabes'], 'GER'); A.units('GER', { inf: 3, arm: 1 }, 'fra_tunis'); }
    if (A.exists('VIC') && A.regionsOf('VIC').length === 0) killCountry(S, 'VIC', 'GER');
    if (A.isAI('USA')) { A.units('USA', { inf: 4, arm: 2 }, 'fra_algiers'); A.units('USA', { inf: 2 }, 'fra_rabat'); }
    if (A.isAI('ENG')) A.units('ENG', { inf: 2, arm: 1 }, 'fra_constantine');
  } });

// ===== 1943 =====
ev({ id: 'husky', date: '1943-07-10', until: '1944-06-01', kind: 'war', title: '赫斯基行動：西西里登陸', cond: A => A.exists('ITA') && A.atWar('ITA', 'USA') && A.ctrls('ITA', 'ita_sicily') && A.alliedCtrlAny('USA', ['fra_tunis', 'fra_gabes', 'ita_tripoli', 'fra_constantine']),
  text: '盟軍以空降與兩棲突擊攻入西西里島，墨索里尼政權搖搖欲墜。',
  fire: A => { if (A.isAI('USA')) A.invade('USA', 'ita_sicily', { inf: 3, arm: 1, mar: 1 }); if (A.isAI('ENG')) A.invade('ENG', 'ita_sicily', { inf: 3, arm: 1 }); } });
ev({ id: 'italy_armistice', date: '1943-09-08', until: '1945-05-01', kind: 'war', title: '卡西比爾停戰', who: 'ITA',
  cond: A => A.exists('ITA') && A.exists('GER') && (A.atWar('ITA', 'USA') || A.atWar('ITA', 'ENG')) && A.ctrlAny('USA', ['ita_sicily', 'ita_calabria', 'ita_naples', 'ita_sardinia', 'ita_bari']) + A.ctrlAny('ENG', ['ita_sicily', 'ita_calabria', 'ita_naples', 'ita_sardinia', 'ita_bari']) > 0,
  text: '墨索里尼被罷黜逮捕，巴多格里奧政府秘密與盟軍談判停戰。德軍已準備接管義大利。',
  opts: [
    { t: '簽署停戰並倒戈（歷史）', fx: A => {
      const S = A.S;
      for (const e of [...enemySet(S, 'ITA')]) A.peace('ITA', e, 'white');
      A.leave('ITA');
      const north = NORTH_ITALY.map(A.rid).filter(r => S.own[r] === 'ITA');
      const rsi = createCountry(S, 'RSI', north, { ideo: 'fas', units: 0, subj: 'GER', core: false });
      if (rsi) { rsi.cap = A.rid('ita_milan'); if (S.fac.axis) A.join('RSI', 'axis'); }
      for (const u of S.units) if (u.c === 'ITA' && !u.dead && north.includes(u.n)) u.c = 'RSI';
      A.units('GER', { inf: 4, arm: 1 }, 'ita_rome');
      for (const r of north) S.ctrl[r] = 'RSI';
      S.C.ITA.ideo = 'dem';
      if (S.fac.allies) A.join('ITA', 'allies');
      A.war('GER', 'ITA');
      if (A.exists('RSI')) A.setWar('RSI', 'ITA');
      A.news('義大利宣布停戰並對德宣戰。德軍佔領北義與羅馬，扶植墨索里尼建立「義大利社會共和國」。', 'major');
    } },
    { t: '與德國並肩戰鬥到底', fx: () => {} },
  ] });
ev({ id: 'tehran', date: '1943-11-28', kind: 'news', title: '德黑蘭會議', cond: A => A.exists('USA') && A.exists('SOV') && A.atWar('GER', 'SOV'), text: '羅斯福、邱吉爾與史達林首次會面，決定於 1944 年在法國開闢第二戰場。' });
ev({ id: 'cairo', date: '1943-11-27', kind: 'news', title: '開羅宣言', cond: A => A.exists('CHI') && A.atWar('JAP', 'USA'), text: '中美英三國發表《開羅宣言》，聲明日本竊取自中國的滿洲、臺灣與澎湖應歸還中國，並使朝鮮自由獨立。' });

// ===== 1944 =====
ev({ id: 'overlord', date: '1944-06-06', until: '1945-06-01', kind: 'war', title: '霸王行動：諾曼第登陸', cond: A => A.exists('GER') && A.atWar('GER', 'USA') && !A.alliedCtrlAny('USA', ['fra_normandy']) && A.ctrl('fra_normandy') && A.atWar(A.ctrl('fra_normandy'), 'USA'),
  text: 'D日：十五萬盟軍在諾曼第五處海灘搶灘登陸，開闢西歐第二戰場。',
  fire: A => {
    if (A.isAI('USA')) A.invade('USA', 'fra_normandy', { inf: 4, arm: 2, mar: 2 }, 'sea_channel');
    if (A.isAI('ENG')) A.invade('ENG', 'fra_normandy', { inf: 3, arm: 2 }, 'sea_channel');
    if (A.isAI('CAN')) A.invade('CAN', 'fra_normandy', { inf: 2 }, 'sea_channel');
    if (A.isAI('USA')) A.units('USA', { ftr: 3, bmb: 2 }, 'eng_london');
  } });
ev({ id: 'bagration', date: '1944-06-22', kind: 'news', title: '巴格拉季昂行動', cond: A => A.atWar('GER', 'SOV'), text: '紅軍在白俄羅斯發動夏季大攻勢，德軍中央集團軍群幾乎全軍覆沒。' });
ev({ id: 'dragoon', date: '1944-08-15', until: '1945-03-01', kind: 'war', title: '龍騎兵行動', cond: A => A.exists('GER') && A.atWar('GER', 'USA') && A.ctrl('fra_marseille') && A.atWar(A.ctrl('fra_marseille'), 'USA'),
  text: '美法聯軍在法國南部普羅旺斯海岸登陸。', fire: A => { if (A.isAI('USA')) A.invade('USA', 'fra_marseille', { inf: 3, arm: 1 }, 'sea_westmed'); if (A.isAI('FRA')) A.invade('FRA', 'fra_marseille', { inf: 2 }, 'sea_westmed'); } });
ev({ id: 'warsaw_uprising', date: '1944-08-01', kind: 'news', title: '華沙起義', cond: A => A.ctrls('GER', 'pol_warsaw') && A.atWar('GER', 'SOV'), text: '波蘭家鄉軍在華沙起義，經六十三天血戰後失敗，華沙幾乎被夷為平地。' });
ev({ id: 'romania_switch', date: '1944-08-23', until: '1945-05-01', kind: 'war', title: '羅馬尼亞倒戈', who: 'ROM',
  cond: A => A.exists('ROM') && A.atWar('ROM', 'SOV') && A.ctrlAny('SOV', ['rom_bessarabia', 'rom_moldavia', 'rom_bukovina', 'rom_dobruja', 'rom_bucharest', 'rom_ploiesti', 'sov_odessa']),
  text: '紅軍逼近國境，米哈伊一世國王發動政變逮捕安東內斯庫，準備轉投同盟國。',
  opts: [{ t: '倒戈（歷史）', fx: A => { const S = A.S; for (const e of [...enemySet(S, 'ROM')]) A.peace('ROM', e, 'white'); A.leave('ROM'); A.give(['rom_bessarabia', 'rom_bukovina'], 'SOV'); A.war('ROM', 'GER', { solo: true }); } }, { t: '繼續作戰', fx: () => {} }] });
ev({ id: 'bulgaria_switch', date: '1944-09-08', until: '1945-05-01', kind: 'war', title: '保加利亞政變', who: 'BUL',
  cond: A => A.exists('BUL') && A.S.C.BUL.fac === 'axis' && A.exists('SOV') && (A.exists('ROM') && !A.atWar('ROM', 'SOV')),
  text: '紅軍進抵多瑙河，保加利亞祖國陣線發動政變，對德宣戰。',
  opts: [{ t: '對德宣戰（歷史）', fx: A => { const S = A.S; for (const e of [...enemySet(S, 'BUL')]) A.peace('BUL', e, 'white'); A.leave('BUL'); A.war('BUL', 'GER', { solo: true }); } }, { t: '堅守軸心', fx: () => {} }] });
ev({ id: 'finland_armistice', date: '1944-09-19', until: '1945-12-31', kind: 'war', title: '莫斯科停戰協定', who: 'FIN',
  cond: A => A.exists('FIN') && A.atWar('FIN', 'SOV'),
  text: '蘇軍突破卡累利阿防線，芬蘭尋求停戰，條件是割讓卡累利阿並驅逐境內德軍。',
  opts: [{ t: '接受停戰（歷史）', fx: A => { A.peace('FIN', 'SOV'); A.give(['fin_karelia', 'fin_sortavala'], 'SOV'); } }, { t: '繼續作戰', fx: () => {} }] });
ev({ id: 'leyte', date: '1944-10-20', until: '1945-08-01', kind: 'war', title: '雷伊泰灣登陸', cond: A => A.exists('JAP') && A.atWar('JAP', 'USA') && A.ctrls('JAP', 'usa_visayas'),
  text: '麥克阿瑟兌現「我將回來」的承諾，美軍在菲律賓雷伊泰島登陸；雷伊泰灣海戰成為史上規模最大的海戰。', fire: A => { if (A.isAI('USA')) A.invade('USA', 'usa_visayas', { inf: 3, mar: 2, arm: 1 }); } });

// ===== 1945 =====
ev({ id: 'yalta', date: '1945-02-04', kind: 'news', title: '雅爾達會議', cond: A => A.exists('USA') && A.exists('SOV'), text: '三巨頭在克里米亞的雅爾達決定戰後德國分區佔領、波蘭邊界西移，蘇聯承諾在歐戰結束後三個月內對日作戰。' });
ev({ id: 'iwojima', date: '1945-02-19', until: '1945-08-14', kind: 'war', title: '硫磺島戰役', cond: A => A.exists('JAP') && A.atWar('JAP', 'USA') && A.ctrls('JAP', 'jap_iwojima'),
  text: '美國海軍陸戰隊登陸硫磺島，經過五週血戰攻佔全島。', fire: A => { if (A.isAI('USA')) A.invade('USA', 'jap_iwojima', { mar: 3 }); } });
ev({ id: 'okinawa', date: '1945-04-01', until: '1945-08-14', kind: 'war', title: '沖繩戰役', cond: A => A.exists('JAP') && A.atWar('JAP', 'USA') && A.ctrls('JAP', 'jap_okinawa'),
  text: '美軍登陸沖繩，戰鬥持續近三個月，大量沖繩平民在戰火中喪生。', fire: A => { if (A.isAI('USA')) A.invade('USA', 'jap_okinawa', { inf: 3, mar: 2, arm: 1 }); } });
ev({ id: 'trinity', date: '1945-07-16', kind: 'war', title: '三位一體核試', cond: A => A.exists('USA') && (A.S.C.USA.tech.nuc || 0) < 1 && (A.S.C.USA.tech.ind || 0) >= 3,
  text: '曼哈頓計畫在新墨西哥州沙漠成功引爆人類第一枚原子彈。奧本海默引述《薄伽梵歌》：「我成了死神，世界的毀滅者。」', fire: A => { A.tech('USA', 'nuc', 1); A.S.C.USA.nukes += 2; } });
ev({ id: 'hiroshima', date: '1945-08-06', until: '1946-12-31', kind: 'war', title: '原子彈', who: 'USA',
  cond: A => A.exists('JAP') && A.atWar('JAP', 'USA') && (A.S.C.USA.nukes || 0) >= 1 && A.ctrls('JAP', 'jap_hiroshima'),
  text: '美國已擁有原子彈。軍方評估登陸日本本土可能造成大量傷亡，杜魯門總統必須做出決定。',
  opts: [
    { t: '使用原子彈（歷史）', fx: A => {
      const S = A.S;
      nukeStrike(S, 'USA', A.rid('jap_hiroshima'));
      A.news('1945年8月6日，原子彈「小男孩」摧毀廣島，當年約十四萬人因此喪生。三天後，長崎遭第二枚原子彈轟炸，約七萬四千人喪生。核武的恐怖從此籠罩人類。', 'nuke');
      if (S.C.USA.nukes > 0 && A.ctrls('JAP', 'jap_fukuoka')) nukeStrike(S, 'USA', A.rid('jap_fukuoka'));
      A.flag('hiroshima');
      if (A.exists('JAP')) A.S.C.JAP.capMod = 1.6;
    } },
    { t: '不使用，繼續常規作戰', fx: A => A.flag('no_bomb') },
  ] });
ev({ id: 'august_storm', date: '1945-08-08', until: '1946-12-31', kind: 'war', title: '八月風暴行動', who: 'SOV',
  cond: A => A.exists('SOV') && A.exists('JAP') && !A.atWar('SOV', 'JAP') && (!A.exists('GER') || !A.atWar('GER', 'SOV')) && A.atWar('JAP', 'USA'),
  text: '依照雅爾達協議，蘇聯對日宣戰，百萬紅軍攻入滿洲。',
  opts: [{ t: '對日宣戰（歷史）', fx: A => { A.war('SOV', 'JAP'); if (A.exists('MAN')) A.setWar('SOV', 'MAN'); } }, { t: '保持中立', fx: () => {} }] });
ev({ id: 'japan_surrender', date: '1945-08-14', until: '1947-12-31', kind: 'war', title: '玉音放送', who: 'JAP',
  cond: A => A.exists('JAP') && A.atWar('JAP', 'USA') && (A.has('hiroshima') || (A.S.C.JAP.surrender || 0) > 0.3) && (A.atWar('JAP', 'SOV') || A.has('hiroshima')),
  text: '原子彈與蘇聯參戰使日本陷入絕境。是否接受《波茨坦宣言》無條件投降？',
  opts: [
    { t: '接受無條件投降（歷史）', fx: A => { A.news('8月15日，昭和天皇廣播宣布接受《波茨坦宣言》。9月2日，日本在美艦密蘇里號上簽署降書，第二次世界大戰結束。', 'major'); japanSettlement(A.S, A); A.flag('vjDay', A.S.day); } },
    { t: '本土決戰', fx: () => {} },
  ] });
ev({ id: 'axis_collapse', date: '1944-01-01', until: '1949-12-31', kind: 'war', title: '軸心國附庸的終局', cond: A => A.has('germanySettled') && ['HUN', 'BUL', 'ROM', 'FIN', 'RSI', 'VIC', 'CRO', 'SLO', 'SIA'].some(t => A.exists(t) && enemySet(A.S, t).size > 0),
  text: '德國投降後，殘餘的軸心國盟友相繼停戰。',
  fire: A => {
    const S = A.S;
    for (const t of ['HUN', 'BUL', 'ROM', 'FIN', 'SIA']) if (A.exists(t)) { for (const e of [...enemySet(S, t)]) A.peace(t, e, 'white'); A.leave(t); }
    if (A.exists('RSI')) A.annex('RSI', A.exists('ITA') ? 'ITA' : 'USA');
    if (A.exists('VIC')) A.annex('VIC', A.exists('FRA') ? 'FRA' : 'USA');
    if (A.exists('CRO')) A.annex('CRO', A.exists('YUG') ? 'YUG' : 'SOV');
    if (A.exists('SLO')) A.annex('SLO', A.exists('CZE') ? 'CZE' : 'SOV');
  } });
ev({ id: 'un', date: '1945-10-24', kind: 'news', title: '聯合國成立', cond: A => A.exists('USA'), text: '《聯合國憲章》生效，聯合國正式成立，以維護國際和平與安全為宗旨。' });

// ===== 戰後過渡（僅在盟國獲勝時） =====
ev({ id: 'postwar_restore', date: '1945-06-01', until: '1950-12-31', kind: 'struct', title: '戰後重建', cond: A => A.has('germanySettled') && !A.has('postwar'),
  text: '歐洲各被佔領國恢復獨立，數百萬難民踏上歸鄉之路。',
  fire: A => {
    A.flag('postwar');
    const S = A.S;
    // 伊朗恢復
    if (!A.exists('PER')) { const regs = []; for (let r = 0; r < R; r++) if (S.core[r] === 'PER') regs.push(r); A.create('PER', regs, { ideo: 'neu' }); }
    else { S.C.PER.subj = null; A.leave('PER'); for (let r = 0; r < R; r++) if (S.core[r] === 'PER' && S.own[r] !== 'PER') transferRegion(S, r, 'PER'); }
    // 東歐共產化
    for (const t of ['POL', 'HUN', 'ROM', 'BUL', 'ALB', 'YUG', 'CZE']) {
      if (!A.exists(t)) continue;
      const cap = S.C[t].cap;
      const near = nodes[cap].landNb.some(m => S.own[m] === 'SOV') || ['POL', 'HUN', 'ROM', 'BUL', 'ALB', 'YUG'].includes(t);
      if (near) { A.ideo(t, 'com'); A.leave(t); }
    }
  } });
ev({ id: 'iron_curtain', date: '1946-03-05', kind: 'struct', title: '鐵幕演說', cond: A => A.exists('USA') && A.exists('SOV') && !A.atWar('USA', 'SOV'),
  text: '邱吉爾在美國富爾頓演說：「從波羅的海的什切青到亞得里亞海的的里雅斯特，一幅橫貫歐洲大陸的鐵幕已經降落。」冷戰拉開序幕。',
  fire: A => {
    const S = A.S;
    if (S.fac.allies) { S.fac.allies.name = '西方陣營'; if (A.exists('USA') && S.fac.allies.members.includes('USA')) S.fac.allies.leader = 'USA'; for (const m of [...S.fac.allies.members]) if (A.S.C[m].ideo === 'com') A.leave(m); }
    if (!S.fac.comintern) A.fac('comintern', '共產陣營', 'SOV', []);
    else S.fac.comintern.name = '共產陣營';
    for (const t of ['POL', 'HUN', 'ROM', 'BUL', 'ALB', 'CZE', 'MON']) if (A.exists(t) && S.C[t].ideo === 'com') A.join(t, 'comintern');
  } });
ev({ id: 'czech_coup', date: '1948-02-25', kind: 'struct', title: '捷克斯洛伐克二月事件', cond: A => A.exists('CZE') && A.exists('SOV'), text: '捷克斯洛伐克共產黨奪取政權。', fire: A => { A.ideo('CZE', 'com'); if (A.S.fac.comintern) A.join('CZE', 'comintern'); } });
ev({ id: 'chinese_civil_war', date: '1946-06-26', until: '1949-12-31', kind: 'war', title: '國共內戰', who: 'PRC',
  cond: A => A.exists('CHI') && A.exists('PRC') && !A.atWar('CHI', 'PRC') && !A.atWar('CHI', 'JAP'),
  text: '抗戰勝利不到一年，國共和談破裂，內戰全面爆發。',
  opts: [{ t: '全面內戰（歷史）', fx: A => {
    const S = A.S;
    delete S.C.CHI.nap.PRC; delete S.C.PRC.nap.CHI;
    // 蘇聯將滿洲移交共軍
    for (let r = 0; r < R; r++) if (S.own[r] === 'SOV' && S.core[r] === 'CHI') transferRegion(S, r, 'PRC');
    A.units('PRC', { inf: 8 }, 'prc_yanan');
    const mr = A.regionsOf('PRC').filter(r => nodes[r].id.startsWith('man_'));
    if (mr.length) A.units('PRC', { inf: 6, arm: 1 }, mr[0]);
    A.S.C.PRC.mods.att += 0.25; A.S.C.PRC.mods.def += 0.1;
    A.units('PRC', { inf: 10 }, 'prc_yanan');
    A.tempMod('CHI', 'att', -0.35, 1300); A.tempMod('CHI', 'def', -0.3, 1300);
    for (const u of A.S.units) if (u.c === 'CHI' && !u.dead && u.n < R && nodes[u.n].mod === 'CHN' && Math.random() < 0.3) u.c = 'PRC';
    A.war('PRC', 'CHI', { limited: true }); A.civil('PRC', 'CHI');
    A.lend('SOV', 'PRC', 0.04); A.lend('USA', 'CHI', 0.03);
  } }, { t: '維持國共和平', fx: () => {} }] });
ev({ id: 'india_partition', date: '1947-08-15', kind: 'struct', title: '印巴分治', cond: A => A.exists('RAJ'),
  text: '英屬印度依宗教分為印度與巴基斯坦兩國獨立。分治引發大規模遷徙與暴力衝突，約一千五百萬人流離失所，數十萬人死亡。',
  fire: A => {
    const S = A.S;
    const pak = PAK_REGIONS.map(A.rid).filter(r => S.own[r] === 'RAJ');
    const ind = A.regionsOf('RAJ').filter(r => !pak.includes(r));
    A.create('PAK', pak, { ideo: 'neu', from: 'RAJ' });
    A.create('IND', ind, { ideo: 'dem', from: 'RAJ' });
    for (const u of S.units) if (u.c === 'RAJ' && !u.dead) u.c = pak.includes(u.n) ? 'PAK' : 'IND';
    if (A.exists('RAJ')) killCountry(S, 'RAJ', 'IND');
  } });
ev({ id: 'kashmir_1947', date: '1947-10-22', kind: 'war', title: '第一次印巴戰爭', who: 'PAK', cond: A => A.exists('PAK') && A.exists('IND') && !A.atWar('PAK', 'IND'),
  text: '喀什米爾土邦歸屬未定，部落武裝在巴基斯坦支持下攻入喀什米爾。', opts: [{ t: '進軍喀什米爾（歷史）', fx: A => { A.war('PAK', 'IND', { limited: true }); A.limit('PAK', 'IND', ['raj_kashmir'], ['raj_kashmir']); } }, { t: '放棄', fx: () => {} }] });
ev({ id: 'kashmir_ceasefire', date: '1949-01-01', until: '1950-12-31', kind: 'war', title: '喀什米爾停火', cond: A => A.atWar('PAK', 'IND'), text: '聯合國斡旋下，印巴在喀什米爾停火，劃定停火線。', fire: A => A.peace('PAK', 'IND', 'status') });
ev({ id: 'israel', date: '1948-05-14', kind: 'war', title: '以色列建國與第一次中東戰爭', cond: A => A.owns('ENG', 'pal_telaviv'),
  text: '英國結束巴勒斯坦委任統治，本-古里安宣布以色列建國。次日埃及、約旦、敘利亞、伊拉克等阿拉伯國家出兵，七十多萬巴勒斯坦人被迫離開家園（「大浩劫」）。',
  fire: A => {
    const S = A.S;
    A.create('ISR', ['pal_telaviv', 'pal_haifa', 'pal_negev'], { ideo: 'dem', units: 10 });
    A.units('ISR', { arm: 2, ftr: 2 }, 'pal_telaviv'); A.S.C.ISR.mods.def += 0.4; A.S.C.ISR.mods.att += 0.25; A.S.C.ISR.capMod = 0.35;
    for (const t of ['EGY', 'JOR', 'SYR', 'IRQ']) A.tempMod(t, 'att', -0.3, 400);
    if (A.exists('JOR')) A.give(['pal_westbank'], 'JOR', { onlyFrom: 'ENG' });
    for (const t of ['EGY', 'JOR', 'SYR', 'IRQ']) if (A.exists(t)) { A.war(t, 'ISR', { limited: true }); A.limit(t, 'ISR', ['pal_telaviv', 'pal_haifa', 'pal_negev'], ['pal_westbank']); }
    void S;
  } });
ev({ id: 'israel_armistice', date: '1949-03-10', until: '1950-12-31', kind: 'war', title: '1949 年停戰協定', cond: A => A.exists('ISR') && ['EGY', 'JOR', 'SYR', 'IRQ'].some(t => A.atWar(t, 'ISR')),
  text: '以色列與鄰國簽訂停戰協定，停火線（綠線）成為事實邊界。', fire: A => { for (const t of ['EGY', 'JOR', 'SYR', 'IRQ']) A.peace(t, 'ISR', 'status'); } });
ev({ id: 'berlin_blockade', date: '1948-06-24', kind: 'news', title: '柏林封鎖', cond: A => A.exists('SOV') && A.exists('USA'), text: '蘇聯封鎖西柏林陸路交通，美英以「柏林空運」維持城市生活長達十一個月。' });
ev({ id: 'tito_stalin', date: '1948-06-28', kind: 'struct', title: '狄托與史達林決裂', cond: A => A.exists('YUG') && A.S.C.YUG.ideo === 'com', text: '南斯拉夫被逐出共產黨情報局，走上獨立的社會主義道路，日後成為不結盟運動的領袖。', fire: A => A.leave('YUG') });
ev({ id: 'indonesia_war', date: '1945-08-17', until: '1948-12-31', kind: 'war', title: '印尼獨立戰爭', cond: A => A.exists('HOL') && DEI.some(id => A.owns('HOL', id)) && !A.exists('INS'),
  text: '蘇卡諾與哈達宣布印度尼西亞獨立，荷蘭試圖恢復殖民統治，雙方爆發戰爭。',
  fire: A => { A.create('INS', ['hol_batavia', 'hol_surabaya', 'hol_sumatra_n', 'hol_palembang'], { ideo: 'neu', onlyFrom: ['HOL'], units: 7 }); A.war('INS', 'HOL', { limited: true }); A.S.C.INS.mods.def += 0.3; } });
ev({ id: 'indonesia_peace', date: '1949-12-27', until: '1951-12-31', kind: 'war', title: '荷蘭承認印尼獨立', cond: A => A.exists('INS') && A.exists('HOL'),
  text: '海牙圓桌會議後，荷蘭將主權移交印度尼西亞合眾國（西新幾內亞除外）。',
  fire: A => { A.peace('INS', 'HOL', 'status'); A.give(DEI, 'INS', { onlyFrom: 'HOL' }); } });
ev({ id: 'indochina_war', date: '1946-12-19', until: '1950-12-31', kind: 'war', title: '第一次印度支那戰爭', cond: A => A.exists('FRA') && A.owns('FRA', 'fra_hanoi') && !A.exists('VIN'),
  text: '胡志明領導的越盟與法國殖民軍在河內爆發戰鬥，戰爭持續八年。',
  fire: A => { A.create('VIN', ['fra_vinh'], { ideo: 'com', onlyFrom: ['FRA'], units: 4 }); A.war('VIN', 'FRA', { limited: true }); } });
ev({ id: 'nato', date: '1949-04-04', kind: 'struct', title: '北大西洋公約組織', cond: A => A.exists('USA') && !A.S.fac.nato,
  text: '美國、加拿大與西歐十國簽署《北大西洋公約》，承諾對任一成員國的攻擊視為對全體的攻擊。',
  fire: A => {
    const S = A.S;
    const mem = ['ENG', 'FRA', 'CAN', 'ITA', 'BEL', 'HOL', 'LUX', 'NOR', 'DEN', 'POR', 'ICE'].filter(t => A.exists(t) && S.C[t].ideo !== 'com');
    if (S.fac.allies) { for (const m of [...S.fac.allies.members]) A.leave(m); delete S.fac.allies; }
    for (const t of ['USA', ...mem]) A.leave(t);
    A.fac('nato', '北大西洋公約組織', 'USA', mem);
  } });
ev({ id: 'two_germanies', date: '1949-05-23', kind: 'struct', title: '兩個德國', cond: A => !A.exists('GER') && !A.exists('FRG') && A.has('germanySettled'),
  text: '西方佔領區成立德意志聯邦共和國（西德），蘇聯佔領區隨後成立德意志民主共和國（東德）。',
  fire: A => {
    const S = A.S;
    const w = [], e = [];
    for (let r = 0; r < R; r++) { const z = nodes[r].zone; if (S.core[r] !== 'GER') continue; if (z === 'W' && S.own[r] !== 'SOV') w.push(r); else if (z === 'E' && S.own[r] === 'SOV') e.push(r); }
    A.create('FRG', w, { ideo: 'dem', units: 3 });
    A.create('DDR', e, { ideo: 'com', units: 3 });
    for (const r of [...w, ...e]) S.core[r] = S.own[r];
    if (A.exists('DDR') && S.fac.comintern) A.join('DDR', 'comintern');
  } });
ev({ id: 'soviet_bomb', date: '1949-08-29', kind: 'struct', title: '蘇聯第一顆原子彈', cond: A => A.exists('SOV') && (A.S.C.SOV.tech.nuc || 0) < 1,
  text: '蘇聯在哈薩克的塞米巴拉金斯克試爆第一顆原子彈，美國的核壟斷結束。', fire: A => { A.tech('SOV', 'nuc', 1); A.S.C.SOV.nukes += 1; } });
ev({ id: 'prc_founded', date: '1949-10-01', until: '1955-12-31', kind: 'struct', title: '中華人民共和國成立', cond: A => A.exists('PRC') && A.ctrls('PRC', 'chi_beiping'),
  text: '毛澤東在北京天安門城樓宣布中華人民共和國成立。', fire: A => { A.rename('PRC', '中華人民共和國'); A.S.C.PRC.cap = A.rid('chi_beiping'); if (A.S.fac.comintern) A.join('PRC', 'comintern'); } });
ev({ id: 'roc_taiwan', date: '1949-12-07', until: '1960-12-31', kind: 'struct', title: '中華民國政府遷臺', cond: A => A.exists('CHI') && A.owns('CHI', 'jap_taipei') && !A.ctrls('CHI', 'chi_chongqing') && !A.ctrls('CHI', 'chi_nanjing'),
  text: '國民政府撤退至臺灣，兩岸隔海對峙的局面就此形成。', fire: A => { A.S.C.CHI.cap = A.rid('jap_taipei'); A.rename('CHI', '中華民國 (臺灣)'); } });
ev({ id: 'korea_states', date: '1948-08-15', kind: 'struct', title: '朝鮮半島分裂', cond: A => !A.exists('KOR') && !A.exists('PRK') && A.has('japanSettled'),
  text: '南方成立大韓民國，北方成立朝鮮民主主義人民共和國，兩國都宣稱自己代表整個朝鮮。',
  fire: A => {
    const S = A.S;
    A.create('KOR', KOREA_S, { ideo: 'dem', units: 4 });
    A.create('PRK', KOREA_N, { ideo: 'com', units: 6 });
    if (A.exists('PRK') && S.fac.comintern) A.join('PRK', 'comintern');
  } });
ev({ id: 'jap_independence', date: '1952-04-28', kind: 'struct', title: '舊金山和約生效', cond: A => A.exists('JAP') && A.S.C.JAP.subj,
  text: '日本恢復主權，同時與美國簽訂安保條約。', fire: A => { A.S.C.JAP.subj = null; A.guar('USA', 'JAP'); } });
ev({ id: 'eritrea', date: '1952-09-15', kind: 'struct', title: '厄利垂亞併入衣索比亞', cond: A => A.exists('ETH') && !A.owns('ETH', 'ita_eritrea'), text: '聯合國決議厄利垂亞與衣索比亞組成聯邦。', fire: A => A.give(['ita_eritrea'], 'ETH') });

// ===== 1950 年代 =====
ev({ id: 'korean_war', date: '1950-06-25', until: '1953-01-01', kind: 'war', title: '韓戰爆發', who: 'PRK',
  cond: A => A.exists('PRK') && A.exists('KOR') && !A.atWar('PRK', 'KOR'),
  text: '北韓軍隊越過北緯 38 度線，三天內攻陷漢城。', opts: [{ t: '南侵（歷史）', fx: A => { A.war('PRK', 'KOR', { limited: true }); A.civil('PRK', 'KOR'); if (A.isAI('PRK')) A.units('PRK', { inf: 4, arm: 2 }, 'jap_pyongyang'); A.tempMod('PRK', 'att', 0.2, 90); } }, { t: '取消', fx: () => {} }] });
ev({ id: 'un_korea', date: '1950-06-27', until: '1953-01-01', kind: 'war', title: '聯合國軍介入', cond: A => A.atWar('PRK', 'KOR') && A.exists('USA') && !A.atWar('USA', 'PRK'),
  text: '聯合國安理會在蘇聯缺席下通過決議，以美國為首的十六國組成聯合國軍援助南韓。',
  fire: A => {
    for (const t of ['USA', 'ENG', 'CAN', 'AST', 'TUR', 'FRA', 'NZL', 'PHI', 'GRE', 'SIA', 'BEL', 'HOL', 'COL', 'ETH', 'SAF', 'LUX']) if (A.exists(t) && A.S.C[t].ideo !== 'com') A.setWar(t, 'PRK');
    if (A.isAI('USA')) A.units('USA', { inf: 4, arm: 1, ftr: 3 }, 'jap_busan');
    if (A.isAI('ENG')) A.units('ENG', { inf: 1 }, 'jap_busan');
    A.news('聯合國軍開始在釜山登陸。', 'war');
  } });
ev({ id: 'inchon', date: '1950-09-15', until: '1951-06-01', kind: 'war', title: '仁川登陸', cond: A => A.atWar('PRK', 'USA') && A.ctrls('PRK', 'jap_seoul'),
  text: '麥克阿瑟指揮聯合國軍在仁川實施大膽的兩棲登陸，切斷北韓軍補給線。', fire: A => { if (A.isAI('USA')) A.invade('USA', 'jap_seoul', { mar: 2, inf: 2, arm: 1 }); } });
ev({ id: 'china_korea', date: '1950-10-19', until: '1953-07-01', kind: 'war', title: '抗美援朝', who: 'PRC',
  cond: A => A.exists('PRC') && A.atWar('PRK', 'KOR') && !A.atWar('PRC', 'KOR') && (A.ctrlAny('USA', KOREA_N) || A.ctrlAny('KOR', KOREA_N) || A.ctrlAny('USA', ['jap_seoul']) || A.ctrlAny('KOR', ['jap_seoul']) && A.S.day > strToDay('1950-09-20')),
  text: '聯合國軍逼近鴨綠江，中共決定以「中國人民志願軍」名義出兵朝鮮。',
  opts: [{ t: '出兵朝鮮（歷史）', fx: A => {
    for (const e of [...enemySet(A.S, 'PRK')]) A.setWar('PRC', e);
    const S = A.S; const front = KOREA_N.map(A.rid).filter(r => S.ctrl[r] === 'PRK');
    if (A.isAI('PRC')) { A.units('PRC', { inf: 6 }, front.length ? front[0] : 'man_mukden'); A.units('PRC', { inf: 8 }, 'man_mukden'); }
    if (A.exists('PRK')) A.S.C.PRK.capMod = 0.3;
    A.news('數十萬中國人民志願軍跨過鴨綠江。', 'war');
  } }, { t: '不介入', fx: () => {} }] });
ev({ id: 'korea_armistice', date: '1953-07-27', until: '1960-01-01', kind: 'war', title: '韓戰停戰協定', cond: A => A.atWar('PRK', 'KOR') || A.atWar('PRC', 'USA'),
  text: '交戰各方在板門店簽署停戰協定，以軍事分界線為界設立非軍事區。戰爭造成數百萬人傷亡。',
  fire: A => { const S = A.S; const side1 = ['PRK', 'PRC']; for (const a of side1) for (const b of [...enemySet(S, a)]) if (['KOR', 'USA', 'ENG', 'CAN', 'AST', 'TUR', 'FRA', 'NZL', 'PHI', 'GRE', 'SIA', 'BEL', 'HOL', 'COL', 'ETH', 'SAF', 'LUX'].includes(b)) A.peace(a, b, 'status', true); } });
ev({ id: 'tibet', date: '1950-10-07', until: '1952-12-31', kind: 'war', title: '解放軍進軍西藏', who: 'PRC', cond: A => A.exists('PRC') && A.exists('TIB') && !A.atWar('PRC', 'TIB'),
  text: '解放軍在昌都擊敗藏軍。', opts: [{ t: '進軍（歷史）', fx: A => { A.puppet('PRC', 'TIB'); A.war('PRC', 'TIB', { limited: true }); } }, { t: '暫緩', fx: () => {} }] });
ev({ id: 'tibet_annex', date: '1951-05-23', until: '1959-12-31', kind: 'struct', title: '十七條協議', cond: A => A.exists('TIB') && A.exists('PRC') && A.S.C.TIB.subj === 'PRC', text: '西藏地方政府與中央人民政府簽訂協議，西藏併入中華人民共和國。', fire: A => A.annex('TIB', 'PRC') });
ev({ id: 'stalin_death', date: '1953-03-05', kind: 'news', title: '史達林逝世', cond: A => A.exists('SOV'), text: '史達林逝世。赫魯雪夫於 1956 年發表「秘密報告」批判個人崇拜。' });
ev({ id: 'dien_bien_phu', date: '1954-05-07', kind: 'news', title: '奠邊府戰役', cond: A => A.atWar('VIN', 'FRA'), text: '越盟在奠邊府圍殲法軍主力，法國在印度支那的殖民統治走向終結。' });
ev({ id: 'geneva', date: '1954-07-21', until: '1956-12-31', kind: 'struct', title: '日內瓦協議', cond: A => A.exists('FRA') && INDOCHINA.some(id => A.owns('FRA', id) || A.owns('VIN', id)),
  text: '日內瓦會議決定越南以北緯十七度線暫時分治，寮國與柬埔寨獨立。',
  fire: A => {
    const S = A.S;
    if (A.atWar('VIN', 'FRA')) A.peace('VIN', 'FRA', 'white');
    const north = ['fra_hanoi', 'fra_vinh'];
    if (A.exists('VIN')) A.give(north, 'VIN'); else A.create('VIN', north, { ideo: 'com' });
    A.units('VIN', { inf: 6 }, 'fra_hanoi'); A.S.C.VIN.mods.def += 0.2; A.S.C.VIN.mods.att += 0.1;
    A.create('VIS', ['fra_hue', 'fra_highlands', 'fra_saigon'], { ideo: 'neu', onlyFrom: ['FRA', 'JAP'] });
    A.create('LAO', ['fra_laos', 'fra_laos_s'], { ideo: 'neu', onlyFrom: ['FRA', 'JAP'] });
    A.create('CAM', ['fra_cambodia'], { ideo: 'neu', onlyFrom: ['FRA', 'JAP'] });
    if (S.fac.comintern) A.join('VIN', 'comintern');
  } });
ev({ id: 'nato_gre_tur', date: '1952-02-18', kind: 'struct', title: '希臘與土耳其加入北約', cond: A => !!A.S.fac.nato, text: '北約擴大至東地中海。', fire: A => { for (const t of ['GRE', 'TUR']) if (A.exists(t) && A.S.C[t].ideo !== 'com') A.join(t, 'nato'); } });
ev({ id: 'frg_nato', date: '1955-05-09', kind: 'struct', title: '西德加入北約', cond: A => A.exists('FRG') && !!A.S.fac.nato, text: '西德重新武裝並加入北約。', fire: A => A.join('FRG', 'nato') });
ev({ id: 'warsaw_pact', date: '1955-05-14', kind: 'struct', title: '華沙公約組織', cond: A => A.exists('SOV') && !A.S.fac.warsaw,
  text: '蘇聯與東歐七國簽署《華沙公約》，與北約形成對峙。',
  fire: A => {
    const S = A.S;
    const mem = ['POL', 'DDR', 'CZE', 'HUN', 'ROM', 'BUL', 'ALB'].filter(t => A.exists(t) && S.C[t].ideo === 'com');
    for (const t of mem) A.leave(t);
    const others = S.fac.comintern ? S.fac.comintern.members.filter(m => m !== 'SOV' && !mem.includes(m)) : [];
    A.leave('SOV');
    A.fac('warsaw', '華沙公約組織', 'SOV', [...mem, ...others]);
    if (S.fac.comintern) delete S.fac.comintern;
  } });
ev({ id: 'hungary_1956', date: '1956-10-23', until: '1957-06-01', kind: 'war', title: '匈牙利革命', who: 'HUN',
  cond: A => A.exists('HUN') && A.S.C.HUN.ideo === 'com' && A.exists('SOV'),
  text: '布達佩斯爆發反蘇示威，納吉·伊姆雷政府宣布退出華沙公約、保持中立。',
  opts: [{ t: '宣布退出華沙公約（歷史）', fx: A => { A.leave('HUN'); A.ideo('HUN', 'neu'); A.flag('hun56'); } }, { t: '與蘇聯妥協', fx: () => {} }] });
ev({ id: 'hungary_invasion', date: '1956-11-04', until: '1957-06-01', kind: 'war', title: '蘇軍鎮壓匈牙利', who: 'SOV',
  cond: A => A.has('hun56') && A.exists('HUN') && !A.S.C.HUN.fac && !A.atWar('SOV', 'HUN'),
  text: '蘇聯坦克開進布達佩斯，約兩千五百名匈牙利人在戰鬥中喪生，二十萬人逃往西方。',
  opts: [{ t: '出兵鎮壓（歷史）', fx: A => { A.puppet('SOV', 'HUN'); A.war('SOV', 'HUN', { limited: true }); if (A.isAI('SOV')) A.units('SOV', { arm: 3, inf: 3 }, 'hun_debrecen'); } }, { t: '容忍匈牙利中立', fx: () => {} }] });
ev({ id: 'suez', date: '1956-10-29', until: '1957-06-01', kind: 'war', title: '蘇伊士運河危機', cond: A => A.exists('EGY') && A.exists('ISR') && A.owns('EGY', 'egy_suez'),
  text: '納瑟將蘇伊士運河收歸國有。以色列、英國與法國秘密協議後出兵埃及。',
  fire: A => { A.war('ISR', 'EGY', { limited: true }); A.limit('ISR', 'EGY', ['egy_sinai'], []); for (const t of ['ENG', 'FRA']) if (A.exists(t)) { A.war(t, 'EGY', { limited: true }); A.limit(t, 'EGY', ['egy_suez', 'egy_alexandria'], []); } if (A.isAI('ENG')) A.invade('ENG', 'egy_suez', { mar: 2, inf: 2 }, 'sea_levant'); } });
ev({ id: 'suez_end', date: '1956-11-07', until: '1957-12-31', kind: 'war', title: '蘇伊士停火', cond: A => A.atWar('ENG', 'EGY') || A.atWar('FRA', 'EGY') || A.atWar('ISR', 'EGY'),
  text: '在美國與蘇聯的強大壓力下，英法以三國被迫停火撤軍，標誌著英法帝國時代的落幕。', fire: A => { for (const t of ['ENG', 'FRA', 'ISR']) A.peace(t, 'EGY', 'white'); } });
ev({ id: 'sputnik', date: '1957-10-04', kind: 'news', title: '史普尼克一號', cond: A => A.exists('SOV'), text: '蘇聯發射人類第一顆人造衛星，太空競賽開始。', fire: A => { if (A.exists('SOV')) A.S.C.SOV.rsp += 0.05; if (A.exists('USA')) A.S.C.USA.rsp += 0.05; } });
ev({ id: 'cuba_revolution', date: '1959-01-01', kind: 'struct', title: '古巴革命', cond: A => A.exists('CUB'), text: '卡斯楚領導的游擊隊推翻巴蒂斯塔政權，古巴隨後倒向蘇聯。', fire: A => { A.ideo('CUB', 'com'); A.leave('CUB'); } });
ev({ id: 'vietnam_war', date: '1959-07-08', until: '1964-12-31', kind: 'war', title: '越南戰爭', who: 'VIN', cond: A => A.exists('VIN') && A.exists('VIS') && !A.atWar('VIN', 'VIS'),
  text: '北越決定以武力統一越南，南方的越共游擊戰全面展開。', opts: [{ t: '武力統一（歷史）', fx: A => { A.war('VIN', 'VIS', { limited: true }); A.civil('VIN', 'VIS'); A.limit('VIN', 'VIS', ['fra_hue', 'fra_highlands', 'fra_saigon'], []); A.S.C.VIN.mods.att += 0.15; A.units('VIN', { inf: 4 }, 'fra_hue'); A.tempMod('VIS', 'def', -0.15, 2000); A.lend('SOV', 'VIN', 0.03); A.lend('USA', 'VIS', 0.04); } }, { t: '暫緩', fx: () => {} }] });
ev({ id: 'sino_soviet', date: '1960-07-16', kind: 'struct', title: '中蘇交惡', cond: A => A.exists('PRC') && A.exists('SOV') && A.S.C.PRC.fac && A.S.C.PRC.fac === A.S.C.SOV.fac,
  text: '蘇聯撤回在華專家，中蘇兩大共產國家公開決裂。', fire: A => A.leave('PRC') });

// ===== 1960 年代 =====
ev({ id: 'africa_year', date: '1960-01-01', kind: 'news', title: '非洲獨立年', cond: () => true, text: '1960 年有十七個非洲國家獲得獨立，殖民帝國加速瓦解。' });
ev({ id: 'congo_crisis', date: '1960-07-11', until: '1961-12-31', kind: 'war', title: '剛果危機', cond: A => A.exists('COG') && A.owns('COG', 'bel_katanga'),
  text: '剛果獨立僅十一天，礦產豐富的加丹加省在比利時支持下宣布獨立。', fire: A => { A.create('KAT', ['bel_katanga'], { ideo: 'neu', units: 2 }); A.units('COG', { inf: 4 }, 'bel_kasai'); A.war('COG', 'KAT', { limited: true }); A.civil('COG', 'KAT'); A.limit('COG', 'KAT', ['bel_katanga'], []); } });
ev({ id: 'berlin_wall', date: '1961-08-13', kind: 'news', title: '柏林圍牆', cond: A => A.exists('DDR'), text: '東德一夜之間築起分隔東西柏林的圍牆，成為冷戰最鮮明的象徵。' });
ev({ id: 'bay_of_pigs', date: '1961-04-17', kind: 'news', title: '豬玀灣事件', cond: A => A.exists('CUB') && A.S.C.CUB.ideo === 'com', text: '美國中情局支持的古巴流亡者在豬玀灣登陸，三天內即被擊敗。' });
ev({ id: 'cuban_missile', date: '1962-10-16', until: '1963-06-01', kind: 'war', title: '古巴飛彈危機', who: 'USA',
  cond: A => A.exists('CUB') && A.S.C.CUB.ideo === 'com' && A.exists('USA') && A.exists('SOV') && !A.atWar('USA', 'SOV'),
  text: 'U-2 偵察機發現蘇聯正在古巴部署中程核飛彈。世界距離核戰爭只有一步之遙。',
  opts: [
    { t: '海上封鎖（歷史）', fx: A => A.flag('cuba_blockade') },
    { t: '空襲並入侵古巴', fx: A => { A.war('USA', 'CUB', { limited: true }); A.flag('cuba_invaded'); A.S.tension = Math.min(100, A.S.tension + 20); } },
  ] });
ev({ id: 'cuban_missile_sov', date: '1962-10-26', until: '1963-06-01', kind: 'war', title: '赫魯雪夫的抉擇', who: 'SOV',
  cond: A => (A.has('cuba_blockade') || A.has('cuba_invaded')) && A.exists('SOV') && A.exists('USA') && !A.atWar('USA', 'SOV'),
  text: '美國要求撤除古巴的飛彈。秘密談判中，美方承諾不入侵古巴並撤除部署在土耳其的飛彈。',
  opts: [
    { t: '撤除飛彈（歷史）', fx: A => { A.news('蘇聯同意撤除古巴飛彈，危機和平落幕。美蘇隨後建立熱線電話。'); A.S.tension = Math.max(0, A.S.tension - 10); } },
    { t: '強硬對抗', fx: A => { if (A.has('cuba_invaded')) { A.war('SOV', 'USA'); A.news('蘇聯對美國宣戰，第三次世界大戰爆發！', 'major'); } else { A.S.tension = Math.min(100, A.S.tension + 15); } } },
  ] });
ev({ id: 'sino_indian', date: '1962-10-20', until: '1963-06-01', kind: 'war', title: '中印邊境戰爭', who: 'PRC', cond: A => A.exists('PRC') && A.exists('IND') && !A.atWar('PRC', 'IND'),
  text: '中印邊界爭端升級為武裝衝突，解放軍在東西兩段同時發動攻勢。', opts: [{ t: '發動攻勢（歷史）', fx: A => { A.war('PRC', 'IND', { limited: true }); A.limit('PRC', 'IND', ['raj_kashmir', 'raj_assam'], []); } }, { t: '談判解決', fx: () => {} }] });
ev({ id: 'sino_indian_end', date: '1962-11-21', until: '1963-12-31', kind: 'war', title: '中國單方面停火', cond: A => A.atWar('PRC', 'IND'), text: '解放軍宣布單方面停火並後撤。', fire: A => A.peace('PRC', 'IND', 'white') });
ev({ id: 'malaysia', date: '1963-09-16', kind: 'struct', title: '馬來西亞成立', cond: A => A.exists('MAL'), text: '馬來亞、新加坡、砂拉越與北婆羅洲合組馬來西亞聯邦。', fire: A => A.rename('MAL', '馬來西亞') });
ev({ id: 'singapore', date: '1965-08-09', kind: 'struct', title: '新加坡獨立', cond: A => A.owns('MAL', 'eng_singapore'), text: '新加坡被逐出馬來西亞，成為獨立國家。', fire: A => A.create('SIN', ['eng_singapore'], { ideo: 'dem', units: 1 }) });
ev({ id: 'gulf_tonkin', date: '1964-08-02', until: '1972-12-31', kind: 'war', title: '東京灣事件', who: 'USA', cond: A => A.atWar('VIN', 'VIS') && A.exists('USA') && !A.atWar('USA', 'VIN'),
  text: '美艦在東京灣與北越魚雷艇交火，國會通過決議授權總統擴大戰爭。',
  opts: [{ t: '全面介入越戰（歷史）', fx: A => {
    for (const t of ['USA', 'AST', 'NZL', 'KOR', 'SIA']) if (A.exists(t)) A.setWar(t, 'VIN');
    if (A.isAI('USA')) A.units('USA', { inf: 5, mec: 1, ftr: 3, bmb: 2 }, 'fra_saigon');
    if (A.isAI('KOR')) A.units('KOR', { inf: 2 }, 'fra_hue');
  } }, { t: '僅提供軍援', fx: A => A.lend('USA', 'VIS', 0.08) }] });
ev({ id: 'indo_pak_1965', date: '1965-08-05', until: '1966-06-01', kind: 'war', title: '第二次印巴戰爭', who: 'PAK', cond: A => A.exists('PAK') && A.exists('IND') && !A.atWar('PAK', 'IND'),
  text: '巴基斯坦發動「直布羅陀行動」滲透喀什米爾，戰爭隨即擴大。', opts: [{ t: '發動行動（歷史）', fx: A => { A.war('PAK', 'IND', { limited: true }); A.limit('PAK', 'IND', ['raj_kashmir', 'raj_amritsar'], ['raj_punjab', 'raj_kashmir']); } }, { t: '取消', fx: () => {} }] });
ev({ id: 'tashkent', date: '1966-01-10', until: '1966-12-31', kind: 'war', title: '塔什干宣言', cond: A => A.atWar('PAK', 'IND'), text: '在蘇聯斡旋下，印巴恢復戰前邊界。', fire: A => A.peace('PAK', 'IND', 'white') });
ev({ id: 'six_day', date: '1967-06-05', until: '1968-06-01', kind: 'war', title: '六日戰爭', who: 'ISR', cond: A => A.exists('ISR') && A.exists('EGY') && !A.atWar('ISR', 'EGY'),
  text: '埃及封鎖蒂朗海峽並在西奈集結重兵。以色列決定先發制人。',
  opts: [{ t: '先發制人（歷史）', fx: A => {
    A.war('ISR', 'EGY', { limited: true }); A.limit('ISR', 'EGY', ['egy_sinai'], ['pal_negev']);
    for (const t of ['SYR', 'JOR']) if (A.exists(t)) { A.war('ISR', t, { limited: true }); A.limit('ISR', t, ['pal_westbank'], ['pal_haifa']); }
    A.hurtUnits('EGY', u => u.t === 'ftr' || u.t === 'bmb', 70);
    if (A.isAI('ISR')) A.units('ISR', { arm: 3, inf: 2 }, 'pal_negev');
  } }, { t: '等待外交解決', fx: () => {} }] });
ev({ id: 'six_day_end', date: '1967-06-11', until: '1968-06-01', kind: 'war', title: '六日戰爭停火', cond: A => A.exists('ISR') && ['EGY', 'SYR', 'JOR'].some(t => A.atWar('ISR', t)),
  text: '六天之內，以色列佔領西奈半島、約旦河西岸與戈蘭高地。', fire: A => { for (const t of ['EGY', 'SYR', 'JOR']) A.peace('ISR', t, 'status'); } });
ev({ id: 'biafra', date: '1967-05-30', until: '1968-12-31', kind: 'war', title: '比夫拉戰爭', cond: A => A.exists('NIG') && A.owns('NIG', 'eng_enugu'),
  text: '奈及利亞東部宣布成立比夫拉共和國，內戰與封鎖造成嚴重饑荒，估計逾百萬人死亡。', fire: A => { A.create('BIA', ['eng_enugu'], { ideo: 'neu', units: 3 }); A.war('NIG', 'BIA', { limited: true }); A.civil('NIG', 'BIA'); A.limit('NIG', 'BIA', ['eng_enugu'], []); } });
ev({ id: 'prague_spring', date: '1968-08-20', until: '1969-06-01', kind: 'war', title: '布拉格之春', who: 'CZE', cond: A => A.exists('CZE') && A.S.C.CZE.ideo === 'com' && A.exists('SOV'),
  text: '杜布切克推動「具有人性面孔的社會主義」改革，華沙公約部隊在夜間越過邊境。',
  opts: [{ t: '不抵抗（歷史）', fx: A => A.news('華約部隊佔領捷克斯洛伐克，改革運動被終結。') }, { t: '武裝抵抗', fx: A => { A.leave('CZE'); A.puppet('SOV', 'CZE'); A.war('SOV', 'CZE', { limited: true }); } }] });
ev({ id: 'moon', date: '1969-07-20', kind: 'news', title: '阿波羅 11 號登月', cond: A => A.exists('USA'), text: '阿姆斯壯踏上月球：「這是個人的一小步，卻是人類的一大步。」' });
ev({ id: 'zhenbao', date: '1969-03-02', kind: 'news', title: '珍寶島事件', cond: A => A.exists('PRC') && A.exists('SOV'), text: '中蘇兩軍在烏蘇里江的珍寶島爆發武裝衝突，雙方關係降至冰點。' });

// ===== 1970 年代 =====
ev({ id: 'bangladesh_war', date: '1971-12-03', until: '1972-06-01', kind: 'war', title: '第三次印巴戰爭', cond: A => A.exists('PAK') && A.exists('IND') && A.owns('PAK', 'raj_dacca') && !A.atWar('PAK', 'IND'),
  text: '東巴基斯坦爆發獨立運動並遭巴基斯坦軍隊血腥鎮壓，約一千萬難民逃往印度。巴基斯坦空軍突襲印度機場，印度隨即出兵。', fire: A => { A.war('PAK', 'IND', { limited: true }); A.limit('PAK', 'IND', ['raj_kashmir', 'raj_amritsar'], ['raj_dacca']); if (A.isAI('IND')) A.units('IND', { inf: 4, arm: 1 }, 'raj_calcutta'); } });
ev({ id: 'bangladesh', date: '1971-12-16', until: '1972-12-31', kind: 'war', title: '孟加拉獨立', cond: A => A.atWar('PAK', 'IND') && (A.ctrls('IND', 'raj_dacca') || A.S.day > strToDay('1972-01-10')),
  text: '巴基斯坦東部軍隊在達卡投降，孟加拉人民共和國誕生。', fire: A => { A.peace('PAK', 'IND', 'white'); A.create('BAN', ['raj_dacca'], { ideo: 'neu', units: 2 }); } });
ev({ id: 'paris_accords', date: '1973-01-27', until: '1975-12-31', kind: 'war', title: '巴黎和平協約', cond: A => A.atWar('USA', 'VIN'),
  text: '美國與北越簽署和平協約，美軍撤出越南。', fire: A => { for (const t of ['USA', 'AST', 'NZL', 'KOR', 'SIA']) A.peace(t, 'VIN', 'white', true); } });
ev({ id: 'yom_kippur', date: '1973-10-06', until: '1974-06-01', kind: 'war', title: '贖罪日戰爭', who: 'EGY', cond: A => A.exists('EGY') && A.exists('ISR') && !A.atWar('EGY', 'ISR'),
  text: '在猶太教贖罪日，埃及與敘利亞對以色列發動突襲。', opts: [{ t: '發動突襲（歷史）', fx: A => { A.war('EGY', 'ISR', { limited: true }); A.limit('EGY', 'ISR', ['egy_sinai'], ['egy_sinai']); if (A.exists('SYR')) { A.setWar('SYR', 'ISR'); A.limit('SYR', 'ISR', [], []); } } }, { t: '取消', fx: () => {} }] });
ev({ id: 'yom_kippur_end', date: '1973-10-25', until: '1974-12-31', kind: 'war', title: '贖罪日戰爭停火', cond: A => A.atWar('EGY', 'ISR') || A.atWar('SYR', 'ISR'),
  text: '美蘇施壓下雙方停火。阿拉伯產油國的石油禁運引發全球石油危機。', fire: A => { A.peace('EGY', 'ISR', 'white'); A.peace('SYR', 'ISR', 'white'); } });
ev({ id: 'cyprus_1974', date: '1974-07-20', until: '1975-06-01', kind: 'war', title: '土耳其出兵賽普勒斯', who: 'TUR', cond: A => A.exists('TUR') && A.exists('CYP') && !A.atWar('TUR', 'CYP'),
  text: '希臘軍政府支持的政變推翻賽普勒斯政府，土耳其以保護土裔居民為由出兵。', opts: [{ t: '出兵（歷史）', fx: A => { A.war('TUR', 'CYP', { limited: true }); A.limit('TUR', 'CYP', ['eng_cyprus'], []); } }, { t: '取消', fx: () => {} }] });
ev({ id: 'cyprus_ceasefire', date: '1974-08-16', until: '1975-12-31', kind: 'war', title: '賽普勒斯停火', cond: A => A.atWar('TUR', 'CYP'), text: '停火線（綠線）將賽普勒斯一分為二。', fire: A => A.peace('TUR', 'CYP', 'white') });
ev({ id: 'khmer_rouge', date: '1975-04-17', kind: 'struct', title: '赤柬奪權', cond: A => A.exists('CAM'),
  text: '赤柬攻入金邊，建立「民主柬埔寨」。其統治期間，約一百五十萬至兩百萬人死於屠殺、強迫勞動與饑荒。', fire: A => A.ideo('CAM', 'com') });
ev({ id: 'saigon', date: '1975-04-30', until: '1976-12-31', kind: 'news', title: '西貢陷落', cond: A => A.ctrls('VIN', 'fra_saigon'), text: '北越軍隊攻入西貢，越南戰爭結束，次年越南統一。' });
ev({ id: 'laos_com', date: '1975-12-02', kind: 'struct', title: '寮國人民民主共和國', cond: A => A.exists('LAO'), text: '巴特寮推翻寮王國。', fire: A => A.ideo('LAO', 'com') });
ev({ id: 'angola_war', date: '1975-11-11', until: '1977-12-31', kind: 'war', title: '安哥拉內戰', cond: A => A.exists('ANG') && A.owns('ANG', 'por_angola_s') && !A.exists('UNI'),
  text: '安哥拉獨立當天，安人運、安盟等派系爆發內戰，古巴派兵支援安人運，南非與美國支援安盟。',
  fire: A => { A.create('UNI', ['por_angola_s'], { ideo: 'neu', units: 3 }); A.war('UNI', 'ANG', { limited: true }); A.civil('UNI', 'ANG'); A.lend('USA', 'UNI', 0.01); A.lend('SOV', 'ANG', 0.01); if (A.exists('CUB')) A.units('ANG', { inf: 2 }, 'por_angola'); } });
ev({ id: 'ogaden', date: '1977-07-13', until: '1978-06-01', kind: 'war', title: '歐加登戰爭', who: 'SOM', cond: A => A.exists('SOM') && A.exists('ETH') && !A.atWar('SOM', 'ETH'),
  text: '索馬利亞出兵奪取衣索比亞歐加登地區的索馬利族聚居區。', opts: [{ t: '進攻（歷史）', fx: A => { A.war('SOM', 'ETH', { limited: true }); A.limit('SOM', 'ETH', ['eth_harar'], []); } }, { t: '取消', fx: () => {} }] });
ev({ id: 'ogaden_end', date: '1978-03-15', until: '1979-12-31', kind: 'war', title: '索馬利亞撤軍', cond: A => A.atWar('SOM', 'ETH'), text: '在蘇聯與古巴支援下，衣索比亞擊退索馬利亞軍隊。', fire: A => A.peace('SOM', 'ETH', 'white') });
ev({ id: 'camp_david', date: '1979-03-26', kind: 'struct', title: '埃以和約', cond: A => A.exists('EGY') && A.owns('ISR', 'egy_sinai'), text: '大衛營協議後，埃及成為第一個承認以色列的阿拉伯國家，以色列歸還西奈半島。', fire: A => A.give(['egy_sinai'], 'EGY') });
ev({ id: 'cambodia_vietnam', date: '1978-12-25', until: '1979-12-31', kind: 'war', title: '越南入侵柬埔寨', who: 'VIN', cond: A => A.exists('VIN') && A.exists('CAM') && !A.atWar('VIN', 'CAM'),
  text: '越南出兵推翻赤柬政權。', opts: [{ t: '出兵（歷史）', fx: A => { A.puppet('VIN', 'CAM'); A.war('VIN', 'CAM', { limited: true }); } }, { t: '取消', fx: () => {} }] });
ev({ id: 'sino_vietnamese', date: '1979-02-17', until: '1979-12-31', kind: 'war', title: '中越戰爭', who: 'PRC', cond: A => A.exists('PRC') && A.exists('VIN') && !A.atWar('PRC', 'VIN'),
  text: '中國以「自衛反擊」為名對越南發動懲罰性戰爭。', opts: [{ t: '發動攻勢（歷史）', fx: A => { A.war('PRC', 'VIN', { limited: true }); A.limit('PRC', 'VIN', ['fra_hanoi', 'fra_vinh', 'fra_laos'], []); } }, { t: '取消', fx: () => {} }] });
ev({ id: 'sino_vietnamese_end', date: '1979-03-16', until: '1980-12-31', kind: 'war', title: '中國撤軍', cond: A => A.atWar('PRC', 'VIN'), text: '中國宣布達成目標並撤軍。', fire: A => A.peace('PRC', 'VIN', 'white') });
ev({ id: 'iran_revolution', date: '1979-02-11', kind: 'struct', title: '伊朗伊斯蘭革命', cond: A => A.exists('PER'), text: '巴勒維國王流亡，何梅尼建立伊斯蘭共和國，美國駐德黑蘭大使館人質危機隨之爆發。', fire: A => { A.leave('PER'); A.ideo('PER', 'neu'); A.rename('PER', '伊朗伊斯蘭共和國'); for (const k of Object.keys(A.S.lend)) if (k.endsWith('>PER')) delete A.S.lend[k]; } });
ev({ id: 'saur', date: '1978-04-27', kind: 'struct', title: '四月革命', cond: A => A.exists('AFG'), text: '阿富汗人民民主黨發動政變奪權。', fire: A => A.ideo('AFG', 'com') });
ev({ id: 'afghan_war', date: '1979-12-24', until: '1981-12-31', kind: 'war', title: '蘇聯入侵阿富汗', who: 'SOV', cond: A => A.exists('SOV') && A.exists('AFG') && !A.exists('MUJ'),
  text: '阿富汗親蘇政權搖搖欲墜，蘇聯決定出兵干預。',
  opts: [{ t: '出兵（歷史）', fx: A => {
    A.create('MUJ', ['afg_herat', 'afg_kandahar'], { ideo: 'neu', onlyFrom: ['AFG'], units: 4 });
    A.war('MUJ', 'AFG', { limited: true }); A.civil('MUJ', 'AFG'); A.setWar('SOV', 'MUJ');
    if (A.isAI('SOV')) A.units('SOV', { inf: 4, mec: 2, ftr: 2 }, 'afg_kabul');
    A.lend('USA', 'MUJ', 0.01); if (A.exists('PAK')) A.lend('PAK', 'MUJ', 0.05);
  } }, { t: '不干預', fx: () => {} }] });

// ===== 1980 年代 =====
ev({ id: 'iran_iraq', date: '1980-09-22', until: '1981-12-31', kind: 'war', title: '兩伊戰爭', who: 'IRQ', cond: A => A.exists('IRQ') && A.exists('PER') && !A.atWar('IRQ', 'PER'),
  text: '海珊趁伊朗革命後的混亂，出兵奪取胡齊斯坦。這場戰爭持續八年，造成數十萬人死亡。', opts: [{ t: '入侵伊朗（歷史）', fx: A => { A.war('IRQ', 'PER', { limited: true }); A.limit('IRQ', 'PER', ['per_abadan', 'per_kermanshah'], ['irq_basra']); } }, { t: '取消', fx: () => {} }] });
ev({ id: 'iran_iraq_end', date: '1988-08-20', until: '1990-12-31', kind: 'war', title: '兩伊停火', cond: A => A.atWar('IRQ', 'PER'), text: '雙方接受聯合國決議停火，邊界恢復戰前狀態。', fire: A => A.peace('IRQ', 'PER', 'white') });
ev({ id: 'zimbabwe', date: '1980-04-18', kind: 'struct', title: '辛巴威獨立', cond: A => A.exists('RHO'), text: '羅德西亞白人少數政權結束，辛巴威獨立。', fire: A => A.ideo('RHO', 'neu') });
ev({ id: 'falklands', date: '1982-04-02', until: '1983-01-01', kind: 'war', title: '福克蘭戰爭', who: 'ARG', cond: A => A.exists('ARG') && A.owns('ENG', 'eng_falklands') && !A.atWar('ARG', 'ENG'),
  text: '阿根廷軍政府出兵奪取福克蘭群島（馬爾維納斯群島）。', opts: [{ t: '奪回群島（歷史）', fx: A => { A.war('ARG', 'ENG', { limited: true }); A.limit('ARG', 'ENG', ['eng_falklands'], ['eng_falklands']); if (A.isAI('ARG')) A.invade('ARG', 'eng_falklands', { inf: 2, mar: 1 }); } }, { t: '取消', fx: () => {} }] });
ev({ id: 'falklands_taskforce', date: '1982-05-21', until: '1983-01-01', kind: 'war', title: '英國特遣艦隊登陸', cond: A => A.atWar('ARG', 'ENG') && A.ctrls('ARG', 'eng_falklands'),
  text: '英國特遣艦隊在聖卡洛斯灣登陸。', fire: A => { if (A.isAI('ENG')) A.invade('ENG', 'eng_falklands', { mar: 3, inf: 1 }); } });
ev({ id: 'falklands_end', date: '1982-06-14', until: '1983-06-01', kind: 'war', title: '阿根廷投降', cond: A => A.atWar('ARG', 'ENG') && (A.ctrls('ENG', 'eng_falklands') || A.S.day > strToDay('1982-08-01')), text: '阿根廷守軍在史坦利港投降，軍政府隨後垮台。', fire: A => A.peace('ARG', 'ENG', 'white') });
ev({ id: 'chernobyl', date: '1986-04-26', kind: 'news', title: '車諾比核災', cond: A => A.exists('SOV'), text: '烏克蘭車諾比核電廠四號反應爐爆炸，成為史上最嚴重的核能災難。', fire: A => { if (A.exists('SOV')) A.S.C.SOV.pp = Math.max(0, A.S.C.SOV.pp - 50); } });
ev({ id: 'soviet_withdraw', date: '1989-02-15', until: '1990-12-31', kind: 'war', title: '蘇軍撤出阿富汗', cond: A => A.atWar('SOV', 'MUJ'), text: '十年戰爭後，最後一批蘇軍撤離阿富汗。', fire: A => A.peace('SOV', 'MUJ', 'white') });
ev({ id: 'autumn_1989', date: '1989-11-09', kind: 'struct', title: '柏林圍牆倒塌', cond: A => A.exists('SOV'),
  text: '東歐劇變：波蘭團結工聯贏得選舉，匈牙利開放邊界，柏林圍牆在歡呼聲中倒塌，捷克斯洛伐克發生「天鵝絨革命」，羅馬尼亞獨裁政權被推翻。',
  fire: A => { for (const t of ['POL', 'HUN', 'CZE', 'BUL', 'ROM', 'DDR']) if (A.exists(t) && A.S.C[t].ideo === 'com') { A.ideo(t, 'dem'); A.leave(t); } } });
ev({ id: 'panama', date: '1989-12-20', until: '1990-12-31', kind: 'war', title: '美國入侵巴拿馬', who: 'USA', cond: A => A.exists('USA') && A.exists('PAN') && !A.atWar('USA', 'PAN'),
  text: '美軍發動「正義之師行動」推翻諾瑞加政權。', opts: [{ t: '出兵（歷史）', fx: A => { A.puppet('USA', 'PAN'); A.war('USA', 'PAN', { limited: true }); if (A.isAI('USA')) A.units('USA', { inf: 2, mar: 1 }, 'pan_panama'); } }, { t: '取消', fx: () => {} }] });
ev({ id: 'kuwait', date: '1990-08-02', until: '1991-01-01', kind: 'war', title: '伊拉克入侵科威特', who: 'IRQ', cond: A => A.exists('IRQ') && A.exists('KUW') && !A.atWar('IRQ', 'KUW'),
  text: '伊拉克指控科威特盜採石油，十萬大軍越過邊境。', opts: [{ t: '入侵（歷史）', fx: A => { A.war('IRQ', 'KUW', { limited: true }); if (A.isAI('IRQ')) A.units('IRQ', { arm: 2, inf: 2 }, 'irq_basra'); } }, { t: '取消', fx: () => {} }] });
ev({ id: 'reunification', date: '1990-10-03', kind: 'struct', title: '兩德統一', cond: A => A.exists('FRG') && A.exists('DDR'), text: '東德併入聯邦德國，德國在分裂四十一年後重新統一。', fire: A => { A.annex('DDR', 'FRG'); A.rename('FRG', '德國'); } });
ev({ id: 'desert_storm', date: '1991-01-17', until: '1991-12-31', kind: 'war', title: '沙漠風暴行動', cond: A => A.exists('IRQ') && A.exists('USA') && (A.ctrls('IRQ', 'eng_kuwait') || A.atWar('IRQ', 'KUW')) && !A.atWar('USA', 'IRQ'),
  text: '以美國為首的三十五國聯軍展開大規模空襲，隨後發動地面攻勢解放科威特。',
  fire: A => {
    for (const t of ['USA', 'ENG', 'FRA', 'SAU', 'EGY', 'SYR', 'KUW']) if (A.exists(t)) { A.setWar(t, 'IRQ'); A.limit(t, 'IRQ', ['eng_kuwait', 'irq_basra'], ['eng_kuwait', 'sau_hasa']); }
    if (A.isAI('USA')) { A.units('USA', { arm: 4, mec: 2, inf: 2, ftr: 5, bmb: 3 }, 'sau_hasa'); }
    if (A.isAI('ENG')) A.units('ENG', { arm: 1, inf: 1 }, 'sau_hasa');
  } });
ev({ id: 'gulf_ceasefire', date: '1991-02-28', until: '1991-12-31', kind: 'war', title: '波斯灣戰爭停火', cond: A => A.atWar('USA', 'IRQ'),
  text: '聯軍在地面戰開始一百小時後宣布停火，科威特獲得解放。',
  fire: A => { if (!A.exists('KUW')) A.create('KUW', ['eng_kuwait'], { ideo: 'neu' }); for (const t of ['USA', 'ENG', 'FRA', 'SAU', 'EGY', 'SYR', 'KUW']) A.peace(t, 'IRQ', 'white'); if (A.owns('IRQ', 'eng_kuwait')) A.give(['eng_kuwait'], 'KUW'); } });
ev({ id: 'yugoslav_wars', date: '1991-06-25', until: '1991-12-31', kind: 'war', title: '南斯拉夫解體', cond: A => A.exists('YUG') && A.owns('YUG', 'yug_ljubljana'),
  text: '斯洛維尼亞與克羅埃西亞宣布獨立，南斯拉夫人民軍出兵干預，巴爾幹再度陷入戰火。',
  fire: A => {
    A.create('SLV', ['yug_ljubljana'], { ideo: 'dem', onlyFrom: ['YUG'], units: 2 });
    A.create('CRO', ['yug_zagreb', 'yug_split', 'ita_istria'], { ideo: 'dem', onlyFrom: ['YUG'], units: 3 });
    A.war('YUG', 'SLV', { limited: true }); A.war('YUG', 'CRO', { limited: true }); A.civil('YUG', 'SLV'); A.civil('YUG', 'CRO');
  } });
ev({ id: 'slovenia_peace', date: '1991-07-07', until: '1991-12-31', kind: 'war', title: '布里俄尼協議', cond: A => A.atWar('YUG', 'SLV'), text: '十日戰爭結束，南斯拉夫軍隊撤出斯洛維尼亞。', fire: A => A.peace('YUG', 'SLV', 'white') });
ev({ id: 'macedonia', date: '1991-09-08', kind: 'struct', title: '馬其頓獨立', cond: A => A.owns('YUG', 'yug_skopje'), text: '馬其頓經公投和平獨立。', fire: A => A.create('MKD', ['yug_skopje'], { ideo: 'dem', units: 1 }) });
ev({ id: 'baltic_independence', date: '1991-09-06', kind: 'struct', title: '波羅的海三國恢復獨立', cond: A => A.exists('SOV'),
  text: '八月政變失敗後，蘇聯承認愛沙尼亞、拉脫維亞與立陶宛獨立。',
  fire: A => { const S = A.S; for (const t of ['EST', 'LAT', 'LIT']) { const regs = []; for (let r = 0; r < R; r++) if (nodes[r].ssr === t && S.own[r] === 'SOV') regs.push(r); A.create(t, regs, { ideo: 'dem', units: 1 }); } } });
ev({ id: 'warsaw_dissolved', date: '1991-07-01', kind: 'struct', title: '華沙公約解散', cond: A => !!A.S.fac.warsaw, text: '華沙公約組織正式解散。', fire: A => { const S = A.S; for (const m of [...S.fac.warsaw.members]) A.leave(m); delete S.fac.warsaw; } });
ev({ id: 'ussr_end', date: '1991-12-26', kind: 'struct', title: '蘇聯解體', cond: A => A.exists('SOV'),
  text: '戈巴契夫辭去蘇聯總統職務，克里姆林宮降下鐮刀錘子旗。蘇聯分裂為十五個獨立國家，冷戰正式結束。',
  fire: A => {
    const S = A.S;
    for (const t of ['UKR', 'BLR', 'KAZ', 'UZB', 'TKM', 'KGZ', 'TJK', 'GEO', 'ARM', 'AZE', 'MOL']) {
      const regs = []; for (let r = 0; r < R; r++) if (nodes[r].ssr === t && S.own[r] === 'SOV') regs.push(r);
      if (regs.length) { A.create(t, regs, { ideo: t === 'UKR' || t === 'GEO' ? 'dem' : 'neu', units: 2 }); for (const u of S.units) if (u.c === 'SOV' && regs.includes(u.n)) u.c = t; }
    }
    A.leave('SOV'); A.ideo('SOV', 'dem'); A.rename('SOV', '俄羅斯聯邦');
    S.C.SOV.color = '#7f8fc9';
    S.flags.coldWarOver = true;
  } });

export const EVENTS = E;
export const EVENT_MAP = Object.fromEntries(E.map(e => [e.id, e]));
for (const e of E) { e.day = strToDay(e.date); e.untilDay = e.until ? strToDay(e.until) : e.day + 400; }

// ------------------------------------------------------------ 每日事件處理
export function runEvents(S) {
  const A = mkApi(S);
  for (const e of E) {
    if (S.fired[e.id] !== undefined) continue;
    if (S.day < e.day || S.day > e.untilDay) continue;
    if (!S.set.hist && e.kind === 'war') continue;
    let ok = true;
    try { ok = !e.cond || !!e.cond(A); } catch (err) { ok = false; }
    if (!ok) continue;
    S.fired[e.id] = S.day;
    fireEvent(S, A, e);
  }
  // 去殖民化
  if (S.day % 7 === 0) decolonize(S, A);
  // 國名隨年代變更
  if (S.day % 30 === 0) updateNames(S);
  // 遊戲結束
  if (S.flags.coldWarOver && !S.over) { S.over = { reason: '冷戰結束：蘇聯解體', day: S.day }; addNews(S, '遊戲結束：冷戰落幕。', 'major'); }
}
const newsText = (e) => e.text.replace(/[^。！」]*？$/, '').trim();
function fireEvent(S, A, e) {
  if (e.opts && e.who) {
    if (!alive(S, e.who)) return;
    const C = S.C[e.who];
    if (!C.ai) {
      pushPrompt(S, e.who, { ev: e.id, title: e.title, text: e.text, opts: e.opts.map(o => ({ t: o.t, act: 'hist' })), def: 0 });
      addNews(S, `【${e.title}】${newsText(e)}`, 'hist', [e.who]);
      return;
    }
    addNews(S, `【${e.title}】${newsText(e)}`, 'hist', [e.who]);
    try { e.opts[e.ai ?? 0].fx(A); } catch (err) { console.error('事件錯誤', e.id, err); }
    return;
  }
  addNews(S, `【${e.title}】${e.text}`, e.kind === 'news' ? 'hist' : 'hist');
  if (e.fire) { try { e.fire(A); } catch (err) { console.error('事件錯誤', e.id, err); } }
}
PROMPT_HANDLERS.hist = (S, tag, p, k) => {
  const e = EVENT_MAP[p.ev]; if (!e || !e.opts) return;
  const o = e.opts[k] || e.opts[0];
  try { o.fx(mkApi(S)); } catch (err) { console.error('事件錯誤', e.id, err); }
  addNews(S, `${cname(S, tag)}的決定：${o.t}`, 'info', [tag]);
};
export function decolonize(S, A, upToDay) {
  const day = upToDay ?? S.day;
  const groups = new Map();
  for (let r = 0; r < R; r++) {
    const ind = nodes[r].indep; if (!ind) continue;
    const key = 'ind:' + nodes[r].id;
    if (S.fired[key] !== undefined) continue;
    const d = strToDay(ind[1]);
    if (day < d) continue;
    S.fired[key] = S.day;
    const tag = ind[0];
    const own = S.own[r];
    if (own === tag) continue;
    if (own && atWar(S, own, S.ctrl[r]) && S.ctrl[r] !== own) continue;
    if (!groups.has(tag)) groups.set(tag, []);
    groups.get(tag).push(r);
  }
  for (const [tag, regs] of groups) {
    const fromTag = S.own[regs[0]];
    const C = createCountry(S, tag, regs, { from: fromTag, units: alive(S, tag) ? 0 : undefined });
    for (const r of regs) S.core[r] = tag;
    if (C) addNews(S, `${C.name}宣布獨立。`, 'indep', [tag]);
  }
  void A;
}
function updateNames(S) {
  const y = yearOf(S.day);
  for (const t in S.C) {
    const def = WORLD.countries[t]; const C = S.C[t];
    if (!def || !def.nm || !C.exists || C.customName) continue;
    let nm = null; for (const [yy, n] of def.nm) if (y >= yy) nm = n;
    if (nm && C.name !== nm && !C.name.includes('(臺灣)') && C.name !== '自由法國') C.name = nm;
  }
}
// 掛勾
HOOKS.events = runEvents;
HOOKS.capitulate = onCapitulate;
export { dayToDate };
