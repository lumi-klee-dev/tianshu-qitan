/* 结义数据配置 v1.2
   ─────────────────────────────────────────────────────────────────────
   来源：
   - 规格：_brief/spec-r9.md §7.7 结义、_brief/第九轮任务_下一系统.md
   - 规则：
     * 3~8 人，都 >40 级，彼此亲密度 >100；NPC 结义使者（65,22）；
     * 契合度初始 200，每周 −50（做结义任务补）；
     * 奖励：金兰戒指、2 小时 buff（进 combatStats）、结义徽章（进徽章账本）；
     * 结义任务“各显神通”可用于骑宠领悟；
     * 演示开关 + 3 名 NPC 兄弟。
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const CONST = {
    INITIAL_HARMONY: 200,      // 初始契合度 200
    WEEK_DECAY: 50,            // 每周 -50
    QUEST_HARMONY_GAIN: 50,    // 任务补契合度 +50
    MAX_HARMONY: 1000,         // 契合度上限
    BUFF_DURATION_MS: 2 * 3600 * 1000, // 2 小时 buff (毫秒)
    REQ_LEVEL: 40,             // 结义等级要求 >40
    REQ_INTIMACY: 100,         // 亲密度要求 >100
    ITEMS: [
      { id: "jinlan_xiang", name: "金兰香", desc: "结义必备祭天信物，燃此香告祭苍天" },
      { id: "taoyuan_jiu", name: "桃园酒", desc: "取桃园灵泉酿造的共饮结义烈酒" },
      { id: "babai_an", name: "八拜案", desc: "八拜为交摆设的香案与结盟凭证" }
    ]
  };

  const NPC_BROTHERS = [
    {
      id: "bro_duanlang",
      name: "断浪",
      gender: "m",
      classId: "xiake",
      className: "侠客",
      level: 135,
      intimacy: 120,
      avatar: "🗡️",
      quote: "既为兄弟，当同生共死，剑指八荒！"
    },
    {
      id: "bro_yueyong",
      name: "月咏",
      gender: "f",
      classId: "cike",
      className: "刺客",
      level: 130,
      intimacy: 115,
      avatar: "⚡",
      quote: "暗夜潜行，有弟兄在侧，背脊自可相托。"
    },
    {
      id: "bro_fengyu",
      name: "风语",
      gender: "m",
      classId: "shushi",
      className: "术士",
      level: 128,
      intimacy: 105,
      avatar: "🔥",
      quote: "天火燎原，道法通神，誓与诸兄护卫天书！"
    }
  ];

  const QUESTS = [
    {
      id: "gexianshentong",
      name: "各显神通",
      desc: "结义兄弟齐心协作诛妖除魔，各自展现独门本领。不仅可大幅恢复结义契合度，更能感悟天地灵韵，获赠骑宠领悟丹【凝神丹】！",
      harmonyReward: 50,
      pillReward: "ningshen_pill",
      pillCount: 2
    },
    {
      id: "taoyuan_gongjiu",
      name: "桃园共饮",
      desc: "在结义使者前与众兄弟开怀畅饮桃园烈酒，重温金兰八拜誓约，契合度 +30。",
      harmonyReward: 30,
      silverReward: 50000
    }
  ];

  // 2小时 buff 效果配置（进 combatStats）
  const BUFF_DEF = {
    id: "jinlan_buff",
    name: "金兰同心",
    icon: "🤝",
    desc: "结义兄弟齐聚的天赐同心庇佑：生命+3000、物攻+240、法攻+240、物防+160、法防+160，生命上限+5%，物攻+3%，法攻+3%！",
    stats: {
      flat: { hp: 3000, patk: 240, matk: 240, pdef: 160, mdef: 160 },
      pct: { hp_pct: 0.05, patk_pct: 0.03, matk_pct: 0.03 }
    }
  };

  // 结义信物：金兰戒指模板注入装备库
  if (TSQ.EQ && TSQ.EQ.templates) {
    TSQ.EQ.templates.jinlan_ring = {
      id: "jinlan_ring",
      type: "ring",
      level: 100,
      rebirth: 0,
      name: "金兰戒指",
      unique: true,
      bound: true,
      base: { hp: 1600, mp: 800, patk: 120, matk: 120 },
      desc: "同生共死，金兰同心。结义之誓铸就的珍贵信物。"
    };
  }

  // 补齐材料库中的材料定义（防止背包材质渲染时 undefined）
  if (TSQ.EQ && TSQ.EQ.materials) {
    if (!TSQ.EQ.materials.ys_pill) {
      TSQ.EQ.materials.ys_pill = {
        id: "ys_pill",
        name: "元神丹",
        desc: "凝聚天地元气的灵丹，服之可获得 500 点元神经验，可用于元神升级突破。"
      };
    }
    if (!TSQ.EQ.materials.yinji_soul) {
      TSQ.EQ.materials.yinji_soul = {
        id: "yinji_soul",
        name: "印记之魂",
        desc: "三转法宝进阶所必需的法宝之魂灵材料。"
      };
    }
  }

  // 结义徽章：注入徽章库
  if (TSQ.BadgeData && TSQ.BadgeData.BADGES) {
    if (!TSQ.BadgeData.badgeById("jieyi")) {
      TSQ.BadgeData.BADGES.push({
        id: "jieyi",
        name: "结义徽章",
        cat: "社交徽章",
        src: "金兰结义",
        icon: "🤝",
        desc: "八拜为交、同生共死的金兰兄弟印记，见证生死不渝的同门羁绊。",
        stats: { hp: 1500, patk: 120, matk: 120, pdef: 120, mdef: 120 }
      });
    }
  }

  TSQ.SwornData = {
    CONST,
    NPC_BROTHERS,
    QUESTS,
    BUFF_DEF
  };
})();
