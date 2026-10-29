/* 宠物组合与图鉴逻辑系统 v1.4
   ─────────────────────────────────────────────────────────────────────
   功能：
   - 宠物图鉴（§6.15）：吃掉 1 只骑宠（非当前骑乘）→ 图鉴 +1 级，上限 48；
     每级当前宠物全属性 +5‰ ⚙。
   - 宠物组合（§6.15）：
     * 炖炖组合：需吃掉 炖、炖炖炖、炖炖炖炖 → 宠物生命 +8000
     * 仙灵吉兽：需吃掉 灰野兔、猫、白羊 → 双防 +200、生命 +1500
     * 龙翔九霄：需吃掉 小金龙、星澜飞骥 → 双攻 +450、速度 +80
   - 演示礼包（限领一次）：领取组合所需战宠与献祭用骑宠
   - 加成通过 TSQ.PetAdvance.statBonus 注入宠物战斗属性（pet.js 零修改）
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const D = () => TSQ.DATA;
  const MD = () => TSQ.MountData;

  function log(msg) {
    if (typeof TSQ.PetCodex.onLog === "function") {
      TSQ.PetCodex.onLog(msg);
    }
  }

  // 动态补齐炖炖物种定义（若尚未注册到 TSQ.DATA.petSpecies）
  const DUN_SPECIES = [
    {
      id: "dun",
      name: "炖",
      type: "野兽",
      tier: "珍兽",
      atk_type: "phys",
      skills: ["siyao"],
      talent: ["manli"],
      apt: { str: [100, 200], con: [300, 500], agi: [80, 150], int: [50, 100], fai: [50, 100] },
      doodle: "炖",
      source: "白银VIP副本 / 灵空子兑换",
      desc: "传闻中的炖炖一族幼生体，体态浑圆憨态可掬。"
    },
    {
      id: "dundundun",
      name: "炖炖炖",
      type: "野兽",
      tier: "珍兽",
      atk_type: "phys",
      skills: ["siyao"],
      talent: ["manli"],
      apt: { str: [200, 400], con: [500, 800], agi: [100, 200], int: [80, 150], fai: [80, 150] },
      doodle: "炖",
      source: "白银VIP副本 / 灵空子兑换",
      desc: "炖炖一族成熟体，拥有坚实浑厚的气血本源。"
    },
    {
      id: "dundundundun",
      name: "炖炖炖炖",
      type: "神兽",
      tier: "神兽",
      atk_type: "phys",
      skills: ["siyao", "lizhua"],
      talent: ["life_bless", "manli"],
      apt: { str: [400, 800], con: [1200, 2000], agi: [200, 400], int: [150, 300], fai: [150, 300] },
      doodle: "炖",
      source: "白银VIP副本 / 灵空子兑换",
      desc: "炖炖一族终极形态，四炖齐聚，可赐宠物浩瀚生命灵韵。"
    }
  ];

  function registerDunSpecies() {
    if (!TSQ.DATA || !Array.isArray(TSQ.DATA.petSpecies)) return;
    DUN_SPECIES.forEach((sp) => {
      if (!TSQ.DATA.petSpecies.find((s) => s.id === sp.id)) {
        TSQ.DATA.petSpecies.push(sp);
      }
    });
  }
  registerDunSpecies();

  const CONST = {
    CODEX_MAX_LEVEL: 48,
    CODEX_RATIO_PER_LEVEL: 0.005, // 5‰ 每级
    COMBOS: [
      {
        id: "combo_dundun",
        name: "炖炖组合",
        desc: "远古炖族灵力传承，集齐炖、炖炖炖、炖炖炖炖，为宠物注入浩瀚气血生机（生命 +8000）",
        required: [
          { species: "dun", name: "炖" },
          { species: "dundundun", name: "炖炖炖" },
          { species: "dundundundun", name: "炖炖炖炖" }
        ],
        bonus: { hp: 8000 }
      },
      {
        id: "combo_jishou",
        name: "仙灵吉兽",
        desc: "月下仙兔、灵猫与吉羊灵气共鸣，护体罡气大成（物防 +200、法防 +200、生命 +1500）",
        required: [
          { species: "huiyetu", name: "灰野兔" },
          { species: "mao", name: "猫" },
          { species: "baiyang", name: "白羊" }
        ],
        bonus: { pdef: 200, mdef: 200, hp: 1500 }
      },
      {
        id: "combo_longxiang",
        name: "龙翔九霄",
        desc: "九天金龙与星澜飞骥相遇，引动星宿龙息之威（物攻 +450、法攻 +450、速度 +80）",
        required: [
          { species: "xiaojinlong", name: "小金龙" },
          { species: "xinglanfeiji", name: "星澜飞骥" }
        ],
        bonus: { patk: 450, matk: 450, spd: 80 }
      }
    ]
  };

  let lastActiveHero = null;

  function ensureStructure(hero) {
    if (!hero) return;
    lastActiveHero = hero;
    registerDunSpecies();

    if (Array.isArray(hero.pets)) {
      hero.pets.forEach((p) => { if (p) Object.defineProperty(p, "_ownerHero", { value: hero, enumerable: false, configurable: true, writable: true }); });
    }

    hero.petCodex = hero.petCodex || { level: 0 };
    if (typeof hero.petCodex.level !== "number") hero.petCodex.level = 0;

    hero.petCombos = hero.petCombos || {};
    CONST.COMBOS.forEach((cb) => {
      if (!hero.petCombos[cb.id]) {
        hero.petCombos[cb.id] = {
          id: cb.id,
          collected: {},
          activated: false
        };
      }
      cb.required.forEach((r) => {
        if (typeof hero.petCombos[cb.id].collected[r.species] !== "boolean") {
          hero.petCombos[cb.id].collected[r.species] = false;
        }
      });
      // 检查是否全集齐
      const allGot = cb.required.every((r) => hero.petCombos[cb.id].collected[r.species]);
      if (allGot) hero.petCombos[cb.id].activated = true;
    });

    hero.flags = hero.flags || {};
    if (typeof hero.flags.petComboClaimed !== "boolean") {
      hero.flags.petComboClaimed = false;
    }
  }

  function initHero(hero) {
    if (!hero) return;
    ensureStructure(hero);
  }

  function migrate(hero) {
    if (!hero) return;
    ensureStructure(hero);
  }

  /* ══════════ 宠物图鉴（吃骑宠） ══════════ */
  function codexLevel(hero) {
    if (!hero || !hero.petCodex) return 0;
    return hero.petCodex.level || 0;
  }

  function codexBonusPct(hero) {
    return codexLevel(hero) * CONST.CODEX_RATIO_PER_LEVEL;
  }

  function eatMount(hero, mountKey) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);

    if (codexLevel(hero) >= CONST.CODEX_MAX_LEVEL) {
      return { ok: false, msg: `宠物图鉴已达最高等级（Lv.${CONST.CODEX_MAX_LEVEL} 满级）！` };
    }

    if (!hero.mount || !hero.mount.owned || !hero.mount.owned[mountKey]) {
      return { ok: false, msg: "未找到该骑宠！" };
    }

    if (hero.mount.riding && hero.mount.current === mountKey) {
      return { ok: false, msg: "不能奉献当前骑乘中的骑宠！请先在骑宠面板卸鞍休息或更换骑乘！" };
    }

    const mount = hero.mount.owned[mountKey];
    const mountName = mount.name || (MD && MD().mountById(mount.defId) ? MD().mountById(mount.defId).name : mountKey);

    // 移除骑宠
    delete hero.mount.owned[mountKey];
    if (hero.mount.current === mountKey) {
      hero.mount.current = null;
      hero.mount.riding = false;
    }

    hero.petCodex.level = (hero.petCodex.level || 0) + 1;
    const newLv = hero.petCodex.level;
    const curPct = (newLv * CONST.CODEX_RATIO_PER_LEVEL * 100).toFixed(1);

    const msg = `📖 成功将骑宠【${mountName}】奉献入宠物图鉴！图鉴等级升至 Lv.${newLv} / ${CONST.CODEX_MAX_LEVEL}，宠物全属性增幅达到 +${curPct}%！`;
    log(msg);
    return { ok: true, msg, level: newLv, bonusPct: newLv * CONST.CODEX_RATIO_PER_LEVEL };
  }

  /* ══════════ 宠物组合 ══════════ */
  function eatPetForCombo(hero, comboId, petUid) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);

    const cbDef = CONST.COMBOS.find((c) => c.id === comboId);
    if (!cbDef) return { ok: false, msg: "未知的宠物组合" };

    const cbState = hero.petCombos[comboId];
    if (cbState.activated) {
      return { ok: false, msg: `【${cbDef.name}】已全部集齐并激活，无需重复奉献！` };
    }

    hero.pets = hero.pets || [];
    const petIdx = hero.pets.findIndex((p) => p.uid === petUid);
    if (petIdx < 0) return { ok: false, msg: "未在宠物栏中找到该宠物" };

    const pet = hero.pets[petIdx];
    if (pet.fighting) {
      return { ok: false, msg: `【${pet.name}】当前处于出战状态，不可作为材料奉献！请先收回宠物。` };
    }

    const reqItem = cbDef.required.find((r) => r.species === pet.species);
    if (!reqItem) {
      return { ok: false, msg: `【${pet.name}】不是【${cbDef.name}】所需的组合宠物！` };
    }

    if (cbState.collected[pet.species]) {
      return { ok: false, msg: `【${cbDef.name}】中【${reqItem.name}】已被点亮，无需重复献祭！` };
    }

    // 从宠物背包中移除该宠物
    hero.pets.splice(petIdx, 1);
    cbState.collected[pet.species] = true;

    // 检查是否刚刚全部集齐
    const nowActive = cbDef.required.every((r) => cbState.collected[r.species]);
    let activeMsg = "";
    if (nowActive) {
      cbState.activated = true;
      activeMsg = ` 🎉【${cbDef.name}】全部集齐正式激活生效！属性加成已实时赋予所有宠物！`;
    }

    const msg = `✨ 成功将【${pet.name}】注入【${cbDef.name}】！成功点亮「${reqItem.name}」！${activeMsg}`;
    log(msg);
    return { ok: true, msg, activated: cbState.activated };
  }

  /* ══════════ 属性汇总与挂钩 ══════════ */
  function bonus(pet, heroOpt) {
    const flat = { hp: 0, mp: 0, patk: 0, matk: 0, pdef: 0, mdef: 0, spd: 0 };
    if (!pet) return { flat, codexPct: 0 };

    const hero = heroOpt ||
      pet._ownerHero ||
      (typeof TSQ !== "undefined" && TSQ.UI && TSQ.UI.state && TSQ.UI.state.hero) ||
      (TSQ.Game && TSQ.Game.currentHero) ||
      lastActiveHero;

    if (!hero) return { flat, codexPct: 0 };
    ensureStructure(hero);

    // 1. 组合固定属性加成
    CONST.COMBOS.forEach((cb) => {
      const state = hero.petCombos && hero.petCombos[cb.id];
      if (state && state.activated) {
        Object.entries(cb.bonus).forEach(([k, v]) => {
          flat[k] = (flat[k] || 0) + v;
        });
      }
    });

    // 2. 图鉴千分比加成（按基础属性粗算增量）
    const codexLv = codexLevel(hero);
    const codexPct = codexLv * CONST.CODEX_RATIO_PER_LEVEL;
    if (codexPct > 0) {
      const lv = pet.level || 1;
      const pri = pet.primary || { str: 10, con: 10, agi: 10, int: 10, fai: 10 };
      const basePatk = 10 + 2 * lv + 1.2 * (pri.str || 0);
      const baseMatk = 8 + 1.5 * lv + 1.0 * (pri.int || 0);
      const baseHp = 60 + 8 * lv + 24 * (pri.con || 0);
      const baseMp = 20 + 3 * lv + 10 * (pri.int || 0);
      const basePdef = 3 + 0.15 * (pri.con || 0);
      const baseMdef = 3 + 0.15 * (pri.fai || 0);
      const baseSpd = 5 + 0.2 * (pri.agi || 0);

      flat.patk += Math.round(basePatk * codexPct);
      flat.matk += Math.round(baseMatk * codexPct);
      flat.hp += Math.round(baseHp * codexPct);
      flat.mp += Math.round(baseMp * codexPct);
      flat.pdef += Math.round(basePdef * codexPct);
      flat.mdef += Math.round(baseMdef * codexPct);
      flat.spd += Math.round(baseSpd * codexPct);
    }

    return { flat, codexPct };
  }

  // 演示礼包：限领一次（hero.flags.petComboClaimed）
  function claimDemoPack(hero) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);

    if (hero.flags.petComboClaimed) {
      return { ok: false, msg: "演示礼包每位角色仅限领取一次！" };
    }

    hero.flags.petComboClaimed = true;
    hero.pets = hero.pets || [];

    // 发放组合所需战宠
    const speciesToGrant = [
      "dun", "dundundun", "dundundundun",
      "huiyetu", "mao", "baiyang",
      "xiaojinlong", "xinglanfeiji"
    ];
    speciesToGrant.forEach((spId) => {
      if (TSQ.Pet && typeof TSQ.Pet.makePet === "function") {
        hero.pets.push(TSQ.Pet.makePet(spId, { level: 20, fighting: false }));
      }
    });

    // 发放献祭测试用骑宠
    hero.mount = hero.mount || { owned: {} };
    hero.mount.owned = hero.mount.owned || {};
    if (MD && MD().makeMountInstance) {
      ["mount_lingyu", "mount_chiyan", "mount_yeyu"].forEach((mId) => {
        if (!hero.mount.owned[mId]) {
          hero.mount.owned[mId] = MD().makeMountInstance(mId);
        }
      });
    }

    const msg = "⚙ 演示辅助：已成功领取组合宠物礼包！获得【炖、炖炖炖、炖炖炖炖】等组合用战宠各1只，以及【灵雨、赤炎金猊、夜雨】献祭测试用骑宠各1只！";
    log(msg);
    return { ok: true, msg };
  }

  // 挂钩 TSQ.PetAdvance.statBonus，零修改 pet.js
  function hookPetAdvance() {
    if (TSQ.PetAdvance && typeof TSQ.PetAdvance.statBonus === "function") {
      if (TSQ.PetAdvance._statBonusHooked) return;
      const origStatBonus = TSQ.PetAdvance.statBonus;
      TSQ.PetAdvance.statBonus = function (pet) {
        const base = origStatBonus ? origStatBonus(pet) : { patk: 0, matk: 0, hp: 0, mp: 0, pdef: 0, mdef: 0, spd: 0 };
        const extra = bonus(pet);
        if (extra && extra.flat) {
          ["patk", "matk", "hp", "mp", "pdef", "mdef", "spd"].forEach((k) => {
            if (extra.flat[k]) base[k] = (base[k] || 0) + extra.flat[k];
          });
        }
        return base;
      };
      TSQ.PetAdvance._statBonusHooked = true;
    }
  }
  hookPetAdvance();

  TSQ.PetCodex = {
    CONST,
    initHero,
    migrate,
    codexLevel,
    codexBonusPct,
    eatMount,
    eatPetForCombo,
    bonus,
    claimDemoPack,
    hookPetAdvance,
    onLog: null
  };
})();
