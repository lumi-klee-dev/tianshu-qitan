/* 天资 / 夫妻 / 生活技能数据 v0.7
   ─────────────────────────────────────────────────────────────────────
   来源：
   - 天资（稀有）技能：复用 js/skill-data.js 里 cat === "稀有" 的技能，
     本文件只补「天资页」要展示的解锁门槛 / 冷却 / 效果补充，
     等级、熟练度、学习条件仍走 TSQ.Skill（同一份 hero.skills，不双算等级）。
     名称：玄风刃(侠客·玄) / 毒龙手(刺客·毒) / 玄天心火(术士·火) / 如履薄冰(修真·冰)
     另：妙法莲华是慈悲系的额外稀有技能，一并在天资页列出并标注。
   - 夫妻技能：官网技能系统 · 夫妻技能
     情意绵绵（结婚即可）/ 情深似海（亲密度 ≥3000）/ 同心同德（亲密度 ≥5000）
     第 4 个原版未列，按任务书规则补 ⚙ 默认 名 + 占位效果。
   - 生活技能：官网技能介绍 · 生活技能 = 采矿 / 伐木 / 狩猎 / 采药（原版 4 种）
     产出名对齐公开资料（铜矿石…寒铁矿 / 杨木…紫檀木 / 碎皮…毛皮 / 小红花…活灵芝）
     烹饪 / 钓鱼 / 锻造辅助 为任务书点名但规格未列 → ⚙ 默认 名 + 占位产出。

   规则：
   - 所有规格未公开的数值一律标 ⚙ 默认，并集中在下方 CONST。
   - 本文件只放数据；逻辑在 js/life-skill.js。
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const CONST = {
    // ---------- 天资 ----------
    // ⚙ 默认：天资页额外展示的解锁门槛（原版天资走副本/任务掉落，规格未给门槛数值）
    TALENT_UNLOCK_DEFAULT: { xinfaLv: 20, heroLv: 20 },
    // ⚙ 默认：天资冷却回合数（规格未公开）
    TALENT_CD_DEFAULT: 3,

    // ---------- 夫妻 ----------
    COUPLE_MAX_LV: 3,                         // ⚙ 默认：夫妻技能最高 3 级
    COUPLE_SILVER: [20000, 60000, 150000],    // ⚙ 默认：学到 1/2/3 级耗银两
    COUPLE_EXP: [0, 5000, 12000],             // ⚙ 默认：升到 2/3 级耗技能经验（学 1 级不耗经验）
    COUPLE_LV_MULT: 0.25,                     // ⚙ 默认：每级效果 +25%
    INTIMACY_STEP: 500,                       // ⚙ 默认：演示用亲密度 ±步进
    INTIMACY_SCALE: 5000,                     // ⚙ 默认：效果 = 基础 ×(1 + 亲密度/5000)

    // ---------- 生活 ----------
    LIFE_MAX_LV: 10,                          // ⚙ 默认：生活技能上限 10 级
    LIFE_EXP_NEED: (lv) => Math.round(100 * Math.pow(lv, 1.6)), // ⚙ 默认：Lv(lv)→Lv(lv+1) 生活经验
    LIFE_SILVER_PER_LV: 8000,                 // ⚙ 默认：银两升级 = 目标等级 × 8000
    LIFE_GATHER_EXP: 12,                      // ⚙ 默认：采集一次基础生活经验
    LIFE_GATHER_EXP_PER_LV: 4,                // ⚙ 默认：每级额外 +4
    LIFE_GATHER_SILVER: 0,                    // ⚙ 默认：采集不耗银两
    LIFE_GATHER_MIN: 1,                       // ⚙ 默认：单次产出下限
    LIFE_GATHER_MAX: 2,                       // ⚙ 默认：单次产出上限

    // ---------- 演示角色预置 ----------
    // ⚙ 默认：演示开关（真实结婚任务线本轮未做，见 README「已知占位 / 未做」）
    DEMO: {
      married: false,
      intimacy: 3200,
      spouse: "云舒",
      lifeLv: 1
    }
  };

  /* ---------------- 天资：稀有技能的补充元信息 ----------------
     id 对应 js/skill-data.js 中的技能 id；等级/熟练度一律读 hero.skills。 */
  const TALENT = [
    {
      id: "xuanfeng", class_id: "xiake", element: "玄", cd: 3, src: "原版",
      unlock: { xinfa: "jianren", xinfaLv: 20, heroLv: 20 },
      effect: "天资·玄：单体物理并几率衰竭（降攻）。"
    },
    {
      id: "dulong", class_id: "cike", element: "毒", cd: 3, src: "原版",
      unlock: { xinfa: "dongcha", xinfaLv: 20, heroLv: 20 },
      effect: "天资·毒：单体物理并几率剧毒。"
    },
    {
      id: "xintianhuo", class_id: "shushi", element: "火", cd: 3, src: "原版",
      unlock: { xinfa: "recheng", xinfaLv: 20, heroLv: 20 },
      effect: "天资·火：单体法术并几率灼烧。"
    },
    {
      id: "rubobing", class_id: "xiuzhen", element: "冰", cd: 3, src: "原版",
      unlock: { xinfa: "lianmin", xinfaLv: 20, heroLv: 20 },
      effect: "天资·冰：单体法术并几率减速。"
    },
    {
      id: "miaofa", class_id: "xiuzhen", element: "—", cd: 5, src: "原版（慈悲系额外稀有）", extra: true,
      unlock: { xinfa: "cibei", xinfaLv: 30, heroLv: 30 },
      effect: "稀有技能：群体治疗并净化（慈悲系专属，非四职业天资）。"
    }
  ];

  /* ---------------- 夫妻技能 ----------------
     intimacy：亲密度门槛；lvReq：双方等级；cd：冷却回合（⚙ 默认）；mp：蓝耗（⚙ 默认）。 */
  const COUPLE = [
    {
      id: "qingyi", name: "情意绵绵", src: "原版", intimacy: 0, lvReq: 20, cd: 2, mp: 40,
      desc: "战斗中为配偶补充一定气血，恢复量受亲密度影响。",
      kind: "heal"
    },
    {
      id: "qingshen", name: "情深似海", src: "原版", intimacy: 3000, lvReq: 30, cd: 8, mp: 80,
      desc: "复活死去的配偶，并恢复一定气血；复活几率与恢复量受亲密度影响。",
      kind: "revive"
    },
    {
      id: "tongxin", name: "同心同德", src: "原版", intimacy: 5000, lvReq: 40, cd: 6, mp: 60,
      desc: "对配偶进行保护，替对方承受物理伤害。",
      kind: "shield"
    },
    {
      id: "xiangru", name: "相濡以沫", src: "⚙ 默认", intimacy: 8000, lvReq: 50, cd: 10, mp: 120,
      desc: "⚙ 默认 占位效果：夫妻合力，为配偶及周围队友持续回复气血（真实效果待规格）。",
      kind: "heal",
      placeholder: true
    }
  ];

  /* ---------------- 生活技能 ----------------
     yields：按生活技能等级解锁的产出（lv = 需要的生活技能等级）。 */
  const LIFE = [
    {
      id: "mining", name: "采矿", kind: "采集", src: "原版", icon: "矿",
      desc: "在野外矿点采矿，获得矿石类合成材料（原版：矿石可找武器商熔炼）。",
      yields: [
        { lv: 1, item: "ore_copper" }, { lv: 2, item: "ore_tin" }, { lv: 3, item: "ore_iron" },
        { lv: 4, item: "ore_fine" }, { lv: 5, item: "ore_tungsten" }, { lv: 6, item: "ore_coldiron" }
      ]
    },
    {
      id: "logging", name: "伐木", kind: "采集", src: "原版", icon: "木",
      desc: "在林场伐木，获得木料类合成材料。",
      yields: [
        { lv: 1, item: "wood_yang" }, { lv: 2, item: "wood_song" }, { lv: 3, item: "wood_you" },
        { lv: 4, item: "wood_hong" }, { lv: 5, item: "wood_zitan" }
      ]
    },
    {
      id: "hunting", name: "狩猎", kind: "采集", src: "原版", icon: "皮",
      desc: "猎取野兽，获得皮料类合成材料。",
      yields: [
        { lv: 1, item: "hide_sui" }, { lv: 2, item: "hide_zhong" }, { lv: 3, item: "hide_hou" },
        { lv: 4, item: "hide_pige" }, { lv: 5, item: "hide_mao" }
      ]
    },
    {
      id: "herb", name: "采药", kind: "采集", src: "原版", icon: "药",
      desc: "采集草药，获得药品类合成材料。",
      yields: [
        { lv: 1, item: "herb_xiaohonghua" }, { lv: 2, item: "herb_diedacao" }, { lv: 3, item: "herb_banlangen" },
        { lv: 4, item: "herb_xuelianhua" }, { lv: 5, item: "herb_huolingzhi" }
      ]
    },
    {
      id: "cooking", name: "烹饪", kind: "制作", src: "⚙ 默认", icon: "食", placeholder: true,
      desc: "⚙ 默认：把采集品加工成食物（完整产出表待规格）。",
      yields: [
        { lv: 1, item: "cook_grilledfish" }, { lv: 3, item: "cook_yaoshan" }, { lv: 5, item: "cook_hongshao" }
      ]
    },
    {
      id: "fishing", name: "钓鱼", kind: "采集", src: "⚙ 默认", icon: "鱼", placeholder: true,
      desc: "⚙ 默认：在水域垂钓（完整产出表待规格）。",
      yields: [
        { lv: 1, item: "fish_carp" }, { lv: 4, item: "fish_golden" }
      ]
    },
    {
      id: "smith_helper", name: "锻造辅助", kind: "制作", src: "⚙ 默认", icon: "锻", placeholder: true,
      desc: "⚙ 默认：锻造辅助（辅助打造的加工技能，与装备成功率无关）。",
      yields: [
        { lv: 1, item: "smith_ding" }, { lv: 4, item: "smith_jing" }
      ]
    }
  ];

  // 生活产出物品表（id → 展示信息）。运行时会挂到 TSQ.EQ.materials，让产出能进「背包 · 材料」区。
  const LIFE_ITEMS = {
    ore_copper: { name: "铜矿石", icon: "矿", desc: "生活技能·采矿（1 级）产出" },
    ore_tin: { name: "锡矿石", icon: "矿", desc: "生活技能·采矿（2 级）产出" },
    ore_iron: { name: "铁矿石", icon: "矿", desc: "生活技能·采矿（3 级）产出" },
    ore_fine: { name: "精铁矿石", icon: "矿", desc: "生活技能·采矿（4 级）产出" },
    ore_tungsten: { name: "钨矿石", icon: "矿", desc: "生活技能·采矿（5 级）产出" },
    ore_coldiron: { name: "寒铁矿", icon: "矿", desc: "生活技能·采矿（6 级）产出" },

    wood_yang: { name: "杨木", icon: "木", desc: "生活技能·伐木（1 级）产出" },
    wood_song: { name: "松木", icon: "木", desc: "生活技能·伐木（2 级）产出" },
    wood_you: { name: "柚木", icon: "木", desc: "生活技能·伐木（3 级）产出" },
    wood_hong: { name: "红木", icon: "木", desc: "生活技能·伐木（4 级）产出" },
    wood_zitan: { name: "紫檀木", icon: "木", desc: "生活技能·伐木（5 级）产出" },

    hide_sui: { name: "碎皮", icon: "皮", desc: "生活技能·狩猎（1 级）产出" },
    hide_zhong: { name: "中皮", icon: "皮", desc: "生活技能·狩猎（2 级）产出" },
    hide_hou: { name: "厚皮", icon: "皮", desc: "生活技能·狩猎（3 级）产出" },
    hide_pige: { name: "皮革", icon: "皮", desc: "生活技能·狩猎（4 级）产出" },
    hide_mao: { name: "毛皮", icon: "皮", desc: "生活技能·狩猎（5 级）产出" },

    herb_xiaohonghua: { name: "小红花", icon: "药", desc: "生活技能·采药（1 级）产出" },
    herb_diedacao: { name: "跌打草", icon: "药", desc: "生活技能·采药（2 级）产出" },
    herb_banlangen: { name: "板蓝根", icon: "药", desc: "生活技能·采药（3 级）产出" },
    herb_xuelianhua: { name: "雪莲花", icon: "药", desc: "生活技能·采药（4 级）产出" },
    herb_huolingzhi: { name: "活灵芝", icon: "药", desc: "生活技能·采药（5 级）产出" },

    cook_grilledfish: { name: "烤鱼（⚙ 默认）", icon: "食", desc: "生活技能·烹饪（1 级）产出" },
    cook_yaoshan: { name: "药膳（⚙ 默认）", icon: "食", desc: "生活技能·烹饪（3 级）产出" },
    cook_hongshao: { name: "红烧鱼翅（⚙ 默认）", icon: "食", desc: "生活技能·烹饪（5 级）产出" },
    fish_carp: { name: "鲤鱼（⚙ 默认）", icon: "鱼", desc: "生活技能·钓鱼（1 级）产出" },
    fish_golden: { name: "金鳞鱼（⚙ 默认）", icon: "鱼", desc: "生活技能·钓鱼（4 级）产出" },
    smith_ding: { name: "锻造辅助锭（⚙ 默认）", icon: "锻", desc: "生活技能·锻造辅助（1 级）产出" },
    smith_jing: { name: "精炼锭（⚙ 默认）", icon: "锻", desc: "生活技能·锻造辅助（4 级）产出" }
  };

  TSQ.LifeSkillData = {
    CONST, TALENT, COUPLE, LIFE, LIFE_ITEMS,
    talentById: (id) => TALENT.find((t) => t.id === id) || null,
    coupleById: (id) => COUPLE.find((c) => c.id === id) || null,
    lifeById: (id) => LIFE.find((s) => s.id === id) || null,
    itemById: (id) => LIFE_ITEMS[id] || null
  };
})();
