// 烽火世紀 — 介面主程式
import { WORLD, regionName } from './core/world.js';
import { createGame, SCENARIOS, SCEN, serialize, scores } from './core/game.js';
import { UNITS, TERRAIN, LAWS, TECH, TECH_ORDER, BUILD, DIFFICULTY } from './data/rules.js';
import { IDEOLOGIES } from './data/countries.js';
import {
  atWar, atWarAny, enemySet, friendly, allied, alive, liveTags, focusList, focusAvailable, lawAllowed, canResearch,
  researchCost, canBuild, itemCost, isLandUnit, isAir, isNaval, cname, rname, regionIndCap,
} from './core/engine.js';
import { warCost, canDeclare } from './core/commands.js';
import { fmtDate, yearOf, fmtMan, dayToDate } from './core/util.js';
import { MapView } from './ui/maprender.js';
import { LocalGame, RemoteGame, SPEEDS, hostWS, joinWS, hostP2P, joinP2P, wsUrlDefault } from './net/net.js';

const { nodes, R } = WORLD;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};

// ---------------------------------------------------------------- 全域狀態
let G = null;               // 目前的遊戲階段（LocalGame / RemoteGame）
let S = null;               // 目前顯示的狀態
let me = null;              // 玩家國家
const sel = new Set();      // 選取的部隊
let selRegion = -1;
let panel = null;           // 目前開啟的分頁
let lastNews = 0, lastCtrlSig = '', lastHud = 0, lastPanel = 0, lastSelRender = 0, selSig = '', deadShown = false;
let modalOpen = false, overShown = false;
const ui = { dipFilter: 'near', dipSearch: '', newsFilter: 'all', prodCount: 1 };

const map = new MapView($('#map'), {
  onSelect: (ids, add) => { if (!add) sel.clear(); for (const id of ids) sel.add(id); selRegion = -1; map.selRegion = -1; syncSel(); },
  onOrder: (n) => orderTo(n),
  onRegion: (n) => regionClick(n),
  onHover: (n, x, y) => hoverTip(n, x, y),
});
map.dirty = true;

// 主選單背景：1936 年世界
let menuState = null;
function showMenuBackground() {
  if (!menuState) menuState = createGame('1936', { seed: 42 });
  map.setState(menuState, null); map.year = 1936;
  map.centerOn(2300, 560, Math.max(map.minZoom(), 0.55));
}
showMenuBackground();

function show(id) {
  for (const s of $$('.screen')) s.classList.toggle('on', s.id === id);
}
function color(t) { return (S && S.C[t] && S.C[t].color) || (WORLD.countries[t] && WORLD.countries[t].color) || '#888'; }
function sw(t, st) { const c = st ? ((st.C[t] && st.C[t].color) || WORLD.countries[t].color) : color(t); return `<span class="sw" style="background:${c}"></span>`; }
function nameOf(t, st = S) { return esc(cname(st, t)); }
function regName(r) { return esc(regionName(r, S ? yearOf(S.day) : 1936)); }

// ================================================================ 主選單
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'sp') openSetup('sp');
  else if (act === 'host') openHostDialog();
  else if (act === 'join') openJoinDialog();
  else if (act === 'load') openLoadDialog();
  else if (act === 'help') openHelp();
  else if (act === 'back') { leaveToMenu(); }
  else if (act === 'closepanel') openPanel(null);
  else if (act === 'menu') openGameMenu();
});

function leaveToMenu() {
  if (G) { G.stop(); G = null; }
  S = null; me = null; sel.clear(); selRegion = -1; panel = null; overShown = false;
  closeModal();
  $('#panel').classList.add('hidden'); $('#selbox').classList.add('hidden'); $('#chat').classList.add('hidden');
  lobby = null;
  showMenuBackground();
  show('scr-menu');
}

// ================================================================ 開局設定（單人）
const setup = { scen: '1936', diff: 'normal', hist: true, aggr: 0, tag: null, preview: null };
function openSetup(mode) {
  setup.mode = mode;
  show('scr-setup');
  $('#setup-title').textContent = '單人遊戲';
  loadPreview();
  renderSetup();
}
function loadPreview() {
  setup.preview = createGame(setup.scen, { seed: 7, hist: setup.hist });
  S = setup.preview;
  map.setState(S, setup.tag); map.year = yearOf(S.day);
  const sc = SCEN[setup.scen];
  if (!setup.tag || !alive(S, setup.tag)) setup.tag = sc.rec[0][0];
  map.me = setup.tag;
  const cap = S.C[setup.tag] && S.C[setup.tag].cap;
  if (cap >= 0) map.centerOnNode(cap, 1.1);
}
function renderSetup() {
  const sc = SCEN[setup.scen];
  const scens = SCENARIOS.map(s => `<div class="scen ${s.id === setup.scen ? 'sel' : ''}" data-scen="${s.id}"><b>${s.name}</b><span class="yr">${s.date.slice(0, 4)}</span><p>${esc(s.desc)}</p></div>`).join('');
  const recs = sc.rec.map(([t, d]) => S.C[t] && S.C[t].exists ? `<span class="rec ${t === setup.tag ? 'sel' : ''}" data-pick="${t}">${sw(t)}${nameOf(t)} <small>${d}</small></span>` : '').join('');
  const C = S.C[setup.tag];
  $('#setup-body').innerHTML = `
    <div class="field"><label>選擇劇本</label>${scens}</div>
    <div class="field"><label>選擇國家（推薦，或直接點擊地圖上任何國家）</label><div class="recs">${recs}</div></div>
    ${C ? `<div class="picked">${sw(setup.tag)} <b>${nameOf(setup.tag)}</b><br><small class="hint">${esc(WORLD.countries[setup.tag].full)}・${IDEOLOGIES[C.ideo].name}${C.fac && S.fac[C.fac] ? '・' + esc(S.fac[C.fac].name) : ''}</small><div class="kv" style="margin-top:6px"><span>工業</span><span>${Math.round(countInd(setup.tag))}</span><span>部隊</span><span>${S.units.filter(u => u.c === setup.tag).length}</span><span>地區</span><span>${S.own.filter(o => o === setup.tag).length}</span></div></div>` : ''}
    <div class="field"><label>難度</label><div class="seg">${Object.entries(DIFFICULTY).map(([k, v]) => `<button class="btn ${setup.diff === k ? 'on' : ''}" data-diff="${k}">${v.name}</button>`).join('')}</div></div>
    <div class="field"><label>歷史事件</label><div class="seg"><button class="btn ${setup.hist ? 'on' : ''}" data-hist="1">依照歷史</button><button class="btn ${!setup.hist ? 'on' : ''}" data-hist="0">自由發展</button></div><div class="hint" style="margin-top:4px">「依照歷史」：歷史戰爭與事件會依時間發生（AI 照歷史選擇，你可以做出不同決定）。「自由發展」：只保留去殖民化等結構事件，AI 會更主動擴張。</div></div>`;
  $('#setup-foot').innerHTML = `<button class="btn gold" style="flex:1" data-start="1">開始遊戲</button>`;
}
function countInd(t) { let s = 0; for (let r = 0; r < R; r++) if (S.ctrl[r] === t) s += S.ind[r]; return s; }
$('#scr-setup').addEventListener('click', (e) => {
  const t = e.target.closest('[data-scen],[data-pick],[data-lpick],[data-diff],[data-hist],[data-start],[data-lobby]');
  if (!t) return;
  if (lobby) return lobbyClick(t);
  if (t.dataset.scen) { setup.scen = t.dataset.scen; setup.tag = null; loadPreview(); renderSetup(); }
  else if (t.dataset.pick) { setup.tag = t.dataset.pick; map.me = setup.tag; map.refresh(); const cap = S.C[setup.tag].cap; if (cap >= 0) map.centerOnNode(cap); renderSetup(); }
  else if (t.dataset.diff) { setup.diff = t.dataset.diff; renderSetup(); }
  else if (t.dataset.hist) { setup.hist = t.dataset.hist === '1'; loadPreview(); renderSetup(); }
  else if (t.dataset.start) startSingle();
});
function startSingle() {
  const st = createGame(setup.scen, { diff: setup.diff, hist: setup.hist });
  beginGame(new LocalGame(st, setup.tag), setup.tag);
  if (!LS.get('cof_tut_done', false)) setTimeout(() => startTutorial(), 600);
}

