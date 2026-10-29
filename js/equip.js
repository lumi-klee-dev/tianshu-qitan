/* 装备与打造逻辑（纯逻辑，无 DOM）。数据：TSQ.EQ；成功率：TSQ.RATES */
(function () {
  const EQ = () => TSQ.EQ, R = () => TSQ.RATES;
  const uid = () => Math.random().toString(16).slice(2, 10);
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ok = (msg, extra) => Object.assign({ ok: true, msg }, extra || {});
  const fail = (msg, extra) => Object.assign({ ok: false, msg }, extra || {});
  const pct = (p) => Math.round(p * 1000) / 10 + "%";

  function weightedPick(weights) {
    const ents = Object.entries(weights).filter(([, w]) => w > 0);
    const tot = ents.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * tot;
    for (const [k, w] of ents) { if ((r -= w) <= 0) return k; }
    return ents.length ? ents[ents.length - 1][0] : null;
  }

  // ---------- 基础 ----------
  function gradeOfLevel(lv) { return EQ().grades.find((g) => g.lv && lv >= g.lv[0] && lv <= g.lv[1]).id; }
  function gradeOf(item) { return item.awaken ? "juexing" : gradeOfLevel(item.level); }
  function gradeName(id) { return EQ().grades.find((g) => g.id === id).name; }
  function mainStat(cls) { return cls === "xiake" || cls === "cike" ? "patk" : "matk"; }
  function tplOf(item) { return EQ().templates[item.tpl]; }

  function affixValue(stat, level, rare) {
    const coef = rare ? EQ().rareAffixes[stat] : EQ().affixPool[stat];
    return Math.max(1, Math.round(level * coef * (0.5 + Math.random() * 0.5)));
  }
  function rollAffixes(level, n, rareChance) {
    const pool = Object.keys(EQ().affixPool).sort(() => Math.random() - 0.5);
    const out = [];
    for (let i = 0; i < n; i++) {
      if (rareChance && chance(rareChance)) {
        const st = pick(Object.keys(EQ().rareAffixes));
        out.push({ stat: st, value: affixValue(st, level, true), rare: true });
      } else out.push({ stat: pool[i], value: affixValue(pool[i], level) });
    }
    return out;
  }
  function rollBindAttr(level) {
    const st = pick(["con", "agi", "int", "hp", "mp", "patk", "matk", "pdodge", "mdodge", "spd"]);
    return { stat: st, value: affixValue(st, level) };
  }
  function colorCount(item, color, exceptIdx) {
    return item.holes.filter((h, i) => i !== exceptIdx && h.color === color).length;
  }
  function rollHoleColor(item, weights, exceptIdx) {
    const w = {};
    for (const [c, v] of Object.entries(weights)) w[c] = colorCount(item, c, exceptIdx) >= R().drill.maxSameColor ? 0 : v;
    return weightedPick(w);
  }
  function binomial(n, p) { let k = 0; for (let i = 0; i < n; i++) if (chance(p)) k++; return k; }

  function makeItem(tplId, o) {
    o = o || {};
    const tpl = EQ().templates[tplId];
    if (!tpl) throw new Error("unknown template " + tplId);
    const cls = o.cls || "xiuzhen", gender = o.gender || "m";
    let name = tpl.name;
    if (name.includes("{weapon}")) name = name.replace("·{weapon}", EQ().weaponNoun[cls][gender]);
    const base = {};
    if (tpl.base) Object.assign(base, tpl.base);
    else for (const [k, c] of Object.entries(EQ().slotBase[tpl.type])) {
      const key = k === "main" ? mainStat(cls) : k;
      base[key] = Math.round(tpl.level * c * (0.95 + Math.random() * 0.1));
    }
    const color = o.color || "white";
    const item = {
      uid: uid(), tpl: tplId, name, type: tpl.type, level: tpl.level,
      tier: o.tier || "normal", color,
      bound: !!o.bound, unique: !!tpl.unique, jie: tpl.jie || null,
      dur: o.dur || [tpl.level >= 100 ? 1000 : 650, tpl.level >= 100 ? 1000 : 650],
      req: { level: tpl.level, classes: tpl.type === "weapon" ? [cls] : (tpl.classes || null), gender: tpl.gender || (tpl.type === "weapon" ? gender : null), rebirth: tpl.rebirth || 0, attr: tpl.reqAttr || null },
      base, affixes: o.affixes || rollAffixes(tpl.level, EQ().colors[color].n),
      bindAttr: o.bindAttr === undefined ? rollBindAttr(tpl.level) : o.bindAttr,
      spirit: o.spirit || [], shenqi: o.shenqi || null,
      enchant: o.enchant || null, stars: o.stars || 0, mingke: o.mingke || 0,
      holes: [], maxHoles: o.maxHoles != null ? o.maxHoles : (tpl.maxHolesFixed || 10),
      kaiguang: !!tpl.kaiguang, identified: o.identified !== false,
      setId: o.setId || null, awaken: o.awaken || null, desc: tpl.desc || ""
    };
    const hc = o.holes;
    if (Array.isArray(hc)) item.holes = hc.map((h) => (typeof h === "string" ? { color: h, gem: null } : h));
    else {
      const n = hc != null ? hc : rand(2, 6);
      for (let i = 0; i < Math.min(n, item.maxHoles); i++) item.holes.push({ color: rollHoleColor(item, R().drill.newHoleWeight), gem: null });
    }
    return item;
  }

  // ---------- 属性计算 ----------
  function baseFinal(item) {
    const out = {};
    const tm = EQ().tiers[item.tier].mult;
    const star = 1 + item.stars * R().starUp.statPerStar;
    const aw = item.awaken ? 1 + item.awaken.lv * R().awaken.statPerLevel : 1;
    const isArmor = EQ().armorTypes.includes(item.type);
    for (const [k, v] of Object.entries(item.base)) {
      let m = 1;
      if (item.type === "weapon" && (k === "patk" || k === "matk")) m = 1 + item.mingke * R().mingke.weaponAtkPct;
      if (isArmor && (k === "pdef" || k === "mdef")) m = 1 + item.mingke * R().mingke.armorDefPct;
      out[k] = Math.round(v * tm * star * m * aw);
    }
    return out;
  }
  function enchantValue(item) {
    if (!item.enchant || !item.enchant.lv) return 0;
    return Math.round(item.level * R().enchant.valuePerLevel[item.enchant.lv - 1] * (1 + item.stars * 0.05));
  }
  function gemValue(id, lv) { return EQ().gems[id].vals[lv - 1]; }
  function mingkeHpPct(item) { return EQ().armorTypes.includes(item.type) ? item.mingke * R().mingke.armorHpPct : 0; }

  function itemStats(item) {
    const flat = {}, pc = {};
    const add = (k, v) => { if (EQ().pctStats.includes(k)) pc[k] = (pc[k] || 0) + v; else flat[k] = (flat[k] || 0) + v; };
    if (item.dur[0] <= 0 || !item.identified) return { flat, pct: pc, broken: item.dur[0] <= 0 };
    for (const [k, v] of Object.entries(baseFinal(item))) add(k, v);
    item.affixes.forEach((a) => add(a.stat, a.value));
    if (item.bindAttr) add(item.bindAttr.stat, item.bindAttr.value);
    item.spirit.forEach((a) => add(a.stat, a.value));
    if (item.enchant && item.enchant.lv) add(item.enchant.type === "p" ? "pdef" : "mdef", enchantValue(item));
    if (mingkeHpPct(item)) add("hp_pct", mingkeHpPct(item));
    item.holes.forEach((h) => { if (h.gem) add(EQ().gems[h.gem.id].stat, gemValue(h.gem.id, h.gem.lv)); });
    return { flat, pct: pc };
  }
  function setCounts(hero) {
    const c = {};
    for (const it of Object.values(hero.equipment)) {
      if (it && it.setId && it.dur[0] > 0) { c[it.setId] = c[it.setId] || new Set(); c[it.setId].add(it.type); }
    }
    const out = {}; for (const [k, s] of Object.entries(c)) out[k] = s; return out;
  }
  function heroBonus(hero) {
    const flat = {}, pc = {}, procs = [];
    for (const it of Object.values(hero.equipment)) {
      if (!it) continue;
      const s = itemStats(it);
      for (const [k, v] of Object.entries(s.flat)) flat[k] = (flat[k] || 0) + v;
      for (const [k, v] of Object.entries(s.pct)) pc[k] = (pc[k] || 0) + v;
    }
    for (const [sid, types] of Object.entries(setCounts(hero))) {
      const set = EQ().sets[sid]; if (!set) continue;
      set.bonus.forEach((b) => {
        if (types.size >= b.n) {
          for (const [k, v] of Object.entries(b.stats)) {
            if (EQ().pctStats.includes(k)) pc[k] = (pc[k] || 0) + v; else flat[k] = (flat[k] || 0) + v;
          }
          if (b.proc) procs.push(b.proc);
        }
      });
    }
    return { flat, pct: pc, procs };
  }

  // ---------- 背包 / 材料 ----------
  const has = (hero, id, n) => (hero.mats[id] || 0) >= (n || 1);
  function use(hero, id, n) { hero.mats[id] = (hero.mats[id] || 0) - n; }
  function give(hero, id, n) { hero.mats[id] = (hero.mats[id] || 0) + n; }
  const gemKey = (id, lv) => id + ":" + lv;
  function gemCount(hero, id, lv) { return hero.gemInv[gemKey(id, lv)] || 0; }
  function gemAdd(hero, id, lv, n) {
    const k = gemKey(id, lv); hero.gemInv[k] = (hero.gemInv[k] || 0) + n;
    if (hero.gemInv[k] <= 0) delete hero.gemInv[k];
  }
  function bindItem(item) { item.bound = true; }

  // ---------- 穿戴 ----------
  function reqProblems(hero, item) {
    const p = [];
    if (!item.identified) p.push("未鉴定");
    if (hero.level < item.req.level) p.push("等级不足");
    if (item.req.classes && !item.req.classes.includes(hero.class_id)) p.push("职业不符");
    if (item.req.gender && item.req.gender !== hero.gender) p.push("性别不符");
    if ((hero.rebirth || 0) < item.req.rebirth) p.push("转生不足");
    if (item.req.attr) for (const [k, v] of Object.entries(item.req.attr)) if ((hero.primary[k] || 0) < v) p.push("属性不足");
    return p;
  }
  function equipFromBag(hero, bagIdx) {
    const entry = hero.bag[bagIdx];
    if (!entry || entry.kind !== "equip") return fail("不是装备");
    const item = entry.item;
    const prob = reqProblems(hero, item);
    if (prob.length) return fail("无法穿戴：" + prob.join("、"));
    const slots = EQ().slots.filter((s) => s.type === item.type).map((s) => s.id);
    if (item.unique) {
      const dup = Object.entries(hero.equipment).find(([sid, it]) => it && it.tpl === item.tpl);
      if (dup) return fail("装备唯一：已佩戴同名装备");
    }
    let slot = slots.find((s) => !hero.equipment[s]) || slots[0];
    const old = hero.equipment[slot];
    hero.equipment[slot] = item;
    bindItem(item);
    hero.bag.splice(bagIdx, 1);
    if (old) hero.bag.push({ kind: "equip", item: old });
    return ok(`已装备 ${item.name}（装备后绑定）`);
  }
  function unequip(hero, slot) {
    const item = hero.equipment[slot];
    if (!item) return fail("该部位空");
    hero.equipment[slot] = null;
    hero.bag.push({ kind: "equip", item });
    return ok(`已卸下 ${item.name}`);
  }
  function equippedSameType(hero, item) {
    const s = EQ().slots.find((s) => s.type === item.type && hero.equipment[s.id]);
    return s ? hero.equipment[s.id] : null;
  }

  // ---------- 1. 打造 ----------
  function forgeTemplates() { return Object.values(EQ().templates).filter((t) => t.forgeable && !t.base); }
  function forgeRecipe(tplId, tier) {
    const tpl = EQ().templates[tplId], g = EQ().tiers[tier].matGrade;
    return EQ().recipeFor(tpl).map((r) => ({ ...r, key: r.mat + "_" + g }));
  }
  function interpTable(tbl, m) {
    const lo = Math.floor(m), hi = Math.min(5, lo + 1), t = m - lo;
    const a = tbl[lo], b = tbl[hi];
    return a.map((v, i) => (v + (b[i] - v) * t) / 100);
  }
  function forgePreview(hero, tplId, tier, qty) {
    const rec = forgeRecipe(tplId, tier), F = R().forge;
    const lack = [];
    let sw = 0, sm = 0;
    rec.forEach((r) => {
      const q = qty[r.key] || 0;
      if (q < r.qty) lack.push(`${EQ().materials[r.key].name}至少${r.qty}`);
      if (q > (hero.mats[r.key] || 0)) lack.push(`${EQ().materials[r.key].name}不足`);
      const w = r.rare ? F.materialWeight.rare : F.materialWeight.normal;
      sw += w; sm += w * clamp(q / r.qty, 0, F.fullMultiple);
    });
    const mult = Math.round(clamp(sm / sw, 1, F.fullMultiple) * 100) / 100;
    const odds = interpTable(F.colorTable, mult);
    const tpl = EQ().templates[tplId];
    const silver = Math.round(tpl.level * F.silverPerLevel * mult);
    if (hero.silver < silver) lack.push("银两不足");
    const maxHoles = mult >= F.fullMultiple ? 10 : F.maxHolesBase + Math.floor(mult - 1);
    return { rec, mult, odds, silver, maxHoles, holeP: F.currentHoleP0 + F.currentHolePerMult * mult, lack, ok: !lack.length };
  }
  function forgeDo(hero, tplId, tier, qty) {
    const pv = forgePreview(hero, tplId, tier, qty);
    if (!pv.ok) return fail(pv.lack.join("；"));
    pv.rec.forEach((r) => use(hero, r.key, qty[r.key]));
    hero.silver -= pv.silver;
    const r = Math.random(); let acc = 0, ci = 0;
    for (; ci < 5; ci++) { acc += pv.odds[ci]; if (r < acc) break; }
    const color = EQ().colorOrder[Math.min(ci, 4)];
    const cur = binomial(pv.maxHoles, pv.holeP);
    const item = makeItem(tplId, { tier, color, maxHoles: pv.maxHoles, holes: cur, cls: hero.class_id, gender: hero.gender, bound: false });
    hero.bag.push({ kind: "equip", item });
    return ok(`打造完成：${EQ().tiers[tier].name}·${EQ().colors[color].name}色【${item.name}】 孔 ${cur}/${pv.maxHoles}`, { item });
  }

  // ---------- 2. 原料合成 ----------
  function synthPreview(hero, chainId, fromLv, base) {
    const ch = EQ().synthChains.find((c) => c.id === chainId);
    const up = ch.kind === "enchant";
    const toLv = up ? fromLv + 1 : fromLv - 1;
    if (up ? toLv > ch.to : toLv < ch.to) return { ok: false, lack: ["已是最高等级"] };
    const src = ch.key(fromLv), dst = ch.key(toLv);
    const tbl = up && toLv >= 3 ? R().synth.enchantStoneHigh : R().synth.material;
    const p = tbl[base] || 0;
    const lack = has(hero, src, base) ? [] : [EQ().materials[src].name + "不足"];
    return { ok: !lack.length, lack, p, src, dst };
  }
  function synthDo(hero, chainId, fromLv, base) {
    const pv = synthPreview(hero, chainId, fromLv, base);
    if (!pv.ok) return fail(pv.lack.join("；"));
    use(hero, pv.src, base);
    if (chance(pv.p)) { give(hero, pv.dst, 1); return ok(`合成成功：${EQ().materials[pv.dst].name} ×1`); }
    return fail(`合成失败，${base} 个材料消失`);
  }

  // ---------- 3. 升星 ----------
  function starPreview(hero, item, n) {
    const S = R().starUp;
    if (item.stars >= S.max) return { ok: false, lack: ["已达 13 星"], p: 0 };
    const stone = "upstone_" + gradeOf(item);
    const p = Math.min(S.cap, S.base[item.stars] * (1 + S.perExtraStone * (n - 1)));
    const silver = S.silverPerTry * (item.stars + 1);
    const rule = S.failDrop.find((r) => item.stars >= r[0] && item.stars <= r[1]) || [0, 0, 0, 0];
    const lack = [];
    if (!has(hero, stone, n)) lack.push(EQ().materials[stone].name + "不足");
    if (hero.silver < silver) lack.push("银两不足");
    return { ok: !lack.length, lack, p, stone, silver, drop: [rule[2], rule[3]] };
  }
  function starDo(hero, item, n) {
    const pv = starPreview(hero, item, n);
    if (!pv.ok) return fail(pv.lack.join("；"));
    use(hero, pv.stone, n); hero.silver -= pv.silver; bindItem(item);
    if (chance(pv.p)) { item.stars++; return ok(`升星成功！当前 ${item.stars} 星`); }
    const d = rand(pv.drop[0], pv.drop[1]);
    item.stars = Math.max(0, item.stars - d);
    return fail(`升星失败，宝石消失${d ? `，掉 ${d} 星` : ""}（当前 ${item.stars} 星）`);
  }
  function wuxianDo(hero, item) {
    if (!has(hero, "wuxian_gem")) return fail("没有无限宝石");
    if (item.stars >= 13) return fail("已经 13 星");
    use(hero, "wuxian_gem", 1); item.stars = 13; bindItem(item);
    return ok("超级升星：直接升到 13 星！");
  }

  // ---------- 4. 铭刻 ----------
  function mingkePreview(hero, item, n, wenyu) {
    const K = R().mingke;
    if (item.mingke >= K.max) return { ok: false, lack: ["铭刻已满 9 级"], p: 0 };
    const stone = "lifestone_" + gradeOf(item);
    const p = Math.min(K.cap, K.base[item.mingke] * (1 + K.perExtraStone * (n - 1)));
    const lv = item.mingke;
    let penalty = lv === 0 ? "不掉级" : lv >= K.failDrop.resetFrom ? "直接掉回 1 级" : lv >= 4 ? `掉 ${K.failDrop.mid} 级` : `掉 ${K.failDrop.low} 级`;
    if (wenyu) penalty = "温玉保护：不掉级";
    const lack = [];
    if (!has(hero, stone, n)) lack.push(EQ().materials[stone].name + "不足");
    if (wenyu && !has(hero, "wenyu")) lack.push("温玉不足");
    if (hero.silver < K.silverPerTry) lack.push("银两不足");
    return { ok: !lack.length, lack, p, stone, penalty, silver: K.silverPerTry };
  }
  function mingkeDo(hero, item, n, wenyu) {
    const K = R().mingke, pv = mingkePreview(hero, item, n, wenyu);
    if (!pv.ok) return fail(pv.lack.join("；"));
    use(hero, pv.stone, n); hero.silver -= pv.silver; if (wenyu) use(hero, "wenyu", 1); bindItem(item);
    if (chance(pv.p)) { item.mingke++; return ok(`铭刻成功！当前 ${item.mingke} 级`); }
    if (!wenyu) {
      const lv = item.mingke;
      item.mingke = lv >= K.failDrop.resetFrom ? 1 : Math.max(0, lv - (lv >= 4 ? K.failDrop.mid : K.failDrop.low));
    }
    return fail(`铭刻失败（${pv.penalty}），当前 ${item.mingke} 级`);
  }

  // ---------- 5. 打孔 ----------
  function drillTools(item) {
    const k = item.holes.length + 1, g = gradeOf(item) === "juexing" ? "shen" : gradeOf(item);
    if (k <= 7) return ["drill_" + g + "_a", "drill_any"];
    if (k <= 10) return ["drill_" + g + "_b", "drill_any"];
    return ["drill_any"];
  }
  function drillPreview(hero, item, n, tool) {
    const k = item.holes.length + 1;
    if (k > item.maxHoles) return { ok: false, lack: ["孔数已达最大孔数"], p: 0, k };
    const tools = drillTools(item);
    tool = tool && tools.includes(tool) ? tool : tools[0];
    const b = R().drill.base[k - 1] || 0.1;
    const p = 1 - Math.pow(1 - b, n);
    const lack = has(hero, tool, n) ? [] : [EQ().materials[tool].name + "不足"];
    return { ok: !lack.length, lack, p, tool, tools, k };
  }
  function drillDo(hero, item, n, tool) {
    const pv = drillPreview(hero, item, n, tool);
    if (!pv.ok) return fail(pv.lack.join("；"));
    use(hero, pv.tool, n); bindItem(item);
    if (!chance(pv.p)) return fail(`打孔失败，${n} 个打孔器消耗`);
    const c = rollHoleColor(item, R().drill.newHoleWeight);
    item.holes.push({ color: c, gem: null });
    return ok(`打孔成功：第 ${pv.k} 孔为【${EQ().holeColors[c].name}色】`);
  }

  // ---------- 6. 洗孔 ----------
  function washPreview(hero, item, idx, n) {
    const W = R().washHole, h = item.holes[idx];
    if (!h) return { ok: false, lack: ["先选一个孔"] };
    if (h.gem) return { ok: false, lack: ["该孔镶有宝石，需先摘除"] };
    const w = {};
    for (const [c, v] of Object.entries(W.weight)) {
      const boost = c === "pink" || c === "purple" ? 1 + W.rareBoostPerExtra * (n - 1) : 1;
      w[c] = colorCount(item, c, idx) >= R().drill.maxSameColor ? 0 : v * boost;
    }
    const tot = Object.values(w).reduce((a, b) => a + b, 0);
    const odds = {}; for (const c in w) odds[c] = w[c] / tot;
    const lack = [];
    if (!has(hero, "wash_charm", n)) lack.push("洗孔符不足");
    if (hero.silver < W.silverPerTry) lack.push("银两不足");
    return { ok: !lack.length, lack, odds, w };
  }
  function washDo(hero, item, idx, n) {
    const pv = washPreview(hero, item, idx, n);
    if (!pv.ok) return fail(pv.lack.join("；"));
    use(hero, "wash_charm", n); hero.silver -= R().washHole.silverPerTry; bindItem(item);
    const old = item.holes[idx].color;
    item.holes[idx].color = weightedPick(pv.w);
    return ok(`洗孔：${EQ().holeColors[old].name} → ${EQ().holeColors[item.holes[idx].color].name}`);
  }

  // ---------- 7. 镶嵌 / 摘除 / 宝石合成 ----------
  function socketDo(hero, item, idx, id, lv) {
    const h = item.holes[idx];
    if (!h) return fail("先选一个孔");
    if (h.gem) return fail("该孔已有宝石，请先摘除");
    const gm = EQ().gems[id];
    if (gm.hole !== h.color) return fail(`${gm.name}只能镶入${EQ().holeColors[gm.hole].name}色孔`);
    if (gemCount(hero, id, lv) < 1) return fail("没有该宝石");
    gemAdd(hero, id, lv, -1); h.gem = { id, lv }; bindItem(item);
    return ok(`镶嵌成功：【${EQ().cnNum[lv]}级${gm.name}】+${gemValue(id, lv)} ${EQ().statNames[gm.stat]}`);
  }
  function removeDo(hero, item, idx, charm) {
    const h = item.holes[idx];
    if (!h || !h.gem) return fail("该孔没有宝石");
    const { id, lv } = h.gem;
    if (charm === "remove_high") {
      const c = "remove_high_" + lv;
      if (!has(hero, c)) return fail(`需要 ${lv} 级高级摘除符`);
      use(hero, c, 1); h.gem = null; gemAdd(hero, id, lv, 1);
      return ok(`无损摘除：${lv}级${EQ().gems[id].name}`);
    }
    if (!has(hero, "remove_low")) return fail("没有低级摘除符");
    use(hero, "remove_low", 1); h.gem = null;
    const nl = lv - R().gemRemove.lowCharmDrop;
    if (nl <= 0) return fail(`${lv}级${EQ().gems[id].name}被摘除时碎裂消失`);
    gemAdd(hero, id, nl, 1);
    return ok(`摘除成功，宝石降为 ${nl} 级`);
  }
  function gemSynthPreview(hero, id, lv, base) {
    const G = R().gemSynth;
    if (lv >= G.maxLevel) return { ok: false, lack: ["已是最高 7 级"], p: 0 };
    const charm = lv <= 3 ? "gem_charm_low" : "gem_charm_high";
    const p = G[base] || 0, lack = [];
    if (gemCount(hero, id, lv) < base) lack.push(`需要 ${base} 块同级同种宝石`);
    if (!has(hero, charm)) lack.push(EQ().materials[charm].name + "不足");
    if (hero.silver < G.silver) lack.push("银两不足");
    return { ok: !lack.length, lack, p, charm };
  }
  function gemSynthDo(hero, id, lv, base) {
    const pv = gemSynthPreview(hero, id, lv, base);
    if (!pv.ok) return fail(pv.lack.join("；"));
    gemAdd(hero, id, lv, -base); use(hero, pv.charm, 1); hero.silver -= R().gemSynth.silver;
    if (chance(pv.p)) { gemAdd(hero, id, lv + 1, 1); return ok(`合成成功：${lv + 1}级${EQ().gems[id].name}`); }
    return fail(`合成失败，${base} 块宝石消失`);
  }

  // ---------- 8. 附魔 ----------
  /* v0.8 最小接入：hero.yuanshen 从「数字」扩成 { lv, exp, value }，
     元神值（附魔消耗的资源池）落在 .value。这里只加两个取值小函数，
     公式 / 成功率表 / 附魔值算法一行没改；旧档若还是数字也照常可用。 */
  function ysPool(hero) {
    const y = hero && hero.yuanshen;
    if (y && typeof y === "object") return y.value || 0;
    return typeof y === "number" ? y : 0;
  }
  function ysPay(hero, n) {
    const y = hero && hero.yuanshen;
    if (y && typeof y === "object") y.value = (y.value || 0) - n;
    else hero.yuanshen = ysPool(hero) - n;
  }
  function enchantPreview(hero, item, type, mult, guiyuan) {
    const E = R().enchant, lack = [];
    if (!EQ().enchantTypes.includes(item.type)) return { ok: false, lack: ["只有头盔/衣服/裤子/腰带/鞋子可附魔"], p: 0 };
    if (item.level < E.minItemLevel) return { ok: false, lack: ["装备需 60 级以上"], p: 0 };
    const cur = item.enchant;
    let target = 1, note = "";
    if (cur && cur.type === type) target = cur.lv + 1;
    else if (cur) note = "更换附魔类型：原附魔效果降为 1 级";
    if (target > 6) return { ok: false, lack: ["附魔已满 6 级"], p: 0 };
    const stone = `enchant_${type}_${target}`;
    const p = Math.min(E.cap, E.base[target - 1] * (1 + E.perExtraMult * (mult - 1)));
    const ys = E.yuanshenPerLevel * target * mult;
    if (!has(hero, stone)) lack.push(EQ().materials[stone].name + "不足");
    if (ysPool(hero) < ys) lack.push("元神不足");
    if (guiyuan && !has(hero, "guiyuan")) lack.push("归元灵玉不足");
    const penalty = guiyuan ? "归元灵玉保护：不掉级" : cur && cur.type === type ? "失败掉 1 级" : "失败无附魔";
    return { ok: !lack.length, lack, p, stone, target, yuanshen: ys, note, penalty };
  }
  function enchantDo(hero, item, type, mult, guiyuan) {
    const pv = enchantPreview(hero, item, type, mult, guiyuan);
    if (!pv.ok) return fail(pv.lack.join("；"));
    use(hero, pv.stone, 1); ysPay(hero, pv.yuanshen); if (guiyuan) use(hero, "guiyuan", 1); bindItem(item);
    if (chance(pv.p)) { item.enchant = { type, lv: pv.target }; return ok(`附魔成功：${pv.target}级${type === "p" ? "物防" : "法防"}附魔`); }
    if (!guiyuan && item.enchant && item.enchant.type === type) item.enchant.lv = Math.max(0, item.enchant.lv - 1);
    return fail("附魔失败" + (guiyuan ? "（归元灵玉保护）" : ""));
  }

  // ---------- 9. 通灵 ----------
  function spiritPreview(hero, item, tl, waters) {
    const S = R().spirit, lack = [];
    const base = { tongling_20: 20, tongling_50: 50, tongling_80: 80 }[tl] || 20;
    const g = Math.min(100, base + waters * S.waterBonus);
    const pk = [1]; for (let k = 2; k <= S.maxLines; k++) pk.push(Math.pow(g / 100, k - 1) * S.lineFactor);
    const dist = pk.map((p, i) => p - (pk[i + 1] || 0));
    if (!has(hero, tl)) lack.push(EQ().materials[tl].name + "不足");
    if (waters && !has(hero, "yangyuan_water", waters)) lack.push("无上养元水不足");
    return { ok: !lack.length, lack, g, dist };
  }
  function spiritDo(hero, item, tl, waters) {
    const pv = spiritPreview(hero, item, tl, waters);
    if (!pv.ok) return fail(pv.lack.join("；"));
    use(hero, tl, 1); if (waters) use(hero, "yangyuan_water", waters); bindItem(item);
    let n = 1; for (let k = 2; k <= 5; k++) if (chance(Math.pow(pv.g / 100, k - 1) * R().spirit.lineFactor)) n = k; else break;
    item.spirit = [];
    for (let i = 0; i < n; i++) {
      const st = pick(Object.keys(EQ().spiritPool));
      const c = EQ().spiritPool[st];
      let v = item.level * c * (0.6 + Math.random() * 0.4) * (0.6 + pv.g / 250);
      v = EQ().pctStats.includes(st) ? Math.round(v * 1000) / 1000 : Math.max(1, Math.round(v));
      item.spirit.push({ stat: st, value: v });
    }
    return ok(`通灵成功：获得 ${n} 条通灵属性（灵气 ${pv.g}）`);
  }

  // ---------- 10. 鉴定 / 开光 ----------
  function identifyDo(hero, item) {
    if (item.identified) return fail("已鉴定");
    item.identified = true; item.color = "white"; item.affixes = []; item.holes = [];
    return ok("鉴定完成：白色、无孔。可去【开光】决定全部属性");
  }
  function kaiguangPreview(hero, item, tool, n) {
    if (!item.kaiguang) return { ok: false, lack: ["此装备不可开光"] };
    if (!item.identified) return { ok: false, lack: ["请先鉴定"] };
    const p1 = R().kaiguang.tools[tool] || 0.1;
    const po = 1 - Math.pow(1 - p1, n);
    const rest = 1 - po;
    const odds = [0.10 * rest, 0.25 * rest, 0.35 * rest, 0.30 * rest, po];
    const lack = has(hero, tool, n) ? [] : [EQ().materials[tool].name + "不足"];
    const warn = item.stars || item.holes.some((h) => h.gem) ? "开光会清除升星和已镶嵌宝石！" : "";
    return { ok: !lack.length, lack, odds, warn };
  }
  function kaiguangDo(hero, item, tool, n) {
    const pv = kaiguangPreview(hero, item, tool, n);
    if (!pv.ok) return fail(pv.lack.join("；"));
    use(hero, tool, n);
    const r = Math.random(); let acc = 0, ci = 0;
    for (; ci < 5; ci++) { acc += pv.odds[ci]; if (r < acc) break; }
    item.color = EQ().colorOrder[Math.min(ci, 4)];
    item.affixes = rollAffixes(item.level, EQ().colors[item.color].n);
    item.bindAttr = rollBindAttr(item.level);
    item.stars = 0; item.maxHoles = 10;
    const hp = 0.45 + (tool === "kg_xianren" ? R().kaiguang.xianrenHoleBonus : 0);
    item.holes = [];
    const nh = binomial(10, hp);
    for (let i = 0; i < nh; i++) item.holes.push({ color: rollHoleColor(item, R().drill.newHoleWeight), gem: null });
    return ok(`开光完成：${EQ().colors[item.color].name}色，${nh}/10 孔`);
  }

  // ---------- 11. 属性改造 ----------
  function reforgePreview(hero, item, locks, extra) {
    const F = R().reforge, lack = [];
    if (item.color === "white") return { ok: false, lack: ["白色装备没有附加属性"] };
    if (item.setId) return { ok: false, lack: ["已套装改造的装备不能再属性改造"] };
    const prism = "prism_" + { green: 4, blue: 3, purple: 2, orange: 1 }[item.color];
    const np = F.basePrism + locks.length * F.prismPerLock + extra;
    const silver = F.silver + locks.length * F.lockSilver;
    if (!has(hero, prism, np)) lack.push(`${EQ().materials[prism].name}需 ${np} 个`);
    if (hero.silver < silver) lack.push("银两不足");
    if (locks.length >= item.affixes.length) lack.push("至少留 1 条不锁定");
    return { ok: !lack.length, lack, prism, np, silver, rare: F.rareBase + F.rarePerExtra * extra };
  }
  function reforgeDo(hero, item, locks, extra) {
    const pv = reforgePreview(hero, item, locks, extra);
    if (!pv.ok) return fail(pv.lack.join("；"));
    use(hero, pv.prism, pv.np); hero.silver -= pv.silver; bindItem(item);
    item.affixes = item.affixes.map((a, i) => {
      if (locks.includes(i)) {
        if (!a.lockBonus) return { ...a, value: Math.round(a.value * (1 + R().reforge.lockBonus)), lockBonus: true };
        return a;
      }
      return rollAffixes(item.level, 1, pv.rare)[0];
    });
    return ok("属性改造完成" + (item.affixes.some((a) => a.rare) ? "，出现稀有属性！" : ""));
  }

  // ---------- 12. 套装改造 ----------
  function setReformPreview(hero, item) {
    const tpl = tplOf(item), S = R().setReform, lack = [];
    if (!tpl.setFamily) return { ok: false, lack: ["此装备没有对应套装"] };
    if (item.setId) return { ok: false, lack: ["已是套装"] };
    if (item.level < S.minLevel) lack.push("需 110 级以上");
    if (item.color === "white") lack.push("白色装备无法改造");
    for (const [m, n] of Object.entries(S.mats)) if (!has(hero, m, n)) lack.push(`${EQ().materials[m].name}×${n}`);
    return { ok: !lack.length, lack, set: EQ().sets[tpl.setFamily] };
  }
  function setReformDo(hero, item) {
    const pv = setReformPreview(hero, item);
    if (!pv.ok) return fail(pv.lack.join("；"));
    for (const [m, n] of Object.entries(R().setReform.mats)) use(hero, m, n);
    item.setId = tplOf(item).setFamily; bindItem(item);
    return ok(`套装改造成功：成为【${pv.set.name}】部件（星/铭刻/宝石不变）`);
  }

  // ---------- 13. 觉醒 ----------
  function awakenPreview(hero, item, mult) {
    const A = R().awaken, lack = [];
    if (item.awaken) return { ok: false, lack: ["已觉醒"], p: 0 };
    if (!(item.type === "weapon" || EQ().setTypes.includes(item.type))) lack.push("仅武器与神套部件");
    if (item.level < 140) lack.push("装备 ≥140 级");
    if (item.tier !== "radiant") lack.push("需光芒档次");
    if (item.color !== "orange") lack.push("需橙色");
    if (item.stars < 13) lack.push("需 13 星");
    if (item.mingke < 9) lack.push("需 9 级铭刻");
    if (item.holes.some((h) => h.gem)) lack.push("需先摘除全部宝石");
    if (!item.bound) lack.push("需已绑定");
    if ((hero.rebirth || 0) < 3) lack.push("人物需三转");
    const need = A.baseXuanbing * mult;
    if (!has(hero, "xuanbing_1", need)) lack.push(`玄兵·一等需 ${need}`);
    return { ok: !lack.length, lack, p: A.table[mult] || 0, need };
  }
  function awakenDo(hero, item, mult) {
    const pv = awakenPreview(hero, item, mult);
    if (!pv.ok) return fail(pv.lack.join("；"));
    use(hero, "xuanbing_1", pv.need);
    if (!chance(pv.p)) return fail("觉醒失败，玄兵消失");
    item.awaken = { lv: 1, cap: R().awaken.capDefault, exp: 0 };
    item.maxHoles = 12; item.holes = [];
    for (let i = 0; i < 12; i++) item.holes.push({ color: rollHoleColor(item, R().drill.newHoleWeight), gem: null });
    item.shenqi = { name: "神启·神临1级", text: "战斗中施放技能时，有几率附加 1 回合神临（占位效果）" };
    return ok("觉醒成功！12 孔全开，觉醒等级 1/60");
  }
  function awakenNeed(item) { return Math.round(R().awaken.expPerLevel * item.awaken.lv); }
  function awakenFeedDo(hero, item, n) {
    if (!item.awaken) return fail("未觉醒");
    if (!has(hero, "lingyuan", n)) return fail("灵元不足");
    if (item.awaken.lv >= item.awaken.cap) return fail("已达成长上限，用菩提子提升上限");
    use(hero, "lingyuan", n);
    item.awaken.exp += n * R().awaken.expPerLingyuan;
    while (item.awaken.lv < item.awaken.cap && item.awaken.exp >= awakenNeed(item)) { item.awaken.exp -= awakenNeed(item); item.awaken.lv++; }
    if (item.awaken.lv >= item.awaken.cap) item.awaken.exp = Math.min(item.awaken.exp, awakenNeed(item));
    if (item.awaken.lv % 10 === 0 && item.shenqi) item.shenqi.name = `神启·神临${Math.min(5, Math.ceil(item.awaken.lv / 30))}级`;
    return ok(`注灵完成：觉醒等级 ${item.awaken.lv}/${item.awaken.cap}`);
  }
  function bodhiDo(hero, item) {
    const A = R().awaken;
    if (!item.awaken) return fail("未觉醒");
    if (item.awaken.cap >= A.capMax) return fail("成长上限已满 160");
    if (!has(hero, "bodhi")) return fail("没有菩提子");
    use(hero, "bodhi", 1); item.awaken.cap = Math.min(A.capMax, item.awaken.cap + A.capPerBodhi);
    return ok(`神器吞灵：成长上限提升到 ${item.awaken.cap}`);
  }

  // ---------- 14. 分解 ----------
  function decomposePreview(hero, item) {
    if (item.color === "white") return { ok: false, lack: ["白色装备不能分解"] };
    const D = R().decompose;
    const gems = item.holes.filter((h) => h.gem).length;
    const n = Math.max(1, Math.round(D.colorBase[item.color] + item.stars * D.perStar + gems * D.perGem));
    const ess = EQ().essenceByGrade[gradeOf(item)];
    return { ok: true, lack: [], n, ess, warn: gems ? "已镶嵌的宝石会一起消失！" : "", nextChance: D.nextTierChance };
  }
  function decomposeDo(hero, bagIdx) {
    const e = hero.bag[bagIdx]; if (!e) return fail("请选择背包里的装备");
    const pv = decomposePreview(hero, e.item);
    if (!pv.ok) return fail(pv.lack.join("；"));
    hero.bag.splice(bagIdx, 1);
    give(hero, pv.ess, pv.n);
    let extra = "";
    if (chance(pv.nextChance)) { give(hero, "ess_lingcui", 1); extra = " + 灵淬精华×1"; }
    return ok(`分解获得 ${EQ().materials[pv.ess].name}×${pv.n}${extra}`);
  }

  // ---------- 15. 耐久 / 修理 / 出售 ----------
  function repairCost(item, mode) {
    const D = R().durability, miss = item.dur[1] - item.dur[0];
    return mode === "adv" ? miss * D.costPerPoint * D.advancedCostMult : miss * D.costPerPoint;
  }
  function repairDo(hero, item, mode) {
    const D = R().durability, miss = item.dur[1] - item.dur[0];
    if (!miss) return fail("耐久已满");
    const c = repairCost(item, mode);
    if (mode === "adv") {
      if (hero.silver < c) return fail("银两不足");
      hero.silver -= c; item.dur[0] = item.dur[1];
      return ok(`高级修理完成（${c} 银），耐久上限不变`);
    }
    if (hero.yinpiao < c) return fail("银票不足");
    hero.yinpiao -= c;
    item.dur[1] = Math.max(1, Math.floor(item.dur[1] * (1 - D.normalMaxLossPct)));
    item.dur[0] = item.dur[1];
    return ok(`普通修理完成（${c} 银票），耐久上限降为 ${item.dur[1]}`);
  }
  function wearDown(hero) {
    const L = R().durability.lossPerBattle;
    const broke = [];
    for (const it of Object.values(hero.equipment)) {
      if (!it || it.dur[0] <= 0) continue;
      it.dur[0] = Math.max(0, it.dur[0] - L);
      if (it.dur[0] === 0) broke.push(it.name);
    }
    return broke;
  }
  function sellPrice(item) { if (item.price) return item.price; return item.level * 10 * (EQ().colorOrder.indexOf(item.color) + 1); }
  function fmtYinpiao(wen) { const l = Math.floor(wen / 1000), w = wen % 1000; return (l ? l + "两" : "") + (w || !l ? w + "文" : "") + "银票"; }
  function sellDo(hero, bagIdx) {
    const e = hero.bag[bagIdx]; if (!e) return fail("无");
    const p = sellPrice(e.item); hero.bag.splice(bagIdx, 1); hero.yinpiao += p;
    return ok(`出售获得 ${fmtYinpiao(p)}`);
  }

  TSQ.Equip = {
    uid, rand, pick, chance, pct, gradeOf, gradeOfLevel, gradeName, mainStat, tplOf, makeItem, baseFinal, enchantValue,
    gemValue, mingkeHpPct, itemStats, heroBonus, setCounts, reqProblems, equipFromBag, unequip, equippedSameType,
    has, use, give, gemCount, gemAdd, bindItem,
    forgeTemplates, forgeRecipe, forgePreview, forgeDo, synthPreview, synthDo,
    starPreview, starDo, wuxianDo, mingkePreview, mingkeDo, drillPreview, drillDo, drillTools,
    washPreview, washDo, socketDo, removeDo, gemSynthPreview, gemSynthDo,
    enchantPreview, enchantDo, spiritPreview, spiritDo, identifyDo, kaiguangPreview, kaiguangDo,
    reforgePreview, reforgeDo, setReformPreview, setReformDo, awakenPreview, awakenDo, awakenNeed, awakenFeedDo, bodhiDo,
    decomposePreview, decomposeDo, repairCost, repairDo, wearDown, sellPrice, fmtYinpiao, sellDo
  };
})();
