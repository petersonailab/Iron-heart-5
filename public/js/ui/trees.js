// 科技樹與國策樹（全螢幕檢視）
import { TECHS, TECH_MAP, TECH_CATS, UNITS } from '../data/rules.js';
import { canResearch, researchCost, researchSpeed, hasTech, focusTrees, focusAvailable, focusDays, cname, rname } from '../core/engine.js';
import { WORLD } from '../core/world.js';
import { yearOf } from '../core/util.js';
import { MODELS, modelFor } from '../data/models.js';
import { modelSVG, uiIcon, glyphSVG } from './icons.js';
import { focusEffects, effectsHTML } from './describe.js';
import { flagURL } from './flags.js';

let ctx = null; // { S(), me(), cmd(c), toast(t,k), esc(s), effText(e) }
const st = { kind: null, tab: null, scroll: {} };
const $ = (s) => document.querySelector(s);

export function initTrees(c) {
  ctx = c;
  const el = $('#tree');
  el.addEventListener('pointerdown', (e) => { lastPtr = e.pointerType; });
  el.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const n = e.target.closest('[data-tid],[data-fid]');
    if (n) { const id = n.dataset.tid || n.dataset.fid; if (id !== detailFor || detailSheet) showDetail(n, false); }
  });
  el.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse' || detailSheet) return;
    const n = e.target.closest('[data-tid],[data-fid]');
    if (n && !(e.relatedTarget && n.contains(e.relatedTarget))) hideDetail();
  });
  el.addEventListener('scroll', () => { if (!detailSheet) hideDetail(); }, true);
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-tclose]')) { closeTree(); return; }
    const nd = e.target.closest('[data-tid],[data-fid]');
    if (nd && lastPtr !== 'mouse') {
      const id = nd.dataset.tid || nd.dataset.fid;
      if (!(detailSheet && detailFor === id)) { showDetail(nd, true); return; }
    }
    if (!nd && detailSheet) hideDetail();
    const tab = e.target.closest('[data-ttab]');
    if (tab) { saveScroll(); st.tab = tab.dataset.ttab; render(); return; }
    const tn = e.target.closest('[data-tid]');
    if (tn) { clickTech(tn.dataset.tid); return; }
    const fn = e.target.closest('[data-fid]');
    if (fn) { clickFocus(fn.dataset.fid); return; }
    const cs = e.target.closest('[data-tcancel]');
    if (cs) { ctx.cmd({ type: 'research_cancel', slot: Number(cs.dataset.tcancel) }).then(() => refreshTree()); return; }
    if (e.target.closest('[data-fcancel]')) { ctx.cmd({ type: 'focus_cancel' }).then(() => refreshTree()); }
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.kind) closeTree(); });
}
export function treeOpen() { return !!st.kind; }
export function openTree(kind, tab) {
  st.kind = kind; st.tab = tab || st.tab;
  $('#tree').classList.remove('hidden');
  render();
}
export function closeTree() { saveScroll(); hideDetail(); st.kind = null; $('#tree').classList.add('hidden'); $('#tree').innerHTML = ''; }
let lastRefresh = 0;
export function refreshTree(force = true) {
  if (!st.kind) return;
  const now = performance.now();
  if (!force && now - lastRefresh < 1000) return;
  lastRefresh = now;
  saveScroll(); render();
}
function saveScroll() { const b = $('#tree .tbody'); if (b && st.kind) st.scroll[st.kind + ':' + st.tab] = [b.scrollLeft, b.scrollTop]; }
function restoreScroll() {
  const b = $('#tree .tbody'); if (!b) return;
  const s = st.scroll[st.kind + ':' + st.tab];
  if (s) { b.scrollLeft = s[0]; b.scrollTop = s[1]; return; }
  // 第一次開啟：捲到「現在」的年份，或第一個進行中／可選擇的國策
  if (st.kind === 'tech') { const nl = b.querySelector('.nowline'); if (nl) b.scrollLeft = Math.max(0, nl.offsetLeft - b.clientWidth * 0.35); return; }
  const el = b.querySelector('.fn.cur') || b.querySelector('.fn.avail');
  if (el) { b.scrollLeft = Math.max(0, el.offsetLeft + el.offsetWidth / 2 - b.clientWidth / 2); b.scrollTop = Math.max(0, el.offsetTop - 30); }
}

