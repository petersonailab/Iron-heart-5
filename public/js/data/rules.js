// 遊戲規則常數：兵種、地形、法律、科技、國策

export const UNITS = {
  inf: { name: '步兵師', short: '步', domain: 'land', att: 10, def: 18, org: 60, speed: 30, cost: 450, up: 0.33, man: 12, tech: 'inf', desc: '便宜耐打，防守主力。' },
  arm: { name: '裝甲師', short: '甲', domain: 'land', att: 28, def: 13, org: 45, speed: 52, cost: 1100, up: 0.5, man: 10, tech: 'arm', armor: true, desc: '突破敵線的鐵拳，平原與沙漠中最強，山地森林受限。' },
  mec: { name: '機械化師', short: '機', domain: 'land', att: 17, def: 21, org: 55, speed: 48, cost: 800, up: 0.42, man: 12, tech: 'arm', armor: true, req: { arm: 3 }, desc: '攻守兼備、行動迅速（需裝甲科技 3 級）。' },
  mar: { name: '陸戰隊', short: '陸', domain: 'land', att: 11, def: 16, org: 60, speed: 30, cost: 600, up: 0.38, man: 10, tech: 'inf', amph: true, desc: '登陸作戰專家，兩棲攻擊懲罰大幅降低。' },
  ftr: { name: '戰鬥機聯隊', short: '戰', domain: 'air', air: 10, cost: 500, up: 0.32, man: 2, range: 650, tech: 'air', desc: '爭奪制空權，制空優勢可提升地面部隊戰力。' },
  bmb: { name: '轟炸機聯隊', short: '轟', domain: 'air', air: 3, bomb: 10, cost: 700, up: 0.42, man: 3, range: 900, tech: 'air', desc: '支援地面戰鬥；範圍內沒有戰鬥時會轟炸敵方工業。' },
  flt: { name: '主力艦隊', short: '艦', domain: 'sea', att: 30, def: 30, cost: 2400, up: 0.8, man: 6, speed: 480, tech: 'nav', desc: '戰艦與航艦組成，掌握制海權以保護運兵與補給。' },
  sub: { name: '潛艇群', short: '潛', domain: 'sea', att: 14, def: 8, raid: 10, cost: 800, up: 0.3, man: 2, speed: 380, tech: 'nav', desc: '破壞敵方海上運輸，降低敵國生產。' },
};
export const LAND_TYPES = ['inf', 'arm', 'mec', 'mar'];
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

// 科技：每類別依序研究，每級 +10% 對應兵種戰力
export const TECH = {
  inf: { name: '步兵', icon: '🪖', levels: [[1936, '步兵裝備 I'], [1938, '步兵裝備 II'], [1940, '半自動步槍'], [1942, '輕機槍改良'], [1944, '突擊步槍'], [1950, '戰後步兵裝備'], [1960, '現代步兵'], [1970, '反坦克飛彈'], [1980, '夜視與防彈裝備']] },
  arm: { name: '裝甲', icon: '🛡️', levels: [[1936, '輕型坦克'], [1938, '改良輕型坦克'], [1940, '中型坦克'], [1942, '重型坦克'], [1944, '後期中型坦克'], [1950, '主力戰車 I'], [1960, '主力戰車 II'], [1970, '主力戰車 III'], [1980, '複合裝甲戰車']] },
  air: { name: '空軍', icon: '✈️', levels: [[1936, '單翼機'], [1938, '全金屬戰機'], [1940, '改良戰鬥機'], [1942, '高性能戰機'], [1944, '噴射機原型'], [1950, '噴射戰鬥機'], [1960, '超音速戰機'], [1970, '空優戰機'], [1980, '第四代戰機']] },
  nav: { name: '海軍', icon: '⚓', levels: [[1936, '條約級艦艇'], [1938, '新式戰艦'], [1940, '航空母艦'], [1942, '艦隊航艦'], [1944, '雷達火控'], [1950, '戰後艦隊'], [1960, '核動力潛艦'], [1970, '飛彈巡洋艦'], [1980, '神盾艦']] },
  ind: { name: '工業', icon: '🏭', levels: [[1936, '基礎工業'], [1938, '生產線'], [1940, '機床改良'], [1942, '大量生產'], [1944, '合成材料'], [1950, '戰後工業'], [1960, '自動化'], [1970, '電子化'], [1980, '電腦化']] },
  nuc: { name: '核子', icon: '☢️', levels: [[1945, '原子彈'], [1953, '氫彈'], [1959, '洲際彈道飛彈']], req: { ind: 5, minInd: 100 } },
};
export const TECH_ORDER = ['inf', 'arm', 'air', 'nav', 'ind', 'nuc'];

