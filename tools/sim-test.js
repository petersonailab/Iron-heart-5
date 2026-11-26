// 無頭模擬測試：node tools/sim-test.js [劇本] [年數] [種子]
import { createGame, step, serialize, warsSummary } from '../public/js/core/game.js';
import { WORLD, ridx } from '../public/js/core/world.js';
import { dayToDate, fmtDate } from '../public/js/core/util.js';
import { liveTags, cname } from '../public/js/core/engine.js';

const scen = process.argv[2] || '1936';
const years = Number(process.argv[3] || 10);
const seed = Number(process.argv[4] || 1234);
const verbose = process.argv.includes('-v');
const S = createGame(scen, { seed });
console.log(`劇本 ${scen} 開始於 ${fmtDate(S.day)}，國家 ${liveTags(S).length}，部隊 ${S.units.length}`);
const watch = ['ger_berlin', 'fra_paris', 'sov_moscow', 'pol_warsaw', 'eng_london', 'chi_nanjing', 'chi_chongqing', 'jap_tokyo', 'sov_leningrad', 'sov_stalingrad', 'egy_cairo', 'jap_seoul', 'ita_rome', 'usa_manila', 'eng_singapore'];
let lastNews = 0;
const t0 = Date.now();
const days = Math.round(years * 365);
let tickTime = 0, maxTick = 0;
for (let d = 0; d < days && !S.over; d++) {
  const a = performance.now();
  step(S, 1);
  const dt = performance.now() - a; tickTime += dt; if (dt > maxTick) maxTick = dt;
  for (const n of S.news) {
    if (n.id <= lastNews) continue;
    lastNews = n.id;
    if (verbose || ['war', 'major', 'peace', 'nuke'].includes(n.k) || (n.k === 'hist' && n.t.length < 70)) console.log(`  ${fmtDate(n.d)} ${n.t.slice(0, 120)}`);
  }
  const { m, d: dd } = dayToDate(S.day);
  if (m === 1 && dd === 1) {
    const ctl = watch.map(id => `${id.split('_')[1]}:${S.ctrl[ridx(id)]}`).join(' ');
    const top = liveTags(S).map(t => [t, S.C[t].ic || 0]).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, ic]) => `${t}:${Math.round(ic)}/${S.units.filter(u => u.c === t).length}`).join(' ');
    console.log(`== ${dayToDate(S.day).y} == 戰爭 ${Object.keys(S.wars).length} 部隊 ${S.units.length} 平均tick ${(tickTime / 365).toFixed(1)}ms 最大 ${maxTick.toFixed(0)}ms\n   ${ctl}\n   ${top}`);
    tickTime = 0; maxTick = 0;
  }
}
console.log(`結束 ${fmtDate(S.day)}，耗時 ${((Date.now() - t0) / 1000).toFixed(1)}s，存檔大小 ${(serialize(S).length / 1024).toFixed(0)}KB`);
console.log('進行中的戰爭：', warsSummary(S).slice(0, 30).join('、'));
if (S.over) console.log('遊戲結束：', S.over.reason);
