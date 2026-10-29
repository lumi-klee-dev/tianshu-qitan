/* 宠物养成二期 v0.6 —— 武装 / 进化 / 炼化 / 融合 数据表
   ─────────────────────────────────────────────────────────────────────
   来源：《天书奇谈》公开玩法规格 §6.5~6.14（炼化 / 进化 / 幻化 / 融合 / 武装）。
   宠物名、技能名、道具名尽量与原版一致；规格未公开的数值一律标「⚙ 默认」，
   并集中写在本文件顶部的 CONST 里，方便一次性替换。
   本文件只放数据，不放逻辑（逻辑在 js/pet-advance.js）。
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  /* ══════════════════════════════════════════════════════════════════
     CONST —— 所有 ⚙ 默认数值集中在这里
     ══════════════════════════════════════════════════════════════════ */
  const CONST = {
    /* ── 武装（§6.13） ────────────────────────────────────────────── */
    arm: {
      // 品质系数：白 1 / 绿 1.3 / 蓝 1.7 / 紫 2.2 / 橙 3.0（规格给定）
      qualityCoef: { white: 1, green: 1.3, blue: 1.7, purple: 2.2, orange: 3.0 },
      durBase: 100,          // ⚙ 默认：耐久上限 = 100 × 品质系数（白100/绿130/蓝170/紫220/橙300）
      activateCost: 1,       // ⚙ 默认：激活一件武装消耗同品质材料 1 份
      repairCost: 1,         // ⚙ 默认：修理一次消耗同品质材料 1 份
      synthNeed: 3,          // ⚙ 默认：合成 = 3 份低一档材料 → 1 份高一档材料
      // 合成成功率（规格给定）：绿→蓝 90%、蓝→紫 75%、紫→橙 50%（键 = 目标品质）
      synthRate: { blue: 0.90, purple: 0.75, orange: 0.50 },
      wearPerHit: 1          // ⚙ 默认：宠物每次被击中与武装耐久 -1
    },

    /* ── 进化（§6.7） ────────────────────────────────────────────── */
    evolve: {
      base: 0.30,            // ⚙ 默认：基础档成功率 30%
      perAssist: 0.05,       // 每只辅助宠 +5%（规格给定）
      sameType: 0.08,        // 同系辅助宠 +8%（规格给定，替代 +5%）
      goldStep: 100,         // ⚙ 默认：金子滑条每档 100 两金
      goldPerStep: 0.05,     // ⚙ 默认：每档 +5%
      goldMaxStep: 10,       // ⚙ 默认：最多 10 档（1000 两金，+50%）
      cap: 0.95,             // 成功率上限 95%（规格给定）
      maxAssist: 6,          // ⚙ 默认：一次最多 6 只辅助宠（规格要求 ≥6 可选）
      spiritCost: 1,         // ⚙ 默认：每次消耗「进化之灵」×1
      aptPct: 0.01,          // 资质奖励 = 辅宠该项资质 ×1%（规格给定，取最高）
      unspentBonus: 5,       // ⚙ 默认：进化成功 潜力 +5
      maxLv: 15              // ⚙ 默认：进化等级上限 15
    },

    /* ── 炼化（§6.6） ────────────────────────────────────────────── */
    refine: {
      baseRate: 0.80,        // 抽 1 级 80%（规格给定）
      perLvDrop: 0.10,       // 每高一级 −10%（规格给定）→ 1级80% / 2级70% / 3级60%
      minRate: 0.10,         // ⚙ 默认：成功率下限
      kaishiBonus: 0.10,     // ⚙ 默认：开示丹 +10%（可选道具）
      codexFromLv: 2,        // ⚙ 默认：抽取 2 级以上密录需要「万兽宝鉴」×1
      maxSkillSlots: 12      // ⚙ 默认：宠物技能格 12（满栏提示）
    },

    /* ── 融合（§6.11） ───────────────────────────────────────────── */
    fuse: {
      maxCount: 3,           // 每只主宠最多 3 次（规格给定）
      normal: { silver: 200, rate: 0.05 },   // 普通融合：200 两银，约 5%（规格给定）
      advanced: { gold: 200, rate: 0.08 },   // 高级融合：200 两金，约 8%（规格给定）
      aptPct: 0.05,          // 成功：主宠 5 项资质各 + 副宠对应 ×5%（规格给定）
      countFail: true        // ⚙ 默认：失败也计入 3 次上限（副宠同样消失）
    }
  };

  /* ── 武装品质（白/绿/蓝/紫/橙） ──────────────────────────────── */
  const ARM_QUALITY = [
    { id: "white",  name: "白", color: "#d8d8d8" },
    { id: "green",  name: "绿", color: "#7ec87e" },
    { id: "blue",   name: "蓝", color: "#6ec0ff" },
    { id: "purple", name: "紫", color: "#c9a0ff" },
    { id: "orange", name: "橙", color: "#ffa54d" }
  ];

  /* ── 武装 9 件 × 3 类（§6.13）────────────────────────────────────
     突袭：触角、獠牙、利爪
     伪装：兽纹、甲壳、毛皮
     体型：尖刺、翎羽、尾鞭
     每件的 stats 是「白品质」基准值，实际值 = round(基准 × 品质系数)。 */
  const ARM_CLASSES = [
    { id: "raid",       name: "突袭" },
    { id: "camouflage", name: "伪装" },
    { id: "size",       name: "体型" }
  ];
  const ARMS = [
    { id: "chujiao",    name: "触角", cat: "raid",       stats: { patk: 10, spd: 4 } },
    { id: "liaoya",     name: "獠牙", cat: "raid",       stats: { patk: 20, hp: 30 } },
    { id: "lizhua_arm", name: "利爪", cat: "raid",       stats: { patk: 16, spd: 6 } },
    { id: "shouwen",    name: "兽纹", cat: "camouflage", stats: { hp: 60, mdef: 6 } },
    { id: "jiake",      name: "甲壳", cat: "camouflage", stats: { pdef: 12, hp: 80 } },
    { id: "maopi",      name: "毛皮", cat: "camouflage", stats: { mdef: 10, hp: 50 } },
    { id: "jianci",     name: "尖刺", cat: "size",       stats: { pdef: 8, patk: 8 } },
    { id: "lingyu",     name: "翎羽", cat: "size",       stats: { spd: 10, matk: 10 } },
    { id: "weibian",    name: "尾鞭", cat: "size",       stats: { spd: 6, patk: 14 } }
  ];

  /* ── 武装材料（按品质 5 档）─────────────────────────────────────
     道具名规格未公开 → ⚙ 默认命名「武装精铁·白/绿/蓝/紫/橙」。
     存放在 hero.petItems 里（不进 hero.mats，避免影响装备/打造的材料表）。 */
  const ARM_MATS = ARM_QUALITY.map((q) => ({
    id: "arm_mat_" + q.id, name: "武装精铁·" + q.name, quality: q.id,
    desc: `激活 / 修理 ${q.name} 品质武装的材料（⚙ 默认命名）`
  }));

  /* ── 进化（§6.7） ───────────────────────────────────────────── */
  const ITEMS = {
    evolve_spirit: { name: "进化之灵", desc: "进化的必需道具（规格给定名称）" },
    blank_manual:  { name: "空白万兽密录", desc: "炼化时用来承载抽出的技能（规格给定名称）" },
    beast_codex:   { name: "万兽宝鉴", desc: "抽取 2 级以上密录的必需道具（⚙ 默认规则）" },
    kaishi_dan:    { name: "开示丹", desc: "可选：本次抽取成功率 +10%（⚙ 默认）" }
  };

  // 辅助宠券（简化「辅助宠」：一张券 = 一只可作饲料的辅助宠）⚙ 默认数值
  const ASSIST_COUPONS = {
    assist_coupon_shen: {
      id: "assist_coupon_shen", name: "辅助宠券·神兽", type: "神兽",
      desc: "可替代 1 只神兽系辅助宠（⚙ 默认资质）",
      apt: { str: 6000, con: 3200, fai: 3000, agi: 6000, int: 3000 }
    },
    assist_coupon_ye: {
      id: "assist_coupon_ye", name: "辅助宠券·野兽", type: "野兽",
      desc: "可替代 1 只野兽系辅助宠（⚙ 默认资质）",
      apt: { str: 55, con: 38, fai: 18, agi: 70, int: 20 }
    }
  };

  // 进化 5 / 10 / 15 解锁的占位进化技能（文字即可，⚙ 默认命名）
  const EVOLVE_SKILLS = {
    5:  { id: "evo_5",  name: "血脉觉醒", desc: "进化 5 级解锁（⚙ 默认占位，未实装效果）" },
    10: { id: "evo_10", name: "形态蜕变", desc: "进化 10 级解锁（⚙ 默认占位，未实装效果）" },
    15: { id: "evo_15", name: "返祖归源", desc: "进化 15 级解锁（⚙ 默认占位，未实装效果）" }
  };

  /* ── 炼化链（§6.6）6 条 ──────────────────────────────────────────
     成品属性（规格给定，写成「每级 ×Lv」）：
       · 丹药健体  +830 × Lv 生命
       · 天神祝福  +2500 × Lv 生命
     其余（含防御类）为 ⚙ 默认简化值。 */
  const REFINE_CHAINS = [
    { id: "life",   name: "生命系", nodes: ["jianzhuang", "qixuemianchang", "tianshenzhufu"] },
    { id: "pill",   name: "丹药系", nodes: ["shenqiangtijian", "danyaojianti", "gubenpeiyuan"] },
    { id: "pdef",   name: "物防系", nodes: ["jianren", "tiebi", "jinshizhiqu"] },
    { id: "mdef",   name: "法防系", nodes: ["jingxin", "yufa", "xuanyinhuti"] },
    { id: "patk",   name: "物攻系", nodes: ["manli", "libashanhe", "lipowanfa"] },
    { id: "matk",   name: "法攻系", nodes: ["conghui", "lingsi", "tiandilingqi"] }
  ];
  const REFINE_NODES = {
    /* 生命系 */
    jianzhuang:      { id: "jianzhuang",      name: "健壮",     lv: 1, chain: "life", pre: null,
      effect: { hp: 200 },  desc: "炼化·生命系 1 级（⚙ 默认 +200×Lv 生命）" },
    qixuemianchang:  { id: "qixuemianchang",  name: "气血绵长", lv: 2, chain: "life", pre: "jianzhuang",
      effect: { hp: 520 },  desc: "炼化·生命系 2 级（⚙ 默认 +520×Lv 生命）" },
    tianshenzhufu:   { id: "tianshenzhufu",   name: "天神祝福", lv: 3, chain: "life", pre: "qixuemianchang",
      effect: { hp: 2500 }, desc: "炼化·生命系 3 级（规格：+2500×Lv 生命）" },
    /* 丹药系 */
    shenqiangtijian: { id: "shenqiangtijian", name: "身强体健", lv: 1, chain: "pill", pre: null,
      effect: { hp: 180 },  desc: "炼化·丹药系 1 级（⚙ 默认 +180×Lv 生命）" },
    danyaojianti:    { id: "danyaojianti",    name: "丹药健体", lv: 2, chain: "pill", pre: "shenqiangtijian",
      effect: { hp: 830 },  desc: "炼化·丹药系 2 级（规格：+830×Lv 生命）" },
    gubenpeiyuan:    { id: "gubenpeiyuan",    name: "固本培元", lv: 3, chain: "pill", pre: "danyaojianti",
      effect: { hp: 1400 }, desc: "炼化·丹药系 3 级（⚙ 默认 +1400×Lv 生命）" },
    /* 物防系 */
    jianren:         { id: "jianren",         name: "坚韧",     lv: 1, chain: "pdef", pre: null,
      effect: { pdef: 40 },  desc: "炼化·物防系 1 级（⚙ 默认 +40×Lv 物防）" },
    tiebi:           { id: "tiebi",           name: "铁壁",     lv: 2, chain: "pdef", pre: "jianren",
      effect: { pdef: 80 },  desc: "炼化·物防系 2 级（⚙ 默认 +80×Lv 物防）" },
    jinshizhiqu:     { id: "jinshizhiqu",     name: "金石之躯", lv: 3, chain: "pdef", pre: "tiebi",
      effect: { pdef: 120 }, desc: "炼化·物防系 3 级（⚙ 默认 +120×Lv 物防，防御类简化一条）" },
    /* 法防系 */
    jingxin:         { id: "jingxin",         name: "静心",     lv: 1, chain: "mdef", pre: null,
      effect: { mdef: 30 }, desc: "炼化·法防系 1 级（⚙ 默认 +30×Lv 法防）" },
    yufa:            { id: "yufa",            name: "御法",     lv: 2, chain: "mdef", pre: "jingxin",
      effect: { mdef: 60 }, desc: "炼化·法防系 2 级（⚙ 默认 +60×Lv 法防）" },
    xuanyinhuti:     { id: "xuanyinhuti",     name: "玄阴护体", lv: 3, chain: "mdef", pre: "yufa",
      effect: { mdef: 90 }, desc: "炼化·法防系 3 级（⚙ 默认 +90×Lv 法防）" },
    /* 物攻系 */
    manli:           { id: "manli",           name: "蛮力",     lv: 1, chain: "patk", pre: null,
      effect: { patk: 60 }, desc: "炼化·物攻系 1 级（⚙ 默认 +60×Lv 物攻）" },
    libashanhe:      { id: "libashanhe",      name: "力拔山河", lv: 2, chain: "patk", pre: "manli",
      effect: { patk: 120 }, desc: "炼化·物攻系 2 级（⚙ 默认 +120×Lv 物攻）" },
    lipowanfa:       { id: "lipowanfa",       name: "力破万法", lv: 3, chain: "patk", pre: "libashanhe",
      effect: { patk: 180 }, desc: "炼化·物攻系 3 级（⚙ 默认 +180×Lv 物攻）" },
    /* 法攻系 */
    conghui:         { id: "conghui",         name: "聪慧",     lv: 1, chain: "matk", pre: null,
      effect: { matk: 50 }, desc: "炼化·法攻系 1 级（⚙ 默认 +50×Lv 法攻）" },
    lingsi:          { id: "lingsi",          name: "灵思",     lv: 2, chain: "matk", pre: "conghui",
      effect: { matk: 100 }, desc: "炼化·法攻系 2 级（⚙ 默认 +100×Lv 法攻）" },
    tiandilingqi:    { id: "tiandilingqi",    name: "天地灵气", lv: 3, chain: "matk", pre: "lingsi",
      effect: { matk: 160 }, desc: "炼化·法攻系 3 级（⚙ 默认 +160×Lv 法攻）" }
  };

  /* ── 融合（§6.11） ───────────────────────────────────────────── */
  const FUSE_MODES = [
    { id: "normal",   name: "普通融合", cost: "200 两银", rate: CONST.fuse.normal.rate },
    { id: "advanced", name: "高级融合", cost: "200 两金", rate: CONST.fuse.advanced.rate }
  ];

  /* ── 抗性页签（附录 2）：玄 / 毒 / 火 / 冰 四个只读项 ─────────── */
  const RESISTS = [
    { id: "xuan", name: "玄" }, { id: "du", name: "毒" },
    { id: "huo", name: "火" }, { id: "bing", name: "冰" }
  ];

  /* ── 演示角色发放清单（game.js › createHero 用） ─────────────── */
  const DEMO = {
    items: { evolve_spirit: 5, blank_manual: 3, beast_codex: 3, kaishi_dan: 3,
             assist_coupon_shen: 3, assist_coupon_ye: 5 },
    armMats: { arm_mat_white: 12, arm_mat_green: 9, arm_mat_blue: 6, arm_mat_purple: 3, arm_mat_orange: 1 },
    // 演示宠的初始炼化技能（让炼化链一上来就能跑）
    // 注意：主宠「星澜飞骥」刻意不带链首技能，方便演示「抽密录 → 给主宠学」的完整闭环
    petSkills: {
      xinglanfeiji: ["siyao", "lizhua"],
      xiaojinlong:  ["siyao", "manli"],
      huiyetu:      ["siyao", "jianzhuang"],
      mao:          ["lizhua", "shenqiangtijian"],
      baiyang:      ["siyao", "jianren"]
    },
    // 演示已激活武装（耐久故意不满，方便演示「修理」）
    demoArms: { jiake: { quality: "purple", durRatio: 0.55 }, lingyu: { quality: "blue", durRatio: 0.7 } },
    gold: 20000,          // ⚙ 默认：演示金子（融合高级 / 进化加金子用）
    feishengSpecies: "xinglanfeiji",  // 演示已飞升的主宠
    fuseSubCount: 3       // 同种副宠数量（主宠最多融 3 次）
  };

  TSQ.PetAdvanceData = {
    CONST, ARM_QUALITY, ARM_CLASSES, ARMS, ARM_MATS,
    ITEMS, ASSIST_COUPONS, EVOLVE_SKILLS,
    REFINE_CHAINS, REFINE_NODES, FUSE_MODES,
    RESISTS, DEMO
  };
})();
