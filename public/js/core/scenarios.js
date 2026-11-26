// 劇本：1936、1939、1950、1962、1979
import { WORLD, ridx } from './world.js';
import {
  newCountry, createCountry, killCountry, transferRegion, makeFaction, joinFaction, leaveFaction, setWar, spawnUnit,
  friendly, atWar, alive, deployRegion, baseTechLevel, liveTags, addNews,
} from './engine.js';
import { mkApi, germanSettlement, decolonize, EVENTS, LISTS } from './history.js';
import { strToDay, yearOf, rand } from './util.js';
import { COUNTRY_DEFS } from '../data/countries.js';

const R = WORLD.R, nodes = WORLD.nodes;

export const SCENARIOS = [
  { id: '1936', name: '風雨欲來', date: '1936-01-01', tension: 5,
    desc: '1936 年 1 月。經濟大蕭條的陰影未散，德國重整軍備、義大利遠征衣索比亞、日本虎視中國。你能阻止——或主導——即將到來的世界大戰嗎？從這裡開始可以一路玩到 1991 年冷戰結束。',
    rec: [['GER', '困難'], ['ENG', '普通'], ['FRA', '困難'], ['SOV', '普通'], ['USA', '簡單'], ['ITA', '困難'], ['JAP', '困難'], ['CHI', '非常困難'], ['POL', '非常困難'], ['SPR', '困難']] },
  { id: '1939', name: '閃擊戰', date: '1939-08-25', tension: 45,
    desc: '1939 年 8 月底。德蘇剛簽訂互不侵犯條約，德軍在波蘭邊境集結，英法已承諾保證波蘭獨立。中日戰爭已打了兩年。第二次世界大戰一觸即發。',
    rec: [['GER', '普通'], ['POL', '非常困難'], ['ENG', '普通'], ['FRA', '困難'], ['SOV', '普通'], ['USA', '簡單'], ['JAP', '困難'], ['CHI', '困難'], ['FIN', '困難'], ['ITA', '困難']] },
  { id: '1950', name: '韓戰風雲', date: '1950-06-20', tension: 35,
    desc: '1950 年 6 月。二戰結束五年，世界分裂為北約與共產陣營。北韓正準備越過 38 度線，法國深陷印度支那，以色列剛剛建國。核子時代的冷戰正式開始。',
    rec: [['USA', '普通'], ['SOV', '普通'], ['PRK', '困難'], ['KOR', '困難'], ['PRC', '普通'], ['CHI', '困難'], ['ISR', '困難'], ['IND', '普通'], ['FRA', '普通'], ['ENG', '普通']] },
  { id: '1962', name: '核子邊緣', date: '1962-10-01', tension: 50,
    desc: '1962 年 10 月。蘇聯正在古巴部署核飛彈，越南戰火漸起，中印邊境劍拔弩張。人類距離核戰爭從未如此接近。',
    rec: [['USA', '普通'], ['SOV', '普通'], ['CUB', '困難'], ['VIN', '普通'], ['VIS', '困難'], ['PRC', '普通'], ['IND', '困難'], ['ISR', '困難'], ['EGY', '普通'], ['FRG', '普通']] },
  { id: '1979', name: '最後的對峙', date: '1979-12-01', tension: 40,
    desc: '1979 年 12 月。伊朗革命震撼中東，蘇聯即將出兵阿富汗，兩伊戰爭、福克蘭戰爭與波斯灣戰爭接踵而來。冷戰的最後十年，誰能笑到最後？',
    rec: [['USA', '普通'], ['SOV', '困難'], ['AFG', '困難'], ['IRQ', '普通'], ['PER', '普通'], ['ISR', '普通'], ['ARG', '困難'], ['PRC', '普通'], ['VIN', '普通'], ['ENG', '普通']] },
];
export const SCEN = Object.fromEntries(SCENARIOS.map(s => [s.id, s]));

const START_1936 = ['GER', 'ENG', 'FRA', 'ITA', 'SOV', 'USA', 'JAP', 'CHI', 'PRC', 'MAN', 'POL', 'CZE', 'AUS', 'HUN', 'ROM', 'YUG', 'BUL', 'GRE', 'ALB', 'TUR', 'SPR', 'POR', 'BEL', 'HOL', 'LUX', 'SWI', 'DEN', 'NOR', 'SWE', 'FIN', 'EST', 'LAT', 'LIT', 'IRE', 'ICE', 'PER', 'IRQ', 'SAU', 'YEM', 'OMA', 'AFG', 'ETH', 'LIB', 'SAF', 'CAN', 'AST', 'NZL', 'RAJ', 'NEP', 'TIB', 'MON', 'SIA', 'MEX', 'GUA', 'HON', 'ELS', 'NIC', 'COS', 'PAN', 'CUB', 'HAI', 'DOM', 'BRA', 'ARG', 'CHL', 'PRU', 'BOL', 'PAR', 'URU', 'COL', 'VEN', 'ECU'];

