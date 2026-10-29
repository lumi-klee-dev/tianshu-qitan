/* 装备 / 打造系统静态数据（规格：/workspace/tianshu-spec/装备与打造系统规格.md）
 * 数值来源标记见规格文档；成功率全部在 data/rates.js。原创 IP 占位名称。 */
window.TSQ = window.TSQ || {};
(function () {
  const EQ = {};

  // ---- 属性名 ----
  EQ.statNames = {
    str: "强壮", con: "耐力", agi: "敏捷", int: "智力", fai: "信仰",
    hp: "HP上限", mp: "MP上限", rage: "怒气", spd: "速度", regen: "恢复",
    patk: "物理攻击", matk: "法术攻击", pdef: "防御", mdef: "法术防",
    phit: "物理命中", mhit: "法术命中", pdodge: "物理闪避", mdodge: "法术闪避",
    pcrit: "物理爆击", mcrit: "法术爆击",
    hp_pct: "HP上限%", patk_pct: "物理攻击%", matk_pct: "法术攻击%",
    crit: "爆击", ipdef: "忽视目标物防", imdef: "忽视目标法防", tough: "韧性", imdodge: "忽视法术闪避", rage_turn: "每回合怒气", spd_pct: "速度"
  };
  EQ.pctStats = ["hp_pct", "patk_pct", "matk_pct", "spd_pct"];

  // ---- 槽位：官方 14 件 + 戒指×2（用户确认） ----
  EQ.slots = [
    { id: "weapon", type: "weapon", name: "武器" },
    { id: "head", type: "head", name: "头盔" },
    { id: "shoulder", type: "shoulder", name: "护肩" },
    { id: "body", type: "body", name: "衣服" },
    { id: "belt", type: "belt", name: "腰带" },
    { id: "legs", type: "legs", name: "裤子" },
    { id: "boots", type: "boots", name: "鞋子" },
    { id: "cape", type: "cape", name: "披风" },
    { id: "bracelet1", type: "bracelet", name: "手镯" },
    { id: "bracelet2", type: "bracelet", name: "手镯" },
    { id: "ring1", type: "ring", name: "戒指" },
    { id: "ring2", type: "ring", name: "戒指" },
    { id: "acc1", type: "accessory", name: "饰品" },
    { id: "acc2", type: "accessory", name: "饰品" },
    { id: "acc3", type: "accessory", name: "饰品" },
    { id: "acc4", type: "accessory", name: "饰品" }
  ];
  EQ.typeNames = { weapon: "武器", head: "头饰", shoulder: "护肩", body: "衣服", belt: "腰带", legs: "裤子",
    boots: "鞋子", cape: "披风", bracelet: "手镯", ring: "戒指", accessory: "首饰" };
  EQ.armorTypes = ["head", "body", "legs", "belt", "boots", "shoulder", "cape"];
  EQ.enchantTypes = ["head", "body", "legs", "belt", "boots"];
  EQ.setTypes = ["head", "body", "legs", "belt", "boots", "shoulder", "cape", "accessory"];

  // ---- 等阶（按等级段，决定升级宝石/生命石/打孔器档） ----
  EQ.grades = [
    { id: "fan", name: "凡品", lv: [1, 19] },
    { id: "liang", name: "良品", lv: [20, 39] },
    { id: "shang", name: "上品", lv: [40, 59] },
    { id: "jing", name: "精品", lv: [60, 79] },
    { id: "ji", name: "极品", lv: [80, 99] },
    { id: "ling", name: "灵品", lv: [100, 119] },
    { id: "xuan", name: "玄品", lv: [120, 139] },
    { id: "shen", name: "神品", lv: [140, 999] },
    { id: "juexing", name: "觉醒", lv: null }
  ];
  // ---- 档次（打造材料等级决定） ----
  EQ.tiers = {
    broken: { name: "破碎", matGrade: 5, mult: 0.6 },
    normal: { name: "普通", matGrade: 4, mult: 1.0 },
    fine: { name: "优秀", matGrade: 3, mult: 1.15 },
    perfect: { name: "完美", matGrade: 2, mult: 1.3 },
    radiant: { name: "光芒", matGrade: 1, mult: 1.5 }
  };
  EQ.tierOrder = ["broken", "normal", "fine", "perfect", "radiant"];
  // ---- 颜色（蓝字条数） ----
  EQ.colors = {
    white: { name: "白", n: 0, css: "#f2f2f2" },
    green: { name: "绿", n: 2, css: "#5fe05f" },
    blue: { name: "蓝", n: 3, css: "#5aa9ff" },
    purple: { name: "紫", n: 4, css: "#c77dff" },
    orange: { name: "橙", n: 5, css: "#ffa53a" }
  };
  EQ.colorOrder = ["white", "green", "blue", "purple", "orange"];

  // ---- 孔色 → 宝石（官方指南） ----
  EQ.holeColors = {
    pink: { name: "粉红", css: "#ff7eb9", gems: ["tian_meng", "tian_ji", "tian_shou", "tian_you", "tian_su"] },
    purple: { name: "淡紫", css: "#b388ff", gems: ["tian_yong", "tian_sun"] },
    blue: { name: "天蓝", css: "#4fc3f7", gems: ["tian_bai", "tian_tui"] },
    yellow: { name: "鹅黄", css: "#e6e65a", gems: ["tian_xian", "tian_wei", "tian_ying", "tian_gui", "tian_man", "tian_gu"] }
  };
  const FIVE = [8, 17, 33, 66, 119, 179, 233] /* 6/7级按用户截图与攻略 179/233（官表 178/232）*/, ATK = [28, 55, 110, 220, 396, 594, 772],
    DEF = [18, 35, 70, 140, 252, 378, 491], YEL = [33, 66, 132, 165, 198, 264, 330];
  const g = (name, stat, hole, vals, guess) => ({ name, stat, hole, vals, guess: !!guess });
  EQ.gems = {
    tian_meng: g("天猛石", "str", "pink", FIVE), tian_ji: g("天机石", "int", "pink", FIVE),
    tian_shou: g("天寿石", "con", "pink", FIVE), tian_you: g("天佑石", "fai", "pink", FIVE),
    tian_su: g("天速石", "agi", "pink", FIVE),
    tian_yong: g("天勇石", "matk", "purple", ATK), tian_sun: g("天损石", "patk", "purple", ATK, true),
    tian_bai: g("天拜石", "pdef", "blue", DEF), tian_tui: g("天退石", "mdef", "blue", DEF),
    tian_xian: g("天闲石", "pdodge", "yellow", YEL), tian_gu: g("天孤石", "mcrit", "yellow", YEL),
    tian_wei: g("天威石", "phit", "yellow", YEL, true), tian_ying: g("天英石", "mhit", "yellow", YEL, true),
    tian_gui: g("天贵石", "pcrit", "yellow", YEL, true), tian_man: g("天满石", "mdodge", "yellow", YEL, true)
  };
  EQ.cnNum = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三"];

  // ---- 词条池（蓝字/绿字/通灵） 值 = 装备等级 × coef × U(0.5,1) ----
  EQ.affixPool = {
    str: 0.25, con: 0.25, agi: 0.25, int: 0.25, fai: 0.25, hp: 2.0, mp: 1.2, spd: 0.6, regen: 0.6,
    pdef: 0.8, mdef: 0.8, patk: 0.8, matk: 0.8, phit: 0.5, mhit: 0.5, pdodge: 0.5, mdodge: 0.5,
    pcrit: 0.5, mcrit: 0.5, rage: 0.3
  };
  EQ.rareAffixes = { crit: 0.2, ipdef: 0.6, imdef: 0.6, tough: 0.3 };
  EQ.spiritPool = { con: 0.7, agi: 0.75, int: 0.6, hp_pct: 0.0015, rage_turn: 0.46, spd_pct: 0.00004, imdef: 2.9, matk: 1.0, patk: 1.0 };

  // ---- 材料 ----
  const M = {};
  const mat = (id, name, icon, desc) => (M[id] = { id, name, icon, desc: desc || "" });
  const cn5 = ["", "一", "二", "三", "四", "五"];
  for (let i = 1; i <= 5; i++) {
    mat("shanggu_" + i, `上古神器碎片·${cn5[i]}等`, "古", "打造主材料");
    mat("moxing_" + i, `魔性碎片·${cn5[i]}等`, "魔", "打造主材料");
    mat("xuanbing_" + i, `玄兵·${cn5[i]}等`, "兵", "稀有打造材料（权重高）");
    mat("lingzhou_" + i, `灵胄·${cn5[i]}等`, "胄", "稀有打造材料（权重高）");
  }
  EQ.grades.forEach((gr) => {
    mat("upstone_" + gr.id, `升级宝石（${gr.name}）`, "★", `给${gr.name}装备升星`);
    mat("lifestone_" + gr.id, `生命石（${gr.name}）`, "◆", `给${gr.name}装备铭刻`);
    if (gr.id !== "juexing") {
      mat("drill_" + gr.id + "_a", `${gr.name}打孔器（1~7孔）`, "孔", "");
      mat("drill_" + gr.id + "_b", `${gr.name}打孔器（8~10孔）`, "孔", "");
    }
  });
  mat("drill_any", "任意打孔器", "孔", "可打任意等阶、任意孔位（含 11~12 孔）");
  mat("wenyu", "温玉", "玉", "铭刻失败不掉级");
  mat("wuxian_gem", "无限宝石", "∞", "直接把装备升到 13 星");
  mat("wash_charm", "宝石洗孔符", "洗", "重随一个空孔的颜色");
  mat("gem_charm_low", "低级宝石合成符", "合", "1~3 级宝石合成用");
  mat("gem_charm_high", "高级宝石合成符", "合", "4~6 级宝石合成用");
  mat("remove_low", "低级宝石摘除符", "摘", "摘除后宝石降 2 级，≤2 级消失");
  for (let i = 1; i <= 7; i++) mat("remove_high_" + i, `高级宝石摘除符·${i}级`, "摘", `无损摘除 ${i} 级宝石`);
  for (let i = 1; i <= 6; i++) {
    mat("enchant_p_" + i, `${i}级物防附魔石`, "附", "");
    mat("enchant_m_" + i, `${i}级法防附魔石`, "附", "");
  }
  mat("guiyuan", "归元灵玉", "灵", "附魔失败不掉级");
  mat("tongling_20", "通灵·灵气20", "通", "");
  mat("tongling_50", "通灵·灵气50", "通", "");
  mat("tongling_80", "通灵·灵气80", "通", "");
  mat("yangyuan_water", "无上养元水", "水", "通灵灵气 +15");
  mat("kg_stone", "开光石", "光", "普通开光道具");
  mat("kg_nvshen", "女神之泪", "泪", "更容易开出橙色");
  mat("kg_xianren", "仙人之泪", "泪", "孔位更好");
  for (let i = 1; i <= 4; i++) mat("prism_" + i, `魔术棱柱·${cn5[i]}等`, "棱", ["", "改造橙装", "改造紫装", "改造蓝装", "改造绿装"][i]);
  mat("xuanbing_frag", "玄兵碎片", "片", "套装改造");
  mat("moduan", "魔锻锭", "锭", "套装改造");
  mat("lost_manual", "失落锻造法", "书", "套装改造");
  mat("bodhi", "菩提子", "菩", "觉醒成长上限 +10");
  mat("lingyuan", "灵元", "元", "觉醒经验 +100");
  mat("ess_daojian", "刀剑精华", "精", ""); mat("ess_zhanyi", "战意精华", "精", "");
  mat("ess_shenmi", "神秘精华", "精", ""); mat("ess_zhenqi", "真气精华", "精", "");
  mat("ess_wuse", "无色精华", "精", ""); mat("ess_lingcui", "灵淬精华", "精", "");
  EQ.materials = M;
  EQ.essenceByGrade = { fan: "ess_daojian", liang: "ess_zhanyi", shang: "ess_shenmi", jing: "ess_zhenqi",
    ji: "ess_wuse", ling: "ess_lingcui", xuan: "ess_lingcui", shen: "ess_lingcui", juexing: "ess_lingcui" };
  // 原料合成链
  EQ.synthChains = [
    { id: "shanggu", name: "上古神器碎片", key: (g) => "shanggu_" + g, from: 5, to: 1, kind: "material" },
    { id: "moxing", name: "魔性碎片", key: (g) => "moxing_" + g, from: 5, to: 1, kind: "material" },
    { id: "xuanbing", name: "玄兵", key: (g) => "xuanbing_" + g, from: 5, to: 1, kind: "material" },
    { id: "lingzhou", name: "灵胄", key: (g) => "lingzhou_" + g, from: 5, to: 1, kind: "material" },
    { id: "enchant_p", name: "物防附魔石", key: (l) => "enchant_p_" + l, from: 1, to: 6, kind: "enchant" },
    { id: "enchant_m", name: "法防附魔石", key: (l) => "enchant_m_" + l, from: 1, to: 6, kind: "enchant" }
  ];

  // ---- 装备模板 ----
  // 基础值 = 等级 × 系数（main = 职业主攻：修真/术士=matk，侠客/刺客=patk）
  const BASE = {
    weapon: { main: 8 }, head: { pdef: 2, hp: 6 }, body: { pdef: 3, mdef: 2, hp: 8 },
    legs: { pdef: 2.5, mdef: 1.5 }, belt: { hp: 10, pdef: 1 }, boots: { pdef: 1.5, spd: 0.4 },
    shoulder: { mdef: 2, hp: 4 }, cape: { mdef: 2.5, pdef: 1 }, accessory: { hp: 18 },
    bracelet: { main: 2, hp: 5 }, ring: { hp: 6, mp: 3 }
  };
  EQ.slotBase = BASE;
  const NOUN = { head: "冠", body: "袍", legs: "护腿", belt: "腰带", boots: "靴", shoulder: "护肩", cape: "披风",
    accessory: "佩", bracelet: "手镯", ring: "戒" };
  EQ.weaponNoun = { xiake: { m: "刀", f: "双剑" }, cike: { m: "链刃", f: "鞭" }, shushi: { m: "扇", f: "古琴" }, xiuzhen: { m: "仙剑", f: "飞轮" } };
  EQ.families = [
    { id: "zijin", name: "紫金", level: 45, rebirth: 0, types: ["head", "body", "legs", "belt", "boots"] },
    { id: "xuanming", name: "玄冥", level: 100, rebirth: 0, types: ["weapon", "head", "body", "legs", "belt", "boots", "shoulder", "cape", "ring", "bracelet"], reqAttr: { agi: 61 } },
    { id: "qingluan", name: "青鸾", level: 125, rebirth: 1, set: "qingluan", types: ["weapon", "head", "body", "legs", "belt", "boots", "shoulder", "cape", "accessory", "ring", "bracelet"] },
    { id: "taixu", name: "太虚之碧凤瑶光", level: 140, rebirth: 2, set: "taixu", types: ["weapon", "head", "body", "legs", "belt", "boots", "shoulder", "cape", "accessory", "ring", "bracelet"] }
  ];
  EQ.templates = {};
  EQ.families.forEach((f) => {
    f.types.forEach((t) => {
      const id = f.id + "_" + t;
      EQ.templates[id] = {
        id, family: f.id, type: t, level: f.level, rebirth: f.rebirth, reqAttr: f.reqAttr || null,
        name: t === "weapon" ? f.name + "·{weapon}" : f.name + NOUN[t],
        classes: t === "weapon" ? ["xiuzhen", "xiake", "cike", "shushi"] : null,
        setFamily: f.set && EQ.setTypes.includes(t) ? f.set : null,
        forgeable: true, maxHolesFixed: null
      };
    });
  });
  // 特殊（非打造）装备
  Object.assign(EQ.templates, {
    huang_ash: { id: "huang_ash", type: "accessory", level: 125, rebirth: 1, name: "凰的灰烬", unique: true,
      kaiguang: true, base: { hp: 2250 }, desc: "传说中上古神兽凰遗留下来的灰烬。" },
    shiguang_ring: { id: "shiguang_ring", type: "ring", level: 125, rebirth: 1, name: "时光的灰烬", unique: true,
      kaiguang: true, desc: "可开光重置品质、颜色与孔。只能佩戴一个。" },
    meteor_shard: { id: "meteor_shard", type: "accessory", level: 90, rebirth: 0, name: "流星碎片", kaiguang: true,
      desc: "需鉴定后开光。" },
    mercy_soul: { id: "mercy_soul", type: "accessory", level: 100, rebirth: 0, name: "光芒的慈悲之力", unique: true,
      jie: 27, gender: "m", classes: ["xiuzhen"], maxHolesFixed: 12,
      base: { int: 175, con: 140, fai: 140, hp: 1800, matk: 410 },
      desc: "具有神性的灵魂精粹与慈悲意志共鸣生成的宝珠（原创占位）。" },
    guanxin_ring: { id: "guanxin_ring", type: "ring", level: 90, rebirth: 1, name: "观心戒指", forgeable: true, desc: "一转 90 级戒指。" },
    gongxun_bracelet: { id: "gongxun_bracelet", type: "bracelet", level: 100, rebirth: 0, name: "功勋手镯", desc: "功勋兑换。" }
  });

  // ---- 打造配方（每件基础量；稀有材料权重见 rates.forge.materialWeight） ----
  EQ.recipeFor = function (tpl) {
    const L = tpl.level;
    if (L >= 110) return [
      { mat: "shanggu", qty: 12, rare: false }, { mat: "xuanbing", qty: 1, rare: true }, { mat: "lingzhou", qty: 2, rare: true }];
    if (tpl.type === "ring" || tpl.type === "accessory") return [
      { mat: "shanggu", qty: Math.ceil(L / 10), rare: false }, { mat: "moxing", qty: Math.ceil(L / 15), rare: false }];
    return [{ mat: "shanggu", qty: Math.ceil(L / 8), rare: false }, { mat: "moxing", qty: Math.ceil(L / 15), rare: false }];
  };

  // ---- 套装 ----
  EQ.sets = {
    qingluan: { name: "青鸾羽衣", pieces: EQ.setTypes.slice(), placeholder: true,
      pieceNames: { body: "衣服", legs: "腿部", head: "头部", belt: "腰部", boots: "脚部", shoulder: "护肩", cape: "披风", accessory: "首饰" },
      pieceOrder: ["body", "legs", "head", "belt", "boots", "shoulder", "cape", "accessory"], desc: "青鸾振羽，云海为裳。（占位）",
      bonus: [
        { n: 2, stats: { pdef: 300 }, text: "2件 +300 防御" },
        { n: 4, stats: { mdef: 400 }, text: "4件 +400 法术防" },
        { n: 6, stats: { hp_pct: 0.05 }, text: "6件 +5% HP上限" },
        { n: 8, stats: { matk_pct: 0.06, patk_pct: 0.06 }, text: "8件 +6% 物理/法术攻击" }] },
    taixu: { name: "太虚之碧凤瑶光", pieces: EQ.setTypes.slice(),
      pieceNames: { body: "衣服", legs: "腿部", head: "头部", belt: "腰部", boots: "脚部", shoulder: "护肩", cape: "披风", accessory: "首饰" },
      pieceOrder: ["body", "legs", "head", "belt", "boots", "shoulder", "cape", "accessory"],
      desc: "碧凤息梧终涅火，瑶光映世盼君临。",
      bonus: [
        { n: 2, stats: { con: 100 }, text: "2件 +100 耐力" },
        { n: 4, stats: { imdodge: 1600 }, text: "4件 +1600 忽视法术闪避" },
        { n: 6, stats: { spd: 400 }, text: "6件 +400 速度" },
        { n: 8, stats: {}, proc: { chance: 0.23, healPct: 0.5 }, text: "8件 攻击命中时23%的概率回复伤害量50%生命" }] }
  };

  EQ.consumableIcons = { weapon: "剑", head: "冠", shoulder: "肩", body: "袍", belt: "带", legs: "裤", boots: "靴",
    cape: "披", bracelet: "镯", ring: "戒", accessory: "佩" };
  TSQ.EQ = EQ;
})();