// ================================================================ 多人：主機與大廳
let lobby = null; // { role: 'host'|'client', net, players, scen, diff, hist, myId, myTag }
function openHostDialog() {
  const name = LS.get('cof_name', '指揮官');
  const served = location.protocol.startsWith('http') && !location.hostname.endsWith('github.io');
  modal(`<header><h3>建立多人房間</h3></header><div class="db">
    <div class="field"><label>你的名字</label><input id="mp-name" value="${esc(name)}" maxlength="16"></div>
    <div class="field"><label>連線方式</label>
      <div class="seg"><button class="btn ${served ? 'on' : ''}" data-m="ws">伺服器中繼</button><button class="btn ${served ? '' : 'on'}" data-m="p2p">點對點 (P2P)</button></div>
      <div class="hint" id="mp-hint" style="margin-top:6px"></div>
    </div>
    <div class="field" id="mp-urlf"><label>伺服器位址</label><input id="mp-url" value="${esc(LS.get('cof_ws', wsUrlDefault()))}"></div>
    <details id="mp-adv"><summary class="hint">進階：自訂 P2P 訊號伺服器</summary><div class="field"><label>PeerJS 伺服器（留空使用公用伺服器，例：localhost:9000/）</label><input id="mp-peer" value="${esc(LS.get('cof_peer', ''))}"></div></details>
  </div><div class="opts"><button class="btn gold" id="mp-go">建立房間</button><button class="btn" data-close>取消</button></div>`);
  let mode = served ? 'ws' : 'p2p';
  const upd = () => {
    $$('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
    $('#mp-urlf').classList.toggle('hidden', mode !== 'ws');
    $('#mp-hint').textContent = mode === 'ws' ? '使用本專案附帶的 Node.js 伺服器（npm start）。最穩定，適合區網或自架伺服器。' : '不需要自架伺服器，透過 PeerJS 免費訊號伺服器直接連線。部分公司或學校網路可能無法連線。';
  };
  upd();
  $$('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; upd(); });
  $('#mp-go').onclick = async () => {
    const nm = $('#mp-name').value.trim() || '指揮官'; LS.set('cof_name', nm);
    $('#mp-go').disabled = true; $('#mp-go').textContent = '連線中…';
    try {
      let net;
      if (mode === 'ws') { const url = $('#mp-url').value.trim(); LS.set('cof_ws', url); net = await hostWS(url, nm); }
      else { LS.set('cof_peer', $('#mp-peer').value.trim()); net = await hostP2P(nm, LS.get('cof_peer', '')); }
      closeModal();
      startHostLobby(net, nm);
    } catch (err) { $('#mp-go').disabled = false; $('#mp-go').textContent = '建立房間'; alertBox('連線失敗', esc(err.message)); }
  };
}
function startHostLobby(net, name) {
  lobby = { role: 'host', net, name, players: [], scen: '1936', diff: 'normal', hist: true, myTag: 'GER', chat: [] };
  net.onPeer = (id, pname) => { lobby.players.push({ id, name: pname, tag: null }); lobbyChat(`${pname} 加入了房間`); sendLobby(); renderLobby(); };
  net.onLeave = (id) => { const p = lobby.players.find(x => x.id === id); lobby.players = lobby.players.filter(x => x.id !== id); if (p) lobbyChat(`${p.name} 離開了房間`); sendLobby(); renderLobby(); };
  net.onMessage = (id, m) => {
    const p = lobby.players.find(x => x.id === id); if (!p) return;
    if (m.t === 'lpick') {
      const taken = lobby.myTag === m.tag || lobby.players.some(q => q !== p && q.tag === m.tag);
      if (!taken) p.tag = m.tag;
      sendLobby(); renderLobby();
    } else if (m.t === 'chat') { const msg = `${p.name}：${String(m.text).slice(0, 200)}`; lobbyChat(msg); net.broadcast({ t: 'lchat', text: msg }); }
  };
  lobbyPreview();
  show('scr-setup');
  renderLobby();
}
function lobbyPreview() {
  setup.preview = createGame(lobby.scen, { seed: 7, hist: lobby.hist });
  S = setup.preview; map.setState(S, lobby.myTag); map.year = yearOf(S.day);
  if (!lobby.myTag || !alive(S, lobby.myTag)) lobby.myTag = SCEN[lobby.scen].rec[0][0];
  map.me = lobby.myTag;
  for (const p of lobby.players) if (p.tag && !alive(S, p.tag)) p.tag = null;
}
function sendLobby() {
  if (lobby.role !== 'host') return;
  lobby.net.broadcast({ t: 'lobby', scen: lobby.scen, diff: lobby.diff, hist: lobby.hist, hostName: lobby.name, hostTag: lobby.myTag, players: lobby.players });
}
function lobbyChat(text) { lobby.chat.push(text); if (lobby.chat.length > 40) lobby.chat.shift(); const log = $('#lobby-chat'); if (log) { log.innerHTML = lobby.chat.map(c => `<div>${esc(c)}</div>`).join(''); log.scrollTop = 1e9; } }
function renderLobby() {
  if (!lobby) return;
  const host = lobby.role === 'host';
  $('#setup-title').textContent = host ? '多人房間（主機）' : '多人房間';
  const sc = SCEN[lobby.scen];
  const myTag = host ? lobby.myTag : lobby.myTag;
  const all = [{ name: (host ? lobby.name : lobby.hostName) + '（主機）', tag: lobby.hostTag ?? lobby.myTag }, ...lobby.players];
  const taken = new Set(all.map(p => p.tag).filter(Boolean));
  const recs = sc.rec.map(([t, d]) => S.C[t] && S.C[t].exists ? `<span class="rec ${t === myTag ? 'sel' : ''}" data-lpick="${t}">${sw(t)}${nameOf(t)} <small>${taken.has(t) && t !== myTag ? '已選' : d}</small></span>` : '').join('');
  $('#setup-body').innerHTML = `
    ${lobby.net.code ? `<div class="field"><label>房間代碼（分享給朋友）</label><span class="code">${esc(lobby.net.code)}</span> <button class="btn small" data-lobby="copy">複製</button><div class="hint" style="margin-top:4px">連線方式：${lobby.net.kind === 'ws' ? '伺服器中繼' : '點對點 P2P'}。朋友在主選單選「加入多人房間」並輸入代碼。</div></div>` : ''}
    <div class="field"><label>玩家</label><div class="plist">${all.map(p => `<div>${p.tag ? sw(p.tag) : '<span class="sw" style="background:#444"></span>'}<span style="flex:1">${esc(p.name)}</span><small>${p.tag ? nameOf(p.tag) : '尚未選擇'}</small></div>`).join('')}</div></div>
    <div class="field"><label>劇本${host ? '' : '（由主機決定）'}</label>${host ? SCENARIOS.map(s => `<div class="scen ${s.id === lobby.scen ? 'sel' : ''}" data-lobby="scen" data-v="${s.id}"><b>${s.name}</b><span class="yr">${s.date.slice(0, 4)}</span><p>${esc(s.desc)}</p></div>`).join('') : `<div class="scen sel"><b>${sc.name}</b><span class="yr">${sc.date.slice(0, 4)}</span><p>${esc(sc.desc)}</p></div>`}</div>
    <div class="field"><label>你的國家（點擊推薦或地圖上的國家）</label><div class="recs">${recs}</div></div>
    ${host ? `<div class="field"><label>難度</label><div class="seg">${Object.entries(DIFFICULTY).map(([k, v]) => `<button class="btn ${lobby.diff === k ? 'on' : ''}" data-lobby="diff" data-v="${k}">${v.name}</button>`).join('')}</div></div>
    <div class="field"><label>歷史事件</label><div class="seg"><button class="btn ${lobby.hist ? 'on' : ''}" data-lobby="hist" data-v="1">依照歷史</button><button class="btn ${!lobby.hist ? 'on' : ''}" data-lobby="hist" data-v="0">自由發展</button></div></div>` : `<div class="hint">難度：${DIFFICULTY[lobby.diff].name}・${lobby.hist ? '依照歷史' : '自由發展'}</div>`}
    <div class="field"><label>聊天</label><div id="lobby-chat" style="max-height:120px;overflow-y:auto;background:#10151c;border:1px solid #333;border-radius:6px;padding:6px;font-size:13px"></div><input id="lobby-in" placeholder="輸入訊息後按 Enter" maxlength="200" style="margin-top:4px"></div>`;
  $('#setup-foot').innerHTML = host ? `<button class="btn gold" style="flex:1" data-lobby="start">開始遊戲</button>` : `<div class="hint" style="flex:1">等待主機開始遊戲…</div>`;
  lobbyChat('');
  lobby.chat.pop();
  const inp = $('#lobby-in');
  inp.onkeydown = (e) => {
    if (e.key !== 'Enter' || !inp.value.trim()) return;
    const text = inp.value.trim(); inp.value = '';
    if (host) { const msg = `${lobby.name}：${text}`; lobbyChat(msg); lobby.net.broadcast({ t: 'lchat', text: msg }); }
    else lobby.net.send({ t: 'chat', text });
  };
}
function lobbyClick(t) {
  const host = lobby.role === 'host';
  const act = t.dataset.lobby;
  const pickTag = t.dataset.lpick || t.dataset.pick;
  if (pickTag) {
    if (host) { if (lobby.players.some(p => p.tag === pickTag)) return; lobby.myTag = pickTag; map.me = pickTag; map.refresh(); sendLobby(); }
    else { lobby.myTag = pickTag; map.me = pickTag; map.refresh(); lobby.net.send({ t: 'lpick', tag: pickTag }); }
    const cap = S.C[pickTag] && S.C[pickTag].cap; if (cap >= 0) map.centerOnNode(cap);
    renderLobby(); return;
  }
  if (act === 'copy') { navigator.clipboard && navigator.clipboard.writeText(lobby.net.code); toast('已複製房間代碼'); return; }
  if (!host) return;
  if (act === 'scen') { lobby.scen = t.dataset.v; lobby.myTag = null; lobbyPreview(); }
  else if (act === 'diff') lobby.diff = t.dataset.v;
  else if (act === 'hist') { lobby.hist = t.dataset.v === '1'; lobbyPreview(); }
  else if (act === 'start') { hostStartGame(); return; }
  sendLobby(); renderLobby();
}
function hostStartGame() {
  const st = createGame(lobby.scen, { diff: lobby.diff, hist: lobby.hist });
  const players = lobby.players.map(p => ({ id: p.id, name: p.name, tag: p.tag && alive(st, p.tag) ? p.tag : null }));
  const net = lobby.net;
  const g = new LocalGame(st, lobby.myTag, { net, players });
  g.myName = lobby.name;
  const js = serialize(st);
  for (const p of players) net.send(p.id, { t: 'start', s: js, me: p.tag, players });
  g.sendPlayers();
  lobby = null;
  beginGame(g, g.me);
}

// ---------------- 加入
function openJoinDialog() {
  const name = LS.get('cof_name', '指揮官');
  const served = location.protocol.startsWith('http') && !location.hostname.endsWith('github.io');
  modal(`<header><h3>加入多人房間</h3></header><div class="db">
    <div class="field"><label>你的名字</label><input id="mp-name" value="${esc(name)}" maxlength="16"></div>
    <div class="field"><label>房間代碼</label><input id="mp-code" maxlength="5" style="text-transform:uppercase;font-size:20px;letter-spacing:4px" placeholder="ABCDE"></div>
    <div class="field"><label>連線方式（需與主機相同）</label><div class="seg"><button class="btn ${served ? 'on' : ''}" data-m="ws">伺服器中繼</button><button class="btn ${served ? '' : 'on'}" data-m="p2p">點對點 (P2P)</button></div></div>
    <div class="field" id="mp-urlf"><label>伺服器位址</label><input id="mp-url" value="${esc(LS.get('cof_ws', wsUrlDefault()))}"></div>
    <details><summary class="hint">進階：自訂 P2P 訊號伺服器</summary><div class="field"><label>PeerJS 伺服器（留空使用公用伺服器）</label><input id="mp-peer" value="${esc(LS.get('cof_peer', ''))}"></div></details>
  </div><div class="opts"><button class="btn gold" id="mp-go">加入</button><button class="btn" data-close>取消</button></div>`);
  let mode = served ? 'ws' : 'p2p';
  const upd = () => { $$('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === mode)); $('#mp-urlf').classList.toggle('hidden', mode !== 'ws'); };
  upd(); $$('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; upd(); });
  $('#mp-go').onclick = async () => {
    const nm = $('#mp-name').value.trim() || '指揮官'; LS.set('cof_name', nm);
    const code = $('#mp-code').value.trim().toUpperCase();
    if (code.length < 4) { alertBox('請輸入房間代碼', '房間代碼由主機提供，共 5 個字元。'); return; }
    $('#mp-go').disabled = true; $('#mp-go').textContent = '連線中…';
    try {
      let net;
      if (mode === 'ws') { const url = $('#mp-url').value.trim(); LS.set('cof_ws', url); net = await joinWS(url, code, nm); }
      else { LS.set('cof_peer', $('#mp-peer').value.trim()); net = await joinP2P(code, nm, LS.get('cof_peer', '')); }
      closeModal();
      startClientLobby(net, nm, code);
    } catch (err) { $('#mp-go').disabled = false; $('#mp-go').textContent = '加入'; alertBox('連線失敗', esc(err.message)); }
  };
}
function startClientLobby(net, name, code) {
  lobby = { role: 'client', net, name, players: [], scen: '1936', diff: 'normal', hist: true, myTag: null, chat: [], hostName: '主機', hostTag: null };
  lobby.net.code = null;
  const handle = (m) => {
    if (!lobby) return;
    if (m.t === 'lobby') {
      const scenChanged = m.scen !== lobby.scen || m.hist !== lobby.hist || !setup.preview;
      Object.assign(lobby, { scen: m.scen, diff: m.diff, hist: m.hist, hostName: m.hostName, hostTag: m.hostTag, players: m.players });
      const mine = m.players.find(p => p.name === name && p.tag);
      if (scenChanged) { setup.preview = createGame(lobby.scen, { seed: 7, hist: lobby.hist }); S = setup.preview; map.setState(S, lobby.myTag); map.year = yearOf(S.day); }
      if (mine) lobby.myTag = mine.tag;
      map.me = lobby.myTag; map.refresh();
      renderLobby();
    } else if (m.t === 'lchat') lobbyChat(m.text);
    else if (m.t === 'start') {
      const st = JSON.parse(m.s);
      const g = new RemoteGame(net, st, m.me);
      g.players = m.players || [];
      const l = lobby; lobby = null;
      beginGame(g, m.me);
      if (!m.me) chooseNationDialog();
      void l;
    }
  };
  net.onMessage = handle;
  for (const m of net.queue || []) handle(m);
  net.onClose = () => { if (lobby) { lobby = null; alertBox('連線中斷', '主機已關閉房間。'); leaveToMenu(); } };
  show('scr-setup');
  $('#setup-title').textContent = '多人房間';
  $('#setup-body').innerHTML = `<div class="hint">已連線到房間 ${esc(code)}，等待主機資料…</div>`;
  $('#setup-foot').innerHTML = '';
}
// 地圖上點擊選國（設定/大廳）
function pickFromMap(n) {
  if (n < 0 || n >= R || !S) return;
  const t = S.ctrl[n]; if (!t || !alive(S, t)) return;
  if (lobby) { lobbyClick({ dataset: { lpick: t } }); return; }
  setup.tag = t; map.me = t; map.refresh(); renderSetup();
}

// ================================================================ 遊戲開始
function beginGame(g, tag) {
  G = g; S = g.S; me = tag; hudBuilt = null; deadShown = false; selSig = '';
  g.pauseOnEvents = LS.get('cof_evpause', true);
  sel.clear(); selRegion = -1; lastNews = S.newsSeq; lastCtrlSig = ''; overShown = !!S.over;
  map.setState(S, me); map.year = yearOf(S.day);
  if (me && S.C[me]) map.centerOnNode(S.C[me].cap, 1.3);
  show('scr-game');
  $('#chat').classList.toggle('hidden', !(G.net || G.isClient));
  g.on('tick', () => onUpdate(false));
  g.on('update', () => onUpdate(true));
  g.on('speed', () => renderHUD());
  g.on('pause', () => renderHUD());
  g.on('chat', (m) => chatLine(`${m.from}：${m.text}`));
  g.on('notice', (t) => { chatLine(t); toast(t); });
  g.on('players', () => { if (modalOpen && $('#plist-live')) openGameMenu(); });
  g.on('you', (t) => { me = t; map.me = t; S.C[t] && map.centerOnNode(S.C[t].cap, 1.3); onUpdate(true); toast(`你現在指揮：${cname(S, t)}`); });
  g.on('reset', () => { S = g.S; map.setState(S, me); onUpdate(true); });
  g.on('closed', () => { alertBox('連線中斷', '與主機的連線已中斷。'); });
  renderHUD();
  onUpdate(true);
}
function onUpdate(force) {
  if (!G) return;
  S = G.S;
  if (G.isClient) map.S = S;
  const now = performance.now();
  map.year = yearOf(S.day);
  const sig = S.ctrl.join(',');
  if (sig !== lastCtrlSig) { lastCtrlSig = sig; map.refreshSim(true); } else if (force) map.refresh(); else map.refreshSim();
  // 清理選取
  for (const id of [...sel]) { const u = S.units.find(x => x.id === id); if (!u || u.c !== me) sel.delete(id); }
  map.sel = sel;
  if (force || now - lastHud > 200) { lastHud = now; renderHUD(); }
  if (panel && !panelPointer && (force || now - lastPanel > (panelHover ? 2500 : 900))) { lastPanel = now; renderPanel(); }
  if (sel.size || selRegion >= 0) { if (force || now - lastSelRender > 700) { lastSelRender = now; renderSel(); } }
  checkDead();
  newsToasts();
  checkPrompts();
  checkOver();
  tabAlerts();
}

// ================================================================ HUD
let hudBuilt = null;
function buildHUD() {
  const hud = $('#hud');
  hud.innerHTML = `<div class="flag" data-hudtab="politics"><span class="sw" id="h-sw"></span><b id="h-name"></b></div>
    <div class="stat" id="h-ic" title="軍工產能（扣除部隊維持費後可用 / 總產能）"><i>🏭</i><span id="h-icn"></span><small id="h-icg"></small></div>
    <div class="stat" id="h-manb" title="可用人力"><i>👥</i><span id="h-man"></span></div>
    <div class="stat" id="h-ppb" title="政治點數：用於外交與法律"><i>⭐</i><span id="h-pp"></span></div>
    <div class="stat" id="h-nuke" title="核子武器"><i>☢️</i><span id="h-nk"></span></div>
    <div class="stat" id="h-sur" title="投降進度：本國勝利點被佔領的比例，超過門檻將投降"><i>🏳️</i><span id="h-surv"></span></div>
    <div class="spacer"></div><div class="date" id="h-date"></div>
    <div class="speeds"><button class="pause" data-speed="0" title="暫停（空白鍵）">⏸</button>${[1, 2, 3, 4, 5].map(i => `<button data-speed="${i}" title="速度 ${i}：每秒 ${SPEEDS[i]} 天">${'▶'.repeat(Math.min(3, Math.ceil(i / 2)))}</button>`).join('')}</div>
    <div class="spacer"></div>
    <div class="tension" title="世界緊張度：越高，民主國家越能動員備戰"><small id="h-ten"></small><div class="bar"><div id="h-tenb"></div></div></div>
    <button class="btn small" data-act="menu" title="選單">☰</button>`;
  hudBuilt = true;
}
function renderHUD() {
  if (!G || !S) return;
  if (!hudBuilt) buildHUD();
  const C = me && S.C[me];
  const set = (id, v) => { const el = document.getElementById(id); if (el && el.textContent !== String(v)) el.textContent = v; };
  const vis = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
  $('#h-sw').style.background = me ? color(me) : '#444';
  set('h-name', me ? cname(S, me) : '觀戰中');
  const ok = !!(C && C.exists !== false);
  vis('h-ic', ok); vis('h-manb', ok); vis('h-ppb', ok);
  if (ok) {
    set('h-icn', Math.round(C.icNet ?? C.ic ?? 0)); set('h-icg', '/' + Math.round(C.ic || 0));
    set('h-man', fmtMan(C.man || 0)); set('h-pp', Math.floor(C.pp || 0));
    vis('h-nuke', !!C.nukes); set('h-nk', C.nukes || 0);
    const war = atWarAny(S, me);
    vis('h-sur', war); set('h-surv', Math.round((C.surrender || 0) * 100) + '%');
    $('#h-sur').classList.toggle('warn', (C.surrender || 0) > 0.3);
  } else { vis('h-nuke', false); vis('h-sur', false); }
  set('h-date', fmtDate(S.day));
  const t = Math.round(S.tension);
  set('h-ten', `世界緊張度 ${t}%`); $('#h-tenb').style.width = Math.min(100, t) + '%';
  for (const b of $$('#hud [data-speed]')) { const v = Number(b.dataset.speed); b.classList.toggle('on', v === 0 ? G.paused : (!G.paused && G.speed === v)); }
}
$('#hud').addEventListener('click', (e) => {
  const sp = e.target.closest('[data-speed]');
  if (sp) {
    const v = Number(sp.dataset.speed);
    if (v === 0) G.togglePause(); else if (G.isClient) toast('只有主機可以調整速度'); else G.setSpeed(v);
    renderHUD(); return;
  }
  const tb = e.target.closest('[data-hudtab]'); if (tb) openPanel(panel === 'politics' ? null : 'politics');
});

// ================================================================ 分頁面板
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) openPanel(panel === b.dataset.tab ? null : b.dataset.tab); });
const PANEL_TITLES = { politics: '政治：國策與法律', research: '科技研究', production: '生產', diplomacy: '外交', army: '軍隊', news: '世界紀錄' };
function openPanel(p) {
  panel = p;
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === p));
  $('#panel').classList.toggle('hidden', !p);
  if (p) { $('#panel-title').textContent = PANEL_TITLES[p]; $('#panel-body').scrollTop = 0; renderPanel(); }
}
function renderPanel() {
  if (!panel || !S || !me || !S.C[me]) { if (panel && !me) $('#panel-body').innerHTML = '<div class="hint">你目前沒有指揮任何國家。</div>'; return; }
  const body = $('#panel-body');
  const scroll = body.scrollTop;
  const focusEl = document.activeElement && body.contains(document.activeElement) ? document.activeElement.id : null;
  const html = { politics: panelPolitics, research: panelResearch, production: panelProduction, diplomacy: panelDiplomacy, army: panelArmy, news: panelNews }[panel]();
  body.innerHTML = html;
  body.scrollTop = scroll;
  if (focusEl && document.getElementById(focusEl)) { const el = document.getElementById(focusEl); el.focus(); if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length); }
}
function cmd(c, okMsg) {
  if (!G) return;
  return G.command(c).then(r => { if (r && !r.ok && r.msg) toast(r.msg, 'warn'); else if (r && r.ok && (okMsg || r.msg)) toast(okMsg || r.msg); onUpdate(true); return r; });
}

