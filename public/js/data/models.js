// 歷史型號：坦克、裝甲車、飛機、直升機與艦艇科技在各國的代表型號。
// 某國沒有自行研製的型號時，依序改用：宗主國 → 同陣營國家 → 提供軍援的國家 → 大英國協的英國 → 同意識形態的大國。
// 剪影 spec 由 ui/icons.js 依參數繪製（各國坦克依設計風格略作調整）。
import { yearOf } from '../core/util.js';

const M = (s) => Object.fromEntries(s.split('|').map(x => { const i = x.indexOf(':'); return [x.slice(0, i), x.slice(i + 1)]; }));
const tank = (o) => ({ k: 'tank', ...o });
const plane = (o) => ({ k: 'plane', ...o });
const ship = (o) => ({ k: 'ship', ...o });
const gun = (o) => ({ k: 'gun', ...o });
const lch = (o) => ({ k: 'launcher', ...o });
const arty = (o) => ({ k: 'arty', ...o });
const truck = (o) => ({ k: 'truck', ...o });
const msl = (o) => ({ k: 'msl', ...o });
const boat = (o) => ({ k: 'boat', ...o });
const heli = (o) => ({ k: 'heli', ...o });
// 常用的輕兵器外形
const RIFLE = gun({ kind: 'rifle', L: 108 });
const AK = gun({ kind: 'ar', mag: 'curve', L: 100, stock: 'wood', handle: 0, bullpup: 0 });
const FAL = gun({ kind: 'ar', mag: 'box', L: 110, stock: 'straight', handle: 0, bullpup: 0 });
const M16 = gun({ kind: 'ar', mag: 'box', L: 100, stock: 'straight', handle: 1 });
const BULLPUP = gun({ kind: 'ar', bullpup: 1, mag: 'box', L: 84, handle: 1 });

