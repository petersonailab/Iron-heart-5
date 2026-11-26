// 多人連線：主機權威式同步（主機執行模擬，客戶端只送指令並接收狀態快照）
// 傳輸層：WebSocket 中繼伺服器（server/server.js）或 PeerJS 點對點
import { applyCommand } from '../core/commands.js';
import { step, serialize } from '../core/game.js';

export const SPEEDS = [0, 1, 2.5, 5, 10, 25]; // 每秒天數

// ============================================================ 遊戲階段（本機 / 主機 / 客戶端）
class Emitter {
  constructor() { this.h = {}; }
  on(ev, fn) { (this.h[ev] || (this.h[ev] = [])).push(fn); return () => { this.h[ev] = this.h[ev].filter(f => f !== fn); }; }
  emit(ev, ...a) { for (const f of this.h[ev] || []) { try { f(...a); } catch (e) { console.error(e); } } }
}

export class LocalGame extends Emitter {
  constructor(S, me, opts = {}) {
    super();
    this.S = S; this.me = me;
    this.speed = 2; this.paused = true;
    this.isHost = !!opts.net; this.isClient = false;
    this.net = opts.net || null;
    this.players = opts.players || []; // [{id, name, tag}]
    this.acc = 0; this.last = performance.now();
    this.running = true;
    this.encoder = this.net ? new SnapshotEncoder() : null;
    this.lastSend = 0;
    if (me && S.C[me]) { S.C[me].ai = false; S.C[me].pid = 'local'; }
    for (const p of this.players) if (p.tag && S.C[p.tag]) { S.C[p.tag].ai = false; S.C[p.tag].pid = p.id; }
    // 玩家國家的預設生產線，避免產能閒置
    for (const t in S.C) {
      const C = S.C[t];
      if (C.ai || !C.exists || C.prod.length) continue;
      C.prod = [{ type: 'factory', n: 2, prog: 0, tgt: -1 }, { type: 'inf', n: -1, prog: 0, tgt: -1 }];
    }
    this.raf = requestAnimationFrame(t => this.frame(t));
    if (this.net) this.bindNet();
  }
  frame(t) {
    if (!this.running) return;
    const dt = Math.min(0.25, (t - this.last) / 1000); this.last = t;
    if (!this.paused && !this.S.over) {
      this.acc += dt * SPEEDS[this.speed];
      let n = 0;
      const t0 = performance.now();
      while (this.acc >= 1 && n < 30 && performance.now() - t0 < 40) { step(this.S, 1); this.acc -= 1; n++; }
      if (this.acc > 3) this.acc = 3;
      if (n) {
        this.emit('tick', n);
        if (this.autoPause()) { this.paused = true; this.emit('pause'); }
      }
    }
    if (this.net && t - this.lastSend > 250) { this.lastSend = t; this.broadcast(); }
    this.raf = requestAnimationFrame(tt => this.frame(tt));
  }
  autoPause() {
    // 單人模式下，玩家收到事件時自動暫停
    if (this.net) return false;
    const p = this.S.pending[this.me];
    if (p && p.length && this.pauseOnEvents !== false) { const k = p.map(x => x.uid).join(','); if (k !== this.lastPendingKey) { this.lastPendingKey = k; return true; } }
    if (this.S.over && !this.overShown) { this.overShown = true; return true; }
    return false;
  }
  switchTo(tag) {
    const S = this.S;
    if (this.me && S.C[this.me]) { S.C[this.me].ai = true; S.C[this.me].pid = null; }
    this.me = tag; S.C[tag].ai = false; S.C[tag].pid = 'local';
    if (this.net) { this.sendPlayers(); this.broadcastNotice(`主機改為指揮${S.C[tag].name}`); }
  }
  command(cmd) {
    const res = applyCommand(this.S, this.me, cmd);
    this.emit('update');
    return Promise.resolve(res);
  }
  setSpeed(s) { this.speed = s; if (this.paused) this.paused = false; this.emit('speed'); }
  togglePause(byName) { this.paused = !this.paused; this.emit('speed'); if (this.net) this.broadcastNotice(`${byName || '主機'}${this.paused ? '暫停' : '繼續'}了遊戲`); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); if (this.net) this.net.close(); }

  // ---------------- 主機
  bindNet() {
    const net = this.net;
    net.onMessage = (id, m) => this.onClientMsg(id, m);
    net.onLeave = (id) => {
      const p = this.players.find(x => x.id === id);
      if (p) {
        if (p.tag && this.S.C[p.tag]) { this.S.C[p.tag].ai = true; this.S.C[p.tag].pid = null; }
        this.players = this.players.filter(x => x !== p);
        this.emit('players'); this.broadcastNotice(`${p.name} 離開了遊戲，${p.tag ? 'AI 接管其國家' : ''}`);
        this.sendPlayers();
      }
    };
    net.onPeer = (id, name) => {
      // 遊戲進行中加入：先送完整狀態
      this.players.push({ id, name, tag: null });
      this.emit('players');
      this.broadcast();
      net.send(id, { t: 'start', s: serialize(this.S), me: null, players: this.players });
      this.sendPlayers();
    };
  }
  sendPlayers() { this.net.broadcast({ t: 'players', players: this.players.map(p => ({ id: p.id, name: p.name, tag: p.tag })), host: this.me }); }
  onClientMsg(id, m) {
    const p = this.players.find(x => x.id === id);
    if (!p) return;
    if (m.t === 'cmd') {
      if (!p.tag) { this.net.send(id, { t: 'res', rid: m.rid, r: { ok: false, msg: '尚未選擇國家' } }); return; }
      const r = applyCommand(this.S, p.tag, m.cmd);
      this.net.send(id, { t: 'res', rid: m.rid, r });
      this.emit('update');
    } else if (m.t === 'pause') {
      this.paused = !!m.v; this.emit('speed'); this.broadcastNotice(`${p.name}${this.paused ? '暫停' : '繼續'}了遊戲`);
    } else if (m.t === 'chat') {
      const msg = { t: 'chat', from: p.name, text: String(m.text || '').slice(0, 200) };
      this.net.broadcast(msg); this.emit('chat', msg);
    } else if (m.t === 'pick') {
      const tag = m.tag;
      const C = this.S.C[tag];
      if (!C || !C.exists || (!C.ai && C.pid !== p.id) || tag === this.me) { this.net.send(id, { t: 'res', rid: m.rid, r: { ok: false, msg: '該國已有玩家' } }); return; }
      if (p.tag && this.S.C[p.tag]) { this.S.C[p.tag].ai = true; this.S.C[p.tag].pid = null; }
      p.tag = tag; C.ai = false; C.pid = p.id;
      this.net.send(id, { t: 'you', tag });
      this.net.send(id, { t: 'res', rid: m.rid, r: { ok: true } });
      this.sendPlayers(); this.emit('players');
      this.broadcastNotice(`${p.name} 開始指揮${C.name}`);
    }
  }
  chat(text) { const msg = { t: 'chat', from: this.myName || '主機', text }; if (this.net) this.net.broadcast(msg); this.emit('chat', msg); }
  broadcastNotice(text) { if (this.net) this.net.broadcast({ t: 'notice', text }); this.emit('notice', text); }
  broadcast() {
    if (!this.net || !this.players.length) return;
    const shared = this.encoder.encode(this.S, this);
    if (!shared) return;
    for (const p of this.players) {
      const priv = p.tag ? privatePart(this.S, p.tag) : null;
      this.net.send(p.id, { t: 'snap', s: shared, p: priv });
    }
  }
}

