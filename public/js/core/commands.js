// 玩家指令：所有改變遊戲狀態的操作都經由這裡（單機與多人共用）
import { WORLD } from './world.js';
import { UNITS, LAWS, BUILD, TECH_MAP } from '../data/rules.js';
import {
  alive, atWar, friendly, allied, enemySet, declareWar, makePeace, joinFaction, leaveFaction, makeFaction,
  orderMove, canBuild, lawAllowed, canResearch, focusList, focusAvailable, addNews, cname, rname, createCountry,
  nukeStrike, isLandUnit, liveTags, regionsOf, hasFlag,
} from './engine.js';
import { pairKey, clamp } from './util.js';

const R = WORLD.R;

export function warCost(S, tag, target) {
  const C = S.C[tag];
  // 內戰雙方（同一國家的兩個政權）宣戰只需少量政治點數，互不侵犯條約也不另外加價
  if (isCivilPair(tag, target)) return 25;
  let cost = C.ideo === 'dem' ? 80 : 50;
  if (C.nap && C.nap[target] && C.nap[target] > S.day) cost += 100;
  return cost;
}
const CIVIL_PAIRS = [['CHI', 'PRC'], ['SPR', 'SPA'], ['KOR', 'PRK'], ['VIN', 'VIS']];
export function isCivilPair(a, b) { return CIVIL_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a)); }
export function canDeclare(S, tag, target) {
  const C = S.C[tag], T = S.C[target];
  if (!alive(S, target) || tag === target) return '無效目標';
  if (atWar(S, tag, target)) return '已經處於戰爭';
  if (friendly(S, tag, target)) return '不能對盟友宣戰';
  if (C.subj) return '附庸國無法自主宣戰';
  if (C.ideo === 'dem' && S.tension < 25 && !enemySet(S, target).size && T.ideo !== 'com' && T.ideo !== 'fas') return '民主國家需要世界緊張度 25% 才能宣戰';
  const cost = warCost(S, tag, target);
  if (C.pp < cost) return `政治點數不足（需要 ${cost}）`;
  return null;
}
// AI 是否接受和平
export function aiAcceptPeace(S, ai, other, kind) {
  const A = S.C[ai], B = S.C[other];
  if (!A || !B) return false;
  let occA = 0, occB = 0;
  for (let r = 0; r < R; r++) {
    const o = S.own[r], c = S.ctrl[r], vp = WORLD.nodes[r].vp + 1;
    if (o === ai && c === other) occA += vp;
    if (o === other && c === ai) occB += vp;
  }
  const losing = (A.surrender || 0) > 0.3 || occA > occB + 8;
  const warDays = S.day - (S.wars[pairKey(ai, other)] ?? S.day);
  const majors = WORLD.countries[ai].major && WORLD.countries[other].major;
  if (kind === 'status') return losing && occA > 0 && (A.surrender || 0) > 0.35;
  // 白和平
  if (occB > occA) return false; // 我方佔優勢
  if (losing && occB === 0 && occA > 0) return true;
  if (!majors && warDays > 540 && occA === 0 && occB === 0 && (B.surrender || 0) < 0.1) return true;
  return false;
}