const ARMIES = {
  '1936': {
    GER: { inf: 22, arm: 3, ftr: 4, bmb: 2, flt: 2, sub: 3 }, ENG: { inf: 10, arm: 1, ftr: 5, bmb: 3, flt: 8, sub: 3 },
    FRA: { inf: 30, arm: 2, ftr: 4, bmb: 2, flt: 4, sub: 3 }, ITA: { inf: 20, arm: 1, ftr: 4, bmb: 2, flt: 4, sub: 4 },
    SOV: { inf: 40, arm: 5, ftr: 6, bmb: 3, flt: 2, sub: 4 }, USA: { inf: 8, ftr: 3, bmb: 2, flt: 7, sub: 2 },
    JAP: { inf: 18, arm: 1, ftr: 4, bmb: 2, flt: 7, sub: 2 }, CHI: { inf: 42, ftr: 1 }, PRC: { inf: 4 }, MAN: { inf: 4 },
    POL: { inf: 18, ftr: 1 }, CZE: { inf: 10, arm: 1, ftr: 1 }, SPR: { inf: 8, ftr: 1 }, RAJ: { inf: 8 }, ETH: { inf: 4 },
    TUR: { inf: 8 }, ROM: { inf: 10 }, YUG: { inf: 10 }, HUN: { inf: 4 }, AUS: { inf: 4 }, GRE: { inf: 5 }, BUL: { inf: 4 },
    CAN: { inf: 2 }, AST: { inf: 2, flt: 1 }, SAF: { inf: 2 }, BRA: { inf: 6 }, ARG: { inf: 5 }, HOL: { inf: 4, flt: 1 }, BEL: { inf: 6 },
    SWE: { inf: 5 }, FIN: { inf: 5 }, NOR: { inf: 2 }, SWI: { inf: 4 }, MEX: { inf: 4 }, PER: { inf: 4 }, SIA: { inf: 3 },
  },
  '1939': {
    GER: { inf: 52, arm: 8, ftr: 10, bmb: 6, flt: 3, sub: 6 }, ENG: { inf: 14, arm: 2, ftr: 8, bmb: 5, flt: 10, sub: 3 },
    FRA: { inf: 45, arm: 4, ftr: 6, bmb: 3, flt: 5, sub: 4 }, ITA: { inf: 28, arm: 2, ftr: 5, bmb: 3, flt: 5, sub: 5 },
    SOV: { inf: 60, arm: 8, ftr: 8, bmb: 5, flt: 2, sub: 5 }, USA: { inf: 10, ftr: 4, bmb: 3, flt: 8, sub: 3 },
    JAP: { inf: 32, arm: 2, ftr: 6, bmb: 3, flt: 9, sub: 3 }, CHI: { inf: 50, ftr: 1 }, PRC: { inf: 8 }, MAN: { inf: 5 },
    POL: { inf: 25, arm: 1, ftr: 2 }, RAJ: { inf: 10 }, ROM: { inf: 14 }, YUG: { inf: 12 }, HUN: { inf: 7 }, FIN: { inf: 8 },
    SPA: { inf: 12 }, TUR: { inf: 10 }, GRE: { inf: 7 }, CAN: { inf: 3 }, AST: { inf: 3, flt: 1 }, BEL: { inf: 8 }, HOL: { inf: 6, flt: 1 },
    SWE: { inf: 6 }, BRA: { inf: 6 }, SLO: { inf: 3 }, BUL: { inf: 5 },
  },
  '1950': {
    USA: { inf: 10, arm: 3, mec: 1, mar: 2, ftr: 8, bmb: 6, flt: 10, sub: 4 }, SOV: { inf: 50, arm: 15, mec: 5, ftr: 10, bmb: 6, flt: 4, sub: 8 },
    PRC: { inf: 50, arm: 1 }, PRK: { inf: 9, arm: 2, ftr: 1 }, KOR: { inf: 6 }, ENG: { inf: 10, arm: 3, ftr: 5, bmb: 3, flt: 6, sub: 2 },
    FRA: { inf: 14, arm: 2, ftr: 3, flt: 3 }, CHI: { inf: 8, ftr: 1, flt: 1 }, IND: { inf: 14, arm: 1 }, PAK: { inf: 7 }, ISR: { inf: 4, arm: 1 },
    EGY: { inf: 6, arm: 1 }, TUR: { inf: 10 }, ITA: { inf: 6 }, POL: { inf: 10 }, VIN: { inf: 4 }, JAP: { inf: 1 }, YUG: { inf: 10 },
  },
  '1962': {
    USA: { inf: 14, arm: 4, mec: 4, mar: 3, ftr: 10, bmb: 8, flt: 12, sub: 6 }, SOV: { inf: 50, arm: 20, mec: 10, ftr: 12, bmb: 8, flt: 6, sub: 10 },
    PRC: { inf: 60, arm: 3, ftr: 3 }, FRG: { inf: 8, arm: 4, ftr: 2 }, DDR: { inf: 4, arm: 2 }, VIN: { inf: 10 }, VIS: { inf: 8 }, IND: { inf: 15, arm: 2 },
    ENG: { inf: 10, arm: 3, ftr: 5, bmb: 3, flt: 6, sub: 3 }, FRA: { inf: 12, arm: 3, ftr: 4, flt: 3 }, ISR: { inf: 5, arm: 3, ftr: 2 },
    EGY: { inf: 8, arm: 3, ftr: 3 }, SYR: { inf: 5, arm: 1 }, CUB: { inf: 5, arm: 1 }, KOR: { inf: 10, arm: 1 }, PRK: { inf: 10, arm: 2 },
    CHI: { inf: 10, ftr: 2 }, TUR: { inf: 12, arm: 2 }, POL: { inf: 10, arm: 3 }, PAK: { inf: 8, arm: 1 }, IRQ: { inf: 6, arm: 1 },
  },
  '1979': {
    USA: { inf: 12, arm: 6, mec: 6, mar: 3, ftr: 12, bmb: 8, flt: 12, sub: 8 }, SOV: { inf: 45, arm: 25, mec: 15, ftr: 14, bmb: 8, flt: 8, sub: 12 },
    PRC: { inf: 60, arm: 6, ftr: 4 }, VIN: { inf: 20, arm: 2 }, IRQ: { inf: 10, arm: 4, ftr: 2 }, PER: { inf: 10, arm: 3, ftr: 2 },
    ISR: { inf: 6, arm: 5, ftr: 4 }, EGY: { inf: 8, arm: 3, ftr: 2 }, SYR: { inf: 6, arm: 3, ftr: 1 }, FRG: { inf: 10, arm: 6, ftr: 3 },
    ENG: { inf: 9, arm: 3, ftr: 5, flt: 5, sub: 3 }, FRA: { inf: 10, arm: 4, ftr: 4, flt: 3 }, IND: { inf: 18, arm: 3, ftr: 3 }, PAK: { inf: 10, arm: 2 },
    ARG: { inf: 6, ftr: 2, flt: 1 }, KOR: { inf: 12, arm: 2 }, PRK: { inf: 14, arm: 3 }, AFG: { inf: 4 }, CHI: { inf: 10, ftr: 2 }, TUR: { inf: 12, arm: 2 },
  },
};

