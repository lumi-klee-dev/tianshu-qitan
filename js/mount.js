/* 骑宠 / 兽魂 逻辑系统 v1.0
   ─────────────────────────────────────────────────────────────────────
   功能：
   - 骑宠初始化与旧档 migrate 兼容（发放 1 只原版骑宠 + 若干兽魂材料）
   - 出战骑乘切换（演示开关）、改名、喂养忠诚度
   - 潜力点分配（每升 1 级 2 点潜力）
   - 战宠契约：最多与 2 只已绑定参战宠签契约，契约宠 10% 一级属性加给骑宠
   - 经验分流：契约宠经验 100% 分流给骑宠，骑宠获得经验并升级
   - 兽魂系统：
     * 5 档品质（白/绿/蓝/紫/橙），最高 10 级
     * 每骑可装备 1 个兽魂
     * 吞噬兽魂升级（绿20/蓝50/紫400/橙800/白5）
     * 原版神仙召唤（散仙/真仙消耗 5 两金）
   - 人物属性加成：一级属性 × 5% ⚙ 进 combatStats
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const MD = () => TSQ.MountData;

  function log(msg) {
    if (typeof TSQ.Mount.onLog === "function") {
      TSQ.Mount.onLog(msg);
    }
  }

  // 补齐字段结构（不赠送演示资源）
  function ensureStructure(hero) {
    if (!hero) return;
    hero.mount = hero.mount || {
      unlocked: true,
      riding: false,
      current: null,
      owned: {},
      soulBag: []
    };

    if (typeof hero.mount.owned !== "object" || hero.mount.owned === null) {
      hero.mount.owned = {};
    }
    if (!Array.isArray(hero.mount.soulBag)) {
      hero.mount.soulBag = [];
    }

    hero.consumables = hero.consumables || {};
    if (hero.consumables.pet_food == null) hero.consumables.pet_food = 0;
    if (hero.consumables.ningshen_pill == null) hero.consumables.ningshen_pill = 0;
    if (hero.consumables.fenglei_pill == null) hero.consumables.fenglei_pill = 0;
    if (hero.consumables.mingguang_pill == null) hero.consumables.mingguang_pill = 0;
    if (hero.consumables.linghuan_pill == null) hero.consumables.linghuan_pill = 0;

    hero.flags = hero.flags || {};
    if (typeof hero.flags.skillPillsClaimed !== "boolean") hero.flags.skillPillsClaimed = false;

    // 补齐每个拥有骑宠的字段
    Object.values(hero.mount.owned || {}).forEach((m) => {
      if (!m.primary) {
        const def = MD().mountById(m.defId) || MD().MOUNTS[0];
        m.primary = { ...def.basePrimary };
      }
      if (typeof m.level !== "number") m.level = 1;
      if (typeof m.exp !== "number") m.exp = 0;
      if (typeof m.expNeed !== "number") m.expNeed = MD().CONST.MOUNT_EXP_NEED(m.level);
      if (typeof m.loyalty !== "number") m.loyalty = 100;
      if (typeof m.intimacy !== "number") m.intimacy = 120;
      if (typeof m.unspent !== "number") m.unspent = 0;
      if (!Array.isArray(m.contracts)) m.contracts = [];
      if (m.soul == null) m.soul = null;
      if (!Array.isArray(m.skills)) {
        m.skills = [];
      }
    });
  }

  // 初始化角色骑宠数据（仅供新建角色 createHero 调用）
  function initHero(hero) {
    if (!hero) return;
    ensureStructure(hero);

    // 发放初始演示骑宠（至少 1 只原版经典骑宠「浪四海」）
    const demoMountId = MD().CONST.DEMO.grantMountId;
    if (Object.keys(hero.mount.owned).length === 0) {
      const initMount = MD().makeMountInstance(demoMountId);
      // 预先装配 1 个初始紫微兽魂（供玩家即刻体验兽魂与属性加成）
      initMount.soul = MD().makeSoulInstance("soul_ziwei", 1, 0);
      hero.mount.owned[demoMountId] = initMount;
      hero.mount.current = demoMountId;
      hero.mount.riding = true;
    }

    // 发放若干兽魂材料（白/绿/蓝/紫/橙）
    if (hero.mount.soulBag.length === 0) {
      MD().CONST.DEMO.grantSouls.forEach((item) => {
        hero.mount.soulBag.push(MD().makeSoulInstance(item.defId, item.lv, item.exp));
      });
    }

    // 首次缺省时发放宠物口粮 5 个；已有字段（含 0）不再自动补
    if (hero.consumables.pet_food === 0) {
      hero.consumables.pet_food = 5;
    }
    // v1.2: 发放骑宠技能领悟灵丹（凝神丹、风雷丹、明光丹、灵幻丹）
    if (hero.consumables.ningshen_pill === 0) hero.consumables.ningshen_pill = 8;
    if (hero.consumables.fenglei_pill === 0) hero.consumables.fenglei_pill = 5;
    if (hero.consumables.mingguang_pill === 0) hero.consumables.mingguang_pill = 5;
    if (hero.consumables.linghuan_pill === 0) hero.consumables.linghuan_pill = 5;
  }

  // 旧档迁移（save_version 保持 2，只补字段）
  function migrate(hero) {
    if (!hero) return;
    ensureStructure(hero);
  }

  // 骑乘解锁条件：一转后（或 demo unlocked 开关）
  function canRide(hero) {
    if (!hero) return false;
    return (hero.rebirth >= MD().CONST.REQ_REBIRTH) || !!(hero.mount && hero.mount.unlocked);
  }

  // 获取当前查看或使用的骑宠
  function currentMount(hero) {
    ensureStructure(hero);
    if (!hero.mount || !hero.mount.owned) return null;
    const curId = hero.mount.current;
    if (curId && hero.mount.owned[curId]) {
      return hero.mount.owned[curId];
    }
    const firstKey = Object.keys(hero.mount.owned)[0];
    if (firstKey) {
      hero.mount.current = firstKey;
      return hero.mount.owned[firstKey];
    }
    return null;
  }

  // 切换当前选中骑宠
  function selectMount(hero, mountId) {
    ensureStructure(hero);
    if (hero.mount.owned[mountId]) {
      hero.mount.current = mountId;
      return { ok: true, mount: hero.mount.owned[mountId] };
    }
    return { ok: false, msg: "尚未拥有该骑宠" };
  }

  // 认领/获得演示骑宠（让玩家随时体验另外两只演示骑宠）
  function adoptMount(hero, defId) {
    ensureStructure(hero);
    const def = MD().mountById(defId);
    if (!def) return { ok: false, msg: "未找到该骑宠档案" };

    if (hero.mount.owned[defId]) {
      hero.mount.current = defId;
      return { ok: true, msg: `已切换至骑宠【${hero.mount.owned[defId].name}】` };
    }

    const newMount = MD().makeMountInstance(defId);
    hero.mount.owned[defId] = newMount;
    hero.mount.current = defId;
    const msg = `成功认主仙界灵兽【${newMount.name}】！可在列表中自由切换。`;
    log(msg);
    return { ok: true, msg, mount: newMount };
  }

  // 切换出战骑乘状态（演示开关）
  function toggleRiding(hero) {
    ensureStructure(hero);
    if (!canRide(hero)) {
      return { ok: false, msg: "未达一转境界，无法骑乘灵兽！" };
    }
    const mount = currentMount(hero);
    if (!mount) {
      return { ok: false, msg: "当前暂无可用骑宠" };
    }

    hero.mount.riding = !hero.mount.riding;
    const msg = hero.mount.riding
      ? `你翻身跨上骑宠【${mount.name}】，威风凛凛！骑宠属性加成已生效。`
      : `你收起骑宠【${mount.name}】，进入步行休息状态。`;
    log(msg);
    return { ok: true, riding: hero.mount.riding, msg };
  }

  // 骑宠改名
  function renameMount(hero, mountId, newName) {
    ensureStructure(hero);
    const mount = hero.mount.owned[mountId];
    if (!mount) return { ok: false, msg: "未找到该骑宠" };
    const name = (newName || "").trim();
    if (!name || name.length > 8) {
      return { ok: false, msg: "骑宠名称长度须在 1~8 个字之间" };
    }
    const oldName = mount.name;
    mount.name = name;
    const msg = `骑宠【${oldName}】已正式更名为【${name}】！`;
    log(msg);
    return { ok: true, msg };
  }

  // 喂养骑宠提升忠诚度
  function feedLoyalty(hero, mountId) {
    ensureStructure(hero);
    const mount = hero.mount.owned[mountId];
    if (!mount) return { ok: false, msg: "未找到该骑宠" };
    if (mount.loyalty >= 100) {
      return { ok: false, msg: `骑宠【${mount.name}】忠诚度已达上限（100/100），无需喂养！` };
    }

    // 消耗宠物口粮；无口粮则拒绝（演示可在背包/初始发放中补给）
    hero.consumables = hero.consumables || {};
    if (!(hero.consumables.pet_food > 0)) {
      return { ok: false, msg: "宠物口粮不足，无法喂养骑宠忠诚！" };
    }
    hero.consumables.pet_food--;

    mount.loyalty = Math.min(100, mount.loyalty + 20);
    const msg = `喂养了骑宠【${mount.name}】，忠诚度恢复至 ${mount.loyalty}/100！`;
    log(msg);
    return { ok: true, msg, loyalty: mount.loyalty };
  }

  // 模拟忠诚度下降（便于测试喂养）
  function reduceLoyalty(hero, mountId, amount = 15) {
    ensureStructure(hero);
    const mount = hero.mount.owned[mountId];
    if (!mount) return { ok: false, msg: "未找到该骑宠" };
    mount.loyalty = Math.max(0, mount.loyalty - amount);
    const msg = `演示测试：骑宠【${mount.name}】忠诚度下降至 ${mount.loyalty}/100。`;
    log(msg);
    return { ok: true, msg, loyalty: mount.loyalty };
  }

  // 分配骑宠潜力点（强壮/耐力/敏捷/智力/信仰）
  function addPotential(hero, mountId, statKey) {
    ensureStructure(hero);
    const mount = hero.mount.owned[mountId];
    if (!mount) return { ok: false, msg: "未找到该骑宠" };
    if (mount.unspent <= 0) {
      return { ok: false, msg: "没有可用潜力点" };
    }
    if (!["str", "con", "agi", "int", "fai"].includes(statKey)) {
      return { ok: false, msg: "无效的属性类型" };
    }

    mount.primary[statKey] = (mount.primary[statKey] || 0) + 1;
    mount.unspent--;
    const statNames = TSQ.DATA ? TSQ.DATA.primaryNames : { str: "强壮", con: "耐力", agi: "敏捷", int: "智力", fai: "信仰" };
    return { ok: true, msg: `已为【${mount.name}】分配 1 点潜力至【${statNames[statKey]}】` };
  }

  // 契约操作：最多与 2 只已绑定参战宠签契约
  function contractPet(hero, mountId, petUid) {
    ensureStructure(hero);
    const mount = hero.mount.owned[mountId];
    if (!mount) return { ok: false, msg: "未找到该骑宠" };

    const pet = (hero.pets || []).find((p) => p.uid === petUid);
    if (!pet) return { ok: false, msg: "未找到该参战宠物" };

    mount.contracts = mount.contracts || [];
    if (mount.contracts.includes(petUid)) {
      return { ok: false, msg: `参战宠【${pet.name}】已与【${mount.name}】签下契约！` };
    }

    if (mount.contracts.length >= MD().CONST.CONTRACT_MAX) {
      return { ok: false, msg: `契约已达上限（最多 ${MD().CONST.CONTRACT_MAX} 只），请先解除已有契约！` };
    }

    mount.contracts.push(petUid);
    const msg = `【契约结缔】骑宠【${mount.name}】与参战宠【${pet.name}】成功缔结灵犀契约！参战宠 10% 一级属性将转化给骑宠，战斗经验将 100% 分流给骑宠！`;
    log(msg);
    return { ok: true, msg };
  }

  // 解除契约
  function uncontractPet(hero, mountId, petUid) {
    ensureStructure(hero);
    const mount = hero.mount.owned[mountId];
    if (!mount) return { ok: false, msg: "未找到该骑宠" };

    const pet = (hero.pets || []).find((p) => p.uid === petUid);
    const petName = pet ? pet.name : "参战宠";

    mount.contracts = (mount.contracts || []).filter((id) => id !== petUid);
    const msg = `已解除骑宠【${mount.name}】与参战宠【${petName}】的契约。`;
    log(msg);
    return { ok: true, msg };
  }

  // 契约经验分流演示
  function divertExp(hero, mountId, expAmount = 500) {
    ensureStructure(hero);
    const mount = hero.mount.owned[mountId];
    if (!mount) return { ok: false, msg: "未找到该骑宠" };

    if (!mount.contracts || mount.contracts.length === 0) {
      return { ok: false, msg: "当前骑宠尚未与任何参战宠签约，无法分流经验！请先在战宠列表点击「签订契约」。" };
    }

    const contractedPets = (mount.contracts || [])
      .map((uid) => (hero.pets || []).find((p) => p.uid === uid))
      .filter(Boolean);

    if (contractedPets.length === 0) {
      return { ok: false, msg: "契约宠物不存在或已丢失" };
    }

    const petNames = contractedPets.map((p) => p.name).join("、");
    mount.exp += expAmount;

    let upCount = 0;
    while (mount.exp >= mount.expNeed) {
      mount.exp -= mount.expNeed;
      mount.level++;
      mount.unspent += MD().CONST.POINTS_PER_LEVEL;
      mount.expNeed = MD().CONST.MOUNT_EXP_NEED(mount.level);
      upCount++;
    }

    let msg = `【经验分流】契约宠【${petNames}】在战斗中获得 ${expAmount} 点经验，100% 悉数分流给骑宠【${mount.name}】！`;
    if (upCount > 0) {
      msg += ` 恭喜骑宠成熟等级晋升至 Lv.${mount.level}！获得 ${upCount * MD().CONST.POINTS_PER_LEVEL} 点潜力点！`;
    } else {
      msg += `（经验进度：${mount.exp}/${mount.expNeed}）`;
    }

    log(msg);
    return { ok: true, msg, level: mount.level, exp: mount.exp, expNeed: mount.expNeed };
  }

  // 装备兽魂到骑宠（每骑装备 1 个）
  function equipSoul(hero, mountId, soulBagIdx) {
    ensureStructure(hero);
    const mount = hero.mount.owned[mountId];
    if (!mount) return { ok: false, msg: "未找到该骑宠" };

    const soul = hero.mount.soulBag[soulBagIdx];
    if (!soul) return { ok: false, msg: "兽魂仓库中未找到该兽魂" };

    hero.mount.soulBag.splice(soulBagIdx, 1);
    const oldSoul = mount.soul;
    mount.soul = soul;
    if (oldSoul) {
      hero.mount.soulBag.push(oldSoul);
    }

    const msg = oldSoul
      ? `更换兽魂为【${soul.quality}·${soul.name} (Lv.${soul.lv})】（换下了【${oldSoul.name}】）`
      : `骑宠【${mount.name}】成功镶嵌兽魂【${soul.quality}·${soul.name} (Lv.${soul.lv})】，兽魂属性已生效！`;
    log(msg);
    return { ok: true, msg };
  }

  // 卸下兽魂
  function unequipSoul(hero, mountId) {
    ensureStructure(hero);
    const mount = hero.mount.owned[mountId];
    if (!mount) return { ok: false, msg: "未找到该骑宠" };
    if (!mount.soul) return { ok: false, msg: "当前骑宠未装备兽魂" };

    const old = mount.soul;
    hero.mount.soulBag.push(old);
    mount.soul = null;
    const msg = `已卸下骑宠【${mount.name}】装备的兽魂【${old.name}】回到兽魂仓库。`;
    log(msg);
    return { ok: true, msg };
  }

  // 吞噬兽魂升级（绿20/蓝50/紫400/橙800/白5 ⚙，最高 10 级）
  function feedSoul(hero, targetSoul, materialIndices) {
    ensureStructure(hero);
    if (!targetSoul) return { ok: false, msg: "未指定目标兽魂" };

    if (targetSoul.lv >= MD().CONST.MAX_SOUL_LEVEL) {
      return { ok: false, msg: "该兽魂已臻至圆满境界（最高 10 级），无法继续吞噬升级！" };
    }

    if (!Array.isArray(materialIndices) || materialIndices.length === 0) {
      return { ok: false, msg: "请选择要被吞噬的兽魂材料" };
    }

    // 从大到小排序索引，确保安全删除
    const sortedIndices = [...materialIndices].sort((a, b) => b - a);
    let totalExpGained = 0;
    let eatenCount = 0;

    sortedIndices.forEach((idx) => {
      const mat = hero.mount.soulBag[idx];
      if (mat) {
        const feedVal = MD().CONST.SOUL_FEED_EXP[mat.quality] || 5;
        totalExpGained += feedVal;
        hero.mount.soulBag.splice(idx, 1);
        eatenCount++;
      }
    });

    if (eatenCount === 0) {
      return { ok: false, msg: "没有有效的兽魂材料被吞噬" };
    }

    targetSoul.exp += totalExpGained;
    let upLvCount = 0;
    while (targetSoul.lv < MD().CONST.MAX_SOUL_LEVEL && targetSoul.exp >= MD().CONST.SOUL_EXP_NEED(targetSoul.lv)) {
      targetSoul.exp -= MD().CONST.SOUL_EXP_NEED(targetSoul.lv);
      targetSoul.lv++;
      upLvCount++;
    }

    if (targetSoul.lv >= MD().CONST.MAX_SOUL_LEVEL) {
      targetSoul.lv = MD().CONST.MAX_SOUL_LEVEL;
      targetSoul.exp = 0;
    }

    let msg = `成功吞噬 ${eatenCount} 颗兽魂，注入 ${totalExpGained} 点魂力经验！`;
    if (upLvCount > 0) {
      msg += ` 兽魂【${targetSoul.name}】突破升至 Lv.${targetSoul.lv}！属性大幅增强！`;
    } else {
      msg += `（升级进度：${targetSoul.exp}/${MD().CONST.SOUL_EXP_NEED(targetSoul.lv)}）`;
    }

    log(msg);
    return { ok: true, msg, lv: targetSoul.lv, exp: targetSoul.exp };
  }

  // 神仙召唤兽魂（散仙召唤消耗银两，真仙召唤消耗 5 两金）
  function summonSoul(hero, isTrueImmortal = false) {
    ensureStructure(hero);
    if (isTrueImmortal) {
      const costGold = MD().CONST.SUMMON_TRUE_IMMORTAL_GOLD;
      const haveGold = hero.gold || 0;
      if (haveGold < costGold) {
        return { ok: false, msg: `金子不足！召唤真仙需要 ${costGold} 两金（当前 ${haveGold} 两）。` };
      }
      hero.gold = haveGold - costGold;
      // 真仙必出紫 / 橙
      const isOrange = Math.random() < 0.35;
      const defId = isOrange ? "soul_fantian" : "soul_ziwei";
      const soul = MD().makeSoulInstance(defId, 1, 0);
      hero.mount.soulBag.push(soul);
      const msg = `【真仙降临】消耗 ${costGold} 两金召唤真仙！获得极品【${soul.quality}·${soul.name}】！已收入兽魂仓库。`;
      log(msg);
      return { ok: true, msg, soul };
    } else {
      const costSilver = MD().CONST.SUMMON_COST_SILVER;
      const haveSilver = hero.silver || 0;
      if (haveSilver < costSilver) {
        return { ok: false, msg: `银两不足！感应散仙需要 ${costSilver} 银两（当前 ${haveSilver}）。` };
      }
      hero.silver = haveSilver - costSilver;
      // 普通召唤出 白(50%) / 绿(35%) / 蓝(15%)
      const rnd = Math.random();
      let defId = "soul_suiling";
      if (rnd < 0.15) defId = "soul_youquan";
      else if (rnd < 0.50) defId = "soul_lingmu";

      const soul = MD().makeSoulInstance(defId, 1, 0);
      hero.mount.soulBag.push(soul);
      const msg = `【神仙感应】消耗 ${costSilver} 银两召唤散仙，获得了【${soul.quality}·${soul.name}】。`;
      log(msg);
      return { ok: true, msg, soul };
    }
  }

  // 获得一包测试材料（每日限一次）
  function grantDemoPack(hero) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);
    const today = new Date().toDateString();
    hero.flags = hero.flags || {};
    if (hero.flags.lastDemoPackDay === today) {
      return { ok: false, msg: "今日兽魂补给包已领取，每日限领一次！" };
    }
    hero.flags.lastDemoPackDay = today;
    MD().CONST.DEMO.grantSouls.forEach((item) => {
      hero.mount.soulBag.push(MD().makeSoulInstance(item.defId, item.lv, item.exp));
    });
    const msg = "已领取 1 包兽魂补给包（包含白/绿/蓝/紫/橙兽魂各若干），可尽情体验吞噬与升级！";
    log(msg);
    return { ok: true, msg };
  }

  // 计算骑宠各属性加成汇总（包含契约宠 10% 属性与兽魂属性）
  function mountStats(hero, mount) {
    if (!hero || !mount) return { primary: { str: 0, con: 0, agi: 0, int: 0, fai: 0 }, contractBonus: {}, soulStats: {} };

    const pri = { ...mount.primary };
    const contractBonus = { str: 0, con: 0, agi: 0, int: 0, fai: 0 };

    // 契约宠 10% 一级属性加成到骑宠
    (mount.contracts || []).forEach((uid) => {
      const pet = (hero.pets || []).find((p) => p.uid === uid);
      if (pet && pet.primary) {
        ["str", "con", "agi", "int", "fai"].forEach((k) => {
          const val = pet.primary[k] || 0;
          const add = Math.round(val * MD().CONST.CONTRACT_PRIMARY_BONUS_RATIO);
          contractBonus[k] += add;
          pri[k] += add;
        });
      }
    });

    // 装备的兽魂属性加成
    const soulStats = {};
    if (mount.soul) {
      const sDef = MD().soulDefById(mount.soul.defId);
      if (sDef && typeof sDef.stats === "function") {
        const sBonus = sDef.stats(mount.soul.lv);
        Object.assign(soulStats, sBonus);
        ["str", "con", "agi", "int", "fai"].forEach((k) => {
          if (sBonus[k]) pri[k] += sBonus[k];
        });
      }
    }

    // v1.2: 骑宠技能对骑宠一级属性的加成（规格严格规定：≥2 级才生效）
    const skillMountPrimary = { str: 0, con: 0, agi: 0, int: 0, fai: 0 };
    (mount.skills || []).forEach((sk) => {
      const minLv = (MD().SKILL_CONST && MD().SKILL_CONST.MIN_ACTIVE_LEVEL) || 2;
      if ((sk.level || 1) >= minLv) {
        const def = MD().skillDefById(sk.id);
        if (def && def.mountPrimary) {
          const mult = 1 + (sk.level - 2) * 0.25;
          for (const [k, v] of Object.entries(def.mountPrimary)) {
            const add = Math.round(v * mult);
            skillMountPrimary[k] = (skillMountPrimary[k] || 0) + add;
            pri[k] = (pri[k] || 0) + add;
          }
        }
      }
    });

    return { primary: pri, contractBonus, soulStats, skillMountPrimary };
  }

  // 骑宠对人物的最终属性加成（仅在出战骑乘状态下生效）
  // 规则：人物获得骑宠一级属性 × 5% 进 combatStats ⚙；兽魂额外二级属性直接附加上去；
  // v1.2 骑宠技能对人物属性（直接属性与百分比）加成（仅 ≥2 级才生效）
  function bonus(hero) {
    if (!hero || !hero.mount || !hero.mount.riding) {
      return { flat: {}, pct: {} };
    }

    const mount = currentMount(hero);
    if (!mount) return { flat: {}, pct: {} };

    const { primary, contractBonus, soulStats, skillMountPrimary } = mountStats(hero, mount);
    const flat = {};
    const pct = {};

    // 骑宠一级属性 × 5% 进人物属性
    ["str", "con", "agi", "int", "fai"].forEach((k) => {
      flat[k] = Math.round((primary[k] || 0) * MD().CONST.PLAYER_PRIMARY_BONUS_RATIO);
    });

    // 兽魂的二级属性（hp, patk, matk, pdef, mdef, spd 等）
    Object.entries(soulStats).forEach(([k, v]) => {
      if (!["str", "con", "agi", "int", "fai"].includes(k)) {
        flat[k] = (flat[k] || 0) + v;
      }
    });

    // v1.2: 骑宠技能对人物的加成（规格严格规定：≥2 级才生效）
    const skillPlayerFlat = {};
    const skillPlayerPct = {};
    (mount.skills || []).forEach((sk) => {
      const minLv = (MD().SKILL_CONST && MD().SKILL_CONST.MIN_ACTIVE_LEVEL) || 2;
      if ((sk.level || 1) >= minLv) {
        const def = MD().skillDefById(sk.id);
        if (def) {
          const mult = 1 + (sk.level - 2) * 0.25;
          if (def.playerFlat) {
            for (const [k, v] of Object.entries(def.playerFlat)) {
              const add = Math.round(v * mult);
              flat[k] = (flat[k] || 0) + add;
              skillPlayerFlat[k] = (skillPlayerFlat[k] || 0) + add;
            }
          }
          if (def.playerPct) {
            for (const [k, v] of Object.entries(def.playerPct)) {
              pct[k] = (pct[k] || 0) + v;
              skillPlayerPct[k] = (skillPlayerPct[k] || 0) + v;
            }
          }
        }
      }
    });

    return {
      flat,
      pct,
      mountPrimary: primary,
      contractBonus,
      soulStats,
      skillMountPrimary,
      skillPlayerFlat,
      skillPlayerPct,
      mountName: mount.name
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // v1.2 骑宠技能核心业务逻辑：领悟、遗忘、研习升级、紫/蓝上限拦截
  // ─────────────────────────────────────────────────────────────────
  function learnSkill(hero, mountDefId, skillId, targetLv = 2) {
    ensureStructure(hero);
    const mount = (mountDefId && hero.mount.owned[mountDefId]) || currentMount(hero);
    if (!mount) return { ok: false, msg: "未找到目标骑宠" };

    mount.skills = Array.isArray(mount.skills) ? mount.skills : [];
    if (mount.skills.some((s) => s.id === skillId)) {
      return { ok: false, msg: "该骑宠已习得此技能，无需重复领悟！" };
    }

    const SC = MD().SKILL_CONST || { MAX_PURPLE: 1, MAX_BLUE: 3, MAX_SKILLS: 6 };
    if (mount.skills.length >= SC.MAX_SKILLS) {
      return { ok: false, msg: `骑宠技能格已满（最多可学习 ${SC.MAX_SKILLS} 个技能）！请先遗忘无需的技能。` };
    }

    const def = MD().skillDefById(skillId);
    if (!def) return { ok: false, msg: "未找到该技能数据" };

    // 官方专题规格约束拦截：最多 1 个紫
    if (def.quality === "紫") {
      const pCount = mount.skills.filter((s) => {
        const d = MD().skillDefById(s.id);
        return d && d.quality === "紫";
      }).length;
      if (pCount >= SC.MAX_PURPLE) {
        const msg = `【上限拦截】该骑宠已拥有 ${pCount} 个紫色技能，已达上限（最多 1 个紫）！请先遗忘已有紫色技能。`;
        log(msg);
        return { ok: false, msg };
      }
    }

    // 官方专题规格约束拦截：最多 3 个蓝
    if (def.quality === "蓝") {
      const bCount = mount.skills.filter((s) => {
        const d = MD().skillDefById(s.id);
        return d && d.quality === "蓝";
      }).length;
      if (bCount >= SC.MAX_BLUE) {
        const msg = `【上限拦截】该骑宠已拥有 ${bCount} 个蓝色技能，已达上限（最多 3 个蓝）！请先遗忘一个蓝色技能。`;
        log(msg);
        return { ok: false, msg };
      }
    }

    // 扣除对应领悟丹（若有则扣除 1 颗，无则提示并演示允许或支持领悟）
    let pillDeducted = false;
    let pillKey = "ningshen_pill";
    if (def.pool === "风雷") pillKey = "fenglei_pill";
    else if (def.pool === "明光") pillKey = "mingguang_pill";
    else if (def.pool === "灵幻") pillKey = "linghuan_pill";

    hero.consumables = hero.consumables || {};
    if ((hero.consumables[pillKey] || 0) > 0) {
      hero.consumables[pillKey] -= 1;
      pillDeducted = true;
    } else if ((hero.consumables.ningshen_pill || 0) > 0) {
      hero.consumables.ningshen_pill -= 1;
      pillDeducted = true;
    } else {
      return { ok: false, msg: "领悟丹不足！领悟骑宠技能需要 1 颗对应系领悟丹或凝神丹。" };
    }

    // 新学技能，初始设定等级（默认 2 级生效）
    const initialLevel = Math.max(1, targetLv);
    mount.skills.push({ id: def.id, level: initialLevel });

    const activeText = initialLevel >= (SC.MIN_ACTIVE_LEVEL || 2) ? "（Lv.2 生效中）" : "（Lv.1 研习中，需升至 ≥2 级生效）";
    const msg = `骑宠【${mount.name}】成功领悟【${def.quality}】品质技能【${def.name}】${activeText}！${pillDeducted ? "已消耗对应领悟丹。" : ""}`;
    log(msg);
    return { ok: true, msg, skill: { id: def.id, level: initialLevel } };
  }

  function forgetSkill(hero, mountDefId, skillId) {
    ensureStructure(hero);
    const mount = (mountDefId && hero.mount.owned[mountDefId]) || currentMount(hero);
    if (!mount) return { ok: false, msg: "未找到目标骑宠" };

    mount.skills = Array.isArray(mount.skills) ? mount.skills : [];
    const idx = mount.skills.findIndex((s) => s.id === skillId);
    if (idx === -1) return { ok: false, msg: "该骑宠未习得此技能" };

    const def = MD().skillDefById(skillId);
    const sName = def ? def.name : skillId;
    mount.skills.splice(idx, 1);

    const msg = `骑宠【${mount.name}】已成功遗忘技能【${sName}】，已释放技能名额！`;
    log(msg);
    return { ok: true, msg };
  }

  function upgradeSkill(hero, mountDefId, skillId) {
    ensureStructure(hero);
    const mount = (mountDefId && hero.mount.owned[mountDefId]) || currentMount(hero);
    if (!mount) return { ok: false, msg: "未找到目标骑宠" };

    mount.skills = Array.isArray(mount.skills) ? mount.skills : [];
    const sk = mount.skills.find((s) => s.id === skillId);
    if (!sk) return { ok: false, msg: "该骑宠未习得此技能" };

    const maxLv = (MD().SKILL_CONST && MD().SKILL_CONST.MAX_LEVEL) || 5;
    if ((sk.level || 1) >= maxLv) {
      return { ok: false, msg: `该技能已达最高等级 Lv.${maxLv}！` };
    }

    // 升级消耗 1 颗凝神丹
    hero.consumables = hero.consumables || {};
    if ((hero.consumables.ningshen_pill || 0) < 1) {
      return { ok: false, msg: "凝神丹不足！研习提升骑宠技能需要 1 颗凝神丹（可通过结义任务或快捷测试获得）。" };
    }
    hero.consumables.ningshen_pill -= 1;

    sk.level = (sk.level || 1) + 1;
    const def = MD().skillDefById(skillId);
    const sName = def ? def.name : skillId;
    const msg = `消耗 1 颗凝神丹，骑宠技能【${sName}】研习突破升至 Lv.${sk.level}！加成效果已实时强化！`;
    log(msg);
    return { ok: true, msg, level: sk.level };
  }

  function grantSkillPills(hero) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);
    hero.flags = hero.flags || {};
    if (hero.flags.skillPillsClaimed) {
      return { ok: false, msg: "【已领取】骑宠领悟丹测试礼包每角色限领一次！" };
    }
    hero.consumables = hero.consumables || {};
    hero.consumables.ningshen_pill = (hero.consumables.ningshen_pill || 0) + 10;
    hero.consumables.fenglei_pill = (hero.consumables.fenglei_pill || 0) + 10;
    hero.consumables.mingguang_pill = (hero.consumables.mingguang_pill || 0) + 10;
    hero.consumables.linghuan_pill = (hero.consumables.linghuan_pill || 0) + 10;
    hero.flags.skillPillsClaimed = true;
    const msg = "已获赠骑宠领悟丹礼包：凝神丹×10、风雷丹×10、明光丹×10、灵幻丹×10！";
    log(msg);
    return { ok: true, msg };
  }

  TSQ.Mount = {
    initHero,
    migrate,
    canRide,
    currentMount,
    selectMount,
    adoptMount,
    toggleRiding,
    renameMount,
    feedLoyalty,
    reduceLoyalty,
    addPotential,
    contractPet,
    uncontractPet,
    divertExp,
    equipSoul,
    unequipSoul,
    feedSoul,
    summonSoul,
    grantDemoPack,
    mountStats,
    bonus,
    learnSkill,
    forgetSkill,
    upgradeSkill,
    grantSkillPills
  };
})();

