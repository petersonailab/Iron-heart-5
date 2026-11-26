// 遊戲入口：組合引擎、歷史事件、AI 與劇本
import './history.js';
import './ai.js';
import { newGame, SCENARIOS, SCEN } from './scenarios.js';
import { tick, liveTags, atWar, cname, scores, recalc } from './engine.js';
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
export function deserialize(json) { return typeof json === 'string' ? JSON.parse(json) : json; }
export function warsSummary(S) {
  const out = [];
  for (const k in S.wars) { const [a, b] = k.split('|'); out.push(`${cname(S, a)}–${cname(S, b)}`); }
  return out;
}
export { liveTags, atWar };