const THREATS = {
  '1936': { GER: ['FRA', 'CZE', 'POL'], FRA: ['GER', 'ITA'], POL: ['GER', 'SOV'], CZE: ['GER'], SOV: ['POL', 'ROM', 'FIN', 'MAN', 'JAP', 'EST', 'LAT'], CHI: ['MAN', 'JAP'], MAN: ['CHI', 'SOV'], ITA: ['FRA', 'YUG', 'ETH'] },
  '1939': { GER: ['POL', 'FRA'], POL: ['GER'], FRA: ['GER', 'ITA'], SOV: ['FIN', 'POL', 'JAP', 'MAN'], CHI: ['JAP'], ITA: ['FRA', 'ENG'], ENG: ['ITA'] },
  '1950': { PRK: ['KOR'], KOR: ['PRK'], PRC: ['CHI', 'KOR'], SOV: ['FRG', 'TUR'], FRG: ['DDR'], ISR: ['EGY', 'JOR', 'SYR'], IND: ['PAK'], PAK: ['IND'] },
  '1962': { USA: ['CUB'], VIN: ['VIS'], VIS: ['VIN'], PRC: ['IND'], IND: ['PRC', 'PAK'], ISR: ['EGY', 'SYR', 'JOR'], FRG: ['DDR'], DDR: ['FRG'], KOR: ['PRK'], PRK: ['KOR'] },
  '1979': { IRQ: ['PER', 'KUW'], PER: ['IRQ'], ISR: ['SYR'], SOV: ['AFG', 'PRC'], PRC: ['VIN', 'SOV'], VIN: ['PRC'], KOR: ['PRK'], PRK: ['KOR'], ARG: ['CHL'], FRG: ['DDR'] },
};

function setTechAll(S, lvl, majors = {}) {
  for (const t in S.C) {
    const C = S.C[t]; if (!C.exists) continue;
    const major = WORLD.countries[t].major;
    const base = Math.max(0, lvl - (major ? 0 : 1));
    for (const k of ['inf', 'arm', 'air', 'nav', 'ind']) C.tech[k] = Math.max(0, base - (k === 'arm' && !major ? 1 : 0));
    if (majors[t]) Object.assign(C.tech, majors[t]);
  }
}