// ---------------- 客戶端
export class RemoteGame extends Emitter {
  constructor(net, S, me) {
    super();
    this.net = net; this.S = S; this.me = me;
    this.isHost = false; this.isClient = true;
    this.speed = 2; this.paused = true; this.players = [];
    this.rid = 1; this.wait = new Map();
    this.unitMap = new Map(S.units.map(u => [u.id, u]));
    net.onMessage = (m) => this.onMsg(m);
    net.onClose = () => this.emit('closed');
  }
  onMsg(m) {
    if (m.t === 'snap') { applySnapshot(this, m.s, m.p); this.emit('tick', 1); }
    else if (m.t === 'res') { const f = this.wait.get(m.rid); if (f) { this.wait.delete(m.rid); f(m.r); } }
    else if (m.t === 'you') { this.me = m.tag; this.emit('you', m.tag); }
    else if (m.t === 'players') { this.players = m.players; this.hostTag = m.host; this.emit('players'); }
    else if (m.t === 'chat') this.emit('chat', m);
    else if (m.t === 'notice') this.emit('notice', m.text);
    else if (m.t === 'start') { this.S = JSON.parse(m.s); this.unitMap = new Map(this.S.units.map(u => [u.id, u])); this.emit('reset'); }
  }
  request(m) { return new Promise(res => { const rid = this.rid++; this.wait.set(rid, res); m.rid = rid; this.net.send(m); setTimeout(() => { if (this.wait.has(rid)) { this.wait.delete(rid); res({ ok: false, msg: '連線逾時' }); } }, 8000); }); }
  command(cmd) { return this.request({ t: 'cmd', cmd }); }
  pick(tag) { return this.request({ t: 'pick', tag }); }
  setSpeed() { /* 只有主機能調整速度 */ }
  togglePause() { this.net.send({ t: 'pause', v: !this.paused }); }
  chat(text) { this.net.send({ t: 'chat', text }); }
  stop() { this.net.close(); }
}