function render() {
  const S = ctx.S(), me = ctx.me();
  if (!S || !me || !S.C[me]) { closeTree(); return; }
  if (st.kind === 'tech') renderTech(S, me); else renderFocus(S, me);
  restoreScroll();
  if (detailFor) {
    const n = document.querySelector(`#tree [data-tid="${detailFor}"],#tree [data-fid="${detailFor}"]`);
    if (n) showDetail(n, detailSheet); else hideDetail();
  }
}

// ================================================================ 科技樹
const NW = 156, NH = 66, LANE_H = 84, PAD_L = 118, PAD_T = 46;
const yx = (y) => (y <= 1946 ? (y - 1934) * 60 : 12 * 60 + (y - 1946) * 34);
const LAYOUT = {};
function techLayout(cat) {
  if (LAYOUT[cat]) return LAYOUT[cat];
  const list = TECHS.filter(t => t.cat === cat).sort((a, b) => a.lane - b.lane || a.year - b.year);
  const pos = {}, last = {};
  let w = 0;
  for (const t of list) {
    let x = yx(t.year);
    if (last[t.lane] !== undefined) x = Math.max(x, last[t.lane] + NW + 16);
    last[t.lane] = x;
    pos[t.id] = { x: PAD_L + x, y: PAD_T + t.lane * LANE_H };
    w = Math.max(w, PAD_L + x + NW + 30);
  }
  const lanes = TECH_CATS.find(c => c.id === cat).lanes.length;
  return (LAYOUT[cat] = { list, pos, w, h: PAD_T + lanes * LANE_H + 10 });
}
const STAT = { att: '攻擊', def: '防禦', org: '組織度', speed: '速度', air: '空戰', bomb: '對地', strat: '戰略轟炸', naval: '對艦', range: '航程' };
const GRP = { INF: '步兵與陸戰隊', TANK: '所有坦克', MECH: '機械化步兵', LAND: '全部陸軍', FTR: '戰鬥機', BMB: '轟炸機與攻擊機', AIR: '全部空軍', SHIP: '全部艦艇' };
const FLAG = { nuke: '可以生產核子武器', hbomb: '氫彈：核攻擊威力提升', icbm: '核攻擊不受航程限制', mirv: '核彈生產成本 -40%', slbm: '潛射飛彈：核攻擊不受航程限制' };
export function techEffText(T) {
  const e = T.e, out = [];
  if (e.unlock) out.push(`解鎖：${UNITS[e.unlock].name}`);
  if (e.u) for (const g in e.u) out.push(`${GRP[g] || (UNITS[g] && UNITS[g].name) || g} ${Object.entries(e.u[g]).map(([k, v]) => `${STAT[k]} +${Math.round(v * 100)}%`).join('、')}`);
  if (e.ic) out.push(`軍工產能 +${Math.round(e.ic * 100)}%`);
  if (e.rsp) out.push(`研究速度 +${Math.round(e.rsp * 100)}%`);
  if (e.fcost) out.push(`工廠成本 -${Math.round(e.fcost * 100)}%`);
  if (e.escort) out.push(`海運損失 -${Math.round(e.escort * 100)}%`);
  if (e.aa) out.push(`防空 +${Math.round(e.aa * 100)}%`);
  if (e.amph) out.push(`兩棲登陸懲罰降低`);
  if (e.medic) out.push(`補充兵員人力 -${Math.round(e.medic * 100)}%`);
  if (e.supply) out.push(`斷補給懲罰降低`);
  if (e.flag) out.push(FLAG[e.flag]);
  return out.join('；');
}
function renderTech(S, me) {
  const C = S.C[me], esc = ctx.esc;
  if (!st.tab || !TECH_CATS.some(c => c.id === st.tab)) st.tab = 'arm';
  const cat = st.tab;
  const L = techLayout(cat);
  const now = yearOf(S.day) + (S.day % 365) / 365;
  const busy = new Map(); C.res.forEach((s, i) => { if (s) busy.set(s.id, [s, i]); });
  const free = C.res.filter(s => !s).length;
  const tabs = TECH_CATS.map(c => {
    const all = TECHS.filter(t => t.cat === c.id);
    const done = all.filter(t => hasTech(C, t.id)).length;
    const can = all.some(t => !canResearch(S, me, t.id) && t.year <= now + 0.5);
    return `<button class="ttab ${c.id === cat ? 'on' : ''}" data-ttab="${c.id}">${c.icon} ${c.name} <small>${done}/${all.length}</small>${can && free ? '<i class="dotg"></i>' : ''}</button>`;
  }).join('');
  let nodes = '', lines = '';
  for (const t of L.list) {
    const p = L.pos[t.id];
    const done = hasTech(C, t.id);
    const rb = busy.get(t.id);
    const err = done || rb ? null : canResearch(S, me, t.id);
    const ahead = t.year - now;
    let cls = 'locked', status = '';
    if (done) { cls = 'done'; status = '✓ 已完成'; }
    else if (rb) { const cost = researchCost(S, me, t.id); cls = 'cur'; status = `研究中 ${Math.floor(100 * rb[0].prog / cost)}%・剩 ${Math.max(0, Math.ceil((cost - rb[0].prog) / researchSpeed(S, me, t.id)))} 天`; }
    else if (!err) { const d = Math.ceil(researchCost(S, me, t.id) / researchSpeed(S, me, t.id)); cls = ahead > 0.05 ? 'avail ahead' : 'avail'; status = `${ahead > 0.05 ? `⚠ 超前 ${ahead.toFixed(1)} 年・` : ''}約 ${d} 天`; }
    else status = '🔒 ' + err.replace(/^需要先研究/, '需要');
    const md = MODELS[t.id] ? modelFor(S, me, t.id) : null;
    nodes += `<div class="tn ${cls}${md ? ' hasm' : ''}" style="left:${p.x}px;top:${p.y}px" data-tid="${t.id}">
      ${md ? `<div class="tn-pic">${modelSVG(md.spec)}</div>` : ''}
      <div class="tn-h"><span class="tn-y">${t.year}</span>${t.e.unlock ? `<span class="tn-u">新兵種</span>` : ''}${t.special ? `<span class="tn-u sp">戰略</span>` : ''}</div>
      <div class="tn-n">${esc(t.name)}</div>${md ? `<div class="tn-m">${esc(md.name)}${md.from !== me ? '＊' : ''}</div>` : ''}<div class="tn-s">${esc(status)}</div>${rb ? `<div class="tn-bar"><i style="width:${Math.min(100, 100 * rb[0].prog / researchCost(S, me, t.id))}%"></i></div>` : ''}</div>`;
    for (const q of t.req) {
      const qp = L.pos[q]; if (!qp) continue;
      const x1 = qp.x + NW, y1 = qp.y + NH / 2, x2 = p.x, y2 = p.y + NH / 2;
      const mx = (x1 + x2) / 2;
      lines += `<path d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}" class="${hasTech(C, q) ? 'ok' : ''}"/>`;
    }
  }
  // 年份刻度
  let ticks = '';
  for (let y = 1934; y <= 1990; y++) { if (y > 1946 && y % 5) continue; ticks += `<div class="tick" style="left:${PAD_L + yx(y)}px">${y}</div>`; }
  const nowX = PAD_L + yx(Math.min(1990, now));
  const lanes = TECH_CATS.find(c => c.id === cat).lanes.map((n, i) => `<div class="lane" style="top:${PAD_T + i * LANE_H}px">${n}</div>`).join('');
  const slots = C.res.map((s, i) => s ? `<span class="slot cur">${esc(TECH_MAP[s.id] ? TECH_MAP[s.id].name : '?')} <button class="btn tiny" data-tcancel="${i}" title="取消">✕</button></span>` : `<span class="slot">空欄位</span>`).join('');
  $('#tree').innerHTML = `<div class="thead"><h3>🔬 科技樹</h3><div class="slots">研究欄位：${slots}</div><button class="btn small" data-tclose>✕ 關閉</button></div>
    <div class="ttabs">${tabs}</div>
    <div class="tlegend"><span class="lg done">已完成</span><span class="lg cur">研究中</span><span class="lg avail">可研究</span><span class="lg ahead">超前時代（較慢）</span><span class="lg locked">尚未解鎖</span><span class="hint">點擊科技即可研究（手機：先點一下看說明）。標「＊」的型號來自盟國或援助國。科技沒有互斥，依真實年份研發最有效率。</span></div>
    <div class="tbody"><div class="tcanvas" style="width:${L.w}px;height:${L.h}px">
      <div class="ticks">${ticks}</div><div class="nowline" style="left:${nowX}px"><span>現在</span></div>${lanes}
      <svg width="${L.w}" height="${L.h}">${lines}</svg>${nodes}</div></div>`;
}
function clickTech(id) {
  const S = ctx.S(), me = ctx.me(), C = S.C[me];
  if (hasTech(C, id)) { ctx.toast('已經研究完成'); return; }
  if (C.res.some(s => s && s.id === id)) { ctx.toast('正在研究中'); return; }
  const err = canResearch(S, me, id);
  if (err) { ctx.toast(err, 'warn'); return; }
  if (!C.res.some(s => !s)) { ctx.toast('研究欄位都在使用中：先取消一項研究（上方 ✕）', 'warn'); return; }
  ctx.cmd({ type: 'research', id }).then(() => refreshTree());
}

