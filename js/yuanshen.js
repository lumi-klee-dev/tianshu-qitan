/* 元神系统逻辑 v0.8
   ─────────────────────────────────────────────────────────────────────
   功能：
   - 元神属性（等级 1–10 ⚙、当前经验、元神值资源池、附魔倍率 1–5 倍）
   - 服用「元神丹」获取经验升级突破
   - 银两直接晋升元神等级
   - 提供各系统查询的只读接口（level / mult / pool 等）与旧档迁移兼容
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const BD = () => TSQ.BadgeData;
  function log(msg) {
    if (typeof TSQ.Yuanshen.onLog === "function") TSQ.Yuanshen.onLog(msg);
  }

  function ensureStructure(hero) {
    if (!hero) return;
    if (!hero.yuanshen || typeof hero.yuanshen !== "object") {
      const oldVal = typeof hero.yuanshen === "number" ? hero.yuanshen : 0;
      hero.yuanshen = { lv: 1, exp: 0, value: oldVal };
    }
    hero.yuanshen.lv = hero.yuanshen.lv || 1;
    if (hero.yuanshen.exp == null) hero.yuanshen.exp = 0;
    if (hero.yuanshen.value == null) hero.yuanshen.value = 0;

    hero.mats = hero.mats || {};
    const pid = BD().PILL.id;
    if (hero.mats[pid] == null) {
      hero.mats[pid] = 0;
    }
  }

  function initHero(hero) {
    if (!hero) return;
    ensureStructure(hero);
    if (hero.yuanshen.value === 0) hero.yuanshen.value = 3000000;
    if (hero.yuanshen.lv === 1) hero.yuanshen.lv = 3;
    const pid = BD().PILL.id;
    if (hero.mats[pid] === 0) hero.mats[pid] = 50;
  }

  function migrate(hero) {
    if (!hero) return;
    ensureStructure(hero);
  }

  function level(hero) {
    if (!hero || !hero.yuanshen) return 1;
    if (typeof hero.yuanshen === "object") return hero.yuanshen.lv || 1;
    return 1;
  }

  function exp(hero) {
    if (!hero || !hero.yuanshen) return 0;
    if (typeof hero.yuanshen === "object") return hero.yuanshen.exp || 0;
    return 0;
  }

  function need(hero) {
    const lv = level(hero);
    const K = BD().CONST;
    if (lv >= K.YS_MAX_LV) return 0;
    return K.YS_EXP_NEED(lv);
  }

  function pool(hero) {
    if (!hero) return 0;
    const y = hero.yuanshen;
    if (y && typeof y === "object") return y.value || 0;
    return typeof y === "number" ? y : 0;
  }

  function multOfLevel(lv) {
    const K = BD().CONST;
    return Math.min(K.YS_MAX_MULT, 1 + Math.floor((lv - 1) / 2));
  }

  function mult(hero) {
    return multOfLevel(level(hero));
  }

  function maxed(hero) {
    return level(hero) >= BD().CONST.YS_MAX_LV;
  }

  function pillCount(hero) {
    const pid = BD().PILL.id;
    return (hero && hero.mats && hero.mats[pid]) || 0;
  }

  function silverCost(hero) {
    const lv = level(hero);
    return (lv + 1) * BD().CONST.YS_SILVER_PER_LV;
  }

  function takePill(hero, n) {
    initHero(hero);
    const K = BD().CONST;
    if (maxed(hero)) {
      return { ok: false, msg: "元神已至最高境界（Lv10 满级），无需继续服用元神丹" };
    }

    const pid = BD().PILL.id;
    const have = (hero.mats && hero.mats[pid]) || 0;
    const count = Math.min(have, Math.max(1, n || 1));
    if (count <= 0) {
      return { ok: false, msg: `${BD().PILL.name}数量不足` };
    }

    hero.mats[pid] -= count;
    const addExp = count * K.YS_PILL_EXP;
    hero.yuanshen.exp += addExp;

    let upCount = 0;
    while (hero.yuanshen.lv < K.YS_MAX_LV) {
      const req = K.YS_EXP_NEED(hero.yuanshen.lv);
      if (hero.yuanshen.exp >= req) {
        hero.yuanshen.exp -= req;
        hero.yuanshen.lv++;
        upCount++;
        hero.yuanshen.value = (hero.yuanshen.value || 0) + K.YS_VALUE_PER_LV * hero.yuanshen.lv;
      } else {
        break;
      }
    }

    if (hero.yuanshen.lv >= K.YS_MAX_LV) {
      hero.yuanshen.exp = 0;
    }

    let msg = "";
    if (upCount > 0) {
      msg = `服下【${BD().PILL.name}】×${count}，元神突破！当前达到 Lv${hero.yuanshen.lv}，附魔倍率提升至 ×${mult(hero)}`;
    } else {
      msg = `服下【${BD().PILL.name}】×${count}，获得 ${addExp} 点元神经验（当前 ${hero.yuanshen.exp}/${need(hero)}）`;
    }
    log(msg);
    return { ok: true, msg };
  }

  function upgradeBySilver(hero) {
    initHero(hero);
    const K = BD().CONST;
    if (maxed(hero)) {
      return { ok: false, msg: "元神已至最高境界（Lv10 满级），无法继续升级" };
    }

    const cost = silverCost(hero);
    if ((hero.silver || 0) < cost) {
      return { ok: false, msg: `银两不足，本次升级需要 ${cost} 银` };
    }

    hero.silver -= cost;
    hero.yuanshen.lv++;
    hero.yuanshen.value = (hero.yuanshen.value || 0) + K.YS_VALUE_PER_LV * hero.yuanshen.lv;
    if (hero.yuanshen.lv >= K.YS_MAX_LV) {
      hero.yuanshen.exp = 0;
    }

    const msg = `消耗 ${cost} 银两，元神成功晋升至 Lv${hero.yuanshen.lv}！附魔倍率生效为 ×${mult(hero)}`;
    log(msg);
    return { ok: true, msg };
  }

  TSQ.Yuanshen = {
    initHero,
    migrate,
    level,
    exp,
    need,
    pool,
    multOfLevel,
    mult,
    maxed,
    pillCount,
    silverCost,
    takePill,
    upgradeBySilver,
    onLog: null
  };
})();

