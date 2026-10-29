/* 心法 / 技能系统 v0.5
   ─────────────────────────────────────────────────────────────────────
   全部公式集中在本文件顶部「CONST」与下方各函数，规格未公开的默认值标 ⚙ 默认。

   1) 心法
      - 8 系初始 1 级，上限 = 人物等级
      - M→N 耗技能经验 = 25 × (N+M+OFFSET) × (N−M)
        OFFSET = 0 → 1→10 共 2475（验收清单口径，默认）
        OFFSET = 1 → 25×(N+M+1)×(N−M)（规格 §2.3「每级 50×新等级」口径，1→10 = 2700）
        注：任务书验收清单写「1→10 = 2475（25×12×9）」，而 25×12×9 = 2700，
            2475 = 25×11×9 = Σ(50k−25)。两者冲突，默认走清单口径，改 CONST.XINFA_EXP_OFFSET 即可切换。
      - 修为 = Σ 心法升级已耗技能经验 × 0.03   （⚙ 默认 0.03）
      - 全心法奖励：8 系全 ≥10 → 潜力 +3；全 ≥25 → 潜力 +6（各只发一次）

   2) 技能学习（下一级需同时满足 4 条）
      ① 有技能书（书 / 卷轴×0.8 / 秘籍×2 / 高级秘籍×3）
      ② 心法达到需求
         常规  = floor(10×(Lv−1) + 1 + 2.5×(n−1))
         转生  = 90/96/100/103/107/110/113/116/119/122（按目标等级 1~10 取）
         妙法莲华 = 60 + 10×(Lv−1)
      ③ 熟练度 8 层
      ④ 技能经验足够
      学书耗经验：常规 = 150 × m² × n；转生 = 30 × (m+29)²（m = 目标等级）
      等级 1~10；11 级只能用高级秘籍（⚙ 默认）

   3) 熟练度
      1~4 级 第 n 层 = 8 × m × (3n + 8)
      5~10 级 第 n 层 = (n+1) × [80,200,320,600,800,1200][m−5]
      转生 第 n 层 = 15 × (n + 2)
      再乘熟练权重放大（weight/2，⚙ 默认）
      战斗中「怪物等级与技能适用等级差 ≤5」时使用才涨（⚙ 默认口径）
      适用等级 = 10 × 技能等级（⚙ 默认）

   4) 战斗
      - 耗蓝 / 回怒 / 耗怒，跨职业惩罚（规格 §1.1）：
        同系同职业 ×1；异职业同伤害类型（侠客↔刺客 / 术士↔修真）耗蓝×2 回怒×0.9 耗怒×1.1；
        物理↔法术 耗蓝×3 回怒×0.5 耗怒×1.2
      - 持续回合 = round(3 + 修为/12000)（⚙ 默认），再按适用等级识破三档：
        够 → 满回合；差 ≤5 → 2 回合；差 >5 → 1 回合并提示「识破」
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  const D = () => TSQ.DATA;
  const SD = () => TSQ.SkillData;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rng = (a, b) => a + Math.random() * (b - a);

  const CONST = {
    // ⚙ 默认：见文件头公式说明
    XINFA_EXP_OFFSET: 0,     // 0 → 1→10 = 2475（验收清单口径）；1 → 2700（§2.3 公式口径）
    XIUWEI_RATE: 0.03,       // ⚙ 默认：修为 = 心法已耗技能经验 × 0.03
    XINFA_BONUS: [{ min: 10, pot: 3, flag: "t10" }, { min: 25, pot: 6, flag: "t25" }],
    // 转生技能心法需求表（目标等级 1~10）
    ZHUANSHENG_XINFA: [90, 96, 100, 103, 107, 110, 113, 116, 119, 122],
    MIAOFA_XINFA_BASE: 60,   // 妙法莲华：60 起每级 +10
    MIAOFA_XINFA_STEP: 10,
    // 5~10 级熟练度系数 a
    PROF_A: [80, 200, 320, 600, 800, 1200],
    PROF_MAX_LAYER: 8,
    PROF_GAIN_DIV: 4,        // ⚙ 默认：每次使用获得 = 第 1 层需求 ÷ 4
    SKILL_MAX_LV: 10,
    SKILL_MAX_LV_BOOK: 11,   // 11 级仅高级书
    // 技能书折算（书点）：1 书点 = 1 本「书」；卷轴 0.8；秘籍 2；高级秘籍 3
    BOOK_POINTS: { book: 1, scroll: 0.8, miji: 2, miji_high: 3 },
    BOOK_NAMES: { book: "技能书", scroll: "技能卷轴", miji: "技能秘籍", miji_high: "高级技能秘籍" },
    BOOK_LV11_NEED: 3,       // ⚙ 默认：11 级需 3 书点（高级秘籍×1 或 秘籍×2）
    // 怒气
    RAGE_GAIN_PER_STEP: 0.08, // ⚙ 默认：回怒 n → 回复 怒气上限 × 0.08 × n（回怒1=8%，回怒4=32%）
    RAGE_COST_DEFAULT: 0.3,   // ⚙ 默认：耗怒技能未标 ragePct 时的比例
    // 适用等级（⚙ 默认）= 10 × 技能等级
    APPLY_LV_PER_SKILL: 10,
    // 识破三档
    PIERCE: { full: 0, near: 5 },
    // 持续回合（⚙ 默认）= round(3 + 修为/12000)
    TURN_BASE: 3,
    TURN_PER_XIUWEI: 1 / 12000,
    // 跨职业惩罚（规格 §1.1）
    PENALTY: {
      same: { mp: 1, rageGain: 1, rageCost: 1 },
      crossSameType: { mp: 2, rageGain: 0.9, rageCost: 1.1 },  // 侠客↔刺客、术士↔修真
      crossType: { mp: 3, rageGain: 0.5, rageCost: 1.2 }       // 物理↔法术
    }
  };

  // ---------------- 基础查询 ----------------
  function xinfaList() { return SD().xinfa; }
  function xinfa(id) { return SD().xinfa.find((x) => x.id === id) || null; }
  function classXinfa(classId) { return SD().classXinfa[classId] || []; }
  function isMainXinfa(classId, xfId) { return classXinfa(classId).includes(xfId); }
  function allSkills() { return SD().skills; }
  function get(id) { return SD().skills[id] || null; }
  function skillsOfXinfa(xfId) {
    return Object.values(SD().skills).filter((s) => s.xf === xfId)
      .sort((a, b) => catRank(a) - catRank(b) || (a.n || 0) - (b.n || 0));
  }
  function catRank(s) { return s.cat === "常规" ? 0 : s.cat === "转生" ? 1 : 2; }

  // v0.7 扩展入口（只读）：稀有（天资）技能列表，供「天资」页做筛选视图用。
  // 天资不新增第二套等级：等级 / 熟练度 / 学习条件仍走本文件的 skillLevel / canLearn / learn。
  function rareSkills() {
    return Object.values(SD().skills).filter((s) => s.cat === "稀有")
      .sort((a, b) => XINFA_ORDER.indexOf(a.xf) - XINFA_ORDER.indexOf(b.xf));
  }

  function legacyToNew(oldId) { return SD().legacyMap[oldId] || null; }

  // ---------------- 存档默认字段 ----------------
  function defaultSkillState() { return { level: 0, prof: 0 }; }

  function defaults(hero) {
    const out = {};
    SD().xinfa.forEach((x) => (out[x.id] = 1));
    return out;
  }

  // 迁移：补齐 v0.5 新字段（由 game.js › migrate 调用）
  function migrate(hero) {
    if (!hero.xinfa || typeof hero.xinfa !== "object") hero.xinfa = defaults(hero);
    SD().xinfa.forEach((x) => {
      if (!hero.xinfa[x.id]) hero.xinfa[x.id] = 1;
    });
    if (typeof hero.skillExp !== "number") hero.skillExp = 0;
    if (typeof hero.xinfaExpSpent !== "number") hero.xinfaExpSpent = 0;
    if (typeof hero.xiuwei !== "number") hero.xiuwei = 0;
    if (!hero.xinfaBonusFlags || typeof hero.xinfaBonusFlags !== "object") {
      hero.xinfaBonusFlags = { t10: false, t25: false };
    }
    if (!hero.skillBooks || typeof hero.skillBooks !== "object") {
      hero.skillBooks = { book: 0, scroll: 0, miji: 0, miji_high: 0 };
    }
    Object.keys(CONST.BOOK_POINTS).forEach((k) => {
      if (typeof hero.skillBooks[k] !== "number") hero.skillBooks[k] = 0;
    });
    // 旧技能 id → 新 id，并补 prof 字段
    if (!hero.skills || typeof hero.skills !== "object") hero.skills = {};
    const old = hero.skills;
    const next = {};
    Object.keys(old).forEach((id) => {
      const nid = SD().skills[id] ? id : (legacyToNew(id) || null);
      if (!nid || !SD().skills[nid]) return; // 宠物技能等不在表内的旧键：丢弃，不报错
      const v = old[id];
      const st = (v && typeof v === "object") ? v : { level: v || 1 };
      next[nid] = { level: clamp(Math.round(st.level || 1), 0, CONST.SKILL_MAX_LV_BOOK), prof: Math.max(0, Math.round(st.prof || 0)) };
    });
    hero.skills = next;
    hero.xiuwei = xiuweiOf(hero);
    return hero;
  }

  // 新角色初始化
  function initHero(hero) {
    hero.xinfa = defaults(hero);
    hero.skillExp = 200000;        // ⚙ 默认：演示角色给足技能经验，便于试心法/学技能
    hero.xinfaExpSpent = 0;
    hero.xiuwei = 0;
    hero.xinfaBonusFlags = { t10: false, t25: false };
    hero.skillBooks = { book: 30, scroll: 20, miji: 10, miji_high: 4 }; // ⚙ 默认
    // 初始学会本职 2 系的 n=1 技能（⚙ 默认）
    hero.skills = {};
    classXinfa(hero.class_id).forEach((xf) => {
      const first = skillsOfXinfa(xf).find((s) => s.cat === "常规" && s.n === 1);
      if (first) hero.skills[first.id] = { level: 1, prof: 0 };
    });
    return hero;
  }

  // ---------------- 心法 ----------------
  function xinfaLevel(hero, xfId) { return (hero.xinfa && hero.xinfa[xfId]) || 1; }
  function xinfaCap(hero) { return Math.max(1, hero.level || 1); }

  // M→N 共耗技能经验
  function xinfaCost(M, N) {
    if (N <= M) return 0;
    return 25 * (N + M + CONST.XINFA_EXP_OFFSET) * (N - M);
  }

  function xiuweiOf(hero) { return Math.round((hero.xinfaExpSpent || 0) * CONST.XIUWEI_RATE); }

  function upgradeXinfa(hero, xfId, steps) {
    steps = steps || 1;
    const cur = xinfaLevel(hero, xfId);
    const cap = xinfaCap(hero);
    let target = Math.min(cap, cur + steps);
    if (target <= cur) return { ok: false, msg: `「${xfId && xinfa(xfId) ? xinfa(xfId).name : xfId}」已达上限（人物 Lv${cap}）` };
    const cost = xinfaCost(cur, target);
    if ((hero.skillExp || 0) < cost) return { ok: false, msg: `技能经验不足（需 ${cost}，现有 ${hero.skillExp || 0}）` };
    hero.skillExp -= cost;
    hero.xinfa[xfId] = target;
    hero.xinfaExpSpent = (hero.xinfaExpSpent || 0) + cost;
    hero.xiuwei = xiuweiOf(hero);
    const bonus = checkBonus(hero);
    return { ok: true, msg: `「${xinfa(xfId).name}」升至 ${target} 级，消耗 ${cost} 技能经验`, cost, bonus };
  }

  // 全心法奖励：只发一次
  function checkBonus(hero) {
    const gained = [];
    CONST.XINFA_BONUS.forEach((b) => {
      if (hero.xinfaBonusFlags[b.flag]) return;
      const all = SD().xinfa.every((x) => xinfaLevel(hero, x.id) >= b.min);
      if (all) {
        hero.xinfaBonusFlags[b.flag] = true;
        hero.unspent = (hero.unspent || 0) + b.pot;
        gained.push({ min: b.min, pot: b.pot });
      }
    });
    return gained;
  }

  function bonusProgress(hero) {
    return CONST.XINFA_BONUS.map((b) => ({
      min: b.min, pot: b.pot, done: !!hero.xinfaBonusFlags[b.flag],
      count: SD().xinfa.filter((x) => xinfaLevel(hero, x.id) >= b.min).length,
      total: SD().xinfa.length
    }));
  }

  // ---------------- 技能等级 / 熟练度 ----------------
  function skillLevel(hero, id) { return (hero.skills[id] && hero.skills[id].level) || 0; }
  function skillProf(hero, id) { return (hero.skills[id] && hero.skills[id].prof) || 0; }

  // 第 n 层（1~8）所需熟练度
  function profNeed(skill, m, n) {
    let base;
    if (skill.cat === "转生") base = 15 * (n + 2);
    else if (m <= 4) base = 8 * m * (3 * n + 8);
    else base = (n + 1) * CONST.PROF_A[clamp(m, 5, 10) - 5];
    return Math.round(base * ((skill.weight || 2) / 2));
  }
  // 完成第 L 层的累计阈值
  function profThreshold(skill, m, L) {
    let t = 0;
    for (let n = 1; n <= L; n++) t += profNeed(skill, m, n);
    return t;
  }
  function profLayer(hero, id) {
    const sk = get(id); if (!sk) return 0;
    const m = Math.max(1, skillLevel(hero, id));
    const p = skillProf(hero, id);
    let layer = 0;
    for (let L = 1; L <= CONST.PROF_MAX_LAYER; L++) {
      if (p >= profThreshold(sk, m, L)) layer = L; else break;
    }
    return layer;
  }
  function profProgress(hero, id) {
    const sk = get(id); if (!sk) return { layer: 0, cur: 0, need: 0, pct: 0 };
    const m = Math.max(1, skillLevel(hero, id));
    const p = skillProf(hero, id);
    const layer = profLayer(hero, id);
    const next = layer >= CONST.PROF_MAX_LAYER ? 0 : profThreshold(sk, m, layer + 1);
    return { layer, cur: p, need: next, pct: next ? clamp(p / next * 100, 0, 100) : 100 };
  }

  // 战斗中涨熟练度：怪物等级与「适用等级」差 ≤5 才涨（⚙ 默认口径）
  function addProf(hero, id, monLevel) {
    const sk = get(id); if (!sk) return 0;
    const m = Math.max(1, skillLevel(hero, id));
    const applyLv = applicableLevel(hero, id);
    if (Math.abs((monLevel || 0) - applyLv) > CONST.PIERCE.near) return 0;
    const gain = Math.max(1, Math.round(profNeed(sk, m, 1) / CONST.PROF_GAIN_DIV));
    if (!hero.skills[id]) hero.skills[id] = { level: 1, prof: 0 };
    const before = profLayer(hero, id);
    hero.skills[id].prof = skillProf(hero, id) + gain;
    const after = profLayer(hero, id);
    return after > before ? after : 0; // 返回新层数，没升层返回 0
  }

  // 适用等级（⚙ 默认）= 10 × 技能等级
  function applicableLevel(hero, id) { return skillLevel(hero, id) * CONST.APPLY_LV_PER_SKILL; }

  // ---------------- 学习 ----------------
  function xinfaRequire(skill, targetLv) {
    if (skill.cat === "转生") {
      return CONST.ZHUANSHENG_XINFA[clamp(targetLv, 1, 10) - 1];
    }
    if (skill.id === "miaofa") {
      return CONST.MIAOFA_XINFA_BASE + CONST.MIAOFA_XINFA_STEP * (targetLv - 1);
    }
    return Math.floor(10 * (targetLv - 1) + 1 + 2.5 * ((skill.n || 1) - 1));
  }

  function learnExpCost(skill, targetLv) {
    if (skill.cat === "转生") return 30 * Math.pow(targetLv + 29, 2);
    // 妙法莲华规格未给公式，按常规公式取 n=4（⚙ 默认）
    const n = skill.id === "miaofa" ? 4 : (skill.n || 1);
    return 150 * targetLv * targetLv * n;
  }

  // 需要的书点：1~10 级 1 点，11 级 3 点（⚙ 默认）
  function bookPointsNeed(targetLv) { return targetLv >= CONST.SKILL_MAX_LV_BOOK ? CONST.BOOK_LV11_NEED : 1; }

  // 当前可用书能否满足；返回 { ok, type, count }
  function findBook(hero, need) {
    const order = need >= CONST.BOOK_LV11_NEED ? ["miji_high", "miji"] : ["book", "scroll"];
    for (const t of order) {
      const have = (hero.skillBooks && hero.skillBooks[t]) || 0;
      const cnt = Math.ceil(need / CONST.BOOK_POINTS[t]);
      if (have >= cnt) return { ok: true, type: t, count: cnt, points: cnt * CONST.BOOK_POINTS[t] };
    }
    return { ok: false, type: order[0], count: Math.ceil(need / CONST.BOOK_POINTS[order[0]]) };
  }

  // 学习条件（返回 4 条 + 前置）
  function canLearn(hero, id) {
    const sk = get(id);
    if (!sk) return { ok: false, prereq: null, conds: [] };
    const lv = skillLevel(hero, id);
    const target = lv === 0 ? 1 : lv + 1;
    const maxLv = CONST.SKILL_MAX_LV_BOOK;
    if (lv >= maxLv) {
      return { ok: false, maxed: true, target, prereq: null, conds: [{ key: "book", label: "有技能书", ok: false, detail: `已达最高等级 ${maxLv}` }] };
    }
    const xfNeed = xinfaRequire(sk, target);
    const xfLv = xinfaLevel(hero, sk.xf);
    const expNeed = learnExpCost(sk, target);
    const pp = profProgress(hero, id);
    const profOk = lv === 0 || pp.layer >= CONST.PROF_MAX_LAYER; // 未学会时不要求熟练度
    const book = findBook(hero, bookPointsNeed(target));
    const conds = [
      {
        key: "book", label: "有技能书", ok: book.ok,
        detail: book.ok
          ? `${CONST.BOOK_NAMES[book.type]} ×${book.count}`
          : `缺 ${CONST.BOOK_NAMES[book.type]} ×${book.count}（现有 ${(hero.skillBooks[book.type] || 0)}）`
      },
      { key: "xinfa", label: "心法达到需求", ok: xfLv >= xfNeed, detail: `${xinfa(sk.xf).name} ${xfLv}/${xfNeed}` },
      { key: "prof", label: "熟练度 8 层", ok: profOk, detail: lv === 0 ? "初次学习无需熟练度" : `${pp.layer}/8 层` },
      { key: "exp", label: "技能经验足够", ok: (hero.skillExp || 0) >= expNeed, detail: `${hero.skillExp || 0}/${expNeed}` }
    ];
    let prereq = null;
    if (sk.prereq) {
      const pl = skillLevel(hero, sk.prereq);
      prereq = { id: sk.prereq, name: get(sk.prereq).name, need: 1, level: pl, ok: pl >= 1 };
    }
    const ok = conds.every((c) => c.ok) && (!prereq || prereq.ok);
    return { ok, target, conds, prereq, expNeed, xfNeed, book };
  }

  function learn(hero, id) {
    const chk = canLearn(hero, id);
    if (!chk.ok) {
      const miss = chk.conds.filter((c) => !c.ok).map((c) => c.label).join("、");
      return { ok: false, msg: `无法学习：${miss}${chk.prereq && !chk.prereq.ok ? "、前置技能「" + chk.prereq.name + "」未学" : ""}` };
    }
    const sk = get(id);
    const target = chk.target;
    hero.skillExp -= learnExpCost(sk, target);
    const b = findBook(hero, bookPointsNeed(target));
    hero.skillBooks[b.type] -= b.count;
    if (!hero.skills[id]) hero.skills[id] = { level: 0, prof: 0 };
    hero.skills[id].level = target;
    hero.skills[id].prof = 0; // 熟练度清零
    return { ok: true, msg: `「${sk.name}」升至 ${target} 级（消耗 ${learnExpCost(sk, target)} 技能经验、${CONST.BOOK_NAMES[b.type]}×${b.count}），熟练度清零` };
  }

  // ---------------- 战斗 ----------------
  // 跨职业惩罚系数
  function penalty(hero, skill) {
    const xf = xinfa(skill.xf);
    const heroType = D().classes[hero.class_id] && D().classes[hero.class_id].main === "matk" ? "magic" : "phys";
    const skillType = xf.dmg;
    if (xf.owner === hero.class_id) return Object.assign({ kind: "same" }, CONST.PENALTY.same);
    if (heroType === skillType) return Object.assign({ kind: "crossSameType" }, CONST.PENALTY.crossSameType);
    return Object.assign({ kind: "crossType" }, CONST.PENALTY.crossType);
  }

  function mpCost(hero, id) {
    const sk = get(id); if (!sk) return 0;
    const lv = Math.max(1, skillLevel(hero, id));
    const p = penalty(hero, sk);
    return Math.round((sk.mp.base + sk.mp.per * (lv - 1)) * p.mp);
  }
  function rageCost(hero, id) {
    const sk = get(id); if (!sk || sk.rage !== "耗怒") return 0;
    const p = penalty(hero, sk);
    const pct = sk.ragePct || CONST.RAGE_COST_DEFAULT;
    return Math.round((hero.maxRage || 0) * pct * p.rageCost);
  }
  function rageGain(hero, id) {
    const sk = get(id); if (!sk) return 0;
    const m = /^回怒(\d)$/.exec(sk.rage || "");
    if (!m) return 0;
    const p = penalty(hero, sk);
    return Math.round((hero.maxRage || 0) * CONST.RAGE_GAIN_PER_STEP * Number(m[1]) * p.rageGain);
  }

  function turnsOf(hero, applyLv, monLevel) {
    const base = Math.max(1, Math.round(CONST.TURN_BASE + (hero.xiuwei || 0) * CONST.TURN_PER_XIUWEI));
    const diff = (monLevel || 0) - applyLv;
    if (diff <= CONST.PIERCE.full) return { turns: base, pierced: false };
    if (diff <= CONST.PIERCE.near) return { turns: 2, pierced: false };
    return { turns: 1, pierced: true };
  }

  function hasDebuff(battle, status) {
    return !!(battle && battle.debuffs && battle.debuffs.some((d) => d.status === status && d.turns > 0));
  }
  function ensureBattleLists(battle) {
    if (!battle.buffs) battle.buffs = [];
    if (!battle.debuffs) battle.debuffs = [];
  }
  function tickBuffs(battle) {
    ensureBattleLists(battle);
    const gone = [];
    battle.buffs = battle.buffs.filter((b) => {
      b.turns -= 1;
      if (b.turns <= 0) { gone.push(b.name); return false; }
      return true;
    });
    battle.debuffs = battle.debuffs.filter((b) => {
      b.turns -= 1;
      if (b.turns <= 0) { gone.push(b.name); return false; }
      return true;
    });
    return gone;
  }
  function pushBuff(battle, list, item) {
    ensureBattleLists(battle);
    const arr = battle[list];
    const exist = arr.find((b) => b.status === item.status);
    if (exist) { exist.turns = Math.max(exist.turns, item.turns); return; }
    arr.push(item);
  }

  // ---- 公式函数库（供 skill-data.js 的 formula 调用） ----
  const STATUS_NAMES = {
    stun: "击晕", taunt: "嘲讽", poison: "中毒", weak: "衰竭", confuse: "混乱",
    slow: "减速", burn: "灼烧", frostbite: "冻伤", armor_break: "破甲",
    blessing: "增益", shadow: "暗影", earth_guard: "地卫", shengling: "圣灵", focus: "凝神",
    sleep: "催眠", toxin: "烈毒", hot: "持续治疗", shield: "护盾"
  };

  function scaleAtk(c, kind, mult) {
    const lv = c.lv;
    const lvScale = 1 + 0.08 * (lv - 1); // ⚙ 默认：每级 +8% 威力
    const atk = kind === "magic" ? c.sec.matk : c.sec.patk;
    const def = kind === "magic" ? (c.mon.mdef || 0) : (c.mon.pdef || 0);
    const raw = Math.max(1, Math.round((atk * mult * lvScale - def) * rng(0.9, 1.1))); // ×0.9~1.1 随机
    return raw;
  }

  const fx = {
    phys(c, mult, opt) {
      const hits = opt.hits || 1;
      let dmg = scaleAtk(c, "phys", mult);
      if (hits > 1) dmg = dmg * hits;
      const r = { type: "dmg", kind: "phys", dmg, hits, note: opt.note || "" };
      applyStatus(c, r, opt);
      return r;
    },
    magic(c, mult, opt) {
      const r = { type: "dmg", kind: "magic", dmg: scaleAtk(c, "magic", mult), hits: opt.aoe ? 2 : 1, aoe: !!opt.aoe, note: opt.note || "" };
      applyStatus(c, r, opt);
      return r;
    },
    heal(c, mult, opt) {
      const amount = Math.round((40 + c.sec.matk * 0.5 * mult) * (1 + 0.08 * (c.lv - 1)));
      return { type: "heal", heal: amount, splash: opt.splash || 0, cleanse: !!opt.cleanse, note: opt.note || "" };
    },
    shield(c, mult, opt) {
      const amount = Math.round((c.sec.mdef * 0.5 + c.sec.matk * 0.4 * mult) * (1 + 0.08 * (c.lv - 1)));
      return { type: "shield", shield: amount, note: opt.note || "" };
    },
    buff(c, status, opt) {
      return {
        type: "buff", status, name: STATUS_NAMES[status] || status,
        power: opt.power || 0.2, target: opt.target || "self", note: opt.note || ""
      };
    },
    debuff(c, mult, status, opt) {
      const r = { type: "debuff", status, name: STATUS_NAMES[status] || status, chance: opt.chance == null ? 1 : opt.chance, note: opt.note || "" };
      if (mult > 0) { const d = scaleAtk(c, c.skill.dmg === "magic" ? "magic" : "phys", mult); r.dmg = d; }
      else r.dmg = 0;
      return r;
    }
  };

  function applyStatus(c, r, opt) {
    ["stun", "taunt", "poison", "weak", "confuse", "slow", "burn", "frostbite", "armor_break", "sleep"].forEach((k) => {
      if (opt[k] == null) return;
      if (!r.statuses) r.statuses = [];
      r.statuses.push({ status: k, name: STATUS_NAMES[k] || k, chance: opt[k], dot: opt.dot || 0 });
    });
  }

  // 释放技能：返回结果对象（不直接改血，交给 game.js 落账，保持 playerAttack 最小改动）
  function cast(hero, battle, id) {
    const sk = get(id);
    if (!sk) return { ok: false, msg: "未学会该技能" };
    if (skillLevel(hero, id) <= 0) return { ok: false, msg: "未学会该技能" };
    ensureBattleLists(battle);
    const sec = TSQ.Game.combatStats(hero);
    const lv = skillLevel(hero, id);
    const applyLv = applicableLevel(hero, id);
    const monLv = battle.mon.level || 1;
    const t = turnsOf(hero, applyLv, monLv);
    const p = penalty(hero, sk);
    const cost = mpCost(hero, id);
    const rCost = rageCost(hero, id);
    if ((hero.mp || 0) < cost) return { ok: false, msg: `法力不足（需 ${cost}）` };
    if (rCost > 0 && (hero.rage || 0) < rCost) return { ok: false, msg: `怒气不足（需 ${rCost}）` };
    hero.mp -= cost;
    const pctUsed = (hero.maxRage || 1) > 0 ? (rCost / (hero.maxRage || 1)) : 0;
    if (rCost > 0) hero.rage = Math.max(0, (hero.rage || 0) - rCost);
    const gain = rageGain(hero, id);
    if (gain > 0 && rCost === 0) hero.rage = Math.min(hero.maxRage || 0, (hero.rage || 0) + gain);

    const ctx = {
      hero, battle, mon: battle.mon, sec, skill: sk, lv,
      xf: xinfaLevel(hero, sk.xf), xiuwei: hero.xiuwei || 0,
      turns: t.turns, pierced: t.pierced, ragePctUsed: pctUsed
    };
    const out = sk.formula(ctx) || { type: "none" };
    out.ok = true;
    out.skill = sk;
    out.mp = cost; out.rageCost = rCost; out.rageGain = gain;
    out.turns = t.turns; out.pierced = t.pierced; out.penalty = p;
    // buff / debuff 入表，持续回合按识破三档
    if (out.type === "buff") {
      pushBuff(battle, "buffs", { status: out.status, name: out.name, turns: t.turns, power: out.power });
    }
    if (out.type === "debuff" && Math.random() < (out.chance == null ? 1 : out.chance)) {
      pushBuff(battle, "debuffs", { status: out.status, name: out.name, turns: t.turns });
      out.applied = true;
    } else if (out.type === "debuff") out.applied = false;
    if (out.statuses && out.statuses.length) {
      out.appliedStatuses = [];
      out.statuses.forEach((s) => {
        if (Math.random() < s.chance) {
          pushBuff(battle, "debuffs", { status: s.status, name: s.name, turns: t.turns, dot: s.dot || 0 });
          out.appliedStatuses.push(s.name);
        }
      });
    }
    if (out.selfBuff) pushBuff(battle, "buffs", { status: out.selfBuff.status, name: STATUS_NAMES[out.selfBuff.status] || out.selfBuff.status, turns: t.turns, power: out.selfBuff.power });
    return out;
  }

  // 战斗可用技能（按已学，本职系优先）
  function battleSkills(hero) {
    return Object.keys(hero.skills || {})
      .filter((id) => get(id) && skillLevel(hero, id) > 0)
      .sort((a, b) => {
        const A = get(a), B = get(b);
        const ma = isMainXinfa(hero.class_id, A.xf) ? 0 : 1;
        const mb = isMainXinfa(hero.class_id, B.xf) ? 0 : 1;
        return ma - mb || catRank(A) - catRank(B) || (A.n || 0) - (B.n || 0);
      });
  }

  // 旧技能 id 映射表同步一份到 TSQ.DATA，便于在 data.js 侧查找（单一数据源仍是 SkillData.legacyMap）
  if (TSQ.DATA) TSQ.DATA.legacySkillMap = SD().legacyMap;

  TSQ.Skill = {
    CONST, fx, STATUS_NAMES,
    xinfaList, xinfa, classXinfa, isMainXinfa, allSkills, get, skillsOfXinfa, legacyToNew, rareSkills,
    migrate, initHero, defaults,
    xinfaLevel, xinfaCap, xinfaCost, upgradeXinfa, xiuweiOf, checkBonus, bonusProgress,
    skillLevel, skillProf, profNeed, profThreshold, profLayer, profProgress, addProf, applicableLevel,
    xinfaRequire, learnExpCost, bookPointsNeed, findBook, canLearn, learn,
    penalty, mpCost, rageCost, rageGain, turnsOf, cast, tickBuffs, hasDebuff,
    battleSkills
  };
})();
