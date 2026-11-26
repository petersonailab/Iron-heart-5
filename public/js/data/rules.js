// 遊戲規則常數：兵種、地形、法律、科技、國策

export const UNITS = {
  // ---- 陸軍
  inf: { name: '步兵師', short: '步', domain: 'land', cls: 'inf', att: 10, def: 18, org: 60, speed: 30, cost: 450, up: 0.33, man: 12, desc: '便宜耐打，防守主力。' },
  mar: { name: '陸戰隊', short: '陸', domain: 'land', cls: 'inf', att: 11, def: 16, org: 60, speed: 30, cost: 600, up: 0.38, man: 10, amph: true, desc: '登陸作戰專家，兩棲攻擊懲罰大幅降低。' },
  mec: { name: '機械化步兵師', short: '機', domain: 'land', cls: 'mech', att: 17, def: 21, org: 55, speed: 48, cost: 800, up: 0.42, man: 12, armor: true, desc: '搭乘裝甲車的步兵，攻守兼備、行動迅速。' },
  ltk: { name: '輕型坦克師', short: '輕', domain: 'land', cls: 'tank', att: 18, def: 11, org: 45, speed: 56, cost: 700, up: 0.4, man: 9, armor: true, desc: '便宜快速的早期裝甲部隊，適合追擊與包圍。' },
  arm: { name: '中型坦克師', short: '中', domain: 'land', cls: 'tank', att: 28, def: 14, org: 45, speed: 50, cost: 1100, up: 0.5, man: 10, armor: true, desc: '二戰裝甲部隊的主力，平原與沙漠中最強，山地森林受限。' },
  htk: { name: '重型坦克師', short: '重', domain: 'land', cls: 'tank', att: 36, def: 22, org: 40, speed: 38, cost: 1600, up: 0.65, man: 10, armor: true, desc: '厚重裝甲與大口徑火砲，突破堅固防線的利器，但速度較慢。' },
  mbt: { name: '主力戰車師', short: '主', domain: 'land', cls: 'tank', att: 40, def: 24, org: 50, speed: 54, cost: 1700, up: 0.7, man: 10, armor: true, desc: '戰後兼具火力、防護與機動的主力戰車。' },
  // ---- 空軍
  ftr: { name: '戰鬥機聯隊', short: '戰', domain: 'air', cls: 'ftr', air: 10, cost: 500, up: 0.32, man: 2, range: 650, desc: '爭奪制空權，制空優勢可提升地面部隊戰力。' },
  jet: { name: '噴射戰鬥機聯隊', short: '噴', domain: 'air', cls: 'ftr', air: 19, bomb: 2, cost: 850, up: 0.45, man: 2, range: 700, desc: '速度與火力遠勝螺旋槳戰機，後期型號也能對地攻擊。' },
  cas: { name: '近接支援機聯隊', short: '攻', domain: 'air', cls: 'bmb', air: 3, bomb: 14, cost: 550, up: 0.34, man: 2, range: 450, desc: '俯衝轟炸與對地攻擊，大幅支援地面戰鬥，但航程短。' },
  bmb: { name: '戰術轟炸機聯隊', short: '轟', domain: 'air', cls: 'bmb', air: 3, bomb: 9, strat: 7, cost: 700, up: 0.42, man: 3, range: 900, desc: '支援地面戰鬥；範圍內沒有戰鬥時會轟炸敵方工業。' },
  str: { name: '戰略轟炸機聯隊', short: '略', domain: 'air', cls: 'bmb', air: 4, bomb: 3, strat: 18, cost: 1200, up: 0.6, man: 4, range: 1700, desc: '長程重型轟炸機，專門摧毀敵國工業，也能投擲核彈。' },
  nvb: { name: '海軍轟炸機聯隊', short: '雷', domain: 'air', cls: 'bmb', air: 3, bomb: 3, naval: 14, cost: 600, up: 0.36, man: 2, range: 800, desc: '以魚雷與炸彈攻擊航程內的敵方艦隊。' },
  hel: { name: '武裝直升機營', short: '直', domain: 'air', cls: 'bmb', air: 2, bomb: 13, cost: 650, up: 0.4, man: 2, range: 320, desc: '低空火力支援與反坦克，航程很短。' },
  // ---- 海軍
  flt: { name: '水面艦隊', short: '艦', domain: 'sea', cls: 'ship', att: 30, def: 30, cost: 2400, up: 0.8, man: 6, speed: 480, desc: '戰艦、巡洋艦與驅逐艦組成，掌握制海權以保護運兵與補給。' },
  car: { name: '航艦戰鬥群', short: '航', domain: 'sea', cls: 'ship', att: 32, def: 22, naval: 10, cost: 3000, up: 0.95, man: 7, speed: 500, desc: '艦載機可攻擊鄰近海域的敵艦，海戰中最具威力的艦種。' },
  sub: { name: '潛艇群', short: '潛', domain: 'sea', cls: 'ship', att: 14, def: 8, raid: 10, cost: 800, up: 0.3, man: 2, speed: 380, desc: '破壞敵方海上運輸，降低敵國生產。' },
};
export const LAND_TYPES = ['inf', 'mar', 'mec', 'ltk', 'arm', 'htk', 'mbt'];
export const UNIT_ORDER = ['inf', 'mar', 'mec', 'ltk', 'arm', 'htk', 'mbt', 'ftr', 'jet', 'cas', 'bmb', 'str', 'nvb', 'hel', 'flt', 'car', 'sub'];
export const BUILD = {
  factory: { name: '工廠', cost: 800, desc: '地區工業 +1（每個地區上限依人口而定；國家工業越大，成本越高）' },
  fort: { name: '要塞', cost: 500, desc: '地區要塞 +1（上限 5），大幅提升防守。' },
  nuke: { name: '核子武器', cost: 5000, desc: '需要核子科技。毀滅性武器——請謹慎使用。' },
};

