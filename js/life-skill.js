/* 天资 / 夫妻 / 生活技能逻辑 v0.7
   ─────────────────────────────────────────────────────────────────────
   原则（按任务书）：
   1) 天资页 = 稀有技能的「筛选视图」：等级 / 熟练度 / 学习条件全部复用 TSQ.Skill
      与同一份 hero.skills，不新增第二套等级（不双算）。
   2) 不改装备成功率（equip*.js / data/rates.js 不碰）、不改宠物 stats、
      不改心法 / 职业技能公式（skill.js 只加了一个 rareSkills() 读取入口）。
   3) 存档：key = tsq_save_v2、save_version = 2 都不变，只在 migrate() 补字段。

   新增存档字段（migrate 补齐，旧档不丢数据）：
     hero.flags.married      是否已婚（演示开关，⚙）
     hero.flags.intimacy     亲密度（⚙ 默认，真实结婚任务线未做）
     hero.flags.spouse       配偶名（⚙ 默认）
     hero.coupleSkills       { 夫妻技能id: { lv, cd } }
     hero.lifeSkills         { 生活技能id: { lv, exp } }
   生活产出直接写 hero.mats（物品 id 运行时挂进 TSQ.EQ.materials），
   这样「背包 · 材料」区能直接看到，不需要改背包渲染。

   所有规格未公开的数值都在 js/life-skill-data.js › CONST。
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  const D = () => TSQ.LifeSkillData;
  const S = () => TSQ.Skill;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  // 日志出口：ui.js 会挂上 pushSysLog（战斗中也可用，会进战斗日志）
  let onLog = null;
  function log(msg) { if (onLog) onLog(msg); }

  /* ---------------- 生活产出物品挂进材料表（只增不改，装备系统在用） ---------------- */
  function registerMaterials() {
    const EQ = TSQ.EQ;
    if (!EQ || !EQ.materials) return;
    Object.entries(D().LIFE_ITEMS).forEach(([id, it]) => {
      if (!EQ.materials[id]) EQ.materials[id] = { id, name: it.name, icon: it.icon, desc: it.desc };
    });
  }

  /* ---------------- 迁移 / 初始化 ---------------- */
  function migrate(hero) {
    registerMaterials();
    const C = D().CONST;

    if (!hero.flags || typeof hero.flags !== "object") hero.flags = {};
    if (typeof hero.flags.married !== "boolean") hero.flags.married = !!C.DEMO.married;
    if (typeof hero.flags.intimacy !== "number") hero.flags.intimacy = C.DEMO.intimacy;
    if (typeof hero.flags.spouse !== "string") hero.flags.spouse = C.DEMO.spouse;

    // 夫妻技能
    if (!hero.coupleSkills || typeof hero.coupleSkills !== "object") hero.coupleSkills = {};
    const cs = {};
    Object.keys(hero.coupleSkills).forEach((id) => {
      if (!D().coupleById(id)) return; // 不在表内的旧键丢弃，不报错
      const v = hero.coupleSkills[id] || {};
      cs[id] = {
        lv: clamp(Math.round(v.lv || 1), 1, C.COUPLE_MAX_LV),
        cd: Math.max(0, Math.round(v.cd || 0))
      };
    });
    hero.coupleSkills = cs;

    // 生活技能
    if (!hero.lifeSkills || typeof hero.lifeSkills !== "object") hero.lifeSkills = {};
    const ls = {};
    D().LIFE.forEach((sk) => {
      const v = hero.lifeSkills[sk.id] || {};
      ls[sk.id] = {
        lv: clamp(Math.round(v.lv || C.DEMO.lifeLv), 1, C.LIFE_MAX_LV),
        exp: Math.max(0, Math.round(v.exp || 0))
      };
    });
    hero.lifeSkills = ls;

    if (!hero.mats || typeof hero.mats !== "object") hero.mats = {};
    return hero;
  }

  function initHero(hero) {
    const C = D().CONST;
    registerMaterials();
    migrate(hero);
    hero.flags.married = !!C.DEMO.married;
    hero.flags.intimacy = C.DEMO.intimacy;
    hero.flags.spouse = C.DEMO.spouse;
    hero.coupleSkills = {};
    hero.lifeSkills = {};
    D().LIFE.forEach((sk) => (hero.lifeSkills[sk.id] = { lv: C.DEMO.lifeLv, exp: 0 }));
    return hero;
  }

  /* ---------------- 通用条件行 ---------------- */
  const row = (label, ok, detail) => ({ label, ok: !!ok, detail: detail || "" });

  /* ================= 一、天资（稀有技能筛选视图） ================= */
  function talentList(hero) {
    const C = D().CONST;
    return D().TALENT.map((t) => {
      const sk = S().get(t.id);
      if (!sk) return null;
      const meta = t;
      const lv = S().skillLevel(hero, t.id);
      const prof = S().profProgress(hero, t.id);
      const mp = S().mpCost(hero, t.id);
      const xfId = meta.unlock && meta.unlock.xinfa ? meta.unlock.xinfa : sk.xf;
      const xfNeed = (meta.unlock && meta.unlock.xinfaLv) || C.TALENT_UNLOCK_DEFAULT.xinfaLv;
      const heroNeed = (meta.unlock && meta.unlock.heroLv) || C.TALENT_UNLOCK_DEFAULT.heroLv;
      const xfLv = S().xinfaLevel(hero, xfId);
      const unlockConds = [
        row(`${S().xinfa(xfId).name} 心法 ≥ ${xfNeed} ⚙`, xfLv >= xfNeed, `${xfLv}/${xfNeed}`),
        row(`人物等级 ≥ ${heroNeed} ⚙`, (hero.level || 1) >= heroNeed, `${hero.level || 1}/${heroNeed}`)
      ];
      const learn = S().canLearn(hero, t.id);
      return {
        id: t.id, skill: sk, meta, xf: S().xinfa(sk.xf),
        main: sk.xf ? S().isMainXinfa(hero.class_id, sk.xf) : false,
        owner: meta.class_id === hero.class_id,
        lv, prof, mp, cd: meta.cd || C.TALENT_CD_DEFAULT,
        unlockConds, unlockOk: unlockConds.every((c) => c.ok),
        learn,
        expNeed: S().learnExpCost(sk, learn.target || 1)
      };
    }).filter(Boolean);
  }

  // 天资学习：先过 ⚙ 默认 解锁门槛，再走职业技能的 4 条件（同一份等级/熟练度）
  function talentLearn(hero, id) {
    const t = talentList(hero).find((x) => x.id === id);
    if (!t) return { ok: false, msg: "没有该天资技能" };
    if (!t.unlockOk) {
      const miss = t.unlockConds.filter((c) => !c.ok).map((c) => c.label).join("、");
      return { ok: false, msg: `天资未解锁：${miss}（⚙ 默认门槛）` };
    }
    const r = S().learn(hero, id);
    if (r.ok) log(`习得天资【${t.skill.name}】${r.msg}`);
    return r;
  }

  /* ================= 二、夫妻技能 ================= */
  function married(hero) { return !!(hero.flags && hero.flags.married); }
  function intimacy(hero) { return (hero.flags && hero.flags.intimacy) || 0; }

  function setMarried(hero, val) {
    hero.flags.married = !!val;
    log(hero.flags.married ? `⚙ 演示开关：已置为「已婚」（配偶 ${hero.flags.spouse || "云舒"}）` : "⚙ 演示开关：已置为「未婚」，夫妻技能禁用");
    return hero.flags.married;
  }
  function addIntimacy(hero, delta) {
    hero.flags.intimacy = Math.max(0, intimacy(hero) + delta);
    return hero.flags.intimacy;
  }

  function coupleLv(hero, id) { return (hero.coupleSkills[id] && hero.coupleSkills[id].lv) || 0; }
  function coupleCd(hero, id) { return (hero.coupleSkills[id] && hero.coupleSkills[id].cd) || 0; }

  function coupleList(hero) {
    const C = D().CONST;
    return D().COUPLE.map((c) => {
      const lv = coupleLv(hero, c.id);
      const cd = coupleCd(hero, c.id);
      const m = married(hero);
      const conds = [
        row("已婚（hero.flags.married）", m, m ? "已婚" : "未婚（⚙ 演示开关可切换）"),
        row(`亲密度 ≥ ${c.intimacy}`, intimacy(hero) >= c.intimacy,
          c.intimacy ? `${intimacy(hero)}/${c.intimacy}` : `无需亲密度（当前 ${intimacy(hero)}）`),
        row(`双方等级 ≥ ${c.lvReq}`, (hero.level || 1) >= c.lvReq, `${hero.level || 1}/${c.lvReq}`)
      ];
      const nextLv = lv === 0 ? 1 : lv + 1;
      const maxed = lv >= C.COUPLE_MAX_LV;
      const silver = maxed ? 0 : C.COUPLE_SILVER[clamp(nextLv, 1, C.COUPLE_SILVER.length) - 1];
      const exp = maxed ? 0 : C.COUPLE_EXP[clamp(nextLv, 1, C.COUPLE_EXP.length) - 1];
      const costConds = [
        row(`银两 ${silver}`, (hero.silver || 0) >= silver, `${hero.silver || 0}/${silver}`),
        row(`技能经验 ${exp}`, (hero.skillExp || 0) >= exp, `${hero.skillExp || 0}/${exp}`)
      ];
      const canLearn = !maxed && conds.every((x) => x.ok) && costConds.every((x) => x.ok);
      return {
        def: c, lv, cd, maxed, nextLv, silver, exp,
        conds: conds.concat(costConds), canLearn,
        canCast: lv > 0 && conds.every((x) => x.ok) && cd <= 0,
        mp: Math.round(c.mp * (1 + C.COUPLE_LV_MULT * Math.max(0, lv - 1)))
      };
    });
  }

  function coupleLearn(hero, id) {
    const item = coupleList(hero).find((x) => x.def.id === id);
    if (!item) return { ok: false, msg: "没有该夫妻技能" };
    if (item.maxed) return { ok: false, msg: `「${item.def.name}」已达最高等级 ${D().CONST.COUPLE_MAX_LV}` };
    if (!item.canLearn) {
      const miss = item.conds.filter((c) => !c.ok).map((c) => c.label).join("、");
      return { ok: false, msg: `无法学习「${item.def.name}」：${miss}` };
    }
    hero.silver -= item.silver;
    hero.skillExp = (hero.skillExp || 0) - item.exp;
    hero.coupleSkills[id] = { lv: item.nextLv, cd: 0 };
    const msg = `${item.lv === 0 ? "学会" : "升级"}夫妻技能【${item.def.name}】→ Lv${item.nextLv}（耗银两 ${item.silver}、技能经验 ${item.exp}）`;
    log(msg);
    return { ok: true, msg };
  }

  // 每次演练前把所有冷却 -1（⚙ 默认：以「演练次数」计冷却回合）
  function tickCd(hero) {
    Object.keys(hero.coupleSkills || {}).forEach((id) => {
      const s = hero.coupleSkills[id];
      if (s && s.cd > 0) s.cd -= 1;
    });
  }

  // 非战斗「演练释放」：写日志（战斗中会进战斗日志），耗蓝可选
  function coupleCast(hero, id) {
    const C = D().CONST;
    const item = coupleList(hero).find((x) => x.def.id === id);
    if (!item) return { ok: false, msg: "没有该夫妻技能" };
    if (item.lv <= 0) return { ok: false, msg: `尚未学会「${item.def.name}」` };
    if (!married(hero)) return { ok: false, msg: "未婚，夫妻技能不可用（⚙ 演示开关：人物 / 夫妻页可切换）" };
    if (intimacy(hero) < item.def.intimacy) return { ok: false, msg: `亲密度不足（${intimacy(hero)}/${item.def.intimacy}）` };
    if (item.cd > 0) return { ok: false, msg: `【${item.def.name}】冷却中（还需 ${item.cd} 回合）` };
    if ((hero.mp || 0) < item.mp) return { ok: false, msg: `法力不足（需 ${item.mp}）` };

    tickCd(hero);
    hero.mp -= item.mp;
    if (hero.mp < 0) hero.mp = 0;

    const sec = TSQ.Game.combatStats(hero);
    const lvMult = 1 + C.COUPLE_LV_MULT * (item.lv - 1);
    const intMult = 1 + intimacy(hero) / C.INTIMACY_SCALE;
    const spouse = hero.flags.spouse || "配偶";
    let detail = "";
    if (item.def.kind === "heal") {
      const heal = Math.round((200 + sec.matk * 0.6) * lvMult * intMult);
      detail = `为 ${spouse} 恢复 ${heal} 点气血`;
    } else if (item.def.kind === "revive") {
      const heal = Math.round((120 + sec.matk * 0.4) * lvMult * intMult);
      const p = Math.min(0.95, 0.4 + intimacy(hero) / 10000); // ⚙ 默认：复活几率
      detail = `${spouse} 复活${Math.random() < p ? "成功" : "失败"}，恢复 ${heal} 点气血（几率 ${Math.round(p * 100)}%）`;
    } else if (item.def.kind === "shield") {
      const sh = Math.round((sec.mdef * 0.4 + sec.matk * 0.3) * lvMult * intMult);
      detail = `为 ${spouse} 张开 ${sh} 点护盾，替其承受物理伤害`;
    } else {
      detail = `对 ${spouse} 生效（⚙ 默认 效果占位）`;
    }
    hero.coupleSkills[id].cd = item.def.cd;
    const msg = `演练释放【${item.def.name}】Lv${item.lv}：${detail}（亲密度 ${intimacy(hero)}，耗法力 ${item.mp}，冷却 ${item.def.cd} 回合）`;
    log(msg);
    return { ok: true, msg };
  }

  /* ================= 三、生活技能 ================= */
  function lifeState(hero, id) {
    const st = (hero.lifeSkills && hero.lifeSkills[id]) || { lv: 1, exp: 0 };
    return st;
  }

  function lifeExpNeed(lv) { return D().CONST.LIFE_EXP_NEED(lv); }

  // 当前等级能采到的最高档产出
  function lifeYield(hero, id, lv) {
    const def = D().lifeById(id);
    if (!def) return null;
    const lvNow = lv == null ? lifeState(hero, id).lv : lv;
    const ok = def.yields.filter((y) => y.lv <= lvNow);
    if (!ok.length) return null;
    return ok[ok.length - 1];
  }

  function lifeList(hero) {
    const C = D().CONST;
    return D().LIFE.map((def) => {
      const st = lifeState(hero, def.id);
      const need = st.lv >= C.LIFE_MAX_LV ? 0 : lifeExpNeed(st.lv);
      const silver = st.lv >= C.LIFE_MAX_LV ? 0 : C.LIFE_SILVER_PER_LV * (st.lv + 1);
      const y = lifeYield(hero, def.id, st.lv);
      const item = y ? D().itemById(y.item) : null;
      return {
        def, lv: st.lv, exp: st.exp, need,
        pct: need ? clamp(st.exp / need * 100, 0, 100) : 100,
        maxed: st.lv >= C.LIFE_MAX_LV,
        silver,
        yieldItem: item ? { id: y.item, name: item.name, icon: item.icon, needLv: y.lv } : null,
        nextYield: (() => {
          const nx = def.yields.find((z) => z.lv > st.lv);
          if (!nx) return null;
          const it = D().itemById(nx.item);
          return it ? { name: it.name, needLv: nx.lv } : null;
        })(),
        canExpUp: st.lv < C.LIFE_MAX_LV && st.exp >= need,
        canSilverUp: st.lv < C.LIFE_MAX_LV && (hero.silver || 0) >= silver,
        have: (hero.mats && hero.mats[y ? y.item : ""]) || 0
      };
    });
  }

  // 采集 / 制作一次：给产出 + 生活经验 + 日志（不碰装备成功率、不碰宠物）
  function lifeGather(hero, id) {
    const C = D().CONST;
    const def = D().lifeById(id);
    if (!def) return { ok: false, msg: "没有该生活技能" };
    const st = lifeState(hero, id);
    const y = lifeYield(hero, id, st.lv);
    if (!y) return { ok: false, msg: `${def.name} 等级不足，暂无可产出物` };
    const item = D().itemById(y.item);
    const n = randInt(C.LIFE_GATHER_MIN, C.LIFE_GATHER_MAX);
    hero.mats[y.item] = (hero.mats[y.item] || 0) + n;
    const gain = C.LIFE_GATHER_EXP + C.LIFE_GATHER_EXP_PER_LV * st.lv;
    st.exp += gain;
    let up = "";
    const need = st.lv < C.LIFE_MAX_LV ? lifeExpNeed(st.lv) : 0;
    if (need && st.exp >= need && st.lv < C.LIFE_MAX_LV) up = `（生活经验已够升到 Lv${st.lv + 1}，点「经验升级」）`;
    const msg = `${def.kind === "制作" ? "制作" : "采集"}一次【${def.name} Lv${st.lv}】：获得 ${item.name} ×${n}，生活经验 +${gain}（${st.exp}/${need || "—"}）${up}`;
    log(msg);
    return { ok: true, msg, item: item.name, n, exp: gain };
  }

  function lifeUpgrade(hero, id, mode) {
    const C = D().CONST;
    const def = D().lifeById(id);
    if (!def) return { ok: false, msg: "没有该生活技能" };
    const st = lifeState(hero, id);
    if (st.lv >= C.LIFE_MAX_LV) return { ok: false, msg: `「${def.name}」已达上限 Lv${C.LIFE_MAX_LV}（⚙ 默认）` };
    const need = lifeExpNeed(st.lv);
    const silver = C.LIFE_SILVER_PER_LV * (st.lv + 1);
    if (mode === "silver") {
      if ((hero.silver || 0) < silver) return { ok: false, msg: `银两不足（需 ${silver}，现有 ${hero.silver || 0}）` };
      hero.silver -= silver;
      st.lv += 1; st.exp = 0;
      const msg = `【${def.name}】用银两升到 Lv${st.lv}（消耗 ${silver} 银两）`;
      log(msg);
      return { ok: true, msg };
    }
    if (st.exp < need) return { ok: false, msg: `生活经验不足（${st.exp}/${need}）` };
    st.exp -= need;
    st.lv += 1;
    const msg = `【${def.name}】升到 Lv${st.lv}（消耗生活经验 ${need}）`;
    log(msg);
    return { ok: true, msg };
  }

  // 生活产出背包（只显示生活物品），给 UI 展示用
  function lifeBag(hero) {
    const out = [];
    Object.keys(D().LIFE_ITEMS).forEach((id) => {
      const n = (hero.mats && hero.mats[id]) || 0;
      if (n > 0) out.push({ id, name: D().LIFE_ITEMS[id].name, icon: D().LIFE_ITEMS[id].icon, n });
    });
    return out;
  }

  TSQ.LifeSkill = {
    set onLog(fn) { onLog = fn; },
    get onLog() { return onLog; },
    registerMaterials, migrate, initHero,
    // 天资
    talentList, talentLearn,
    // 夫妻
    married, intimacy, setMarried, addIntimacy, coupleLv, coupleList, coupleLearn, coupleCast, tickCd,
    // 生活
    lifeState, lifeExpNeed, lifeList, lifeGather, lifeUpgrade, lifeBag
  };
})();