export function newGame(scenId, settings = {}) {
  const sc = SCEN[scenId] || SCEN['1936'];
  const S = {
    v: 1, scen: sc.id, day: strToDay('1936-01-01'), startDay: strToDay(sc.date), endDay: strToDay(settings.endDate || '1991-12-31'),
    set: { hist: settings.hist !== false, diff: settings.diff || 'normal', aiAggr: settings.aiAggr || 0 },
    rng: (settings.seed ?? Math.floor(Math.random() * 2 ** 31)) | 0,
    own: [], ctrl: [], core: [], ind: [], fort: [], dmg: [],
    C: {}, wars: {}, wv: 0, fac: {}, units: [], nid: 1, fired: {}, pending: {}, news: [], newsSeq: 0,
    tension: sc.tension, battles: [], navBattles: [], lend: {}, puppet: {}, flags: {}, over: null,
  };
  for (let r = 0; r < R; r++) {
    const n = nodes[r];
    S.own[r] = n.owner; S.ctrl[r] = n.owner; S.core[r] = n.owner; S.ind[r] = n.ind; S.fort[r] = n.fort; S.dmg[r] = 0;
  }
  for (let r = 0; r < R; r++) {
    const id = nodes[r].id;
    if (id.startsWith('man_') || id === 'jap_dalian') S.core[r] = 'CHI';
    if (LISTS.KOREA_S.includes(id)) S.core[r] = 'KOR';
    if (LISTS.KOREA_N.includes(id)) S.core[r] = 'PRK';
  }
  for (const tag of START_1936) newCountry(S, tag);
  const A = mkApi(S);
  setup1936(S, A);
  const order = ['1936', '1939', '1950', '1962', '1979'];
  const upto = order.indexOf(sc.id);
  if (upto >= 1) setup1939(S, A);
  if (upto >= 2) setup1950(S, A);
  if (upto >= 3) setup1962(S, A);
  if (upto >= 4) setup1979(S, A);
  S.day = S.startDay;
  // 開局前的獨立事件
  decolonize(S, A, S.day - 1);
  for (const e of EVENTS) if (e.day < S.day) S.fired[e.id] = -1;
  // 國名
  const y = yearOf(S.day);
  for (const [tag, , , , , o = {}] of COUNTRY_DEFS) {
    const C = S.C[tag]; if (!C || !o.nm) continue;
    for (const [yy, n] of o.nm) if (y >= yy) C.name = n;
  }
  // 部隊部署
  deployArmies(S, ARMIES[sc.id] || {}, THREATS[sc.id] || {});
  // 法律
  for (const t of liveTags(S)) {
    const C = S.C[t];
    if (Object.keys(S.wars).some(k => k.split('|').includes(t))) { C.laws.con = Math.max(C.laws.con, 2); C.laws.eco = Math.max(C.laws.eco, 2); }
  }
  S.news = []; S.newsSeq = 1;
  addNews(S, `劇本「${sc.name}」開始。`, 'major');
  for (const t of liveTags(S)) S.C[t].man = Math.max(S.C[t].man, Math.round((S.C[t].popCoreInit || popOf(S, t)) * 1000 * 0.012));
  return S;
}
function popOf(S, t) { let p = 0; for (let r = 0; r < R; r++) if (S.own[r] === t && S.core[r] === t) p += nodes[r].pop; return p; }

// ---------------------------------------------------------------- 1936
function setup1936(S, A) {
  makeFaction(S, 'allies', '同盟國', 'ENG', ['FRA', 'CAN', 'AST', 'NZL', 'SAF', 'RAJ']);
  makeFaction(S, 'comintern', '共產國際', 'SOV', ['MON']);
  makeFaction(S, 'cosphere', '大東亞共榮圈', 'JAP', ['MAN']);
  for (const t of ['CAN', 'AST', 'NZL', 'SAF', 'RAJ']) S.C[t].subj = null;
  S.C.MAN.subj = 'JAP'; S.C.MON.subj = null;
  setTechAll(S, 1, {
    GER: { inf: 1, arm: 1, air: 2, nav: 1, ind: 2 }, SOV: { inf: 1, arm: 1, air: 1, nav: 1, ind: 1 }, ENG: { inf: 1, arm: 1, air: 1, nav: 2, ind: 2 },
    FRA: { inf: 1, arm: 1, air: 1, nav: 1, ind: 1 }, USA: { inf: 1, arm: 0, air: 1, nav: 2, ind: 2 }, JAP: { inf: 1, arm: 0, air: 1, nav: 2, ind: 1 },
    ITA: { inf: 1, arm: 0, air: 1, nav: 1, ind: 1 }, CHI: { inf: 1, arm: 0, air: 0, nav: 0, ind: 0 },
  });
  for (const t of ['GER', 'SOV', 'JAP', 'ITA']) { S.C[t].laws.eco = 1; }
  S.C.GER.laws.con = 1;
  S.C.FIN.mods.def += 0.25;
  // 歷史修正：德軍訓練與準則優勢、蘇聯大清洗的後遺症（至 1942 年中）、日軍對華的裝備優勢
  S.C.GER.mods.att += 0.1; S.C.GER.mods.def += 0.08;
  S.C.SOV.mods.att -= 0.15; S.C.SOV.mods.def -= 0.08;
  (S.temp || (S.temp = [])).push({ tag: 'SOV', key: 'att', val: -0.15, until: strToDay('1942-07-01') }, { tag: 'SOV', key: 'def', val: -0.08, until: strToDay('1942-07-01') });
  S.C.CHI.mods.def += 0.15;
  // 日本「本土決戰」：投降門檻較低（需失去更多勝利點才會投降），直到原子彈事件
  S.C.JAP.capMod = 0.55;
  // 義衣戰爭
  setWar(S, 'ITA', 'ETH');
  S.ctrl[ridx('eth_harar')] = 'ITA';
  // 英國中東司令部
  for (const id of ['egy_alamein', 'egy_matruh', 'egy_alexandria']) spawnUnit(S, 'ENG', 'inf', ridx(id));
  spawnUnit(S, 'ENG', 'arm', ridx('egy_matruh'));
  // 義大利東非遠征軍
  for (let i = 0; i < 5; i++) spawnUnit(S, 'ITA', 'inf', ridx('ita_eritrea'));
  spawnUnit(S, 'ITA', 'arm', ridx('ita_eritrea'));
  for (let i = 0; i < 4; i++) spawnUnit(S, 'ITA', 'inf', ridx('eth_harar'));
  spawnUnit(S, 'ITA', 'bmb', ridx('ita_eritrea'));
  S.C.ITA.laws.con = 2; S.C.ETH.laws.con = 3;
}