export function applyCommand(S, tag, cmd) {
  const C = S.C[tag];
  if (!C || !C.exists) return { ok: false, msg: '國家不存在' };
  const fail = (msg) => ({ ok: false, msg });
  const okr = (msg) => ({ ok: true, msg });
  switch (cmd.type) {
    // ---------------- 軍事
    case 'move': {
      let n = 0;
      for (const id of cmd.units || []) {
        const u = S.units.find(x => x.id === id);
        if (!u || u.c !== tag || u.dead) continue;
        u.auto = false;
        if (orderMove(S, u, cmd.to)) { n++; u.manual = S.day + 60; }
      }
      return n ? okr(`已下令 ${n} 個單位移動`) : fail('無法抵達該處');
    }
    case 'stop': {
      for (const id of cmd.units || []) { const u = S.units.find(x => x.id === id); if (u && u.c === tag) { u.path = []; u.prog = 0; u.auto = false; } }
      return okr();
    }
    case 'auto': {
      for (const id of cmd.units || []) { const u = S.units.find(x => x.id === id); if (u && u.c === tag) { u.auto = !!cmd.on; if (cmd.on) u.path = []; } }
      return okr(cmd.on ? '已交由 AI 指揮' : '已收回指揮權');
    }
    case 'disband': {
      for (const id of cmd.units || []) { const u = S.units.find(x => x.id === id); if (u && u.c === tag) { u.dead = true; C.man += UNITS[u.t].man * u.hp / 100 * 0.5; } }
      S.units = S.units.filter(u => !u.dead);
      return okr('部隊已解散');
    }
    case 'gift': {
      const T = S.C[cmd.target];
      if (!alive(S, cmd.target) || !(friendly(S, tag, cmd.target) || T.ideo === C.ideo)) return fail('只能派遣志願軍給盟友或相同意識形態的國家');
      let n = 0;
      for (const id of cmd.units || []) {
        const u = S.units.find(x => x.id === id);
        if (!u || u.c !== tag || !isLandUnit(u)) continue;
        // 移至對方首都
        u.c = cmd.target; u.path = []; u.auto = false; u.n = T.cap; n++;
      }
      if (n) addNews(S, `${C.name}派遣 ${n} 個師的志願軍協助${T.name}。`, 'info', [tag, cmd.target]);
      return okr();
    }
    case 'nuke': {
      const r = cmd.region;
      if (r < 0 || r >= R) return fail('無效目標');
      if (!atWar(S, tag, S.ctrl[r])) return fail('只能攻擊交戰國');
      if (!hasFlag(C, 'icbm') && !hasFlag(C, 'slbm')) {
        // 需要轟炸機航程
        const ok = S.units.some(u => u.c === tag && (u.t === 'bmb' || u.t === 'str') && !u.dead && u.n < R && WORLD.dist[u.n * R + r] <= (u.t === 'str' ? 2600 : 1600));
        if (!ok) return fail('目標超出轟炸機航程（研發洲際彈道飛彈或彈道飛彈潛艇可無限制）');
      }
      const e = nukeStrike(S, tag, r);
      return e ? fail(e) : okr();
    }
    // ---------------- 生產
    case 'prod_add': {
      const err = canBuild(S, tag, cmd.item);
      if (err) return fail(err);
      if (C.prod.length >= 8) return fail('生產線已滿（最多 8 條）');
      C.prod.push({ type: cmd.item, n: cmd.n ?? 1, prog: 0, tgt: cmd.tgt ?? -1 });
      return okr();
    }
    case 'prod_remove': { C.prod.splice(cmd.i, 1); return okr(); }
    case 'prod_count': { const l = C.prod[cmd.i]; if (l) l.n = cmd.n; return okr(); }
    case 'prod_up': { const i = cmd.i; if (i > 0 && C.prod[i]) [C.prod[i - 1], C.prod[i]] = [C.prod[i], C.prod[i - 1]]; return okr(); }
    case 'deploy': { if (S.ctrl[cmd.region] === tag) { C.deploy = cmd.region; return okr(`新部隊將部署於${rname(S, cmd.region)}`); } return fail('必須是你控制的地區'); }
    case 'setflag': {
      if (['autoArmy', 'autoProd', 'autoDeploy', 'autoResearch', 'autoFocus'].includes(cmd.key)) C[cmd.key] = !!cmd.on;
      if (cmd.key === 'autoArmy' && !cmd.on) for (const u of S.units) if (u.c === tag) u.auto = false;
      return okr();
    }
    // ---------------- 研究 / 國策 / 法律
    case 'research': {
      const id = cmd.id || cmd.cat;
      const err = canResearch(S, tag, id);
      if (err) return fail(err);
      let slot = cmd.slot;
      if (slot === undefined || slot < 0) slot = C.res.findIndex(s => !s);
      if (slot < 0 || slot >= C.res.length) return fail('沒有空的研究欄位（可先取消進行中的研究）');
      C.res[slot] = { id, prog: 0 };
      return okr(`開始研究：${TECH_MAP[id].name}`);
    }
    case 'research_cancel': { if (C.res[cmd.slot]) C.res[cmd.slot] = null; return okr(); }
    case 'focus_cancel': { if (C.focus.cur) { C.focus.cur = null; C.focus.prog = 0; } return okr('已取消國策'); }
    case 'focus': {
      if (C.focus.cur) return fail('已有進行中的國策');
      const f = focusList(S, tag).find(x => x.id === cmd.id);
      if (!f) return fail('無此國策');
      const err = focusAvailable(S, tag, f);
      if (err) return fail(err);
      C.focus.cur = f.id; C.focus.prog = 0;
      return okr();
    }
    case 'law': {
      const L = LAWS[cmd.law]; if (!L) return fail('無此法律');
      const lvl = cmd.lvl; if (lvl === C.laws[cmd.law]) return okr();
      const err = lawAllowed(S, tag, cmd.law, lvl);
      if (err) return fail(err);
      if (C.pp < 80) return fail('政治點數不足（需要 80）');
      C.pp -= 80; C.laws[cmd.law] = lvl;
      return okr(`已頒布：${L.levels[lvl].name}`);
    }
    // ---------------- 外交
    case 'declare': {
      const err = canDeclare(S, tag, cmd.target);
      if (err) return fail(err);
      C.pp -= warCost(S, tag, cmd.target);
      if (C.nap[cmd.target] > S.day) { delete C.nap[cmd.target]; delete S.C[cmd.target].nap[tag]; S.tension = clamp(S.tension + 5, 0, 100); }
      declareWar(S, tag, cmd.target);
      if (isCivilPair(tag, cmd.target)) { S.flags['civil:' + (tag < cmd.target ? tag + '|' + cmd.target : cmd.target + '|' + tag)] = true; addNews(S, `${C.name}與${cname(S, cmd.target)}爆發內戰！`, 'war', [tag, cmd.target]); }
      return okr();
    }
    case 'peace': {
      const T = cmd.target;
      if (!atWar(S, tag, T)) return fail('並未交戰');
      const kind = cmd.kind === 'status' ? 'status' : 'white';
      const other = S.C[T];
      if (other.ai) {
        if (!aiAcceptPeace(S, T, tag, kind)) return fail(`${other.name}拒絕了和談`);
        makePeace(S, tag, T, kind);
        return okr('和約已簽訂');
      }
      // 對方是玩家：送出提案
      pushPrompt(S, T, {
        ev: 'peace_offer', title: '和平提案', from: tag,
        text: `${C.name}提議${kind === 'status' ? '停火並維持現有控制線' : '白和平（恢復戰前邊界）'}。`,
        opts: [{ t: '接受', act: 'peace', a: tag, b: T, kind }, { t: '拒絕' }],
      });
      return okr('已送出和平提案');
    }
    case 'guarantee': {
      const T = cmd.target;
      if (!alive(S, T) || T === tag) return fail('無效目標');
      if (C.guar.includes(T)) { C.guar = C.guar.filter(x => x !== T); return okr('已撤銷保證'); }
      if (C.pp < 25) return fail('政治點數不足（需要 25）');
      C.pp -= 25; C.guar.push(T);
      addNews(S, `${C.name}宣布保證${S.C[T].name}的獨立。`, 'diplo', [tag, T]);
      return okr();
    }
    case 'nap': {
      const T = cmd.target, O = S.C[T];
      if (!alive(S, T) || atWar(S, tag, T)) return fail('無法簽訂');
      if (C.pp < 25) return fail('政治點數不足（需要 25）');
      if (O.ai) {
        const ok = !friendly(S, T, tag) && (O.ic || 0) < (C.ic || 0) * 1.5;
        if (!ok) return fail(`${O.name}拒絕簽訂互不侵犯條約`);
        C.pp -= 25; C.nap[T] = S.day + 3650; O.nap[tag] = S.day + 3650;
        addNews(S, `${C.name}與${O.name}簽訂互不侵犯條約。`, 'diplo', [tag, T]);
        return okr();
      }
      C.pp -= 25;
      pushPrompt(S, T, { ev: 'nap_offer', title: '互不侵犯條約', from: tag, text: `${C.name}提議簽訂為期十年的互不侵犯條約。`, opts: [{ t: '同意', act: 'nap', a: tag, b: T }, { t: '拒絕' }] });
      return okr('已送出提案');
    }
    case 'createFac': {
      if (C.fac) return fail('你已在陣營中');
      if (!WORLD.countries[tag].major && (C.ic || 0) < 25) return fail('只有主要強權或工業 25 以上的國家能建立陣營');
      if (C.pp < 50) return fail('政治點數不足（需要 50）');
      C.pp -= 50;
      const id = 'f_' + tag + '_' + S.day;
      makeFaction(S, id, (cmd.name || '').slice(0, 16) || `${C.name}同盟`, tag);
      addNews(S, `${C.name}建立了「${S.fac[id].name}」。`, 'diplo', [tag]);
      return okr();
    }
    case 'invite': {
      const T = cmd.target, O = S.C[T];
      if (!C.fac || S.fac[C.fac].leader !== tag) return fail('只有陣營領袖能邀請');
      if (!alive(S, T) || O.fac || atWar(S, tag, T)) return fail('對方無法加入');
      if (C.pp < 25) return fail('政治點數不足（需要 25）');
      C.pp -= 25;
      if (O.ai) {
        const accept = (O.ideo === C.ideo || (O.ideo === 'neu' && C.ideo !== 'com')) && !O.subj && (S.tension > 20 || enemySet(S, T).size > 0 || O.ideo === C.ideo);
        if (!accept) return fail(`${O.name}拒絕加入`);
        joinFaction(S, T, C.fac);
        addNews(S, `${O.name}加入了${S.fac[C.fac].name}。`, 'diplo', [tag, T]);
        return okr();
      }
      pushPrompt(S, T, { ev: 'fac_invite', title: '陣營邀請', from: tag, text: `${C.name}邀請你加入「${S.fac[C.fac].name}」。`, opts: [{ t: '加入', act: 'join', fac: C.fac, who: T }, { t: '拒絕' }] });
      return okr('已送出邀請');
    }
    case 'askJoin': {
      const F = S.fac[cmd.fac]; if (!F) return fail('陣營不存在');
      if (C.fac) return fail('你已在陣營中');
      const L = S.C[F.leader];
      if (L.ai) {
        const accept = (L.ideo === C.ideo || C.ideo === 'neu') && !F.members.some(m => atWar(S, m, tag));
        if (!accept) return fail(`${L.name}拒絕了你的申請`);
        joinFaction(S, tag, F.id);
        addNews(S, `${C.name}加入了${F.name}。`, 'diplo', [tag]);
        return okr();
      }
      pushPrompt(S, F.leader, { ev: 'fac_ask', title: '加入申請', from: tag, text: `${C.name}申請加入「${F.name}」。`, opts: [{ t: '同意', act: 'join', fac: F.id, who: tag }, { t: '拒絕' }] });
      return okr('已送出申請');
    }
    case 'leaveFac': {
      if (!C.fac) return fail('不在陣營中');
      if (S.fac[C.fac].members.some(m => m !== tag && enemySet(S, tag).size && [...enemySet(S, m)].some(e => atWar(S, e, tag)))) return fail('戰爭期間不能退出陣營');
      leaveFaction(S, tag);
      return okr();
    }
    case 'lend': {
      const T = cmd.target;
      const pct = clamp(cmd.pct || 0, 0, 0.5);
      const key = tag + '>' + T;
      if (pct <= 0) { delete S.lend[key]; return okr('已停止援助'); }
      if (!alive(S, T) || atWar(S, tag, T)) return fail('無法援助');
      S.lend[key] = pct;
      addNews(S, `${C.name}開始向${S.C[T].name}提供軍事援助（${Math.round(pct * 100)}% 軍工產能）。`, 'diplo', [tag, T]);
      return okr();
    }
    case 'release': {
      const T = cmd.tag;
      if (alive(S, T)) return fail('該國已存在');
      const regs = [];
      for (let r = 0; r < R; r++) if (S.own[r] === tag && S.core[r] === T && S.ctrl[r] === tag) regs.push(r);
      if (!regs.length) return fail('你沒有該國的核心領土');
      if (regs.includes(C.cap)) return fail('不能釋放包含首都的國家');
      if (C.pp < 50) return fail('政治點數不足（需要 50）');
      C.pp -= 50;
      createCountry(S, T, regs, { ideo: C.ideo, subj: tag, from: tag });
      if (C.fac) joinFaction(S, T, C.fac);
      addNews(S, `${C.name}釋放了${S.C[T].name}作為附庸國。`, 'diplo', [tag, T]);
      return okr();
    }
    case 'puppetPref': { S.puppet[tag + '>' + cmd.target] = !!cmd.on; if (!cmd.on) delete S.puppet[tag + '>' + cmd.target]; return okr(cmd.on ? '對方投降時將扶植傀儡政權' : '對方投降時將吞併佔領地'); }
    case 'event': {
      const list = S.pending[tag] || [];
      const k = list.findIndex(p => p.uid === cmd.uid);
      if (k < 0) return fail('事件已過期');
      const p = list[k]; list.splice(k, 1);
      resolvePrompt(S, tag, p, cmd.opt);
      return okr();
    }
    default:
      return fail('未知指令 ' + cmd.type);
  }
}

