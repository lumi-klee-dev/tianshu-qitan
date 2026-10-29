/* 称号系统逻辑 v0.9
   ─────────────────────────────────────────────────────────────────────
   功能：
   - 称号佩戴 / 卸下（同时只能佩戴 1 个）
   - 称号属性汇总（供 totalPrimary 与 combatStats 调用）
   - 演示称号发放与旧档 migrate 兼容
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const TD = () => TSQ.TitleData;
  function log(msg) {
    if (typeof TSQ.Title.onLog === "function") TSQ.Title.onLog(msg);
  }

  function ensureStructure(hero) {
    if (!hero) return;
    hero.titles = hero.titles || { worn: null, owned: {} };
    if (typeof hero.titles.owned !== "object" || hero.titles.owned === null) hero.titles.owned = {};
    hero.title = hero.titles.worn || null;
  }

  function initHero(hero) {
    if (!hero) return;
    ensureStructure(hero);

    const demo = TD().CONST.DEMO;
    if (Object.keys(hero.titles.owned).length === 0) {
      demo.grantTitles.forEach((id) => {
        hero.titles.owned[id] = { acquired: Date.now() };
      });
      hero.titles.worn = demo.defaultWorn || null;
    }
    hero.title = hero.titles.worn;
  }

  function migrate(hero) {
    if (!hero) return;
    ensureStructure(hero);
  }

  function list(hero) {
    initHero(hero);
    const owned = (hero && hero.titles && hero.titles.owned) || {};
    const worn = (hero && hero.titles && hero.titles.worn) || null;
    return TD().TITLES.map((def) => {
      const isOwned = !!owned[def.id];
      const isWorn = worn === def.id;
      return { def, owned: isOwned, worn: isWorn };
    });
  }

  function currentTitle(hero) {
    initHero(hero);
    if (!hero.titles || !hero.titles.worn) return null;
    return TD().titleById(hero.titles.worn);
  }

  function wear(hero, id) {
    initHero(hero);
    const def = TD().titleById(id);
    if (!def) return { ok: false, msg: "未找到该称号数据" };

    const owned = hero.titles.owned || {};
    if (!owned[id]) return { ok: false, msg: `尚未获得称号【${def.name}】` };

    if (hero.titles.worn === id) return { ok: false, msg: `称号【${def.name}】已在佩戴中` };

    const oldWorn = hero.titles.worn ? TD().titleById(hero.titles.worn) : null;
    hero.titles.worn = id;
    hero.title = id;

    const msg = oldWorn
      ? `更换称号为【${def.name}】（卸下了【${oldWorn.name}】），光辉属性已生效`
      : `佩戴称号【${def.name}】，光辉属性已生效`;
    log(msg);
    return { ok: true, msg };
  }

  function takeOff(hero) {
    initHero(hero);
    if (!hero.titles || !hero.titles.worn) return { ok: false, msg: "当前未佩戴任何称号" };

    const def = TD().titleById(hero.titles.worn);
    const name = def ? def.name : hero.titles.worn;
    hero.titles.worn = null;
    hero.title = null;

    const msg = `已卸下称号【${name}】`;
    log(msg);
    return { ok: true, msg };
  }

  function bonus(hero) {
    const flat = {}, pct = {};
    if (!hero || !hero.titles || !hero.titles.worn) return { flat, pct };

    const def = TD().titleById(hero.titles.worn);
    if (!def || !def.stats) return { flat, pct };

    const pctStats = (TSQ.EQ && TSQ.EQ.pctStats) || ["hp_pct", "patk_pct", "matk_pct", "spd_pct"];
    for (const [k, v] of Object.entries(def.stats)) {
      if (pctStats.includes(k)) {
        pct[k] = (pct[k] || 0) + v;
      } else {
        flat[k] = (flat[k] || 0) + v;
      }
    }
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

  function grant(hero, id) {
    initHero(hero);
    const def = TD().titleById(id);
    if (!def) return false;
    hero.titles.owned[id] = { acquired: Date.now() };
    return true;
  }

  TSQ.Title = {
    initHero,
    migrate,
    list,
    currentTitle,
    wear,
    takeOff,
    bonus,
    statText,
    grant,
    onLog: null
  };
})();