// ============================================================ 快照編碼
const REGION_KEYS = ['own', 'ctrl', 'core', 'ind', 'fort'];
const PUBLIC_KEYS = ['exists', 'name', 'color', 'ideo', 'fac', 'cap', 'subj', 'guar'];
function unitKey(u) { return `${u.c}|${u.t}|${u.n}|${Math.round(u.hp)}|${Math.round(u.org / 4)}|${u.path.length ? u.path[0] : -1}|${Math.round(u.prog / 15)}|${u.sup}|${u.path.length}|${u.auto ? 1 : 0}`; }
class SnapshotEncoder {
  constructor() { this.base = null; }
  encode(S, game) {
    const b = this.base;
    const out = { d: S.day, sp: game.speed, pa: game.paused ? 1 : 0, te: Math.round(S.tension * 10) / 10 };
    if (S.over) out.over = S.over;
    const nb = { regions: {}, units: new Map(), countries: {}, wars: '', fac: '', lend: '', news: 0 };
    // 地區
    for (const k of REGION_KEYS) {
      const arr = S[k]; const prev = b && b.regions[k];
      const ch = [];
      for (let i = 0; i < arr.length; i++) if (!prev || prev[i] !== arr[i]) ch.push(i, arr[i]);
      if (ch.length) out['r_' + k] = ch;
      nb.regions[k] = arr.slice();
    }
    // 部隊
    const uc = [], seen = new Set();
    for (const u of S.units) {
      if (u.dead) continue;
      seen.add(u.id);
      const k = unitKey(u);
      nb.units.set(u.id, k);
      if (!b || b.units.get(u.id) !== k) uc.push([u.id, u.c, u.t, u.n, Math.round(u.hp * 10) / 10, Math.round(u.org * 10) / 10, u.path.slice(0, 12), Math.round(u.prog), u.sup, u.auto ? 1 : 0]);
    }
    if (uc.length) out.u = uc;
    if (b) { const del = []; for (const id of b.units.keys()) if (!seen.has(id)) del.push(id); if (del.length) out.ud = del; }
    // 國家（公開資訊）
    const cc = {};
    for (const t in S.C) {
      const C = S.C[t];
      const pub = { exists: C.exists, name: C.name, color: C.color, ideo: C.ideo, fac: C.fac, cap: C.cap, subj: C.subj, guar: C.guar, ic: Math.round(C.ic || 0), sur: Math.round((C.surrender || 0) * 100) / 100, nk: C.nukes || 0, ai: C.ai ? 1 : 0 };
      const js = JSON.stringify(pub);
      nb.countries[t] = js;
      if (!b || b.countries[t] !== js) cc[t] = pub;
    }
    if (Object.keys(cc).length) out.c = cc;
    for (const [key, val] of [['wars', S.wars], ['fac', S.fac], ['lend', S.lend]]) {
      const js = JSON.stringify(val); nb[key] = js;
      if (!b || b[key] !== js) out[key] = val;
    }
    out.bt = S.battles.map(x => ({ r: x.r, from: x.from, ac: x.ac, dc: x.dc, prog: Math.round(x.prog * 100) / 100, na: x.na, nd: x.nd, ratio: x.ratio, amph: x.amph }));
    out.nbt = S.navBattles || [];
    const lastNews = b ? b.news : 0;
    const news = S.news.filter(n => n.id > lastNews);
    if (news.length) out.n = news;
    nb.news = S.newsSeq;
    this.base = nb;
    return out;
  }
}
function privatePart(S, tag) {
  const C = S.C[tag]; if (!C) return null;
  const keep = ['pp', 'ppd', 'man', 'laws', 'tech', 'res', 'rsp', 'nukeSpeed', 'prod', 'focus', 'mods', 'nap', 'autoArmy', 'autoProd', 'autoDeploy', 'autoResearch', 'autoFocus', 'deploy', 'ic', 'icNet', 'upkeep', 'indTotal', 'convoyLoss', 'stats', 'surrender', 'vpOwned', 'vpHeld', 'lastFac', 'nukes'];
  const o = {};
  for (const k of keep) if (C[k] !== undefined) o[k] = C[k];
  o.pending = S.pending[tag] || [];
  o.puppet = Object.keys(S.puppet).filter(k => k.startsWith(tag + '>'));
  return o;
}
function applySnapshot(G, s, p) {
  const S = G.S;
  S.day = s.d; S.tension = s.te; G.speed = s.sp; G.paused = !!s.pa;
  if (s.over) S.over = s.over;
  for (const k of REGION_KEYS) { const ch = s['r_' + k]; if (ch) for (let i = 0; i < ch.length; i += 2) S[k][ch[i]] = ch[i + 1]; }
  if (s.u) for (const a of s.u) {
    let u = G.unitMap.get(a[0]);
    if (!u) { u = { id: a[0] }; G.unitMap.set(a[0], u); }
    u.c = a[1]; u.t = a[2]; u.n = a[3]; u.hp = a[4]; u.org = a[5]; u.path = a[6]; u.prog = a[7]; u.sup = a[8]; u.auto = !!a[9];
  }
  if (s.ud) for (const id of s.ud) G.unitMap.delete(id);
  if (s.u || s.ud) S.units = [...G.unitMap.values()];
  if (s.c) for (const t in s.c) {
    const pub = s.c[t];
    if (!S.C[t]) S.C[t] = { tag: t, tech: {}, laws: {}, focus: { done: [] }, res: [], prod: [], mods: {}, nap: {}, stats: {} };
    Object.assign(S.C[t], pub);
    S.C[t].surrender = pub.sur; S.C[t].nukes = pub.nk; S.C[t].ai = !!pub.ai;
  }
  if (s.wars) S.wars = s.wars;
  if (s.fac) S.fac = s.fac;
  if (s.lend) S.lend = s.lend;
  if (s.wars) S.wv = (S.wv || 0) + 1;
  S.battles = s.bt || []; S.navBattles = s.nbt || [];
  if (s.n) { for (const n of s.n) S.news.push(n); if (S.news.length > 160) S.news.splice(0, S.news.length - 160); S.newsSeq = s.n[s.n.length - 1].id; }
  if (p && G.me && S.C[G.me]) {
    Object.assign(S.C[G.me], p);
    S.pending[G.me] = p.pending || [];
    for (const k of Object.keys(S.puppet)) if (k.startsWith(G.me + '>')) delete S.puppet[k];
    for (const k of p.puppet || []) S.puppet[k] = true;
  }
}

