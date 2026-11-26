// 遊戲入口：組合引擎、歷史事件、AI 與劇本
import './history.js';
import './ai.js';
import { newGame, SCENARIOS, SCEN } from './scenarios.js';
import { tick, liveTags, atWar, cname, scores, recalc, techsUpTo } from './engine.js';
import { yearOf } from './util.js';
import { applyCommand } from './commands.js';

export { SCENARIOS, SCEN, applyCommand, scores };

const HINTS = {
  '1936': { GER: ['CZE', 'POL', 'FRA'], SOV: ['POL', 'FIN', 'MAN'], JAP: ['CHI', 'SOV'], ITA: ['ETH', 'FRA', 'YUG'], CHI: ['MAN', 'JAP'] },
  '1939': { GER: ['POL', 'FRA'], SOV: ['FIN', 'POL'], FRA: ['GER', 'ITA'], POL: ['GER'] },
  '1950': { PRK: ['KOR'], KOR: ['PRK'], ISR: ['EGY', 'JOR', 'SYR'] },
  '1962': { VIN: ['VIS'], VIS: ['VIN'], IND: ['PRC', 'PAK'], PRC: ['IND'] },
  '1979': { IRQ: ['PER', 'KUW'], PER: ['IRQ'] },
};

export function createGame(scen, settings = {}) {
  const S = newGame(scen, settings);
  S.hints = HINTS[S.scen] || {};
  recalc(S);
  return S;
}
export function step(S, days = 1) { for (let i = 0; i < days && !S.over; i++) tick(S); }
export function serialize(S) {
  return JSON.stringify(S, (k, v) => (k && k[0] === '_' ? undefined : v));
}
export function deserialize(json) {
  const S = typeof json === 'string' ? JSON.parse(json) : json;
  // 舊版存檔：逐級科技 → 科技樹
  const y = yearOf(S.day);
  for (const t in S.C) {
    const C = S.C[t];
    if (!C.techs) { C.techs = techsUpTo(y - (C.tech && C.tech.ind >= 3 ? 1 : 3)); delete C.tech; }
    if (!C.rcat) C.rcat = {};
    if (C.res) C.res = C.res.map(x => (x && x.cat ? null : x));
  }
  return S;
}
export function warsSummary(S) {
  const out = [];
  for (const k in S.wars) { const [a, b] = k.split('|'); out.push(`${cname(S, a)}–${cname(S, b)}`); }
  return out;
}
export { liveTags, atWar };
