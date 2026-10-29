/* 精灵 / 萝莉 数据配置 v1.1
   ─────────────────────────────────────────────────────────────────────
   来源：
   - 规格：_brief/spec-spirit.md §7.4 精灵 / 萝莉 / 南瓜
   - 规则：
     * 精灵王国（仙境府邸）：20 个精灵徽章兑换白精灵；
     * 精灵养成简化：阶 1–9 × 级 1–5（共 45 级进度）；
     * 培养消耗元神：等级 <139 时普通培养扣 30500 元神（3.05 万元神 ⚙），>=139 时 45000 元神；元神不足则提示且不升级；
     * 精灵加成同时作用于人物与出战宠物：进入 combatStats，并在宠物战力/属性展示里可见；
     * 萝莉养成：阶 1–5 × 级 1–9（共 45 级进度）；培养按钮消耗元神；加成进人物属性。
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const CONST = {
    EXCHANGE_BADGE_COST: 20,              // 20 个精灵徽章换 1 只白精灵
    DEMO_BADGE_COUNT: 40,                 // 演示角色预置精灵徽章数量（>=20）
    SPIRIT_MAX_RANK: 9,                   // 精灵最高 9 阶
    SPIRIT_MAX_LEVEL: 5,                  // 精灵每阶 5 级（9×5 = 45 级）
    LOLI_MAX_RANK: 5,                     // 萝莉最高 5 阶
    LOLI_MAX_LEVEL: 9,                    // 萝莉每阶 9 级（5×9 = 45 级）
    TRAIN_COST_LOW: 30500,                // <139 级普通培养扣 30500 元神（3.05 万 ⚙）
    TRAIN_COST_HIGH: 45000,               // >=139 级普通培养扣 45000 元神（4.50 万 ⚙）
  };

  // 白精灵定义
  const SPIRIT_WHITE = {
    id: "spirit_white",
    name: "白精灵",
    color: "#e0f7fa",
    icon: "🧚‍♀️",
    desc: "来自仙境府邸精灵王国的天地仙灵，纯白无瑕，守护人物与出战宠物同调增幅战力。"
  };

  // 萝莉定义
  const LOLI_DEF = {
    id: "loli_catherine",
    name: "小萝莉",
    icon: "👧",
    desc: "天书原版卡萝莉养成，娇小体贴，随修行突破为人物提供深厚属性庇护。"
  };

  // 计算精灵属性加成（同时作用于人物与出战宠物）
  // 9 阶 × 5 级，进度 1~45。满级达成：攻击 >750、速度 >210、蓝血 >5000、防御 >450
  function spiritStats(rank, level) {
    const r = Math.max(1, Math.min(CONST.SPIRIT_MAX_RANK, rank || 1));
    const lv = Math.max(1, Math.min(CONST.SPIRIT_MAX_LEVEL, level || 1));
    const step = (r - 1) * CONST.SPIRIT_MAX_LEVEL + lv; // 1 ~ 45

    return {
      step,
      flat: {
        hp: step * 120,    // 满级 +5400
        mp: step * 60,     // 满级 +2700
        patk: step * 18,   // 满级 +810
        matk: step * 18,   // 满级 +810
        pdef: step * 11,   // 满级 +495
        mdef: step * 11,   // 满级 +495
        spd: step * 5,     // 满级 +225
        str: step * 2,
        con: step * 2,
        agi: step * 2,
        int: step * 2,
        fai: step * 2
      },
      pct: {}
    };
  }

  // 计算萝莉属性加成（作用于人物属性）
  // 5 阶 × 9 级，进度 1~45
  function loliStats(rank, level) {
    const r = Math.max(1, Math.min(CONST.LOLI_MAX_RANK, rank || 1));
    const lv = Math.max(1, Math.min(CONST.LOLI_MAX_LEVEL, level || 1));
    const step = (r - 1) * CONST.LOLI_MAX_LEVEL + lv; // 1 ~ 45

    return {
      step,
      flat: {
        hp: step * 100,    // 满级 +4500
        mp: step * 50,     // 满级 +2250
        patk: step * 16,   // 满级 +720
        matk: step * 16,   // 满级 +720
        pdef: step * 10,   // 满级 +450
        mdef: step * 10,   // 满级 +450
        spd: step * 4,     // 满级 +180
        str: step * 2,
        con: step * 2,
        agi: step * 2,
        int: step * 2,
        fai: step * 2
      },
      pct: {}
    };
  }

  TSQ.SpiritData = {
    CONST,
    SPIRIT_WHITE,
    LOLI_DEF,
    spiritStats,
    loliStats
  };
})();

