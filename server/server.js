// 烽火世紀：靜態網站 + WebSocket 中繼伺服器
// 用法：npm install && npm start  →  瀏覽器開啟 http://localhost:3000
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/index.html';
    const file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('找不到檔案'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      fs.createReadStream(file).pipe(res);
    });
  } catch { res.writeHead(400); res.end(); }
});

// ---------------- 房間中繼
const rooms = new Map(); // code → { host, clients: Map(id → ws) }
let nextId = 1;
function code() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s; do { s = ''; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; } while (rooms.has(s)); return s; }
const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };

const wss = new WebSocketServer({ server, path: '/ws', perMessageDeflate: { threshold: 1024 }, maxPayload: 8 * 1024 * 1024 });
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => {
    let m; try { m = JSON.parse(data); } catch { return; }
    if (m.t === 'host') {
      const c = code();
      rooms.set(c, { host: ws, clients: new Map() });
      ws.room = c; ws.role = 'host';
      send(ws, { t: 'room', code: c });
      console.log(`房間 ${c} 已建立`);
    } else if (m.t === 'join') {
      const room = rooms.get(String(m.code || '').toUpperCase());
      if (!room) { send(ws, { t: 'error', msg: '找不到房間，請確認代碼' }); return; }
      if (room.clients.size >= 15) { send(ws, { t: 'error', msg: '房間已滿' }); return; }
      const id = 'p' + nextId++;
      ws.room = String(m.code).toUpperCase(); ws.role = 'client'; ws.pid = id;
      room.clients.set(id, ws);
      send(ws, { t: 'joined', id });
      send(room.host, { t: 'peer', id, name: String(m.name || '玩家').slice(0, 16) });
    } else if (m.t === 'msg' && ws.role === 'client') {
      const room = rooms.get(ws.room); if (room) send(room.host, { t: 'from', id: ws.pid, m: m.m });
    } else if (m.t === 'to' && ws.role === 'host') {
      const room = rooms.get(ws.room); const c = room && room.clients.get(m.id); if (c) send(c, { t: 'msg', m: m.m });
    } else if (m.t === 'all' && ws.role === 'host') {
      const room = rooms.get(ws.room); if (!room) return;
      const s = JSON.stringify({ t: 'msg', m: m.m });
      for (const c of room.clients.values()) if (c.readyState === 1) c.send(s);
    }
  });
  ws.on('close', () => {
    const room = rooms.get(ws.room); if (!room) return;
    if (ws.role === 'host') {
      for (const c of room.clients.values()) { send(c, { t: 'closed' }); c.close(); }
      rooms.delete(ws.room);
      console.log(`房間 ${ws.room} 已關閉`);
    } else {
      room.clients.delete(ws.pid);
      send(room.host, { t: 'leave', id: ws.pid });
    }
  });
});
setInterval(() => { for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); } }, 30000);

server.listen(PORT, () => {
  console.log(`烽火世紀伺服器已啟動：http://localhost:${PORT}`);
  console.log('同一網路的朋友可用你的區域網路 IP 連線，例如 http://192.168.x.x:' + PORT);
});
