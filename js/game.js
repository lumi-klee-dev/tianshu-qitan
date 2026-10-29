/* 游戏逻辑：属性换算、装备、打造、宠物、战斗 */
(function () {
  const D = () => TSQ.DATA;
  const uid = () => Math.random().toString(16).slice(2, 10);
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));


  function convertPrimary(pri, classId) {
    const ATTR = D();
    const sec = {};
    Object.keys(ATTR.secondaryNames).forEach((k) => (sec[k] = 0));
    for (const [pk, amt] of Object.entries(pri)) {
      const conv = ATTR.conversion[pk] || {};
      for (const [sk, mul] of Object.entries(conv)) sec[sk] = (sec[sk] || 0) + amt * mul;
    }
    const coef = (ATTR.classes[classId] && ATTR.classes[classId].coef) || {
      pdodge: 1, pcrit: 3, mdodge: 1, mcrit: 2
    };
    sec.pdodge = pri.agi * coef.pdodge;
    sec.pcrit = pri.agi * coef.pcrit;
    sec.mdodge = pri.fai * coef.mdodge;
    sec.mcrit = pri.fai * coef.mcrit;
    sec.hp += 80; sec.mp += 40; sec.rage += 50; sec.spd += 10;
    sec.patk += 5; sec.pdef += 3; sec.matk += 5; sec.mdef += 3;
    const out = {};
    for (const k of Object.keys(sec)) out[k] = Math.round(sec[k]);
    return out;
  }




  const E = () => TSQ.Equip;
  // 宠物生成统一交给 TSQ.Pet（v0.4，见 js/pet.js），这里保留旧签名以免破坏既有调用
  function makePet(speciesId, opts = {}) { return TSQ.Pet.makePet(speciesId, opts); }


  // 演示宠：神兽星澜飞骥（出战、已飞升、可融合）+ 小金龙 + 灰野兔 + 猫 + 白羊
  // v0.6：额外给 3 只同种「星澜飞骥·副」当作融合副宠（技能栏已清空）
  function demoPets() {
    const xl = makePet("xinglanfeiji", { fighting: true, growth: "perfect", level: 80, aptPct: 0.96, wuxing: 15 });
    xl.neidan[0] = { name: "星澜内丹", color: "#6cf" };
    xl.neidan[1] = { name: "气血丹", color: "#f88" };
    const dragon = makePet("xiaojinlong", { growth: "excellent", level: 45, aptPct: 0.8 });
    const rabbit = makePet("huiyetu", { growth: "perfect", level: 12, wuxing: 12 });
    rabbit.neidan[0] = { name: "初阶内丹", color: "#8cf" };
    const cat = makePet("mao", { growth: "fine", level: 8 });
    const sheep = makePet("baiyang", { growth: "great", level: 20 });
    const pets = [xl, dragon, rabbit, cat, sheep];
    // v0.6：演示宠物技能（让炼化链一上来就能抽取），见 PetAdvanceData.DEMO.petSkills
    const demoSkills = (TSQ.PetAdvanceData && TSQ.PetAdvanceData.DEMO.petSkills) || {};
    pets.forEach((p) => { if (demoSkills[p.species]) p.skills = demoSkills[p.species].slice(); });
    // v0.6：融合副宠 —— 同种、技能栏已清空（§6.11）
    const n = (TSQ.PetAdvanceData && TSQ.PetAdvanceData.DEMO.fuseSubCount) || 3;
    for (let i = 0; i < n; i++) {
      const sub = makePet("xinglanfeiji", { name: `星澜飞骥·副${i + 1}`, level: 1, growth: "common", aptPct: 0.5 });
      sub.skills = [];
      pets.push(sub);
    }
    return pets;
  }

  // v0.6：给演示宠物装上武装 / 飞升标记 / 进化等级（见 PetAdvanceData.DEMO）
  function decorateDemoPets(hero) {
    const A = TSQ.PetAdvance, DEMO = TSQ.PetAdvanceData.DEMO;
    if (!A) return;
    // 所有演示宠先补齐 v0.6 字段
    hero.pets.forEach((p) => A.migrate(p));
    // 主宠：预置已飞升（本轮不实装飞升 UI，用标记位，见任务书「不许动」）
    const main = hero.pets.find((p) => p.species === DEMO.feishengSpecies);
    if (main) {
      main.flags.feisheng = true;
      Object.entries(DEMO.demoArms).forEach(([armId, cfg]) => {
        const durMax = A.armDurMax(cfg.quality);
        main.arms[armId] = { quality: cfg.quality, dur: Math.max(1, Math.round(durMax * cfg.durRatio)), durMax };
      });
    }
  }


  // ---- 演示角色：三转 145 级修真，带满足所有打造操作的材料 ----
  function createHero(classId, name) {
    const cls = D().classes[classId];
    const mk = (tpl, o) => E().makeItem(tpl, Object.assign({ cls: classId, gender: "m" }, o || {}));
    const gems6 = (cols) => cols.map((c) => ({ color: c[0], gem: c[1] ? { id: c[1], lv: c[2] || 6 } : null }));
    const spiritHead = [{ stat: "agi", value: 105 }, { stat: "rage_turn", value: 65 }, { stat: "spd_pct", value: 0.004 }, { stat: "imdef", value: 401 }];
    const full = (tpl, o) => mk(tpl, Object.assign({ tier: "radiant", color: "orange", stars: 13, mingke: 9, bound: true, setId: "taixu" }, o || {}));
    const P = "pink", U = "purple", B = "blue", Y = "yellow";
    const eq = {};
    E().makeItem; // noop
    eq.head = full("taixu_head", { awaken: { lv: 60, cap: 60, exp: 3000 }, maxHoles: 12, dur: [992, 1000],
      enchant: { type: "p", lv: 6 }, spirit: spiritHead,
      bindAttr: { stat: "patk", value: 148 },
      holes: gems6([[P, "tian_su"], [P, "tian_su"], [U, "tian_yong"], [U, "tian_yong"], [P, "tian_su"], [P, "tian_su"], [U, "tian_yong"], [P, "tian_su"], [U, "tian_yong"], [U, "tian_yong"], [P, "tian_su"], [U, "tian_yong"]]) });
    // 复刻参考截图中的这件头饰：数值逐项对齐
    eq.head.shenqi = { name: "神启·神临2级", text: "在你使用烈焰风暴时附加1适用等级" };
    eq.head.locked = true; eq.head.price = 1800; eq.head.awaken.exp = 3213;
    eq.head.req = { level: 30, classes: null, gender: null, rebirth: 3, attr: null };
    eq.head.affixes = [{ stat: "con", value: 87 }, { stat: "agi", value: 60 }, { stat: "hp", value: 729 }, { stat: "spd", value: 146 }, { stat: "matk", value: 176 }, { stat: "mdodge", value: 109 }];
    eq.head.base = { mdef: 1000 };
    eq.head.base = { mdef: 1000 * 5059 / E().baseFinal(eq.head).mdef };
    eq.head.desc = "碧凤息梧终涅火，瑶光映世盼君临。";
    ["body", "legs", "belt", "boots"].forEach((t) => {
      eq[t] = full("taixu_" + t, { enchant: { type: t === "body" ? "m" : "p", lv: 5 },
        holes: gems6([[P, "tian_shou", 5], [U, "tian_yong", 5], [B, "tian_tui", 5], [Y, "tian_xian", 4], [P, null], [B, null], [Y, null], [U, null]]) });
    });
    eq.shoulder = full("taixu_shoulder", { holes: gems6([[P, "tian_shou", 4], [B, "tian_bai", 4], [Y, null]]) });
    eq.cape = full("taixu_cape", { holes: gems6([[U, "tian_yong", 4], [B, null], [Y, null], [P, null]]) });
    eq.acc1 = full("taixu_accessory", { holes: gems6([[P, "tian_ji", 3], [Y, "tian_gu", 3]]) });
    eq.weapon = mk("taixu_weapon", { tier: "radiant", color: "orange", stars: 13, mingke: 9, bound: true, holes: [B, Y, P, U, B, Y, P, U, B, Y] });
    eq.acc2 = mk("huang_ash", { tier: "perfect", color: "orange", bound: true, dur: [527, 650],
      affixes: [{ stat: "str", value: 29 }, { stat: "hp", value: 244 }, { stat: "pdodge", value: 36 }, { stat: "pcrit", value: 49 }, { stat: "mdodge", value: 36 }],
      bindAttr: { stat: "pdodge", value: 36 }, spirit: [{ stat: "hp_pct", value: 0.018 }],
      holes: [{ color: B, gem: { id: "tian_bai", lv: 3 } }, { color: B, gem: { id: "tian_tui", lv: 4 } }, { color: B, gem: { id: "tian_tui", lv: 1 } },
        { color: B, gem: { id: "tian_bai", lv: 3 } }, { color: P, gem: { id: "tian_ji", lv: 3 } }, { color: B, gem: { id: "tian_tui", lv: 3 } },
        { color: Y, gem: { id: "tian_xian", lv: 3 } }, { color: Y, gem: { id: "tian_xian", lv: 3 } }, { color: Y, gem: { id: "tian_gu", lv: 3 } }] });
    eq.acc3 = mk("mercy_soul", { tier: "radiant", color: "white", bound: true, bindAttr: null, dur: [650, 650],
      holes: [B, B, U, Y, B, U, B, P, Y, P, P, P] });
    eq.ring1 = mk("guanxin_ring", { tier: "radiant", color: "orange", bound: true, stars: 11, mingke: 8,
      holes: gems6([[P, "tian_shou", 5], [P, "tian_shou", 5], [U, "tian_yong", 5], [B, null], [Y, null], [B, null], [Y, null], [B, null], [P, null], [Y, null]]) });
    eq.ring2 = mk("shiguang_ring", { tier: "perfect", color: "purple", bound: true, holes: 6 });
    eq.bracelet1 = mk("gongxun_bracelet", { tier: "radiant", color: "blue", bound: true, holes: 4 });
    eq.bracelet2 = mk("gongxun_bracelet", { tier: "radiant", color: "blue", bound: true, holes: 3, dur: [12, 1000] });
    const equipment = {};
    TSQ.EQ.slots.forEach((s) => (equipment[s.id] = eq[s.id] || null));


    const bag = [
      mk("taixu_head", { tier: "radiant", color: "orange", stars: 13, mingke: 9, bound: true, holes: 0 }),  // 可觉醒/打孔
      mk("qingluan_body", { tier: "perfect", color: "purple", holes: 5 }),   // 未绑定：附加属性显示 ？？？；可套装改造
      mk("qingluan_legs", { tier: "fine", color: "blue", holes: 3 }),
      mk("xuanming_cape", { tier: "normal", color: "green", holes: 0 }),     // 可打孔/分解
      mk("xuanming_head", { tier: "fine", color: "orange", holes: 2, bound: true, dur: [300, 1000] }),
      mk("meteor_shard", { tier: "perfect", color: "white", identified: false, holes: 0 }),  // 鉴定 → 开光
      mk("shiguang_ring", { tier: "perfect", color: "green", holes: 3, bound: true }),
      mk("zijin_body", { tier: "normal", color: "green", holes: 2 })
    ].map((item) => ({ kind: "equip", item }));


    const mats = {};
    const put = (id, n) => (mats[id] = (mats[id] || 0) + n);
    for (let g = 1; g <= 5; g++) { put("shanggu_" + g, 300); put("moxing_" + g, 150); put("xuanbing_" + g, 20); put("lingzhou_" + g, 30); }
    put("xuanbing_1", 60);
    TSQ.EQ.grades.forEach((gr) => {
      put("upstone_" + gr.id, 200); put("lifestone_" + gr.id, 120);
      if (gr.id !== "juexing") { put("drill_" + gr.id + "_a", 20); put("drill_" + gr.id + "_b", 10); }
    });
    put("drill_any", 10); put("wenyu", 20); put("wuxian_gem", 2); put("wash_charm", 60);
    put("gem_charm_low", 30); put("gem_charm_high", 20); put("remove_low", 20);
    for (let i = 1; i <= 7; i++) put("remove_high_" + i, 6);
    for (let i = 1; i <= 6; i++) { put("enchant_p_" + i, 15 - i); put("enchant_m_" + i, 15 - i); }
    put("enchant_p_1", 30); put("enchant_m_1", 30);
    put("guiyuan", 10); put("tongling_20", 5); put("tongling_50", 5); put("tongling_80", 3); put("yangyuan_water", 10);
    put("kg_stone", 8); put("kg_nvshen", 5); put("kg_xianren", 5);
    for (let i = 1; i <= 4; i++) put("prism_" + i, 30);
    put("xuanbing_frag", 30); put("moduan", 20); put("lost_manual", 6); put("bodhi", 12); put("lingyuan", 300);
    put("ys_pill", 50); // v0.8: 演示用元神丹


    const gemInv = {};
    Object.keys(TSQ.EQ.gems).forEach((id) => { gemInv[id + ":1"] = 6; gemInv[id + ":3"] = 5; gemInv[id + ":5"] = 2; });
    gemInv["tian_su:6"] = 4; gemInv["tian_yong:6"] = 4; gemInv["tian_shou:4"] = 6;


    const hero = {
      save_version: 2,
      name: name || "云起", class_id: classId, gender: "m", rebirth: 3,
      level: 145, exp: 120, exp_need: 280,
      silver: 5000000, yinpiao: 2000000, yuanshen: { lv: 3, exp: 0, value: 3000000 },
      primary: { str: 60, con: 420, agi: 220, int: 330, fai: 150 },
      unspent: 18, pending: { str: 0, con: 0, agi: 0, int: 0, fai: 0 },
      skills: {},                    // v0.5：由 TSQ.Skill.initHero 填充 { id:{level,prof} }
      badges: { worn: [], owned: {} }, // v0.8：由 TSQ.Badge.initHero 填充
      equipment, bag, mats, gemInv,
      consumables: { hp_potion_s: 5, mp_potion_s: 3, catch_scroll: 5, pet_food: 3, apt_pill: 2, gem_bag: 3 },
      pets: demoPets(),
      // v0.6 宠物养成二期：金子（融合高级 / 进化加成功率）、宠物道具、已抽出的万兽密录
      gold: (TSQ.PetAdvanceData && TSQ.PetAdvanceData.DEMO.gold) || 0,
      petItems: {},
      refineManuals: [],
      // v0.7 天资 / 夫妻 / 生活：flags.married 等由 LifeSkill.initHero 补齐
      flags: { married: false, intimacy: 0, spouse: "" },
      coupleSkills: {},
      lifeSkills: {},
      hp: 0, mp: 0, rage: 0
    };
    // v0.6：发放宠物养成道具（进化之灵×5、空白密录×3、武装材料一包…）
    if (TSQ.PetAdvanceData) {
      const DEMO = TSQ.PetAdvanceData.DEMO;
      Object.entries(DEMO.items).forEach(([id, n]) => (hero.petItems[id] = n));
      Object.entries(DEMO.armMats).forEach(([id, n]) => (hero.petItems[id] = n));
      decorateDemoPets(hero);
    }
    // 心法 / 技能 v0.5：8 系心法 1 级、技能经验、技能书、初始技能
    TSQ.Skill.initHero(hero);
    hero.skills = Object.assign({}, hero.skills, Object.fromEntries(
      cls.skills.map((s) => [TSQ.Skill.legacyToNew(s) || s, { level: 1, prof: 0 }])
    ));
    // v0.7：天资 / 夫妻 / 生活字段（已婚为 ⚙ 演示开关，默认 false）
    if (TSQ.LifeSkill) TSQ.LifeSkill.initHero(hero);
    // v0.8：元神 / 徽章字段
    if (TSQ.Yuanshen) TSQ.Yuanshen.initHero(hero);
    if (TSQ.Badge) TSQ.Badge.initHero(hero);
    // v0.9：称号 / 法宝字段
    if (TSQ.Title) TSQ.Title.initHero(hero);
    if (TSQ.Fabao) TSQ.Fabao.initHero(hero);
    // v1.0：骑宠 / 兽魂字段
    if (TSQ.Mount) TSQ.Mount.initHero(hero);
    // v1.1：精灵 / 萝莉字段
    if (TSQ.Spirit) TSQ.Spirit.initHero(hero);
    // v1.2：结义 / 帮会武功字段
    if (TSQ.Sworn) TSQ.Sworn.initHero(hero);
    if (TSQ.Guild) TSQ.Guild.initHero(hero);
    // v1.3：转生与活力历练字段
    if (TSQ.Rebirth && typeof TSQ.Rebirth.initHero === "function") TSQ.Rebirth.initHero(hero);
    if (TSQ.Vitality && typeof TSQ.Vitality.initHero === "function") TSQ.Vitality.initHero(hero);
    // v1.4：地灵经脉与宠物组合图鉴字段
    if (TSQ.Meridian && typeof TSQ.Meridian.initHero === "function") TSQ.Meridian.initHero(hero);
    if (TSQ.PetCodex && typeof TSQ.PetCodex.initHero === "function") TSQ.PetCodex.initHero(hero);
    return hero;
  }


  function totalPrimary(hero) {
    const pri = { ...hero.primary };
    const b = E().heroBonus(hero);
    for (const k of ["str", "con", "agi", "int", "fai"]) if (b.flat[k]) pri[k] += b.flat[k];
    if (TSQ.Badge) {
      const bb = TSQ.Badge.bonus(hero);
      for (const k of ["str", "con", "agi", "int", "fai"]) if (bb.flat[k]) pri[k] += bb.flat[k];
    }
    if (TSQ.Title) {
      const tb = TSQ.Title.bonus(hero);
      for (const k of ["str", "con", "agi", "int", "fai"]) if (tb.flat[k]) pri[k] += tb.flat[k];
    }
    if (TSQ.Fabao) {
      const fb = TSQ.Fabao.bonus(hero);
      for (const k of ["str", "con", "agi", "int", "fai"]) if (fb.flat[k]) pri[k] += fb.flat[k];
    }
    // v1.0: 骑宠属性加成（一级属性 × 5% 进人物属性）
    if (TSQ.Mount) {
      const mb = TSQ.Mount.bonus(hero);
      for (const k of ["str", "con", "agi", "int", "fai"]) if (mb.flat[k]) pri[k] += mb.flat[k];
    }
    // v1.1: 精灵 / 萝莉一级属性加成进人物属性
    if (TSQ.Spirit) {
      const sb = TSQ.Spirit.heroBonus(hero);
      for (const k of ["str", "con", "agi", "int", "fai"]) if (sb.flat && sb.flat[k]) pri[k] += sb.flat[k];
    }
    // v1.2: 结义与帮会武功一级属性加成进人物属性
    if (TSQ.Sworn) {
      const swb = TSQ.Sworn.bonus(hero);
      for (const k of ["str", "con", "agi", "int", "fai"]) if (swb.flat && swb.flat[k]) pri[k] += swb.flat[k];
    }
    if (TSQ.Guild) {
      const gb = TSQ.Guild.bonus(hero);
      for (const k of ["str", "con", "agi", "int", "fai"]) if (gb.flat && gb.flat[k]) pri[k] += gb.flat[k];
    }
    // v1.3: 转生与联盟一级属性加成进人物属性
    if (TSQ.Rebirth) {
      const rb = TSQ.Rebirth.bonus(hero);
      for (const k of ["str", "con", "agi", "int", "fai"]) if (rb.flat && rb.flat[k]) pri[k] += rb.flat[k];
    }
    // v1.4: 经脉一级属性加成进人物属性
    if (TSQ.Meridian && typeof TSQ.Meridian.meridianBonus === "function") {
      const mb = TSQ.Meridian.meridianBonus(hero);
      if (mb && mb.primary) {
        for (const k of ["str", "con", "agi", "int", "fai"]) {
          if (mb.primary[k]) pri[k] += mb.primary[k];
        }
      }
    }
    return pri;
  }


  function combatStats(hero) {
    const pri = totalPrimary(hero);
    const sec = convertPrimary(pri, hero.class_id);
    const b = E().heroBonus(hero);
    for (const [k, v] of Object.entries(b.flat)) {
      if (["str", "con", "agi", "int", "fai"].includes(k)) continue;
      sec[k] = (sec[k] || 0) + v;
    }
    // v0.8: 徽章属性加成进人物属性汇总与战斗结算
    let badgePct = {};
    if (TSQ.Badge) {
      const bb = TSQ.Badge.bonus(hero);
      for (const [k, v] of Object.entries(bb.flat)) {
        if (["str", "con", "agi", "int", "fai"].includes(k)) continue;
        sec[k] = (sec[k] || 0) + v;
      }
      badgePct = bb.pct || {};
    }
    // v0.9: 称号属性加成
    let titlePct = {};
    if (TSQ.Title) {
      const tb = TSQ.Title.bonus(hero);
      for (const [k, v] of Object.entries(tb.flat)) {
        if (["str", "con", "agi", "int", "fai"].includes(k)) continue;
        sec[k] = (sec[k] || 0) + v;
      }
      titlePct = tb.pct || {};
    }
    // v0.9: 法宝属性加成
    let fabaoPct = {};
    if (TSQ.Fabao) {
      const fb = TSQ.Fabao.bonus(hero);
      for (const [k, v] of Object.entries(fb.flat)) {
        if (["str", "con", "agi", "int", "fai"].includes(k)) continue;
        sec[k] = (sec[k] || 0) + v;
      }
      fabaoPct = fb.pct || {};
    }
    // v1.0: 骑宠二级属性与百分比加成（来自装备兽魂等）
    let mountPct = {};
    if (TSQ.Mount) {
      const mb = TSQ.Mount.bonus(hero);
      for (const [k, v] of Object.entries(mb.flat)) {
        if (["str", "con", "agi", "int", "fai"].includes(k)) continue;
        sec[k] = (sec[k] || 0) + v;
      }
      mountPct = mb.pct || {};
    }
    // v1.1: 精灵 / 萝莉二级属性与百分比加成进人物 combatStats
    let spiritPct = {};
    if (TSQ.Spirit) {
      const sb = TSQ.Spirit.heroBonus(hero);
      for (const [k, v] of Object.entries(sb.flat || {})) {
        if (["str", "con", "agi", "int", "fai"].includes(k)) continue;
        sec[k] = (sec[k] || 0) + v;
      }
      spiritPct = sb.pct || {};
    }
    // v1.2: 结义加成（2小时金兰同心buff）
    let swornPct = {};
    if (TSQ.Sworn) {
      const swb = TSQ.Sworn.bonus(hero);
      for (const [k, v] of Object.entries(swb.flat || {})) {
        if (["str", "con", "agi", "int", "fai"].includes(k)) continue;
        sec[k] = (sec[k] || 0) + v;
      }
      swornPct = swb.pct || {};
    }
    // v1.2: 帮会武功加成（6项武功加成）
    let guildPct = {};
    if (TSQ.Guild) {
      const gb = TSQ.Guild.bonus(hero);
      for (const [k, v] of Object.entries(gb.flat || {})) {
        if (["str", "con", "agi", "int", "fai"].includes(k)) continue;
        sec[k] = (sec[k] || 0) + v;
      }
      guildPct = gb.pct || {};
      if (gb.rage) sec.rage = (sec.rage || 100) + gb.rage;
    }
    // v1.3: 转生与三转联盟加成（被动属性进 combatStats）
    let rebirthPct = {};
    if (TSQ.Rebirth) {
      const rb = TSQ.Rebirth.bonus(hero);
      for (const [k, v] of Object.entries(rb.flat || {})) {
        if (["str", "con", "agi", "int", "fai"].includes(k)) continue;
        sec[k] = (sec[k] || 0) + v;
      }
      rebirthPct = rb.pct || {};
      if (rb.flat.rage_turn) sec.rage_turn = (sec.rage_turn || 0) + rb.flat.rage_turn;
    }
    // v1.4: 元神·地灵减伤抗性（玄/毒/火/冰 进 combatStats）
    if (TSQ.Meridian && typeof TSQ.Meridian.dilingBonus === "function") {
      const db = TSQ.Meridian.dilingBonus(hero);
      sec.res_xuan = (sec.res_xuan || 0) + (db.res_xuan || 0);
      sec.res_du = (sec.res_du || 0) + (db.res_du || 0);
      sec.res_huo = (sec.res_huo || 0) + (db.res_huo || 0);
      sec.res_bing = (sec.res_bing || 0) + (db.res_bing || 0);
    }
    // v0.8: 元神附魔倍率接入（装备基础附魔已由 heroBonus 计入，这里补充 (倍率-1) 增量）
    if (TSQ.Yuanshen) {
      const ym = TSQ.Yuanshen.mult(hero);
      if (ym > 1 && hero.equipment) {
        for (const it of Object.values(hero.equipment)) {
          if (it && it.enchant && it.enchant.lv && it.dur && it.dur[0] > 0 && it.identified) {
            const extra = (ym - 1) * E().enchantValue(it);
            const defKey = it.enchant.type === "p" ? "pdef" : "mdef";
            sec[defKey] = (sec[defKey] || 0) + extra;
          }
        }
      }
    }
    const p = b.pct;
    const hpPct = (p.hp_pct || 0) + (badgePct.hp_pct || 0) + (titlePct.hp_pct || 0) + (fabaoPct.hp_pct || 0) + (mountPct.hp_pct || 0) + (spiritPct.hp_pct || 0) + (swornPct.hp_pct || 0) + (guildPct.hp_pct || 0) + (rebirthPct.hp_pct || 0);
    const patkPct = (p.patk_pct || 0) + (badgePct.patk_pct || 0) + (titlePct.patk_pct || 0) + (fabaoPct.patk_pct || 0) + (mountPct.patk_pct || 0) + (spiritPct.patk_pct || 0) + (swornPct.patk_pct || 0) + (guildPct.patk_pct || 0) + (rebirthPct.patk_pct || 0);
    const matkPct = (p.matk_pct || 0) + (badgePct.matk_pct || 0) + (titlePct.matk_pct || 0) + (fabaoPct.matk_pct || 0) + (mountPct.matk_pct || 0) + (spiritPct.matk_pct || 0) + (swornPct.matk_pct || 0) + (guildPct.matk_pct || 0) + (rebirthPct.matk_pct || 0);
    const spdPct = (p.spd_pct || 0) + (badgePct.spd_pct || 0) + (titlePct.spd_pct || 0) + (fabaoPct.spd_pct || 0) + (mountPct.spd_pct || 0) + (spiritPct.spd_pct || 0) + (swornPct.spd_pct || 0) + (guildPct.spd_pct || 0) + (rebirthPct.spd_pct || 0);
    const pdefPct = (rebirthPct.pdef_pct || 0);
    const mdefPct = (rebirthPct.mdef_pct || 0);
    if (hpPct) sec.hp = Math.round(sec.hp * (1 + hpPct));
    if (patkPct) sec.patk = Math.round(sec.patk * (1 + patkPct));
    if (matkPct) sec.matk = Math.round(sec.matk * (1 + matkPct));
    if (spdPct) sec.spd = Math.round(sec.spd * (1 + spdPct));
    if (pdefPct) sec.pdef = Math.round(sec.pdef * (1 + pdefPct));
    if (mdefPct) sec.mdef = Math.round(sec.mdef * (1 + mdefPct));
    if (rebirthPct.crit_pct) {
      sec.pcrit = Math.round((sec.pcrit || 0) * (1 + rebirthPct.crit_pct));
      sec.mcrit = Math.round((sec.mcrit || 0) * (1 + rebirthPct.crit_pct));
    }
    return sec;
  }


  function syncVitals(hero) {
    const sec = combatStats(hero);
    if (!hero.hp || hero.hp > sec.hp) hero.hp = sec.hp;
    if (!hero.mp || hero.mp > sec.mp) hero.mp = sec.mp;
    hero.maxHp = sec.hp; hero.maxMp = sec.mp; hero.maxRage = sec.rage;
    if (hero.rage == null) hero.rage = 0;
    if (hero.rage > sec.rage) hero.rage = sec.rage;
    return sec;
  }


  function countConsumable(hero, id) { return hero.consumables[id] || 0; }
  function useConsumable(hero, id, n) {
    n = n || 1;
    if ((hero.consumables[id] || 0) < n) return false;
    hero.consumables[id] -= n; return true;
  }
  function equipFromBag(hero, i) { const r = E().equipFromBag(hero, i); syncVitals(hero); return r; }
  function unequip(hero, slot) { const r = E().unequip(hero, slot); syncVitals(hero); return r; }


  function applyPendingPoints(hero) {
    let used = 0;
    for (const k of Object.keys(hero.pending)) {
      const v = hero.pending[k];
      if (v > 0) { hero.primary[k] += v; used += v; hero.pending[k] = 0; }
    }
    hero.unspent -= used;
    syncVitals(hero);
    return used;
  }


  function fightingPet(hero) {
    return hero.pets.find((p) => p.fighting) || null;
  }


  // ---- Battle ----
  function startBattle(hero, areaId) {
    const area = D().areas.find((a) => a.id === areaId) || D().areas[0];
    const mid = pick(area.monsters);
    const base = D().monsters.find((m) => m.id === mid);
    const mon = {
      ...base,
      hp: base.hp,
      maxHp: base.hp,
      uid: uid()
    };
    return { area, mon, log: [`遭遇了 ${mon.name}（Lv${mon.level}）！`], over: false, won: false };
  }


  // 出战宠物的一次协同攻击（返回 true 表示怪物已倒下）
  function petAssist(hero, battle, phase) {
    const pet = fightingPet(hero);
    if (!pet) return false;
    const st = TSQ.Pet.stats(pet);
    if (st.down) {
      if (phase !== "first") battle.log.push(`${pet.name} 体力不支，无法参战（回营地休整可恢复）`);
      return false;
    }
    const r = TSQ.Pet.attack(pet, battle.mon, st);
    battle.mon.hp = Math.max(0, battle.mon.hp - r.dmg);
    const talentTxt = r.talents.length ? `（天赋：${r.talents.join("、")}）` : "";
    battle.log.push(`${pet.name} 使用【${r.label}】造成 ${r.dmg} 点${r.kind === "magic" ? "法术" : "物理"}伤害${talentTxt}`);
    if (r.lifesteal > 0) {
      hero.hp = Math.min(hero.maxHp, hero.hp + r.lifesteal);
      battle.log.push(`${pet.name} 嗜血吸回 ${r.lifesteal} 生命`);
    }
    return battle.mon.hp <= 0;
  }


  function playerAttack(hero, battle, skillId) {
    if (battle.over) return;
    const sec = combatStats(hero);
    const mon = battle.mon;
    let dmg = 0;
    let label = "普通攻击";
    // v0.5：持续回合 buff/debuff 每回合开始计数，到期移除
    const expired = TSQ.Skill.tickBuffs(battle);
    expired.forEach((n) => battle.log.push(`【${n}】效果结束`));
    // 先手：速度定先手（见 js/pet.js 注释），或敏捷资质≥90% / 天赋带 first
    const pet0 = fightingPet(hero);
    if (pet0) {
      const st0 = TSQ.Pet.stats(pet0);
      if (!st0.down && TSQ.Pet.initiative(pet0, mon.spd, st0)) {
        if (petAssist(hero, battle, "first")) { endWin(hero, battle); return; }
      }
      // 冥想：每回合为人物恢复法力
      if (st0.mpRegen > 0) {
        const before = hero.mp;
        hero.mp = Math.min(hero.maxMp, hero.mp + st0.mpRegen);
        const gained = hero.mp - before;
        if (gained > 0) battle.log.push(`${pet0.name}【冥想】为你恢复 ${gained} 点法力`);
      }
    }
    // v0.5：技能统一走 TSQ.Skill（耗蓝/怒气、跨职业惩罚、持续回合、熟练度）
    if (skillId && TSQ.Skill.get(skillId)) {
      const r = TSQ.Skill.cast(hero, battle, skillId);
      label = r.skill ? r.skill.name : label;
      if (!r.ok) { battle.log.push(r.msg); return; }
      const p = r.penalty;
      const pen = p.kind === "same" ? "" : `（跨职业惩罚：耗蓝×${p.mp}）`;
      const rageTxt = r.rageCost > 0 ? `，消耗 ${r.rageCost} 怒气` : (r.rageGain > 0 ? `，回复 ${r.rageGain} 怒气` : "");
      battle.log.push(`你施放【${label}】，消耗 ${r.mp} 法力${rageTxt}${pen}${r.pierced ? "，被识破（适用等级不足）" : ""}`);
      // 熟练度：怪物等级与适用等级差 ≤5 才涨
      const up = TSQ.Skill.addProf(hero, skillId, mon.level);
      if (up) battle.log.push(`【${label}】熟练度提升至 ${up}/8 层`);
      if (r.type === "heal") {
        const heal = r.heal;
        hero.hp = Math.min(hero.maxHp, hero.hp + heal);
        battle.log.push(`恢复 ${heal} 生命${r.cleanse ? "，并驱散负面" : ""}${r.splash ? `，溅射 ${Math.round(heal * r.splash)}` : ""}`);
        monsterTurn(hero, battle);
        return;
      }
      if (r.type === "shield") {
        battle.log.push(`获得 ${r.shield} 点护盾${r.note ? "（" + r.note + "）" : ""}，持续 ${r.turns} 回合`);
        monsterTurn(hero, battle);
        return;
      }
      if (r.type === "buff") {
        battle.log.push(`获得增益【${r.name}】，持续 ${r.turns} 回合`);
        monsterTurn(hero, battle);
        return;
      }
      if (r.type === "debuff") {
        if (r.dmg > 0) { mon.hp = Math.max(0, mon.hp - r.dmg); battle.log.push(`对 ${mon.name} 造成 ${r.dmg} 伤害`); }
        battle.log.push(r.applied ? `${mon.name} 陷入【${r.name}】，持续 ${r.turns} 回合` : `【${r.name}】未命中`);
        if (mon.hp <= 0) { endWin(hero, battle); return; }
        if (petAssist(hero, battle, "after")) { endWin(hero, battle); return; }
        monsterTurn(hero, battle);
        return;
      }
      if (r.selfDamage) {
        hero.hp = Math.max(1, hero.hp - r.selfDamage);
        battle.log.push(`反噬 ${r.selfDamage} 生命`);
      }
      if (r.selfBuff) battle.log.push(`自身获得【${TSQ.Skill.STATUS_NAMES[r.selfBuff.status] || r.selfBuff.status}】，持续 ${r.turns} 回合`);
      if (r.appliedStatuses && r.appliedStatuses.length) {
        battle.log.push(`${mon.name} 陷入【${r.appliedStatuses.join("、")}】，持续 ${r.turns} 回合`);
      }
      dmg = r.dmg || 0;
      if (r.note) battle.log.push(r.note);
      if (dmg <= 0) { monsterTurn(hero, battle); return; }
    } else {
      dmg = Math.max(1, Math.round((sec.patk - mon.pdef) * (0.9 + Math.random() * 0.2)));
    }
    mon.hp = Math.max(0, mon.hp - dmg);
    battle.log.push(`你使用【${label}】造成 ${dmg} 伤害`);
    const procs = TSQ.Equip.heroBonus(hero).procs;
    procs.forEach((pr) => {
      if (chance(pr.chance)) {
        const heal = Math.round(dmg * pr.healPct);
        hero.hp = Math.min(hero.maxHp, hero.hp + heal);
        battle.log.push(`套装效果触发：回复 ${heal} 生命`);
      }
    });
    if (mon.hp <= 0) {
      endWin(hero, battle);
      return;
    }
    // 出战宠物协同攻击（数值由资质 + 天赋决定，见 js/pet.js 顶部公式）
    if (petAssist(hero, battle, "after")) { endWin(hero, battle); return; }
    monsterTurn(hero, battle);
  }


  function monsterTurn(hero, battle) {
    const mon = battle.mon;
    const sec = combatStats(hero);
    const pet = fightingPet(hero);
    // 出战宠物会分担伤害：40% 概率被打中，天赐矫健(dr_pct)再减伤
    if (pet) {
      const st = TSQ.Pet.stats(pet);
      if (!st.down && chance(0.4)) {
        const raw = Math.max(1, Math.round((mon.patk - st.pdef * 0.3) * (0.9 + Math.random() * 0.2)));
        const real = TSQ.Pet.takeDamage(pet, raw, st);
        // v0.6：宠物被击中时武装耐久磨损（⚙ 默认每次 -1，见 PetAdvanceData.CONST.arm.wearPerHit）
        if (TSQ.PetAdvance) TSQ.PetAdvance.wearArms(pet);
        battle.log.push(`${mon.name} 攻击 ${pet.name}，造成 ${real} 伤害${st.dr > 0 ? "（天赐矫健减伤）" : ""}`);
        if (pet.hp <= 0) battle.log.push(`${pet.name} 倒下了，回营地休整可恢复`);
        return;
      }
    }
    const dmg = Math.max(1, Math.round((mon.patk - sec.pdef * 0.3) * (0.9 + Math.random() * 0.2)));
    hero.hp = Math.max(0, hero.hp - dmg);
    battle.log.push(`${mon.name} 攻击你，造成 ${dmg} 伤害`);
    if (hero.hp <= 0) {
      battle.over = true;
      battle.won = false;
      hero.hp = 1;
      battle.log.push("你战败了……勉强逃回营地。");
    }
  }


  function endWin(hero, battle) {
    battle.over = true;
    battle.won = true;
    const mon = battle.mon;
    const silver = rand(mon.silver[0], mon.silver[1]);
    hero.silver += silver;
    hero.exp += mon.exp;
    battle.log.push(`胜利！获得 ${mon.exp} 经验、${silver} 银两`);
    // v0.5：技能经验（心法升级 / 学技能用）。⚙ 默认：怪物经验 × 2；一转后双倍（×4）
    const skillExpMult = ((hero.rebirth || 0) >= 1) ? 4 : 2;
    const skillExp = mon.exp * skillExpMult;
    hero.skillExp = (hero.skillExp || 0) + skillExp;
    battle.log.push(`获得 ${skillExp} 技能经验${skillExpMult === 4 ? "（一转双倍）" : ""}`);
    const maxLv = (hero.rebirth || 0) >= 3 ? 179 : ((hero.rebirth || 0) >= 2 ? 162 : ((hero.rebirth || 0) >= 1 ? 139 : 100));
    while (hero.exp >= hero.exp_need && hero.level < maxLv) {
      hero.exp -= hero.exp_need;
      hero.level += 1;
      hero.unspent += 5;
      hero.exp_need = Math.round(40 + hero.level * 35 + hero.level * hero.level * 2);
      battle.log.push(`升级！当前 Lv${hero.level}，潜力+5`);
    }
    if (chance(0.25)) {
      TSQ.Equip.give(hero, "upstone_shen", 1);
      battle.log.push("拾得 升级宝石（神品）×1");
    }
    const broke = TSQ.Equip.wearDown(hero);
    if (broke.length) battle.log.push("装备耐久耗尽，属性失效：" + broke.join("、"));
    syncVitals(hero);
  }


  function tryCatch(hero, battle) {
    if (battle.over) return;
    if (!useConsumable(hero, "catch_scroll", 1)) {
      battle.log.push("没有唤妖符");
      return;
    }
    const mon = battle.mon;
    if (!mon.catchable) {
      battle.log.push("此怪无法捕捉");
      monsterTurn(hero, battle);
      return;
    }
    const rate = 0.35 + (1 - mon.hp / mon.maxHp) * 0.4;
    if (chance(rate)) {
      const pet = makePet(mon.catchable, { level: mon.level });
      hero.pets.push(pet);
      battle.log.push(`捕捉成功！获得宠物【${pet.name}】`);
      battle.over = true;
      battle.won = true;
    } else {
      battle.log.push("捕捉失败……");
      monsterTurn(hero, battle);
    }
  }


  function openGemBag(hero) {
    if (!useConsumable(hero, "gem_bag", 1)) return { ok: false, msg: "没有宝石袋" };
    const id = pick(Object.keys(TSQ.EQ.gems));
    E().gemAdd(hero, id, 1, 1);
    return { ok: true, msg: `获得 一级${TSQ.EQ.gems[id].name}` };
  }


  // ---- 存档（localStorage） ----
  const SAVE_KEY = "tsq_save_v2";
  function save(hero) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(hero)); } catch (e) {} }
  // v0.3 → v0.4（宠物字段）；v0.4 → v0.5（心法 / 技能字段，不升 save_version）
  // 说明：v0.5 只补默认字段，不动 save_version，旧档装备/打造/宠物数据保持原样
  function migrate(h) {
    if (!h.pets) h.pets = [];
    h.pets.forEach((p) => {
      const sp = TSQ.Pet.speciesOf(p);
      if (!Array.isArray(p.talents)) {
        p.talents = (sp.tier === "神兽" || sp.tier === "珍兽") ? [...(sp.talent || [])] : (sp.talent || []).slice(0, 1);
        p.skills = (p.skills || []).filter((s) => !D().petTalents[s]);
      }
      if (!p.tier) p.tier = sp.tier || sp.type;
      if (!p.source) p.source = sp.source || "野外捕捉";
      if (!p.atk_type) p.atk_type = sp.atk_type || "phys";
      if (p.art === undefined) p.art = sp.art || null;
      if (p.artAlt === undefined) p.artAlt = sp.artAlt || null;
      if (!p.neidan) p.neidan = [null, null, null, null, null, null, null, null];
      // 更早期的存档可能缺这些字段，补齐避免面板渲染报错（不改动已有值）
      if (!Array.isArray(p.life)) p.life = [800, 900];
      if (typeof p.loyalty !== "number") p.loyalty = 100;
      if (typeof p.wuxing !== "number") p.wuxing = 5;
      if (typeof p.unspent !== "number") p.unspent = 0;
      if (!p.level) p.level = 1;
      if (!p.primary) p.primary = { str: 8, con: 8, agi: 8, int: 5, fai: 5 };
      if (!p.growth || !D().growthRates[p.growth]) p.growth = "common";
    });
    // v0.5：心法 / 技能 / 修为 / 技能书 / 奖励标记（旧技能 id 按映射转换）
    if (TSQ.Skill) TSQ.Skill.migrate(h);
    // v0.6：宠物养成二期字段（进化等级 / 武装 / 炼化技能 / 融合次数 / 飞升标记）
    // 只补默认字段，save_version 不变，旧档的装备 / 打造 / 技能心法 / 宠物数据保持原样
    if (TSQ.PetAdvance) TSQ.PetAdvance.migrateHero(h);
    // v0.7：天资 / 夫妻 / 生活字段（hero.flags.married / coupleSkills / lifeSkills）
    // 同样只补默认字段，不动 save_version；天资已学引用走 hero.skills，不会丢
    if (TSQ.LifeSkill) TSQ.LifeSkill.migrate(h);
    // v0.8：徽章 / 元神字段迁移（save_version 仍保持 2，只做 migrate 补齐，旧档完全兼容）
    if (TSQ.Badge) TSQ.Badge.migrate(h);
    if (TSQ.Yuanshen) TSQ.Yuanshen.migrate(h);
    // v0.9：称号 / 法宝字段迁移（save_version 仍保持 2，只补字段，禁止抬版本）
    if (TSQ.Title) TSQ.Title.migrate(h);
    if (TSQ.Fabao) TSQ.Fabao.migrate(h);
    // v1.0：骑宠 / 兽魂字段迁移（save_version 仍保持 2，只补字段，旧档不丢）
    if (TSQ.Mount) TSQ.Mount.migrate(h);
    // v1.1：精灵 / 萝莉字段迁移（save_version 仍保持 2，只补 hero.spirit，旧档不丢）
    if (TSQ.Spirit) TSQ.Spirit.migrate(h);
    // v1.2：结义 / 帮会武功字段迁移（save_version 仍保持 2，只补字段，旧档不丢）
    if (TSQ.Sworn) TSQ.Sworn.migrate(h);
    if (TSQ.Guild) TSQ.Guild.migrate(h);
    // v1.3：转生 / 活力与历练字段迁移（save_version 仍保持 2，只补字段，旧档不丢）
    if (typeof h.rebirth !== "number") h.rebirth = 0;
    if (TSQ.Rebirth) TSQ.Rebirth.migrate(h);
    if (TSQ.Vitality) TSQ.Vitality.migrate(h);
    // v1.4：地灵经脉与宠物组合图鉴迁移（save_version 仍保持 2，只补字段，旧档不丢）
    if (TSQ.Meridian && typeof TSQ.Meridian.migrate === "function") TSQ.Meridian.migrate(h);
    if (TSQ.PetCodex && typeof TSQ.PetCodex.migrate === "function") TSQ.PetCodex.migrate(h);
    return h;
  }
  function load() {
    try { const s = localStorage.getItem(SAVE_KEY); if (!s) return null; const h = JSON.parse(s); return h.save_version === 2 ? migrate(h) : null; }
    catch (e) { return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }


  function healPetsAtCamp(hero) { (hero.pets || []).forEach((p) => TSQ.Pet.heal(p)); }


  TSQ.Game = {
    convertPrimary, makePet, createHero, totalPrimary, combatStats, syncVitals,
    countConsumable, useConsumable, equipFromBag, unequip, applyPendingPoints,
    fightingPet, startBattle, playerAttack, tryCatch, openGemBag, rand, pick, chance, uid,
    healPetsAtCamp,
    save, load, clearSave, migrate
  };
})();
