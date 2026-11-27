// 歷史型號：坦克、裝甲車、飛機、直升機與艦艇科技在各國的代表型號。
// 某國沒有自行研製的型號時，依序改用：宗主國 → 同陣營國家 → 提供軍援的國家 → 大英國協的英國 → 同意識形態的大國。
// 剪影 spec 由 ui/icons.js 依參數繪製（各國坦克依設計風格略作調整）。
import { yearOf } from '../core/util.js';

const M = (s) => Object.fromEntries(s.split('|').map(x => { const i = x.indexOf(':'); return [x.slice(0, i), x.slice(i + 1)]; }));
const tank = (o) => ({ k: 'tank', ...o });
const plane = (o) => ({ k: 'plane', ...o });
const ship = (o) => ({ k: 'ship', ...o });

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