// ---------------------------------------------------------------- 1939
function setup1939(S, A) {
  // 衣索比亞、阿爾巴尼亞併入義大利
  if (atWar(S, 'ITA', 'ETH')) delete S.wars['ETH|ITA'];
  S.wv++;
  A.annex('ETH', 'ITA');
  A.annex('ALB', 'ITA');
  // 德奧合併、捷克
  A.annex('AUS', 'GER');
  A.create('SLO', ['svk_bratislava', 'svk_kosice'], { ideo: 'fas', units: 0 });
  A.give(['cze_ruthenia'], 'HUN');
  A.annex('CZE', 'GER');
  // 西班牙：國民軍勝利
  createCountry(S, 'SPA', A.regionsOf('SPR'), { ideo: 'fas', units: 0 });
  if (alive(S, 'SPR')) killCountry(S, 'SPR', 'SPA');
  for (let r = 0; r < R; r++) if (S.core[r] === 'SPR') S.core[r] = 'SPA';
  S.C.SPA.cap = ridx('spa_madrid'); S.C.SPA.name = '西班牙';
  // 中日戰爭
  for (const id of ['chi_beiping', 'chi_shijiazhuang', 'chi_datong', 'chi_taiyuan', 'chi_jinan', 'chi_qingdao', 'chi_xuzhou', 'chi_nanjing', 'chi_shanghai', 'chi_hangzhou', 'chi_hefei', 'chi_wuhan', 'chi_nanchang', 'chi_guangzhou', 'chi_hainan', 'chi_chahar', 'chi_suiyuan', 'chi_zhengzhou']) S.ctrl[ridx(id)] = 'JAP';
  S.C.CHI.cap = ridx('chi_chongqing');
  for (const [a, b] of [['JAP', 'CHI'], ['JAP', 'PRC'], ['MAN', 'CHI'], ['MAN', 'PRC']]) setWar(S, a, b);
  S.C.CHI.nap.PRC = S.day + 3650; S.C.PRC.nap.CHI = S.day + 3650;
  // 軸心國與保證
  makeFaction(S, 'axis', '軸心國', 'GER', ['ITA']);
  S.C.SLO.subj = 'GER'; joinFaction(S, 'SLO', 'axis');
  for (const t of ['POL', 'ROM', 'GRE']) { S.C.ENG.guar.push(t); S.C.FRA.guar.push(t); }
  S.C.GER.nap.SOV = S.day + 3650; S.C.SOV.nap.GER = S.day + 3650;
  S.flags.mr_pact = true; S.flags.anschluss_demand = true; S.flags.sudeten_demand = true;
  setTechAll(S, 2, {
    GER: { inf: 2, arm: 3, air: 3, nav: 2, ind: 3 }, SOV: { inf: 2, arm: 2, air: 2, nav: 1, ind: 2 }, ENG: { inf: 2, arm: 2, air: 3, nav: 3, ind: 3 },
    FRA: { inf: 2, arm: 2, air: 2, nav: 2, ind: 2 }, USA: { inf: 2, arm: 1, air: 2, nav: 3, ind: 3 }, JAP: { inf: 2, arm: 1, air: 3, nav: 3, ind: 2 },
    ITA: { inf: 2, arm: 1, air: 2, nav: 2, ind: 2 }, CHI: { inf: 1, arm: 0, air: 1, nav: 0, ind: 1 },
  });
  S.C.GER.laws = { con: 2, eco: 2 }; S.C.SOV.laws = { con: 2, eco: 2 }; S.C.JAP.laws = { con: 2, eco: 2 };
  S.C.ENG.laws = { con: 1, eco: 1 }; S.C.FRA.laws = { con: 2, eco: 1 }; S.C.ITA.laws = { con: 1, eco: 1 };
  for (const [t, id] of [['GER', 'g_4yp'], ['GER', 'g_rearm'], ['GER', 'g_westwall'], ['SOV', 's_5yp2'], ['SOV', 's_army'], ['JAP', 'j_ind'], ['ENG', 'e_rearm'], ['FRA', 'f_maginot']]) S.C[t].focus.done.push(id);
  // 工業成長
  A.S.C.GER.mods.att += 0.05;
  for (const [t, n] of [['GER', 12], ['SOV', 14], ['JAP', 6], ['ENG', 6], ['FRA', 3], ['ITA', 3], ['USA', 6]]) addInd(S, t, n);
  S.fort[ridx('fin_karelia')] = 4;
  for (const id of ['ger_saar', 'ger_rhineland', 'ger_stuttgart']) S.fort[ridx(id)] = 3;
  for (const id of ['fra_lille', 'fra_sedan']) S.fort[ridx(id)] = 1;
}

