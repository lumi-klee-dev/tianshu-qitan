/* 结义系统逻辑 v1.2
   ─────────────────────────────────────────────────────────────────────
   功能：
   - 结义初始化与旧档 migrate 兼容（初始开启结义、3名NPC兄弟、200契合度）
   - 演示结义开关（toggleSworn）
   - 演示「过一周」（每周 −50 契合度）
   - 结义任务（各显神通等补契合度，并奖励骑宠领悟丹「凝神丹」）
   - 结义奖励：金兰戒指（入包）、结义徽章（入徽章账本）、2小时金兰同心buff（进 combatStats）
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const SD = () => TSQ.SwornData;

  function log(msg) {
    if (typeof TSQ.Sworn.onLog === "function") {
      TSQ.Sworn.onLog(msg);
    }
  }

  function ensureStructure(hero) {
    if (!hero) return;
    if (!hero.sworn) {
      hero.sworn = {
        enabled: false,                               // 默认关闭结义
        title: "生死与共",
        harmony: 0,
        maxHarmony: SD().CONST.MAX_HARMONY,           // 1000
        weeksPassed: 0,
        buffUntil: 0,
        ringAwarded: false,
        badgeAwarded: false,
        brothers: JSON.parse(JSON.stringify(SD().NPC_BROTHERS))
      };
    }
    if (typeof hero.sworn.enabled !== "boolean") hero.sworn.enabled = false;
    if (typeof hero.sworn.harmony !== "number") hero.sworn.harmony = 0;
    if (typeof hero.sworn.maxHarmony !== "number") hero.sworn.maxHarmony = SD().CONST.MAX_HARMONY;
    if (typeof hero.sworn.weeksPassed !== "number") hero.sworn.weeksPassed = 0;
    if (typeof hero.sworn.buffUntil !== "number") hero.sworn.buffUntil = 0;
    if (typeof hero.sworn.ringAwarded !== "boolean") hero.sworn.ringAwarded = false;
    if (typeof hero.sworn.badgeAwarded !== "boolean") hero.sworn.badgeAwarded = false;
    if (!Array.isArray(hero.sworn.brothers) || hero.sworn.brothers.length === 0) {
      hero.sworn.brothers = JSON.parse(JSON.stringify(SD().NPC_BROTHERS));
    }
    hero.consumables = hero.consumables || {};
  }

  function initHero(hero) {
    if (!hero) return;
    ensureStructure(hero);
  }

  function migrate(hero) {
    if (!hero) return;
    ensureStructure(hero);
  }

  // 检查是否满足结义条件（>40 级、亲密度 >100、道具 金兰香/桃园酒/八拜案）
  function canSworn(hero) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);
    if ((hero.level || 1) <= SD().CONST.REQ_LEVEL) {
      return { ok: false, reason: "level", msg: `人物等级需大于 ${SD().CONST.REQ_LEVEL} 级（当前：Lv${hero.level}），尚未达到结义要求！` };
    }
    const brothers = hero.sworn.brothers || [];
    if (brothers.length < 2) {
      return { ok: false, reason: "brothers", msg: "结义人数不足（需 3~8 人）！" };
    }
    const lowIntimacy = brothers.find((b) => (b.intimacy || 0) <= SD().CONST.REQ_INTIMACY);
    if (lowIntimacy) {
      return { ok: false, reason: "intimacy", msg: `兄弟【${lowIntimacy.name}】亲密度未达标（当前 ${lowIntimacy.intimacy}，需 >${SD().CONST.REQ_INTIMACY}）！` };
    }
    const lowLv = brothers.find((b) => (b.level || 1) <= SD().CONST.REQ_LEVEL);
    if (lowLv) {
      return { ok: false, reason: "brother_level", msg: `兄弟【${lowLv.name}】等级未达标（当前 Lv${lowLv.level}，需 >${SD().CONST.REQ_LEVEL}）！` };
    }
    const c = hero.consumables || {};
    const missing = [];
    if ((c.jinlan_xiang || 0) < 1) missing.push("金兰香");
    if ((c.taoyuan_jiu || 0) < 1) missing.push("桃园酒");
    if ((c.babai_an || 0) < 1) missing.push("八拜案");
    if (missing.length > 0) {
      return { ok: false, reason: "items", msg: `结义信物不足，缺少：${missing.join("、")}！可在结义使者处备齐。` };
    }
    return { ok: true };
  }

  // 购买/备齐结义道具（消耗 15,000 银两）
  function buySwornItems(hero) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);
    const cost = 15000;
    if ((hero.silver || 0) < cost) {
      return { ok: false, msg: `银两不足！备齐金兰香、桃园酒、八拜案需 ${cost} 银两（当前：${hero.silver || 0}）。` };
    }
    hero.silver -= cost;
    hero.consumables = hero.consumables || {};
    hero.consumables.jinlan_xiang = (hero.consumables.jinlan_xiang || 0) + 1;
    hero.consumables.taoyuan_jiu = (hero.consumables.taoyuan_jiu || 0) + 1;
    hero.consumables.babai_an = (hero.consumables.babai_an || 0) + 1;
    const msg = "已在结义使者处备齐金兰香×1、桃园酒×1、八拜案×1（消耗 15,000 银两）！";
    log(msg);
    return { ok: true, msg };
  }

  // 执行八拜结义仪式
  function doSworn(hero) {
    ensureStructure(hero);
    const sw = hero.sworn;
    if (sw.enabled) {
      return { ok: false, msg: "您已处于结义状态！" };
    }
    const chk = canSworn(hero);
    if (!chk.ok) return chk;

    // 扣除信物道具
    hero.consumables.jinlan_xiang = Math.max(0, (hero.consumables.jinlan_xiang || 0) - 1);
    hero.consumables.taoyuan_jiu = Math.max(0, (hero.consumables.taoyuan_jiu || 0) - 1);
    hero.consumables.babai_an = Math.max(0, (hero.consumables.babai_an || 0) - 1);

    sw.enabled = true;
    sw.harmony = SD().CONST.INITIAL_HARMONY;
    sw.buffUntil = Date.now() + SD().CONST.BUFF_DURATION_MS;
    if (TSQ.Badge && !sw.badgeAwarded) {
      TSQ.Badge.grant(hero, "jieyi", 1);
      sw.badgeAwarded = true;
    }
    if (!sw.ringAwarded && TSQ.EQ && hero.bag) {
      try {
        const ring = TSQ.EQ.makeItem("jinlan_ring", { color: "purple", bound: true });
        hero.bag.push({ kind: "equip", item: ring });
        sw.ringAwarded = true;
      } catch (e) {}
    }
    const msg = "金兰结义誓成！八拜为交，同生共死！金兰戒指、结义徽章与2小时【金兰同心】增益Buff已生效！";
    log(msg);
    return { ok: true, msg };
  }

  function toggleSworn(hero) {
    ensureStructure(hero);
    const sw = hero.sworn;
    if (sw.enabled) {
      sw.enabled = false;
      sw.buffUntil = 0;
      const msg = "已解除金兰结义状态。兄弟散去，金兰Buff与同心加成失效。";
      log(msg);
      return { ok: true, msg };
    } else {
      return doSworn(hero);
    }
  }

  function passOneWeek(hero) {
    initHero(hero);
    const sw = hero.sworn;
    if (!sw.enabled) {
      return { ok: false, msg: "当前未处于结义状态，无法模拟时间流逝！" };
    }

    const prev = sw.harmony;
    sw.harmony = Math.max(0, sw.harmony - SD().CONST.WEEK_DECAY);
    sw.weeksPassed = (sw.weeksPassed || 0) + 1;

    let msg = `时光流转过了一周（第 ${sw.weeksPassed} 周），结义契合度 −${SD().CONST.WEEK_DECAY}（${prev} → ${sw.harmony}）！`;
    if (sw.harmony === 0) {
      sw.buffUntil = 0;
      msg += " 契合度已降为 0，【金兰同心】Buff 暂时熄灭！请完成结义任务补充契合度。";
    }
    log(msg);
    return { ok: true, msg, harmony: sw.harmony };
  }

  function doQuest(hero, questId) {
    initHero(hero);
    const sw = hero.sworn;
    if (!sw.enabled) {
      return { ok: false, msg: "尚未结义，请先在结义使者处完成八拜结义！" };
    }

    const q = SD().QUESTS.find((item) => item.id === questId) || SD().QUESTS[0];
    const today = new Date().toDateString();
    sw.questDone = sw.questDone || {};
    if (sw.questDone[q.id] === today) return { ok: false, msg: `今日已完成【${q.name}】，明日再来！` };
    sw.questDone[q.id] = today;
    const prev = sw.harmony;
    sw.harmony = Math.min(sw.maxHarmony || 1000, sw.harmony + q.harmonyReward);

    let extraMsg = "";
    if (q.pillReward) {
      hero.consumables = hero.consumables || {};
      hero.consumables[q.pillReward] = (hero.consumables[q.pillReward] || 0) + (q.pillCount || 1);
      extraMsg += `，获赠骑宠领悟丹【凝神丹】×${q.pillCount || 1}`;
    }
    if (q.silverReward) {
      hero.silver = (hero.silver || 0) + q.silverReward;
      extraMsg += `，获得银两 +${q.silverReward}`;
    }

    // 若契合度恢复且 buff 熄灭，自动重新激活 buff
    if (sw.buffUntil < Date.now()) {
      sw.buffUntil = Date.now() + SD().CONST.BUFF_DURATION_MS;
      extraMsg += "，【金兰同心】Buff 已重新激活（持续2小时）！";
    }

    const msg = `完成结义任务【${q.name}】！契合度 +${q.harmonyReward}（${prev} → ${sw.harmony}）${extraMsg}！`;
    log(msg);
    return { ok: true, msg, harmony: sw.harmony };
  }

  function activateBuff(hero) {
    initHero(hero);
    const sw = hero.sworn;
    if (!sw.enabled) {
      return { ok: false, msg: "未结义无法激活同心Buff！" };
    }
    if (sw.harmony <= 0) {
      return { ok: false, msg: "契合度不足 0，请先完成结义任务补充契合度！" };
    }

    sw.buffUntil = Date.now() + SD().CONST.BUFF_DURATION_MS;
    const msg = "【金兰同心】2小时战斗增益Buff已激活/续期！生命上限+5%、物攻+3%、法攻+3%、双攻+240、生命+3000！";
    log(msg);
    return { ok: true, msg };
  }

  function isBuffActive(hero) {
    if (!hero || !hero.sworn || !hero.sworn.enabled) return false;
    return hero.sworn.harmony > 0 && hero.sworn.buffUntil > Date.now();
  }

  function getBuffRemainingSeconds(hero) {
    if (!isBuffActive(hero)) return 0;
    return Math.max(0, Math.floor((hero.sworn.buffUntil - Date.now()) / 1000));
  }

  function bonus(hero) {
    if (!isBuffActive(hero)) {
      return { flat: {}, pct: {} };
    }
    return SD().BUFF_DEF.stats;
  }

  TSQ.Sworn = {
    initHero,
    migrate,
    canSworn,
    buySwornItems,
    doSworn,
    toggleSworn,
    passOneWeek,
    doQuest,
    activateBuff,
    isBuffActive,
    getBuffRemainingSeconds,
    bonus,
    onLog: null
  };
})();

