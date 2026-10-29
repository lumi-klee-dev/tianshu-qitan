/* 《天书奇谭》原型数据 — 机制借鉴公开玩法，原创实现，非官方客户端 */
window.TSQ = window.TSQ || {};

// 附录 P1.3：宠物天赋数值常量表（⚙ 暂定）——所有百分比集中在这里，UI 会标「(⚙暂定)」，便于后续一次性替换
const PET_TALENT_VALUES = {
  life_bless: { hp_pct: 0.08 },                          // 生命祝福：生命上限 +8%
  meditation: { mp_regen: 8 },                           // 冥想：每回合回法力
  xianfeng: { pri_pct: { con: 0.15, agi: 0.15 } },       // 仙风道骨：耐力/敏捷 +15%
  jiaojian: { dr_pct: 0.12, firstBonus: 0.1 },           // 天赐矫健：受击 -12%，先手加成 +10%
  manli_talent: { patk_pct: 0.15 },                      // 天生蛮力：物攻 +15%
  manli: { patk_pct: 0.08 },                             // 蛮力：物攻 +8%
  shixue: { lifesteal: 0.10 }                            // 嗜血：吸血 10%
};

TSQ.DATA = {
  title: "天书奇谭",
  subtitle: "文字界面试玩 · 原创 IP 占位美术",
  primaryNames: { str: "强壮", con: "耐力", agi: "敏捷", int: "智力", fai: "信仰" },
  secondaryNames: {
    hp: "生命", mp: "法力", rage: "怒气", spd: "速度", regen: "恢复",
    patk: "物攻", pdef: "物防", matk: "法攻", mdef: "法防",
    pcrit: "物理暴击", mcrit: "法术暴击", pdodge: "物理闪避", mdodge: "法术闪避"
  },
  conversion: {
    str: { hp: 2, mp: 2, rage: 2, spd: 0.2, regen: -0.2, patk: 2.2, pdef: 0.2 },
    con: { hp: 24, mp: 1, rage: 8, spd: 0.2, regen: 0.8, patk: 0.1, pdef: 0.1, mdef: 2.2 },
    agi: { hp: 3, mp: 2, rage: 2, spd: 2, regen: 0.2, patk: 0.2, pdef: 0.2 },
    int: { hp: 1, mp: 10, rage: 2, spd: 0.1, regen: -0.3, patk: 0.1, pdef: 0.1, matk: 1.7 },
    fai: { hp: 3, mp: 2, rage: 12, spd: 0.2, regen: -0.1, patk: 0.2, pdef: 2.2 }
  },
  classes: {
    xiake: { name: "侠客", desc: "近战坦克/输出", element: "玄",
      base: { str: 14, con: 12, agi: 10, int: 6, fai: 8 },
      coef: { pdodge: 1, pcrit: 3.5, mdodge: 1, mcrit: 2.2 }, main: "patk",
      skills: ["fumo", "lengchao"] },
    cike: { name: "刺客", desc: "高速物理爆发", element: "毒",
      base: { str: 12, con: 9, agi: 15, int: 6, fai: 8 },
      coef: { pdodge: 1.87, pcrit: 5, mdodge: 0.5, mcrit: 1.5 }, main: "patk",
      skills: ["qianzhu", "jiying"] },
    shushi: { name: "术士", desc: "法攻与控制", element: "火",
      base: { str: 6, con: 9, agi: 9, int: 16, fai: 10 },
      coef: { pdodge: 0.5, pcrit: 1.5, mdodge: 1, mcrit: 2.2 }, main: "matk",
      skills: ["sixiang", "shehun"] },
    xiuzhen: { name: "修真", desc: "治疗护盾辅助", element: "冰",
      base: { str: 6, con: 11, agi: 8, int: 14, fai: 11 },
      coef: { pdodge: 1, pcrit: 2.2, mdodge: 1.87, mcrit: 3.5 }, main: "matk",
      skills: ["cibei", "tiandi"] }
  },
  // v0.5 说明：下面前 8 条是「人物技能」的旧 id，已迁到 js/skill-data.js（4 职业 × 8 系新 id）。
  // 映射关系见 TSQ.SkillData.legacyMap，运行时也挂在 TSQ.DATA.legacySkillMap（由 js/skill.js 填充）。
  // 人物技能不再走这里；宠物技能（siyao/lizhua/manli/shixue 等）仍在此表，pet.js 依赖，保持不变。
  skills: {
    fumo: { name: "伏魔刀法", mult: 1.4, cost: 8, dmg: "phys", desc: "单体物理，几率击晕（旧 id，已迁移）" },
    lengchao: { name: "冷嘲热讽", mult: 0, cost: 8, dmg: "phys", desc: "嘲讽敌人" },
    qianzhu: { name: "千蛛手", mult: 1.3, cost: 8, dmg: "phys", desc: "破甲物理" },
    jiying: { name: "疾影", mult: 1.2, cost: 6, dmg: "phys", desc: "高速连击" },
    sixiang: { name: "四象焚天", mult: 1.5, cost: 12, dmg: "magic", desc: "强力法术" },
    shehun: { name: "摄魂", mult: 0.8, cost: 10, dmg: "magic", desc: "法术并减速" },
    cibei: { name: "慈悲", mult: 0, cost: 10, dmg: "heal", desc: "治疗自身" },
    tiandi: { name: "天地同寿", mult: 0, cost: 12, dmg: "buff", desc: "护盾增益" },
    siyao: { name: "撕咬", mult: 1.2, cost: 0, dmg: "phys", desc: "宠物普攻强化" },
    lizhua: { name: "利爪", mult: 1.15, cost: 0, dmg: "phys", desc: "宠物爪击" },
    manli: { name: "蛮力", mult: 0, cost: 0, dmg: "passive", desc: "被动：物攻提升" },
    shixue: { name: "嗜血", mult: 0, cost: 0, dmg: "passive", desc: "被动：吸血" }
  },
  slots: {
    weapon: "武器", helmet: "头盔", armor: "铠甲", boots: "靴子",
    ring1: "戒指1", ring2: "戒指2", feather: "羽毛", amulet: "饰品"
  },
  quality: {
    broken: { name: "破碎", mult: 0.6, color: "#888" },
    normal: { name: "普通", mult: 1.0, color: "#ddd" },
    fine: { name: "优秀", mult: 1.15, color: "#7ec87e" },
    perfect: { name: "完美", mult: 1.3, color: "#6ec0ff" },
    radiant: { name: "光芒", mult: 1.5, color: "#c9a0ff" },
    spirit: { name: "灵品", mult: 1.7, color: "#ff9ad5" },
    mystic: { name: "玄品", mult: 1.9, color: "#ffb84d" },
    divine: { name: "神品", mult: 2.2, color: "#ff6b6b" }
  },
  itemColors: {
    white: { name: "白色", n: 0 }, green: { name: "绿色", n: 2 },
    blue: { name: "蓝色", n: 3 }, purple: { name: "紫色", n: 4 }, orange: { name: "橙色", n: 5 }
  },
  holeColors: {
    pink: { name: "粉红", css: "#ff7eb9", gems: ["tian_shou", "tian_su"] },
    purple: { name: "淡紫", css: "#b388ff", gems: ["wu_gong", "fa_gong"] },
    yellow: { name: "鹅黄", css: "#ffe082", gems: ["wu_shan"] },
    blue: { name: "天蓝", css: "#80d8ff", gems: ["fa_shan"] }
  },
  gems: {
    tian_shou: { name: "天寿石", stat: "con", per: [0, 3, 5, 9, 16, 28] },
    tian_su: { name: "天速石", stat: "agi", per: [0, 3, 5, 9, 16, 28] },
    wu_gong: { name: "物攻石", stat: "patk", per: [0, 8, 14, 25, 45, 80] },
    fa_gong: { name: "法攻石", stat: "matk", per: [0, 8, 14, 25, 45, 80] },
    wu_shan: { name: "物闪石", stat: "pdodge", per: [0, 5, 9, 16, 28, 50] },
    fa_shan: { name: "法闪石", stat: "mdodge", per: [0, 5, 9, 16, 28, 50] }
  },
  affixes: [
    { id: "hp", name: "生命", stat: "hp", range: [20, 80] },
    { id: "mp", name: "法力", stat: "mp", range: [15, 50] },
    { id: "patk", name: "物攻", stat: "patk", range: [5, 25] },
    { id: "matk", name: "法攻", stat: "matk", range: [5, 25] },
    { id: "pdef", name: "物防", stat: "pdef", range: [5, 20] },
    { id: "mdef", name: "法防", stat: "mdef", range: [5, 20] },
    { id: "spd", name: "速度", stat: "spd", range: [2, 12] },
    { id: "str", name: "强壮", stat: "str", range: [1, 5] },
    { id: "con", name: "耐力", stat: "con", range: [1, 5] },
    { id: "agi", name: "敏捷", stat: "agi", range: [1, 5] },
    { id: "int", name: "智力", stat: "int", range: [1, 5] },
    { id: "fai", name: "信仰", stat: "fai", range: [1, 5] }
  ],
  templates: [
    { id: "wuxia_blade", name: "无尚之刃", slot: "weapon", level: 1, base: { patk: 18 }, classes: ["xiake"], icon: "⚔" },
    { id: "wuxia_fan", name: "无尚玉扇", slot: "weapon", level: 1, base: { matk: 15, mdef: 5 }, classes: ["xiuzhen"], icon: "扇" },
    { id: "zijin_helm", name: "紫金盔", slot: "helmet", level: 1, base: { pdef: 8, hp: 30 }, icon: "⛑" },
    { id: "zijin_armor", name: "紫金铠", slot: "armor", level: 1, base: { pdef: 12, mdef: 8, hp: 50 }, icon: "🛡" },
    { id: "zijin_boots", name: "紫金靴", slot: "boots", level: 1, base: { pdef: 6, spd: 5 }, icon: "👢" },
    { id: "guanxin_ring", name: "观心戒指", slot: "ring1", level: 10, base: { hp: 40 }, max_holes: 10, icon: "💍" },
    { id: "jade_ring", name: "青玉戒", slot: "ring1", level: 4, base: { matk: 8, int: 2 }, max_holes: 4, icon: "💍" },
    { id: "feather_110", name: "灵羽·初", slot: "feather", level: 12, base: { mp: 40, matk: 10, patk: 10 }, icon: "🪶" },
    { id: "wolf_fang", name: "狼牙坠", slot: "amulet", level: 3, base: { patk: 6, spd: 3 }, icon: "◆" },
    { id: "wood_sword", name: "木剑", slot: "weapon", level: 1, base: { patk: 8 }, icon: "🗡" },
    { id: "cloth_robe", name: "布袍", slot: "armor", level: 1, base: { pdef: 5, mdef: 5, hp: 20 }, icon: "👕" },
    { id: "mercy_pearl", name: "慈悲之力", slot: "amulet", level: 10, base: { int: 15, con: 12, fai: 12, hp: 180, matk: 40 }, max_holes: 8, icon: "●", note: "神性灵魂精粹共鸣（原创占位）" },
    { id: "shadow_boots", name: "影步靴", slot: "boots", level: 5, base: { spd: 10, agi: 3 }, icon: "👟" },
    { id: "iron_helm", name: "铁盔", slot: "helmet", level: 3, base: { pdef: 10, hp: 25 }, icon: "⛑" }
  ],
  consumables: {
    hp_potion_s: { name: "小回血丹", effect: "heal_hp", value: 60, icon: "红" },
    mp_potion_s: { name: "小回蓝丹", effect: "heal_mp", value: 40, icon: "蓝" },
    star_stone: { name: "升星宝石", effect: "star_up", value: 1, icon: "★" },
    life_stone: { name: "生命石", effect: "mingke", value: 1, icon: "心" },
    hole_drill: { name: "打孔器", effect: "drill", value: 1, icon: "孔" },
    gem_bag: { name: "一级宝石袋", effect: "random_gem", value: 1, icon: "袋" },
    catch_scroll: { name: "唤妖符", effect: "catch", value: 1, icon: "符" },
    pet_food: { name: "宠粮", effect: "pet_loyalty", value: 20, icon: "粮" },
    apt_pill: { name: "资质丹", effect: "apt_boost", value: 2, icon: "丹" }
  },
  growthRates: {
    common: { name: "普通", mult: 1.0 },
    fine: { name: "优秀", mult: 1.2 },
    great: { name: "杰出", mult: 1.35 },
    excellent: { name: "卓越", mult: 1.5 },
    perfect: { name: "完美", mult: 1.7 }
  },
  // 宠物天赋（v0.4）：effect 里的字段直接进战斗公式，见 js/pet.js 顶部注释
  // 文案与数值对齐官网神兽系「可获得天赋」表（星澜飞骥截图）
  // 附录 P1.3：数值统一取自 PET_TALENT_VALUES（⚙ 暂定），改那一处即可
  petTalentValues: PET_TALENT_VALUES,
  petTalents: {
    life_bless: { name: "生命祝福", desc: "被动技能，生命上限上升 +8%", effect: { hp_pct: PET_TALENT_VALUES.life_bless.hp_pct } },
    meditation: { name: "冥想", desc: "被动技能，每回合恢复法力", effect: { mp_regen: PET_TALENT_VALUES.meditation.mp_regen } },
    xianfeng: { name: "仙风道骨", desc: "被动技能，耐力、敏捷大幅提升 +15%", effect: { pri_pct: PET_TALENT_VALUES.xianfeng.pri_pct } },
    jiaojian: { name: "天赐矫健", desc: "被动技能，物理和法术闪避上升（受击 -12%）", effect: { dr_pct: PET_TALENT_VALUES.jiaojian.dr_pct, firstBonus: PET_TALENT_VALUES.jiaojian.firstBonus } },
    manli_talent: { name: "天生蛮力", desc: "被动技能，物理攻击上升 +15%", effect: { patk_pct: PET_TALENT_VALUES.manli_talent.patk_pct } },
    manli: { name: "蛮力", desc: "被动：物攻 +8%", effect: { patk_pct: PET_TALENT_VALUES.manli.patk_pct } },
    shixue: { name: "嗜血", desc: "被动：攻击附带 10% 吸血", effect: { lifesteal: PET_TALENT_VALUES.shixue.lifesteal } }
  },
  // 资质展示顺序：耐力/强壮/信仰/敏捷/智力
  aptOrder: ["con", "str", "fai", "agi", "int"],
  petSpecies: [
    { id: "huiyetu", name: "灰野兔", type: "野兽", tier: "野兽", atk_type: "phys",
      skills: ["siyao"], talent: ["manli", "shixue"],
      apt: { str: [40, 65], con: [25, 45], agi: [55, 85], int: [10, 30], fai: [10, 25] },
      doodle: "兔", source: "北影月森林 · 唤妖符捕捉" },
    { id: "mao", name: "猫", type: "野兽", tier: "野兽", atk_type: "phys",
      skills: ["lizhua"], talent: ["manli"],
      apt: { str: [40, 65], con: [40, 65], agi: [40, 65], int: [10, 30], fai: [10, 25] },
      doodle: "猫", source: "北影月森林 · 唤妖符捕捉" },
    { id: "baiyang", name: "白羊", type: "野兽", tier: "野兽", atk_type: "phys",
      skills: ["siyao"], talent: ["manli"],
      apt: { str: [35, 60], con: [45, 70], agi: [30, 50], int: [15, 35], fai: [15, 30] },
      doodle: "羊", source: "东影月森林 · 唤妖符捕捉" },
    { id: "xiaojinlong", name: "小金龙", type: "神兽", tier: "神兽", atk_type: "phys",
      skills: ["siyao"], talent: ["shixue"],
      apt: { str: [60, 90], con: [50, 80], agi: [50, 80], int: [40, 70], fai: [40, 70] },
      doodle: "龙", source: "神兽礼包 / 活动兑换（占位）" },
    // 神兽「星澜飞骥」：资质区间与天赋取自官网神兽系资料，立绘用 refs 参考图占位
    { id: "xinglanfeiji", name: "星澜飞骥", type: "神兽", tier: "神兽", atk_type: "phys",
      skills: ["siyao", "lizhua"],
      talent: ["life_bless", "meditation", "xianfeng", "jiaojian", "manli_talent"],
      apt: { con: [2750, 4850], str: [4750, 9250], fai: [2500, 4300], agi: [4750, 9250], int: [2500, 4300] },
      art: "art/refs/xinglan_feiji_ai.png",
      artAlt: "art/refs/xinglan_feiji_official.png",
      source: "2026周年庆徽章商店",
      desc: "星河为澜，踏云而驰。神兽系，立绘为官网/AI 参考图占位。",
      doodle: "骥" }
  ],
  monsters: [
    { id: "slime", name: "青苔怪", level: 1, hp: 45, patk: 8, pdef: 2, matk: 4, mdef: 2, spd: 8, exp: 18, silver: [3, 8], doodle: "怪" },
    { id: "wild_rabbit", name: "灰野兔", level: 2, hp: 55, patk: 11, pdef: 3, matk: 3, mdef: 2, spd: 14, exp: 22, silver: [5, 10], catchable: "huiyetu", doodle: "兔" },
    { id: "wild_cat", name: "野猫", level: 3, hp: 70, patk: 14, pdef: 4, matk: 5, mdef: 3, spd: 16, exp: 28, silver: [6, 14], catchable: "mao", doodle: "猫" },
    { id: "wolf", name: "怒怒狼", level: 5, hp: 110, patk: 22, pdef: 8, matk: 6, mdef: 5, spd: 18, exp: 45, silver: [12, 25], doodle: "狼" }
  ],
  areas: [
    { id: "north_forest", name: "北影月森林", monsters: ["slime", "wild_rabbit", "wild_cat"] },
    { id: "east_forest", name: "东影月森林", monsters: ["wild_cat", "wolf"] }
  ]
};