// ---------------- 政治
function effText(e) {
  const out = [];
  const U = { inf: '步兵', arm: '裝甲', mec: '機械化', mar: '陸戰隊', ftr: '戰機', bmb: '轟炸機', flt: '艦隊', sub: '潛艇' };
  if (e.ind) out.push(`工業 +${e.ind}`);
  if (e.pp) out.push(`政治點數 +${e.pp}`);
  if (e.ppd) out.push(`每日政治點數 +${e.ppd}`);
  if (e.res) out.push(`研究欄位 +${e.res}`);
  if (e.rsp) out.push(`研究速度 +${Math.round(e.rsp * 100)}%`);
  if (e.att) out.push(`陸軍攻擊 +${Math.round(e.att * 100)}%`);
  if (e.def) out.push(`陸軍防禦 +${Math.round(e.def * 100)}%`);
  if (e.armorAtt) out.push(`裝甲攻擊 +${Math.round(e.armorAtt * 100)}%`);
  if (e.air) out.push(`空軍 +${Math.round(e.air * 100)}%`);
  if (e.nav) out.push(`海軍 +${Math.round(e.nav * 100)}%`);
  if (e.raid) out.push(`破交 +${Math.round(e.raid * 100)}%`);
  if (e.speed) out.push(`機動 +${Math.round(e.speed * 100)}%`);
  if (e.man) out.push(`人力 +${e.man}千`);
  if (e.nukes) out.push(`核彈 +${e.nukes}`);
  if (e.nukeSpeed) out.push(`核子研究 +${Math.round(e.nukeSpeed * 100)}%`);
  if (e.fort || e.fortAt) out.push('邊境要塞');
  if (e.units) out.push(Object.entries(e.units).map(([t, n]) => `${U[t]}×${n}`).join('、'));
  if (e.tech) out.push(Object.entries(e.tech).map(([t, n]) => `${TECH[t].name}科技 +${n}`).join('、'));
  return out.join('・');
}
function panelPolitics() {
  const C = S.C[me];
  const F = C.fac && S.fac[C.fac];
  const list = focusList(S, me);
  const cur = C.focus.cur ? list.find(f => f.id === C.focus.cur) : null;
  const avail = list.filter(f => !focusAvailable(S, me, f));
  const locked = list.filter(f => { const e = focusAvailable(S, me, f); return e && e !== '已完成'; }).slice(0, 6);
  const done = list.filter(f => C.focus.done.includes(f.id));
  let h = `<div class="sec"><h4>${sw(me)} ${nameOf(me)} <small>${esc(WORLD.countries[me].full)}</small></h4><div class="kv">
    <span>意識形態</span><span>${IDEOLOGIES[C.ideo] ? IDEOLOGIES[C.ideo].name : C.ideo}</span>
    <span>陣營</span><span>${F ? esc(F.name) + (F.leader === me ? '（領袖）' : '') : '無'}</span>
    <span>首都</span><span>${C.cap >= 0 ? regName(C.cap) : '—'}</span>
    <span>每日政治點數</span><span>+${(1.1 + (WORLD.countries[me].major ? 0.5 : 0) + (C.ppd || 0)).toFixed(1)}</span>
    ${C.subj ? `<span>宗主國</span><span>${nameOf(C.subj)}</span>` : ''}</div></div>`;
  h += `<div class="sec"><h4>國家焦點（國策）<small>完成後獲得永久效果</small></h4>`;
  if (cur) h += `<div class="card cur"><div class="row"><span class="t">▶ ${esc(cur.name)}</span><small>${Math.max(0, cur.days - C.focus.prog)} 天</small></div><div class="eff">${effText(cur.eff)}</div><div class="pbar"><div style="width:${100 * C.focus.prog / cur.days}%"></div></div></div>`;
  else h += `<div class="hint" style="margin-bottom:6px">⚠ 目前沒有進行中的國策，請選擇一項！</div>`;
  for (const f of avail) {
    if (cur) break;
    h += `<div class="card"><div class="row"><span class="t">${esc(f.name)}</span><small>${f.days} 天</small><button class="btn small gold" data-focus="${f.id}">開始</button></div>${f.desc ? `<div class="d">${esc(f.desc)}</div>` : ''}<div class="eff">${effText(f.eff)}</div></div>`;
  }
  if (cur && avail.length) h += `<div class="hint">完成目前國策後可選：${avail.map(f => esc(f.name)).join('、')}</div>`;
  if (locked.length) h += `<details style="margin-top:6px"><summary class="hint">尚未解鎖（${locked.length}）</summary>${locked.map(f => `<div class="hint">・${esc(f.name)}：${esc(focusAvailable(S, me, f))}</div>`).join('')}</details>`;
  if (done.length) h += `<details style="margin-top:6px"><summary class="hint">已完成（${done.length}）</summary><div class="hint">${done.map(f => esc(f.name)).join('、')}</div></details>`;
  h += `</div><div class="sec"><h4>法律 <small>變更需 80 政治點數</small></h4>`;
  for (const law of ['con', 'eco']) {
    h += `<div style="font-size:13px;color:var(--dim);margin-bottom:3px">${LAWS[law].name}</div><div class="lawrow">`;
    LAWS[law].levels.forEach((L, i) => {
      const err = lawAllowed(S, me, law, i);
      const on = C.laws[law] === i;
      h += `<button class="btn ${on ? 'on' : ''}" ${err && !on ? 'disabled' : ''} title="${esc(L.desc + (err ? '｜' + err : ''))}" data-law="${law}" data-lvl="${i}">${L.name}</button>`;
    });
    h += `</div>`;
  }
  h += `</div><div class="sec"><h4>AI 輔助 <small>新手推薦開啟</small></h4>
    ${toggle('autoFocus', '自動選擇國策')}${toggle('autoResearch', '自動選擇研究')}${toggle('autoProd', '自動管理生產')}${toggle('autoDeploy', '新部隊交由 AI 指揮')}${toggle('autoArmy', 'AI 指揮全軍（你只需專注於外交與經濟）')}</div>`;
  return h;
}
function toggle(key, label) { const C = S.C[me]; return `<label class="toggle"><input type="checkbox" data-flag="${key}" ${C[key] ? 'checked' : ''}>${label}</label>`; }

