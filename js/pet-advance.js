/* 宠物养成二期 v0.6 —— 武装 / 进化 / 炼化 / 融合 逻辑
   ─────────────────────────────────────────────────────────────────────
   · 挂在 window.TSQ.PetAdvance，数据表见 js/pet-advance-data.js
   · 不碰装备 / 打造 / 人物技能心法；只在 js/pet.js › stats() 里加一个只读加成入口
   · 数值全部取自 TSQ.PetAdvanceData.CONST（⚙ 默认集中管理）
   · 存档：key 与 save_version 不变；新字段走 migrateHero / migrate 补齐，旧宠不丢
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  const AD = () => TSQ.PetAdvanceData;
  const D = () => TSQ.DATA;
  const C = () => AD().CONST;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const chance = (p) => Math.random() < p;
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  /* ══════════ 日志 ══════════ */
  const logs = [];
  function log(msg) {
    logs.push(msg);
    if (logs.length > 60) logs.shift();
    if (typeof TSQ.PetAdvance.onLog === "function") { try { TSQ.PetAdvance.onLog(msg); } catch (e) {} }
    return msg;
  }

  /* ══════════ 道具（hero.petItems） ══════════
     刻意不写进 hero.mats：装备/打造的材料表是 TSQ.EquipData.materials，
     往 mats 里塞未知 id 会让背包材料栏渲染报错。 */
  function itemCount(hero, id) { return (hero.petItems && hero.petItems[id]) || 0; }
  function takeItem(hero, id, n) {
    n = n || 1;
    if (itemCount(hero, id) < n) return false;
    hero.petItems[id] -= n;
    return true;
  }
  function giveItem(hero, id, n) {
    hero.petItems = hero.petItems || {};
    hero.petItems[id] = (hero.petItems[id] || 0) + (n || 1);
  }
  function itemName(id) {
    const it = AD().ITEMS[id];
    if (it) return it.name;
    const c = AD().ASSIST_COUPONS[id];
    if (c) return c.name;
    const m = AD().ARM_MATS.find((x) => x.id === id);
    return m ? m.name : id;
  }

  /* ══════════ 迁移 ══════════ */
  function migrate(pet) {
    if (!pet) return pet;
    if (typeof pet.evolveLv !== "number") pet.evolveLv = 0;          // §6.7 进化等级
    if (!pet.arms || typeof pet.arms !== "object") pet.arms = {};     // §6.13 武装 { armId:{quality,dur,durMax} }
    if (!pet.refineSkills || typeof pet.refineSkills !== "object") pet.refineSkills = {}; // §6.6 已学炼化技能 {nodeId:lv}
    if (typeof pet.fuseCount !== "number") pet.fuseCount = 0;         // §6.11 已融合次数
    if (!pet.flags || typeof pet.flags !== "object") pet.flags = {};
    if (typeof pet.flags.feisheng !== "boolean") pet.flags.feisheng = false; // §6.11 飞升标记（演示宠预置）
    if (!Array.isArray(pet.evolveSkills)) pet.evolveSkills = [];     // 已解锁的进化技能 id
    // 武装耐久上限缺失时按当前品质补
    Object.keys(pet.arms).forEach((k) => {
      const a = pet.arms[k];
      if (!a) { delete pet.arms[k]; return; }
      if (!AD().ARMS.some((x) => x.id === k)) { delete pet.arms[k]; return; }
      if (!a.quality || !(C().arm.qualityCoef[a.quality])) a.quality = "white";
      const dm = armDurMax(a.quality);
      if (typeof a.durMax !== "number") a.durMax = dm;
      if (typeof a.dur !== "number") a.dur = a.durMax;
      a.dur = clamp(a.dur, 0, a.durMax);
    });
    return pet;
  }

  function migrateHero(hero) {
    if (!hero) return hero;
    if (!Array.isArray(hero.pets)) hero.pets = [];
    hero.pets.forEach(migrate);
    if (!hero.petItems || typeof hero.petItems !== "object") hero.petItems = {};
    if (!Array.isArray(hero.refineManuals)) hero.refineManuals = []; // 已抽出的万兽密录
    if (typeof hero.gold !== "number") hero.gold = 0;                 // 金子（融合高级 / 进化加成功率）
    // 旧档缺的道具字段补 0（不覆盖已有值）
    Object.keys(AD().ITEMS).forEach((id) => { if (hero.petItems[id] == null) hero.petItems[id] = 0; });
    Object.keys(AD().ASSIST_COUPONS).forEach((id) => { if (hero.petItems[id] == null) hero.petItems[id] = 0; });
    AD().ARM_MATS.forEach((m) => { if (hero.petItems[m.id] == null) hero.petItems[m.id] = 0; });
    // 密录里 nodeId 失效（数据表变更）时丢弃，避免渲染报错
    hero.refineManuals = hero.refineManuals.filter((m) => m && AD().REFINE_NODES[m.nodeId]);
    return hero;
  }

  /* ══════════ 武装（§6.13） ══════════ */
  function armDef(id) { return AD().ARMS.find((a) => a.id === id) || null; }
  function qualityMeta(q) { return AD().ARM_QUALITY.find((x) => x.id === q) || AD().ARM_QUALITY[0]; }
  function armDurMax(q) { return Math.round(C().arm.durBase * (C().arm.qualityCoef[q] || 1)); }

  // 一件的实际属性（白品质基准 × 品质系数）
  function armStats(armId, quality) {
    const def = armDef(armId);
    if (!def) return [];
    const coef = C().arm.qualityCoef[quality] || 1;
    return Object.entries(def.stats).map(([k, v]) => ({
      key: k, name: (D().secondaryNames[k] || k), value: Math.round(v * coef)
    }));
  }

  // 9 格状态
  function armSlots(pet) {
    return AD().ARMS.map((def) => {
      const a = (pet.arms || {})[def.id];
      const active = !!a;
      return {
        def,
        active,
        quality: a ? a.quality : null,
        dur: a ? a.dur : 0,
        durMax: a ? a.durMax : 0,
        broken: a ? a.dur <= 0 : false,
        stats: a ? armStats(def.id, a.quality) : armStats(def.id, "white")
      };
    });
  }

  function activateArm(hero, pet, armId, quality) {
    const def = armDef(armId);
    if (!def) return { ok: false, msg: "未知武装" };
    if (!qualityMeta(quality)) return { ok: false, msg: "未知品质" };
    if (pet.arms && pet.arms[armId]) return { ok: false, msg: `${def.name} 已激活` };
    const matId = "arm_mat_" + quality;
    const need = C().arm.activateCost;
    if (itemCount(hero, matId) < need) return { ok: false, msg: `${itemName(matId)}不足（需 ${need}）` };
    takeItem(hero, matId, need);
    const durMax = armDurMax(quality);
    pet.arms = pet.arms || {};
    pet.arms[armId] = { quality, dur: durMax, durMax };
    const txt = log(`${pet.name} 装配【${def.name}·${qualityMeta(quality).name}】耐久 ${durMax}/${durMax}`);
    return { ok: true, msg: txt };
  }

  // 卸下：武装回到仓库，⚙ 默认不返还材料
  function deactivateArm(hero, pet, armId) {
    const def = armDef(armId);
    if (!def) return { ok: false, msg: "未知武装" };
    if (!pet.arms || !pet.arms[armId]) return { ok: false, msg: `${def.name} 未激活` };
    delete pet.arms[armId];
    const txt = log(`${pet.name} 卸下【${def.name}】（材料不返还）`);
    return { ok: true, msg: txt };
  }

  function repairArm(hero, pet, armId) {
    const a = (pet.arms || {})[armId];
    const def = armDef(armId);
    if (!def || !a) return { ok: false, msg: `${def ? def.name : "武装"} 未激活` };
    if (a.dur >= a.durMax) return { ok: false, msg: `${def.name} 耐久已满` };
    const matId = "arm_mat_" + a.quality;
    const need = C().arm.repairCost;
    if (itemCount(hero, matId) < need) return { ok: false, msg: `${itemName(matId)}不足（需 ${need}）` };
    takeItem(hero, matId, need);
    a.dur = a.durMax;
    const txt = log(`${pet.name} 修理【${def.name}】，消耗 ${itemName(matId)}×${need}，耐久回到 ${a.durMax}`);
    return { ok: true, msg: txt };
  }

  // 合成武装材料：3 份低一档 → 1 份高一档（成功率见 CONST.arm.synthRate）
  function synthArmMaterial(hero, targetQuality) {
    const order = AD().ARM_QUALITY.map((q) => q.id);
    const idx = order.indexOf(targetQuality);
    if (idx <= 0) return { ok: false, msg: "白色材料无法合成" };
    const srcQuality = order[idx - 1];
    const srcId = "arm_mat_" + srcQuality, dstId = "arm_mat_" + targetQuality;
    const need = C().arm.synthNeed;
    if (itemCount(hero, srcId) < need) return { ok: false, msg: `${itemName(srcId)}不足（需 ${need}）` };
    const rate = C().arm.synthRate[targetQuality];
    if (rate == null) return { ok: false, msg: "该档次无法合成" };
    takeItem(hero, srcId, need);
    if (chance(rate)) {
      giveItem(hero, dstId, 1);
      const txt = log(`合成成功：${itemName(srcId)}×${need} → ${itemName(dstId)}×1（成功率 ${Math.round(rate * 100)}%）`);
      return { ok: true, msg: txt };
    }
    const txt = log(`合成失败：${itemName(srcId)}×${need} 已消耗（成功率 ${Math.round(rate * 100)}%）`);
    return { ok: false, msg: txt, consumed: true };
  }

  // 战斗中被击中时磨损（game.js › monsterTurn 调用；⚙ 默认每次 -1）
  function wearArms(pet, n) {
    if (!pet || !pet.arms) return;
    n = n == null ? C().arm.wearPerHit : n;
    Object.keys(pet.arms).forEach((k) => {
      const a = pet.arms[k];
      if (!a) return;
      const before = a.dur;
      a.dur = clamp(a.dur - n, 0, a.durMax);
      if (before > 0 && a.dur <= 0) log(`${pet.name} 的【${(armDef(k) || {}).name || k}】耐久耗尽，属性暂时失效`);
    });
  }

  /* ══════════ 进化（§6.7） ══════════ */
  function couponForType(type) {
    return Object.values(AD().ASSIST_COUPONS).find((c) => c.type === type) || null;
  }
  function otherCoupons(type) {
    return Object.values(AD().ASSIST_COUPONS).filter((c) => c.type !== type);
  }

  // 成功率 = 基础档 + 每辅宠 +5% / 同系 +8% + 金子，上限 95%
  function previewEvolve(hero, pet, opts) {
    opts = opts || {};
    const K = C().evolve;
    const sameWant = clamp(opts.same | 0, 0, K.maxAssist);
    const otherWant = clamp(opts.other | 0, 0, K.maxAssist);
    const step = clamp(opts.goldStep | 0, 0, K.goldMaxStep);
    const total = sameWant + otherWant;

    const sameCoupon = couponForType(pet.type);
    const availSame = sameCoupon ? itemCount(hero, sameCoupon.id) : 0;
    const others = otherCoupons(pet.type);
    const availOther = others.reduce((s, c) => s + itemCount(hero, c.id), 0);
    const useSame = Math.min(sameWant, availSame);
    const useOther = Math.min(otherWant, availOther);
    const gold = step * K.goldStep;

    let rate = K.base + useSame * K.sameType + useOther * K.perAssist + step * K.goldPerStep;
    rate = clamp(rate, 0, K.cap);

    // 资质奖励：所有辅宠中该项资质的最大值 × 1%
    const aptGain = {};
    const used = [];
    if (sameCoupon && useSame > 0) used.push({ c: sameCoupon, n: useSame });
    if (useOther > 0) {
      let left = useOther;
      others.forEach((c) => {
        const n = Math.min(left, itemCount(hero, c.id));
        if (n > 0) { used.push({ c, n }); left -= n; }
      });
    }
    ["str", "con", "agi", "int", "fai"].forEach((k) => {
      let best = 0;
      used.forEach((u) => { best = Math.max(best, u.c.apt[k] || 0); });
      aptGain[k] = Math.round(best * K.aptPct);
    });

    const spirit = itemCount(hero, "evolve_spirit");
    const lacks = [];
    if (spirit < K.spiritCost) lacks.push("进化之灵不足");
    if (gold > (hero.gold || 0)) lacks.push("金子不足");
    if (useSame + useOther <= 0) lacks.push("请至少放入 1 张辅助宠券");
    if ((pet.evolveLv || 0) >= K.maxLv) lacks.push("进化等级已满");

    const nextUnlock = [5, 10, 15].find((lv) => lv === (pet.evolveLv || 0) + 1);
    return {
      rate, gold, cost: { spirit: K.spiritCost, coupons: useSame + useOther },
      useSame, useOther, availSame, availOther,
      sameCouponName: sameCoupon ? sameCoupon.name : "（无同系券）",
      aptGain, ok: lacks.length === 0, lacks,
      nextUnlock: nextUnlock ? AD().EVOLVE_SKILLS[nextUnlock] : null,
      maxLv: K.maxLv
    };
  }

  function doEvolve(hero, pet, opts) {
    const pv = previewEvolve(hero, pet, opts);
    if (!pv.ok) return { ok: false, msg: pv.lacks.join("、"), preview: pv };
    const K = C().evolve;
    takeItem(hero, "evolve_spirit", K.spiritCost);
    hero.gold = (hero.gold || 0) - pv.gold;
    // 无论成败，辅助宠（券）都消失
    const sameCoupon = couponForType(pet.type);
    if (sameCoupon && pv.useSame > 0) takeItem(hero, sameCoupon.id, pv.useSame);
    let left = pv.useOther;
    otherCoupons(pet.type).forEach((c) => {
      const n = Math.min(left, itemCount(hero, c.id));
      if (n > 0) { takeItem(hero, c.id, n); left -= n; }
    });

    if (chance(pv.rate)) {
      pet.evolveLv = (pet.evolveLv || 0) + 1;
      pet.unspent = (pet.unspent || 0) + K.unspentBonus;
      const gained = [];
      ["str", "con", "agi", "int", "fai"].forEach((k) => {
        if (!pet.apt[k] || !pv.aptGain[k]) return;
        const a = pet.apt[k];
        const real = Math.min(pv.aptGain[k], Math.max(0, a.max - a.cur));
        if (real > 0) { a.cur += real; gained.push(`${D().primaryNames[k]}+${real}`); }
      });
      let sk = "";
      const es = AD().EVOLVE_SKILLS[pet.evolveLv];
      if (es && !(pet.evolveSkills || []).includes(es.id)) {
        pet.evolveSkills = pet.evolveSkills || [];
        pet.evolveSkills.push(es.id);
        pet.skills = pet.skills || [];
        if (pet.skills.length < C().refine.maxSkillSlots) pet.skills.push(es.id);
        sk = `，解锁进化技能【${es.name}】`;
      }
      const txt = log(`${pet.name} 进化成功！进化等级 ${pet.evolveLv}，潜力 +${K.unspentBonus}${gained.length ? "，" + gained.join("、") : ""}${sk}（成功率 ${Math.round(pv.rate * 100)}%）`);
      return { ok: true, win: true, msg: txt, preview: pv };
    }
    const txt = log(`${pet.name} 进化失败，辅助宠与进化之灵已消耗（成功率 ${Math.round(pv.rate * 100)}%）`);
    return { ok: true, win: false, msg: txt, preview: pv };
  }

  /* ══════════ 炼化（§6.6） ══════════ */
  function manualName(m) {
    const n = AD().REFINE_NODES[m.nodeId];
    return n ? `${n.name}密录·${m.lv}级` : "未知密录";
  }

  function extractRate(node, useKaishi) {
    const K = C().refine;
    let r = K.baseRate - K.perLvDrop * ((node.lv || 1) - 1);
    if (useKaishi) r += K.kaishiBonus;
    return clamp(r, K.minRate, 0.95);
  }

  // 抽密录：源宠需会该技能；消耗空白万兽密录（2 级以上还需万兽宝鉴）
  function extractRefine(hero, srcPet, nodeId, useKaishi) {
    const node = AD().REFINE_NODES[nodeId];
    if (!node) return { ok: false, msg: "未知炼化技能" };
    if (!srcPet) return { ok: false, msg: "请选择源宠" };
    if (!(srcPet.skills || []).includes(nodeId)) return { ok: false, msg: `${srcPet.name} 不会【${node.name}】` };
    const K = C().refine;
    if (itemCount(hero, "blank_manual") < 1) return { ok: false, msg: `${itemName("blank_manual")}不足` };
    if ((node.lv || 1) >= K.codexFromLv && itemCount(hero, "beast_codex") < 1) {
      return { ok: false, msg: `抽取 ${node.lv} 级密录需要${itemName("beast_codex")}` };
    }
    if (useKaishi && itemCount(hero, "kaishi_dan") < 1) return { ok: false, msg: `${itemName("kaishi_dan")}不足` };

    takeItem(hero, "blank_manual", 1);
    if ((node.lv || 1) >= K.codexFromLv) takeItem(hero, "beast_codex", 1);
    if (useKaishi) takeItem(hero, "kaishi_dan", 1);

    const rate = extractRate(node, useKaishi);
    if (chance(rate)) {
      hero.refineManuals.push({ nodeId, lv: node.lv, chain: node.chain });
      const txt = log(`炼化成功：从 ${srcPet.name} 抽出【${node.name}密录·${node.lv}级】（成功率 ${Math.round(rate * 100)}%）`);
      return { ok: true, win: true, msg: txt, rate };
    }
    const txt = log(`炼化失败：${srcPet.name} 的【${node.name}】未抽出，材料已消耗（成功率 ${Math.round(rate * 100)}%）`);
    return { ok: true, win: false, msg: txt, rate };
  }

  // 学技能：需前置技能等级；占技能格，满栏提示
  function applyRefine(hero, pet, manualIdx) {
    const m = hero.refineManuals[manualIdx];
    if (!m) return { ok: false, msg: "请选择密录" };
    const node = AD().REFINE_NODES[m.nodeId];
    if (!node) return { ok: false, msg: "密录已失效" };
    pet.skills = pet.skills || [];
    if (pet.skills.includes(node.id) || (pet.refineSkills || {})[node.id]) {
      return { ok: false, msg: `${pet.name} 已学会【${node.name}】` };
    }
    // 前置：链上一节点（已学会即可）
    if (node.pre && !(pet.skills.includes(node.pre) || (pet.refineSkills || {})[node.pre])) {
      const pre = AD().REFINE_NODES[node.pre];
      return { ok: false, msg: `需先学会【${pre ? pre.name : node.pre}】（${node.lv} 级密录的前置）` };
    }
    if (pet.skills.length >= C().refine.maxSkillSlots) {
      return { ok: false, msg: `${pet.name} 技能栏已满（${C().refine.maxSkillSlots} 格），无法学习` };
    }
    pet.skills.push(node.id);
    pet.refineSkills = pet.refineSkills || {};
    pet.refineSkills[node.id] = m.lv;
    hero.refineManuals.splice(manualIdx, 1);
    TSQ.Pet.stats(pet); // 重新结算一次（生命上限提高时会同步修正 pet.hp，见 js/pet.js）
    const txt = log(`${pet.name} 学会【${node.name}·${m.lv}级】${effectText(node, m.lv)}`);
    return { ok: true, win: true, msg: txt };
  }
  function effectText(node, lv) {
    const parts = Object.entries(node.effect || {}).map(([k, v]) =>
      `${D().secondaryNames[k] || k} +${Math.round((v || 0) * lv)}`);
    return parts.length ? `（${parts.join("、")}）` : "";
  }

  /* ══════════ 融合（§6.11） ══════════ */
  function previewFuse(hero, mainPet, subPet, mode) {
    const K = C().fuse;
    const cfg = mode === "advanced" ? K.advanced : K.normal;
    const isAdv = mode === "advanced";
    const lacks = [];
    if (!mainPet) lacks.push("请选择主宠");
    else {
      if (!mainPet.flags || !mainPet.flags.feisheng) lacks.push("主宠未飞升（本轮不实装飞升 UI，演示宠已预置标记）");
      if ((mainPet.fuseCount || 0) >= K.maxCount) lacks.push(`已达融合上限 ${K.maxCount} 次`);
    }
    if (!subPet) lacks.push("请选择副宠");
    else if (mainPet && subPet !== mainPet) {
      if (subPet.species !== mainPet.species) lacks.push("副宠必须与主宠同种");
      if ((subPet.skills || []).length > 0) lacks.push("副宠技能栏必须已清空");
    } else if (subPet === mainPet) lacks.push("副宠不能是主宠自己");
    if (isAdv ? (hero.gold || 0) < cfg.gold : (hero.silver || 0) < cfg.silver) {
      lacks.push(isAdv ? "金子不足" : "银两不足");
    }
    const gain = {};
    if (mainPet && subPet && subPet.species === mainPet.species) {
      ["str", "con", "agi", "int", "fai"].forEach((k) => {
        if (!mainPet.apt[k] || !subPet.apt[k]) return;
        const raw = Math.round(subPet.apt[k].cur * K.aptPct);
        gain[k] = Math.min(raw, Math.max(0, mainPet.apt[k].max - mainPet.apt[k].cur));
      });
    }
    return {
      ok: lacks.length === 0, lacks, mode: isAdv ? "advanced" : "normal",
      rate: cfg.rate, cost: isAdv ? { gold: cfg.gold } : { silver: cfg.silver },
      gain, maxCount: K.maxCount, used: (mainPet && mainPet.fuseCount) || 0
    };
  }

  function doFuse(hero, mainPet, subPet, mode) {
    const pv = previewFuse(hero, mainPet, subPet, mode);
    if (!pv.ok) return { ok: false, msg: pv.lacks.join("、"), preview: pv };
    const isAdv = pv.mode === "advanced";
    if (isAdv) hero.gold -= pv.cost.gold; else hero.silver -= pv.cost.silver;

    const subName = subPet.name;
    const idx = hero.pets.indexOf(subPet);
    if (idx >= 0) hero.pets.splice(idx, 1);           // 无论成败，副宠都消失

    if (isAdv || C().fuse.countFail) mainPet.fuseCount = (mainPet.fuseCount || 0) + 1;

    if (chance(pv.rate)) {
      const gained = [];
      ["str", "con", "agi", "int", "fai"].forEach((k) => {
        if (!pv.gain[k]) return;
        mainPet.apt[k].cur += pv.gain[k];
        gained.push(`${D().primaryNames[k]}+${pv.gain[k]}`);
      });
      const txt = log(`融合成功：${mainPet.name} 吸收 ${subName}，${gained.join("、")}（第 ${mainPet.fuseCount}/${C().fuse.maxCount} 次，成功率 ${Math.round(pv.rate * 100)}%）`);
      return { ok: true, win: true, msg: txt, preview: pv };
    }
    const txt = log(`融合失败：${subName} 已消失，${mainPet.name} 资质未提升（第 ${mainPet.fuseCount}/${C().fuse.maxCount} 次，成功率 ${Math.round(pv.rate * 100)}%）`);
    return { ok: true, win: false, msg: txt, preview: pv };
  }

  /* ══════════ 汇总加成（供 js/pet.js › stats() 只读调用） ══════════ */
  function statBonus(pet) {
    const out = { patk: 0, matk: 0, hp: 0, mp: 0, pdef: 0, mdef: 0, spd: 0 };
    if (!pet) return out;
    // 武装（耐久为 0 时属性失效）
    const arms = pet.arms || {};
    Object.keys(arms).forEach((id) => {
      const a = arms[id];
      if (!a || !(a.dur > 0)) return;
      const def = armDef(id);
      if (!def) return;
      const coef = C().arm.qualityCoef[a.quality] || 1;
      Object.entries(def.stats || {}).forEach(([k, v]) => {
        if (out[k] != null) out[k] += Math.round(v * coef);
      });
    });
    // 炼化（每级 ×Lv）
    const rs = pet.refineSkills || {};
    Object.entries(rs).forEach(([id, lv]) => {
      const n = AD().REFINE_NODES[id];
      if (!n || !n.effect) return;
      Object.entries(n.effect).forEach(([k, v]) => {
        if (out[k] != null) out[k] += Math.round((v || 0) * (lv || 1));
      });
    });
    return out;
  }

  /* ══════════ 技能名解析（炼化 / 进化技能不在 TSQ.DATA.skills 里） ══════════ */
  function skillName(sid) {
    const n = AD().REFINE_NODES[sid];
    if (n) return n.name;
    const e = Object.values(AD().EVOLVE_SKILLS).find((x) => x.id === sid);
    if (e) return e.name;
    return null;
  }
  function skillDesc(sid) {
    const n = AD().REFINE_NODES[sid];
    if (n) return n.desc + (Object.keys(n.effect || {}).length ? `（${effectText(n, 1).replace(/[（）]/g, "")}/级）` : "");
    const e = Object.values(AD().EVOLVE_SKILLS).find((x) => x.id === sid);
    if (e) return e.desc;
    return "";
  }

  TSQ.PetAdvance = {
    CONST: C(), data: AD,
    migrate, migrateHero,
    // 道具
    itemCount, takeItem, giveItem, itemName,
    // 武装
    armDef, armStats, armSlots, armDurMax, qualityMeta,
    activateArm, deactivateArm, repairArm, synthArmMaterial, wearArms,
    // 进化
    previewEvolve, doEvolve, couponForType, otherCoupons,
    // 炼化
    extractRate, extractRefine, applyRefine, manualName, effectText,
    // 融合
    previewFuse, doFuse,
    // 汇总
    statBonus, skillName, skillDesc,
    log, logs, rnd, clamp
  };
})();