// 國策：eff 效果鍵
//  ind: 工業+N（分配到核心地區） pp: 政治點數 ppd: 每日政治點數 res: 研究欄位 rsp: 研究速度%
//  att/def: 陸軍攻/防% armorAtt: 裝甲攻擊% air: 空軍% nav: 海軍% man: 人力(千) units: {兵種:數量}
//  tech: {類別:+級} fort: 邊境要塞 nukeSpeed: 核子研究速度%  speed: 機動速度%
const G = (id, name, days, eff, req = [], opt = {}) => ({ id, name, days, eff, req, ...opt });

export const FOCUS = {
  GER: [
    G('g_4yp', '四年計畫', 70, { ind: 4 }, [], { desc: '戈林主導的自給自足經濟計畫，大舉擴張重工業。' }),
    G('g_rearm', '重整軍備', 70, { units: { inf: 4 }, att: 0.05 }, ['g_4yp'], { desc: '廢除凡爾賽條約的軍備限制。' }),
    G('g_westwall', '西牆', 50, { fortAt: ['ger_saar', 'ger_rhineland', 'ger_stuttgart'], fortLvl: 3 }, ['g_4yp'], { desc: '沿法國邊境修築齊格菲防線。' }),
    G('g_synth', '合成燃料', 70, { ind: 3 }, ['g_4yp'], { desc: '以煤炭生產合成石油與橡膠。' }),
    G('g_panzer', '裝甲兵', 70, { tech: { arm: 1 }, armorAtt: 0.1, units: { arm: 2 } }, ['g_rearm'], { desc: '古德林的裝甲部隊理論。' }),
    G('g_luft', '德國空軍', 70, { units: { ftr: 3, bmb: 2 }, air: 0.1 }, ['g_rearm'], { desc: '重建空軍。' }),
    G('g_blitz', '閃擊戰學說', 70, { speed: 0.1, att: 0.05 }, ['g_panzer'], { desc: '空地協同、快速突破的作戰概念。' }),
    G('g_planz', 'Z計畫', 70, { units: { flt: 2 }, nav: 0.1 }, ['g_rearm'], { excl: ['g_uboat'], desc: '建立能挑戰英國的大艦隊。' }),
    G('g_uboat', '潛艇戰', 70, { units: { sub: 4 }, raid: 0.25 }, ['g_rearm'], { excl: ['g_planz'], desc: '鄧尼茨的狼群戰術。' }),
    G('g_research', '科研機構', 70, { res: 1 }, [], { desc: '擴大國家研究機構。' }),
    G('g_conscript', '擴大徵兵', 50, { man: 300 }, ['g_rearm']),
    G('g_rockets', '火箭計畫', 70, { rsp: 0.1 }, ['g_research']),
  ],
  ITA: [
    G('i_ind', '工業現代化', 70, { ind: 3 }, [], { desc: '擴建北義工業區。' }),
    G('i_army', '陸軍擴編', 70, { units: { inf: 3 } }, ['i_ind']),
    G('i_navy', '地中海艦隊', 70, { units: { flt: 1 }, nav: 0.1 }, ['i_ind'], { desc: '「我們的海」——稱霸地中海。' }),
    G('i_air', '皇家空軍', 70, { units: { ftr: 2 } }, ['i_ind']),
    G('i_africa', '北非軍團', 70, { units: { inf: 2, arm: 1 } }, ['i_army']),
    G('i_research', '科研機構', 70, { res: 1 }, []),
    G('i_alpini', '山地部隊', 50, { def: 0.05 }, ['i_army']),
    G('i_ind2', '自給自足', 70, { ind: 2 }, ['i_ind']),
  ],
  JAP: [
    G('j_ind', '產業五年計畫', 70, { ind: 3 }, [], { desc: '擴大軍需工業。' }),
    G('j_navy', '八八艦隊構想', 70, { units: { flt: 2 }, nav: 0.1 }, ['j_ind'], { desc: '擴建帝國海軍。' }),
    G('j_carrier', '航空母艦優先', 70, { tech: { nav: 1 }, nav: 0.05 }, ['j_navy']),
    G('j_army', '陸軍擴編', 70, { units: { inf: 4 } }, ['j_ind']),
    G('j_zero', '零式艦上戰鬥機', 70, { tech: { air: 1 }, units: { ftr: 2 } }, ['j_ind']),
    G('j_south', '南進政策', 50, { pp: 60, mar: true, units: { mar: 2 } }, ['j_navy'], { excl: ['j_north'], desc: '向資源豐富的東南亞擴張。' }),
    G('j_north', '北進政策', 50, { pp: 60, units: { inf: 3 } }, ['j_army'], { excl: ['j_south'], desc: '準備與蘇聯一戰。' }),
    G('j_research', '科研機構', 70, { res: 1 }, []),
    G('j_man', '國家總動員法', 50, { man: 400 }, ['j_army']),
  ],
  SOV: [
    G('s_5yp2', '第二個五年計畫', 70, { ind: 4 }, [], { desc: '以重工業優先的計畫經濟。' }),
    G('s_5yp3', '第三個五年計畫', 70, { ind: 4 }, ['s_5yp2']),
    G('s_urals', '烏拉爾工業基地', 70, { ind: 3 }, ['s_5yp2'], { desc: '在烏拉爾山以東建立後方工業。' }),
    G('s_army', '紅軍改革', 70, { att: 0.05, def: 0.05 }, [], { desc: '重建軍官團、改革部隊編制。' }),
    G('s_deep', '大縱深戰役理論', 70, { armorAtt: 0.1, tech: { arm: 1 } }, ['s_army']),
    G('s_stalinline', '斯大林防線', 50, { fortAt: ['sov_minsk', 'sov_zhitomir', 'sov_vinnytsia', 'sov_pskov', 'sov_kiev'], fortLvl: 2 }, ['s_army']),
    G('s_air', '紅色空軍', 70, { units: { ftr: 3 } }, ['s_5yp2']),
    G('s_research', '科學院', 70, { res: 1 }, []),
    G('s_mobilize', '全民動員', 50, { man: 600 }, ['s_army']),
    G('s_t34', 'T-34 量產', 70, { units: { arm: 3 } }, ['s_deep']),
  ],
  ENG: [
    G('e_rearm', '重整軍備', 70, { ind: 2 }, [], { desc: '張伯倫政府開始重整軍備。' }),
    G('e_navy', '皇家海軍', 70, { units: { flt: 2 }, nav: 0.1 }, ['e_rearm']),
    G('e_radar', '本土鏈雷達網', 70, { tech: { air: 1 }, air: 0.1 }, ['e_rearm'], { desc: '沿海岸建立雷達預警網。' }),
    G('e_spitfire', '噴火式戰鬥機', 70, { units: { ftr: 3 } }, ['e_radar']),
    G('e_empire', '帝國防衛', 70, { units: { inf: 3 } }, ['e_rearm']),
    G('e_research', '科研機構', 70, { res: 1 }, []),
    G('e_bomber', '轟炸機司令部', 70, { units: { bmb: 3 } }, ['e_spitfire']),
    G('e_cabinet', '戰時內閣', 50, { pp: 100, ppd: 0.5 }, ['e_rearm']),
  ],
  FRA: [
    G('f_maginot', '延伸馬其諾防線', 70, { fortAt: ['fra_lille', 'fra_sedan', 'fra_champagne'], fortLvl: 2 }, [], { desc: '將防線延伸至比利時邊境。' }),
    G('f_ind', '軍工國有化', 70, { ind: 3 }, [], { desc: '人民陣線政府將軍火工業國有化。' }),
    G('f_mech', '機械化部隊', 70, { tech: { arm: 1 }, units: { arm: 1 } }, ['f_ind']),
    G('f_air', '法國空軍', 70, { units: { ftr: 2 } }, ['f_ind']),
    G('f_colonial', '殖民地軍團', 70, { units: { inf: 3 } }, []),
    G('f_research', '科研機構', 70, { res: 1 }, []),
    G('f_navy', '法國艦隊', 70, { units: { flt: 1 } }, ['f_ind']),
  ],
  USA: [
    G('u_newdeal', '新政', 70, { ind: 4 }, [], { desc: '羅斯福的經濟復甦計畫。' }),
    G('u_navy', '兩洋海軍法案', 70, { units: { flt: 3 }, nav: 0.1 }, ['u_newdeal']),
    G('u_arsenal', '民主兵工廠', 70, { ind: 6 }, ['u_newdeal'], { minYear: 1940, desc: '美國工業全力轉向軍需生產。' }),
    G('u_manhattan', '曼哈頓計畫', 70, { nukeSpeed: 1.0, rsp: 0.05 }, ['u_research'], { minYear: 1941, desc: '研發原子彈的秘密計畫。' }),
    G('u_army', '陸軍擴編', 70, { units: { inf: 5 } }, ['u_newdeal']),
    G('u_aaf', '陸軍航空軍', 70, { units: { ftr: 3, bmb: 2 } }, ['u_newdeal']),
    G('u_research', '科研機構', 70, { res: 1 }, []),
    G('u_marines', '陸戰隊擴編', 50, { units: { mar: 3 } }, ['u_navy']),
    G('u_lend', '租借法案', 50, { pp: 100 }, ['u_newdeal'], { minYear: 1940 }),
  ],
  CHI: [
    G('c_ind', '國防工業', 70, { ind: 2 }, [], { desc: '發展兵工廠與交通。' }),
    G('c_german', '德式整編師', 70, { units: { inf: 3 }, att: 0.05 }, [], { desc: '由德國軍事顧問團訓練的精銳部隊。' }),
    G('c_scorched', '焦土抗戰', 50, { def: 0.1 }, ['c_german'], { desc: '以空間換取時間。' }),
    G('c_burma', '滇緬公路', 50, { ind: 1, pp: 50 }, ['c_ind']),
    G('c_research', '科研機構', 70, { res: 1 }, []),
    G('c_conscript', '擴大徵兵', 50, { man: 600 }, ['c_german']),
    G('c_air', '飛虎隊', 50, { units: { ftr: 2 } }, ['c_ind'], { minYear: 1941 }),
  ],
  PRC: [
    G('p_guerrilla', '游擊戰', 50, { def: 0.1, att: 0.05 }, [], { desc: '敵進我退，敵駐我擾。' }),
    G('p_base', '擴大根據地', 70, { units: { inf: 3 } }, ['p_guerrilla']),
    G('p_land', '土地改革', 70, { man: 400, ind: 1 }, ['p_base']),
    G('p_war', '人民戰爭', 70, { att: 0.1 }, ['p_land']),
    G('p_5yp', '第一個五年計畫', 70, { ind: 5 }, [], { minYear: 1950 }),
    G('p_bomb', '兩彈一星', 70, { nukeSpeed: 1.0 }, ['p_5yp'], { minYear: 1955 }),
    G('p_pla', '解放軍現代化', 70, { att: 0.05, def: 0.05, tech: { arm: 1 } }, ['p_5yp'], { minYear: 1952 }),
    G('p_reform', '改革開放', 70, { ind: 8, rsp: 0.1 }, ['p_5yp'], { minYear: 1978 }),
  ],
  // 冷戰國策（1946 年起）
  USA_COLD: [
    G('uc_marshall', '馬歇爾計畫', 70, { pp: 150, ind: 2 }, [], { minYear: 1947 }),
    G('uc_sac', '戰略空軍司令部', 70, { units: { bmb: 3 }, air: 0.1 }, []),
    G('uc_arsenal', '核武庫擴充', 70, { nukes: 2 }, ['uc_sac'], { minYear: 1950 }),
    G('uc_carrier', '航艦打擊群', 70, { units: { flt: 2 }, nav: 0.1 }, []),
    G('uc_space', '太空計畫', 70, { res: 1 }, [], { minYear: 1958 }),
    G('uc_army', '機械化陸軍', 70, { units: { mec: 3 } }, ['uc_marshall']),
    G('uc_sdi', '戰略防禦倡議', 70, { def: 0.1, rsp: 0.1 }, ['uc_space'], { minYear: 1983 }),
  ],
  SOV_COLD: [
    G('sc_5yp4', '戰後五年計畫', 70, { ind: 5 }, []),
    G('sc_bomb', '蘇聯原子彈計畫', 70, { nukeSpeed: 1.0 }, [], { minYear: 1946 }),
    G('sc_armor', '鋼鐵洪流', 70, { units: { arm: 4 }, armorAtt: 0.1 }, ['sc_5yp4']),
    G('sc_navy', '遠洋海軍', 70, { units: { flt: 2, sub: 3 } }, ['sc_5yp4'], { minYear: 1960 }),
    G('sc_space', '太空競賽', 70, { res: 1 }, [], { minYear: 1955 }),
    G('sc_air', '米格戰機', 70, { units: { ftr: 3 }, tech: { air: 1 } }, ['sc_5yp4']),
    G('sc_glasnost', '開放與改革', 70, { pp: 150, ind: 3 }, ['sc_space'], { minYear: 1985 }),
  ],
  GENERIC: [
    G('n_ind1', '工業擴張', 70, { ind: 2 }, [], { desc: '興建新工廠。' }),
    G('n_army', '軍隊建設', 70, { units: { inf: 2 } }, [], { desc: '擴充常備軍。' }),
    G('n_infra', '基礎建設', 50, { ind: 1, pp: 30 }, ['n_ind1']),
    G('n_research', '研究機構', 70, { res: 1 }, ['n_ind1']),
    G('n_fort', '邊境要塞', 50, { fort: 2 }, ['n_army']),
    G('n_air', '空軍建設', 70, { units: { ftr: 1 } }, ['n_army']),
    G('n_navy', '海軍建設', 70, { units: { flt: 1 } }, ['n_ind1'], { coastal: true }),
    G('n_reform', '軍事改革', 70, { att: 0.05, def: 0.05 }, ['n_army']),
    G('n_ind2', '工業擴張 II', 70, { ind: 3 }, ['n_infra']),
    G('n_man', '全民皆兵', 50, { man: 100 }, ['n_army']),
    G('n_armor', '裝甲部隊', 70, { units: { arm: 1 }, tech: { arm: 1 } }, ['n_reform']),
    G('n_ind3', '工業擴張 III', 70, { ind: 3 }, ['n_ind2'], { minYear: 1950 }),
  ],
};

export const IDEOLOGY_NAMES = { dem: '民主', fas: '法西斯/軍國', com: '共產', neu: '中立/威權' };

// 難度
export const DIFFICULTY = {
  easy: { name: '簡單', player: 1.3, ai: 0.85 },
  normal: { name: '普通', player: 1.0, ai: 1.0 },
  hard: { name: '困難', player: 0.9, ai: 1.15 },
};