export const MODELS = {
  // ---------------------------------------------------------------- 裝甲
  lt1: { spec: tank({ L: 70, H: 11, tw: 22, th: 9, gun: 12, slope: 0.2 }), m: M('GER:一號坦克|SOV:T-26|USA:M2A2 輕型坦克|ENG:維克斯 Mk VI 輕型坦克|FRA:雷諾 R35|ITA:L3/35 超輕型坦克|JAP:九五式輕戰車|CZE:LT vz. 35|POL:7TP 輕型坦克|SWE:Strv m/38') },
  lt2: { spec: tank({ L: 78, H: 12, tw: 24, th: 10, gun: 16, slope: 0.3 }), m: M('GER:二號坦克|SOV:BT-7|USA:M2A4 輕型坦克|ENG:Mk VIC 輕型坦克|FRA:哈奇開斯 H39|CZE:LT vz. 38|HUN:托爾迪輕型坦克') },
  lt3: { spec: tank({ L: 82, H: 13, tw: 26, th: 10, gun: 22, slope: 0.4 }), m: M('GER:38(t) 坦克|SOV:T-70|USA:M3 斯圖亞特|ENG:小領主輕型坦克|ITA:L6/40|JAP:九八式輕戰車') },
  lt4: { spec: tank({ L: 90, H: 13, tw: 30, th: 10, gun: 30, slope: 0.6, round: 1 }), m: M('USA:M41 華克猛犬|SOV:PT-76 兩棲坦克|FRA:AMX-13|ENG:FV101 蠍式|PRC:62 式輕型坦克|SWE:Ikv 91') },
  mt1: { spec: tank({ L: 86, H: 14, tw: 28, th: 11, gun: 20, slope: 0.3 }), m: M('GER:三號坦克|SOV:T-28|USA:M2 中型坦克|ENG:A13 巡航坦克|FRA:索瑪 S35|ITA:M11/39|JAP:九七式中戰車|HUN:圖蘭 I') },
  mt2: { spec: tank({ L: 90, H: 15, tw: 30, th: 12, gun: 30, slope: 0.6 }), m: M('GER:四號坦克 F2 型|SOV:T-34/76|USA:M4 雪曼|ENG:十字軍巡航坦克|ITA:M13/40|JAP:九七式中戰車改|HUN:圖蘭 II') },
  mt3: { spec: tank({ L: 96, H: 15, tw: 32, th: 12, gun: 42, slope: 0.85, muzzle: 1 }), m: M('GER:五號坦克「豹式」|SOV:T-34-85|USA:M4A3E8 雪曼「易捷八」|ENG:克倫威爾巡航坦克|ITA:P26/40|JAP:三式中戰車') },
  ht1: { spec: tank({ L: 96, H: 17, tw: 34, th: 13, gun: 24, slope: 0.3, big: 1 }), m: M('SOV:KV-1|ENG:瑪蒂達 II 步兵坦克|FRA:夏爾 B1 bis|USA:M6 重型坦克') },
  ht2: { spec: tank({ L: 100, H: 17, tw: 36, th: 13, gun: 42, slope: 0.15, muzzle: 1, big: 1 }), m: M('GER:六號坦克「虎式」|SOV:KV-85|ENG:邱吉爾步兵坦克|USA:M6A1 重型坦克') },
  ht3: { spec: tank({ L: 104, H: 17, tw: 38, th: 13, gun: 50, slope: 0.85, muzzle: 1 }), m: M('GER:虎王坦克|SOV:IS-2|USA:M26 潘興|ENG:邱吉爾 Mk VII') },
  ht4: { spec: tank({ L: 104, H: 16, tw: 36, th: 12, gun: 52, slope: 0.95, round: 1, muzzle: 1 }), m: M('SOV:T-10|USA:M103 重型坦克|ENG:征服者重型坦克|FRA:AMX-50') },
  mbt1: { spec: tank({ L: 94, H: 14, tw: 34, th: 11, gun: 44, slope: 0.85, round: 1 }), m: M('SOV:T-54|ENG:百夫長|USA:M46 巴頓|FRA:AMX-13（90 公釐砲）') },
  mbt2: { spec: tank({ L: 96, H: 14, tw: 36, th: 11, gun: 46, slope: 0.9, round: 1 }), m: M('SOV:T-55|USA:M48 巴頓|ENG:百夫長 Mk 5|PRC:59 式坦克|JAP:61 式戰車') },
  mbt3: { spec: tank({ L: 100, H: 14, tw: 38, th: 11, gun: 48, slope: 0.9, round: 1 }), m: M('SOV:T-62|USA:M60 巴頓|ENG:酋長|FRG:豹一|FRA:AMX-30|SWE:Strv 103|PRC:69 式坦克|ITA:豹一（授權生產）') },
  mbt4: { spec: tank({ L: 100, H: 13, tw: 38, th: 10, gun: 50, slope: 0.95, round: 1 }), m: M('SOV:T-72|USA:M60A3|ENG:酋長 Mk 5|FRG:豹一 A4|FRA:AMX-30B2|JAP:74 式戰車|PRC:69-II 式坦克|ISR:梅卡瓦 Mk 1') },
  mbt5: { spec: tank({ L: 104, H: 13, tw: 42, th: 10, gun: 52, slope: 0.95, flat: 1, skirt: 1 }), m: M('USA:M1 艾布蘭|SOV:T-80|FRG:豹二|ENG:挑戰者 1|ISR:梅卡瓦 Mk 2') },
  mbt6: { spec: tank({ L: 106, H: 13, tw: 44, th: 10, gun: 54, slope: 0.95, flat: 1, skirt: 1 }), m: M('USA:M1A1 艾布蘭|SOV:T-80U|FRG:豹二 A4|ENG:挑戰者 1 Mk 3|ISR:梅卡瓦 Mk 3|JAP:90 式戰車|PRC:88 式坦克') },
  mech1: { spec: { k: 'apc', half: 1 }, m: M('GER:SdKfz 251 半履帶車|USA:M3 半履帶車|ENG:通用載具|ITA:AS37 越野車') },
  mech2: { spec: { k: 'apc', tracks: 1 }, m: M('USA:M113 裝甲運兵車|SOV:BTR-152|ENG:FV603 撒拉遜|FRA:AMX-VCI|PRC:63 式裝甲運兵車|FRG:HS.30') },
  mech3: { spec: { k: 'apc', tracks: 1, ifv: 1 }, m: M('SOV:BMP-1|FRG:黃鼠狼步兵戰車|FRA:AMX-10P|USA:M113A1|ENG:FV432|PRC:86 式步兵戰車') },
  mech4: { spec: { k: 'apc', tracks: 1, ifv: 1 }, m: M('USA:M2 布萊德雷|SOV:BMP-2|ENG:武士步兵戰車|FRG:黃鼠狼 1A2|SWE:CV90') },
  // ---------------------------------------------------------------- 空軍
  f0: { spec: plane({ len: 64, span: 52, chord: 12, wing: 'straight', taper: 1, bi: 1, eng: 'nose' }), m: M('GER:He 51 雙翼機|SOV:I-15|USA:P-26 玩具槍|ENG:格羅斯特鬥士|FRA:D.510|ITA:菲亞特 CR.32|JAP:九五式艦上戰鬥機|POL:PZL P.11|CHI:霍克 III') },
  f1: { spec: plane({ len: 70, span: 54, chord: 15, wing: 'straight', taper: 0.55, eng: 'nose' }), m: M('GER:Bf 109E|SOV:I-16|USA:P-36 鷹式|ENG:颶風式|FRA:M.S.406|ITA:菲亞特 G.50|JAP:九六式艦上戰鬥機|POL:PZL P.24') },
  f2: { spec: plane({ len: 74, span: 54, chord: 15, wing: 'straight', taper: 0.5, eng: 'nose' }), m: M('GER:Bf 109F|SOV:Yak-1|USA:P-40 戰鷹|ENG:噴火式 Mk V|FRA:D.520|ITA:馬基 C.202|JAP:零式艦上戰鬥機') },
  f3: { spec: plane({ len: 78, span: 54, chord: 15, wing: 'straight', taper: 0.5, eng: 'nose' }), m: M('GER:Fw 190D|SOV:La-5FN／Yak-3|USA:P-51D 野馬|ENG:噴火式 Mk IX|ITA:菲亞特 G.55|JAP:四式戰鬥機「疾風」') },
  jet1: { spec: plane({ len: 78, span: 52, chord: 15, wing: 'straight', taper: 0.55, eng: 'twinjet' }), m: M('GER:Me 262|ENG:格羅斯特流星|USA:P-80 流星|SOV:MiG-9') },
  jet2: { spec: plane({ len: 80, span: 48, chord: 18, wing: 'swept', taper: 0.5 }), m: M('SOV:MiG-15|USA:F-86 軍刀|ENG:霍克獵人|FRA:達梭神秘 IV|SWE:薩博 J29「酒桶」|PRC:殲-5|ITA:G.91') },
  jet3: { spec: plane({ len: 88, span: 40, chord: 18, wing: 'swept', taper: 0.4 }), m: M('SOV:MiG-21|USA:F-104 星式|ENG:閃電式|FRA:幻象 III|SWE:薩博 J35「龍」|PRC:殲-6|JAP:F-104J|FRG:F-104G|ITA:F-104S'), o: { SOV: { wing: 'delta', tail: 'normal' }, FRA: { wing: 'delta', tail: 'none' }, SWE: { wing: 'delta', tail: 'none' }, PRC: { wing: 'swept', taper: 0.5 } } },
  jet4: { spec: plane({ len: 92, span: 42, chord: 22, wing: 'swept', taper: 0.35 }), m: M('USA:F-4 幽靈 II|SOV:MiG-23|ENG:F-4K 幽靈|FRA:幻象 F1|FRG:F-4F 幽靈|JAP:F-4EJ 幽靈|SWE:薩博 37「雷」|PRC:殲-7|ISR:幼獅戰機'), o: { ISR: { wing: 'delta', tail: 'none' }, SWE: { wing: 'delta' }, PRC: { wing: 'delta' } } },
  jet5: { spec: plane({ len: 94, span: 46, chord: 24, wing: 'swept', taper: 0.3, twintail: 1 }), m: M('USA:F-15 鷹式|SOV:MiG-29|FRA:幻象 F1C|FRG:龍捲風 IDS|ENG:龍捲風 GR.1|ITA:龍捲風 IDS|JAP:F-15J 鷹式|PRC:殲-8II|ISR:F-16 獵隼'), o: { FRG: { wing: 'swing' }, ENG: { wing: 'swing' }, ITA: { wing: 'swing' } } },
  jet6: { spec: plane({ len: 96, span: 46, chord: 24, wing: 'swept', taper: 0.3, twintail: 1 }), m: M('USA:F/A-18 大黃蜂|SOV:Su-27 側衛|FRA:幻象 2000|ENG:龍捲風 F3|FRG:龍捲風 ECR|ITA:龍捲風 ADV|JAP:F-15J 改|SWE:薩博 37 改'), o: { FRA: { wing: 'delta', tail: 'none', twintail: 0 }, ENG: { wing: 'swing' }, FRG: { wing: 'swing' }, ITA: { wing: 'swing' } } },
  cas1: { spec: plane({ len: 72, span: 54, chord: 15, wing: 'straight', taper: 0.55, eng: 'nose' }), m: M('GER:Ju 87 斯圖卡|USA:SBD 無畏式|JAP:九九式艦上爆擊機|ENG:布萊克本賊鷗|SOV:I-153 攻擊型|POL:PZL.23 卡拉希') },
  cas2: { spec: plane({ len: 76, span: 56, chord: 16, wing: 'straight', taper: 0.5, eng: 'nose' }), m: M('SOV:伊爾-2 斯圖莫維克|GER:Hs 129|USA:A-36 阿帕契|ENG:颶風 Mk IID|JAP:九九式襲擊機') },
  cas3: { spec: plane({ len: 78, span: 56, chord: 16, wing: 'straight', taper: 0.5, eng: 'nose' }), m: M('USA:P-47 雷霆|GER:Fw 190F|ENG:霍克颱風|SOV:伊爾-10') },
  cas4: { spec: plane({ len: 82, span: 40, chord: 20, wing: 'delta' }), m: M('USA:A-4 天鷹|SOV:Su-7B|ENG:布萊克本掠奪者|FRA:美洲虎|FRG:G.91R|ITA:G.91R|PRC:強-5'), o: { ENG: { wing: 'swept', taper: 0.5 }, FRA: { wing: 'swept', taper: 0.4 }, SOV: { wing: 'swept', taper: 0.4 } } },
  cas5: { spec: plane({ len: 82, span: 58, chord: 15, wing: 'straight', taper: 0.7, eng: 'rear', twintail: 1 }), m: M('USA:A-10 雷霆 II|SOV:Su-25 蛙足|ENG:獵鷹 GR.3|FRA:超級軍旗|JAP:三菱 F-1|ITA:AMX 攻擊機'), o: { SOV: { eng: 'none', twintail: 0, wing: 'swept', taper: 0.5 }, ENG: { eng: 'none', twintail: 0, wing: 'swept', taper: 0.4 }, FRA: { eng: 'none', twintail: 0, wing: 'swept', taper: 0.4 }, JAP: { eng: 'none', twintail: 0, wing: 'swept' }, ITA: { eng: 'none', twintail: 0, wing: 'swept' } } },
  tac1: { spec: plane({ len: 76, span: 58, chord: 16, wing: 'straight', taper: 0.5, eng: 'twin' }), m: M('GER:He 111|SOV:SB-2|ENG:布倫亨|USA:B-18 波羅|JAP:九六式陸上攻擊機|ITA:SM.79 雀鷹|FRA:LeO 45|POL:PZL.37 麋鹿') },
  tac2: { spec: plane({ len: 76, span: 58, chord: 16, wing: 'straight', taper: 0.5, eng: 'twin' }), m: M('GER:Ju 88|SOV:Pe-2|USA:B-25 米契爾|ENG:威靈頓|JAP:一式陸上攻擊機|ITA:CANT Z.1007') },
  tac3: { spec: plane({ len: 78, span: 56, chord: 15, wing: 'straight', taper: 0.5, eng: 'twin' }), m: M('ENG:德哈維蘭蚊式|USA:B-26 掠奪者|SOV:Tu-2|GER:Ju 188|JAP:陸上轟炸機「銀河」') },
  tac4: { spec: plane({ len: 84, span: 56, chord: 16, wing: 'straight', taper: 0.6, eng: 'twinjet' }), m: M('SOV:伊爾-28|ENG:英國電氣坎培拉|USA:B-57 坎培拉|FRA:南方飛機禿鷹 II|PRC:轟-5') },
  tac5: { spec: plane({ len: 90, span: 46, chord: 22, wing: 'swing', taper: 0.4 }), m: M('USA:F-111 土豚|SOV:Su-24 擊劍手|ENG:龍捲風 IDS|FRG:龍捲風 IDS|ITA:龍捲風 IDS|FRA:幻象 IV'), o: { FRA: { wing: 'delta', tail: 'none' } } },
  str1: { spec: plane({ len: 82, span: 58, chord: 16, wing: 'straight', taper: 0.45, eng: 'quad' }), m: M('USA:B-17 空中堡壘|SOV:TB-3／Pe-8|ENG:肖特斯特林|FRA:法曼 F.222') },
  str2: { spec: plane({ len: 82, span: 58, chord: 15, wing: 'straight', taper: 0.45, eng: 'quad' }), m: M('ENG:阿夫羅蘭開斯特|USA:B-24 解放者|GER:He 177 獅鷲|SOV:Pe-8|ITA:比亞喬 P.108') },
  str3: { spec: plane({ len: 88, span: 58, chord: 14, wing: 'straight', taper: 0.4, eng: 'quad' }), m: M('USA:B-29 超級堡壘|SOV:Tu-4|ENG:阿夫羅林肯') },
  str4: { spec: plane({ len: 94, span: 54, chord: 15, wing: 'swept', taper: 0.4, eng: 'twinjet' }), m: M('USA:B-47 同溫層噴射機|SOV:Tu-16 獾式|ENG:阿夫羅火神|FRA:幻象 IV|PRC:轟-6'), o: { ENG: { wing: 'delta', tail: 'none', eng: 'none' }, FRA: { wing: 'delta', tail: 'none', eng: 'none' } } },
  str5: { spec: plane({ len: 98, span: 58, chord: 16, wing: 'swept', taper: 0.35, eng: 'eight' }), m: M('USA:B-52 同溫層堡壘|SOV:Tu-95 熊式|ENG:漢德利佩吉勝利者'), o: { SOV: { eng: 'quad' } } },
  str6: { spec: plane({ len: 100, span: 50, chord: 20, wing: 'swing', taper: 0.35 }), m: M('SOV:Tu-22M 逆火式|USA:B-1B 槍騎兵') },
  nvb1: { spec: plane({ len: 68, span: 56, chord: 12, wing: 'straight', taper: 1, bi: 1, eng: 'nose' }), m: M('ENG:費爾利劍魚|JAP:九七式艦上攻擊機|USA:TBD 毀滅者|GER:He 115 水上飛機|ITA:SM.79 魚雷機|SOV:DB-3T|FRA:拉泰科埃爾 298'), o: { JAP: { bi: 0, taper: 0.55 }, USA: { bi: 0, taper: 0.55 }, GER: { bi: 0, eng: 'twin' }, ITA: { bi: 0, eng: 'twin' }, SOV: { bi: 0, eng: 'twin' } } },
  nvb2: { spec: plane({ len: 74, span: 56, chord: 15, wing: 'straight', taper: 0.55, eng: 'nose' }), m: M('USA:TBF 復仇者|JAP:艦上攻擊機「天山」|ENG:費爾利梭魚|GER:Ju 88 魚雷型|SOV:伊爾-4T') },
  nvb3: { spec: plane({ len: 86, span: 60, chord: 14, wing: 'straight', taper: 0.5, eng: 'quad' }), m: M('USA:P-3 獵戶座|SOV:Be-12 海鷗|ENG:阿夫羅沙克爾頓|FRA:布雷蓋大西洋|JAP:P-2J') },
  nvb4: { spec: plane({ len: 86, span: 46, chord: 20, wing: 'swept', taper: 0.4 }), m: M('USA:A-6 入侵者（魚叉飛彈）|FRA:超級軍旗（飛魚飛彈）|SOV:Tu-22M（Kh-22 飛彈）|ENG:掠奪者（海鷹飛彈）') },
  // ---------------------------------------------------------------- 直升機
  hel1: { spec: { k: 'heli' }, m: M('USA:西科斯基 H-19|SOV:Mi-4|ENG:威斯特蘭旋風|FRA:雲雀 II') },
  hel2: { spec: { k: 'heli', attack: 1 }, m: M('USA:AH-1 眼鏡蛇|SOV:Mi-24 雌鹿|FRA:SA 342 小羚羊|ENG:威斯特蘭山貓|FRG:BO 105 反坦克型') },
  hel3: { spec: { k: 'heli', attack: 1 }, m: M('USA:AH-64 阿帕契|SOV:Mi-24P 雌鹿|ENG:山貓 AH.7|FRA:小羚羊 HOT|ITA:A129 貓鼬') },
  // ---------------------------------------------------------------- 海軍
  bb1: { spec: ship({ t: 'bb', len: 100 }), m: M('GER:德意志級裝甲艦|ENG:納爾遜級戰艦|USA:科羅拉多級戰艦|JAP:長門型戰艦|ITA:加富爾伯爵級戰艦|FRA:敦克爾克級戰艦|SOV:甘古特級戰艦') },
  bb2: { spec: ship({ t: 'bb', len: 108 }), m: M('GER:俾斯麥號戰艦|ENG:英王喬治五世級戰艦|USA:北卡羅來納級戰艦|JAP:大和型戰艦|ITA:維內托級戰艦|FRA:黎胥留級戰艦') },
  bb3: { spec: ship({ t: 'bb', len: 112 }), m: M('USA:愛荷華級戰艦|ENG:前衛號戰艦') },
  bb4: { spec: ship({ t: 'dd', len: 100 }), m: M('USA:基林級驅逐艦|SOV:斯維爾德洛夫級巡洋艦|ENG:勇敢級驅逐艦|FRA:科爾貝爾號巡洋艦|JAP:春風級護衛艦') },
  bb5: { spec: ship({ t: 'dd', len: 104, missile: 1 }), m: M('USA:長灘號飛彈巡洋艦|SOV:肯達級飛彈巡洋艦|ENG:郡級飛彈驅逐艦|FRA:敘弗倫級飛彈驅逐艦|JAP:天津風號護衛艦|PRC:旅大級驅逐艦') },
  bb6: { spec: ship({ t: 'dd', len: 108, missile: 1 }), m: M('USA:提康德羅加級巡洋艦|SOV:基洛夫級核動力巡洋艦|ENG:22 型巡防艦|FRA:卡薩爾級驅逐艦|JAP:旗風級護衛艦') },
  cv1: { spec: ship({ t: 'cv', len: 104 }), m: M('USA:列克星敦級航艦|JAP:赤城號航艦|ENG:皇家方舟號航艦|FRA:貝亞恩號航艦') },
  cv2: { spec: ship({ t: 'cv', len: 108 }), m: M('USA:艾塞克斯級航艦|JAP:翔鶴型航艦|ENG:光輝級航艦') },
  cv3: { spec: ship({ t: 'cv', len: 112 }), m: M('USA:中途島級航艦|ENG:鷹號航艦|JAP:信濃號航艦|FRA:阿羅芒什號航艦') },
  cv4: { spec: ship({ t: 'cv', len: 114, angled: 1 }), m: M('USA:福萊斯特級航艦|ENG:皇家方舟號航艦（R09）|FRA:克里蒙梭級航艦|SOV:莫斯科級直升機巡洋艦') },
  cv5: { spec: ship({ t: 'cv', len: 116, angled: 1 }), m: M('USA:企業號核動力航艦|SOV:基輔級航空巡洋艦|ENG:競技神號航艦') },
  cv6: { spec: ship({ t: 'cv', len: 118, angled: 1 }), m: M('USA:尼米茲級核動力航艦|SOV:庫茲涅佐夫號航艦|ENG:無敵級航艦') },
  ss1: { spec: ship({ t: 'ss', len: 92 }), m: M('GER:IIA 型 U 艇|ENG:S 級潛艇|USA:S 級潛艇|JAP:伊一型潛水艦|ITA:阿爾戈級潛艇|SOV:Shch 級潛艇|FRA:絮庫夫號潛艇') },
  ss2: { spec: ship({ t: 'ss', len: 100 }), m: M('GER:VIIC 型 U 艇|USA:小鯊魚級潛艇|ENG:T 級潛艇|JAP:伊十五型潛水艦|ITA:馬可尼級潛艇|SOV:S 級潛艇') },
  ss3: { spec: ship({ t: 'ss', len: 106 }), m: M('GER:XXI 型 U 艇|USA:白魚級潛艇|SOV:613 型（威士忌級）|ENG:A 級潛艇|JAP:伊四百型潛水艦') },
  ss4: { spec: ship({ t: 'ss', len: 108, nuc: 1 }), m: M('USA:鸚鵡螺號核潛艇|SOV:627 型（十一月級）|ENG:無畏號核潛艇|PRC:漢級核潛艇') },
  ss5: { spec: ship({ t: 'ss', len: 112, nuc: 1, slbm: 1 }), m: M('USA:喬治·華盛頓級彈道飛彈潛艇|SOV:667A 型（洋基級）|ENG:決心級彈道飛彈潛艇|FRA:可畏級彈道飛彈潛艇|PRC:夏級彈道飛彈潛艇') },
  ss6: { spec: ship({ t: 'ss', len: 112, nuc: 1 }), m: M('USA:洛杉磯級核潛艇|SOV:971 型（阿庫拉級）|ENG:特拉法加級核潛艇|FRA:紅寶石級核潛艇') },
  // ---------------------------------------------------------------- 步兵裝備（各國制式步槍）
  inf1: { spec: RIFLE, m: M('GER:毛瑟 Kar98k 步槍|SOV:莫辛-納甘 M1891/30 步槍|ENG:李-恩菲爾德 No.1 Mk III 步槍|USA:M1903 春田步槍|JAP:三八式步槍|ITA:卡爾卡諾 M91 步槍|FRA:勒貝爾 M1886/93 步槍|CHI:中正式步槍|PRC:漢陽造（八八式）步槍|POL:wz. 29 毛瑟步槍|CZE:vz. 24 毛瑟步槍|SWE:m/96 毛瑟步槍|FIN:莫辛-納甘 M/28-30 步槍|SPA:毛瑟 M1916 步槍') },
  inf2: { spec: RIFLE, m: M('GER:毛瑟 Kar98k（戰時量產型）|SOV:SVT-38 托卡列夫半自動步槍|ENG:李-恩菲爾德 No.4 Mk I 步槍|USA:M1 加蘭德步槍（早期型）|JAP:九九式短小銃|FRA:MAS-36 步槍|ITA:卡爾卡諾 M38 短步槍|CHI:中正式步槍（二四式）|CZE:vz. 33 卡賓槍'), o: { SOV: { mag: 'box' }, USA: { mag: 'box' } } },
  inf3: { spec: gun({ kind: 'rifle', L: 104, mag: 'box' }), m: M('USA:M1 加蘭德步槍|SOV:SVT-40 托卡列夫步槍|GER:Gewehr 43 半自動步槍|JAP:四式自動小銃（試製）|ENG:李-恩菲爾德 No.4 Mk I 步槍|ITA:卡爾卡諾 M91/38 步槍|FRA:MAS-36 步槍|CHI:中正式步槍|FIN:莫辛-納甘 M/39 步槍') },
  inf4: { spec: gun({ kind: 'ar', mag: 'curve', L: 100, stock: 'wood' }), m: M('GER:StG 44 突擊步槍|USA:M2 卡賓槍（全自動）|SOV:SKS 半自動卡賓槍|ENG:No.5 叢林卡賓槍|JAP:四式自動小銃|ITA:伯萊塔 M1918/30 卡賓槍'), o: { USA: { mag: 'box', L: 90 }, SOV: { kind: 'rifle', mag: 'int' }, ENG: { kind: 'rifle', mag: 'int', L: 94 }, JAP: { kind: 'rifle', mag: 'box' } } },
  inf5: { spec: AK, m: M('SOV:AK-47 突擊步槍|BEL:FN FAL 戰鬥步槍|ENG:L1A1 自動裝填步槍|USA:M14 步槍|FRG:HK G3 戰鬥步槍|PRC:56 式衝鋒槍（AK-47 仿製）|FRA:MAS-49 步槍|ITA:伯萊塔 BM 59 步槍|ISR:FN FAL 戰鬥步槍|CHI:M1 加蘭德步槍（美援）|SWE:Ak 4 步槍|SPA:CETME 步槍|JAP:64 式小銃|VIN:56 式衝鋒槍|PRK:58 式步槍'), o: { BEL: FAL, ENG: FAL, USA: FAL, FRG: FAL, ISR: FAL, SWE: FAL, SPA: FAL, JAP: FAL, ITA: FAL, FRA: { kind: 'rifle', mag: 'box' }, CHI: { kind: 'rifle', mag: 'box', stock: 'wood', handle: 0 } } },
  inf6: { spec: M16, m: M('USA:M16A1 突擊步槍|SOV:AKM 突擊步槍|PRC:63 式自動步槍|FRG:HK G3A3 戰鬥步槍|ENG:L1A1 自動裝填步槍|FRA:MAS-49/56 步槍|ISR:加利爾突擊步槍|CHI:57 式步槍|JAP:64 式小銃|VIN:AKM 突擊步槍|KOR:M16A1（大宇授權）|AST:L1A1 自動裝填步槍'), o: { SOV: AK, PRC: AK, VIN: AK, ISR: AK, FRG: FAL, ENG: FAL, AST: FAL, JAP: FAL, CHI: FAL, FRA: { kind: 'rifle', mag: 'box', handle: 0, stock: 'wood' } } },
  snp1: { spec: gun({ kind: 'rifle', L: 110, scope: 1 }), m: M('GER:毛瑟 Kar98k 狙擊型（ZF39 瞄準鏡）|SOV:莫辛-納甘 M1891/30 PU 狙擊步槍|ENG:李-恩菲爾德 No.4 Mk I (T) 狙擊步槍|USA:M1903A4 春田狙擊步槍|JAP:九七式狙擊銃|FIN:莫辛-納甘 M/28-30 狙擊步槍|ITA:卡爾卡諾 M91/41 狙擊型') },
  carb1: { spec: gun({ kind: 'rifle', L: 86, mag: 'box', hg: 0.2 }), m: M('USA:M1 卡賓槍|SOV:莫辛-納甘 M1944 卡賓槍|GER:FG 42 傘兵步槍|ENG:No.5 Mk I 叢林卡賓槍|JAP:二式小銃（傘兵用分解式）|CHI:M1 卡賓槍（美援）'), o: { SOV: { mag: 'int' }, ENG: { mag: 'int' }, JAP: { mag: 'int' }, GER: { kind: 'ar', stock: 'straight', bip: 1, L: 96 } } },
  snp2: { spec: gun({ kind: 'ar', L: 112, mag: 'box', scope: 1, stock: 'skel' }), m: M('SOV:SVD 德拉古諾夫狙擊步槍|USA:M21 狙擊步槍|ENG:L42A1 狙擊步槍|FRG:HK G3SG/1 狙擊步槍|FRA:FR F1 狙擊步槍|PRC:79 式狙擊步槍|ISR:加利爾狙擊步槍|CHI:M21 狙擊步槍（美援）'), o: { USA: { stock: 'wood' }, ENG: { kind: 'rifle', stock: 'wood' }, FRA: { kind: 'rifle', stock: 'wood', bip: 1 }, FRG: { stock: 'straight' } } },
  rif4: { spec: M16, m: M('FRA:FAMAS F1 無托步槍|AUS:斯泰爾 AUG 無托步槍|ENG:SA80（L85A1）無托步槍|USA:M16A2 步槍|SOV:AK-74 突擊步槍|PRC:81-1 式自動步槍|JAP:89 式小銃|CHI:65K2 步槍|ISR:加利爾 ARM 步槍|FRG:HK G41 步槍|SWE:Ak 5 步槍'), o: { FRA: BULLPUP, AUS: BULLPUP, ENG: BULLPUP, SOV: AK, PRC: AK, ISR: AK } },
  // ---------------------------------------------------------------- 機槍與衝鋒槍
  lmg1: { spec: gun({ kind: 'mg', mag: 'top', bip: 1, L: 110, stock: 'straight' }), m: M('ENG:布倫輕機槍|SOV:DP-28 輕機槍|GER:MG 34 機槍|USA:M1918 白朗寧自動步槍|JAP:九六式輕機關銃|FRA:FM 24/29 輕機槍|ITA:布雷達 M30 輕機槍|CHI:捷克式輕機槍（ZB vz. 26）|CZE:ZB vz. 26 輕機槍|FIN:拉蒂-薩洛蘭塔 M/26 輕機槍|POL:wz. 28 自動步槍'), o: { SOV: { mag: 'pan', stock: 'wood', jacket: 1 }, GER: { mag: 'belt', jacket: 1 }, USA: { mag: 'box', stock: 'wood' }, ITA: { mag: 'box', stock: 'wood' }, POL: { mag: 'box', stock: 'wood' }, FIN: { mag: 'box', stock: 'wood' } } },
  hmg1: { spec: gun({ kind: 'mg', mag: 'belt', tripod: 1, stock: 'none', jacket: 1, L: 100, hg: 0 }), m: M('USA:M2 白朗寧重機槍|SOV:馬克沁 M1910/30 重機槍|ENG:維克斯機槍|GER:MG 34 重機槍（三腳架）|JAP:九二式重機關銃|FRA:哈奇開斯 M1914 機槍|ITA:布雷達 M37 機槍|CHI:二四式重機槍（馬克沁）|CZE:ZB vz. 37 機槍') },
  smg1: { spec: gun({ kind: 'smg', stock: 'fold', mag: 'long', L: 90 }), m: M('GER:MP 40 衝鋒槍|SOV:PPSh-41 衝鋒槍|ENG:司登衝鋒槍|USA:湯普森 M1A1 衝鋒槍|ITA:伯萊塔 M1938A 衝鋒槍|JAP:一〇〇式機關短銃|FRA:MAS-38 衝鋒槍|FIN:索米 KP/-31 衝鋒槍|CHI:湯普森衝鋒槍（中國仿製）|AUS:斯泰爾-索羅通 MP 34 衝鋒槍'), o: { SOV: { stock: 'wood', mag: 'drum', jacket: 1 }, FIN: { stock: 'wood', mag: 'drum', jacket: 1 }, USA: { stock: 'wood', mag: 'box' }, CHI: { stock: 'wood', mag: 'drum' }, ITA: { stock: 'wood' }, JAP: { stock: 'wood' }, AUS: { stock: 'wood', jacket: 1 }, ENG: { stock: 'skel', mag: 'box' } } },
  gpmg1: { spec: gun({ kind: 'mg', mag: 'belt', bip: 1, L: 112, stock: 'straight', jacket: 1 }), m: M('GER:MG 42 通用機槍|SOV:SG-43 郭留諾夫機槍|USA:M1919A6 機槍|ENG:布倫 Mk II 輕機槍|JAP:九九式輕機關銃|ITA:布雷達 M37 機槍'), o: { SOV: { tripod: 1, bip: 0, stock: 'none' }, ENG: { mag: 'top', jacket: 0 }, JAP: { mag: 'top', jacket: 0 } } },
  smg2: { spec: gun({ kind: 'smg', stock: 'skel', mag: 'long', L: 84 }), m: M('SOV:PPS-43 衝鋒槍|USA:M3 衝鋒槍「黃油槍」|ENG:司登 Mk V 衝鋒槍|GER:MP 3008 衝鋒槍|AST:歐文衝鋒槍|ITA:伯萊塔 M38/44 衝鋒槍'), o: { SOV: { stock: 'fold', mag: 'curve' }, ENG: { stock: 'wood' }, AST: { mag: 'top' }, ITA: { stock: 'wood' } } },
  gpmg2: { spec: gun({ kind: 'mg', mag: 'belt', bip: 1, L: 112, stock: 'straight' }), m: M('USA:M60 通用機槍|SOV:PK 通用機槍|FRG:MG3 通用機槍|BEL:FN MAG 通用機槍|ENG:L7A2 通用機槍|FRA:AA-52 通用機槍|PRC:67 式通用機槍|JAP:62 式機關銃|ISR:FN MAG 通用機槍|CHI:T74 排用機槍'), o: { SOV: { stock: 'skel' }, FRG: { jacket: 1 } } },
  smg3: { spec: gun({ kind: 'smg', stock: 'fold', mag: 'long', L: 76 }), m: M('FRG:HK MP5 衝鋒槍|ISR:烏茲衝鋒槍|ENG:斯特林 L2A3 衝鋒槍|CZE:vz. 61 蠍式衝鋒槍|USA:英格拉姆 MAC-10 衝鋒槍|SWE:卡爾·古斯塔夫 m/45 衝鋒槍|PRC:79 式輕型衝鋒槍|SOV:AKS-74U 短突擊步槍|ITA:伯萊塔 M12 衝鋒槍|FRA:MAT-49 衝鋒槍|CHI:T77 衝鋒槍'), o: { FRG: { mag: 'curve', stock: 'straight' }, SOV: { kind: 'ar', mag: 'curve', stock: 'fold' }, ENG: { jacket: 1 } } },
  saw1: { spec: gun({ kind: 'mg', mag: 'belt', bip: 1, L: 100, stock: 'straight' }), m: M('USA:M249 班用自動武器|SOV:RPK-74 輕機槍|BEL:FN Minimi 輕機槍|PRC:81 式班用機槍|ENG:L86A1 輕型支援武器|ISR:加利爾 ARM 輕機槍|FRG:HK21 輕機槍|JAP:Minimi 輕機槍（住友授權）|CHI:T75 班用機槍'), o: { SOV: { mag: 'curve', stock: 'wood', kind: 'ar' }, PRC: { mag: 'drum', stock: 'wood' }, ENG: BULLPUP, ISR: { mag: 'curve', kind: 'ar' } } },
  // ---------------------------------------------------------------- 迫擊砲與單兵火力
  mor1: { spec: arty({ t: 'mortar' }), m: M('GER:8 公分 GrW 34 迫擊砲|SOV:82-BM-37 迫擊砲|ENG:3 吋迫擊砲|USA:M1 81 公釐迫擊砲|JAP:九七式曲射步兵砲|FRA:布朗特 Mle 27/31 迫擊砲|ITA:81/14 Mod. 35 迫擊砲|CHI:民二十式 82 公釐迫擊砲|POL:wz. 31 81 公釐迫擊砲') },
  gren1: { spec: arty({ t: 'mortar', bl: 32, bt: 3.6 }), m: M('JAP:八九式重擲彈筒|ENG:2 吋迫擊砲|GER:5 公分 leGrW 36 迫擊砲|SOV:50-PM 40 迫擊砲|ITA:布里夏 M35 45 公釐迫擊砲|USA:M2 60 公釐迫擊砲|FRA:Mle 1937 60 公釐迫擊砲|CHI:二七式擲彈筒') },
  flame1: { spec: gun({ kind: 'flame', L: 100 }), m: M('GER:41 式火焰噴射器|SOV:ROKS-2 火焰噴射器|USA:M2 火焰噴射器|ENG:2 號 Mk II 火焰噴射器「救生圈」|JAP:一〇〇式火焰發射機|ITA:M35 火焰噴射器') },
  mor2: { spec: arty({ t: 'mortar', bl: 60, bt: 7 }), m: M('SOV:120-PM-38 迫擊砲|GER:12 公分 GrW 42 迫擊砲|USA:M2 4.2 吋迫擊砲|ENG:ML 4.2 吋迫擊砲|JAP:九七式中迫擊砲|FIN:120 公釐 Krh/40 迫擊砲') },
  gl1: { spec: gun({ kind: 'gl', L: 72, stock: 'wood', mag: 'none', hg: 0.12 }), m: M('USA:M79 榴彈發射器|SOV:GP-25 槍掛榴彈發射器|FRG:HK79 槍掛榴彈發射器|CHI:M79 榴彈發射器（美援）|ISR:M203 槍掛榴彈發射器'), o: { SOV: { kind: 'ar', mag: 'curve', ugl: 1, L: 100 }, FRG: { kind: 'ar', mag: 'box', stock: 'straight', ugl: 1, L: 104 }, ISR: { kind: 'ar', mag: 'box', stock: 'straight', ugl: 1, handle: 1, L: 100 } } },
  gl2: { spec: gun({ kind: 'gl', tripod: 1, stock: 'none', mag: 'belt', L: 84, hg: 0 }), m: M('USA:Mk 19 自動榴彈發射器|SOV:AGS-17「火焰」自動榴彈發射器|PRC:87 式 35 公釐自動榴彈發射器') },
  mor3: { spec: arty({ t: 'mortar', bl: 48, bt: 5 }), m: M('ENG:L16 81 公釐迫擊砲|USA:M252 81 公釐迫擊砲|SOV:2B14「托盤」82 公釐迫擊砲|FRA:MO-120-RT 120 公釐迫擊砲|ISR:索爾坦 K6 120 公釐迫擊砲|PRC:87 式 82 公釐迫擊砲|JAP:L16 81 公釐迫擊砲（授權）|CHI:T75 60 公釐迫擊砲') },
  // ---------------------------------------------------------------- 反坦克武器
  atr1: { spec: gun({ kind: 'rifle', L: 116, bip: 1, mag: 'box', muzzle: 1 }), m: M('SOV:PTRD-41 反坦克步槍|ENG:博伊斯反坦克步槍|GER:PzB 39 反坦克步槍|FIN:拉蒂 L-39 反坦克步槍|JAP:九七式自動砲|POL:wz. 35 反坦克步槍'), o: { SOV: { mag: 'int' }, ENG: { mag: 'top' }, GER: { mag: 'int' } } },
  at1: { spec: arty({ t: 'at', bl: 52 }), m: M('GER:3.7 公分 PaK 36 反坦克砲|SOV:45 公釐 53-K 反坦克砲|ENG:QF 2 磅反坦克砲|USA:37 公釐 M3 反坦克砲|JAP:九四式三十七粍砲|FRA:哈奇開斯 25 公釐反坦克砲|ITA:47/32 M35 反坦克砲|CHI:3.7 公分 PaK 36（中德合作）|SWE:博福斯 37 公釐反坦克砲|POL:博福斯 37 公釐反坦克砲') },
  at_hvy: { spec: arty({ t: 'at', bl: 70, bt: 3.6, brake: 1 }), m: M('GER:7.5 公分 PaK 40 反坦克砲|SOV:ZiS-3 76 公釐師屬加農砲|ENG:QF 17 磅反坦克砲|USA:3 吋 M5 反坦克砲|JAP:一式機動四十七粍砲|ITA:75/39 反坦克砲|FIN:7.5 公分 PaK 40（德援）') },
  at2: { spec: lch({ t: 'tube' }), m: M('USA:M1 巴祖卡火箭筒|GER:RPzB 54「戰車殺手」火箭筒|ENG:PIAT 反坦克發射器|JAP:四式七糎噴進砲|SOV:RPG-2 反坦克火箭筒|ITA:鐵拳（德援）|CHI:M9A1 巴祖卡（美援）'), o: { SOV: { t: 'rpg' }, ITA: { t: 'pf' } } },
  at3: { spec: lch({ t: 'rpg' }), m: M('SOV:RPG-7 火箭推進榴彈|USA:M72 LAW 反坦克火箭|SWE:卡爾·古斯塔夫 M2 無後座力砲|ENG:L14A1 卡爾·古斯塔夫|FRA:LRAC 73 公釐火箭筒|PRC:69 式火箭筒|FRG:鐵拳 44「長矛」|ISR:B-300 反坦克火箭|CHI:66 公釐火箭彈|VIN:B41（RPG-7）|EGY:RPG-7'), o: { USA: { t: 'tube', L: 80 }, SWE: { t: 'tube' }, ENG: { t: 'tube' }, FRA: { t: 'tube' }, ISR: { t: 'tube' }, CHI: { t: 'tube', L: 80 } } },
  at_rcl: { spec: lch({ t: 'recoil' }), m: M('USA:M40 106 公釐無後座力砲|SOV:B-10 82 公釐無後座力砲|ENG:L6 王恩無後座力砲|PRC:52 式 75 公釐無後座力砲|SWE:Pvpj 1110 無後座力砲|CHI:M40 106 公釐無後座力砲（美援）|ISR:M40 106 公釐無後座力砲|JAP:60 式 106 公釐無反動砲') },
  at4: { spec: lch({ t: 'atgm' }), m: M('SOV:9M14「嬰兒」（AT-3 賽格）|USA:BGM-71 TOW 反坦克飛彈|FRA:SS.11 反坦克飛彈|ENG:警覺反坦克飛彈|FRG:眼鏡蛇反坦克飛彈|PRC:紅箭-73 反坦克飛彈|JAP:64 式對戰車誘導彈|SWE:矮腳雞反坦克飛彈|EGY:9M14「嬰兒」') },
  at5: { spec: lch({ t: 'atgm', L: 96 }), m: M('FRA:米蘭反坦克飛彈|FRG:米蘭反坦克飛彈|ENG:米蘭反坦克飛彈|SOV:9M113「競賽」（AT-5）|USA:TOW-2 反坦克飛彈|PRC:紅箭-8 反坦克飛彈|JAP:79 式重裝甲誘導彈|ISR:TOW 反坦克飛彈|CHI:TOW 反坦克飛彈（美援）') },
  // ---------------------------------------------------------------- 火砲
  art_mtn: { spec: arty({ t: 'mtn' }), m: M('JAP:九四式山砲|GER:7.5 公分 GebG 36 山砲|SOV:76 公釐 M1938 山砲|USA:M1 75 公釐駄載榴彈砲|ITA:75/13 山砲|ENG:QF 3.7 吋山地榴彈砲|CHI:卜福斯 75 公釐山砲|PRC:九二式步兵砲（擄獲）') },
  art1: { spec: arty({ t: 'gun', bl: 56, elev: 12 }), m: M('GER:10.5 公分 leFH 16 輕榴彈砲|SOV:76 公釐 M1902/30 師屬加農砲|ENG:QF 18 磅野戰砲|USA:M1897 75 公釐野戰砲|FRA:Mle 1897 75 公釐野戰砲|JAP:九〇式野砲|ITA:75/27 Mod. 06 野戰砲|CHI:克虜伯 75 公釐野砲|POL:wz. 02/26 75 公釐野戰砲') },
  art2: { spec: arty({ t: 'how' }), m: M('GER:10.5 公分 leFH 18 輕榴彈砲|SOV:M-30 122 公釐榴彈砲|USA:M2A1 105 公釐榴彈砲|ENG:QF 25 磅砲|JAP:九一式十糎榴彈砲|ITA:75/18 Mod. 35 榴彈砲|FRA:Mle 1935 105 公釐榴彈砲|CHI:10.5 公分 leFH 18（中德合作）') },
  art_hvy: { spec: arty({ t: 'how', bl: 62, bt: 7, wr: 11, elev: 26 }), m: M('GER:15 公分 sFH 18 重榴彈砲|SOV:ML-20 152 公釐加農榴彈砲|USA:M1 155 公釐加農砲「長腳湯姆」|ENG:BL 5.5 吋中型砲|JAP:九六式十五糎榴彈砲|ITA:149/40 Mod. 35 加農砲|FRA:155 公釐 GPF 加農砲|CHI:15 公分 sFH 18（中德合作）'), o: { USA: { bl: 80, bt: 6, elev: 18 } } },
  art3: { spec: truck({ t: 'rails' }), m: M('SOV:BM-13「喀秋莎」火箭砲|GER:15 公分 41 式煙霧發射器|USA:T34「風琴」火箭發射器|ENG:陸上床墊火箭發射器|JAP:四式二十糎噴進砲'), o: { GER: { k: 'arty', t: 'neb' }, USA: { k: 'tank', L: 92, H: 15, tw: 30, th: 12, gun: 26, slope: 0.5, round: 1 } } },
  art4: { spec: tank({ casemate: 1, open: 1, L: 90, H: 13, th: 12, gun: 22, gt: 4, elev: 12 }), m: M('USA:M7 牧師式自走砲|GER:黃蜂式自走榴彈砲|SOV:SU-76M 自走砲|ENG:教堂司事式自走砲|ITA:賽莫文特 105/25 自走砲|JAP:一式七糎半自走砲') },
  art5: { spec: arty({ t: 'how', brake: 1, bl: 58 }), m: M('SOV:D-30 122 公釐榴彈砲|USA:M114 155 公釐榴彈砲|ENG:L5 105 公釐榴彈砲|PRC:54 式 122 公釐榴彈砲|FRA:Mle 50 155 公釐榴彈砲|ITA:Mod 56 105 公釐榴彈砲|JAP:M101 105 公釐榴彈砲|CHI:M101 105 公釐榴彈砲|FRG:M101 105 公釐榴彈砲') },
  art_long: { spec: arty({ t: 'gun', bl: 78, bt: 4.6, elev: 14, brake: 1, wr: 10 }), m: M('SOV:M-46 130 公釐加農砲|USA:M115 203 公釐榴彈砲|PRC:59 式 130 公釐加農砲|FRG:FH70 155 公釐榴彈砲|ENG:FH70 155 公釐榴彈砲|ITA:FH70 155 公釐榴彈砲|FRA:TR-F1 155 公釐榴彈砲|ISR:索爾坦 M-71 155 公釐榴彈砲|SWE:FH77 155 公釐榴彈砲|CHI:M115 203 公釐榴彈砲（美援）') },
  art6: { spec: tank({ L: 96, H: 13, tw: 46, th: 16, tpos: 0.6, gun: 40, flat: 1, muzzle: 1 }), m: M('USA:M109 自走榴彈砲|SOV:2S3「金合歡」自走榴彈砲|ENG:FV433 阿伯特自走砲|FRA:AMX-30 AuF1 自走榴彈砲|FRG:M109G 自走榴彈砲|JAP:75 式自走 155 公釐榴彈砲|PRC:83 式 152 公釐自走榴彈砲|ISR:M109 自走榴彈砲|CHI:M109A2 自走榴彈砲|SWE:Bandkanon 1 自走砲') },
  art7: { spec: truck({ t: 'tubes' }), m: M('USA:M270 多管火箭系統|SOV:BM-27「颶風」多管火箭|PRC:81 式 122 公釐火箭砲|FRG:LARS 110 公釐火箭砲|CHI:工蜂六型多管火箭|JAP:M270 多管火箭系統|ISR:LAR-160 多管火箭'), o: { USA: { tracks: 1 }, JAP: { tracks: 1 } } },
  // ---------------------------------------------------------------- 防空武器
  aa_light: { spec: arty({ t: 'aa', bl: 44, bt: 3, elev: 40 }), m: M('GER:2 公分 Flak 30 高射機砲|SWE:博福斯 40 公釐高射機砲|SOV:61-K 37 公釐高射機砲|USA:M1 40 公釐博福斯高射砲|ENG:QF 40 公釐博福斯高射砲|JAP:九八式高射機關砲|ITA:布雷達 20/65 Mod. 35|FRA:哈奇開斯 25 公釐高射機砲|CHI:卜福斯 40 公釐高射機砲|POL:wz. 36 40 公釐高射砲') },
  aa1: { spec: arty({ t: 'aa', bl: 60, bt: 4.4, elev: 45, shield: 1 }), m: M('GER:8.8 公分 Flak 36 高射砲|SOV:52-K 85 公釐高射砲|USA:M3 3 吋高射砲|ENG:QF 3.7 吋高射砲|JAP:八八式七糎野戰高射砲|ITA:75/46 C.A. Mod. 34 高射砲|FRA:Mle 1932 75 公釐高射砲|SWE:博福斯 75 公釐高射砲') },
  aa_heavy: { spec: arty({ t: 'aa', bl: 72, bt: 5.2, elev: 52, shield: 1 }), m: M('GER:12.8 公分 Flak 40 高射砲|ENG:QF 4.5 吋高射砲|USA:M1 90 公釐高射砲|SOV:KS-19 100 公釐高射砲|JAP:三式十二糎高射砲|ITA:90/53 Mod. 39 高射砲') },
  aa_spaag: { spec: truck({ t: 'gun', tracks: 1 }), m: M('SOV:ZSU-23-4「石勒喀」自走高射砲|FRG:獵豹自走防空砲|USA:M163 火神防空系統|FRA:AMX-13 DCA 自走高射砲|PRC:80 式雙管 57 公釐自走高射砲|JAP:87 式自走高射機關砲|CHI:M42 雙管 40 公釐自走高射砲|ISR:M163 火神防空系統') },
  aa_manpads: { spec: lch({ t: 'manpads' }), m: M('SOV:9K32「箭-2」（SA-7）|USA:FIM-43 紅眼防空飛彈|ENG:吹管防空飛彈|PRC:紅纓-5 防空飛彈|FRA:西北風防空飛彈|JAP:91 式攜帶地對空誘導彈|SWE:RBS 70 防空飛彈|VIN:9K32「箭-2」') },
  aa3: { spec: truck({ t: 'sam', ax: 2 }), m: M('SOV:S-75「德維納」（SA-2）|USA:MIM-14 勝利女神-力士防空飛彈|ENG:警犬防空飛彈|PRC:紅旗-2 防空飛彈|FRG:勝利女神-力士防空飛彈|CHI:勝利女神-力士防空飛彈（美援）|VIN:S-75「德維納」|EGY:S-75「德維納」') },
  aa4: { spec: truck({ t: 'sam', ax: 2 }), m: M('SOV:2K12「立方體」（SA-6）|USA:MIM-23 霍克防空飛彈|FRA:響尾蛇防空飛彈|ENG:長劍防空飛彈|FRG:羅蘭德防空飛彈|PRC:紅旗-61 防空飛彈|ISR:霍克防空飛彈|CHI:霍克防空飛彈（美援）|JAP:81 式短距離地對空誘導彈|EGY:2K12「立方體」'), o: { SOV: { tracks: 1 }, FRG: { tracks: 1 } } },
  aa_long: { spec: truck({ t: 'sam', ax: 4 }), m: M('USA:MIM-104 愛國者飛彈|SOV:S-300 防空飛彈系統|CHI:天弓一型防空飛彈|JAP:愛國者飛彈（授權）|FRG:愛國者飛彈|PRC:紅旗-2B 防空飛彈') },
  // ---------------------------------------------------------------- 裝甲車輛補充
  mt1b: { spec: tank({ L: 88, H: 14, tw: 28, th: 11, gun: 22, slope: 0.4 }), m: M('GER:三號坦克 E 型|SOV:T-28E 中型坦克|ENG:瓦倫丁步兵坦克|USA:M3 李將軍中型坦克|FRA:雷諾 D2 中型坦克|ITA:M14/41 中型坦克|JAP:一式中戰車|HUN:圖蘭 I 中型坦克'), o: { USA: { tpos: 0.36, th: 13, H: 17, gun: 16 } } },
  lt5: { spec: tank({ L: 88, H: 12, tw: 32, th: 10, gun: 22, slope: 0.6, round: 1, gt: 4 }), m: M('USA:M551 謝里登空降坦克|ENG:FV107 彎刀偵察車|SOV:BMD-1 空降戰車|PRC:63 式兩棲坦克|FRA:AMX-10RC 輪式偵察車|SWE:Ikv 91 驅逐戰車'), o: { FRA: { k: 'truck', t: 'ac', gun: 34 } } },
  stug1: { spec: tank({ casemate: 1, L: 88, H: 13, th: 10, gun: 18, gt: 3.4, slope: 0.5 }), m: M('GER:三號突擊砲|SOV:SU-122 突擊砲|ITA:賽莫文特 75/18 突擊砲|JAP:一式砲戰車|HUN:茲里尼 II 突擊砲|USA:M8 斯科特自走榴彈砲|ENG:主教式自走砲'), o: { USA: { casemate: 0, open: 0, tw: 30, th: 9, gun: 14 } } },
  td1: { spec: tank({ casemate: 1, L: 92, H: 12, th: 10, gun: 34, slope: 0.7 }), m: M('GER:四號驅逐戰車|SOV:SU-85 驅逐戰車|USA:M10 狼獾驅逐戰車|ENG:阿基里斯驅逐戰車|ITA:賽莫文特 75/46|JAP:一式砲戰車'), o: { USA: { casemate: 0, tw: 32, th: 10 }, ENG: { casemate: 0, tw: 32, th: 10, gun: 42, muzzle: 1 } } },
  td2: { spec: tank({ casemate: 1, L: 98, H: 14, th: 11, gun: 44, slope: 0.9, muzzle: 1 }), m: M('GER:獵豹驅逐戰車|SOV:SU-100 驅逐戰車|USA:M36 傑克森驅逐戰車|ENG:射手式驅逐戰車|FIN:三號突擊砲（德援）'), o: { USA: { casemate: 0, tw: 34, th: 11 }, ENG: { open: 1 } } },
  td3: { spec: tank({ casemate: 1, L: 92, H: 11, th: 9, gun: 40, slope: 0.9 }), m: M('FRG:90 公釐砲驅逐戰車|SOV:ASU-85 空降自走砲|USA:M56 蠍式自走砲|JAP:60 式自走 106 公釐無反動砲|SWE:Pvkv m/43 驅逐戰車'), o: { USA: { open: 1, H: 8 } } },
  td4: { spec: { k: 'apc', tracks: 1, ifv: 1 }, m: M('USA:M901 改良型 TOW 飛彈車|SOV:9P148 反坦克飛彈車（BRDM-2）|FRG:美洲豹 1 反坦克飛彈車|ENG:FV102 打擊者反坦克飛彈車|FRA:VAB HOT 飛彈車'), o: { SOV: { k: 'truck', t: 'ac', ax: 2, gun: 10 }, FRA: { k: 'truck', t: 'ac', ax: 2, gun: 8 } } },
  ac1: { spec: truck({ t: 'ac', ax: 2, gun: 14, L: 84 }), m: M('GER:SdKfz 222 輕型裝甲車|SOV:BA-10 裝甲車|ENG:戴姆勒「丁哥」偵察車|USA:M3A1 偵察車|FRA:潘哈德 178 裝甲車|ITA:AB 41 裝甲車|JAP:九二式重裝甲車|POL:wz. 34 裝甲車|SWE:Pansarbil m/39 裝甲車'), o: { SOV: { ax: 3, gun: 22 }, ENG: { turret: 0 }, USA: { turret: 0 }, FRA: { gun: 20 } } },
  ac2: { spec: truck({ t: 'ac', ax: 4, gun: 30 }), m: M('GER:SdKfz 234/2「美洲獅」|USA:M8 灰狗裝甲車|ENG:戴姆勒裝甲車|SOV:BA-64 裝甲車|ITA:AB 43 裝甲車'), o: { USA: { ax: 3, gun: 18 }, ENG: { ax: 2, gun: 18 }, SOV: { ax: 2, gun: 8, L: 80 } } },
  ac3: { spec: truck({ t: 'ac', ax: 2, gun: 16, L: 88 }), m: M('SOV:BRDM-2 偵察裝甲車|ENG:費雷特偵察車|FRA:潘哈德 AML 裝甲車|USA:V-150 突擊隊員裝甲車|CHI:V-150 突擊隊員裝甲車|JAP:87 式偵察警戒車|FRG:豹貓偵察裝甲車|ISR:RAM 裝甲車'), o: { FRA: { gun: 30 }, FRG: { ax: 4, gun: 20 }, JAP: { ax: 3 } } },
  ac4: { spec: truck({ t: 'ac', ax: 4, gun: 14, L: 100 }), m: M('SOV:BTR-70 裝甲運兵車|USA:LAV-25 輪式裝甲車|FRA:VAB 輪式裝甲車|FRG:狐式輪式裝甲車|PRC:WZ-551 輪式裝甲車|ITA:菲亞特 6614 裝甲車|JAP:82 式指揮通信車|CHI:V-150 突擊隊員裝甲車'), o: { USA: { gun: 24 }, FRA: { ax: 2, turret: 0 }, FRG: { ax: 3, turret: 0 }, JAP: { ax: 3, turret: 0 }, ITA: { ax: 2 } } },
  sp1: { spec: tank({ L: 98, H: 17, tw: 30, th: 12, gun: 14, slope: 0.2, big: 1 }), m: M('ENG:邱吉爾鱷魚噴火坦克|USA:M4 雪曼 DD 兩棲坦克|SOV:OT-34 噴火坦克|GER:二號噴火坦克|JAP:特二式內火艇|ITA:L3 Lf 噴火坦克'), o: { USA: { L: 90, H: 15, round: 1, gun: 26, skirt: 1 } } },
  arv1: { spec: tank({ L: 96, H: 14, tw: 22, th: 8, gun: 8, slope: 0.8, tpos: 0.35 }), m: M('USA:M74 戰車救濟車|SOV:BTS-2 戰車救濟車|ENG:百夫長裝甲救濟車|FRG:救濟戰車 2 型|FRA:AMX-30D 戰車救濟車|JAP:78 式戰車回收車') },
  sp2: { spec: tank({ L: 98, H: 13, tw: 92, th: 4, gun: 4, slope: 0.6, tpos: 0.5, flat: 1 }), m: M('USA:M60 AVLB 架橋戰車|SOV:MTU-20 架橋戰車|ENG:酋長 AVLB 架橋戰車|FRG:海狸架橋戰車|FRA:AMX-30 架橋戰車|PRC:84 式架橋車|JAP:67 式戰車橋') },
  // ---------------------------------------------------------------- 卡車與兩棲
  mot1: { spec: truck({ t: 'cargo', ax: 2 }), m: M('GER:歐寶閃電卡車|SOV:GAZ-AA 卡車|USA:GMC CCKW 2½ 噸卡車|ENG:貝德福德 OY 卡車|JAP:九四式六輪自動貨車|ITA:飛雅特 626 卡車|FRA:雷諾 AHN 卡車|CHI:道奇卡車（滇緬公路）'), o: { USA: { ax: 3 }, JAP: { ax: 3 } } },
  mar2: { spec: boat({ t: 'lcvp', len: 76 }), m: M('USA:希金斯登陸艇（LCVP）|JAP:大發動艇|ENG:LCA 突擊登陸艇|GER:MFP 浮動駁船') },
  mar3: { spec: { k: 'apc', tracks: 1 }, m: M('USA:LVT-4 水牛兩棲車|ENG:LVT 水牛兩棲車|JAP:特四式內火艇|SOV:K-61 兩棲運輸車') },
  mar4: { spec: ship({ t: 'cv', len: 100 }), m: M('USA:硫磺島級兩棲突擊艦|ENG:阿爾比恩號突擊航艦|FRA:聖女貞德號直升機巡洋艦|SOV:伊萬·羅戈夫級大型登陸艦') },
  // ---------------------------------------------------------------- 飛機補充
  cvf1: { spec: plane({ len: 70, span: 56, chord: 15, wing: 'straight', taper: 0.6, eng: 'nose' }), m: M('USA:F4F 野貓式艦載戰鬥機|JAP:零式艦上戰鬥機|ENG:費爾利管鼻鸌艦載戰鬥機') },
  trn1: { spec: plane({ len: 78, span: 58, chord: 14, wing: 'straight', taper: 0.5, eng: 'twin' }), m: M('GER:Ju 52/3m 運輸機|USA:C-47 空中列車運輸機|SOV:Li-2 運輸機|JAP:零式輸送機|ITA:SM.75 運輸機|ENG:布里斯托爾邦貝運輸機|CHI:C-47 運輸機（中國航空公司）') },
  glider1: { spec: plane({ len: 64, span: 58, chord: 9, wing: 'straight', taper: 0.7, eng: 'none' }), m: M('GER:DFS 230 突擊滑翔機|ENG:空速霍莎滑翔機|USA:CG-4A 韋科滑翔機|SOV:A-7 滑翔機|JAP:ク-8 輸送滑空機') },
  trn2: { spec: plane({ len: 84, span: 58, chord: 13, wing: 'straight', taper: 0.5, eng: 'quad' }), m: M('USA:C-130 力士運輸機|SOV:An-12 運輸機|FRA:C-160 協同運輸機|FRG:C-160 協同運輸機|ENG:阿哥西運輸機|PRC:運-8 運輸機|JAP:C-1 運輸機|CHI:C-130H 力士運輸機|ITA:G.222 運輸機'), o: { FRA: { eng: 'twin' }, FRG: { eng: 'twin' }, JAP: { eng: 'twinjet', wing: 'swept' }, ITA: { eng: 'twin' } } },
  trn3: { spec: plane({ len: 96, span: 58, chord: 16, wing: 'swept', taper: 0.4, eng: 'eight' }), m: M('USA:C-5 銀河運輸機|SOV:Il-76 運輸機|ENG:VC10 C1 運輸機') },
  rec1: { spec: plane({ len: 60, span: 54, chord: 11, wing: 'straight', taper: 0.8, eng: 'nose' }), m: M('GER:Fi 156 鸛式聯絡機|USA:L-4 草蜢聯絡機|ENG:韋斯特蘭萊桑德聯絡機|SOV:Po-2 雙翼機|JAP:百式司令部偵察機|ITA:Ro.37 偵察機|FRA:Potez 63.11 偵察機'), o: { SOV: { bi: 1, taper: 1 }, JAP: { eng: 'twin', len: 74 }, FRA: { eng: 'twin', len: 72 } } },
  rec2: { spec: plane({ len: 70, span: 58, chord: 9, wing: 'straight', taper: 0.7, eng: 'none' }), m: M('USA:U-2 偵察機|SOV:MiG-25RB 偵察機|ENG:坎培拉 PR.9 偵察機|FRA:幻象 IIIR 偵察機|CHI:RF-104G 偵察機|ISR:RF-4E 偵察機'), o: { SOV: { len: 90, span: 40, chord: 20, wing: 'swept', taper: 0.4, twintail: 1 }, ENG: { eng: 'twinjet', len: 80 }, FRA: { wing: 'delta', span: 34, chord: 34, len: 84 }, CHI: { len: 86, span: 24, chord: 10 }, ISR: { len: 88, span: 40, chord: 22, wing: 'swept', taper: 0.35 } } },
  ew1: { spec: plane({ len: 84, span: 50, chord: 18, wing: 'swept', taper: 0.4 }), m: M('USA:EA-6B 徘徊者電戰機|SOV:Tu-16P 電子干擾機|ENG:獵迷 R.1 電子偵察機'), o: { SOV: { eng: 'twinjet', len: 94 }, ENG: { eng: 'quad', wing: 'straight' } } },
  hf1: { spec: plane({ len: 74, span: 58, chord: 14, wing: 'straight', taper: 0.5, eng: 'twin' }), m: M('GER:Bf 110 重型戰鬥機|USA:P-38 閃電式戰鬥機|ENG:布里斯托英俊戰士|JAP:二式複座戰鬥機「屠龍」|SOV:Pe-3 重型戰鬥機|FRA:Potez 631 重型戰鬥機|ITA:Ro.57 重型戰鬥機'), o: { USA: { twintail: 1 } } },
  nf1: { spec: plane({ len: 78, span: 58, chord: 14, wing: 'straight', taper: 0.5, eng: 'twin' }), m: M('GER:He 219 鴞式夜間戰鬥機|USA:P-61 黑寡婦夜間戰鬥機|ENG:蚊式 NF.XIII 夜間戰鬥機|JAP:夜間戰鬥機「月光」'), o: { USA: { twintail: 1 } } },
  int1: { spec: plane({ len: 84, span: 52, chord: 16, wing: 'straight', taper: 0.6, eng: 'twinjet' }), m: M('USA:F-89 蠍式截擊機|SOV:Yak-25 截擊機|ENG:格羅斯特標槍截擊機|FRA:SO.4050 禿鷹 IIN|CAN:CF-100 加拿大人截擊機'), o: { ENG: { wing: 'delta', eng: 'none', span: 48, chord: 36 } } },
  int2: { spec: plane({ len: 92, span: 40, chord: 36, wing: 'delta' }), m: M('USA:F-106 三角標槍截擊機|SOV:MiG-25P「狐蝠」截擊機|ENG:閃電 F.6 截擊機|PRC:殲-8 截擊機|SWE:薩博 J35F「龍」|CAN:CF-101 巫毒'), o: { SOV: { wing: 'swept', span: 42, chord: 22, taper: 0.4, twintail: 1 }, ENG: { wing: 'swept', span: 36, chord: 22, taper: 0.4 }, PRC: { span: 34 } } },
  vtol1: { spec: plane({ len: 80, span: 34, chord: 18, wing: 'swept', taper: 0.4 }), m: M('ENG:霍克西德利獵鷹式|SOV:Yak-38 鐵匠式|USA:AV-8A 獵鷹式|SPA:AV-8S 鬥牛士') },
  hel_utl: { spec: heli({}), m: M('USA:UH-1 休伊通用直升機|SOV:Mi-8 河馬直升機|ENG:威斯特蘭威塞克斯直升機|FRA:雲雀 III 直升機|FRG:UH-1D 直升機|PRC:直-5 直升機|JAP:UH-1H 直升機（富士）|CHI:UH-1H 休伊直升機|ITA:AB 204 直升機|ISR:貝爾 205 直升機') },
  hel_trn: { spec: heli({ tandem: 1 }), m: M('USA:CH-47 契努克運輸直升機|SOV:Mi-6 吊鉤直升機|ENG:CH-47 契努克運輸直升機|FRA:SA 321 超級黃蜂|JAP:KV-107 直升機|FRG:CH-53G 海上種馬|ITA:CH-47C 契努克|CHI:CH-47SD 契努克'), o: { SOV: { tandem: 0 }, FRA: { tandem: 0 }, FRG: { tandem: 0 } } },
  air_awacs: { spec: plane({ len: 90, span: 58, chord: 14, wing: 'swept', taper: 0.4, eng: 'eight', dome: 1 }), m: M('USA:E-3 哨兵預警機|SOV:A-50 支柱預警機|JAP:E-2C 鷹眼預警機|ISR:E-2C 鷹眼預警機|FRA:E-3F 哨兵預警機|CHI:E-2T 鷹眼預警機'), o: { JAP: { len: 70, wing: 'straight', eng: 'twin', taper: 0.7 }, ISR: { len: 70, wing: 'straight', eng: 'twin', taper: 0.7 }, CHI: { len: 70, wing: 'straight', eng: 'twin', taper: 0.7 } } },
  air_refuel: { spec: plane({ len: 92, span: 58, chord: 15, wing: 'swept', taper: 0.4, eng: 'eight' }), m: M('USA:KC-135 同溫層加油機|SOV:3MS-2 空中加油機|ENG:勝利者 K.2 加油機|FRA:C-135F 加油機'), o: { ENG: { eng: 'none' } } },
  air_stealth: { spec: plane({ len: 82, span: 50, chord: 44, wing: 'delta' }), m: M('USA:F-117 夜鷹匿蹤攻擊機') },
  // ---------------------------------------------------------------- 艦艇補充
  ca1: { spec: ship({ t: 'dd', len: 104 }), m: M('GER:希佩爾海軍上將級重巡洋艦|JAP:高雄型重巡洋艦|USA:新奧爾良級重巡洋艦|ENG:郡級重巡洋艦|ITA:札拉級重巡洋艦|FRA:阿爾及利亞號重巡洋艦|SOV:基洛夫級巡洋艦|SPA:加那利群島號重巡洋艦') },
  cl1: { spec: ship({ t: 'dd', len: 98 }), m: M('USA:布魯克林級輕巡洋艦|ENG:城級輕巡洋艦|JAP:最上型巡洋艦|GER:柯尼斯堡級輕巡洋艦|ITA:蒙特庫科利級輕巡洋艦|FRA:拉加利索尼埃級輕巡洋艦|SOV:恰巴耶夫級巡洋艦|CHI:寧海號巡洋艦|HOL:德·魯伊特號輕巡洋艦') },
  ca2: { spec: ship({ t: 'dd', len: 106 }), m: M('USA:巴爾的摩級重巡洋艦|ENG:斐濟級輕巡洋艦|JAP:阿賀野型巡洋艦|CHI:重慶號巡洋艦|SOV:斯維爾德洛夫級巡洋艦') },
  cg1: { spec: ship({ t: 'cv', len: 96 }), m: M('FRA:聖女貞德號直升機巡洋艦|ITA:維托里奧·威尼托號直升機巡洋艦|SOV:莫斯科級直升機巡洋艦|JAP:榛名型護衛艦|ENG:虎級巡洋艦（直升機改裝）') },
  dd1: { spec: ship({ t: 'dd', len: 84 }), m: M('GER:1934 型驅逐艦|JAP:吹雪型驅逐艦|USA:法拉格特級驅逐艦|ENG:部族級驅逐艦|SOV:憤怒級驅逐艦（7 型）|ITA:士兵級驅逐艦|FRA:空想級大型驅逐艦|POL:雷霆級驅逐艦') },
  esc1: { spec: ship({ t: 'dd', len: 70 }), m: M('ENG:花級護衛艦|USA:巴克利級護航驅逐艦|JAP:鵜來型海防艦|CAN:花級護衛艦|GER:F 型護衛艇') },
  dd2: { spec: ship({ t: 'dd', len: 92 }), m: M('USA:弗萊徹級驅逐艦|JAP:秋月型驅逐艦|ENG:戰役級驅逐艦|GER:1936A 型驅逐艦（納爾維克級）|SOV:7U 型驅逐艦') },
  dd3: { spec: ship({ t: 'dd', len: 92 }), m: M('USA:福雷斯特·謝爾曼級驅逐艦|SOV:斯科雷級驅逐艦|ENG:勇敢級驅逐艦|FRA:T 47 級驅逐艦|PRC:鞍山級驅逐艦|JAP:春風型護衛艦|CHI:陽字號驅逐艦|HOL:荷蘭級驅逐艦|SWE:哈蘭級驅逐艦') },
  dd4: { spec: ship({ t: 'dd', len: 96, missile: 1 }), m: M('USA:亞當斯級飛彈驅逐艦|SOV:卡辛級驅逐艦|ENG:郡級飛彈驅逐艦|FRA:絮弗倫級飛彈驅逐艦|PRC:旅大級驅逐艦|FRG:呂特晏斯級驅逐艦|JAP:天津風號護衛艦|AST:珀斯級驅逐艦|CHI:陽字號驅逐艦（武進三號改裝）') },
  ff1: { spec: ship({ t: 'dd', len: 86, missile: 1 }), m: M('USA:派里級巡防艦|SOV:克里瓦克級巡防艦|ENG:22 型大刀級巡防艦|FRG:不來梅級巡防艦|FRA:喬治·萊格級驅逐艦|ITA:西北風級巡防艦|PRC:江滬級護衛艦|HOL:柯特納爾級巡防艦|JAP:初雪型護衛艦|CHI:成功級巡防艦') },
  dd5: { spec: ship({ t: 'dd', len: 100, missile: 1 }), m: M('SOV:現代級驅逐艦|USA:斯普魯恩斯級驅逐艦|ENG:42 型雪菲爾級驅逐艦|FRA:卡薩爾級驅逐艦|JAP:旗風型護衛艦|ITA:杜蘭德·德拉·佩內級驅逐艦|PRC:旅大 II 型驅逐艦') },
  pt1: { spec: boat({ t: 'pt', len: 70 }), m: M('GER:S 艇（快速魚雷艇）|USA:PT 魚雷艇|ENG:MTB 魚雷快艇|ITA:MAS 魚雷快艇|SOV:G-5 魚雷艇|JAP:甲型魚雷艇') },
  ss_mini: { spec: ship({ t: 'ss', len: 60 }), m: M('JAP:甲標的袖珍潛艇|ENG:X 艇袖珍潛艇|ITA:SLC 人操魚雷「豬」|GER:海豹型袖珍潛艇') },
  lst1: { spec: boat({ t: 'lst', len: 100 }), m: M('USA:LST-1 級戰車登陸艦|ENG:LST(2) 戰車登陸艦|JAP:第百一號型輸送艦|GER:MFP 浮動駁船|CHI:中字號戰車登陸艦') },
  msl1: { spec: boat({ t: 'msl', len: 74 }), m: M('SOV:黃蜂級飛彈快艇|PRC:021 型飛彈快艇|ISR:薩爾 3 級飛彈快艇|FRG:虎級飛彈快艇（148 型）|CHI:海鷗級飛彈快艇|EGY:蚊子級飛彈快艇|FRA:戰士 II 級飛彈快艇|NOR:風暴級飛彈快艇') },
  lpd1: { spec: boat({ t: 'lst', len: 108 }), m: M('USA:奧斯汀級船塢登陸艦|ENG:無畏級船塢登陸艦|SOV:伊萬·羅戈夫級大型登陸艦|FRA:奧拉日級船塢登陸艦|PRC:玉康級坦克登陸艦|JAP:三浦型戰車登陸艦') },
  cve1: { spec: ship({ t: 'cv', len: 84 }), m: M('USA:博格級護航航艦|ENG:攻擊者級護航航艦|JAP:大鷹型航空母艦') },
  cvl1: { spec: ship({ t: 'cv', len: 92 }), m: M('USA:獨立級輕型航艦|ENG:巨人級輕型航艦|JAP:千歲型航空母艦|ITA:天鷹號航空母艦|HOL:卡雷爾·多爾曼號航艦|AST:雪梨號航艦') },
  cvv1: { spec: ship({ t: 'cv', len: 100 }), m: M('ENG:無敵級航空母艦|SOV:基輔級航空巡洋艦|ITA:加里波底號航空母艦|SPA:阿斯圖里亞斯親王號航空母艦|USA:塔拉瓦級兩棲突擊艦') },
  ss_long: { spec: ship({ t: 'ss', len: 106 }), m: M('GER:IXC 型 U 艇|USA:甘托級潛艇|JAP:海大七型潛水艦|ENG:泰晤士級潛艇|ITA:卡爾維級潛艇|FRA:可畏級潛艇|SOV:K 級潛艇') },
  ss_diesel: { spec: ship({ t: 'ss', len: 98 }), m: M('SOV:基洛級潛艇|FRG:209 型潛艇|ENG:奧伯龍級潛艇|FRA:阿戈斯塔級潛艇|JAP:夕潮型潛艇|HOL:旗魚級潛艇|PRC:明級潛艇|CHI:海龍級潛艇|ISR:加爾級潛艇|SWE:納肯級潛艇') },
  // ---------------------------------------------------------------- 火箭與飛彈
  rkt1: { spec: msl({ t: 'v2', L: 84, th: 11 }), m: M('GER:A-4 試驗火箭') },
  rkt2: { spec: msl({ t: 'v2' }), m: M('GER:V-2 火箭（A-4）|SOV:R-1 彈道飛彈（V-2 仿製）|USA:V-2 試射（白沙飛彈靶場）') },
  rkt3: { spec: msl({ t: 'icbm', L: 98, th: 10 }), m: M('SOV:R-5 中程彈道飛彈|USA:PGM-17 雷神中程彈道飛彈|ENG:雷神飛彈（美製部署）|FRA:S2 中程彈道飛彈|PRC:東風-2 中程彈道飛彈|ISR:傑里科 II 彈道飛彈') },
  icbm: { spec: msl({ t: 'icbm', L: 110, th: 11 }), m: M('SOV:R-7 洲際彈道飛彈|USA:SM-65 擎天神洲際彈道飛彈|PRC:東風-5 洲際彈道飛彈') },
  mirv: { spec: msl({ t: 'icbm', L: 108, th: 12 }), m: M('USA:LGM-30G 民兵 III 洲際彈道飛彈|SOV:R-36M（SS-18「撒旦」）|ENG:北極星 A3TK「雪佛蘭」|FRA:M4 潛射彈道飛彈|PRC:東風-5A 洲際彈道飛彈') },
  v1: { spec: msl({ t: 'v1', L: 90, th: 7 }), m: M('GER:V-1 飛行炸彈（Fi 103）|USA:JB-2 共和-福特飛彈|SOV:10Kh 巡弋飛彈|JAP:櫻花特攻機') },
  tbm1: { spec: truck({ t: 'tel', ax: 4 }), m: M('SOV:R-17「飛毛腿」（SS-1）|USA:MGM-29 中士飛彈|FRA:冥王星戰術飛彈|ISR:傑里科 I 彈道飛彈|CHI:青蜂飛彈|EGY:R-17「飛毛腿」'), o: { FRA: { tracks: 1 } } },
  cm1: { spec: msl({ t: 'cruise', L: 96, th: 8 }), m: M('USA:SSM-N-8 天獅星巡弋飛彈|SOV:P-5「火山」巡弋飛彈|ENG:藍鋼空射飛彈|PRC:海鷹-1 反艦飛彈') },
  tbm2: { spec: truck({ t: 'tel', ax: 4 }), m: M('SOV:OTR-21「圓點」戰術飛彈|USA:MGM-31 潘興 II 飛彈|FRA:冥王星戰術飛彈|FRG:潘興 IA 飛彈'), o: { SOV: { ax: 3 }, FRA: { tracks: 1 } } },
  cm2: { spec: msl({ t: 'cruise', L: 106, th: 7 }), m: M('USA:BGM-109 戰斧巡弋飛彈|SOV:Kh-55 巡弋飛彈|FRA:ASMP 空射巡弋飛彈') },
  nav_ssm: { spec: msl({ t: 'ssm', L: 96, th: 8 }), m: M('SOV:P-15「冥河」反艦飛彈|USA:RGM-84 魚叉反艦飛彈|FRA:MM38 飛魚反艦飛彈|ISR:迦伯列反艦飛彈|ITA:奧托馬特反艦飛彈|NOR:企鵝反艦飛彈|PRC:海鷹-2 反艦飛彈|CHI:雄風一型反艦飛彈|JAP:88 式地對艦誘導彈|ENG:飛魚反艦飛彈|FRG:飛魚反艦飛彈|EGY:P-15「冥河」'), o: { SOV: { t: 'cruise' }, PRC: { t: 'cruise' }, EGY: { t: 'cruise' } } },
  nav_sam: { spec: msl({ t: 'aam', L: 92, th: 6 }), m: M('USA:RIM-2 小獵犬艦載防空飛彈|SOV:M-1「窩瓦河」（SA-N-1）|ENG:海貓艦載防空飛彈|FRA:瑪蘇卡艦載防空飛彈|HOL:小獵犬艦載防空飛彈|JAP:韃靼人艦載防空飛彈') },
  air_aam: { spec: msl({ t: 'aam', L: 90, th: 4.5 }), m: M('USA:AIM-9 響尾蛇空對空飛彈|SOV:K-13（AA-2「環礁」）|FRA:馬特拉 R.530 空對空飛彈|ENG:火光空對空飛彈|PRC:霹靂-2 空對空飛彈|ISR:沙夫利爾 2 空對空飛彈|CHI:AIM-9 響尾蛇（美援）|SWE:Rb 24 空對空飛彈') },
  air_pgm: { spec: msl({ t: 'ssm', L: 80, th: 9 }), m: M('USA:GBU-10「鋪路」雷射導引炸彈|SOV:KAB-500L 雷射導引炸彈|ENG:鋪路 II 雷射導引炸彈') },
};