// ---------------- 待決事件（玩家選擇）
export function pushPrompt(S, tag, p) {
  if (!S.pending[tag]) S.pending[tag] = [];
  p.uid = ++S.newsSeq; p.day = S.day;
  S.pending[tag].push(p);
}
export const PROMPT_HANDLERS = {};
export function resolvePrompt(S, tag, p, optIndex) {
  const o = (p.opts || [])[optIndex] || (p.opts || [])[0];
  if (!o) return;
  if (o.act === 'peace') { if (atWar(S, o.a, o.b)) makePeace(S, o.a, o.b, o.kind); return; }
  if (o.act === 'nap') { S.C[o.a].nap[o.b] = S.day + 3650; S.C[o.b].nap[o.a] = S.day + 3650; addNews(S, `${cname(S, o.a)}與${cname(S, o.b)}簽訂互不侵犯條約。`, 'diplo', [o.a, o.b]); return; }
  if (o.act === 'join') { if (S.fac[o.fac]) { joinFaction(S, o.who, o.fac); addNews(S, `${cname(S, o.who)}加入了${S.fac[o.fac].name}。`, 'diplo', [o.who]); } return; }
  if (o.act && PROMPT_HANDLERS[o.act]) { PROMPT_HANDLERS[o.act](S, tag, p, optIndex, o); return; }
}
// 過期的事件自動選第一個選項
export function expirePrompts(S) {
  for (const tag in S.pending) {
    const list = S.pending[tag];
    for (let k = list.length - 1; k >= 0; k--) {
      if (S.day - list[k].day > 30) { const p = list.splice(k, 1)[0]; resolvePrompt(S, tag, p, p.def ?? 0); }
    }
  }
}
export { liveTags, regionsOf, BUILD, TECH_MAP };
