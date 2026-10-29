/* 称号系统数据配置 v0.9
   ─────────────────────────────────────────────────────────────────────
   来源：
   - 规格：_brief/spec-title-fabao.md §7.9 称号与光辉【已证实｜官指·称号】
   - 规则：
     * 称号在皇城姜太后处领取，按系列分等级（如活动系列、成就系列、PK系列、剧情系列）；
     * 佩戴 1 个生效；可随时卸下；
     * 光辉系统给带属性效果的称号，具体加成没公开 → 缺数标 ⚙ 默认，集中常量；
     * 属性加成直接计入 totalPrimary 与 combatStats。
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const CONST = {
    MAX_WEAR: 1, // 规格：同时只能佩戴 1 个生效
    DEMO: {
      grantTitles: [
        "chaoyun_xinxiu",   // 朝云新秀（剧情系列，默认发放并佩戴）
        "wulin_zhizun",     // 武林至尊（PK系列）
        "tianxuan_zhiren",  // 天选之人（成就系列）
        "fumo_dashi",       // 伏魔大宗师（活动系列）
        "yishi_gaoren",     // 世外高人（成就系列）
        "lingchang_shouhu", // 灵昌守护者（活动系列）
        "tianxia_wushuang"  // 天下无双（PK系列）
      ],
      defaultWorn: "chaoyun_xinxiu" // ⚙ 默认佩戴 1 个
    }
  };

  const TITLES = [
    {
      id: "chaoyun_xinxiu",
      name: "朝云新秀",
      cat: "剧情系列",
      src: "皇城姜太后处领取",
      icon: "🌱",
      desc: "初涉江湖受皇城姜太后器重的年轻修真者，初凝微弱光辉，护佑周身气血。",
      stats: { hp: 1200, patk: 80, matk: 80 } // ⚙ 默认
    },
    {
      id: "wulin_zhizun",
      name: "武林至尊",
      cat: "PK系列",
      src: "天下第一擂台争锋",
      icon: "👑",
      desc: "横扫八荒、问鼎武林之巅的至尊荣耀。附带霸烈光辉，大幅提升攻伐之威。",
      stats: { patk: 260, matk: 260, patk_pct: 0.03, matk_pct: 0.03 } // ⚙ 默认
    },
    {
      id: "tianxuan_zhiren",
      name: "天选之人",
      cat: "成就系列",
      src: "参透天书残卷秘辛",
      icon: "✨",
      desc: "宿命中承载天书机缘的有缘者，环绕神圣光辉，气血充盈，身法敏锐。",
      stats: { hp: 2200, hp_pct: 0.04, spd: 40 } // ⚙ 默认
    },
    {
      id: "fumo_dashi",
      name: "伏魔大宗师",
      cat: "活动系列",
      src: "荡平千百妖魔洞府",
      icon: "🗡️",
      desc: "斩妖诛邪无数的得道仙长，浩然正气化作诛邪光辉，坚如磐石，法眼无遗。",
      stats: { pdef: 240, mdef: 240, hit: 60 } // ⚙ 默认
    },
    {
      id: "yishi_gaoren",
      name: "世外高人",
      cat: "成就系列",
      src: "深谷洞天避世苦修",
      icon: "🧘",
      desc: "超然物外、功参造化的隐世巨擘。五行光辉生生不息，五项主属性全面精进。",
      stats: { str: 35, con: 35, agi: 35, int: 35, fai: 35 } // ⚙ 默认
    },
    {
      id: "lingchang_shouhu",
      name: "灵昌守护者",
      cat: "活动系列",
      src: "灵昌古城保卫战",
      icon: "🛡️",
      desc: "誓死护佑灵昌繁华的朝云名将，受万民愿力加持，疾步如风，飘逸善避。",
      stats: { spd: 80, spd_pct: 0.03, pdodge: 45, mdodge: 45 } // ⚙ 默认
    },
    {
      id: "tianxia_wushuang",
      name: "天下无双",
      cat: "PK系列",
      src: "跨服巅峰争霸胜者",
      icon: "🔥",
      desc: "纵横天地无可匹敌的盖世强者。光芒炽烈，暴烈绝伦。",
      stats: { pcrit: 80, mcrit: 80, patk: 180, matk: 180 } // ⚙ 默认
    }
  ];

  function titleById(id) {
    return TITLES.find((t) => t.id === id) || null;
  }

  TSQ.TitleData = {
    CONST,
    TITLES,
    titleById
  };
})();