// ============================================================ 傳輸層
function makeCode() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }

// WebSocket 中繼
export function wsUrlDefault() {
  const loc = window.location;
  if (loc.protocol === 'file:') return 'ws://localhost:3000/ws';
  return (loc.protocol === 'https:' ? 'wss://' : 'ws://') + loc.host + '/ws';
}
export function hostWS(url, name) {
  return new Promise((resolve, reject) => {
    let ws;
    try { ws = new WebSocket(url); } catch (e) { reject(e); return; }
    const net = { kind: 'ws', code: null, onPeer: null, onLeave: null, onMessage: null, peers: new Map() };
    net.send = (id, m) => ws.readyState === 1 && ws.send(JSON.stringify({ t: 'to', id, m }));
    net.broadcast = (m) => ws.readyState === 1 && ws.send(JSON.stringify({ t: 'all', m }));
    net.close = () => ws.close();
    const timer = setTimeout(() => { reject(new Error('連線伺服器逾時')); ws.close(); }, 8000);
    ws.onopen = () => ws.send(JSON.stringify({ t: 'host', name }));
    ws.onerror = () => { clearTimeout(timer); reject(new Error('無法連線到伺服器 ' + url)); };
    ws.onclose = () => { if (net.onClosed) net.onClosed(); };
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.t === 'room') { clearTimeout(timer); net.code = m.code; resolve(net); }
      else if (m.t === 'peer') { net.peers.set(m.id, m.name); net.onPeer && net.onPeer(m.id, m.name); }
      else if (m.t === 'leave') { net.peers.delete(m.id); net.onLeave && net.onLeave(m.id); }
      else if (m.t === 'from') net.onMessage && net.onMessage(m.id, m.m);
    };
  });
}
export function joinWS(url, code, name) {
  return new Promise((resolve, reject) => {
    let ws;
    try { ws = new WebSocket(url); } catch (e) { reject(e); return; }
    const net = { kind: 'ws', onMessage: null, onClose: null, queue: [] };
    net.send = (m) => ws.readyState === 1 && ws.send(JSON.stringify({ t: 'msg', m }));
    net.close = () => ws.close();
    const timer = setTimeout(() => { reject(new Error('連線逾時')); ws.close(); }, 8000);
    ws.onopen = () => ws.send(JSON.stringify({ t: 'join', code: code.toUpperCase(), name }));
    ws.onerror = () => { clearTimeout(timer); reject(new Error('無法連線到伺服器')); };
    ws.onclose = () => net.onClose && net.onClose();
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.t === 'joined') { clearTimeout(timer); resolve(net); }
      else if (m.t === 'error') { clearTimeout(timer); reject(new Error(m.msg)); }
      else if (m.t === 'msg') { if (net.onMessage) net.onMessage(m.m); else net.queue.push(m.m); }
      else if (m.t === 'closed') net.onClose && net.onClose();
    };
  });
}

