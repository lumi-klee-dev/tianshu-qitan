/* 宠物系统 v0.4：物种数据、天赋、战斗数值
   ─────────────────────────────────────────────────────────────────────
   战斗数值公式（简化原型，公式全部写在这里便于调参）：

   1) 资质归一化 q(k) = apt[k].cur / apt[k].max        （0~1）
      跨物种可比：星澜飞骥资质是几千，灰野兔是几十，归一化后用同一套系数。
   2) 成长系数 G = growthRates[pet.growth].mult        （普通 1.0 → 完美 1.7）
   3) 等级系数 L = 1 + pet.level / 100
   4) 基础值（未计天赋，pri = pet.primary 加点）：
        物攻 = (10 + 2*Lv + 1.2*强壮 + 40*q(强壮) + 3*q(敏捷)) * G * L
        法攻 = (8  + 1.5*Lv + 1.0*智力 + 36*q(智力) + 2*q(信仰)) * G * L
        生命 = (60 + 8*Lv   + 24*耐力 + 120*q(耐力)) * G * L
        法力 = (20 + 3*Lv   + 10*智力 + 60*q(智力)) * G * L
        物防 = (3  + 0.15*耐力 + 10*q(耐力)) * G * L
        法防 = (3  + 0.15*信仰 + 10*q(信仰)) * G * L
        速度 = (5  + 0.2*敏捷 + 20*q(敏捷)) * G
   5) 天赋修正累加后一次性乘算（TSQ.DATA.petTalents[id].effect）：
        patk_pct / matk_pct / hp_pct / mp_pct / spd_pct → 直接乘 (1+x)
        pri_pct  → 先按百分比抬高宠物五维加点，再代入第 4 步
        dr_pct   → 受击伤害 x (1-dr)（天赐矫健：物理/法术闪避上升）
        lifesteal → 攻击时按伤害比例回血给人物
        mp_regen → 人物每回合恢复的法力值
        先手：天赋显式指定，或敏捷资质归一 q(敏捷) ≥ 0.9 时概率先动
   6) 伤害 = max(1, round((攻击 - 目标防御*0.5) * (0.9 ~ 1.1)))
   7) 战力（仅展示）= round((物攻 + 法攻)*2 + 生命*0.5 + 速度*3)
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  const D = () => TSQ.DATA;
  const uid = () => Math.random().toString(16).slice(2, 10);
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function speciesOf(petOrId) {
    const id = typeof petOrId === "string" ? petOrId : (petOrId && (petOrId.species || petOrId.id));
    return D().petSpecies.find((s) => s.id === id) || D().petSpecies[0];
  }

  // 生成一只宠物。opts: { level, growth, name, aptPct(0~1 资质档次), fighting, talents }
  function makePet(speciesId, opts = {}) {
    const sp = speciesOf(speciesId);
    const growth = opts.growth || pick(["common", "fine", "great", "excellent", "perfect"]);
    const apt = {};
    for (const [k, range] of Object.entries(sp.apt)) {
      const pct = opts.aptPct != null ? clamp(opts.aptPct, 0, 1) : 0.35 + Math.random() * 0.5;
      apt[k] = { cur: Math.round(range[0] + (range[1] - range[0]) * pct), max: range[1] };
    }
    if (!apt.fai) apt.fai = { cur: rand(10, 25), max: 40 };
    const god = sp.tier === "神兽" || sp.tier === "珍兽";
    let talents;
    if (opts.talents) talents = [...opts.talents];
    else if (god) talents = [...(sp.talent || [])];
    else {
      const pool = sp.talent || [];
      const n = pool.length ? (chance(0.55) ? 1 : 0) : 0;
      talents = [];
      for (let i = 0; i < n; i++) { const t = pick(pool); if (!talents.includes(t)) talents.push(t); }
    }
    const level = opts.level || 1;
    const pet = {
      uid: uid(),
      species: sp.id,
      name: opts.name || sp.name,
      type: sp.type,
      tier: sp.tier || sp.type,
      atk_type: sp.atk_type || "phys",
      art: sp.art || null,
      artAlt: sp.artAlt || null,
      source: sp.source || "野外捕捉",
      desc: sp.desc || "",
      level,
      exp: 0,
      growth,
      loyalty: 100,
      life: [800, 900],
      wuxing: opts.wuxing || rand(5, 15),
      apt,
      primary: { str: 8, con: 8, agi: 8, int: 5, fai: 5 },
      unspent: 5 + Math.floor(level * 0.5),
      skills: [...(sp.skills || [])],
      talents,
      neidan: [null, null, null, null, null, null, null, null],
      fighting: !!opts.fighting,
      hp: null,
      doodle: sp.doodle
    };
    const st = stats(pet);
    pet.hp = st.hp; // 满血入队
    return pet;
  }

  // 天赋效果汇总
  function talentEffects(pet) {
    const out = {
      patk_pct: 0, matk_pct: 0, hp_pct: 0, mp_pct: 0, spd_pct: 0,
      dr_pct: 0, lifesteal: 0, mp_regen: 0, first: false, firstBonus: 0, pri_pct: {}
    };
    (pet.talents || []).forEach((id) => {
      const t = D().petTalents[id];
      if (!t || !t.effect) return;
      for (const [k, v] of Object.entries(t.effect)) {
        if (typeof v === "boolean") { out[k] = out[k] || v; continue; }
      if (typeof v === "object" && v !== null) { Object.assign(out.pri_pct, v); continue; }
      if (k === "firstBonus") { out.firstBonus = Math.max(out.firstBonus || 0, v); continue; } // 天赐矫健：先手加成（⚙ 默认）
      out[k] = (out[k] || 0) + v;
      }
    });
    return out;
  }

  function talentList(pet) {
    return (pet.talents || []).map((id) => D().petTalents[id] || { name: id, desc: "" });
  }

  function stats(pet, hero) {
    const sp = speciesOf(pet);
    const G = (D().growthRates[pet.growth] || { mult: 1 }).mult;
    const L = 1 + (pet.level || 1) / 100;
    const eff = talentEffects(pet);
    const q = (k) => {
      const a = pet.apt && pet.apt[k];
      if (!a || !a.max) return 0.5;
      return clamp(a.cur / a.max, 0, 1);
    };
    // 天赋里的属性加成（pri_pct）先作用在加点后的五维上，再进公式
    const p0 = pet.primary || {};
    const p = {};
    ["str", "con", "agi", "int", "fai"].forEach((k) => {
      p[k] = (p0[k] || 0) * (1 + ((eff.pri_pct && eff.pri_pct[k]) || 0));
    });
    const lv = pet.level || 1;
    const s = {
      patk: (10 + 2 * lv + 1.2 * p.str + 40 * q("str") + 3 * q("agi")) * G * L,
      matk: (8 + 1.5 * lv + 1.0 * p.int + 36 * q("int") + 2 * q("fai")) * G * L,
      hp: (60 + 8 * lv + 24 * p.con + 120 * q("con")) * G * L,
      mp: (20 + 3 * lv + 10 * p.int + 60 * q("int")) * G * L,
      pdef: (3 + 0.15 * p.con + 10 * q("con")) * G * L,
      mdef: (3 + 0.15 * p.fai + 10 * q("fai")) * G * L,
      spd: (5 + 0.2 * p.agi + 20 * q("agi")) * G
    };
    s.patk *= 1 + eff.patk_pct;
    s.matk *= 1 + eff.matk_pct;
    s.hp *= 1 + eff.hp_pct;
    s.mp *= 1 + eff.mp_pct;
    s.spd *= 1 + eff.spd_pct;
    /* ── v0.6 宠物养成二期加成入口（只读，不改动上面的资质公式）─────────
       武装（js/pet-advance.js › statBonus 的武装部分）+ 炼化（每级 ×Lv）
       都是「固定值」加成，在这里一次性加上；耐久为 0 的武装不计入。
       数据来源：TSQ.PetAdvanceData（全部 ⚙ 默认集中在那里的 CONST）。 */
    if (TSQ.PetAdvance && TSQ.PetAdvance.statBonus) {
      const ab = TSQ.PetAdvance.statBonus(pet) || {};
      ["patk", "matk", "hp", "mp", "pdef", "mdef", "spd"].forEach((k) => {
        if (ab[k]) s[k] += ab[k];
      });
    }
    /* ── v1.1 精灵系统加成入口（白精灵加成同时作用于人物与出战宠物）──────
       加成进入 combatStats，并在出战宠物战力/属性展示里可见。 */
    if (TSQ.Spirit && TSQ.Spirit.petBonus) {
      const h = hero || (typeof TSQ !== "undefined" && TSQ.UI && TSQ.UI.state && TSQ.UI.state.hero) || (pet && pet._ownerHero);
      if (h && pet && pet.fighting) {
        const pb = TSQ.Spirit.petBonus(h, pet);
        if (pb && pb.flat) {
          ["patk", "matk", "hp", "mp", "pdef", "mdef", "spd"].forEach((k) => {
            if (pb.flat[k]) s[k] += pb.flat[k];
          });
        }
      }
    }
    for (const k of Object.keys(s)) s[k] = Math.round(s[k]);
    s.lifesteal = eff.lifesteal;
    s.dr = eff.dr_pct;
    s.mpRegen = eff.mp_regen;
    /* ── 先手判定（附录 P1.2 注释）───────────────────────────────────
       规则口径：速度定先手 —— 宠物的「速度」高于对手即先出手（见下方 initiative()）。
       天赋加成：
         - 天赐矫健 = 先手加成（PET_TALENT_VALUES.jiaojian.firstBonus，⚙ 默认 +0.1）
           实现上表现为「降低敏捷资质先手阈值」：阈值 = 0.9 − firstBonus（⚙ 默认 0.9）。
         - 仙风道骨 = 减伤（官网文案为耐力/敏捷 +15%，与「减伤」口径不同；
           原型保留官网口径 pri_pct{con,agi}，减伤仍由天赐矫健的 dr_pct 承担，
           见 TSQ.DATA.petTalents 与 PET_TALENT_VALUES）。
       公式来源：敏捷资质归一 q(agi) = apt.agi.cur / apt.agi.max（本文件顶部第 1 条）；
        阈值 0.9 与 firstBonus 0.1 为 ⚙ 默认（规格未公开具体数值）。
       ────────────────────────────────────────────────────────────────*/
    const firstBonus = eff.firstBonus || 0;
    const firstThreshold = 0.9 - firstBonus; // ⚙ 默认
    s.first = !!eff.first || q("agi") >= firstThreshold;
    s.firstBonus = firstBonus;
    s.power = Math.round((s.patk + s.matk) * 2 + s.hp * 0.5 + s.spd * 3);
    s.maxHp = s.hp;
    if (pet.hp == null || pet.hp > s.hp) pet.hp = s.hp;
    s.curHp = Math.max(0, Math.round(pet.hp));
    s.down = s.curHp <= 0;
    s.name = pet.name;
    s.type = sp.type;
    return s;
  }

  /* 先手判定（附录 P1.2）：速度定先手。
     - monSpd 给了 → 宠物速度 > 怪物速度 即先手；
     - monSpd 为空（老调用方）→ 退回 stats().first（敏捷资质阈值 / 显式 first 天赋），行为不变。
     天赐矫健的 firstBonus 已在 stats() 里以降低阈值的方式生效。⚙ 默认：无额外速度加成系数。 */
  function initiative(pet, monSpd, st) {
    st = st || stats(pet);
    if (monSpd == null) return !!st.first;
    return (st.spd || 0) > (monSpd || 0) || !!st.first;
  }

  // 宠物出手：返回伤害与天赋说明
  function attack(pet, mon, st) {
    st = st || stats(pet);
    const sp = speciesOf(pet);
    const magic = sp.atk_type === "magic" || st.matk > st.patk * 1.2;
    const atk = magic ? st.matk : st.patk;
    const def = magic ? (mon.mdef || 0) : (mon.pdef || 0);
    const dmg = Math.max(1, Math.round((atk - def * 0.5) * (0.9 + Math.random() * 0.2)));
    let label = "扑击";
    const sid = (pet.skills || [])[0];
    if (sid && D().skills[sid]) label = D().skills[sid].name;
    return {
      dmg,
      kind: magic ? "magic" : "phys",
      label,
      lifesteal: Math.round(dmg * (st.lifesteal || 0)),
      talents: talentList(pet).map((t) => t.name)
    };
  }

  function takeDamage(pet, dmg, st) {
    st = st || stats(pet);
    const real = Math.max(1, Math.round(dmg * (1 - (st.dr || 0))));
    pet.hp = Math.max(0, (pet.hp == null ? st.maxHp : pet.hp) - real);
    return real;
  }

  function heal(pet) { const st = stats(pet); pet.hp = st.hp; return st.hp; }

  // 携带/休息：同时最多一只出战
  function setFighting(hero, idx) {
    const pet = hero.pets[idx];
    if (!pet) return null;
    const was = !!pet.fighting;
    hero.pets.forEach((p) => (p.fighting = false));
    pet.fighting = !was;
    return pet;
  }

  function fighting(hero) { return hero.pets.find((p) => p.fighting) || null; }

  // 资质条数据：耐力/强壮/信仰/敏捷/智力
  function aptRows(pet) {
    const order = D().aptOrder || ["con", "str", "fai", "agi", "int"];
    const keys = order.concat(Object.keys(pet.apt || {}).filter((k) => !order.includes(k)));
    return keys.filter((k) => pet.apt && pet.apt[k]).map((k) => ({
      key: k,
      name: D().primaryNames[k] || k,
      cur: pet.apt[k].cur,
      max: pet.apt[k].max,
      pct: Math.min(100, (pet.apt[k].cur / (pet.apt[k].max || 1)) * 100)
    }));
  }

  TSQ.Pet = {
    speciesOf, makePet, stats, attack, takeDamage, heal, initiative,
    setFighting, fighting, talentList, talentEffects, aptRows, rand, pick, chance
  };
})();
