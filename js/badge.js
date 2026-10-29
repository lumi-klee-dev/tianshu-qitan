/* 徽章系统逻辑 v0.8
   ─────────────────────────────────────────────────────────────────────
   功能：
   - 徽章佩戴 / 卸下（佩戴上限 ⚙ 默认 3 枚）
   - 徽章属性汇总（供人物属性与战斗结算计算，支持基础属性与百分比属性）
   - 演示徽章发放与旧档 migrate 兼容
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const BD = () => TSQ.BadgeData;
  let logFn = null;
  function log(msg) {
    if (typeof TSQ.Badge.onLog === "function") TSQ.Badge.onLog(msg);
  }

  function ensureStructure(hero) {
    if (!hero) return;
    hero.badges = hero.badges || { worn: [], owned: {} };
    if (!Array.isArray(hero.badges.worn)) hero.badges.worn = [];
    if (!hero.badges.owned || typeof hero.badges.owned !== "object") hero.badges.owned = {};
  }

  function initHero(hero) {
    if (!hero) return;
    ensureStructure(hero);

    const demo = BD().CONST.DEMO;
    if (Object.keys(hero.badges.owned).length === 0) {
      demo.grantBadges.forEach((id) => {
        hero.badges.owned[id] = { lv: 1 };
      });
      hero.badges.worn = demo.wearBadges.slice(0, BD().CONST.MAX_WEAR);
    }
  }

  function migrate(hero) {
    if (!hero) return;
    ensureStructure(hero);
  }

  function list(hero) {
    initHero(hero);
    const owned = (hero && hero.badges && hero.badges.owned) || {};
    const worn = (hero && hero.badges && hero.badges.worn) || [];
    return BD().BADGES.map((def) => {
      const isOwned = !!owned[def.id];
      const isWorn = worn.includes(def.id);
      const lv = isOwned && owned[def.id].lv ? owned[def.id].lv : 1;
      return { def, owned: isOwned, worn: isWorn, lv };
    });
  }

  function wear(hero, id) {
    initHero(hero);
    const def = BD().badgeById(id);
    if (!def) return { ok: false, msg: "未找到该徽章数据" };

    const owned = hero.badges.owned || {};
    if (!owned[id]) return { ok: false, msg: `尚未拥有【${def.name}】` };

    const worn = hero.badges.worn;
    if (worn.includes(id)) return { ok: false, msg: `【${def.name}】已在佩戴中` };

    const max = BD().CONST.MAX_WEAR;
    if (worn.length >= max) {
      return { ok: false, msg: `徽章佩戴已达上限（最多 ${max} 枚），请先卸下其它徽章` };
    }

    worn.push(id);
    const msg = `佩戴徽章【${def.name}】，属性加成已生效`;
    log(msg);
    return { ok: true, msg };
  }

  function takeOff(hero, id) {
    initHero(hero);
    const def = BD().badgeById(id);
    const name = def ? def.name : id;
    const worn = hero.badges.worn;
    const idx = worn.indexOf(id);
    if (idx === -1) return { ok: false, msg: `【${name}】未处于佩戴状态` };

    worn.splice(idx, 1);
    const msg = `已卸下徽章【${name}】`;
    log(msg);
    return { ok: true, msg };
  }

  function bonus(hero) {
    const flat = {}, pct = {};
    if (!hero || !hero.badges || !Array.isArray(hero.badges.worn)) return { flat, pct };

    const pctStats = (TSQ.EQ && TSQ.EQ.pctStats) || ["hp_pct", "patk_pct", "matk_pct", "spd_pct"];
    hero.badges.worn.forEach((id) => {
      const def = BD().badgeById(id);
      if (!def || !def.stats) return;
      for (const [k, v] of Object.entries(def.stats)) {
        if (pctStats.includes(k)) {
          pct[k] = (pct[k] || 0) + v;
        } else {
          flat[k] = (flat[k] || 0) + v;
        }
      }
    });
    return { flat, pct };
  }

  function statText(def) {
    if (!def || !def.stats) return "";
    const pctStats = (TSQ.EQ && TSQ.EQ.pctStats) || ["hp_pct", "patk_pct", "matk_pct", "spd_pct"];
    const statNames = (TSQ.EQ && TSQ.EQ.statNames) || {
      hp: "生命", mp: "法力", patk: "物攻", matk: "法攻", pdef: "物防", mdef: "法防",
      hit: "命中", pdodge: "闪避", mdodge: "法闪", pcrit: "物暴", mcrit: "法暴", spd: "速度",
      str: "强壮", con: "耐力", agi: "敏捷", int: "智力", fai: "信仰"
    };
    return Object.entries(def.stats).map(([k, v]) => {
      const name = statNames[k] || k;
      return pctStats.includes(k) ? `${name} +${Math.round(v * 1000)}‰` : `${name} +${v}`;
    }).join("　");
  }

  function grant(hero, id, lv = 1) {
    initHero(hero);
    const def = BD().badgeById(id);
    if (!def) return false;
    hero.badges.owned[id] = { lv };
    return true;
  }

  TSQ.Badge = {
    initHero,
    migrate,
    list,
    wear,
    takeOff,
    bonus,
    statText,
    grant,
    onLog: null
  };
})();

