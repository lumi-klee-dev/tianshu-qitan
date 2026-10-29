/* 活力与历练系统逻辑 v1.3
   ─────────────────────────────────────────────────────────────────────
   来源：
   - 规格：_brief/spec-r10.md §7.10 活力与历练
   - 解锁条件：人物二转后开放（hero.rebirth >= 2）；
   - 活力属性：上限 1000，自然恢复速度每小时 +10 ⚙（真实离线时间累积，读档补算，封顶 1000）；
   - 活力挂机：每点活力换 1100~2500 元神（按人物修为插值计算）；
   - 历练任务：日常历练列表一项（每日 3 次 ⚙，奖励元神/人物经验/银两）。
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const CONST = {
    MAX_VITALITY: 1000,
    RECOVER_PER_HOUR: 10,
    MS_PER_POINT: 360 * 1000, // 360 秒（6 分钟）恢复 1 点活力 = 10 点 / 小时
    BASE_RATE: 1100,          // 基础元神转化率
    MAX_RATE: 2500,           // 最高元神转化率
    RATE_XIUWEI_CAP: 10000,   // 达到最高转化率所需修为
    DAILY_QUEST_MAX: 3,       // 每日历练任务次数 ⚙
    DAILY_QUEST_REWARD: {
      yuanshen: 50000,
      exp: 80000,
      silver: 20000
    }
  };

  function log(msg) {
    if (typeof TSQ.Vitality.onLog === "function") {
      TSQ.Vitality.onLog(msg);
    }
  }

  function isUnlocked(hero) {
    return !!(hero && (hero.rebirth || 0) >= 2);
  }

  // 补齐并结算离线自然恢复
  function ensureVitality(hero) {
    if (!hero) return;
    hero.equipment = hero.equipment || {};
    hero.primary = hero.primary || { str: 10, con: 10, agi: 10, int: 10, fai: 10 };
    hero.pending = hero.pending || { str: 0, con: 0, agi: 0, int: 0, fai: 0 };
    if (!hero.vitality || typeof hero.vitality !== "object") {
      hero.vitality = {
        current: 0,
        max: CONST.MAX_VITALITY,
        lastRecoverTime: Date.now(),
        dailyQuestsDone: 0,
        lastQuestDay: new Date().toDateString()
      };
    }

    if (typeof hero.vitality.max !== "number") hero.vitality.max = CONST.MAX_VITALITY;
    if (typeof hero.vitality.current !== "number") hero.vitality.current = 0;
    if (typeof hero.vitality.dailyQuestsDone !== "number") hero.vitality.dailyQuestsDone = 0;
    if (typeof hero.vitality.lastRecoverTime !== "number") hero.vitality.lastRecoverTime = Date.now();

    // 跨天重置历练任务次数
    const today = new Date().toDateString();
    if (hero.vitality.lastQuestDay !== today) {
      hero.vitality.lastQuestDay = today;
      hero.vitality.dailyQuestsDone = 0;
    }

    // 仅在二转开放后自然恢复活力
    if (isUnlocked(hero)) {
      const now = Date.now();
      const elapsed = Math.max(0, now - hero.vitality.lastRecoverTime);
      const addPoints = Math.floor(elapsed / CONST.MS_PER_POINT);
      if (addPoints > 0) {
        hero.vitality.current = Math.min(hero.vitality.max, hero.vitality.current + addPoints);
        hero.vitality.lastRecoverTime += addPoints * CONST.MS_PER_POINT;
      }
    } else {
      hero.vitality.lastRecoverTime = Date.now(); // 未开放时不累积
    }
  }

  function initHero(hero) {
    if (!hero) return;
    ensureVitality(hero);
    if (isUnlocked(hero)) {
      hero.vitality.current = CONST.MAX_VITALITY;
    }
  }

  function migrate(hero) {
    if (!hero) return;
    ensureVitality(hero);
  }

  // 计算每点活力的元神转化率（1100 ~ 2500 按人物修为插值）
  function calcExchangeRate(hero) {
    if (!hero) return CONST.BASE_RATE;
    const xw = hero.xiuwei || 0;
    const ratio = Math.min(1, Math.max(0, xw / CONST.RATE_XIUWEI_CAP));
    return Math.round(CONST.BASE_RATE + ratio * (CONST.MAX_RATE - CONST.BASE_RATE));
  }

  // 活力挂机换元神
  function cultivate(hero, amount) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureVitality(hero);

    if (!isUnlocked(hero)) {
      return { ok: false, msg: "活力挂机尚未开放（人物二转后解锁）！" };
    }

    const cur = hero.vitality.current || 0;
    if (cur <= 0) {
      return { ok: false, msg: "当前活力不足（0/1000），请等待活力随时间自然恢复（每小时 +10 点）！" };
    }

    const toSpend = Math.max(1, Math.min(cur, Math.round(amount || cur)));
    const rate = calcExchangeRate(hero);
    const gainYuanshen = toSpend * rate;

    hero.vitality.current -= toSpend;
    hero.yuanshen = hero.yuanshen || { value: 0 };
    hero.yuanshen.value = (hero.yuanshen.value || 0) + gainYuanshen;

    const msg = `🧘 活力挂机打坐完毕！消耗 ${toSpend} 点活力（按当前修为 ${hero.xiuwei || 0} 换算：${rate} 元神/点），成功凝聚元神 +${gainYuanshen.toLocaleString()}！当前元神存量：${hero.yuanshen.value.toLocaleString()}！`;
    log(msg);
    return { ok: true, msg, spent: toSpend, gained: gainYuanshen, currentVitality: hero.vitality.current };
  }

  // 执行历练日常任务
  function doDailyQuest(hero) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureVitality(hero);

    if (!isUnlocked(hero)) {
      return { ok: false, msg: "历练任务尚未开放（人物二转后解锁）！" };
    }

    const today = new Date().toDateString();
    if (hero.vitality.lastQuestDay !== today) {
      hero.vitality.lastQuestDay = today;
      hero.vitality.dailyQuestsDone = 0;
    }

    if (hero.vitality.dailyQuestsDone >= CONST.DAILY_QUEST_MAX) {
      return { ok: false, msg: `今日历练任务已达上限（${CONST.DAILY_QUEST_MAX}/${CONST.DAILY_QUEST_MAX} 次），明日再来！` };
    }

    hero.vitality.dailyQuestsDone++;
    const rew = CONST.DAILY_QUEST_REWARD;

    hero.yuanshen = hero.yuanshen || { value: 0 };
    hero.yuanshen.value = (hero.yuanshen.value || 0) + rew.yuanshen;
    hero.silver = (hero.silver || 0) + rew.silver;
    hero.exp = (hero.exp || 0) + rew.exp;

    // 经验溢出升级判定
    let leveledUp = false;
    const maxLv = hero.rebirth >= 3 ? 179 : (hero.rebirth >= 2 ? 162 : 139);
    while (hero.exp >= (hero.exp_need || 100) && hero.level < maxLv) {
      hero.exp -= hero.exp_need;
      hero.level += 1;
      hero.unspent = (hero.unspent || 0) + 5;
      hero.exp_need = Math.round(40 + hero.level * 35 + hero.level * hero.level * 2);
      leveledUp = true;
    }

    if (TSQ.Game && typeof TSQ.Game.syncVitals === "function") {
      TSQ.Game.syncVitals(hero);
    }

    let msg = `📜 完成每日历练任务（第 ${hero.vitality.dailyQuestsDone}/${CONST.DAILY_QUEST_MAX} 次）！获得 元神 +${rew.yuanshen.toLocaleString()}、经验 +${rew.exp.toLocaleString()}、银两 +${rew.silver.toLocaleString()}！`;
    if (leveledUp) {
      msg += ` 恭喜人物升至 Lv${hero.level}！`;
    }
    log(msg);
    return { ok: true, msg, doneCount: hero.vitality.dailyQuestsDone };
  }

  // 演示辅助：增加活力
  function addVitality(hero, amount) {
    if (!hero) return;
    ensureVitality(hero);
    hero.vitality.current = Math.min(hero.vitality.max, Math.max(0, (hero.vitality.current || 0) + (amount || 0)));
    return { ok: true, current: hero.vitality.current };
  }

  // 演示辅助：模拟时间流逝（小时）
  function simulateTimeElapsed(hero, hours) {
    if (!hero) return;
    ensureVitality(hero);
    const ms = (hours || 1) * 3600 * 1000;
    hero.vitality.lastRecoverTime = Math.max(0, hero.vitality.lastRecoverTime - ms);
    ensureVitality(hero);
    const msg = `⚙ 演示辅助：时间流逝 ${hours} 小时，当前活力恢复至 ${hero.vitality.current}/${hero.vitality.max} 点！`;
    log(msg);
    return { ok: true, msg, current: hero.vitality.current };
  }

  // 演示辅助：补满活力
  function restoreVitality(hero) {
    if (!hero) return;
    ensureVitality(hero);
    hero.vitality.current = hero.vitality.max;
    hero.vitality.lastRecoverTime = Date.now();
    const msg = "⚙ 演示辅助：活力已补满至 1000/1000 点！";
    log(msg);
    return { ok: true, msg };
  }

  // 演示辅助：重置今日历练日常
  function resetDailyQuest(hero) {
    if (!hero) return;
    ensureVitality(hero);
    hero.vitality.dailyQuestsDone = 0;
    const msg = "⚙ 演示辅助：今日历练任务次数已重置（0/3）！";
    log(msg);
    return { ok: true, msg };
  }

  TSQ.Vitality = {
    CONST,
    isUnlocked,
    ensureVitality,
    initHero,
    migrate,
    calcExchangeRate,
    cultivate,
    doDailyQuest,
    addVitality,
    simulateTimeElapsed,
    restoreVitality,
    resetDailyQuest,
    onLog: null
  };
})();