// ---------------- 研究
function panelResearch() {
  const C = S.C[me];
  let h = `<div class="sec"><h4>研究欄位 <small>${C.res.length} 個</small></h4>`;
  C.res.forEach((s, i) => {
    if (!s) { h += `<div class="card"><div class="row"><span class="t" style="color:var(--dim)">空欄位 ${i + 1}</span><small>點選下方類別開始研究</small></div></div>`; return; }
    const lv = C.tech[s.cat] || 0, L = TECH[s.cat].levels[lv];
    const cost = researchCost(S, me, s.cat);
    h += `<div class="card cur"><div class="row"><span class="t">${TECH[s.cat].icon} ${L ? esc(L[1]) : ''}</span><small>約 ${Math.max(0, Math.ceil(cost - s.prog))} 天</small><button class="btn tiny" data-rescancel="${i}">✕</button></div><div class="pbar green"><div style="width:${Math.min(100, 100 * s.prog / cost)}%"></div></div></div>`;
  });
  h += `</div><div class="sec"><h4>科技類別 <small>研究超前時代會更慢</small></h4>`;
  for (const cat of TECH_ORDER) {
    const T = TECH[cat], lv = C.tech[cat] || 0, L = T.levels[lv];
    const err = canResearch(S, me, cat);
    const cost = L ? Math.round(researchCost(S, me, cat)) : 0;
    h += `<div class="card"><div class="row"><span class="t">${T.icon} ${T.name} <small style="color:var(--dim)">等級 ${lv}/${T.levels.length}</small></span>${L ? `<button class="btn small ${err ? '' : 'gold'}" ${err ? 'disabled' : ''} title="${esc(err || '')}" data-research="${cat}">研究</button>` : ''}</div>
      <div class="d">${L ? `下一項：<b>${esc(L[1])}</b>（${L[0]} 年）・約 ${cost} 天${err && err !== '研究中' ? `・<span style="color:#e99">${esc(err)}</span>` : ''}` : '已全部完成'}</div>
      <div class="eff">${cat === 'ind' ? '每級軍工產能 +8%' : cat === 'nuc' ? '原子彈 → 氫彈 → 洲際飛彈（無限射程）' : '每級對應兵種戰力 +10%'}</div></div>`;
  }
  return h + '</div>';
}

// ---------------- 生產
const ITEM_ORDER = ['inf', 'arm', 'mec', 'mar', 'ftr', 'bmb', 'flt', 'sub', 'factory', 'nuke'];
function itemName(t) { return UNITS[t] ? UNITS[t].name : BUILD[t].name; }
function panelProduction() {
  const C = S.C[me];
  let h = `<div class="sec"><h4>產能 <small>每日</small></h4><div class="kv">
    <span>總軍工產能</span><span>${(C.ic || 0).toFixed(1)}</span>
    <span>部隊維持費</span><span>−${(C.upkeep || 0).toFixed(1)}</span>
    <span>可用於生產</span><span><b>${(C.icNet ?? 0).toFixed(1)}</b></span>
    <span>人力</span><span>${fmtMan(C.man || 0)}</span>
    ${C.convoyLoss > 0.01 ? `<span>海運損失</span><span style="color:#e99">−${Math.round(C.convoyLoss * 100)}%（敵潛艇破交）</span>` : ''}
    <span>新部隊部署</span><span>${C.deploy >= 0 && S.ctrl[C.deploy] === me ? regName(C.deploy) : '首都'}</span></div></div>`;
  h += `<div class="sec"><h4>生產線 <small>${C.prod.length}/8・產能平均分配</small></h4>`;
  if (!C.prod.length) h += `<div class="hint">沒有生產項目。從下方加入部隊或建築。</div>`;
  C.prod.forEach((l, i) => {
    const cost = itemCost(l.type, C);
    const days = (C.icNet || 0) > 0 ? Math.ceil((cost - l.prog) / ((C.icNet || 1) / C.prod.length)) : '∞';
    h += `<div class="line"><div class="nm"><b>${itemName(l.type)}</b> <small style="color:var(--dim)">${l.n < 0 ? '持續生產' : '剩餘 ' + l.n}${l.wait ? '・人力不足' : ''}${l.tgt >= 0 ? '・' + regName(l.tgt) : ''}</small><div class="pbar"><div style="width:${Math.min(100, 100 * l.prog / cost)}%"></div></div></div>
      <small style="color:var(--dim);width:42px;text-align:right">${days}天</small>
      <button class="btn tiny" data-pcount="${i}" data-v="${l.n < 0 ? 1 : l.n === 1 ? 5 : -1}" title="切換數量">${l.n < 0 ? '∞' : l.n}</button>
      ${i > 0 ? `<button class="btn tiny" data-pup="${i}" title="上移">↑</button>` : ''}<button class="btn tiny" data-prem="${i}">✕</button></div>`;
  });
  h += `</div><div class="sec"><h4>加入生產 <small>數量：<span class="seg" style="display:inline-flex;gap:2px">${[1, 5, -1].map(n => `<button class="btn tiny ${ui.prodCount === n ? 'on' : ''}" data-pc="${n}">${n < 0 ? '∞' : n}</button>`).join('')}</span></small></h4><div class="unitbtns">`;
  for (const t of ITEM_ORDER) {
    const err = canBuild(S, me, t);
    const U = UNITS[t];
    const info = U ? (U.domain === 'land' ? `攻${U.att} 防${U.def}・${U.cost}・${U.man}千人` : U.domain === 'air' ? `空戰${U.air}${U.bomb ? ' 轟炸' + U.bomb : ''}・${U.cost}` : `攻${U.att}・${U.cost}`) : `${itemCost(t, C)} 產能`;
    h += `<button class="btn" ${err ? 'disabled' : ''} title="${esc((U ? U.desc : BUILD[t].desc) + (err ? '｜' + err : ''))}" data-padd="${t}">${itemName(t)}<small>${info}</small></button>`;
  }
  h += `</div><div class="hint" style="margin-top:6px">要塞：點選地圖上的己方地區，在地區資訊中建造。部署地點也可在地區資訊中設定。</div></div>`;
  return h;
}

