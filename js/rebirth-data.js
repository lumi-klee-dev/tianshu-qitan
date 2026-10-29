/* 转生与联盟转职数据配置 v1.3
   ─────────────────────────────────────────────────────────────────────
   来源：
   - 规格：_brief/spec-r10.md §3 转生系统
   - 一转：≥75 级，道具 天书，等级换算，返还自由潜力与心法经验，额外+10潜力，资质提升，技能经验双倍，满级 139；
   - 二转：一转 ≥134 级，道具 天卷灵丹，等级换算（134→125, 135→126），额外+10潜力，资质+10% ⚙，开放活力与历练，满级 162；
   - 三转：≥162 级，道具 天赐祝福，收回战宠与骑乘，等级降至 30 级，满级 179；
   - 三转联盟转职：幻想城 菩提子，坚韧天选者 / 勇武天选者 二选一；
     每联盟 6 个被动 ⚙（1~10 级），消耗元神升级，全额计入人物属性与 combatStats。
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const CONST = {
    MAX_LEVEL_BY_REBIRTH: {
      0: 100, // 未转
      1: 139, // 一转
      2: 162, // 二转
      3: 179  // 三转
    },
    REQ: {
      rebirth1: {
        level: 75,
        itemId: "tianshu",
        itemName: "天书",
        bonusPotential: 10
      },
      rebirth2: {
        level: 134,
        itemId: "tianjuan_lingdan",
        itemName: "天卷灵丹",
        bonusPotential: 10,
        aptBonusPct: 0.10
      },
      rebirth3: {
        level: 162,
        itemId: "tianci_zhufu",
        itemName: "天赐祝福",
        resetLevel: 30
      }
    },
    // 一转等级对照表
    REBIRTH1_LEVEL_TABLE: [
      { pre: 75, post: 60 },
      { pre: 80, post: 63 },
      { pre: 85, post: 66 },
      { pre: 90, post: 70 },
      { pre: 95, post: 75 },
      { pre: 100, post: 80 }
    ],
    // 联盟被动升级消耗元神公式：当前等级 * 100,000 元神
    PASSIVE_UPGRADE_COST: function (curLv) {
      return curLv * 100000;
    },
    MAX_PASSIVE_LEVEL: 10
  };

  // 转生信物道具说明
  const ITEMS = {
    tianshu: {
      id: "tianshu",
      name: "天书",
      icon: "📜",
      desc: "洞悉天地造化玄机的奇书，用于人物一转涅槃转生。"
    },
    tianjuan_lingdan: {
      id: "tianjuan_lingdan",
      name: "天卷灵丹",
      icon: "🔮",
      desc: "由迷魂谷九卷残卷与灵引符炼制而成的无上仙丹，用于人物二转脱胎换骨。"
    },
    tianci_zhufu: {
      id: "tianci_zhufu",
      name: "天赐祝福",
      icon: "✨",
      desc: "承载洪荒仙葫造化与天地祝福的神圣凭证，用于人物三转飞升成圣。"
    }
  };

  // 三转联盟与专职被动配置
  const ALLIANCES = {
    tenacity: {
      id: "tenacity",
      name: "坚韧天选者",
      icon: "🛡️",
      npc: "菩提子（幻想城）",
      desc: "主修防御、辅助技能，辅修攻击、控制技能。受玄武圣力庇佑，坚不可摧。",
      passives: [
        {
          id: "xuanwu_yujia",
          name: "玄武御甲",
          statType: "防御",
          icon: "🛡️",
          desc: "大幅强化体魄护甲，每级物防 +60、法防 +60",
          calc: (lv) => ({ pdef: lv * 60, mdef: lv * 60 })
        },
        {
          id: "tianyuan_guben",
          name: "天元固本",
          statType: "生命",
          icon: "❤️",
          desc: "固本培元，每级生命上限 +1500",
          calc: (lv) => ({ hp: lv * 1500 })
        },
        {
          id: "fudong_mingwang",
          name: "不动明王",
          statType: "韧性",
          icon: "🗿",
          desc: "明王不动如山，每级暴击抵抗 +1.5%、防暴闪避 +10",
          calc: (lv) => ({ imdodge: lv * 10, anti_crit: lv * 0.015 })
        },
        {
          id: "dinghai_jinglan",
          name: "定海静澜",
          statType: "控制抵抗",
          icon: "🌊",
          desc: "心境宁静如渊，每级控制抵抗 +1.5%、法术防御 +40",
          calc: (lv) => ({ res_ctrl: lv * 0.015, mdef: lv * 40 })
        },
        {
          id: "changsheng_ganlu",
          name: "长生甘露",
          statType: "治疗加成",
          icon: "💧",
          desc: "长生甘霖普降，每级治疗加成 +2%、生命 +500",
          calc: (lv) => ({ heal_bonus: lv * 0.02, hp: lv * 500 })
        },
        {
          id: "qihai_kuanglan",
          name: "气海狂澜",
          statType: "怒气回复",
          icon: "⚡",
          desc: "气聚丹田，每级战斗每回合额外恢复怒气 +1",
          calc: (lv) => ({ rage_turn: lv * 1 })
        }
      ]
    },
    valiance: {
      id: "valiance",
      name: "勇武天选者",
      icon: "⚔️",
      npc: "菩提子（幻想城）",
      desc: "主修攻击、控制技能，辅修防御、辅助技能。持开天之威，摧枯拉朽。",
      passives: [
        {
          id: "kaitian_posha",
          name: "开天破煞",
          statType: "攻击",
          icon: "⚔️",
          desc: "力劈混沌，每级物理攻击 +80、法术攻击 +80",
          calc: (lv) => ({ patk: lv * 80, matk: lv * 80 })
        },
        {
          id: "zhuxian_baoli",
          name: "诛仙暴戾",
          statType: "暴击",
          icon: "💥",
          desc: "煞气凌冽，每级物理暴击 +15、法术暴击 +15、暴击率 +1.5%",
          calc: (lv) => ({ pcrit: lv * 15, mcrit: lv * 15, crit_pct: lv * 0.015 })
        },
        {
          id: "wuxiang_chuanjia",
          name: "无相穿甲",
          statType: "忽视防御",
          icon: "🗡️",
          desc: "无形锋芒破万甲，每级忽视防御 +15、穿透 +15",
          calc: (lv) => ({ imdef: lv * 15, pierce: lv * 15 })
        },
        {
          id: "shehun_duopo",
          name: "摄魂夺魄",
          statType: "控制加强",
          icon: "🌀",
          desc: "攻其不备摄敌心神，每级控制加强 +1.5%、法术攻击 +40",
          calc: (lv) => ({ ctrl_hit: lv * 0.015, matk: lv * 40 })
        },
        {
          id: "zhuri_jinglei",
          name: "逐日惊雷",
          statType: "速度",
          icon: "⚡",
          desc: "身轻如燕风雷疾走，每级战斗先手速度 +15",
          calc: (lv) => ({ spd: lv * 15 })
        },
        {
          id: "shenmu_rudian",
          name: "神目如电",
          statType: "命中",
          icon: "🎯",
          desc: "明察秋毫矢无虚发，每级物理命中 +15、法术命中 +15",
          calc: (lv) => ({ phit: lv * 15, mhit: lv * 15 })
        }
      ]
    }
  };

  TSQ.RebirthData = {
    CONST,
    ITEMS,
    ALLIANCES,
    allianceById: (id) => ALLIANCES[id] || null
  };
})();