// ================================================================ 國策樹
const FW = 142, FH = 66, GX = 156, GY = 96;
const FLAYOUT = new Map();
function focusLayout(list) {
  if (FLAYOUT.has(list)) return FLAYOUT.get(list);
  const ids = new Set(list.map(f => f.id)), byId = {};
  for (const f of list) byId[f.id] = f;
  const parentOf = {}, children = {};
  for (const f of list) {
    const p = (f.req || []).concat(f.reqAny || []).find(q => ids.has(q));
    parentOf[f.id] = p || null;
    if (p) (children[p] || (children[p] = [])).push(f.id);
  }
  const depth = {};
  const dd = (id, guard = 0) => {
    if (depth[id] !== undefined) return depth[id];
    if (guard > 60) return 0;
    let d = 0;
    for (const q of (byId[id].req || []).concat(byId[id].reqAny || [])) if (ids.has(q)) d = Math.max(d, dd(q, guard + 1) + 1);
    return (depth[id] = d);
  };
  for (const f of list) dd(f.id);
  const x = {};
  let next = 0;
  const place = (id) => {
    const ch = children[id] || [];
    if (!ch.length) { x[id] = next++; return; }
    for (const c of ch) place(c);
    x[id] = (x[ch[0]] + x[ch[ch.length - 1]]) / 2;
  };
  for (const f of list) if (!parentOf[f.id]) { place(f.id); next += 0.3; }
  const pos = {};
  let w = 0, h = 0;
  for (const f of list) { pos[f.id] = { x: 24 + x[f.id] * GX, y: 20 + depth[f.id] * GY }; w = Math.max(w, pos[f.id].x + FW + 24); h = Math.max(h, pos[f.id].y + FH + 24); }
  const L = { pos, w, h };
  FLAYOUT.set(list, L);
  return L;
}
function focusIconName(e) {
  if (e.war || e.limWar) return 'flag';
  if (e.ideo || e.joinFac || e.createFac || e.guar || e.nap || e.leaveFac) return 'diplomacy';
  if (e.units) { const k = Object.keys(e.units)[0]; const d = UNITS[k] && UNITS[k].domain; return d === 'air' ? 'plane' : d === 'sea' ? 'port' : UNITS[k] && UNITS[k].armor ? 'tank' : 'army'; }
  if (e.ind || e.icp || e.fcost || e.upk) return 'ic';
  if (e.escort) return 'port';
  if (e.res || e.rsp || e.rcat || e.techs) return 'research';
  if (e.nukeSpeed || e.nukes) return 'nuke';
  if (e.fort || e.fortAt || e.coastFort) return 'fort';
  if (e.air) return 'plane';
  if (e.nav || e.raid) return 'port';
  if (e.armorAtt) return 'tank';
  if (e.att || e.def || e.speed) return 'army';
  if (e.man) return 'man';
  return 'pp';
}
const ECON_KEYS = ['ind', 'icp', 'fcost', 'upk', 'escort'];
const isEcon = (e) => ECON_KEYS.some(k => e[k] > 0) && !e.war && !e.units;
function renderFocus(S, me) {
  const C = S.C[me], esc = ctx.esc;
  const trees = focusTrees(S, me);
  if (!trees.length) { $('#tree').innerHTML = `<div class="thead"><h3>國策</h3><button class="btn small" data-tclose>✕ 關閉</button></div><div class="hint" style="padding:20px">目前沒有可用的國策。</div>`; return; }
  if (!st.tab || !trees.some(t => t.key === st.tab)) st.tab = trees[0].key;
  const T = trees.find(t => t.key === st.tab);
  const L = focusLayout(T.list);
  const done = new Set(C.focus.done);
  const tabs = trees.map(t => `<button class="ttab ${t.key === T.key ? 'on' : ''}" data-ttab="${t.key}">${esc(t.name)} <small>${t.list.filter(f => done.has(f.id)).length}/${t.list.length}</small></button>`).join('');
  let nodes = '', lines = '', marks = '';
  const byId = {}; for (const f of T.list) byId[f.id] = f;
  for (const f of T.list) {
    const p = L.pos[f.id];
    const isCur = C.focus.cur === f.id;
    const err = done.has(f.id) || isCur ? null : focusAvailable(S, me, f);
    let cls = 'locked', status = '';
    const days = focusDays(S, me, f);
    if (done.has(f.id)) { cls = 'done'; status = '✓ 已完成'; }
    else if (isCur) { cls = 'cur'; status = `進行中・剩 ${Math.max(0, days - C.focus.prog)} 天`; }
    else if (err === '與已選國策互斥') { cls = 'excl'; status = '✕ 互斥'; }
    else if (!err) { cls = C.focus.cur ? 'avail wait' : 'avail'; status = `${days} 天`; }
    else status = '🔒 ' + err;
    const exNames = (f.excl || []).filter(q => byId[q]).map(q => byId[q].name);
    nodes += `<div class="fn ${cls}${isEcon(f.eff) ? ' econ' : ''}" style="left:${p.x}px;top:${p.y}px" data-fid="${f.id}">
      <div class="fn-i">${uiIcon(focusIconName(f.eff))}</div><div class="fn-n">${esc(f.name)}</div><div class="fn-s">${esc(status)}</div>${f.hist ? '<i class="fn-h" title="史實路線">史</i>' : ''}${exNames.length ? '<i class="fn-x" title="互斥國策">⇄</i>' : ''}
      ${isCur ? `<div class="tn-bar"><i style="width:${Math.min(100, 100 * C.focus.prog / days)}%"></i></div>` : ''}</div>`;
    const draw = (q, dashed) => {
      const qp = L.pos[q]; if (!qp) return;
      const x1 = qp.x + FW / 2, y1 = qp.y + FH, x2 = p.x + FW / 2, y2 = p.y;
      const my = y1 + (y2 - y1) / 2;
      lines += `<path d="M${x1} ${y1} V${my} H${x2} V${y2}" class="${done.has(q) ? 'ok' : ''}${dashed ? ' any' : ''}"/>`;
    };
    for (const q of f.req || []) draw(q, false);
    for (const q of f.reqAny || []) draw(q, true);
    // 互斥標記（同一列相鄰的互斥國策之間畫紅色符號）
    for (const q of f.excl || []) {
      const qp = L.pos[q]; if (!qp || q < f.id) continue;
      if (Math.abs(qp.y - p.y) < 2) { const mx = (Math.min(qp.x, p.x) + FW + Math.max(qp.x, p.x)) / 2; marks += `<div class="xmark" style="left:${mx - 10}px;top:${p.y + FH / 2 - 10}px" title="互斥">⇄</div>`; }
    }
  }
  const cur = C.focus.cur && T.list.concat(...trees.map(t => t.list)).find(f => f.id === C.focus.cur);
  $('#tree').innerHTML = `<div class="thead"><h3>🏛️ 國策樹</h3><div class="slots">${cur ? `進行中：<span class="slot cur">${esc(cur.name)}・剩 ${Math.max(0, focusDays(S, me, cur) - C.focus.prog)} 天 <button class="btn tiny" data-fcancel title="取消（已投入的天數會損失）">✕</button></span>` : '<span class="slot">沒有進行中的國策</span>'}</div><button class="btn small" data-tclose>✕ 關閉</button></div>
    <div class="ttabs">${tabs}</div>
    <div class="tlegend"><span class="lg done">已完成</span><span class="lg cur">進行中</span><span class="lg avail">可選擇</span><span class="lg excl">互斥（已無法選擇）</span><span class="lg locked">尚未解鎖</span><span class="lg econ">經濟類</span><span class="hint">⇄ 表示互斥：只能二選一。標有「史」的是歷史上的選擇。滑鼠移到國策上（手機：點一下）可看詳細說明。</span></div>
    <div class="tbody"><div class="tcanvas" style="width:${L.w}px;height:${L.h}px"><svg width="${L.w}" height="${L.h}">${lines}</svg>${marks}${nodes}</div></div>`;
}
function clickFocus(id) {
  const S = ctx.S(), me = ctx.me(), C = S.C[me];
  if (C.focus.done.includes(id)) { ctx.toast('已經完成'); return; }
  if (C.focus.cur === id) { ctx.toast('正在進行中'); return; }
  const f = focusTrees(S, me).flatMap(t => t.list).find(x => x.id === id);
  if (!f) return;
  const err = focusAvailable(S, me, f);
  if (err) { ctx.toast(err, 'warn'); return; }
  if (C.focus.cur) { ctx.toast('已有進行中的國策（可按上方 ✕ 取消）', 'warn'); return; }
  ctx.cmd({ type: 'focus', id }).then(() => refreshTree());
}