export const TERRAIN = {
  P: { name: '平原', def: 1.0, arm: 1.0, move: 1.0, width: 8 },
  F: { name: '森林', def: 1.25, arm: 0.7, move: 0.75, width: 6 },
  H: { name: '丘陵', def: 1.3, arm: 0.8, move: 0.8, width: 6 },
  M: { name: '山地', def: 1.6, arm: 0.5, move: 0.6, width: 4 },
  D: { name: '沙漠', def: 1.05, arm: 1.05, move: 0.85, width: 8 },
  J: { name: '叢林', def: 1.4, arm: 0.55, move: 0.6, width: 5 },
  S: { name: '沼澤', def: 1.35, arm: 0.5, move: 0.6, width: 5 },
  U: { name: '都市', def: 1.5, arm: 0.65, move: 0.9, width: 6 },
  T: { name: '凍原', def: 1.2, arm: 0.7, move: 0.6, width: 5 },
};

// 法律：req 回傳 null 表示可用，否則回傳原因
export const LAWS = {
  con: {
    name: '徵兵法',
    levels: [
      { name: '志願役', man: 0.006, prod: 1.0, desc: '每年可動員人口 0.6%' },
      { name: '有限徵兵', man: 0.015, prod: 1.0, desc: '每年可動員人口 1.5%' },
      { name: '廣泛徵兵', man: 0.03, prod: 0.97, tension: 25, desc: '每年 3%；工業 -3%。民主國家需世界緊張度 25% 或處於戰爭' },
      { name: '全面動員', man: 0.055, prod: 0.92, war: true, desc: '每年 5.5%；工業 -8%。必須處於戰爭' },
    ],
  },
  eco: {
    name: '經濟法',
    levels: [
      { name: '民用經濟', prod: 0.6, desc: '軍工產出 60%' },
      { name: '部分動員', prod: 0.75, tension: 15, desc: '軍工產出 75%。民主國家需世界緊張度 15%' },
      { name: '戰時經濟', prod: 0.9, tension: 40, desc: '軍工產出 90%。民主國家需緊張度 40% 或處於戰爭' },
      { name: '總體戰', prod: 1.0, war: true, desc: '軍工產出 100%。必須處於戰爭' },
    ],
  },
};

export { TECHS, TECH_MAP, TECH_CATS, GROUPS, UNIT_TECH, NUKE_HIST } from './tech.js';

export { FOCUS } from './focus.js';

export const IDEOLOGY_NAMES = { dem: '民主', fas: '法西斯/軍國', com: '共產', neu: '中立/威權' };

// 難度
export const DIFFICULTY = {
  easy: { name: '簡單', player: 1.3, ai: 0.85 },
  normal: { name: '普通', player: 1.0, ai: 1.0 },
  hard: { name: '困難', player: 0.9, ai: 1.15 },
};
