/* 经脉与元神地灵数据配置 v1.4
   ─────────────────────────────────────────────────────────────────────
   来源：
   - 规格：_brief/spec-r11.md
     * §4.3 地灵：玄 / 毒 / 火 / 冰 4 项属性减伤；消耗元神 + 银票/银两；
       每级减伤 1.5% × 等级，上限 60% ⚙（40 级满级）。
     * §4.4 经脉：奇经八脉（任、督、冲、带、阴维、阳维、阴跷、阳跷 ⚙）；
       每脉 6 穴，每穴 10 层；升层消耗 技能经验 + 人物经验；
       每层加一级属性（每脉对应一项 ⚙）；
       穴位升到第 10 层「激活」额外消耗 1 个 大还丹（金币商城/演示礼包）；
       第 5 穴（50 层）给该系技能强化标记、第 6 穴（60 层）给 11 级技能额外效果。
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const DILING = {
    MAX_LEVEL: 40,
    REDUCE_PER_LEVEL: 0.015,
    MAX_REDUCE: 0.60,
    ELEMENTS: [
      { id: "xuan", name: "玄灵", element: "玄", statKey: "res_xuan", desc: "减免玄属性天资技能与法术伤害" },
      { id: "du",   name: "毒灵", element: "毒", statKey: "res_du",   desc: "减免毒属性天资技能与法术伤害" },
      { id: "huo",  name: "火灵", element: "火", statKey: "res_huo",  desc: "减免火属性天资技能与法术伤害" },
      { id: "bing", name: "冰灵", element: "冰", statKey: "res_bing", desc: "减免冰属性天资技能与法术伤害" }
    ],
    // 升级消耗公式（⚙ 默认）：元神 = 2000 × (级+1)²，银票/银两 = (级+1) × 200
    costYuanshen: (curLv) => 2000 * Math.pow(curLv + 1, 2),
    costSilver: (curLv) => (curLv + 1) * 200
  };

  const MERIDIAN = {
    POINTS_PER_MERIDIAN: 6,
    LAYERS_PER_POINT: 10,
    MAX_TOTAL_LAYERS: 480,
    // 升层消耗公式（⚙ 默认）
    costExp: (layer) => (layer + 1) * 3000 + (layer + 1) * (layer + 1) * 300,
    costSkillExp: (layer) => (layer + 1) * 2000 + (layer + 1) * (layer + 1) * 200,
    DAHUANDAN_ID: "dahuandan",
    DAHUANDAN_NAME: "大还丹",
    MERIDIANS: [
      {
        id: "ren",
        name: "任脉",
        attrKey: "con",
        attrName: "耐力",
        desc: "阴脉之海，总统诸阴经。充实气血，生生不息。",
        points: ["会阴", "曲骨", "中极", "关元", "气海", "神阙"],
        boost5: { name: "圣灵护体", desc: "【转生强化】「圣灵附体」法攻系数提升至 0.133，治疗效果激增！", bonus: { con: 15 } },
        boost6: { name: "玄门真罡", desc: "【11级突破】11级玄门真气突破，受击额外减免 3% 最终伤害！", bonus: { con: 25 } }
      },
      {
        id: "du",
        name: "督脉",
        attrKey: "str",
        attrName: "强壮",
        desc: "阳脉之海，总督诸阳经。威猛霸道，力拔山河。",
        points: ["长强", "命门", "悬枢", "脊中", "大椎", "百会"],
        boost5: { name: "穿心刺骨", desc: "【转生强化】「穿心蚀骨」伤害加深 +15%，附加重伤撕裂！", bonus: { str: 15 } },
        boost6: { name: "武圣金身", desc: "【11级突破】11级武圣降世突破，所有物理攻击附加破甲 5%！", bonus: { str: 25 } }
      },
      {
        id: "chong",
        name: "冲脉",
        attrKey: "agi",
        attrName: "敏捷",
        desc: "十二经脉之海，通达周身。迅疾如电，神行百变。",
        points: ["气冲", "横骨", "大赫", "气穴", "四满", "中注"],
        boost5: { name: "疾影瞬杀", desc: "【转生强化】「疾风突刺」暴击率提升 +10%，先发制人！", bonus: { agi: 15 } },
        boost6: { name: "飞影遁虚", desc: "【11级突破】11级飞影幻步突破，闪避成功时反击伤害 +20%！", bonus: { agi: 25 } }
      },
      {
        id: "dai",
        name: "带脉",
        attrKey: "int",
        attrName: "智力",
        desc: "状如束带，总束诸脉。灵通万法，玄火通真。",
        points: ["带脉", "五枢", "维道", "居髎", "环跳", "风市"],
        boost5: { name: "天火燎原", desc: "【转生强化】「玄天心火」灼烧伤害提升 +20%，削减目标法防！", bonus: { int: 15 } },
        boost6: { name: "极意神通", desc: "【11级突破】11级极意心法突破，技能法力消耗降低 15%！", bonus: { int: 25 } }
      },
      {
        id: "yinwei",
        name: "阴维脉",
        attrKey: "fai",
        attrName: "信仰",
        desc: "维络诸阴，主持一身之阴。清净明澈，慈航普渡。",
        points: ["筑宾", "府舍", "大横", "腹哀", "期门", "天突"],
        boost5: { name: "如履冰境", desc: "【转生强化】「如履薄冰」迟缓效果增强，额外削减目标 15% 速度！", bonus: { fai: 15 } },
        boost6: { name: "神威甘露", desc: "【11级突破】11级甘露真诀突破，施法附带驱散队友负面状态！", bonus: { fai: 25 } }
      },
      {
        id: "yangwei",
        name: "阳维脉",
        attrKey: "str",
        attrName: "强壮",
        desc: "维络诸阳，主持一身之表。战意沸腾，裂石开天。",
        points: ["金门", "阳交", "臑会", "天髎", "肩井", "本神"],
        boost5: { name: "千军破势", desc: "【转生强化】「千军破」对濒危目标造成的伤害额外增加 +25%！", bonus: { str: 15 } },
        boost6: { name: "霸王罡魄", desc: "【11级突破】11级霸王诀突破，濒死时自动触发护体罡气！", bonus: { str: 25 } }
      },
      {
        id: "yinqiao",
        name: "阴跷脉",
        attrKey: "agi",
        attrName: "敏捷",
        desc: "起于足跟，主持一身左右之阴。身轻似燕，隐匿潜影。",
        points: ["照海", "水泉", "大钟", "然谷", "交信", "晴明"],
        boost5: { name: "毒龙破心", desc: "【转生强化】「毒龙手」中毒伤害叠加层数上限 +2！", bonus: { agi: 15 } },
        boost6: { name: "幽冥死线", desc: "【11级突破】11级影袭绝杀突破，起手首回合必定产生暴击！", bonus: { agi: 25 } }
      },
      {
        id: "yangqiao",
        name: "阳跷脉",
        attrKey: "int",
        attrName: "智力",
        desc: "起于跟外，主持一身左右之阳。离火焚世，焚尽八荒。",
        points: ["申脉", "仆参", "跗阳", "居髎", "臑俞", "肩髃"],
        boost5: { name: "火神降临", desc: "【转生强化】「火神天将」十字范围附加高阶烈灼易伤！", bonus: { int: 15 } },
        boost6: { name: "离火焚天", desc: "【11级突破】11级八卦离火突破，所有火系技能无视目标 20% 火抗！", bonus: { int: 25 } }
      }
    ]
  };

  TSQ.MeridianData = {
    DILING,
    MERIDIAN
  };
})();