// ================================================================ 詳細說明（滑鼠提示／手機底部面板）
let lastPtr = 'mouse', detailFor = null, detailSheet = false;
function detailEl() {
  let d = document.getElementById('tdetail');
  if (!d) {
    d = document.createElement('div'); d.id = 'tdetail'; d.className = 'hidden';
    document.body.appendChild(d);
    d.addEventListener('click', (e) => {
      const b = e.target.closest('[data-dact]'); if (!b) return;
      const [act, id] = b.dataset.dact.split(':');
      hideDetail();
      if (act === 'research') clickTech(id);
      else if (act === 'focus') clickFocus(id);
    });
  }
  return d;
}
function hideDetail() { const d = document.getElementById('tdetail'); if (d) { d.className = 'hidden'; d.innerHTML = ''; } detailFor = null; detailSheet = false; }
function showDetail(node, sheet) {
  const S = ctx.S(), me = ctx.me(); if (!S || !me) return;
  const d = detailEl();
  const id = node.dataset.tid || node.dataset.fid;
  d.innerHTML = node.dataset.tid ? techDetail(S, me, TECH_MAP[id], sheet) : focusDetail(S, me, id, sheet);
  detailFor = id; detailSheet = sheet;
  d.className = sheet ? 'sheet' : 'pop';
  if (!sheet) {
    const r = node.getBoundingClientRect(), w = d.offsetWidth, h = d.offsetHeight;
    let x = r.right + 10; if (x + w > window.innerWidth - 8) x = r.left - w - 10;
    if (x < 8) x = Math.max(8, Math.min(window.innerWidth - w - 8, r.left));
    let y = r.top - 10; if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8; if (y < 8) y = 8;
    d.style.left = x + 'px'; d.style.top = y + 'px';
  } else { d.style.left = ''; d.style.top = ''; }
}
const ESC = (x) => ctx.esc(x);
const flagI = (S, t) => { const u = flagURL(t, yearOf(S.day)); return u ? `<img class="dflag" src="${u}" alt="">` : ''; };
function techItems(T) {
  const out = [];
  const e = T.e;
  if (e.unlock) out.push({ ic: 'u:' + e.unlock, t: `解鎖新兵種：${UNITS[e.unlock].name}`, d: UNITS[e.unlock].desc, good: true });
  const rest = techEffText({ ...T, e: { ...e, unlock: undefined } });
  if (rest) for (const part of rest.split('；')) out.push({ ic: 'research', t: part, good: true });
  return out;
}
function techDetail(S, me, T, sheet) {
  const C = S.C[me];
  const done = hasTech(C, T.id), cur = C.res.find(x => x && x.id === T.id);
  const err = done || cur ? null : canResearch(S, me, T.id);
  const now = yearOf(S.day) + (S.day % 365) / 365, ahead = T.year - now;
  const days = Math.ceil(researchCost(S, me, T.id) / researchSpeed(S, me, T.id));
  const status = done ? '✓ 已完成' : cur ? `研究中（${Math.floor(100 * cur.prog / researchCost(S, me, T.id))}%）` : err ? '🔒 ' + err : `可研究・約 ${days} 天${ahead > 0.05 ? `（超前 ${ahead.toFixed(1)} 年，速度變慢）` : ''}`;
  const cat = TECH_CATS.find(c => c.id === T.cat);
  let h = `<div class="dt-h"><small>${cat.icon} ${cat.name}・${T.year} 年</small><h4>${ESC(T.name)}</h4><div class="dt-st ${done ? 'ok' : err ? 'no' : 'go'}">${ESC(status)}</div></div>`;
  const M = MODELS[T.id];
  if (M) {
    const md = modelFor(S, me, T.id);
    h += `<div class="dt-pic">${modelSVG(md.spec)}</div><div class="dt-model">${flagI(S, md.from)}你的型號：<b>${ESC(md.name)}</b>${md.from !== me ? `<small>（${ESC(cname(S, md.from))}的型號：本國沒有自行研製）</small>` : ''}</div>`;
    const others = Object.keys(M.m).filter(t => t !== md.from).slice(0, 8);
    if (others.length) h += `<div class="dt-sec">各國的同代型號</div><div class="dt-others">${others.map(t => { const m = modelFor(S, t, T.id); return `<div class="dt-o">${modelSVG(m.spec)}<span>${flagI(S, t)}${ESC(m.name)}</span></div>`; }).join('')}</div>`;
    h += `<a class="dt-wiki" href="https://zh.wikipedia.org/w/index.php?search=${encodeURIComponent(md.name.replace(/（.*）/, '').split('／')[0])}" target="_blank" rel="noopener">🔍 在維基百科查看「${ESC(md.name.replace(/（.*）/, '').split('／')[0])}」的照片與資料</a>`;
  }
  h += `<div class="dt-desc">${ESC(T.desc)}</div><div class="dt-sec">效果</div>${effectsHTML(techItems(T))}`;
  if (T.req.length) h += `<div class="dt-sec">前置科技</div><div class="dt-req">${T.req.map(q => `<span class="${hasTech(C, q) ? 'ok' : 'no'}">${hasTech(C, q) ? '✓' : '✗'} ${ESC(TECH_MAP[q] ? TECH_MAP[q].name : q)}</span>`).join('')}</div>`;
  if (T.minInd) h += `<div class="dt-note">需要國家工業 ${T.minInd} 以上（目前 ${Math.round(C.indTotal || 0)}）。</div>`;
  h += `<div class="dt-note">基礎研究量 ${Math.round(T.cost || 100)}（依研究速度換算成天數）。比歷史年份提早一年約慢一倍；落後於時代的科技最多可加速 45% 追趕。工業規模越大、研究加成越多，研究越快。</div>`;
  if (sheet) h += `<div class="dt-act">${!done && !cur && !err ? `<button class="btn gold" data-dact="research:${T.id}">開始研究</button>` : ''}<button class="btn" data-dact="close:">關閉</button></div>`;
  return h;
}
function focusDetail(S, me, id, sheet) {
  const C = S.C[me];
  const all = focusTrees(S, me).flatMap(t => t.list);
  const f = all.find(x => x.id === id); if (!f) return '';
  const byId = {}; for (const x of all) byId[x.id] = x;
  const done = C.focus.done.includes(id), cur = C.focus.cur === id;
  const err = done || cur ? null : focusAvailable(S, me, f);
  const days = focusDays(S, me, f);
  const status = done ? '✓ 已完成' : cur ? `進行中・剩 ${Math.max(0, days - C.focus.prog)} 天` : err ? '🔒 ' + err : C.focus.cur ? '可選擇（需先完成或取消目前的國策）' : '可選擇';
  let h = `<div class="dt-h"><small>${uiIcon(focusIconName(f.eff))} 國策・${days} 天${isEcon(f.eff) ? '・經濟類' : ''}</small><h4>${ESC(f.name)}</h4><div class="dt-badges">${f.hist ? '<span class="b-hist">史實路線</span>' : ''}${f.alt ? '<span class="b-alt">架空路線</span>' : ''}${(f.excl || []).length ? '<span class="b-ex">⇄ 互斥</span>' : ''}</div><div class="dt-st ${done ? 'ok' : err ? 'no' : 'go'}">${ESC(status)}</div></div>`;
  if (f.desc) h += `<div class="dt-desc">${ESC(f.desc)}</div>`;
  h += `<div class="dt-sec">效果與獎勵</div>${effectsHTML(focusEffects(S, me, f.eff))}`;
  if (f.req.length || (f.reqAny || []).length) {
    h += `<div class="dt-sec">前置條件</div><div class="dt-req">${f.req.map(q => `<span class="${C.focus.done.includes(q) ? 'ok' : 'no'}">${C.focus.done.includes(q) ? '✓' : '✗'} ${ESC(byId[q] ? byId[q].name : q)}</span>`).join('')}`;
    if ((f.reqAny || []).length) h += `<span class="any">以下任一：</span>${f.reqAny.map(q => `<span class="${C.focus.done.includes(q) ? 'ok' : 'no'}">${C.focus.done.includes(q) ? '✓' : '✗'} ${ESC(byId[q] ? byId[q].name : q)}</span>`).join('')}`;
    h += '</div>';
  }
  if ((f.excl || []).length) h += `<div class="dt-sec">互斥（完成此國策後無法再選）</div><div class="dt-req">${f.excl.map(q => `<span class="no">⇄ ${ESC(byId[q] ? byId[q].name : q)}</span>`).join('')}</div>`;
  const IDN = { dem: '民主', com: '共產', fas: '法西斯', neu: '中立／威權' };
  if (f.minYear || f.maxYear || f.coastal || f.ctrlAny || f.ideoReq) h += `<div class="dt-note">${f.minYear ? `${f.minYear} 年起可選。` : ''}${f.maxYear ? `${f.maxYear} 年後無法再選。` : ''}${f.coastal ? '需要擁有海岸線。' : ''}${f.ctrlAny ? `${ESC(f.ctrlMsg || '需要控制特定地區')}（${f.ctrlAny.slice(0, 4).map(id => { const r = WORLD.idx.get(id); return r === undefined ? id : ESC(rname(S, r)); }).join('、')}${f.ctrlAny.length > 4 ? ' 等' : ''}）。` : ''}${f.ideoReq ? `限${f.ideoReq.map(i => IDN[i]).join('或')}政體。` : ''}</div>`;
  if (f.th) h += `<div class="dt-note">理論樹：所有國家都可以選擇的發展路線。同一組理論只能選一種。</div>`;
  h += `<div class="dt-note">${f.hist ? '這是歷史上的選擇，AI 在「依照歷史」模式下會走這條路。' : f.alt ? '架空歷史路線：AI 在「依照歷史」模式下不會選擇，由你改寫歷史。' : '完成後立即獲得上述效果。國策一次只能進行一項。'}</div>`;
  if (sheet) h += `<div class="dt-act">${!done && !cur && !err && !C.focus.cur ? `<button class="btn gold" data-dact="focus:${f.id}">開始此國策</button>` : ''}<button class="btn" data-dact="close:">關閉</button></div>`;
  return h;
}