// ---------------------------------------------------------------- 1950（二戰後世界）
function setup1950(S, A) {
  // 清除二戰前的戰爭
  S.wars = {}; S.wv++;
  // 德國
  germanSettlement(S, A, { scenario: true });
  A.create('FRG', ['ger_hamburg', 'ger_hannover', 'ger_ruhr', 'ger_rhineland', 'ger_saar', 'ger_frankfurt', 'ger_stuttgart', 'ger_munich', 'ger_nuremberg'], { ideo: 'dem', units: 0 });
  A.create('DDR', ['ger_berlin', 'ger_dresden', 'ger_erfurt', 'ger_magdeburg', 'ger_rostock'], { ideo: 'com', units: 0 });
  for (const id of ['ger_stettin', 'ger_neumark', 'ger_breslau', 'ger_oppeln', 'ger_allenstein', 'pol_danzig']) { transferRegion(S, ridx(id), 'POL'); S.core[ridx(id)] = 'POL'; }
  transferRegion(S, ridx('ger_koenigsberg'), 'SOV'); S.core[ridx('ger_koenigsberg')] = 'SOV';
  for (let r = 0; r < R; r++) if (['FRG', 'DDR'].includes(S.own[r])) S.core[r] = S.own[r];
  A.give(['aus_vienna', 'aus_salzburg'], 'AUS');
  if (!alive(S, 'AUS')) A.create('AUS', ['aus_vienna', 'aus_salzburg'], { ideo: 'neu' });
  for (const id of ['cze_prague', 'cze_sudeten', 'cze_brno', 'svk_bratislava', 'svk_kosice']) transferRegion(S, ridx(id), 'CZE', { core: true });
  if (alive(S, 'SLO')) killCountry(S, 'SLO', 'CZE');
  // 東歐與蘇聯擴張
  for (const t of ['EST', 'LAT', 'LIT']) if (alive(S, t)) A.annex(t, 'SOV');
  A.give(['pol_wilno', ...LISTS.POL_EAST, 'rom_bessarabia', 'rom_bukovina', 'fin_karelia', 'fin_sortavala', 'cze_ruthenia'], 'SOV', { core: true });
  for (const r of A.regionsOf('SOV')) S.core[r] = 'SOV';
  // 義大利
  if (alive(S, 'ITA')) {
    for (let r = 0; r < R; r++) if (S.core[r] === 'ITA' && nodes[r].mod === 'ITA') transferRegion(S, r, 'ITA');
  } else A.create('ITA', [], { ideo: 'dem' });
  A.give(['ita_tripoli', 'ita_sirte', 'ita_benghazi', 'ita_tobruk', 'ita_fezzan', 'ita_kufra', 'ita_eritrea'], 'ENG');
  A.give(['ita_rhodes'], 'GRE', { core: true });
  A.give(['ita_istria'], 'YUG', { core: true });
  if (!alive(S, 'ETH')) A.create('ETH', ['eth_addis', 'eth_gondar', 'eth_harar', 'eth_jimma'], { ideo: 'neu' }); else A.give(['eth_addis', 'eth_gondar', 'eth_harar', 'eth_jimma'], 'ETH');
  if (!alive(S, 'ALB')) A.create('ALB', ['alb_tirana'], { ideo: 'com' }); else A.give(['alb_tirana'], 'ALB');
  S.C.ITA.ideo = 'dem';
  // 日本
  A.give(['jap_karafuto'], 'SOV', { core: true });
  A.give(['jap_okinawa', 'jap_iwojima', 'jap_palau', 'jap_saipan', 'jap_truk', 'jap_kwajalein'], 'USA');
  A.give(['eng_newfoundland', 'eng_labrador'], 'CAN', { core: true });
  A.create('KOR', LISTS.KOREA_S, { ideo: 'dem', units: 0 });
  A.create('PRK', LISTS.KOREA_N, { ideo: 'com', units: 0 });
  S.C.JAP.ideo = 'dem';
  // 中國：中共勝利
  const mainland = [];
  for (let r = 0; r < R; r++) if (['CHI', 'MAN', 'PRC'].includes(S.own[r]) || nodes[r].id === 'jap_dalian') mainland.push(r);
  for (const r of mainland) { transferRegion(S, r, 'PRC'); S.core[r] = 'PRC'; }
  if (alive(S, 'MAN')) killCountry(S, 'MAN', 'PRC');
  A.give(['jap_taipei', 'jap_kaohsiung'], 'CHI', { core: true });
  S.C.CHI.cap = ridx('jap_taipei'); S.C.CHI.name = '中華民國 (臺灣)';
  S.C.PRC.cap = ridx('chi_beiping'); S.C.PRC.name = '中華人民共和國';
  // 南亞
  const pak = LISTS.PAK_REGIONS.map(ridx);
  const rajR = A.regionsOf('RAJ');
  A.create('PAK', pak, { ideo: 'neu', from: 'RAJ', units: 0 });
  A.create('IND', rajR.filter(r => !pak.includes(r)), { ideo: 'dem', from: 'RAJ', units: 0 });
  if (alive(S, 'RAJ')) killCountry(S, 'RAJ', 'IND');
  // 中東
  A.create('ISR', ['pal_telaviv', 'pal_haifa', 'pal_negev'], { ideo: 'dem', units: 0 });
  A.create('JOR', ['eng_transjordan', 'pal_westbank'], { ideo: 'neu', units: 0 });
  // 東南亞
  A.create('INS', LISTS.DEI, { ideo: 'neu', units: 0 });
  A.create('VIN', ['fra_vinh'], { ideo: 'com', units: 0 });
  setWar(S, 'VIN', 'FRA');
  // 冷戰陣營
  for (const f of Object.keys(S.fac)) { for (const m of [...S.fac[f].members]) leaveFaction(S, m, true); delete S.fac[f]; }
  makeFaction(S, 'nato', '北大西洋公約組織', 'USA', ['ENG', 'FRA', 'CAN', 'ITA', 'BEL', 'HOL', 'LUX', 'NOR', 'DEN', 'POR', 'ICE'].filter(t => alive(S, t)));
  for (const t of ['POL', 'CZE', 'HUN', 'ROM', 'BUL', 'ALB', 'DDR', 'PRK', 'MON', 'PRC']) if (alive(S, t)) S.C[t].ideo = 'com';
  S.C.YUG.ideo = 'com';
  makeFaction(S, 'comintern', '共產陣營', 'SOV', ['POL', 'CZE', 'HUN', 'ROM', 'BUL', 'ALB', 'DDR', 'PRK', 'MON', 'PRC'].filter(t => alive(S, t)));
  S.C.JAP.subj = 'USA';
  for (const t of ['SPA']) if (alive(S, t)) S.C[t].ideo = 'fas';
  S.C.FIN.ideo = 'dem';
  setTechAll(S, 5, {
    USA: { inf: 5, arm: 5, air: 6, nav: 6, ind: 6, nuc: 1 }, SOV: { inf: 5, arm: 6, air: 5, nav: 4, ind: 5, nuc: 1 },
    ENG: { inf: 5, arm: 5, air: 5, nav: 5, ind: 5 }, FRA: { inf: 5, arm: 4, air: 4, nav: 4, ind: 4 }, PRC: { inf: 3, arm: 2, air: 2, nav: 1, ind: 2 },
  });
  S.C.USA.nukes = 15; S.C.SOV.nukes = 2;
  S.flags.germanySettled = true; S.flags.japanSettled = true; S.flags.postwar = true; S.flags.vEDay = 1; S.flags.vjDay = 1;
  for (const [t, n] of [['USA', 30], ['SOV', 20], ['ENG', 6], ['FRA', 6], ['FRG', 6], ['JAP', 6], ['PRC', 6], ['IND', 4], ['ITA', 4]]) addInd(S, t, n);
  for (const t of ['USA', 'SOV']) { S.C[t].laws = { con: 2, eco: 2 }; }
  S.C.USA.res.push(null); S.C.SOV.res.push(null);
}

