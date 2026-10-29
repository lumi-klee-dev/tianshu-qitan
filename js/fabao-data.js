/* 法宝系统数据配置 v0.9
   ─────────────────────────────────────────────────────────────────────
   来源：
   - 规格：_brief/spec-title-fabao.md §7.5 法宝【已证实｜官告 2015-06-09】
   - 规则：
     * 三转后新增装备位“法宝”；
     * 用「印记之魂」进阶，每进 1 阶属性 +15（⚙ 默认 +15 主属性）；
     * 阶数上限默认 10 阶 ⚙；
     * 装备 1 件；浮窗显示阶数与属性；
     * createHero / migrate 发放 1 件法宝 + 若干印记之魂。
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const CONST = {
    MAX_RANK: 10,                 // ⚙ 默认：法宝最高 10 阶
    STAT_PER_RANK: 15,            // 规格官方原话：每进 1 阶属性 +15（⚙ 默认 +15 主属性）
    REQ_REBIRTH: 3,               // 规格：三转后开启装备位
    // 进阶消耗印记之魂公式：升到下一阶所需印记之魂（1→2耗1，2→3耗2... 9→10耗9）
    SOUL_COST: (currentRank) => Math.max(1, currentRank),
    DEMO: {
      grantSoulCount: 35,         // ⚙ 默认：初始发放 35 颗印记之魂（足够进阶多次体验）
      grantFabaos: [
        "fabao_fanhuanyin",       // 番天印（主属性：强壮）
        "fabao_zhaoyaojing",      // 照妖镜（主属性：智力）
        "fabao_dinghaizhu"        // 定海珠（主属性：耐力）
      ],
      defaultEquipped: "fabao_fanhuanyin", // 默认装备 1 件
      defaultRank: 1                       // 初始 1 阶
    }
  };

  const SOUL_ITEM = {
    id: "yinji_soul",
    name: "印记之魂",
    desc: "三转法宝进阶所用的通灵神物，蕴含无上灵性，可大幅激发出法宝的主属性潜能。"
  };

  const FABAO_LIST = [
    {
      id: "fabao_fanhuanyin",
      name: "番天印",
      type: "fabao",
      icon: "印",
      color: "orange",
      tier: "radiant",
      primaryStat: "str",
      primaryStatName: "强壮",
      baseStats: { str: 45, con: 30, hp: 1200, patk: 160 }, // ⚙ 默认基础属性
      desc: "阐教上仙封神至宝，翻手为云覆手为雨，掷出有撼岳摧峰之威。以印记之魂淬炼，可大幅激发出无穷强壮神力。"
    },
    {
      id: "fabao_zhaoyaojing",
      name: "照妖镜",
      type: "fabao",
      icon: "镜",
      color: "orange",
      tier: "radiant",
      primaryStat: "int",
      primaryStatName: "智力",
      baseStats: { int: 45, agi: 30, mp: 800, matk: 160 }, // ⚙ 默认基础属性
      desc: "上古玄天巡游神镜，宝光四溢，洞彻诸般妖氛气机与法理玄奥。以印记之魂淬炼，可极大拓展修真者之灵台智力。"
    },
    {
      id: "fabao_dinghaizhu",
      name: "定海珠",
      type: "fabao",
      icon: "珠",
      color: "orange",
      tier: "radiant",
      primaryStat: "con",
      primaryStatName: "耐力",
      baseStats: { con: 45, fai: 30, hp: 1800, pdef: 120, mdef: 120 }, // ⚙ 默认基础属性
      desc: "截教奇珍定海神珠，散发五色毫光，眩敌心神，平定沧海风涛。以印记之魂淬炼，可大幅筑牢修真者之坚韧耐力。"
    },
    {
      id: "fabao_huntianling",
      name: "混天绫",
      type: "fabao",
      icon: "绫",
      color: "orange",
      tier: "radiant",
      primaryStat: "agi",
      primaryStatName: "敏捷",
      baseStats: { agi: 45, str: 20, spd: 50, pdodge: 35, mdodge: 35 }, // ⚙ 默认基础属性
      desc: "七尺红绫游龙弄波，包罗万象，舞动间翻江倒海、行若游风。以印记之魂淬炼，可使修真者身法敏捷达到化境。"
    }
  ];

  function fabaoById(id) {
    return FABAO_LIST.find((f) => f.id === id) || null;
  }

  TSQ.FabaoData = {
    CONST,
    SOUL_ITEM,
    FABAO_LIST,
    fabaoById
  };
})();