// PeerJS 點對點（不需要自架伺服器；使用 PeerJS 公用訊號伺服器）
async function loadPeerJS() {
  if (window.Peer) return window.Peer;
  await new Promise((res, rej) => { const s = document.createElement('script'); s.src = new URL('../../vendor/peerjs.min.js', import.meta.url).href; s.onload = res; s.onerror = () => rej(new Error('無法載入 PeerJS')); document.head.appendChild(s); });
  return window.Peer;
}
function peerOpts(server) {
  if (!server) return {};
  const m = server.match(/^(?:(https?):\/\/)?([^:/]+)(?::(\d+))?(\/.*)?$/);
  if (!m) return {};
  const secure = m[1] ? m[1] === 'https' : location.protocol === 'https:';
  return { host: m[2], port: Number(m[3] || (secure ? 443 : 80)), path: m[4] || '/', secure };
}
export async function hostP2P(name, server) {
  const Peer = await loadPeerJS();
  const code = makeCode();
  return new Promise((resolve, reject) => {
    const peer = new Peer('cof1936-' + code, peerOpts(server));
    const net = { kind: 'p2p', code, conns: new Map(), onPeer: null, onLeave: null, onMessage: null };
    net.send = (id, m) => { const c = net.conns.get(id); if (c && c.open) c.send(m); };
    net.broadcast = (m) => { for (const c of net.conns.values()) if (c.open) c.send(m); };
    net.close = () => peer.destroy();
    const timer = setTimeout(() => reject(new Error('P2P 連線逾時')), 12000);
    peer.on('open', () => { clearTimeout(timer); resolve(net); });
    peer.on('error', (e) => { clearTimeout(timer); reject(new Error('P2P 錯誤：' + (e.type || e.message))); });
    peer.on('connection', (conn) => {
      const id = conn.peer;
      conn.on('open', () => { net.conns.set(id, conn); });
      conn.on('data', (m) => {
        if (m && m.t === 'hello') { net.onPeer && net.onPeer(id, String(m.name || '玩家').slice(0, 16)); return; }
        net.onMessage && net.onMessage(id, m);
      });
      conn.on('close', () => { net.conns.delete(id); net.onLeave && net.onLeave(id); });
    });
  });
}
export async function joinP2P(code, name, server) {
  const Peer = await loadPeerJS();
  return new Promise((resolve, reject) => {
    const peer = new Peer(undefined, peerOpts(server));
    const net = { kind: 'p2p', onMessage: null, onClose: null, queue: [] };
    const timer = setTimeout(() => reject(new Error('P2P 連線逾時（房間代碼是否正確？）')), 15000);
    peer.on('error', (e) => { clearTimeout(timer); reject(new Error('P2P 錯誤：' + (e.type || e.message))); });
    peer.on('open', () => {
      const conn = peer.connect('cof1936-' + code.toUpperCase(), { reliable: true });
      net.send = (m) => conn.open && conn.send(m);
      net.close = () => peer.destroy();
      conn.on('open', () => { clearTimeout(timer); conn.send({ t: 'hello', name }); resolve(net); });
      conn.on('data', (m) => { if (net.onMessage) net.onMessage(m); else net.queue.push(m); });
      conn.on('close', () => net.onClose && net.onClose());
    });
  });
}