// ---------------------------------------------------------------- 1962
function setup1962(S, A) {
  S.wars = {}; S.wv++;
  // 韓戰結束（戰前邊界）、西藏、印度支那
  if (alive(S, 'TIB')) A.annex('TIB', 'PRC');
  const vin = ['fra_hanoi', 'fra_vinh'];
  A.give(vin, 'VIN', { core: true });
  A.create('VIS', ['fra_hue', 'fra_highlands', 'fra_saigon'], { ideo: 'neu', units: 0 });
  A.create('LAO', ['fra_laos', 'fra_laos_s'], { ideo: 'neu', units: 0 });
  A.create('CAM', ['fra_cambodia'], { ideo: 'neu', units: 0 });
  setWar(S, 'VIN', 'VIS');
  // 利比亞、厄利垂亞等
  A.create('LBA', ['ita_tripoli', 'ita_sirte', 'ita_benghazi', 'ita_tobruk', 'ita_fezzan', 'ita_kufra'], { ideo: 'neu', units: 0 });
  A.give(['ita_eritrea'], 'ETH');
  S.C.CUB.ideo = 'com';
  // 陣營
  joinFaction(S, 'GRE', 'nato'); joinFaction(S, 'TUR', 'nato'); joinFaction(S, 'FRG', 'nato');
  const mem = ['POL', 'DDR', 'CZE', 'HUN', 'ROM', 'BUL'].filter(t => alive(S, t));
  for (const m of [...(S.fac.comintern ? S.fac.comintern.members : [])]) leaveFaction(S, m, true);
  delete S.fac.comintern;
  makeFaction(S, 'warsaw', '華沙公約組織', 'SOV', mem);
  S.C.JAP.subj = null;
  S.C.USA.guar.push('JAP', 'KOR', 'CHI');
  // 剛果危機
  // 加丹加在去殖民化後建立
  S.flags.katanga = true;
  setTechAll(S, 7, {
    USA: { inf: 7, arm: 7, air: 7, nav: 7, ind: 7, nuc: 3 }, SOV: { inf: 7, arm: 7, air: 7, nav: 6, ind: 6, nuc: 3 },
    ENG: { nuc: 2 }, FRA: { nuc: 1 }, PRC: { inf: 5, arm: 4, air: 4, nav: 3, ind: 4 },
  });
  S.C.USA.nukes = 30; S.C.SOV.nukes = 20; S.C.ENG.nukes = 4; S.C.FRA.nukes = 1;
  for (const [t, n] of [['USA', 15], ['SOV', 15], ['FRG', 10], ['JAP', 10], ['PRC', 6], ['ENG', 4], ['FRA', 5], ['ITA', 5], ['IND', 4]]) addInd(S, t, n);
}

