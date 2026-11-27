// 把國策、科技、事件選項的效果轉成「圖示＋說明」清單，讓玩家清楚看到獎勵內容
import { UNITS, TECH_MAP, TECH_CATS, LAWS } from '../data/rules.js';
import { unitModel } from '../data/models.js';
import { hasTech, cname, rname, enemySet, atWar } from '../core/engine.js';
import { WORLD } from '../core/world.js';
import { uiIcon, glyphSVG } from './icons.js';

const pct = (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
const sgn = (v) => (v > 0 ? `+${v}` : `${v}`);
const MOD_NAMES = { att: ['陸軍攻擊', '所有陸軍單位的攻擊力'], def: ['陸軍防禦', '所有陸軍單位的防禦力'], armorAtt: ['裝甲攻擊', '坦克與機械化部隊的攻擊力'], air: ['空軍戰力', '戰機的空戰能力與轟炸效果'], nav: ['海軍戰力', '艦艇的攻擊與防禦'], raid: ['潛艇破交', '潛艇破壞敵國海運、降低其生產的效果'], speed: ['機動速度', '陸軍的移動速度'], icp: ['軍工產能', '每天可用於生產的產能'], fcost: ['工廠成本', '興建工廠所需的產能'], upk: ['部隊維持費', '每天花在維持部隊上的產能'], escort: ['海運損失', '敵方潛艇造成的海運損失'] };
const CAT_NAME = Object.fromEntries(TECH_CATS.map(c => [c.id, c.name]));
const ideoName = { dem: '民主', fas: '法西斯/軍國', com: '共產', neu: '中立/威權' };

// 單一效果項目：{ ic: 圖示名稱或兵種, t: 標題, d: 詳細說明, good: true/false/null }
export function focusEffects(S, tag, e) {
  const C = S && S.C[tag];
  const out = [];
  const perFactory = C && C.indTotal ? (C.ic || 0) / Math.max(1, C.indTotal) : 1;
  if (e.ind > 0) out.push({ ic: 'ic', t: `工業 +${e.ind}`, d: `在核心地區興建 ${e.ind} 座工廠。以目前的經濟法與工業科技，每座工廠每天約提供 ${perFactory.toFixed(2)} 軍工產能（合計約 +${(perFactory * e.ind).toFixed(1)}）。`, good: true });
  if (e.ind < 0) out.push({ ic: 'ic', t: `工業 ${e.ind}`, d: `失去 ${-e.ind} 座工廠。`, good: false });
  if (e.icp) out.push({ ic: 'ic', t: `軍工產能 ${pct(e.icp)}（永久）`, d: `所有工廠的產出永久提高 ${Math.round(e.icp * 100)}%${C ? `（目前約 +${((C.ic || 0) * e.icp).toFixed(1)} 產能/天）` : ''}。`, good: e.icp > 0 });
  if (e.fcost) out.push({ ic: 'ic', t: `工廠建造成本 −${Math.round(e.fcost * 100)}%（永久）`, d: '興建新工廠需要的產能減少，經濟成長更快。', good: true });
  if (e.upk) out.push({ ic: 'army', t: `部隊維持費 −${Math.round(e.upk * 100)}%（永久）`, d: `每天花在維持部隊上的產能減少${C ? `（目前約省下 ${((C.upkeep || 0) * e.upk).toFixed(1)} 產能/天）` : ''}，可用於生產的產能增加。`, good: true });
  if (e.escort) out.push({ ic: 'port', t: `海運損失 −${Math.round(e.escort * 100)}%（永久）`, d: '敵方潛艇破交造成的產能損失降低。', good: true });
  if (e.pp) out.push({ ic: 'pp', t: `政治點數 ${sgn(e.pp)}（立即）`, d: '政治點數用於變更法律、宣戰、保證他國獨立與其他外交行動。', good: e.pp > 0 });
  if (e.ppd) out.push({ ic: 'pp', t: `每日政治點數 +${e.ppd}（永久）`, d: `每 100 天可多獲得 ${Math.round(e.ppd * 100)} 政治點數。`, good: true });
  if (e.res) out.push({ ic: 'research', t: `研究欄位 +${e.res}`, d: '可以同時研究的科技數量增加（最多 5 個）。', good: true });
  if (e.rsp) out.push({ ic: 'research', t: `研究速度 ${pct(e.rsp)}（永久）`, d: '所有科技的研究速度改變。', good: e.rsp > 0 });
  if (e.rcat) for (const k in e.rcat) out.push({ ic: 'research', t: `${CAT_NAME[k] || k}研究速度 ${pct(e.rcat[k])}（永久）`, d: `「${CAT_NAME[k] || k}」類別的科技研究更快。`, good: true });
  if (e.techs) for (const id of e.techs) { const T = TECH_MAP[id]; if (!T) continue; out.push({ ic: 'research', t: `立即獲得科技：${T.name}`, d: `${T.desc}${T.e.unlock ? `　解鎖兵種：${UNITS[T.e.unlock].name}。` : ''}`, good: true }); }
  if (e.nukeSpeed) out.push({ ic: 'nuke', t: `核子研究速度 ${pct(e.nukeSpeed)}`, d: '原子彈、氫彈、洲際飛彈等戰略科技研究更快。', good: true });
  if (e.nukes) out.push({ ic: 'nuke', t: `核子武器 +${e.nukes}`, d: '立即獲得核彈，可用於核子攻擊或嚇阻。', good: true });
  for (const k of ['att', 'def', 'armorAtt', 'air', 'nav', 'raid', 'speed']) if (e[k]) out.push({ ic: k === 'air' ? 'plane' : k === 'nav' || k === 'raid' ? 'port' : k === 'armorAtt' ? 'tank' : 'army', t: `${MOD_NAMES[k][0]} ${pct(e[k])}（永久）`, d: `${MOD_NAMES[k][1]}${e[k] > 0 ? '提高' : '降低'} ${Math.abs(Math.round(e[k] * 100))}%。`, good: e[k] > 0 });
  if (e.man) out.push({ ic: 'man', t: `人力 ${sgn(e.man)} 千`, d: e.man > 0 ? `可以多組建約 ${Math.floor(e.man / 12)} 個步兵師（每師需 12 千人）。` : '人口與兵源損失。', good: e.man > 0 });
  if (e.units) for (const t in e.units) {
    const m = C ? unitModel(S, tag, t, (id) => hasTech(C, id)) : null;
    out.push({ ic: 'u:' + t, t: `立即獲得：${UNITS[t] ? UNITS[t].name : t} ×${e.units[t]}`, d: `${m ? `型號：${m.name}${m.from !== tag ? `（${cname(S, m.from)}型）` : ''}。` : ''}部署在首都或你設定的部署地點。`, good: true });
  }
  if (e.fort) out.push({ ic: 'fort', t: `邊境要塞 +${e.fort} 級`, d: '在與他國接壤的重要地區修築要塞（每級防禦 +20%，最多 5 級）。', good: true });
  if (e.fortAt) out.push({ ic: 'fort', t: `要塞 +${e.fortLvl} 級`, d: `地點：${e.fortAt.map(id => { const r = WORLD.idx.get(id); return r === undefined ? id : (S ? rname(S, r) : WORLD.nodes[r].name); }).join('、')}（每級防禦 +20%）。`, good: true });
  if (e.capFort) out.push({ ic: 'fort', t: `首都要塞 +${e.capFort} 級`, d: '在首都周邊修築環形防禦工事（每級防禦 +20%）。', good: true });
  if (e.coastFort) out.push({ ic: 'fort', t: `沿海要塞 +${e.coastFort} 級`, d: '在最重要的 6 個沿海地區修築海岸防禦，抵禦兩棲登陸。', good: true });
  if (e.ideo) out.push({ ic: 'politics', t: `意識形態改為${ideoName[e.ideo] || e.ideo}`, d: '影響可頒布的法律、陣營關係與 AI 的外交態度。', good: null });
  if (e.joinFac) out.push({ ic: 'diplomacy', t: { dem: '加入民主陣營', fas: '加入軸心國', com: '加入共產陣營' }[e.joinFac] || '加入陣營', d: '成為陣營成員：盟友遭攻擊時會一同參戰。', good: null });
  if (e.leaveFac) out.push({ ic: 'diplomacy', t: '退出目前的陣營', d: '失去盟友的保護。', good: null });
  if (e.guar) out.push({ ic: 'diplomacy', t: `保證 ${e.guar.map(t => cname(S, t)).join('、')} 的獨立`, d: '對方遭到攻擊時，你會自動對侵略者宣戰。', good: null });
  if (e.nap) out.push({ ic: 'diplomacy', t: `與 ${e.nap.map(t => cname(S, t)).join('、')} 簽訂互不侵犯條約`, d: '十年內雙方宣戰需要額外的政治點數。', good: null });
  if (e.war) out.push({ ic: 'flag', t: `⚔ 立即對${cname(S, e.war)}宣戰${e.civil ? '（內戰）' : ''}`, d: e.civil ? '內戰：一方投降時，全境併入勝利者。' : '對方的盟友可能一同參戰。', good: null });
  if (e.tension) out.push({ ic: 'flag', t: `世界緊張度 ${sgn(e.tension)}`, d: '緊張度越高，民主國家越能動員備戰。', good: null });
  if (e.flag === 'zhang_dead') out.push({ ic: 'politics', t: '張學良遭處決', d: '西安事變不會發生，國共內戰將繼續下去。', good: null });
  return out;
}
export function iconHTML(ic) { return ic.startsWith('u:') ? glyphSVG(ic.slice(2), 'gl ef-ic') : uiIcon(ic, 'ui-svg ef-ic'); }
export function effectsHTML(list, compact = false) {
  if (!list.length) return '<div class="eflist"><div class="ef none">沒有直接效果</div></div>';
  return `<div class="eflist${compact ? ' compact' : ''}">${list.map(x => `<div class="ef ${x.good === true ? 'good' : x.good === false ? 'bad' : ''}">${iconHTML(x.ic)}<div><b>${x.t}</b>${!compact && x.d ? `<small>${x.d}</small>` : ''}</div></div>`).join('')}</div>`;
}

// ------------------------------------------------------------ 狀態差異（事件選項的預估效果與選擇後的結果）
export function stateSig(S, tag) {
  const C = S.C[tag]; if (!C) return null;
  const units = {}, regions = new Set();
  for (const u of S.units) if (!u.dead && u.c === tag) units[u.id] = u.t;
  let ind = 0;
  for (let r = 0; r < S.own.length; r++) if (S.own[r] === tag) { regions.add(r); ind += S.ind[r] || 0; }
  return {
    exists: C.exists !== false, pp: C.pp || 0, man: C.man || 0, nukes: C.nukes || 0, ind, units, regions,
    enemies: new Set(enemySet(S, tag)), guar: [...(C.guar || [])], nap: Object.keys(C.nap || {}).filter(k => C.nap[k] > S.day),
    lend: Object.keys(S.lend || {}).filter(k => k.startsWith(tag + '>')), techs: new Set(C.techs || []), laws: { ...(C.laws || {}) },
    fac: C.fac, ideo: C.ideo, mods: { ...(C.mods || {}) }, temp: (S.temp || []).filter(t => t.tag === tag).map(t => `${t.key}|${t.val}|${t.until}`), tension: S.tension || 0, day: S.day,
  };
}
export function diffSig(S, tag, a, b) {
  const out = [];
  if (!a || !b) return out;
  if (a.exists && !b.exists) { out.push({ ic: 'flag', t: '國家滅亡', good: false }); return out; }
  const dpp = Math.round(b.pp - a.pp); if (Math.abs(dpp) >= 1) out.push({ ic: 'pp', t: `政治點數 ${sgn(dpp)}`, good: dpp > 0 });
  const dman = Math.round(b.man - a.man); if (Math.abs(dman) >= 5) out.push({ ic: 'man', t: `人力 ${sgn(dman)} 千`, good: dman > 0 });
  const dind = b.ind - a.ind; if (dind) out.push({ ic: 'ic', t: `工業 ${sgn(dind)}`, good: dind > 0 });
  const dn = b.nukes - a.nukes; if (dn) out.push({ ic: 'nuke', t: `核子武器 ${sgn(dn)}`, good: dn > 0 });
  // 部隊
  const added = {}, lost = {};
  const newIds = [];
  for (const id in b.units) if (!(id in a.units)) { added[b.units[id]] = (added[b.units[id]] || 0) + 1; newIds.push(Number(id)); }
  for (const id in a.units) if (!(id in b.units)) lost[a.units[id]] = (lost[a.units[id]] || 0) + 1;
  for (const t in added) out.push({ ic: 'u:' + t, t: `${UNITS[t] ? UNITS[t].name : t} +${added[t]}`, good: true });
  for (const t in lost) out.push({ ic: 'u:' + t, t: `${UNITS[t] ? UNITS[t].name : t} −${lost[t]}`, good: false });
  // 領土
  const gained = [...b.regions].filter(r => !a.regions.has(r)), gone = [...a.regions].filter(r => !b.regions.has(r));
  const names = (rs) => rs.slice(0, 4).map(r => rname(S, r)).join('、') + (rs.length > 4 ? ` 等 ${rs.length} 個地區` : '');
  if (gained.length) out.push({ ic: 'flag', t: `獲得領土：${names(gained)}`, good: true });
  if (gone.length) out.push({ ic: 'flag', t: `失去領土：${names(gone)}`, good: false });
  // 戰爭與外交
  for (const e of b.enemies) if (!a.enemies.has(e)) out.push({ ic: 'flag', t: `⚔ 與${cname(S, e)}進入戰爭`, good: null });
  for (const e of a.enemies) if (!b.enemies.has(e)) out.push({ ic: 'diplomacy', t: `🕊 與${cname(S, e)}停戰`, good: null });
  for (const g of b.guar) if (!a.guar.includes(g)) out.push({ ic: 'diplomacy', t: `保證${cname(S, g)}的獨立`, good: null });
  for (const n of b.nap) if (!a.nap.includes(n)) out.push({ ic: 'diplomacy', t: `與${cname(S, n)}互不侵犯`, good: null });
  for (const l of b.lend) if (!a.lend.includes(l)) out.push({ ic: 'diplomacy', t: `開始軍援${cname(S, l.split('>')[1])}`, good: null });
  if (b.fac !== a.fac) out.push({ ic: 'diplomacy', t: b.fac ? `加入${(S.fac[b.fac] && S.fac[b.fac].name) || '陣營'}` : '退出陣營', good: null });
  if (b.ideo !== a.ideo) out.push({ ic: 'politics', t: `意識形態改為${ideoName[b.ideo] || b.ideo}`, good: null });
  for (const k of ['con', 'eco']) if (b.laws[k] !== a.laws[k] && LAWS[k]) out.push({ ic: 'politics', t: `頒布「${LAWS[k].levels[b.laws[k]].name}」`, good: null });
  for (const id of b.techs) if (!a.techs.has(id) && TECH_MAP[id]) out.push({ ic: 'research', t: `獲得科技：${TECH_MAP[id].name}`, good: true });
  // 永久與暫時加成
  const tmpD = {};
  for (const t of b.temp) if (!a.temp.includes(t)) { const [k, v] = t.split('|'); tmpD[k] = (tmpD[k] || 0) + Number(v); }
  for (const t of a.temp) if (!b.temp.includes(t)) { const [k, v, until] = t.split('|'); if (Number(until) > b.day) tmpD[k] = (tmpD[k] || 0) - Number(v); }
  for (const k in MOD_NAMES) { const d = (b.mods[k] || 0) - (a.mods[k] || 0) - (tmpD[k] || 0); if (Math.abs(d) > 0.001) out.push({ ic: 'army', t: `${MOD_NAMES[k][0]} ${pct(d)}（永久）`, good: k === 'fcost' || k === 'upk' || k === 'escort' ? d > 0 : d > 0 }); }
  for (const t of b.temp) if (!a.temp.includes(t)) { const [k, v, until] = t.split('|'); const days = Number(until) - b.day; if (MOD_NAMES[k]) out.push({ ic: 'army', t: `${MOD_NAMES[k][0]} ${pct(Number(v))}（${days} 天）`, good: Number(v) > 0 }); }
  const dt = Math.round(b.tension - a.tension); if (Math.abs(dt) >= 1) out.push({ ic: 'flag', t: `世界緊張度 ${sgn(dt)}`, good: null });
  out.newUnits = newIds;
  return out;
}
export function atWarWith(S, tag, other) { return atWar(S, tag, other); }