// ---------------- 外交
function relation(t) {
  const C = S.C[me], T = S.C[t];
  const b = [];
  if (atWar(S, me, t)) b.push('<span class="badge war">交戰中</span>');
  else if (friendly(S, me, t)) b.push('<span class="badge ally">盟友</span>');
  else if (allied(S, me, t)) b.push('<span class="badge ally">共同作戰</span>');
  if (C.nap && C.nap[t] > S.day) b.push('<span class="badge">互不侵犯</span>');
  if (C.guar && C.guar.includes(t)) b.push('<span class="badge">我方保證</span>');
  if (T.guar && T.guar.includes(me)) b.push('<span class="badge">保證我方</span>');
  if (S.lend[me + '>' + t]) b.push('<span class="badge">援助中</span>');
  return b.join(' ');
}
function neighborsOf(t) {
  const set = new Set();
  for (let r = 0; r < R; r++) if (S.ctrl[r] === t) for (const m of nodes[r].landNb) { const o = S.ctrl[m]; if (o && o !== t) set.add(o); }
  return set;
}
function panelDiplomacy() {
  const C = S.C[me];
  let h = '';
  const en = [...enemySet(S, me)];
  if (en.length) {
    h += `<div class="sec"><h4>戰爭 <small>${en.length} 個敵國</small></h4>`;
    for (const t of en) {
      const T = S.C[t];
      h += `<div class="line">${sw(t)}<div class="nm"><b>${nameOf(t)}</b> <small style="color:var(--dim)">投降進度 ${Math.round((T.surrender || 0) * 100)}%</small></div>
        <button class="btn tiny" data-peace="${t}" data-kind="white" title="恢復戰前邊界">白和平</button><button class="btn tiny" data-peace="${t}" data-kind="status" title="停火，雙方保留目前控制的地區">停火</button>
        <button class="btn tiny ${S.puppet && S.puppet[me + '>' + t] ? 'on' : ''}" data-puppet="${t}" title="對方投降時：扶植傀儡政權（而非吞併佔領地）">傀儡</button></div>`;
    }
    h += `</div>`;
  }
  const F = C.fac && S.fac[C.fac];
  h += `<div class="sec"><h4>陣營</h4>`;
  if (F) h += `<div class="card"><div class="row"><span class="t">${esc(F.name)}</span>${F.leader === me ? '<small>你是領袖</small>' : ''}<button class="btn tiny" data-leavefac="1">退出</button></div><div class="d">${F.members.map(m => `${sw(m)}${nameOf(m)}`).join('　')}</div></div>`;
  else h += `<div class="hint">你目前不屬於任何陣營。可申請加入下方的陣營，或（主要強權）建立自己的陣營。</div><div class="actions"><button class="btn small" data-createfac="1">建立陣營（50）</button></div>`;
  const facs = Object.values(S.fac).filter(f => f.id !== C.fac);
  if (facs.length && !C.fac) h += facs.map(f => `<div class="line"><div class="nm"><b>${esc(f.name)}</b> <small>${nameOf(f.leader)} 領導・${f.members.length} 國</small></div><button class="btn tiny" data-askjoin="${f.id}">申請加入</button></div>`).join('');
  h += `</div>`;
  // 國家列表
  const nb = neighborsOf(me);
  let tags = liveTags(S).filter(t => t !== me);
  if (ui.dipFilter === 'near') tags = tags.filter(t => nb.has(t) || atWar(S, me, t) || friendly(S, me, t));
  else if (ui.dipFilter === 'major') tags = tags.filter(t => WORLD.countries[t].major || (S.C[t].ic || 0) > 40);
  else if (ui.dipFilter === 'war') tags = tags.filter(t => atWarAny(S, t));
  if (ui.dipSearch) tags = liveTags(S).filter(t => t !== me && cname(S, t).includes(ui.dipSearch));
  tags.sort((a, b) => (S.C[b].ic || 0) - (S.C[a].ic || 0));
  h += `<div class="sec"><h4>各國</h4><div class="filter">${[['near', '鄰國/相關'], ['major', '強權'], ['war', '交戰國'], ['all', '全部']].map(([k, v]) => `<button class="btn tiny ${ui.dipFilter === k ? 'on' : ''}" data-dfilter="${k}">${v}</button>`).join('')}<input id="dip-search" placeholder="搜尋國家" value="${esc(ui.dipSearch)}"></div><div class="clist">`;
  for (const t of tags.slice(0, 80)) {
    const T = S.C[t];
    const open = ui.dipOpen === t;
    h += `<div class="crow" data-dopen="${t}">${sw(t)}<div class="nm"><b>${nameOf(t)}</b> <small style="color:var(--dim)">${IDEOLOGIES[T.ideo] ? IDEOLOGIES[T.ideo].name : ''}・工業 ${Math.round(T.ic || 0)}${T.fac && S.fac[T.fac] ? '・' + esc(S.fac[T.fac].name) : ''}${T.ai ? '' : '・👤玩家'}</small></div>${relation(t)}</div>`;
    if (open) {
      const err = canDeclare(S, me, t);
      h += `<div class="actions" style="padding:0 0 8px 22px">
        ${atWar(S, me, t) ? '' : `<button class="btn tiny red" ${err ? 'disabled' : ''} title="${esc(err || '')}" data-declare="${t}">宣戰（${warCost(S, me, t)}）</button>`}
        <button class="btn tiny" data-guar="${t}">${C.guar && C.guar.includes(t) ? '撤銷保證' : '保證獨立（25）'}</button>
        <button class="btn tiny" data-nap="${t}">互不侵犯（25）</button>
        ${C.fac && S.fac[C.fac] && S.fac[C.fac].leader === me && !T.fac ? `<button class="btn tiny" data-invite="${t}">邀請入陣營（25）</button>` : ''}
        <button class="btn tiny" data-lend="${t}">${S.lend[me + '>' + t] ? '停止援助' : '軍事援助 10%'}</button>
        <button class="btn tiny" data-locate="${T.cap}">定位</button></div>`;
    }
  }
  h += `</div></div>`;
  // 可釋放國家
  const rel = new Set();
  for (let r = 0; r < R; r++) { const c = S.core[r]; if (S.own[r] === me && c && c !== me && !alive(S, c) && WORLD.countries[c]) rel.add(c); }
  if (rel.size) h += `<div class="sec"><h4>可釋放的國家 <small>成為你的附庸</small></h4>${[...rel].map(t => `<div class="line">${sw(t)}<div class="nm">${nameOf(t)}</div><button class="btn tiny" data-release="${t}">釋放（50）</button></div>`).join('')}</div>`;
  return h;
}

// ---------------- 軍隊
function panelArmy() {
  const C = S.C[me];
  const mine = S.units.filter(u => u.c === me);
  const land = mine.filter(isLandUnit), air = mine.filter(isAir), sea = mine.filter(isNaval);
  const avg = (a, k) => a.length ? Math.round(a.reduce((s, u) => s + u[k], 0) / a.length) : 0;
  let h = `<div class="sec"><h4>總覽</h4><div class="kv"><span>陸軍</span><span>${land.length} 個師（平均兵力 ${avg(land, 'hp')}%）</span><span>空軍</span><span>${air.length} 個聯隊</span><span>海軍</span><span>${sea.length} 支艦隊</span><span>補給中斷</span><span>${land.filter(u => !u.sup).length} 個師</span><span>戰果</span><span>擊毀 ${C.stats ? C.stats.kills : 0}・損失 ${C.stats ? C.stats.lost : 0}</span></div>
    <div class="actions"><button class="btn small" data-selall="land">選取全部陸軍</button><button class="btn small" data-selall="idle">選取閒置陸軍</button><button class="btn small" data-selall="air">選取空軍</button><button class="btn small" data-selall="sea">選取海軍</button></div>
    ${toggle('autoArmy', 'AI 指揮全軍')}${toggle('autoDeploy', '新部隊交由 AI 指揮')}</div>`;
  const byNode = new Map();
  for (const u of mine) { let a = byNode.get(u.n); if (!a) byNode.set(u.n, a = []); a.push(u); }
  const entries = [...byNode.entries()].sort((a, b) => b[1].length - a[1].length);
  h += `<div class="sec"><h4>部署位置 <small>${entries.length} 處</small></h4>`;
  for (const [n, us] of entries.slice(0, 60)) {
    const types = {};
    for (const u of us) types[u.t] = (types[u.t] || 0) + 1;
    const moving = us.filter(u => u.path && u.path.length).length, autoN = us.filter(u => u.auto).length;
    h += `<div class="line"><div class="nm"><b>${regName(n)}</b><br><small style="color:var(--dim)">${Object.entries(types).map(([t, k]) => `${UNITS[t].short}×${k}`).join(' ')}${moving ? '・移動中 ' + moving : ''}${autoN ? '・AI ' + autoN : ''}</small></div><button class="btn tiny" data-locate="${n}">定位</button><button class="btn tiny" data-selnode="${n}">選取</button></div>`;
  }
  return h + `</div>`;
}

// ---------------- 紀錄
function panelNews() {
  const list = S.news.slice().reverse().filter(n => ui.newsFilter === 'all' || (ui.newsFilter === 'mine' ? (n.c || []).includes(me) : n.k === 'hist'));
  return `<div class="filter">${[['all', '全部'], ['mine', '與我相關'], ['hist', '歷史事件']].map(([k, v]) => `<button class="btn tiny ${ui.newsFilter === k ? 'on' : ''}" data-nfilter="${k}">${v}</button>`).join('')}</div>
    <div class="news">${list.map(n => `<div class="k-${n.k}"><span class="dt">${fmtDate(n.d)}</span>${esc(n.t)}</div>`).join('') || '<div class="hint">尚無紀錄</div>'}</div>`;
}

