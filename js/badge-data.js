/* 徽章 / 元神 数据配置 v0.8
   ─────────────────────────────────────────────────────────────────────
   来源：
   - 徽章系统：17173 徽章系统 2009、官指与玩家实测（D-惊舟、D-曦月）
     本质为代币账本 + 属性加成；大类包含副本徽章（驱邪等）、帮会徽章、
     活动徽章（精灵/妖王/拼图等）、成就徽章、挑战徽章等。
     名称对齐原作；佩戴上限与属性数值为 ⚙ 默认。
   - 元神系统：官指·元神概述 26259、官指·天资地灵 26260
     元神既是资源池（元神值，用于附魔/灵修），也是人物属性体系。
     等级 1–10（⚙ 默认），每 2 级附魔倍率 +1 倍（上限 ×5）。
     升级耗道具「元神丹」或银两。

   规则：
   - 所有规格未公开的数值一律标 ⚙ 默认，集中在下方 CONST。
   - 本文件只放数据；逻辑在 js/badge.js 和 js/yuanshen.js。
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const CONST = {
    // ---------- 徽章 ----------
    MAX_WEAR: 3,                              // ⚙ 默认：最多佩戴 3 枚徽章
    BADGE_MAX_LV: 10,                         // ⚙ 默认：徽章最高等级
    DEMO: {
      grantBadges: ["quxie", "chaoyun", "gumu", "jingling", "chengjiu", "yaowang"], // 演示角色初始发放 6 枚
      wearBadges: ["quxie", "chaoyun"]        // 默认佩戴 2 枚
    },

    // ---------- 元神 ----------
    YS_MAX_LV: 10,                            // ⚙ 默认：元神最高 10 级
    YS_MAX_MULT: 5,                           // ⚙ 默认：附魔倍率上限 ×5
    YS_PILL_EXP: 500,                         // ⚙ 默认：1 颗元神丹 = 500 元神经验
    YS_SILVER_PER_LV: 50000,                  // ⚙ 默认：银两升级 = 目标等级 × 50000 银
    YS_VALUE_PER_LV: 100000,                  // ⚙ 默认：每升 1 级元神值 +100000×等级
    YS_EXP_NEED: (lv) => Math.round(1000 * Math.pow(lv, 1.5)) // ⚙ 默认：升级经验公式
  };

  const PILL = {
    id: "ys_pill",
    name: "元神丹",
    desc: "凝聚天地元气的灵丹，服之可获得 500 点元神经验，可用于元神升级突破。"
  };

  const BADGES = [
    {
      id: "quxie",
      name: "驱邪徽章",
      cat: "副本徽章",
      src: "驱邪副本",
      icon: "🛡️",
      desc: "45级驱邪副本BOSS产出，见证斩妖除魔的荣耀，亦可在NPC处兑换蓝色喜洋羊。",
      stats: { hp: 1200, pdef: 160 }
    },
    {
      id: "chaoyun",
      name: "朝云徽章",
      cat: "系统徽章",
      src: "朝云日常",
      icon: "📜",
      desc: "朝云国度日常修行颁发，可向朝云使者兑换进阶技能书。",
      stats: { patk: 180, matk: 180 }
    },
    {
      id: "gumu",
      name: "古墓徽章",
      cat: "副本徽章",
      src: "古墓探险",
      icon: "⚔️",
      desc: "探索千年古墓险境所得荣誉代币，可向守墓隐士兑换天资秘卷。",
      stats: { str: 40, con: 40 }
    },
    {
      id: "jingling",
      name: "精灵徽章",
      cat: "活动徽章",
      src: "精灵指引",
      icon: "🧚",
      desc: "受灵昌仙子认可获赠的仙灵印记，积攒可兑换白精灵灵宠。",
      stats: { int: 45, fai: 45 }
    },
    {
      id: "chengjiu",
      name: "成就徽章",
      cat: "成就徽章",
      src: "帮会BOSS",
      icon: "🏆",
      desc: "协力击破帮会领地魔物首领的至高勋章，150个可换取圣阶内丹。",
      stats: { hp: 2000, hp_pct: 0.03 }
    },
    {
      id: "yaowang",
      name: "妖王徽章",
      cat: "活动徽章",
      src: "封印妖王",
      icon: "👹",
      desc: "降服凶暴世界妖王留存的气息结晶，可换取封印元神宝箱。",
      stats: { patk: 220, pcrit: 50 }
    },
    {
      id: "tiaozhan",
      name: "挑战徽章",
      cat: "挑战徽章",
      src: "挑战仙葫",
      icon: "🏅",
      desc: "通关天地秘境连环挑战的功勋证明，用于领取挑战仙葫。",
      stats: { spd: 80, spd_pct: 0.02 }
    },
    {
      id: "banghui",
      name: "帮会徽章",
      cat: "帮会徽章",
      src: "帮会商人",
      icon: "🚩",
      desc: "帮会商业货运往来的信物，可在帮会商城兑换手镯饰品升星材料。",
      stats: { pdef: 200, mdef: 200 }
    }
  ];

  function badgeById(id) {
    return BADGES.find((b) => b.id === id) || null;
  }

  TSQ.BadgeData = {
    CONST,
    PILL,
    BADGES,
    badgeById
  };
})();

