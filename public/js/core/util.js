// 共用工具：日期、亂數、雜項
const DAY_MS = 86400000;
const EPOCH = Date.UTC(1936, 0, 1);

export function dateToDay(y, m, d) { return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY_MS); }
export function strToDay(s) { const [y, m, d] = s.split('-').map(Number); return dateToDay(y, m || 1, d || 1); }
export function dayToDate(day) {
  const dt = new Date(EPOCH + day * DAY_MS);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}
export function fmtDate(day) { const { y, m, d } = dayToDate(day); return `${y}年${m}月${d}日`; }
export function fmtDateShort(day) { const { y, m } = dayToDate(day); return `${y}年${m}月`; }
export function yearOf(day) { return dayToDate(day).y; }
export function yearFrac(day) { const { y } = dayToDate(day); return y + (day - dateToDay(y, 1, 1)) / 365; }

// 可序列化的亂數（mulberry32）
export function rand(S) {
  let t = (S.rng = (S.rng + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function randInt(S, n) { return Math.floor(rand(S) * n); }
export function pick(S, arr) { return arr[Math.floor(rand(S) * arr.length)]; }

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function pairKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
export function fmtNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'K';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}
export function fmtMan(k) { // 人力（千人）
  if (k >= 1000) return (k / 1000).toFixed(k >= 10000 ? 0 : 1) + ' 百萬';
  return Math.round(k) + ' 千';
}