// 面板點擊
$('#panel').addEventListener('click', (e) => {
  const t = e.target.closest('button,[data-dopen]');
  if (!t) return;
  const d = t.dataset;
  if (d.focus) cmd({ type: 'focus', id: d.focus });
  else if (d.law) cmd({ type: 'law', law: d.law, lvl: Number(d.lvl) });
  else if (d.research) cmd({ type: 'research', cat: d.research });
  else if (d.rescancel) cmd({ type: 'research_cancel', slot: Number(d.rescancel) });
  else if (d.padd) cmd({ type: 'prod_add', item: d.padd, n: ui.prodCount });
  else if (d.pc) { ui.prodCount = Number(d.pc); renderPanel(); }
  else if (d.prem) cmd({ type: 'prod_remove', i: Number(d.prem) });
  else if (d.pup) cmd({ type: 'prod_up', i: Number(d.pup) });
  else if (d.pcount) cmd({ type: 'prod_count', i: Number(d.pcount), n: Number(d.v) });
  else if (d.peace) cmd({ type: 'peace', target: d.peace, kind: d.kind });
  else if (d.puppet) cmd({ type: 'puppetPref', target: d.puppet, on: !(S.puppet && S.puppet[me + '>' + d.puppet]) });
  else if (d.leavefac) confirmBox('退出陣營？', '退出後將失去盟友的保護。', () => cmd({ type: 'leaveFac' }));
  else if (d.createfac) promptBox('建立陣營', '陣營名稱', `${cname(S, me)}同盟`, (name) => cmd({ type: 'createFac', name }));
  else if (d.askjoin) cmd({ type: 'askJoin', fac: d.askjoin });
  else if (d.dfilter) { ui.dipFilter = d.dfilter; ui.dipSearch = ''; renderPanel(); }
  else if (d.dopen) { ui.dipOpen = ui.dipOpen === d.dopen ? null : d.dopen; renderPanel(); }
  else if (d.declare) confirmBox(`向${cname(S, d.declare)}宣戰？`, `將花費 ${warCost(S, me, d.declare)} 政治點數。對方的盟友與保證國可能會一起參戰。`, () => cmd({ type: 'declare', target: d.declare }));
  else if (d.guar) cmd({ type: 'guarantee', target: d.guar });
  else if (d.nap) cmd({ type: 'nap', target: d.nap });
  else if (d.invite) cmd({ type: 'invite', target: d.invite });
  else if (d.lend) cmd({ type: 'lend', target: d.lend, pct: S.lend[me + '>' + d.lend] ? 0 : 0.1 });
  else if (d.release) cmd({ type: 'release', tag: d.release });
  else if (d.locate) { const n = Number(d.locate); if (n >= 0) map.centerOnNode(n, Math.max(map.cam.z, 1.8)); }
  else if (d.selnode) { sel.clear(); for (const u of S.units) if (u.c === me && u.n === Number(d.selnode)) sel.add(u.id); map.centerOnNode(Number(d.selnode)); syncSel(); }
  else if (d.selall) {
    sel.clear();
    for (const u of S.units) {
      if (u.c !== me) continue;
      if (d.selall === 'land' && isLandUnit(u)) sel.add(u.id);
      else if (d.selall === 'idle' && isLandUnit(u) && !(u.path && u.path.length)) sel.add(u.id);
      else if (d.selall === 'air' && isAir(u)) sel.add(u.id);
      else if (d.selall === 'sea' && isNaval(u)) sel.add(u.id);
    }
    syncSel();
  } else if (d.nfilter) { ui.newsFilter = d.nfilter; renderPanel(); }
});
let panelPointer = false, panelHover = false;
$('#panel').addEventListener('pointerdown', () => { panelPointer = true; });
window.addEventListener('pointerup', () => { if (panelPointer) setTimeout(() => { panelPointer = false; }, 50); });
$('#panel').addEventListener('pointerenter', () => { panelHover = true; });
$('#panel').addEventListener('pointerleave', () => { panelHover = false; });
$('#panel').addEventListener('change', (e) => { const f = e.target.dataset.flag; if (f) cmd({ type: 'setflag', key: f, on: e.target.checked }); });
$('#panel').addEventListener('input', (e) => { if (e.target.id === 'dip-search') { ui.dipSearch = e.target.value.trim(); renderPanel(); } });

// ================================================================ 選取與指令
function syncSel() { map.sel = sel; map.refresh(); renderSel(); }
function orderTo(n) {
  if (!G || !me) { if (!G) pickFromMap(n); return; }
  if (!sel.size) { regionClick(n); return; }
  const ids = [...sel];
  const units = ids.map(id => S.units.find(u => u.id === id)).filter(Boolean);
  const airIds = units.filter(isAir).map(u => u.id), other = units.filter(u => !isAir(u)).map(u => u.id);
  if (airIds.length) cmd({ type: 'move', units: airIds, to: n });
  if (other.length) cmd({ type: 'move', units: other, to: n });
}
function regionClick(n) {
  if (!G) { pickFromMap(n); return; }
  sel.clear();
  selRegion = n; map.selRegion = n; map.refresh();
  renderSel();
}
function renderSel() {
  const box = $('#selbox');
  if (!G || !S) { box.classList.add('hidden'); return; }
  if (sel.size) {
    const units = [...sel].map(id => S.units.find(u => u.id === id)).filter(Boolean);
    if (!units.length) { box.classList.add('hidden'); return; }
    const types = {};
    for (const u of units) types[u.t] = (types[u.t] || 0) + 1;
    const chips = units.slice(0, 40).map(u => `<span class="uchip" title="${esc(UNITS[u.t].name)}｜兵力 ${Math.round(u.hp)}%｜組織度 ${Math.round(u.org)}${u.sup ? '' : '｜補給中斷！'}${u.auto ? '｜AI 指揮' : ''}">${UNITS[u.t].short}<span class="mini"><div style="width:${u.hp}%;background:${u.org / (UNITS[u.t].org || 60) > 0.5 ? '#5d5' : u.org > 10 ? '#dc4' : '#e44'}"></div></span>${u.sup ? '' : '⚠'}${u.auto ? '🤖' : ''}</span>`).join('');
    const where = [...new Set(units.map(u => u.n))];
    const sig = 'u' + units.map(u => u.id).join(',');
    if (sig === selSig && box.querySelector('.units') && !box.classList.contains('hidden')) {
      box.querySelector('.units').innerHTML = chips;
      box.querySelector('h4 small').textContent = Object.entries(types).map(([t, k]) => `${UNITS[t].name}×${k}`).join('、');
      return;
    }
    selSig = sig;
    box.innerHTML = `<h4>已選取 ${units.length} 個單位 <small style="color:var(--dim);font-weight:400">${Object.entries(types).map(([t, k]) => `${UNITS[t].name}×${k}`).join('、')}</small><span class="x" data-sx="1">✕</span></h4>
      <div class="units">${chips}</div>
      <div class="actions"><button class="btn small gold" data-sord="1">📍 移動/進攻…</button><button class="btn small" data-sstop="1">停止</button><button class="btn small" data-sauto="1">交給 AI</button><button class="btn small" data-sloc="${where[0]}">定位</button><button class="btn small red" data-sdis="1">解散</button></div>
      <div class="sel-hint">${matchMedia('(pointer:coarse)').matches ? '按「移動/進攻」後點擊目標地區（或長按地圖）。' : '右鍵點擊目標地區即可移動；目標為敵方地區時會發動進攻。Shift+拖曳可框選。'}</div>`;
    box.classList.remove('hidden');
    return;
  }
  if (selRegion >= 0) {
    const n = selRegion, nd = nodes[n];
    const rsig = 'r' + n + ':' + S.ctrl[n] + ':' + S.own[n] + ':' + S.ind[n] + ':' + S.fort[n] + ':' + S.units.filter(u => u.n === n).length + ':' + (me && S.C[me] ? S.C[me].nukes : 0);
    if (rsig === selSig && !box.classList.contains('hidden')) return;
    selSig = rsig;
    if (n >= R) {
      const here = S.units.filter(u => u.n === n);
      box.innerHTML = `<h4>🌊 ${esc(nd.name)}<span class="x" data-sx="1">✕</span></h4><div class="hint">海域。艦隊在此作戰並掌握制海權；運兵船經過敵方優勢海域會遭受損失。</div>${unitsHere(here)}`;
      box.classList.remove('hidden'); return;
    }
    const own = S.own[n], ctl = S.ctrl[n], core = S.core[n];
    const here = S.units.filter(u => u.n === n);
    const mineCtl = ctl === me;
    const canNuke = me && S.C[me] && S.C[me].nukes > 0 && atWar(S, me, ctl);
    box.innerHTML = `<h4>${sw(ctl)} ${regName(n)}<span class="x" data-sx="1">✕</span></h4>
      <div class="kv"><span>控制</span><span>${nameOf(ctl)}${own !== ctl ? `（屬於 ${nameOf(own)}，被佔領）` : ''}</span>
      <span>地形</span><span>${TERRAIN[nd.terrain].name}（防禦 ×${TERRAIN[nd.terrain].def}）</span>
      <span>工業</span><span>${S.ind[n]} / ${regionIndCap(n)}${S.dmg[n] > 0.05 ? `（轟炸損害 ${Math.round(S.dmg[n] * 100)}%）` : ''}</span>
      <span>勝利點</span><span>${nd.vp}</span><span>要塞</span><span>${'▮'.repeat(S.fort[n]) || '無'}</span>
      <span>人口</span><span>${nd.pop} 百萬</span>${core && core !== own ? `<span>核心</span><span>${nameOf(core)}</span>` : ''}</div>
      ${unitsHere(here)}
      <div class="actions">${mineCtl ? `<button class="btn small" data-rdeploy="${n}">設為部署地點</button><button class="btn small" data-rfac="${n}">建造工廠</button><button class="btn small" data-rfort="${n}">建造要塞</button>` : ''}
      ${canNuke ? `<button class="btn small red" data-rnuke="${n}">☢ 使用核彈</button>` : ''}
      ${ctl && ctl !== me && alive(S, ctl) ? `<button class="btn small" data-rdip="${ctl}">外交：${nameOf(ctl)}</button>` : ''}</div>`;
    box.classList.remove('hidden'); return;
  }
  selSig = '';
  box.classList.add('hidden');
}
function unitsHere(list) {
  if (!list.length) return '';
  const by = {};
  for (const u of list) { const k = u.c; (by[k] || (by[k] = {}))[u.t] = (by[k][u.t] || 0) + 1; }
  return `<div class="units">${Object.entries(by).map(([c, ts]) => `<span class="uchip">${sw(c)}${nameOf(c)}：${Object.entries(ts).map(([t, k]) => `${UNITS[t].short}${k}`).join(' ')}</span>`).join('')}</div>`;
}
$('#selbox').addEventListener('click', (e) => {
  const t = e.target.closest('[data-sx],[data-sord],[data-sstop],[data-sauto],[data-sloc],[data-sdis],[data-rdeploy],[data-rfac],[data-rfort],[data-rnuke],[data-rdip]');
  if (!t) return;
  const d = t.dataset;
  if (d.sx) { sel.clear(); selRegion = -1; map.selRegion = -1; syncSel(); }
  else if (d.sord) { map.orderMode = true; toast('請點擊目標地區'); }
  else if (d.sstop) cmd({ type: 'stop', units: [...sel] });
  else if (d.sauto) cmd({ type: 'auto', units: [...sel], on: true });
  else if (d.sloc) map.centerOnNode(Number(d.sloc));
  else if (d.sdis) confirmBox('解散部隊？', `將解散 ${sel.size} 個單位並回收部分人力。`, () => { cmd({ type: 'disband', units: [...sel] }); sel.clear(); syncSel(); });
  else if (d.rdeploy) cmd({ type: 'deploy', region: Number(d.rdeploy) });
  else if (d.rfac) cmd({ type: 'prod_add', item: 'factory', n: 1, tgt: Number(d.rfac) }, '已加入工廠建造');
  else if (d.rfort) cmd({ type: 'prod_add', item: 'fort', n: 1, tgt: Number(d.rfort) }, '已加入要塞建造');
  else if (d.rnuke) confirmBox('☢ 使用核子武器？', `核子武器將摧毀${regName(Number(d.rnuke))}的大部分軍隊與工業，造成大量平民死傷，並大幅提升世界緊張度。若對方擁有核武，將遭到核子報復。`, () => cmd({ type: 'nuke', region: Number(d.rnuke) }));
  else if (d.rdip) { ui.dipOpen = d.rdip; ui.dipFilter = 'all'; ui.dipSearch = cname(S, d.rdip); openPanel('diplomacy'); }
});