// ---------------------------------------------------------------- 1979
function setup1979(S, A) {
  S.wars = {}; S.wv++;
  // 越南統一
  if (alive(S, 'VIS')) A.annex('VIS', 'VIN');
  S.C.VIN.name = '越南';
  for (const r of A.regionsOf('VIN')) S.core[r] = 'VIN';
  S.C.LAO.ideo = 'com'; S.C.CAM.ideo = 'com'; S.C.CAM.subj = 'VIN';
  // 孟加拉
  A.create('BAN', ['raj_dacca'], { ideo: 'neu', units: 0 });
  // 中東
  A.give(['pal_westbank'], 'ISR');
  S.C.PER.ideo = 'neu'; S.C.PER.name = '伊朗伊斯蘭共和國';
  S.C.AFG.ideo = 'com'; S.C.ETH.ideo = 'com';
  S.C.SPA.ideo = 'dem'; S.C.POR.ideo = 'dem'; S.C.GRE.ideo = 'dem';
  if (alive(S, 'NIC')) S.C.NIC.ideo = 'com';
  if (alive(S, 'KAT')) A.annex('KAT', 'COG');
  if (alive(S, 'BIA')) A.annex('BIA', 'NIG');
  if (alive(S, 'SIN') === false && S.own[ridx('eng_singapore')]) A.create('SIN', ['eng_singapore'], { ideo: 'dem', units: 1 });
  A.give(['jap_okinawa', 'jap_iwojima'], 'JAP');
  setTechAll(S, 8, {
    USA: { inf: 8, arm: 8, air: 9, nav: 9, ind: 9, nuc: 3 }, SOV: { inf: 8, arm: 8, air: 8, nav: 8, ind: 8, nuc: 3 },
    ENG: { nuc: 3 }, FRA: { nuc: 3 }, PRC: { inf: 6, arm: 5, air: 5, nav: 4, ind: 6, nuc: 2 }, ISR: { inf: 8, arm: 8, air: 8 },
  });
  S.C.USA.nukes = 30; S.C.SOV.nukes = 30; S.C.ENG.nukes = 6; S.C.FRA.nukes = 6; S.C.PRC.nukes = 4;
  for (const [t, n] of [['USA', 12], ['SOV', 10], ['FRG', 6], ['JAP', 14], ['PRC', 8], ['IND', 6], ['KOR', 6], ['CHI', 6]]) addInd(S, t, n);
  S.C.CHI.guar = []; S.C.USA.guar = S.C.USA.guar.filter(x => x !== 'CHI');
}

function addInd(S, tag, n) {
  if (!alive(S, tag)) return;
  const regs = [];
  for (let r = 0; r < R; r++) if (S.own[r] === tag && S.core[r] === tag) regs.push(r);
  regs.sort((a, b) => nodes[b].pop + nodes[b].ind - nodes[a].pop - nodes[a].ind);
  let i = 0, g = 0;
  while (n > 0 && regs.length && g++ < 500) { const r = regs[i++ % regs.length]; if (S.ind[r] < nodes[r].indCap + 4) { S.ind[r]++; n--; } }
}

// ---------------------------------------------------------------- 部隊部署
export function deployArmies(S, spec, threats) {
  for (const t of liveTags(S)) {
    const C = S.C[t];
    const regs = [];
    for (let r = 0; r < R; r++) if (S.own[r] === t && S.ctrl[r] === t) regs.push(r);
    if (!regs.length) continue;
    let pop = 0, ind = 0; for (const r of regs) { pop += nodes[r].pop; ind += S.ind[r]; }
    const existing = S.units.filter(u => u.c === t).length;
    const sp = spec[t] || { inf: Math.max(1, Math.min(10, Math.round(regs.length * 0.5 + ind * 0.3 + pop / 15))) };
    const th = new Set(threats[t] || []);
    const w = regs.map(r => {
      let x = 0.15 + nodes[r].vp / 12;
      if (r === C.cap) x += 2.5;
      for (const m of nodes[r].landNb) {
        const o = S.ctrl[m];
        if (!o || o === t || friendly(S, t, o)) continue;
        x += 1;
        if (atWar(S, t, o)) x += 5;
        if (th.has(o)) x += 4;
      }
      return x;
    });
    const placeLand = (type, n) => {
      const ww = w.slice();
      for (let i = 0; i < n; i++) {
        let tot = 0; for (const v of ww) tot += v;
        let p = rand(S) * tot, k = 0;
        for (; k < ww.length - 1; k++) { p -= ww[k]; if (p <= 0) break; }
        spawnUnit(S, t, type, regs[k]);
        ww[k] *= 0.7;
      }
    };
    for (const type of ['inf', 'arm', 'mec', 'mar']) if (sp[type]) placeLand(type, existing ? Math.max(0, sp[type] - (type === 'inf' ? existing : 0)) : sp[type]);
    const best = regs.slice().sort((a, b) => w[regs.indexOf(b)] - w[regs.indexOf(a)]);
    for (const type of ['ftr', 'bmb']) for (let i = 0; i < (sp[type] || 0); i++) spawnUnit(S, t, type, i % 2 === 0 ? C.cap : best[i % Math.min(3, best.length)]);
    for (const type of ['flt', 'sub']) for (let i = 0; i < (sp[type] || 0); i++) { const z = deployRegion(S, t, type); if (z !== undefined) spawnUnit(S, t, type, z); }
  }
}
