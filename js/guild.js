/* 帮会武功系统逻辑 v1.2
   ─────────────────────────────────────────────────────────────────────
   功能：
   - 帮会数据初始化与旧档 migrate 兼容
   - 帮会科技准入判定（等级 ≥125、帮会活跃度 ≥3000）
   - 6 项武功升级（10级 × 10星，每星 +0.5% 对应属性）
   - 消耗帮贡 + 银两 + 元魄升级
   - 帮会捐献官（捐献上古神器碎片 3250、失落的锻造法 1.9万、醒悟丹 5万 兑换元魄与帮贡）
   - 人物属性汇总接入（供 totalPrimary 与 combatStats 调用）
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const GD = () => TSQ.GuildData;

  function log(msg) {
    if (typeof TSQ.Guild.onLog === "function") {
      TSQ.Guild.onLog(msg);
    }
  }

  function ensureStructure(hero) {
    if (!hero) return;
    if (!hero.guild) {
      hero.guild = {
        name: "天书盟",
        level: 1,
        activity: 0,
        contrib: 0,
        yuanpo: 0,
        techCapLevel: GD().CONST.DEFAULT_TECH_CAP_LEVEL,
        techCapStar: GD().CONST.DEFAULT_TECH_CAP_STAR,
        skills: {}
      };
    }
    hero.guild.skills = hero.guild.skills || {};
    GD().SKILLS.forEach((s) => {
      if (!hero.guild.skills[s.id]) {
        hero.guild.skills[s.id] = { level: 1, star: 0 };
      }
    });
    if (typeof hero.guild.activity !== "number") hero.guild.activity = 0;
    if (typeof hero.guild.contrib !== "number") hero.guild.contrib = 0;
    if (typeof hero.guild.yuanpo !== "number") hero.guild.yuanpo = 0;
    if (typeof hero.guild.techCapLevel !== "number") hero.guild.techCapLevel = GD().CONST.DEFAULT_TECH_CAP_LEVEL;
    if (typeof hero.guild.techCapStar !== "number") hero.guild.techCapStar = GD().CONST.DEFAULT_TECH_CAP_STAR;
  }

  function initHero(hero) {
    if (!hero) return;
    ensureStructure(hero);
    // 新建角色时发放演示资源
    if (hero.guild.contrib === 0 && hero.guild.yuanpo === 0 && hero.guild.activity === 0) {
      hero.guild.level = 5;
      hero.guild.activity = 3500;
      hero.guild.contrib = 9500;
      hero.guild.yuanpo = 85000;
    }
  }

  function migrate(hero) {
    if (!hero) return;
    ensureStructure(hero);
  }

  function canUseTech(hero) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    initHero(hero);
    if ((hero.level || 1) < GD().CONST.REQ_LEVEL) {
      return {
        ok: false,
        reason: "level",
        msg: `人物等级不足 ${GD().CONST.REQ_LEVEL} 级（当前：Lv${hero.level}），尚未开启帮会武功科技研习！`
      };
    }
    if ((hero.guild.activity || 0) < GD().CONST.REQ_ACTIVITY) {
      return {
        ok: false,
        reason: "activity",
        msg: `帮会活跃度不足 ${GD().CONST.REQ_ACTIVITY}（当前：${hero.guild.activity}），帮会科技未激活！`
      };
    }
    return { ok: true };
  }

  function upgradeSkill(hero, skillId) {
    const chk = canUseTech(hero);
    if (!chk.ok) return chk;

    const def = GD().skillById(skillId);
    if (!def) return { ok: false, msg: "未找到该帮会武功项目" };

    const sk = hero.guild.skills[skillId] || { level: 1, star: 0 };
    hero.guild.skills[skillId] = sk;

    // 检查是否已达最高上限 10 级 10 星
    if (sk.level >= GD().CONST.MAX_LEVEL && sk.star >= GD().CONST.MAX_STAR) {
      return { ok: false, msg: `【${def.name}】已达到最高境界（${GD().CONST.MAX_LEVEL}级满星），无法继续升级！` };
    }

    // 检查帮会开放上限（捐献官展示的帮会科技上限）
    if (sk.level > hero.guild.techCapLevel || (sk.level === hero.guild.techCapLevel && sk.star >= hero.guild.techCapStar)) {
      return {
        ok: false,
        msg: `已达帮会当前开放的武功上限（${hero.guild.techCapLevel}级 · ${hero.guild.techCapStar}星），请等待帮会进一步拓展科技！`
      };
    }

    const cost = GD().calcUpgradeCost(sk.level, sk.star);

    // 校验帮贡
    if ((hero.guild.contrib || 0) < cost.contrib) {
      return { ok: false, msg: `帮会贡献不足！需要 ${cost.contrib} 帮贡（当前持有：${hero.guild.contrib || 0} 点）` };
    }
    // 校验银两
    if ((hero.silver || 0) < cost.silver) {
      return { ok: false, msg: `银两不足！需要 ${cost.silver} 银两（当前持有：${hero.silver || 0} 银）` };
    }
    // 校验元魄
    if ((hero.guild.yuanpo || 0) < cost.yuanpo) {
      return { ok: false, msg: `元魄不足！需要 ${cost.yuanpo} 元魄（当前持有：${hero.guild.yuanpo || 0} 点，可在捐献官处捐献获取）` };
    }

    // 扣除消耗
    hero.guild.contrib -= cost.contrib;
    hero.silver -= cost.silver;
    hero.guild.yuanpo -= cost.yuanpo;

    // 升级逻辑：0~8星点击升星；9星升星则晋级下一级 0星；10级时最高至10星
    const oldLv = sk.level;
    const oldStar = sk.star;
    if (sk.star < 9) {
      sk.star += 1;
    } else if (sk.star === 9) {
      if (sk.level < GD().CONST.MAX_LEVEL) {
        sk.level += 1;
        sk.star = 0;
      } else {
        sk.star = 10;
      }
    } else {
      sk.star = 10;
    }

    const msg = `【${def.name}】精进突破！消耗 ${cost.contrib} 帮贡、${cost.silver} 银两、${cost.yuanpo} 元魄，境界由【${oldLv}级·${oldStar}星】晋升至【${sk.level}级·${sk.star}星】！属性增益实时生效！`;
    log(msg);
    return { ok: true, msg, level: sk.level, star: sk.star };
  }

  function donate(hero, donateId) {
    initHero(hero);
    const d = GD().DONATIONS.find((item) => item.id === donateId);
    if (!d) return { ok: false, msg: "未找到该捐献项" };

    if (d.silverCost) {
      if ((hero.silver || 0) < d.silverCost) {
        return { ok: false, msg: `银两不足，需要 ${d.silverCost} 银两` };
      }
      hero.silver -= d.silverCost;
    } else if (d.matId) {
      hero.mats = hero.mats || {};
      const count = hero.mats[d.matId] || 0;
      if (count < (d.costNum || 1)) {
        return { ok: false, msg: `材料【${d.matName}】不足（需要 ${d.costNum || 1} 个，当前持有：${count}）` };
      }
      hero.mats[d.matId] -= (d.costNum || 1);
    }

    hero.guild.yuanpo = (hero.guild.yuanpo || 0) + d.yuanpoGain;
    hero.guild.contrib = (hero.guild.contrib || 0) + d.contribGain;

    const msg = `向帮会捐献官成功${d.name}！获得【元魄】+${d.yuanpoGain}、帮会贡献 +${d.contribGain}！`;
    log(msg);
    return { ok: true, msg, yuanpo: hero.guild.yuanpo, contrib: hero.guild.contrib };
  }

  function claimSalary(hero) {
    initHero(hero);
    const today = new Date().toDateString();
    if (hero.guild.lastSalaryDay === today) return { ok: false, msg: "今日俸禄已领取，明日再来！" };
    hero.guild.lastSalaryDay = today;
    const addContrib = 3000;
    const addYuanpo = 20000;
    hero.guild.contrib = (hero.guild.contrib || 0) + addContrib;
    hero.guild.yuanpo = (hero.guild.yuanpo || 0) + addYuanpo;

    const msg = `领取今日帮会科技俸禄津贴！获得 帮会贡献 +${addContrib}、元魄 +${addYuanpo}！`;
    log(msg);
    return { ok: true, msg, contrib: hero.guild.contrib, yuanpo: hero.guild.yuanpo };
  }

  function bonus(hero) {
    const flat = {};
    const pct = {};
    let extraRage = 0;

    if (!hero || !hero.guild || !hero.guild.skills) {
      return { flat, pct, rage: extraRage };
    }

    GD().SKILLS.forEach((s) => {
      const sk = hero.guild.skills[s.id];
      if (!sk || (sk.level <= 1 && sk.star <= 0)) return;
      const b = s.calcBonus(sk.level, sk.star);
      if (b.flat) {
        for (const [k, v] of Object.entries(b.flat)) {
          flat[k] = (flat[k] || 0) + v;
        }
      }
      if (b.pct) {
        for (const [k, v] of Object.entries(b.pct)) {
          pct[k] = (pct[k] || 0) + v;
        }
      }
      if (b.rage) {
        extraRage += b.rage;
      }
    });

    return { flat, pct, rage: extraRage };
  }

  TSQ.Guild = {
    initHero,
    migrate,
    canUseTech,
    upgradeSkill,
    donate,
    claimSalary,
    bonus,
    onLog: null
  };
})();

