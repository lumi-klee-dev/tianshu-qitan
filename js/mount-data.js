/* 骑宠 / 兽魂 数据配置 v1.0
   ─────────────────────────────────────────────────────────────────────
   来源：
   - 规格：_brief/spec-mount.md §7.1 骑宠与契约、§7.3 兽魂
   - 数值摘录：_brief/systems_snippet.json
   - 规则：
     * 一转后解锁骑宠；
     * 字段：携带等级、成熟等级、忠诚度(100)、亲密度、潜力、一级属性；
     * 每升 1 级获得 2 点潜力；
     * 契约：骑宠最多与 2 只已绑定参战宠签契约，契约宠获得的经验 100% 分流给骑宠；
       契约宠 5 项一级属性的 10% 加给骑宠 ⚙；
     * 人物获得骑宠一级属性 × 5% ⚙ 进 combatStats；
     * 兽魂品质：白 / 绿 / 蓝 / 紫 / 橙，最高 10 级；
     * 喂养吞兽魂涨经验：绿 20、蓝 50、紫 400、橙 800、白 5 ⚙；
     * 每骑可装备 1 个兽魂；升 n 级经验 = 20×n² ⚙；兽魂属性 = 品质系数×等级 ⚙；
     * 真仙召唤消耗 5 两金 ⚙。
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const CONST = {
    REQ_REBIRTH: 1,                       // 一转后解锁骑乘
    CONTRACT_MAX: 2,                      // 最多与 2 只已绑定参战宠签契约
    POINTS_PER_LEVEL: 2,                  // 骑宠每升 1 级 2 点潜力
    PLAYER_PRIMARY_BONUS_RATIO: 0.05,     // 人物获得骑宠一级属性 × 5% ⚙
    CONTRACT_PRIMARY_BONUS_RATIO: 0.10,   // 契约宠一级属性 10% 加给骑宠 ⚙
    MAX_SOUL_LEVEL: 10,                   // 兽魂最高 10 级
    // 喂养经验（吞噬别的兽魂）：绿20/蓝50/紫400/橙800/白5 ⚙
    SOUL_FEED_EXP: {
      "白": 5,
      "绿": 20,
      "蓝": 50,
      "紫": 400,
      "橙": 800
    },
    // 兽魂升级经验：升到 lv+1 级所需经验 = 20 * lv^2
    SOUL_EXP_NEED: (lv) => 20 * lv * lv,
    // 骑宠成熟等级升级经验公式
    MOUNT_EXP_NEED: (lv) => 100 * lv,
    // 召唤兽魂配置
    SUMMON_COST_SILVER: 10000,            // 普通召唤每次 10,000 银两
    SUMMON_TRUE_IMMORTAL_GOLD: 5,         // 直接召唤真仙消耗 5 两金
    // 演示发放配置
    DEMO: {
      grantMountId: "mount_langsihai",    // 初始发放 1 只原版经典骑宠「浪四海」
      grantSouls: [
        { defId: "soul_fantian", lv: 1, exp: 0 }, // 橙色 1 个
        { defId: "soul_ziwei", lv: 1, exp: 0 },   // 紫色 2 个
        { defId: "soul_ziwei", lv: 1, exp: 0 },
        { defId: "soul_youquan", lv: 1, exp: 0 }, // 蓝色 2 个
        { defId: "soul_youquan", lv: 1, exp: 0 },
        { defId: "soul_lingmu", lv: 1, exp: 0 },  // 绿色 4 个
        { defId: "soul_lingmu", lv: 1, exp: 0 },
        { defId: "soul_lingmu", lv: 1, exp: 0 },
        { defId: "soul_lingmu", lv: 1, exp: 0 },
        { defId: "soul_suiling", lv: 1, exp: 0 }, // 白色 5 个
        { defId: "soul_suiling", lv: 1, exp: 0 },
        { defId: "soul_suiling", lv: 1, exp: 0 },
        { defId: "soul_suiling", lv: 1, exp: 0 },
        { defId: "soul_suiling", lv: 1, exp: 0 }
      ]
    }
  };

  // 演示骑宠定义（至少 3 只，原版经典名）
  const MOUNTS = [
    {
      id: "mount_langsihai",
      name: "浪四海",
      category: "配人物",
      reqLevel: 80,
      doodle: "🌊",
      art: null,
      desc: "天书原版极品御行灵兽，踏浪行空，风驰电掣。主修敏捷与速度，奔行如飞，为行侠仗义之士所倾心。",
      basePrimary: { str: 45, con: 35, agi: 55, int: 25, fai: 25 }
    },
    {
      id: "mount_lingyu",
      name: "灵雨",
      category: "配人物",
      reqLevel: 80,
      doodle: "🌧️",
      art: null,
      desc: "天书原版仙家灵兽，灵雨如沐，神光普照。通晓万法天机与仙法治疗，为主修智力、修真者之首选坐骑。",
      basePrimary: { str: 25, con: 35, agi: 35, int: 55, fai: 45 }
    },
    {
      id: "mount_chiyan",
      name: "赤炎金猊",
      category: "五行宫",
      reqLevel: 80,
      doodle: "🦁",
      art: null,
      desc: "天书原版上古五行异兽，赤焰腾霄，金猊怒吼。筋骨如铁，力撼山岳，拥有绝强之强壮与护体耐力。",
      basePrimary: { str: 55, con: 50, agi: 30, int: 20, fai: 20 }
    },
    {
      id: "mount_yeyu",
      name: "夜雨",
      category: "配人物",
      reqLevel: 80,
      doodle: "🌙",
      art: null,
      desc: "天书原版潜影灵骑，夜幕潜行，迅疾如雨。拥有超绝身法与敏锐感知，隐匿于暗夜之中。",
      basePrimary: { str: 35, con: 30, agi: 60, int: 30, fai: 25 }
    }
  ];

  // 兽魂定义（白 / 绿 / 蓝 / 紫 / 橙 5 档）
  const SOUL_DEFS = {
    soul_suiling: {
      id: "soul_suiling",
      name: "碎灵兽魂",
      quality: "白",
      color: "#f5f6fa",
      feedExp: 5,
      coeff: 1,
      desc: "凡品天地碎灵凝聚而成的初阶兽魂，蕴含微弱灵息。",
      // 属性 = 品质系数 × 等级 ⚙
      stats: (lv) => ({ str: lv * 2, con: lv * 2, hp: lv * 40, pdef: lv * 8, mdef: lv * 8 })
    },
    soul_lingmu: {
      id: "soul_lingmu",
      name: "灵木兽魂",
      quality: "绿",
      color: "#2ecc71",
      feedExp: 20,
      coeff: 2,
      desc: "汲取千年灵木生气凝结的精良兽魂，生生不息。",
      stats: (lv) => ({ con: lv * 5, fai: lv * 5, hp: lv * 100, pdef: lv * 18, mdef: lv * 18 })
    },
    soul_youquan: {
      id: "soul_youquan",
      name: "幽泉兽魂",
      quality: "蓝",
      color: "#3498db",
      feedExp: 50,
      coeff: 4,
      desc: "采自九幽灵泉深处的幽蓝兽魂，灵动机敏，冰寒彻骨。",
      stats: (lv) => ({ int: lv * 10, agi: lv * 8, matk: lv * 35, spd: lv * 6, hp: lv * 220 })
    },
    soul_ziwei: {
      id: "soul_ziwei",
      name: "紫微兽魂",
      quality: "紫",
      color: "#9b59b6",
      feedExp: 400,
      coeff: 8,
      desc: "受紫微帝星紫气淬炼的稀世兽魂，霸道凌厉，威能无匹。",
      stats: (lv) => ({ str: lv * 20, con: lv * 20, patk: lv * 75, hp: lv * 500, spd: lv * 12 })
    },
    soul_fantian: {
      id: "soul_fantian",
      name: "梵天神魂",
      quality: "橙",
      color: "#e67e22",
      feedExp: 800,
      coeff: 15,
      desc: "远古梵天神界降临的极品神级兽魂，散发耀目光辉，万兽臣服。",
      stats: (lv) => ({
        str: lv * 35,
        con: lv * 35,
        agi: lv * 25,
        int: lv * 35,
        fai: lv * 25,
        patk: lv * 120,
        matk: lv * 120,
        hp: lv * 900,
        spd: lv * 20
      })
    }
  };

  // 骑宠技能常量配置 v1.2（严格遵守规格：品质橙/紫/蓝/绿/白，最多 1 个紫、3 个蓝，技能 ≥2 级才生效）
  const SKILL_CONST = {
    MAX_PURPLE: 1,                        // 官方专题：骑宠最多 1 个紫
    MAX_BLUE: 3,                          // 官方专题：骑宠最多 3 个蓝
    MAX_SKILLS: 6,                        // 每只骑宠最多领悟 6 个技能
    MIN_ACTIVE_LEVEL: 2,                  // 规格要求：技能 ≥2 级才生效
    MAX_LEVEL: 5                          // 技能最高 5 级
  };

  // 骑宠技能道具（领悟丹）
  const SKILL_PILLS = {
    ningshen_pill: { id: "ningshen_pill", name: "凝神丹", pool: "通用", desc: "领悟骑宠技能与研习突破至更高等级所必需的天地神丹。" },
    fenglei_pill: { id: "fenglei_pill", name: "风雷丹", pool: "风雷", desc: "凝聚九霄风雷之气的灵丹，对应风雷系（敏捷/攻速/身法）技能池。" },
    mingguang_pill: { id: "mingguang_pill", name: "明光丹", pool: "明光", desc: "凝聚日月明光护体之力的灵丹，对应明光系（防御/生命/抗性）技能池。" },
    linghuan_pill: { id: "linghuan_pill", name: "灵幻丹", pool: "灵幻", desc: "凝聚九天灵幻仙气的灵丹，对应灵幻系（法术/法力/恢复）技能池。" }
  };

  // 骑宠技能池（品质：橙 / 紫 / 蓝 / 绿 / 白）
  const SKILL_DEFS = {
    // ---- 橙色技能（绝品神威） ----
    mount_sk_bahuang: {
      id: "mount_sk_bahuang",
      name: "八荒神威",
      quality: "橙",
      color: "#e67e22",
      pool: "通用",
      desc: "引八荒万灵浩荡神威附体。人物全基础属性+30，生命+4000，双攻+250，速度+80。",
      playerFlat: { str: 30, con: 30, agi: 30, int: 30, fai: 30, hp: 4000, patk: 250, matk: 250, spd: 80 },
      playerPct: { hp_pct: 0.04, spd_pct: 0.02 }
    },

    // ---- 紫色技能（稀有核心，上限 1 个） ----
    mount_sk_zixiao: {
      id: "mount_sk_zixiao",
      name: "紫霄御风",
      quality: "紫",
      color: "#9b59b6",
      pool: "风雷",
      desc: "引九霄紫极风雷裹体。人物速度+80，速度+2%，骑宠敏捷+60。",
      playerFlat: { spd: 80 },
      playerPct: { spd_pct: 0.02 },
      mountPrimary: { agi: 60 }
    },
    mount_sk_zhenyuan: {
      id: "mount_sk_zhenyuan",
      name: "真元护体",
      quality: "紫",
      color: "#9b59b6",
      pool: "明光",
      desc: "聚乾坤真元凝聚结界。人物生命+3500，生命+3%，骑宠耐力+60。",
      playerFlat: { hp: 3500 },
      playerPct: { hp_pct: 0.03 },
      mountPrimary: { con: 60 }
    },
    mount_sk_tiangang: {
      id: "mount_sk_tiangang",
      name: "天罡破军",
      quality: "紫",
      color: "#9b59b6",
      pool: "风雷",
      desc: "天罡战意呼啸破阵。人物物攻+260，物攻+2%，骑宠强壮+60。",
      playerFlat: { patk: 260 },
      playerPct: { patk_pct: 0.02 },
      mountPrimary: { str: 60 }
    },
    mount_sk_linglong: {
      id: "mount_sk_linglong",
      name: "玲珑仙音",
      quality: "紫",
      color: "#9b59b6",
      pool: "灵幻",
      desc: "仙音清澈回响涤荡灵台。人物法攻+260，法攻+2%，骑宠智力+60。",
      playerFlat: { matk: 260 },
      playerPct: { matk_pct: 0.02 },
      mountPrimary: { int: 60 }
    },

    // ---- 蓝色技能（精良实用，上限 3 个） ----
    mount_sk_fengchi: {
      id: "mount_sk_fengchi",
      name: "风驰电掣",
      quality: "蓝",
      color: "#3498db",
      pool: "风雷",
      desc: "蹑影追风，驰骋如电。人物速度+50，闪避+40。",
      playerFlat: { spd: 50, pdodge: 40, mdodge: 40 }
    },
    mount_sk_jianbi: {
      id: "mount_sk_jianbi",
      name: "坚壁清野",
      quality: "蓝",
      color: "#3498db",
      pool: "明光",
      desc: "固若金汤，不动如山。人物物防+220，法防+220。",
      playerFlat: { pdef: 220, mdef: 220 }
    },
    mount_sk_qiguan: {
      id: "mount_sk_qiguan",
      name: "气贯长虹",
      quality: "蓝",
      color: "#3498db",
      pool: "明光",
      desc: "浩然之气贯通天际。人物生命+1800，法力+900。",
      playerFlat: { hp: 1800, mp: 900 }
    },
    mount_sk_lingyao: {
      id: "mount_sk_lingyao",
      name: "灵曜通幽",
      quality: "蓝",
      color: "#3498db",
      pool: "灵幻",
      desc: "灵曜朗照，洞彻幽冥。人物法攻+180，法暴+40。",
      playerFlat: { matk: 180, mcrit: 40 }
    },
    mount_sk_liedi: {
      id: "mount_sk_liedi",
      name: "裂地震魄",
      quality: "蓝",
      color: "#3498db",
      pool: "风雷",
      desc: "雷霆万钧，崩山裂石。人物物攻+180，物暴+40。",
      playerFlat: { patk: 180, pcrit: 40 }
    },
    mount_sk_xianyuan: {
      id: "mount_sk_xianyuan",
      name: "仙源涤尘",
      quality: "蓝",
      color: "#3498db",
      pool: "灵幻",
      desc: "仙露琼浆滋养周身。人物法力+1200，战斗生命恢复+30。",
      playerFlat: { mp: 1200, hp_regen: 30 }
    },

    // ---- 绿色技能（优秀辅助） ----
    mount_sk_jianbu: {
      id: "mount_sk_jianbu",
      name: "健步如飞",
      quality: "绿",
      color: "#2ecc71",
      pool: "风雷",
      desc: "身轻如燕，奔行平稳。人物速度+30。",
      playerFlat: { spd: 30 }
    },
    mount_sk_houshi: {
      id: "mount_sk_houshi",
      name: "厚重皮甲",
      quality: "绿",
      color: "#2ecc71",
      pool: "明光",
      desc: "甲胄坚固，抵御外力。人物生命+900，物防+100。",
      playerFlat: { hp: 900, pdef: 100 }
    },
    mount_sk_ningshen: {
      id: "mount_sk_ningshen",
      name: "静心凝神",
      quality: "绿",
      color: "#2ecc71",
      pool: "灵幻",
      desc: "宁静致远，意守灵台。人物法力+600，战斗法力恢复+20。",
      playerFlat: { mp: 600, mp_regen: 20 }
    },
    mount_sk_ruili: {
      id: "mount_sk_ruili",
      name: "锋芒毕露",
      quality: "绿",
      color: "#2ecc71",
      pool: "风雷",
      desc: "厉爪破甲，杀气腾腾。人物物攻+100。",
      playerFlat: { patk: 100 }
    },

    // ---- 白色技能（普通基础） ----
    mount_sk_lingqiao: {
      id: "mount_sk_lingqiao",
      name: "初级灵巧",
      quality: "白",
      color: "#95a5a6",
      pool: "风雷",
      desc: "轻灵腾挪，身法轻捷。骑宠敏捷+20。",
      mountPrimary: { agi: 20 }
    },
    mount_sk_manli: {
      id: "mount_sk_manli",
      name: "初级蛮力",
      quality: "白",
      color: "#95a5a6",
      pool: "风雷",
      desc: "气力充盈，四蹄生劲。骑宠强壮+20。",
      mountPrimary: { str: 20 }
    },
    mount_sk_qiangjian: {
      id: "mount_sk_qiangjian",
      name: "初级强健",
      quality: "白",
      color: "#95a5a6",
      pool: "明光",
      desc: "根骨扎实，耐性悠长。骑宠耐力+20。",
      mountPrimary: { con: 20 }
    },
    mount_sk_congming: {
      id: "mount_sk_congming",
      name: "初级聪慧",
      quality: "白",
      color: "#95a5a6",
      pool: "灵幻",
      desc: "开蒙灵智，通晓灵意。骑宠智力+20。",
      mountPrimary: { int: 20 }
    }
  };

  const uid = () => Math.random().toString(16).slice(2, 10);

  function mountById(id) {
    return MOUNTS.find((m) => m.id === id) || null;
  }

  function soulDefById(defId) {
    return SOUL_DEFS[defId] || null;
  }

  function skillDefById(skillId) {
    return SKILL_DEFS[skillId] || null;
  }

  function skillPillById(pillId) {
    return SKILL_PILLS[pillId] || null;
  }

  // 创建兽魂实例
  function makeSoulInstance(defId, lv = 1, exp = 0) {
    const def = soulDefById(defId) || SOUL_DEFS.soul_suiling;
    return {
      uid: uid(),
      defId: def.id,
      name: def.name,
      quality: def.quality,
      color: def.color,
      lv: Math.min(CONST.MAX_SOUL_LEVEL, Math.max(1, lv)),
      exp: Math.max(0, exp)
    };
  }

  // 创建骑宠实例
  function makeMountInstance(defId, customName) {
    const def = mountById(defId) || MOUNTS[0];
    return {
      uid: uid(),
      defId: def.id,
      name: customName || def.name,
      reqLevel: def.reqLevel,
      level: 1,                       // 成熟等级，初始 1 级
      exp: 0,                         // 当前经验
      expNeed: CONST.MOUNT_EXP_NEED(1),// 升级所需经验
      loyalty: 100,                   // 忠诚度（上限 100）
      intimacy: 120,                  // 亲密度
      unspent: 0,                     // 潜力点（每升 1 级 +2 点）
      primary: { ...def.basePrimary },// 一级属性
      contracts: [],                  // 契约参战宠 UID 列表（最多 2 只）
      soul: null,                     // 装备的兽魂（每骑可装备 1 个）
      skills: [                       // 骑宠技能列表（v1.2 新增，最多 1 紫 3 蓝，≥2级生效）
        { id: "mount_sk_fengchi", level: 2 } // 预置 1 个 2 级蓝色技能「风驰电掣」，初始即刻体验加成
      ]
    };
  }

  TSQ.MountData = {
    CONST,
    MOUNTS,
    SOUL_DEFS,
    SKILL_CONST,
    SKILL_PILLS,
    SKILL_DEFS,
    mountById,
    soulDefById,
    skillDefById,
    skillPillById,
    makeSoulInstance,
    makeMountInstance
  };
})();

