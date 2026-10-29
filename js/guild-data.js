/* 帮会武功（帮会科技）数据配置 v1.2
   ─────────────────────────────────────────────────────────────────────
   来源：
   - 规格：_brief/spec-r9.md §7.8 帮会武功、_brief/第九轮任务_下一系统.md
   - 规则：
     * 入口：帮会大厅 帮会使者 →「使用帮会科技」→ 武功页（需要 3000 帮会活跃度）；
     * 帮会捐献官处显示的是帮会开放的上限，不是个人进度；
     * 武功项目：生命（HP）、法力（MP）、怒气、恢复、物理攻击、法术攻击（6 项）；
     * 每项 10 级 × 10 星，每星 +0.5% 对应属性 ⚙；
     * 消耗：帮贡 + 银两升级（同时可消耗人物经验 + 元魄）；
     * 元魄来源：帮会捐献（上古神器碎片 3250、失落的锻造法整页约 1.9 万、醒悟丹 5 万）；
     * 人物等级 ≥125 解锁（演示角色满足）。
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const CONST = {
    REQ_LEVEL: 125,               // 人物等级 ≥125 解锁
    REQ_ACTIVITY: 3000,           // 需要 3000 帮会活跃度
    MAX_LEVEL: 10,                // 10 级
    MAX_STAR: 10,                 // 每级 10 星 (0~9 星满后升下一级)
    PCT_PER_STAR: 0.005,          // 每星 +0.5% 对应属性 ⚙
    RAGE_PER_STAR: 2,             // 怒气每星 +2 怒气上限与开局怒气 ⚙
    RECOVERY_PER_STAR: 8,         // 恢复每星 +8 战斗生命/法力自然恢复 ⚙
    DEFAULT_TECH_CAP_LEVEL: 10,   // 帮会开放上限等级（帮会捐献官处显示）
    DEFAULT_TECH_CAP_STAR: 10     // 帮会开放上限星数
  };

  const SKILLS = [
    {
      id: "hp",
      name: "强身诀",
      alias: "生命（HP）",
      icon: "❤️",
      type: "hp",
      desc: "引九阳真气灌顶，强韧体魄血海。每星提升 0.5% 生命上限。",
      calcBonus: (lv, star) => {
        const totalStars = Math.max(0, (lv - 1) * 10 + star);
        return { flat: {}, pct: { hp_pct: totalStars * CONST.PCT_PER_STAR } };
      }
    },
    {
      id: "mp",
      name: "聚气诀",
      alias: "法力（MP）",
      icon: "💙",
      type: "mp",
      desc: "拓充紫府丹田，法力滔滔绵延不绝。每星提升 0.5% 法力上限。",
      calcBonus: (lv, star) => {
        const totalStars = Math.max(0, (lv - 1) * 10 + star);
        return { flat: {}, pct: { mp_pct: totalStars * CONST.PCT_PER_STAR } };
      }
    },
    {
      id: "patk",
      name: "破军诀",
      alias: "物理攻击",
      icon: "⚔️",
      type: "patk",
      desc: "破阵摧坚，霸烈刚猛。每星提升 0.5% 物理攻击力。",
      calcBonus: (lv, star) => {
        const totalStars = Math.max(0, (lv - 1) * 10 + star);
        return { flat: {}, pct: { patk_pct: totalStars * CONST.PCT_PER_STAR } };
      }
    },
    {
      id: "matk",
      name: "凝神诀",
      alias: "法术攻击",
      icon: "🔮",
      type: "matk",
      desc: "万法归宗，神念引动天劫。每星提升 0.5% 法术攻击力。",
      calcBonus: (lv, star) => {
        const totalStars = Math.max(0, (lv - 1) * 10 + star);
        return { flat: {}, pct: { matk_pct: totalStars * CONST.PCT_PER_STAR } };
      }
    },
    {
      id: "recovery",
      name: "仙元诀",
      alias: "恢复",
      icon: "🌿",
      type: "recovery",
      desc: "万物回春，仙气护体生生不息。每星提升 0.5% 仙法治疗恢复，战斗中每回合回复生命/法力 +8 点。",
      calcBonus: (lv, star) => {
        const totalStars = Math.max(0, (lv - 1) * 10 + star);
        return {
          flat: { hp_regen: totalStars * CONST.RECOVERY_PER_STAR, mp_regen: totalStars * CONST.RECOVERY_PER_STAR },
          pct: {}
        };
      }
    },
    {
      id: "rage",
      name: "狂怒诀",
      alias: "怒气",
      icon: "🔥",
      type: "rage",
      desc: "气血激昂，焚天灭地。每星提升 2 点怒气上限与开局怒气储备。",
      calcBonus: (lv, star) => {
        const totalStars = Math.max(0, (lv - 1) * 10 + star);
        return { flat: {}, pct: {}, rage: totalStars * CONST.RAGE_PER_STAR };
      }
    }
  ];

  // 帮会捐献配置（规格证实：上古神器碎片 3250、失落的锻造法整页约 1.9 万、醒悟丹 5 万）
  const DONATIONS = [
    {
      id: "donate_shanggu",
      name: "上古神器碎片",
      matId: "shanggu_1",
      matName: "上古神器碎片",
      costNum: 1,
      yuanpoGain: 3250,
      contribGain: 120,
      desc: "捐献 1 枚上古神器碎片，为帮会提供上古元力，可获 3,250 元魄与 120 帮会贡献。"
    },
    {
      id: "donate_lost_manual",
      name: "失落的锻造法整页",
      matId: "lost_manual",
      matName: "失落的锻造法",
      costNum: 1,
      yuanpoGain: 19000,
      contribGain: 650,
      desc: "捐献 1 页失落的锻造法珍本秘册，可获 19,000 元魄与 650 帮会贡献。"
    },
    {
      id: "donate_wake_pill",
      name: "醒悟丹",
      matId: "bodhi",
      matName: "醒悟丹/菩提果",
      costNum: 1,
      yuanpoGain: 50000,
      contribGain: 1800,
      desc: "捐献 1 颗仙家醒悟灵丹，可获 50,000 元魄与 1,800 帮会贡献。"
    },
    {
      id: "donate_silver",
      name: "银两捐献",
      matId: null,
      matName: "现银",
      silverCost: 100000,
      yuanpoGain: 5000,
      contribGain: 300,
      desc: "捐献 100,000 银两充实帮会库房，可获 5,000 元魄与 300 帮会贡献。"
    }
  ];

  function skillById(id) {
    return SKILLS.find((s) => s.id === id) || null;
  }

  // 升级消耗计算：帮贡 + 银两（同时扣除元魄与少量经验）
  function calcUpgradeCost(lv, star) {
    const totalStars = (lv - 1) * 10 + star + 1;
    return {
      contrib: 50 + totalStars * 15,
      silver: 8000 + totalStars * 2000,
      yuanpo: 120 + totalStars * 40,
      exp: 500 + totalStars * 200
    };
  }

  TSQ.GuildData = {
    CONST,
    SKILLS,
    DONATIONS,
    skillById,
    calcUpgradeCost
  };
})();

