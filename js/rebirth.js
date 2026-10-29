/* 转生与三转联盟系统逻辑 v1.3
   ─────────────────────────────────────────────────────────────────────
   功能：
   - 一转 / 二转 / 三转条件检查与推进
   - 一转等级换算、潜力与心法经验返还、额外+10潜力、双倍技能经验
   - 二转等级重算、额外+10潜力、资质+10% ⚙、开放活力与历练
   - 三转等级降至 30 级、满级 179、战宠/骑宠限制检查
   - 幻想城 菩提子 处联盟转职：坚韧天选者 / 勇武天选者
   - 6 项专职被动升级（消耗元神，最高 10 级）
   - 转生与被动属性汇总接入 combatStats / totalPrimary
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const RD = () => TSQ.RebirthData;

  function log(msg) {
    if (typeof TSQ.Rebirth.onLog === "function") {
      TSQ.Rebirth.onLog(msg);
    }
  }

  // 一转等级对照计算
  function calcRebirth1Level(lvl) {
    lvl = Math.max(75, Math.round(lvl || 75));
    if (lvl <= 75) return 60;
    if (lvl <= 80) return 60 + Math.round((lvl - 75) * (63 - 60) / 5);
    if (lvl <= 85) return 63 + Math.round((lvl - 80) * (66 - 63) / 5);
    if (lvl <= 90) return 66 + Math.round((lvl - 85) * (70 - 66) / 5);
    if (lvl <= 95) return 70 + Math.round((lvl - 90) * (75 - 70) / 5);
    if (lvl <= 100) return 75 + Math.round((lvl - 95) * (80 - 75) / 5);
    return 80 + Math.floor((lvl - 100) * 0.8);
  }

  // 二转等级对照计算（134→125, 135→126）
  function calcRebirth2Level(lvl) {
    lvl = Math.max(134, Math.round(lvl || 134));
    return Math.max(125, lvl - 9);
  }

  function ensureStructure(hero) {
    if (!hero) return;
    if (typeof hero.rebirth !== "number") hero.rebirth = 0;
    hero.consumables = hero.consumables || {};
    hero.primary = hero.primary || { str: 10, con: 10, agi: 10, int: 10, fai: 10 };
    hero.pending = hero.pending || { str: 0, con: 0, agi: 0, int: 0, fai: 0 };
    hero.equipment = hero.equipment || {};
    if (hero.alliance && typeof hero.alliance === "object") {
      const def = RD().allianceById(hero.alliance.id);
      if (def) {
        hero.alliance.name = def.name;
        hero.alliance.passives = hero.alliance.passives || {};
        def.passives.forEach((p) => {
          if (typeof hero.alliance.passives[p.id] !== "number") {
            hero.alliance.passives[p.id] = 1;
          }
        });
      }
    }
  }

  function initHero(hero) {
    if (!hero) return;
    ensureStructure(hero);
    hero.consumables = hero.consumables || {};
    if (typeof hero.consumables.tianshu !== "number") hero.consumables.tianshu = 1;
    if (typeof hero.consumables.tianjuan_lingdan !== "number") hero.consumables.tianjuan_lingdan = 1;
    if (typeof hero.consumables.tianci_zhufu !== "number") hero.consumables.tianci_zhufu = 1;
  }

  function migrate(hero) {
    if (!hero) return;
    ensureStructure(hero);
  }

  // 一转条件检查
  function canRebirth1(hero) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);
    if (hero.rebirth !== 0) return { ok: false, msg: "当前人物已完成一转！" };
    const req = RD().CONST.REQ.rebirth1;
    if ((hero.level || 1) < req.level) {
      return { ok: false, reason: "level", msg: `人物等级不足 ${req.level} 级（当前：Lv${hero.level}），无法进行一转！` };
    }
    const tianshuCount = (hero.consumables && hero.consumables.tianshu) || 0;
    if (tianshuCount < 1) {
      return { ok: false, reason: "item", msg: "缺少一转至宝道具【天书】，无法开启涅槃转生！" };
    }
    return { ok: true };
  }

  // 执行一转
  function doRebirth1(hero) {
    const chk = canRebirth1(hero);
    if (!chk.ok) return chk;

    // 扣除天书
    hero.consumables.tianshu = Math.max(0, (hero.consumables.tianshu || 0) - 1);

    const oldLv = hero.level;
    const newLv = calcRebirth1Level(oldLv);

    // 1. 自由潜力点全部返还 + 额外 +10 潜力
    const clsDef = (TSQ.DATA && TSQ.DATA.classes && TSQ.DATA.classes[hero.class_id]) || {};
    const basePri = clsDef.base || { str: 10, con: 10, agi: 10, int: 10, fai: 10 };
    let spentPoints = 0;
    ["str", "con", "agi", "int", "fai"].forEach((k) => {
      const added = Math.max(0, (hero.primary[k] || 0) - (basePri[k] || 0));
      spentPoints += added;
      hero.primary[k] = basePri[k] || 10;
    });
    hero.unspent = (hero.unspent || 0) + spentPoints + RD().CONST.REQ.rebirth1.bonusPotential;
    hero.pending = { str: 0, con: 0, agi: 0, int: 0, fai: 0 };

    // 2. 心法经验全部返还，心法重置为 1 级，技能等级不变
    const returnedXinfaExp = hero.xinfaExpSpent || 0;
    hero.skillExp = (hero.skillExp || 0) + returnedXinfaExp;
    hero.xinfaExpSpent = 0;
    if (TSQ.SkillData && hero.xinfa) {
      TSQ.SkillData.xinfa.forEach((x) => {
        hero.xinfa[x.id] = 1;
      });
    }
    if (TSQ.Skill) {
      hero.xiuwei = TSQ.Skill.xiuweiOf(hero);
    }

    // 3. 等级调整与转生标记更新
    hero.level = newLv;
    hero.exp = 0;
    hero.exp_need = Math.round(40 + hero.level * 35 + hero.level * hero.level * 2);
    hero.rebirth = 1;

    if (TSQ.Game && typeof TSQ.Game.syncVitals === "function") {
      TSQ.Game.syncVitals(hero);
    }

    const msg = `🎉 人物一转涅槃成功！等级由 Lv${oldLv} 调整为 Lv${newLv}；自由潜力（返还 ${spentPoints} 点 + 额外赠送 10 点）共计增加 ${spentPoints + 10} 点！心法经验全部返还 ${returnedXinfaExp} 点！技能经验获得双倍成长！`;
    log(msg);
    return { ok: true, msg, newLevel: newLv };
  }

  // 二转条件检查
  function canRebirth2(hero) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);
    if (hero.rebirth < 1) return { ok: false, msg: "须先完成一转方可进行二转！" };
    if (hero.rebirth >= 2) return { ok: false, msg: "当前人物已完成二转！" };
    const req = RD().CONST.REQ.rebirth2;
    if ((hero.level || 1) < req.level) {
      return { ok: false, reason: "level", msg: `人物等级不足 ${req.level} 级（当前：Lv${hero.level}），无法进行二转！` };
    }
    const danCount = (hero.consumables && hero.consumables.tianjuan_lingdan) || 0;
    if (danCount < 1) {
      return { ok: false, reason: "item", msg: "缺少二转至宝道具【天卷灵丹】，无法开启二转！" };
    }
    return { ok: true };
  }

  // 执行二转
  function doRebirth2(hero) {
    const chk = canRebirth2(hero);
    if (!chk.ok) return chk;

    // 扣除天卷灵丹
    hero.consumables.tianjuan_lingdan = Math.max(0, (hero.consumables.tianjuan_lingdan || 0) - 1);

    const oldLv = hero.level;
    const newLv = calcRebirth2Level(oldLv);

    hero.unspent = (hero.unspent || 0) + RD().CONST.REQ.rebirth2.bonusPotential;
    hero.rebirthAptBonus = (hero.rebirthAptBonus || 0) + RD().CONST.REQ.rebirth2.aptBonusPct;
    hero.level = newLv;
    hero.exp = 0;
    hero.exp_need = Math.round(40 + hero.level * 35 + hero.level * hero.level * 2);
    hero.rebirth = 2;

    // 开启活力与历练系统
    if (TSQ.Vitality) {
      TSQ.Vitality.ensureVitality(hero);
    }

    if (TSQ.Game && typeof TSQ.Game.syncVitals === "function") {
      TSQ.Game.syncVitals(hero);
    }

    const msg = `🎉 人物二转脱胎换骨成功！等级调整为 Lv${newLv}；获得额外潜力 +10 点！全资质提高 10% ⚙；正式解锁【活力与历练】系统！`;
    log(msg);
    return { ok: true, msg, newLevel: newLv };
  }

  // 三转条件检查
  function canRebirth3(hero) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);
    if (hero.rebirth < 2) return { ok: false, msg: "须先完成二转方可进行三转！" };
    if (hero.rebirth >= 3) return { ok: false, msg: "当前人物已完成三转！" };
    const req = RD().CONST.REQ.rebirth3;
    if ((hero.level || 1) < req.level) {
      return { ok: false, reason: "level", msg: `人物等级不足 ${req.level} 级（当前：Lv${hero.level}），无法进行三转！` };
    }
    const zhufuCount = (hero.consumables && hero.consumables.tianci_zhufu) || 0;
    if (zhufuCount < 1) {
      return { ok: false, reason: "item", msg: "缺少三转神物【天赐祝福】，无法开启三转！" };
    }
    // 检查不能有出战宠物
    if (TSQ.Game && typeof TSQ.Game.fightingPet === "function") {
      const pet = TSQ.Game.fightingPet(hero);
      if (pet) {
        return { ok: false, reason: "pet", msg: `转生时不能有出战宠物（当前：${pet.name}出战中），请先收回宠物！` };
      }
    }
    // 检查不能骑骑宠
    if (hero.mount && hero.mount.riding) {
      return { ok: false, reason: "mount", msg: "转生时不能骑乘骑宠，请先卸鞍休息骑宠！" };
    }
    return { ok: true };
  }

  // 执行三转
  function doRebirth3(hero) {
    const chk = canRebirth3(hero);
    if (!chk.ok) return chk;

    // 扣除天赐祝福
    hero.consumables.tianci_zhufu = Math.max(0, (hero.consumables.tianci_zhufu || 0) - 1);

    const oldLv = hero.level;
    hero.level = RD().CONST.REQ.rebirth3.resetLevel; // 30
    hero.exp = 0;
    hero.exp_need = Math.round(40 + hero.level * 35 + hero.level * hero.level * 2);
    hero.rebirth = 3;

    if (TSQ.Game && typeof TSQ.Game.syncVitals === "function") {
      TSQ.Game.syncVitals(hero);
    }

    const msg = `🌟 人物三转飞升成圣！等级统一重置为 Lv30（等级上限开放至 179 级）；可任意穿戴装备与携带骑宠！请前往幻想城 NPC【菩提子】处选择阵营联盟转职（坚韧天选者 / 勇武天选者）！`;
    log(msg);
    return { ok: true, msg, newLevel: hero.level };
  }

  // 菩提子处加入或切换联盟
  function chooseAlliance(hero, allianceId) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);
    if (hero.rebirth < 3) {
      return { ok: false, msg: "尚未完成人物三转，菩提子不予受职！" };
    }
    const def = RD().allianceById(allianceId);
    if (!def) {
      return { ok: false, msg: "未知的阵营联盟！" };
    }
    if (hero.alliance && hero.alliance.id) {
      return { ok: false, msg: `已加入【${hero.alliance.name || hero.alliance.id}】，联盟二选一，不可更换！` };
    }

    const passives = {};
    def.passives.forEach((p) => {
      // 保留同槽位或已有等级，初始 1 级
      passives[p.id] = (hero.alliance && hero.alliance.passives && hero.alliance.passives[p.id]) || 1;
    });

    hero.alliance = {
      id: def.id,
      name: def.name,
      passives
    };

    const msg = `🤝 已在菩提子处成功转职，加入【${def.name}】！6大阵营被动技能已激活，消耗元神即可研习精进！`;
    log(msg);
    return { ok: true, msg, alliance: hero.alliance };
  }

  // 升级联盟被动技能
  function upgradePassive(hero, passiveId) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);
    if (hero.rebirth < 3 || !hero.alliance) {
      return { ok: false, msg: "尚未加入三转阵营联盟！" };
    }
    const alDef = RD().allianceById(hero.alliance.id);
    if (!alDef) return { ok: false, msg: "联盟数据异常" };
    const pDef = alDef.passives.find((p) => p.id === passiveId);
    if (!pDef) return { ok: false, msg: "未找到该被动技能" };

    const curLv = (hero.alliance.passives && hero.alliance.passives[passiveId]) || 1;
    if (curLv >= RD().CONST.MAX_PASSIVE_LEVEL) {
      return { ok: false, msg: `【${pDef.name}】已达到最高等级（Lv.${RD().CONST.MAX_PASSIVE_LEVEL}），无法继续升级！` };
    }

    const cost = RD().CONST.PASSIVE_UPGRADE_COST(curLv);
    hero.yuanshen = hero.yuanshen || { value: 0 };
    if ((hero.yuanshen.value || 0) < cost) {
      return { ok: false, msg: `元神不足！升级【${pDef.name}】升至 Lv.${curLv + 1} 需消耗 ${cost.toLocaleString()} 元神（当前：${(hero.yuanshen.value || 0).toLocaleString()}）。` };
    }

    hero.yuanshen.value -= cost;
    hero.alliance.passives[passiveId] = curLv + 1;

    const msg = `⚡ 消耗 ${cost.toLocaleString()} 元神，【${pDef.name}】成功突破升至 Lv.${curLv + 1}！战斗属性已实时增强！`;
    log(msg);
    return { ok: true, msg, level: curLv + 1 };
  }

  // 转生与联盟被动属性加成（供 totalPrimary 与 combatStats 汇总调用）
  function bonus(hero) {
    const flat = {};
    const pct = {};
    if (!hero) return { flat, pct };

    // 二转资质 +10% ⚙（体现为生命、双攻、双防百分比提升）
    if ((hero.rebirth || 0) >= 2) {
      const aptPct = hero.rebirthAptBonus || 0.10;
      pct.hp_pct = (pct.hp_pct || 0) + aptPct;
      pct.patk_pct = (pct.patk_pct || 0) + aptPct;
      pct.matk_pct = (pct.matk_pct || 0) + aptPct;
      pct.pdef_pct = (pct.pdef_pct || 0) + aptPct;
      pct.mdef_pct = (pct.mdef_pct || 0) + aptPct;
    }

    // 三转联盟被动加成
    if ((hero.rebirth || 0) >= 3 && hero.alliance && hero.alliance.id) {
      const def = RD().allianceById(hero.alliance.id);
      if (def && hero.alliance.passives) {
        def.passives.forEach((p) => {
          const lv = hero.alliance.passives[p.id] || 0;
          if (lv > 0 && typeof p.calc === "function") {
            const st = p.calc(lv);
            Object.entries(st).forEach(([k, v]) => {
              if (k.endsWith("_pct")) {
                pct[k] = (pct[k] || 0) + v;
              } else {
                flat[k] = (flat[k] || 0) + v;
              }
            });
          }
        });
      }
    }

    return { flat, pct };
  }

  // 演示辅助：备齐转生道具
  function grantDemoRebirthPack(hero) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);
    hero.consumables = hero.consumables || {};
    hero.consumables.tianshu = (hero.consumables.tianshu || 0) + 1;
    hero.consumables.tianjuan_lingdan = (hero.consumables.tianjuan_lingdan || 0) + 1;
    hero.consumables.tianci_zhufu = (hero.consumables.tianci_zhufu || 0) + 1;
    const msg = "⚙ 演示辅助：已获赠转生至宝【天书】×1、【天卷灵丹】×1、【天赐祝福】×1！";
    log(msg);
    return { ok: true, msg };
  }

  // 演示辅助：设定测试等级
  function setDemoLevel(hero, lv) {
    if (!hero) return;
    hero.level = Math.max(1, Math.min(179, Math.round(lv)));
    hero.exp = 0;
    hero.exp_need = Math.round(40 + hero.level * 35 + hero.level * hero.level * 2);
    if (TSQ.Game && typeof TSQ.Game.syncVitals === "function") {
      TSQ.Game.syncVitals(hero);
    }
    const msg = `⚙ 演示辅助：已将人物等级设为 Lv${hero.level}！`;
    log(msg);
    return { ok: true, msg };
  }

  TSQ.Rebirth = {
    initHero,
    migrate,
    calcRebirth1Level,
    calcRebirth2Level,
    canRebirth1,
    doRebirth1,
    canRebirth2,
    doRebirth2,
    canRebirth3,
    doRebirth3,
    chooseAlliance,
    upgradePassive,
    bonus,
    grantDemoRebirthPack,
    setDemoLevel,
    onLog: null
  };
})();