// 地圖模式
$('#mapmodes').addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (!b) return; map.mode = b.dataset.mode; $$('#mapmodes button').forEach(x => x.classList.toggle('on', x === b)); map.refresh(); });

// 懸停提示
function hoverTip(n, x, y) {
  const tip = $('#tooltip');
  if (n < 0 || !S) { tip.style.display = 'none'; return; }
  const nd = nodes[n];
  let html;
  if (n >= R) html = `🌊 <b>${esc(nd.name)}</b>`;
  else {
    const c = S.ctrl[n], o = S.own[n];
    const u = S.units.filter(v => v.n === n).length;
    html = `<b>${regName(n)}</b><br>${sw(c)} ${nameOf(c)}${o !== c ? `（佔領自 ${nameOf(o)}）` : ''}<br>${TERRAIN[nd.terrain].name}・工業 ${S.ind[n]}・勝利點 ${nd.vp}${S.fort[n] ? '・要塞 ' + S.fort[n] : ''}${u ? '・部隊 ' + u : ''}`;
  }
  tip.innerHTML = html; tip.style.display = 'block';
  tip.style.left = Math.min(window.innerWidth - 290, x + 14) + 'px'; tip.style.top = (y + 14) + 'px';
}
$('#map').addEventListener('pointerleave', () => { $('#tooltip').style.display = 'none'; });

// 鍵盤
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (!G) return;
  if (e.code === 'Space') { e.preventDefault(); G.togglePause(); renderHUD(); }
  else if (/^Digit[1-5]$/.test(e.code) && !G.isClient) { G.setSpeed(Number(e.code.slice(5))); renderHUD(); }
  else if (e.key === 'Escape') { if (modalOpen) return; sel.clear(); selRegion = -1; map.selRegion = -1; map.orderMode = false; syncSel(); }
  else if (e.key === 'q') openPanel(panel === 'politics' ? null : 'politics');
  else if (e.key === 'w') openPanel(panel === 'research' ? null : 'research');
  else if (e.key === 'e') openPanel(panel === 'production' ? null : 'production');
  else if (e.key === 'r') openPanel(panel === 'diplomacy' ? null : 'diplomacy');
  else if (e.key === 't') openPanel(panel === 'army' ? null : 'army');
});

// ================================================================ 通知、事件、結束
const TOAST_KINDS = new Set(['war', 'major', 'peace', 'nuke', 'hist', 'indep']);
function newsToasts() {
  if (!S) return;
  for (const n of S.news) {
    if (n.id <= lastNews) continue;
    lastNews = Math.max(lastNews, n.id);
    const mine = (n.c || []).includes(me);
    if (TOAST_KINDS.has(n.k) && (n.k !== 'indep' || mine) || (mine && ['tech', 'focus', 'info', 'diplo'].includes(n.k))) toast(n.t.length > 160 ? n.t.slice(0, 158) + '…' : n.t, n.k);
  }
}
function toast(text, kind = 'info') {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + (kind === 'warn' ? 'war' : kind);
  el.textContent = text;
  el.onclick = () => el.remove();
  box.appendChild(el);
  while (box.children.length > 5) box.firstChild.remove();
  setTimeout(() => el.remove(), kind === 'hist' || kind === 'major' ? 9000 : 5500);
}
function checkPrompts() {
  if (modalOpen || !me || !S.pending) return;
  const list = S.pending[me];
  if (!list || !list.length) return;
  const p = list[0];
  modal(`<header><h3>${esc(p.title)}</h3><small>${fmtDate(p.day)}${p.from ? '・來自 ' + nameOf(p.from) : ''}</small></header><div class="db">${esc(p.text)}</div>
    <div class="opts">${p.opts.map((o, i) => `<button class="btn ${i === 0 ? 'gold' : ''}" data-popt="${i}">${esc(o.t)}</button>`).join('')}</div>`, false);
  $$('[data-popt]').forEach(b => b.onclick = () => { closeModal(); cmd({ type: 'event', uid: p.uid, opt: Number(b.dataset.popt) }); });
}
function checkOver() {
  if (!S.over || overShown) return;
  overShown = true;
  const sc = S.over.scores || scores(S);
  const rows = Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const rank = rows.findIndex(([t]) => t === me);
  modal(`<header><h3>遊戲結束</h3><small>${esc(S.over.reason)}・${fmtDate(S.over.day || S.day)}</small></header><div class="db">
    ${me ? `<p>${sw(me)} <b>${nameOf(me)}</b>：${rank >= 0 ? `世界排名第 ${rank + 1} 名` : alive(S, me) ? '未進入前十二名' : '已經滅亡'}。</p>` : ''}
    <table><tr><th>#</th><th>國家</th><th>分數（勝利點＋工業）</th></tr>${rows.map(([t, v], i) => `<tr><td>${i + 1}</td><td>${sw(t)} ${nameOf(t)}</td><td>${v}</td></tr>`).join('')}</table></div>
    <div class="opts"><button class="btn gold" data-close>繼續觀看地圖</button><button class="btn" data-act="back">回主選單</button></div>`);
}
function checkDead() {
  if (!me || deadShown || modalOpen || !S.C[me] || S.C[me].exists !== false) return;
  deadShown = true;
  modal(`<header><h3>${nameOf(me)}已經滅亡</h3><small>${fmtDate(S.day)}</small></header><div class="db">你的國家已被敵人吞併。若盟國解放你的國土，你的國家可能會復國。你可以選擇另一個國家繼續遊戲，或留下來觀戰。</div>
    <div class="opts"><button class="btn gold" id="dead-pick">選擇其他國家</button><button class="btn" data-close>繼續觀戰</button><button class="btn" data-act="back">回主選單</button></div>`);
  $('#dead-pick').onclick = () => chooseNationDialog();
}
function tabAlerts() {
  if (!me || !S.C[me]) return;
  const C = S.C[me];
  const set = (tab, on) => { const b = $(`#tabs [data-tab="${tab}"]`); if (b) b.classList.toggle('alert', !!on); };
  set('politics', !C.focus || (!C.focus.cur && !C.autoFocus));
  set('research', C.res && C.res.some(s => !s) && !C.autoResearch);
  set('production', C.prod && C.prod.length === 0 && !C.autoProd);
  set('diplomacy', atWarAny(S, me) && (C.surrender || 0) > 0.3);
}

// ================================================================ 對話框工具
function modal(html, closable = true) {
  const m = $('#modal');
  m.innerHTML = `<div class="dlg">${html}</div>`;
  m.classList.add('on'); modalOpen = true;
  $$('[data-close]', m).forEach(b => b.onclick = closeModal);
  m.onclick = (e) => { if (closable && e.target === m) closeModal(); };
}
function closeModal() { const m = $('#modal'); m.classList.remove('on'); m.innerHTML = ''; modalOpen = false; }
function alertBox(title, html) { modal(`<header><h3>${esc(title)}</h3></header><div class="db">${html}</div><div class="opts"><button class="btn gold" data-close>確定</button></div>`); }
function confirmBox(title, text, fn) {
  modal(`<header><h3>${esc(title)}</h3></header><div class="db">${esc(text)}</div><div class="opts"><button class="btn gold" id="cf-ok">確定</button><button class="btn" data-close>取消</button></div>`);
  $('#cf-ok').onclick = () => { closeModal(); fn(); };
}
function promptBox(title, label, def, fn) {
  modal(`<header><h3>${esc(title)}</h3></header><div class="db"><div class="field"><label>${esc(label)}</label><input id="pb-in" value="${esc(def)}" maxlength="16"></div></div><div class="opts"><button class="btn gold" id="pb-ok">確定</button><button class="btn" data-close>取消</button></div>`);
  $('#pb-ok').onclick = () => { const v = $('#pb-in').value.trim(); closeModal(); if (v) fn(v); };
}

