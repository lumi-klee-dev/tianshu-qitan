/* 精灵 / 萝莉 养成逻辑 v1.1
   ─────────────────────────────────────────────────────────────────────
   功能：
   - 20 枚精灵徽章兑换白精灵
   - 精灵养成：阶 1–9 × 级 1–5，消耗元神（<139 级扣 30500，>=139 级扣 45000），不足阻断
   - 精灵加成进入人物 combatStats 与出战宠物战力展示
   - 萝莉养成：阶 1–5 × 级 1–9，消耗元神，加成进人物属性
   - 存档兼容：tsq_save_v2，save_version 保持 2，migrate 只补 hero.spirit
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const SD = () => TSQ.SpiritData;
  function log(msg) {
    if (typeof TSQ.Spirit.onLog === "function") TSQ.Spirit.onLog(msg);
  }

  function uid() {
    return Math.random().toString(16).slice(2, 10);
  }

  // 初始化或补齐人物 spirit 字段结构（不赠送演示资源）
  function ensureStructure(hero) {
    if (!hero) return;
    if (!hero.spirit || typeof hero.spirit !== "object") {
      hero.spirit = {};
    }
    const sp = hero.spirit;

    if (typeof sp.badgeCount !== "number") {
      sp.badgeCount = 0;
    }

    if (!Array.isArray(sp.spirits)) {
      sp.spirits = [];
    }
    if (!sp.activeId && sp.spirits.length > 0) {
      sp.activeId = sp.spirits[0].uid;
    }

    if (!sp.loli || typeof sp.loli !== "object") {
      sp.loli = {
        defId: SD().LOLI_DEF.id,
        name: SD().LOLI_DEF.name,
        icon: SD().LOLI_DEF.icon,
        desc: SD().LOLI_DEF.desc,
        rank: 1,
        level: 1
      };
    } else {
      if (typeof sp.loli.rank !== "number") sp.loli.rank = 1;
      if (typeof sp.loli.level !== "number") sp.loli.level = 1;
    }
  }

  // 初始化角色精灵数据（仅供新建角色 createHero 调用）
  function initHero(hero) {
    if (!hero) return;
    ensureStructure(hero);
    const sp = hero.spirit;
    const K = SD().CONST;

    // 精灵徽章数量：create 时预置 >= 20（默认 40 枚）
    if (sp.badgeCount === 0) {
      sp.badgeCount = K.DEMO_BADGE_COUNT;
    }

    // 精灵列表：默认种入 1 只白精灵（1 阶 1 级）
    if (sp.spirits.length === 0) {
      sp.spirits = [
        {
          uid: uid(),
          defId: SD().SPIRIT_WHITE.id,
          name: SD().SPIRIT_WHITE.name,
          icon: SD().SPIRIT_WHITE.icon,
          desc: SD().SPIRIT_WHITE.desc,
          rank: 1,
          level: 1
        }
      ];
      sp.activeId = sp.spirits[0].uid;
    }
  }

  function migrate(hero) {
    if (!hero) return;
    ensureStructure(hero);
  }

  // 获取当前生效/出战的白精灵
  function currentSpirit(hero) {
    if (!hero || !hero.spirit || !Array.isArray(hero.spirit.spirits) || hero.spirit.spirits.length === 0) {
      return null;
    }
    const sp = hero.spirit;
    const found = sp.spirits.find((s) => s.uid === sp.activeId);
    return found || sp.spirits[0];
  }

  // 计算培养消耗元神（规则：hero.level < 139 扣 30500 ⚙，>= 139 扣 45000 ⚙）
  function trainCost(hero, mode) {
    const K = SD().CONST;
    if (mode === "low") return K.TRAIN_COST_LOW;
    if (hero && typeof hero.level === "number" && hero.level < 139) {
      return K.TRAIN_COST_LOW;
    }
    return K.TRAIN_COST_HIGH;
  }

  // 20 枚精灵徽章兑换 1 只白精灵
  function exchangeWhiteSpirit(hero) {
    initHero(hero);
    const K = SD().CONST;
    const sp = hero.spirit;
    if (sp.badgeCount < K.EXCHANGE_BADGE_COST) {
      return {
        ok: false,
        msg: `精灵徽章不足！兑换需要 ${K.EXCHANGE_BADGE_COST} 枚精灵徽章（当前持有：${sp.badgeCount} 枚）`
      };
    }

    sp.badgeCount -= K.EXCHANGE_BADGE_COST;
    const newSpirit = {
      uid: uid(),
      defId: SD().SPIRIT_WHITE.id,
      name: SD().SPIRIT_WHITE.name,
      icon: SD().SPIRIT_WHITE.icon,
      desc: SD().SPIRIT_WHITE.desc,
      rank: 1,
      level: 1
    };
    sp.spirits.push(newSpirit);
    if (!sp.activeId) sp.activeId = newSpirit.uid;

    const msg = `消耗 ${K.EXCHANGE_BADGE_COST} 枚精灵徽章，成功兑换获得【${newSpirit.name}】！`;
    log(msg);
    return { ok: true, msg, spirit: newSpirit };
  }

  // 培养精灵（消耗元神，不足阻断）
  function trainSpirit(hero, opts = {}) {
    initHero(hero);
    const spirit = currentSpirit(hero);
    if (!spirit) {
      return { ok: false, msg: "尚未持有精灵，请先使用精灵徽章兑换！" };
    }

    const K = SD().CONST;
    if (spirit.rank >= K.SPIRIT_MAX_RANK && spirit.level >= K.SPIRIT_MAX_LEVEL) {
      return { ok: false, msg: `【${spirit.name}】已达到最高境界（${K.SPIRIT_MAX_RANK}阶·${K.SPIRIT_MAX_LEVEL}级满级）` };
    }

    const cost = trainCost(hero, opts.mode);
    const curYs = (hero.yuanshen && typeof hero.yuanshen === "object" ? hero.yuanshen.value : 0) || 0;
    if (curYs < cost) {
      return {
        ok: false,
        msg: `元神不足！培养白精灵需要 ${cost} 点元神值（当前持有：${curYs} 点），升级未执行`
      };
    }

    // 扣除元神并升级
    hero.yuanshen.value -= cost;
    if (spirit.level < K.SPIRIT_MAX_LEVEL) {
      spirit.level += 1;
    } else {
      spirit.rank += 1;
      spirit.level = 1;
    }

    const msg = `白精灵培养成功！消耗 ${cost} 点元神值，当前晋升至【${spirit.rank}阶·${spirit.level}级】！`;
    log(msg);
    return { ok: true, msg, spirit };
  }

  // 培养小萝莉（5×9 进度，消耗元神，不足阻断）
  function trainLoli(hero, opts = {}) {
    initHero(hero);
    const loli = hero.spirit && hero.spirit.loli;
    if (!loli) {
      return { ok: false, msg: "未找到萝莉数据" };
    }

    const K = SD().CONST;
    if (loli.rank >= K.LOLI_MAX_RANK && loli.level >= K.LOLI_MAX_LEVEL) {
      return { ok: false, msg: `【${loli.name}】已达到最高境界（${K.LOLI_MAX_RANK}阶·${K.LOLI_MAX_LEVEL}级满级）` };
    }

    const cost = trainCost(hero, opts.mode);
    const curYs = (hero.yuanshen && typeof hero.yuanshen === "object" ? hero.yuanshen.value : 0) || 0;
    if (curYs < cost) {
      return {
        ok: false,
        msg: `元神不足！培养小萝莉需要 ${cost} 点元神值（当前持有：${curYs} 点），升级未执行`
      };
    }

    // 扣除元神并升级
    hero.yuanshen.value -= cost;
    if (loli.level < K.LOLI_MAX_LEVEL) {
      loli.level += 1;
    } else {
      loli.rank += 1;
      loli.level = 1;
    }

    const msg = `小萝莉培养成功！消耗 ${cost} 点元神值，当前晋升至【${loli.rank}阶·${loli.level}级】！`;
    log(msg);
    return { ok: true, msg, loli };
  }

  // 人物属性加成（白精灵 + 萝莉）进 combatStats / totalPrimary
  function heroBonus(hero) {
    const flat = { str: 0, con: 0, agi: 0, int: 0, fai: 0, hp: 0, mp: 0, patk: 0, matk: 0, pdef: 0, mdef: 0, spd: 0 };
    const pct = { hp_pct: 0, patk_pct: 0, matk_pct: 0, spd_pct: 0 };
    if (!hero || !hero.spirit) return { flat, pct };

    // 1. 白精灵加成
    const cur = currentSpirit(hero);
    if (cur) {
      const sb = SD().spiritStats(cur.rank, cur.level);
      for (const [k, v] of Object.entries(sb.flat)) {
        flat[k] = (flat[k] || 0) + v;
      }
    }

    // 2. 萝莉加成
    const loli = hero.spirit.loli;
    if (loli) {
      const lb = SD().loliStats(loli.rank, loli.level);
      for (const [k, v] of Object.entries(lb.flat)) {
        flat[k] = (flat[k] || 0) + v;
      }
    }

    return { flat, pct };
  }

  // 出战宠物属性加成（白精灵加成同时作用于出战宠物）
  function petBonus(hero, pet) {
    const flat = { hp: 0, mp: 0, patk: 0, matk: 0, pdef: 0, mdef: 0, spd: 0 };
    const pct = { hp_pct: 0, patk_pct: 0, matk_pct: 0, spd_pct: 0 };
    if (!hero || !hero.spirit) return { flat, pct };

    const cur = currentSpirit(hero);
    if (cur) {
      const sb = SD().spiritStats(cur.rank, cur.level);
      ["hp", "mp", "patk", "matk", "pdef", "mdef", "spd"].forEach((k) => {
        if (sb.flat[k]) flat[k] = (flat[k] || 0) + sb.flat[k];
      });
    }

    return { flat, pct };
  }

  // 便捷发放/任务增加徽章（测试用）
  function addBadges(hero, n = 2) {
    initHero(hero);
    hero.spirit.badgeCount = (hero.spirit.badgeCount || 0) + n;
    return hero.spirit.badgeCount;
  }

  TSQ.Spirit = {
    initHero,
    migrate,
    currentSpirit,
    trainCost,
    exchangeWhiteSpirit,
    trainSpirit,
    trainLoli,
    heroBonus,
    petBonus,
    addBadges,
    onLog: null
  };
})();