// 各國坦克的設計風格（蘇聯傾斜裝甲與圓砲塔、美國較高的車體……）
const TANK_STYLE = {
  SOV: { round: 1, slope: 0.25 }, USA: { round: 1, H: 1 }, GER: { round: 0 }, ENG: { round: 0, L: 4 }, JAP: { L: -6, round: 0 },
  FRA: { round: 1 }, ITA: { L: -4 }, PRC: { round: 1, slope: 0.2 }, FRG: { round: 0 }, ISR: { tpos: 0.32 },
};
function specFor(def, tag) {
  let s = def.spec;
  if (def.o && def.o[tag]) s = { ...s, ...def.o[tag] };
  if (s.k === 'tank' && TANK_STYLE[tag]) {
    const st = TANK_STYLE[tag], o = { ...s };
    for (const k in st) o[k] = typeof st[k] === 'number' && k !== 'round' && k !== 'tpos' ? (s[k] || 0) + st[k] : st[k];
    s = o;
  }
  return s;
}
const IDEO_DEFAULT = { com: ['SOV', 'PRC'], fas: ['GER', 'ITA', 'JAP'], dem: ['USA', 'ENG', 'FRA'], neu: ['USA', 'ENG', 'FRA', 'SOV'] };
const COMMONWEALTH = ['CAN', 'AST', 'NZL', 'SAF', 'RAJ'];
// 某國在某項科技對應的型號：{ name, from（型號來源國）, spec }
export function modelFor(S, tag, id) {
  const def = MODELS[id]; if (!def) return null;
  if (def.m[tag]) return { name: def.m[tag], from: tag, spec: specFor(def, tag) };
  const cands = [];
  const C = S && S.C && S.C[tag];
  if (C) {
    if (C.subj) cands.push(C.subj);
    if (C.fac && S.fac[C.fac]) { const F = S.fac[C.fac]; cands.push(F.leader, ...(F.members || [])); }
    for (const k in (S.lend || {})) { const [a, b] = k.split('>'); if (b === tag) cands.push(a); }
    if (COMMONWEALTH.includes(tag) && yearOf(S.day) < 1965) cands.push('ENG');
    cands.push(...(IDEO_DEFAULT[C.ideo] || []));
  }
  cands.push(...Object.keys(def.m));
  for (const t of cands) if (def.m[t]) return { name: def.m[t], from: t, spec: specFor(def, t) };
  return null;
}
// 兵種與其型號科技（依年代排列）；沒有研究任何型號科技時使用 base
export const UNIT_LINES = {
  ltk: ['lt1', 'lt2', 'lt3', 'lt4'], arm: ['mt1', 'mt2', 'mt3'], htk: ['ht1', 'ht2', 'ht3', 'ht4'], mbt: ['mbt1', 'mbt2', 'mbt3', 'mbt4', 'mbt5', 'mbt6'],
  mec: ['mech1', 'mech2', 'mech3', 'mech4'], ftr: ['f0', 'f1', 'f2', 'f3'], jet: ['jet1', 'jet2', 'jet3', 'jet4', 'jet5', 'jet6'],
  cas: ['cas1', 'cas2', 'cas3', 'cas4', 'cas5'], bmb: ['tac1', 'tac2', 'tac3', 'tac4', 'tac5'], str: ['str1', 'str2', 'str3', 'str4', 'str5', 'str6'],
  nvb: ['nvb1', 'nvb2', 'nvb3', 'nvb4'], hel: ['hel2', 'hel3'], flt: ['bb1', 'bb2', 'bb3', 'bb4', 'bb5', 'bb6'], car: ['cv1', 'cv2', 'cv3', 'cv4', 'cv5', 'cv6'], sub: ['ss1', 'ss2', 'ss3', 'ss4', 'ss5', 'ss6'],
};
const BASE_IDS = new Set(['f0', 'bb1', 'ss1']);
// 某國某兵種目前的型號（最新已研究的型號科技）
export function unitModel(S, tag, type, hasTech) {
  const line = UNIT_LINES[type]; if (!line) return null;
  let id = null;
  for (const t of line) if (BASE_IDS.has(t) || (hasTech && hasTech(t))) id = t;
  return id ? modelFor(S, tag, id) : null;
}