// ================================================================ 遊戲選單、存檔
function openGameMenu() {
  const mp = G && (G.net || G.isClient);
  const players = G && G.players ? G.players : [];
  modal(`<header><h3>選單</h3><small>${S ? fmtDate(S.day) : ''}</small></header><div class="db">
    ${mp ? `<div class="field"><label>多人連線${G.net && G.net.code ? `・房間代碼 <span class="code" style="font-size:18px">${esc(G.net.code)}</span>` : ''}</label><div class="plist" id="plist-live">${players.map(p => `<div>${p.tag ? sw(p.tag) + nameOf(p.tag) : '（觀戰／選擇中）'}<span style="flex:1"></span>${esc(p.name)}</div>`).join('') || '<div class="hint">目前沒有其他玩家</div>'}</div></div>` : ''}
    <label class="toggle"><input type="checkbox" id="opt-evpause" ${LS.get('cof_evpause', true) ? 'checked' : ''}>收到事件時自動暫停（單人）</label>
  </div><div class="opts">
    <button class="btn" id="m-resume" data-close>繼續遊戲</button>
    ${!G || !G.isClient ? `<button class="btn" id="m-save">儲存遊戲</button><button class="btn" id="m-export">下載存檔檔案</button>` : ''}
    ${G && ((G.isClient && !me) || (me && S.C[me] && S.C[me].exists === false)) ? `<button class="btn" id="m-pick">選擇國家</button>` : ''}
    <button class="btn" id="m-help">遊戲說明</button>
    <button class="btn" id="m-tut">重新觀看教學</button>
    <button class="btn red" id="m-quit">回主選單</button></div>`);
  $('#opt-evpause').onchange = (e) => { LS.set('cof_evpause', e.target.checked); if (G) G.pauseOnEvents = e.target.checked; };
  if ($('#m-save')) $('#m-save').onclick = () => { saveGame(); };
  if ($('#m-export')) $('#m-export').onclick = () => { const blob = new Blob([serialize(S)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `烽火世紀_${cname(S, me)}_${dayToDate(S.day).y}.json`; a.click(); };
  if ($('#m-pick')) $('#m-pick').onclick = () => chooseNationDialog();
  $('#m-help').onclick = () => openHelp();
  $('#m-tut').onclick = () => { closeModal(); startTutorial(); };
  $('#m-quit').onclick = () => confirmBox('回主選單？', mp ? '你將離開多人遊戲。' : '未儲存的進度將會遺失。', () => leaveToMenu());
}
function saveGame() {
  const saves = LS.get('cof_saves', []);
  const entry = { name: `${cname(S, me)} ${fmtDate(S.day)}`, tag: me, time: Date.now(), data: serialize(S) };
  saves.unshift(entry);
  while (saves.length > 5) saves.pop();
  if (LS.set('cof_saves', saves)) toast('遊戲已儲存');
  else { saves.splice(1); if (LS.set('cof_saves', saves)) toast('遊戲已儲存（已清除舊存檔）'); else toast('儲存失敗：瀏覽器空間不足，請改用下載存檔', 'warn'); }
  closeModal();
}
function openLoadDialog() {
  const saves = LS.get('cof_saves', []);
  modal(`<header><h3>讀取存檔</h3></header><div class="db">${saves.length ? saves.map((s, i) => `<div class="line"><div class="nm"><b>${esc(s.name)}</b><br><small style="color:var(--dim)">${new Date(s.time).toLocaleString()}</small></div><button class="btn small gold" data-load="${i}">讀取</button><button class="btn tiny" data-del="${i}">刪除</button></div>`).join('') : '<div class="hint">沒有瀏覽器存檔。</div>'}
    <div class="field"><label>或從檔案讀取</label><input type="file" id="load-file" accept=".json,application/json"></div></div>
    <div class="opts"><button class="btn" data-close>關閉</button></div>`);
  $$('[data-load]').forEach(b => b.onclick = () => { const s = saves[Number(b.dataset.load)]; closeModal(); loadFrom(s.data, s.tag); });
  $$('[data-del]').forEach(b => b.onclick = () => { saves.splice(Number(b.dataset.del), 1); LS.set('cof_saves', saves); openLoadDialog(); });
  $('#load-file').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(txt => { closeModal(); const st = JSON.parse(txt); const tag = Object.keys(st.C).find(t => st.C[t].pid === 'local') || Object.keys(st.C).find(t => !st.C[t].ai); loadFrom(st, tag); }).catch(err => alertBox('讀取失敗', esc(err.message)));
  };
}
function loadFrom(data, tag) {
  try {
    const st = typeof data === 'string' ? JSON.parse(data) : data;
    if (!tag || !st.C[tag]) tag = Object.keys(st.C).find(t => st.C[t].exists && !st.C[t].ai) || 'GER';
    for (const t in st.C) if (t !== tag) { st.C[t].ai = true; st.C[t].pid = null; }
    if (G) G.stop();
    beginGame(new LocalGame(st, tag), tag);
    toast('存檔已讀取');
  } catch (err) { alertBox('讀取失敗', esc(err.message)); }
}
function chooseNationDialog() {
  const tags = liveTags(S).filter(t => S.C[t].ai).sort((a, b) => (S.C[b].ic || 0) - (S.C[a].ic || 0)).slice(0, 40);
  modal(`<header><h3>選擇國家</h3><small>選擇一個由 AI 控制的國家來指揮</small></header><div class="db"><div class="clist">${tags.map(t => `<div class="crow" data-choose="${t}">${sw(t)}<div class="nm"><b>${nameOf(t)}</b> <small>工業 ${Math.round(S.C[t].ic || 0)}</small></div></div>`).join('')}</div></div><div class="opts"><button class="btn" data-close>稍後再選</button></div>`);
  $$('[data-choose]').forEach(b => b.onclick = async () => {
    const t = b.dataset.choose;
    if (G.isClient) { const r = await G.pick(t); if (r.ok) closeModal(); else toast(r.msg || '無法選擇', 'warn'); return; }
    G.switchTo(t); me = t; map.me = t; deadShown = false; hudBuilt = null; closeModal(); map.centerOnNode(S.C[t].cap, 1.3); onUpdate(true); toast(`你現在指揮：${cname(S, t)}`);
  });
}

// 聊天
function chatLine(text) { const log = $('#chat .log'); const d = document.createElement('div'); d.textContent = text; log.appendChild(d); while (log.children.length > 60) log.firstChild.remove(); log.scrollTop = 1e9; }
$('#chat input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.value.trim() && G) { G.chat(e.target.value.trim()); e.target.value = ''; } });

// ================================================================ 說明與教學
function openHelp() {
  modal(`<header><h3>遊戲說明</h3><small>烽火世紀 1936–1991</small></header><div class="db help">
    <p>你將領導一個國家，從二戰前夕一路走到冷戰結束（1991 年 12 月 26 日蘇聯解體）。發展工業、研究科技、建立軍隊，透過外交與戰爭讓你的國家成為世界強權。</p>
    <h4>⏱ 時間</h4><p>遊戲是即時進行（可暫停）。按 <kbd>空白鍵</kbd> 暫停/繼續，<kbd>1</kbd>–<kbd>5</kbd> 調整速度。暫停時仍可下達所有指令。</p>
    <h4>🎖️ 指揮部隊</h4><ul><li>點擊地圖上的部隊標誌（彩色方塊，數字為師數）即可選取；<kbd>Shift</kbd>+點擊可加選，<kbd>Shift</kbd>+拖曳可框選。</li><li><b>右鍵點擊</b>目標地區即可移動；若目標屬於敵國，部隊會自動發動進攻。手機上可用「移動/進攻」按鈕或長按地圖。</li><li>方塊下方的條是<b>組織度</b>（綠＞黃＞紅）。組織度歸零的守軍會撤退；若無路可退會被<b>包圍殲滅</b>。</li><li>地形、要塞、補給、制空權與科技都會影響戰鬥。斷絕補給的部隊戰力大減並持續損耗。</li><li>部隊可以經由海路運輸；若進攻敵方沿海地區即為<b>兩棲登陸</b>（陸戰隊懲罰較小）。敵方佔有制海權的海域非常危險。</li></ul>
    <h4>🏭 生產</h4><p>工業（工廠）提供每日產能，扣除部隊維持費後平均分配給各生產線。部隊完成後會出現在首都或你設定的部署地點。和平時期多蓋工廠，戰時全力造兵！</p>
    <h4>🔬 研究與 🏛️ 國策</h4><p>研究提升兵種戰力與工業效率；超前時代的科技會比較慢。國策是長期目標，完成後獲得永久加成。法律決定動員程度：民主國家需要世界緊張度升高才能備戰。</p>
    <h4>🤝 外交</h4><ul><li>宣戰需要政治點數；對方的陣營盟友與保證國可能參戰。</li><li>一國被佔領的勝利點超過門檻就會<b>投降</b>：被佔領的領土割讓給佔領者。盟軍解放被佔領國時，該國會復國。</li><li>可以提出白和平或停火；可以設定對方投降後扶植傀儡政權。</li></ul>
    <h4>📜 歷史</h4><p>重大歷史事件（德奧合併、珍珠港、韓戰、古巴飛彈危機……）會在史實日期發生。AI 照歷史抉擇；若事件由你決定，你可以改寫歷史。殖民地會在史實年份獨立。</p>
    <h4>🤖 新手建議</h4><p>在「政治」分頁開啟 AI 輔助：自動國策、自動研究、自動生產、AI 指揮全軍。你可以只專注在你感興趣的部分！</p>
    <h4>👥 多人連線</h4><p>主機建立房間並分享代碼，朋友輸入代碼加入、各自選擇國家。可用專案附帶的 Node.js 伺服器（最穩定），或免伺服器的 P2P 模式。主機負責控制速度；任何人都可暫停。</p>
    <h4>⌨ 快捷鍵</h4><p><kbd>Q</kbd> 政治 <kbd>W</kbd> 研究 <kbd>E</kbd> 生產 <kbd>R</kbd> 外交 <kbd>T</kbd> 軍隊 <kbd>Esc</kbd> 取消選取</p>
  </div><div class="opts"><button class="btn gold" data-close>了解</button></div>`);
}
const TUT = [
  { t: '歡迎，指揮官！', x: '這是一場從 1936 年到 1991 年的大戰略遊戲。接下來用一分鐘介紹基本操作。（遊戲目前已暫停）', el: null },
  { t: '時間控制', x: '遊戲是即時進行的。按這裡的 ▶ 開始，或用空白鍵暫停/繼續、數字鍵 1–5 調整速度。', el: '.speeds' },
  { t: '你的國家', x: '上方顯示工業產能、人力、政治點數。戰爭時還會顯示投降進度——被佔領太多就會投降！', el: '#hud .flag' },
  { t: '地圖操作', x: '拖曳移動地圖、滾輪縮放。點擊地區查看資訊，切換右下角的地圖模式可以看陣營、地形與工業。', el: '#mapmodes' },
  { t: '指揮部隊', x: '點擊彩色的部隊方塊選取部隊，然後在目標地區按「右鍵」移動；目標是敵國就會進攻。集中兵力、包圍敵軍是取勝關鍵！', el: null },
  { t: '政治與 AI 輔助', x: '在「政治」分頁選擇國策、調整法律。新手可以開啟「AI 輔助」，讓 AI 幫你處理研究、生產甚至指揮軍隊。', el: '#tabs [data-tab="politics"]' },
  { t: '研究與生產', x: '「研究」提升部隊與工業，「生產」建造部隊與工廠。分頁上的紅點代表有需要你注意的事。', el: '#tabs [data-tab="production"]' },
  { t: '外交', x: '在「外交」分頁可以宣戰、求和、保證他國獨立、加入陣營與提供軍援。歷史事件也會讓各國按史實參戰。', el: '#tabs [data-tab="diplomacy"]' },
  { t: '準備好了！', x: '按 ▶ 開始時間流動。祝你好運——歷史掌握在你手中！', el: null },
];
function startTutorial() {
  let i = 0;
  let box = $('#tut'); if (box) box.remove();
  box = document.createElement('div'); box.id = 'tut'; document.body.appendChild(box);
  const step = () => {
    $$('.tut-hl').forEach(e => e.classList.remove('tut-hl'));
    if (i >= TUT.length) { box.remove(); LS.set('cof_tut_done', true); return; }
    const s = TUT[i];
    box.innerHTML = `<h4>${esc(s.t)}</h4><div>${esc(s.x)}</div><div class="nav"><button class="btn small" id="tut-skip">略過教學</button><small style="color:var(--dim)">${i + 1}/${TUT.length}</small><button class="btn small gold" id="tut-next">${i === TUT.length - 1 ? '開始' : '下一步'}</button></div>`;
    const el = s.el && $(s.el);
    if (el) {
      el.classList.add('tut-hl');
      const r = el.getBoundingClientRect();
      let top = r.bottom + 12, left = Math.max(12, Math.min(window.innerWidth - 372, r.left));
      if (top > window.innerHeight - 220) top = Math.max(12, r.top - 220);
      box.style.top = top + 'px'; box.style.left = left + 'px'; box.style.transform = 'none';
    } else { box.style.top = '50%'; box.style.left = '50%'; box.style.transform = 'translate(-50%,-50%)'; }
    $('#tut-next').onclick = () => { i++; step(); };
    $('#tut-skip').onclick = () => { i = TUT.length; step(); };
  };
  step();
}

window.addEventListener('beforeunload', (e) => { if (G && (G.net || (S && S.day > (S.startDay || 0) + 30))) { e.preventDefault(); e.returnValue = ''; } });
// 開發用
window.__cof = { get G() { return G; }, get S() { return S; }, get me() { return me; }, map };
