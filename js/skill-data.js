/* 技能数据 v0.5 —— 4 职业 × 8 系心法全部技能
   ─────────────────────────────────────────────────────────────────────
   来源：
   - 心法与技能归属：官网技能介绍 / 公开 WIKI（8 系：英勇·坚韧·自信·洞察·热诚·迷惑·慈悲·怜悯）
   - 技能效果与数值：js/raw-data/skills.json（官网文字版简化）+ 项目既有战斗公式
   - 转生技能名与前置：官网「转生技能任务」页
     英勇-龙破斩(破釜沉舟) / 坚韧-同生共死(君临天下) / 自信-腐骨蚀心(暗影迷踪拳)
     洞察-穿心蚀骨(疾影袭心) / 热诚-烈焰风暴(恸地神咒) / 迷惑-梦魔咒(暗影魔咒)
     慈悲-仙气护体(仙音化雨) / 怜悯-凝神聚气(昊天罡气)
   - 稀有（天资）技能：玄风刃(玄) / 毒龙手(毒) / 玄天心火(火) / 如履薄冰(冰)
   - 慈悲系多一个稀有技能：妙法莲华

   字段说明：
   id       新技能 id（全局唯一）
   name     原名（与原版一致）
   xf       所属心法 id
   cat      类别：常规 / 转生 / 稀有
   rage     怒气类：回怒1 ~ 回怒4 / 不变 / 耗怒
   prereq   前置技能 id（null 表示无）
   n        编号（常规 1~3；转生/稀有为 0，心法需求另走专用表）
   weight   熟练权重（2 / 3，进熟练度公式做倍数放大）
   dmg      phys / magic / none
   mp       蓝耗 { base, per }：base + per×(等级−1)
   ragePct  耗怒技能消耗怒气比例（占怒气上限）
   desc     一句话效果
   lv11     11 级变化（规格未公开，先存文字）
   formula  公式函数，见 js/skill.js 的 TSQ.Skill.fx

   所有规格未公开的默认数值都标了 ⚙ 默认。
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  // ---- 8 系心法 ----
  // owner：该系归属职业（决定跨职业惩罚）；dmg：该系的伤害类型（物理/法术）
  const XINFA = [
    { id: "yingyong", name: "英勇", owner: "xiake", dmg: "phys", desc: "出手毫无忌惮，豪气冲天，有万夫莫挡之勇。" },
    { id: "jianren", name: "坚韧", owner: "xiake", dmg: "phys", desc: "隐忍而后动，与朋友肝胆相照，侠义在心。" },
    { id: "zixin", name: "自信", owner: "cike", dmg: "phys", desc: "不畏强敌，运用智慧加之自身不俗实力，任何处境皆可化险为夷。" },
    { id: "dongcha", name: "洞察", owner: "cike", dmg: "phys", desc: "侧重封印敌人与降低敌方属性，干扰与控制并存。" },
    { id: "recheng", name: "热诚", owner: "shushi", dmg: "magic", desc: "擅长群体法术，不受法术躲避影响，刷怪与团战主力。" },
    { id: "mihuo", name: "迷惑", owner: "shushi", dmg: "magic", desc: "偏向单体控制与输出，可催眠、可召唤妖魔助战。" },
    { id: "cibei", name: "慈悲", owner: "xiuzhen", dmg: "magic", desc: "治疗与净化，队伍的续航核心。" },
    { id: "lianmin", name: "怜悯", owner: "xiuzhen", dmg: "magic", desc: "护盾与增益，攻守兼备的辅助之道。" }
  ];

  // 职业擅长（本职 2 系，UI 高亮 + 无跨职业惩罚）
  const CLASS_XINFA = {
    xiake: ["yingyong", "jianren"],
    cike: ["zixin", "dongcha"],
    shushi: ["recheng", "mihuo"],
    xiuzhen: ["cibei", "lianmin"]
  };

  // ---- 技能表 ----
  // fx 简写：TSQ.Skill.fx（在 js/skill.js 定义，运行时调用，此处只引用）
  const F = {
    phys: (mult, opt) => (c) => TSQ.Skill.fx.phys(c, mult, opt || {}),
    magic: (mult, opt) => (c) => TSQ.Skill.fx.magic(c, mult, opt || {}),
    heal: (mult, opt) => (c) => TSQ.Skill.fx.heal(c, mult, opt || {}),
    shield: (mult, opt) => (c) => TSQ.Skill.fx.shield(c, mult, opt || {}),
    buff: (status, opt) => (c) => TSQ.Skill.fx.buff(c, status, opt || {}),
    debuff: (mult, status, opt) => (c) => TSQ.Skill.fx.debuff(c, mult, status, opt || {}),
    custom: (fn) => fn
  };

  const SKILLS = {
    /* ─────────────────── 英勇（侠客 · 物理） ─────────────────── */
    fumo: {
      id: "fumo", name: "伏魔刀法", xf: "yingyong", cat: "常规", rage: "回怒1",
      prereq: null, n: 1, weight: 3, dmg: "phys",
      mp: { base: 8, per: 3 }, ragePct: 0,
      desc: "单体物理，几率击晕。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.phys(1.4, { stun: 0.15 })
    },
    beishui: {
      id: "beishui", name: "破釜沉舟", xf: "yingyong", cat: "常规", rage: "回怒4",
      prereq: "fumo", n: 2, weight: 2, dmg: "phys",
      mp: { base: 10, per: 3 }, ragePct: 0,
      desc: "生命不足 20% 时伤害翻倍。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.custom((c) => {
        const low = c.hero.hp / (c.hero.maxHp || 1) < 0.2;
        return TSQ.Skill.fx.phys(c, low ? 2.2 : 1.1, { note: low ? "背水一战（生命<20%）" : "" });
      })
    },
    liumai: {
      id: "liumai", name: "六脉神剑", xf: "yingyong", cat: "常规", rage: "不变",
      prereq: "beishui", n: 3, weight: 1, dmg: "phys",
      mp: { base: 15, per: 4 }, ragePct: 0,
      desc: "群体物理，等级越高目标越多。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      // ⚙ 默认：目标数 = 2 + floor(等级/3)，上限 5
      formula: F.custom((c) => {
        const hits = Math.min(5, 2 + Math.floor(c.lv / 3));
        return TSQ.Skill.fx.phys(c, 0.9, { hits });
      })
    },
    longpoz: {
      id: "longpoz", name: "龙破斩", xf: "yingyong", cat: "转生", rage: "耗怒",
      prereq: "beishui", n: 0, weight: 3, dmg: "phys",
      mp: { base: 24, per: 5 }, ragePct: 0.4,
      desc: "转生技能：消耗怒气的强力单体物理斩击。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.phys(2.0, { stun: 0.2 })
    },

    /* ─────────────────── 坚韧（侠客 · 物理） ─────────────────── */
    lengchao: {
      id: "lengchao", name: "冷嘲热讽", xf: "jianren", cat: "常规", rage: "回怒4",
      prereq: null, n: 1, weight: 2, dmg: "none",
      mp: { base: 8, per: 2 }, ragePct: 0,
      desc: "嘲讽 3 回合，吸引敌人攻击。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.debuff(0, "taunt", { turns: 3, chance: 0.9 })
    },
    junlin: {
      id: "junlin", name: "君临天下", xf: "jianren", cat: "常规", rage: "回怒1",
      prereq: "lengchao", n: 2, weight: 3, dmg: "phys",
      mp: { base: 10, per: 3 }, ragePct: 0,
      desc: "生命越高伤害越高。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.custom((c) => {
        const hpR = c.hero.hp / (c.hero.maxHp || 1);
        return TSQ.Skill.fx.phys(c, 1.3 * (0.6 + 0.4 * hpR), { note: "血量越高伤害越高" });
      })
    },
    guiyuan: {
      id: "guiyuan", name: "一朝归元", xf: "jianren", cat: "常规", rage: "耗怒",
      prereq: "junlin", n: 5, weight: 1, dmg: "phys",
      mp: { base: 6, per: 2 }, ragePct: 0.4,
      desc: "消耗怒气与侠义之心增伤。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.custom((c) => TSQ.Skill.fx.phys(c, 0.7 + c.ragePctUsed * 1.5, { note: "倾泻怒气" }))
    },
    tongshen: {
      id: "tongshen", name: "同生共死", xf: "jianren", cat: "转生", rage: "耗怒",
      prereq: "junlin", n: 0, weight: 3, dmg: "none",
      mp: { base: 22, per: 5 }, ragePct: 0.35,
      desc: "转生技能：与队友分担伤害（原型简化为自身减伤护盾）。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.shield(1.6, { note: "同生共死·分担护盾" })
    },
    xuanfeng: {
      id: "xuanfeng", name: "玄风刃", xf: "jianren", cat: "稀有", rage: "回怒2",
      prereq: null, n: 0, weight: 3, dmg: "phys",
      mp: { base: 20, per: 5 }, ragePct: 0,
      desc: "天资·玄：单体物理并几率衰竭（降攻）。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.phys(1.6, { weak: 0.4 })
    },

    /* ─────────────────── 自信（刺客 · 物理） ─────────────────── */
    qianzhu: {
      id: "qianzhu", name: "千蛛万毒手", xf: "zixin", cat: "常规", rage: "回怒2",
      prereq: null, n: 1, weight: 3, dmg: "phys",
      mp: { base: 8, per: 3 }, ragePct: 0,
      desc: "单体物理，几率中毒。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.phys(1.2, { poison: 0.35 })
    },
    anying: {
      id: "anying", name: "暗影迷踪拳", xf: "zixin", cat: "常规", rage: "回怒1",
      prereq: "qianzhu", n: 2, weight: 2, dmg: "phys",
      mp: { base: 12, per: 3 }, ragePct: 0,
      desc: "速度越高伤害越高，反噬 15% 生命。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.custom((c) => {
        const spdR = Math.min(1.5, c.sec.spd / 200); // ⚙ 默认：速度/200 作为加成基准
        const r = TSQ.Skill.fx.phys(c, 1.3 * (0.8 + 0.4 * spdR), { note: "身法越快威力越大" });
        r.selfDamage = Math.round((c.hero.maxHp || 0) * 0.15);
        return r;
      })
    },
    huagong: {
      id: "huagong", name: "化功绵掌", xf: "zixin", cat: "常规", rage: "回怒4",
      prereq: "anying", n: 3, weight: 1, dmg: "phys",
      mp: { base: 12, per: 3 }, ragePct: 0,
      desc: "削减目标法力并转为伤害。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.custom((c) => {
        const r = TSQ.Skill.fx.phys(c, 1.0, { note: "化功" });
        r.mpBurn = 0.3; // ⚙ 默认：削蓝比例
        r.mpBurnToDmg = 0.5; // ⚙ 默认：削蓝转伤害比例
        return r;
      })
    },
    fugu: {
      id: "fugu", name: "腐骨蚀心", xf: "zixin", cat: "转生", rage: "耗怒",
      prereq: "anying", n: 0, weight: 3, dmg: "phys",
      mp: { base: 26, per: 5 }, ragePct: 0.45,
      desc: "转生技能：腐骨之毒，持续掉血。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.phys(1.5, { poison: 1.0, dot: 0.3 })
    },

    /* ─────────────────── 洞察（刺客 · 物理） ─────────────────── */
    jiying: {
      id: "jiying", name: "疾影袭心", xf: "dongcha", cat: "常规", rage: "回怒4",
      prereq: null, n: 1, weight: 3, dmg: "phys",
      mp: { base: 10, per: 3 }, ragePct: 0,
      desc: "目标破甲时额外增伤。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.custom((c) => {
        const broken = TSQ.Skill.hasDebuff(c.battle, "armor_break");
        return TSQ.Skill.fx.phys(c, broken ? 1.3 * 1.6 : 1.3, { note: broken ? "趁虚而入（破甲）" : "" });
      })
    },
    bahuang: {
      id: "bahuang", name: "八荒六合", xf: "dongcha", cat: "常规", rage: "回怒2",
      prereq: "jiying", n: 2, weight: 2, dmg: "none",
      mp: { base: 12, per: 3 }, ragePct: 0,
      desc: "提升法术承伤/治疗，附带内力充沛。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.buff("blessing", { power: 0.25 })
    },
    feihua: {
      id: "feihua", name: "飞花溅玉", xf: "dongcha", cat: "常规", rage: "耗怒",
      prereq: "bahuang", n: 3, weight: 1, dmg: "phys",
      mp: { base: 8, per: 2 }, ragePct: 0.35,
      desc: "消耗怒气，附加烈性毒药。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.phys(0.8, { poison: 1.0, dot: 0.2 })
    },
    chuanxin: {
      id: "chuanxin", name: "穿心蚀骨", xf: "dongcha", cat: "转生", rage: "耗怒",
      prereq: "jiying", n: 0, weight: 3, dmg: "phys",
      mp: { base: 25, per: 5 }, ragePct: 0.4,
      desc: "转生技能：穿心一击，附加破甲。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.phys(1.7, { armor_break: 1.0 })
    },
    dulong: {
      id: "dulong", name: "毒龙手", xf: "dongcha", cat: "稀有", rage: "回怒2",
      prereq: null, n: 0, weight: 3, dmg: "phys",
      mp: { base: 20, per: 5 }, ragePct: 0,
      desc: "天资·毒：单体物理并几率剧毒。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.phys(1.6, { poison: 0.6, dot: 0.3 })
    },

    /* ─────────────────── 热诚（术士 · 法术） ─────────────────── */
    sixiang: {
      id: "sixiang", name: "四相诀", xf: "recheng", cat: "常规", rage: "回怒1",
      prereq: null, n: 1, weight: 3, dmg: "magic",
      mp: { base: 10, per: 3 }, ragePct: 0,
      desc: "随机四相伤害并附带异常。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.magic(1.3, { randomElement: 0.3 })
    },
    huanmie: {
      id: "huanmie", name: "唤灭破", xf: "recheng", cat: "常规", rage: "回怒3",
      prereq: "sixiang", n: 2, weight: 2, dmg: "magic",
      mp: { base: 12, per: 3 }, ragePct: 0,
      desc: "目标带四相异常时伤害翻倍。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.custom((c) => {
        const has = ["burn", "frostbite", "weak", "slow"].some((s) => TSQ.Skill.hasDebuff(c.battle, s));
        return TSQ.Skill.fx.magic(c, has ? 2.0 : 1.0, { note: has ? "四相引爆" : "" });
      })
    },
    tongdi: {
      id: "tongdi", name: "恸地神咒", xf: "recheng", cat: "常规", rage: "不变",
      prereq: "huanmie", n: 3, weight: 1, dmg: "magic",
      mp: { base: 20, per: 5 }, ragePct: 0,
      desc: "十字土伤（原型简化为全体）并提升自身物防。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.custom((c) => {
        const r = TSQ.Skill.fx.magic(c, 0.8, { aoe: true, note: "恸地" });
        r.selfBuff = { status: "earth_guard", power: 0.2 };
        return r;
      })
    },
    lieyan: {
      id: "lieyan", name: "烈焰风暴", xf: "recheng", cat: "转生", rage: "耗怒",
      prereq: "tongdi", n: 0, weight: 3, dmg: "magic",
      mp: { base: 30, per: 6 }, ragePct: 0.5,
      desc: "转生技能：全体烈焰风暴，附带灼烧。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.magic(1.35, { aoe: true, burn: 0.7, dot: 0.3 })
    },
    xintianhuo: {
      id: "xintianhuo", name: "玄天心火", xf: "recheng", cat: "稀有", rage: "回怒2",
      prereq: null, n: 0, weight: 3, dmg: "magic",
      mp: { base: 22, per: 5 }, ragePct: 0,
      desc: "天资·火：单体法术并几率灼烧。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.magic(1.6, { burn: 0.6, dot: 0.3 })
    },

    /* ─────────────────── 迷惑（术士 · 法术） ─────────────────── */
    shehun: {
      id: "shehun", name: "摄魂咒", xf: "mihuo", cat: "常规", rage: "回怒1",
      prereq: null, n: 1, weight: 3, dmg: "magic",
      mp: { base: 10, per: 3 }, ragePct: 0,
      desc: "单体法术，摄人心魂。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.magic(1.4, {})
    },
    meihuo: {
      id: "meihuo", name: "魅惑术", xf: "mihuo", cat: "常规", rage: "回怒2",
      prereq: "shehun", n: 2, weight: 1, dmg: "magic",
      mp: { base: 14, per: 3 }, ragePct: 0,
      desc: "几率混乱目标。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.debuff(0.5, "confuse", { chance: 0.45 })
    },
    anyingmo: {
      id: "anyingmo", name: "暗影魔咒", xf: "mihuo", cat: "常规", rage: "回怒4",
      prereq: "meihuo", n: 3, weight: 2, dmg: "none",
      mp: { base: 18, per: 4 }, ragePct: 0,
      desc: "大幅提升己方宠物攻防。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.buff("shadow", { power: 0.35, target: "pet" })
    },
    mengmo: {
      id: "mengmo", name: "梦魔咒", xf: "mihuo", cat: "转生", rage: "耗怒",
      prereq: "anyingmo", n: 0, weight: 3, dmg: "magic",
      mp: { base: 28, per: 6 }, ragePct: 0.45,
      desc: "转生技能：梦魔缠身，几率催眠。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.debuff(1.2, "sleep", { chance: 0.6 })
    },

    /* ─────────────────── 慈悲（修真 · 法术） ─────────────────── */
    cibei: {
      id: "cibei", name: "慈悲咒", xf: "cibei", cat: "常规", rage: "回怒1",
      prereq: null, n: 1, weight: 3, dmg: "magic",
      mp: { base: 9, per: 3 }, ragePct: 0,
      desc: "单体法术，以慈悲之力渡化。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.magic(1.3, {})
    },
    chenshui: {
      id: "chenshui", name: "沉水润心", xf: "cibei", cat: "常规", rage: "回怒4",
      prereq: "xianyin", n: 3, weight: 1, dmg: "none",
      mp: { base: 14, per: 4 }, ragePct: 0,
      desc: "治疗单体并溅射（简化为另一目标一半）。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.heal(1.5, { splash: 0.5 })
    },
    xianyin: {
      id: "xianyin", name: "仙音化雨", xf: "cibei", cat: "常规", rage: "回怒2",
      prereq: "cibei", n: 2, weight: 2, dmg: "none",
      mp: { base: 14, per: 3 }, ragePct: 0,
      desc: "驱散负面，几率持续治疗。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.custom((c) => {
        const r = TSQ.Skill.fx.heal(c, 0.3, { cleanse: true });
        r.hot = { chance: 0.7, ratio: 0.3 };
        return r;
      })
    },
    xianqi: {
      id: "xianqi", name: "仙气护体", xf: "cibei", cat: "转生", rage: "耗怒",
      prereq: "xianyin", n: 0, weight: 3, dmg: "none",
      mp: { base: 24, per: 5 }, ragePct: 0.4,
      desc: "转生技能：仙气凝成护体罡罩。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.shield(2.0, { note: "仙气护体" })
    },
    miaofa: {
      id: "miaofa", name: "妙法莲华", xf: "cibei", cat: "稀有", rage: "耗怒",
      prereq: null, n: 0, weight: 3, dmg: "none",
      mp: { base: 26, per: 6 }, ragePct: 0,
      desc: "稀有技能：群体治疗并净化（慈悲系专属）。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.heal(1.0, { splash: 0.8, cleanse: true })
    },

    /* ─────────────────── 怜悯（修真 · 法术） ─────────────────── */
    tiandi: {
      id: "tiandi", name: "天地极乐", xf: "lianmin", cat: "常规", rage: "回怒1",
      prereq: null, n: 1, weight: 3, dmg: "magic",
      mp: { base: 10, per: 3 }, ragePct: 0,
      desc: "单体法术，天地同悲。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.magic(1.4, {})
    },
    shengling: {
      id: "shengling", name: "圣灵附体", xf: "lianmin", cat: "常规", rage: "回怒2",
      prereq: "tiandi", n: 2, weight: 2, dmg: "none",
      mp: { base: 16, per: 4 }, ragePct: 0,
      desc: "全二级属性提升。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.buff("shengling", { power: 0.3 })
    },
    haotian: {
      id: "haotian", name: "昊天罡气", xf: "lianmin", cat: "常规", rage: "回怒4",
      prereq: "shengling", n: 3, weight: 1, dmg: "none",
      mp: { base: 20, per: 5 }, ragePct: 0,
      desc: "护盾吸收伤害，破碎反伤。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.shield(2.0, { note: "昊天罡气" })
    },
    ningshen: {
      id: "ningshen", name: "凝神聚气", xf: "lianmin", cat: "转生", rage: "耗怒",
      prereq: "shengling", n: 0, weight: 3, dmg: "none",
      mp: { base: 22, per: 5 }, ragePct: 0.35,
      desc: "转生技能：凝神聚气，持续回复法力。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.buff("focus", { power: 0.4 })
    },
    rubobing: {
      id: "rubobing", name: "如履薄冰", xf: "lianmin", cat: "稀有", rage: "回怒2",
      prereq: null, n: 0, weight: 3, dmg: "magic",
      mp: { base: 20, per: 5 }, ragePct: 0,
      desc: "天资·冰：单体法术并几率减速。",
      lv11: "11 级变化：规格未公开，暂按等级加成线性外推（⚙ 默认）。",
      formula: F.magic(1.6, { slow: 0.6 })
    }
  };

  // 旧技能 id（v0.4 及之前的 data.js / 存档里用的）→ 新 id
  // 宠物技能 id 不在此表（宠物侧保持原样，不动）
  const LEGACY_MAP = {
    fumo: "fumo",          // 伏魔刀法
    lengchao: "lengchao",  // 冷嘲热讽
    qianzhu: "qianzhu",    // 千蛛手 → 千蛛万毒手
    jiying: "jiying",      // 疾影 → 疾影袭心
    sixiang: "sixiang",    // 四象焚天 → 四相诀
    shehun: "shehun",      // 摄魂 → 摄魂咒
    cibei: "cibei",        // 慈悲 → 慈悲咒
    tiandi: "tiandi"       // 天地同寿 → 天地极乐
  };

  // 顺序：按心法分组，常规 → 转生 → 稀有，供 UI 直接遍历
  const XINFA_ORDER = XINFA.map((x) => x.id);

  TSQ.SkillData = {
    xinfa: XINFA,
    xinfaOrder: XINFA_ORDER,
    classXinfa: CLASS_XINFA,
    skills: SKILLS,
    legacyMap: LEGACY_MAP,
    // 熟练度权重说明（⚙ 默认）：2 = 不放大，3 = ×1.5
    weightNote: "熟练权重 2/3 为「倍数放大」：需求 ×(weight/2)，即 2→×1.0、3→×1.5（⚙ 默认）"
  };
})();
