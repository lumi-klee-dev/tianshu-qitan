/* 法宝系统逻辑 v0.9
   ─────────────────────────────────────────────────────────────────────
   功能：
   - 三转后法宝位（具备法宝位判断）
   - 法宝装备 / 卸下 / 更换（同时装备 1 件）
   - 印记之魂进阶（每阶主属性 +15 ⚙，上限 10 阶）
   - 属性加成（供 totalPrimary 与 combatStats 调用）
   - 浮窗 HTML 与详细展示
   - 演示数据发放与旧档 migrate 兼容
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const FD = () => TSQ.FabaoData;
  function log(msg) {
    if (typeof TSQ.Fabao.onLog === "function") TSQ.Fabao.onLog(msg);
  }

  function ensureStructure(hero) {
    if (!hero) return;
    hero.fabao = hero.fabao || { equipped: null, owned: {}, unlocked: true };
    if (typeof hero.fabao.owned !== "object" || hero.fabao.owned === null) hero.fabao.owned = {};
    hero.mats = hero.mats || {};
    const soulId = FD().SOUL_ITEM.id;
    if (hero.mats[soulId] == null) {
      hero.mats[soulId] = 0;
    }
  }

  function initHero(hero) {
    if (!hero) return;
    ensureStructure(hero);

    const soulId = FD().SOUL_ITEM.id;
    if (hero.mats[soulId] === 0) {
      hero.mats[soulId] = FD().CONST.DEMO.grantSoulCount;
    }

    const demo = FD().CONST.DEMO;
    if (Object.keys(hero.fabao.owned).length === 0) {
      demo.grantFabaos.forEach((id) => {
        hero.fabao.owned[id] = { rank: demo.defaultRank || 1 };
      });
      hero.fabao.equipped = demo.defaultEquipped || demo.grantFabaos[0];
    }
  }

  function migrate(hero) {
    if (!hero) return;
    ensureStructure(hero);
  }

  function canUnlock(hero) {
    if (!hero) return false;
    // 规格：三转后新增法宝位；同时支持演示开关 hero.fabao.unlocked
    return (hero.rebirth >= FD().CONST.REQ_REBIRTH) || !!(hero.fabao && hero.fabao.unlocked);
  }

  function list(hero) {
    initHero(hero);
    const owned = (hero && hero.fabao && hero.fabao.owned) || {};
    const equipped = (hero && hero.fabao && hero.fabao.equipped) || null;
    return FD().FABAO_LIST.map((def) => {
      const isOwned = !!owned[def.id];
      const rank = isOwned ? (owned[def.id].rank || 1) : 0;
      const isEquipped = equipped === def.id;
      return { def, owned: isOwned, rank, isEquipped };
    });
  }

  function equippedFabao(hero) {
    initHero(hero);
    if (!hero.fabao || !hero.fabao.equipped) return null;
    const def = FD().fabaoById(hero.fabao.equipped);
    if (!def) return null;
    const rank = (hero.fabao.owned[def.id] && hero.fabao.owned[def.id].rank) || 1;
    return { def, rank };
  }

  function equip(hero, id) {
    initHero(hero);
    if (!canUnlock(hero)) return { ok: false, msg: "未达三转境界，无法驾驭法宝！" };

    const def = FD().fabaoById(id);
    if (!def) return { ok: false, msg: "未找到该法宝数据" };

    const owned = hero.fabao.owned || {};
    if (!owned[id]) return { ok: false, msg: `尚未拥有法宝【${def.name}】` };

    if (hero.fabao.equipped === id) return { ok: false, msg: `【${def.name}】已在装备中` };

    const old = hero.fabao.equipped ? FD().fabaoById(hero.fabao.equipped) : null;
    hero.fabao.equipped = id;

    const rank = owned[id].rank || 1;
    const msg = old
      ? `更换法宝为【${rank}阶·${def.name}】（换下了【${old.name}】）`
      : `装备法宝【${rank}阶·${def.name}】，属性加成已生效`;
    log(msg);
    return { ok: true, msg };
  }

  function unequip(hero) {
    initHero(hero);
    if (!hero.fabao || !hero.fabao.equipped) return { ok: false, msg: "当前未装备法宝" };

    const def = FD().fabaoById(hero.fabao.equipped);
    const name = def ? def.name : hero.fabao.equipped;
    hero.fabao.equipped = null;

    const msg = `已卸下法宝【${name}】`;
    log(msg);
    return { ok: true, msg };
  }

  function advance(hero, id) {
    initHero(hero);
    const targetId = id || (hero.fabao && hero.fabao.equipped);
    if (!targetId) return { ok: false, msg: "请先选择需要进阶的法宝" };

    const def = FD().fabaoById(targetId);
    if (!def) return { ok: false, msg: "未找到法宝数据" };

    const owned = hero.fabao.owned[targetId];
    if (!owned) return { ok: false, msg: `尚未拥有法宝【${def.name}】` };

    const curRank = owned.rank || 1;
    const maxRank = FD().CONST.MAX_RANK;
    if (curRank >= maxRank) {
      return { ok: false, msg: `【${def.name}】已达最高 ${maxRank} 阶，无法继续进阶！` };
    }

    const cost = FD().CONST.SOUL_COST(curRank);
    const soulId = FD().SOUL_ITEM.id;
    const haveSouls = (hero.mats && hero.mats[soulId]) || 0;
    if (haveSouls < cost) {
      return { ok: false, msg: `进阶所需【印记之魂】不足（需要 ${cost} 颗，当前仅有 ${haveSouls} 颗）` };
    }

    hero.mats[soulId] -= cost;
    owned.rank = curRank + 1;

    const addStat = FD().CONST.STAT_PER_RANK;
    const msg = `【${def.name}】成功进阶至【${owned.rank}阶】！${def.primaryStatName} +${addStat}（消耗印记之魂 ×${cost}）`;
    log(msg);
    return { ok: true, msg, rank: owned.rank };
  }

  function bonus(hero) {
    const flat = {}, pct = {};
    if (!hero || !hero.fabao || !hero.fabao.equipped) return { flat, pct };

    const def = FD().fabaoById(hero.fabao.equipped);
    if (!def) return { flat, pct };

    const rank = (hero.fabao.owned[def.id] && hero.fabao.owned[def.id].rank) || 1;

    // 1. 基础属性
    if (def.baseStats) {
      for (const [k, v] of Object.entries(def.baseStats)) {
        flat[k] = (flat[k] || 0) + v;
      }
    }

    // 2. 进阶主属性：每进 1 阶主属性 +15 ⚙
    const rankBonus = rank * FD().CONST.STAT_PER_RANK;
    if (def.primaryStat) {
      flat[def.primaryStat] = (flat[def.primaryStat] || 0) + rankBonus;
    }

    return { flat, pct };
  }

  function cnRank(n) {
    const d = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    return d[n] || n;
  }

  function tooltipHTML(fabaoOrDef, hero, optRank) {
    if (!fabaoOrDef) return "";
    let def = fabaoOrDef, rank = optRank || 1;
    if (fabaoOrDef.def) {
      def = fabaoOrDef.def;
      rank = fabaoOrDef.rank || 1;
    } else if (typeof fabaoOrDef === "string") {
      def = FD().fabaoById(fabaoOrDef);
      rank = (hero && hero.fabao && hero.fabao.owned[fabaoOrDef] && hero.fabao.owned[fabaoOrDef].rank) || 1;
    }
    if (!def) return "";

    const statNames = (TSQ.EQ && TSQ.EQ.statNames) || {
      hp: "生命", mp: "法力", patk: "物攻", matk: "法攻", pdef: "物防", mdef: "法防",
      hit: "命中", pdodge: "闪避", mdodge: "法闪", pcrit: "物暴", mcrit: "法暴", spd: "速度",
      str: "强壮", con: "耐力", agi: "敏捷", int: "智力", fai: "信仰"
    };

    const maxRank = FD().CONST.MAX_RANK;
    const rankBonus = rank * FD().CONST.STAT_PER_RANK;
    const cost = rank < maxRank ? FD().CONST.SOUL_COST(rank) : 0;
    const soulHave = (hero && hero.mats && hero.mats[FD().SOUL_ITEM.id]) || 0;

    let h = `<div class="tt fabao-tt">`;
    h += `<div class="tt-name" style="color:#ff9800">【${cnRank(rank)}阶·${def.name}】</div>`;
    h += `<div class="g">法宝装备位 · 三转专属 · 阶数上限 ${maxRank} 阶</div>`;
    h += `<div class="w">当前等阶：<span class="y">${rank} / ${maxRank} 阶</span></div>`;
    
    // 基础属性
    if (def.baseStats) {
      const bStr = Object.entries(def.baseStats).map(([k, v]) => `+${v} ${statNames[k] || k}`).join("　");
      h += `<div class="w">基础属性：${bStr}</div>`;
    }

    // 进阶淬炼主属性
    h += `<div class="b">进阶淬炼：<span class="rare">+${rankBonus} ${def.primaryStatName}</span>（每进1阶 +15 ⚙）</div>`;

    if (rank < maxRank) {
      h += `<div class="m">下一阶效果：+${rankBonus + FD().CONST.STAT_PER_RANK} ${def.primaryStatName}（消耗印记之魂 ×${cost}）</div>`;
    } else {
      h += `<div class="y">已达最高阶境界（${maxRank}阶满阶）</div>`;
    }

    h += `<div class="g">拥有印记之魂：<span class="${soulHave >= cost ? "g" : "r"}">${soulHave}</span> 颗</div>`;
    h += `<div class="lore">${def.desc}</div>`;
    h += `</div>`;
    return h;
  }

  TSQ.Fabao = {
    initHero,
    migrate,
    canUnlock,
    list,
    equippedFabao,
    equip,
    unequip,
    advance,
    bonus,
    tooltipHTML,
    cnRank,
    onLog: null
  };
})();

