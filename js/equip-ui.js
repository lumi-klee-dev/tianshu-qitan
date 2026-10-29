/* 装备界面：浮窗（仿参考截图结构）、纸娃娃、背包、打造面板（17 个页签） */
(function () {
  const EQ = () => TSQ.EQ, E = () => TSQ.Equip, R = () => TSQ.RATES;
  const $ = (s, r) => (r || document).querySelector(s);
  const $all = (s, r) => [...(r || document).querySelectorAll(s)];
  const sn = (k) => EQ().statNames[k] || k;
  const P = (p) => (Math.round(p * 1000) / 10) + "%";
  const esc = (s) => String(s).replace(/</g, "&lt;");

  // ---------- 简笔画图标（SVG 线稿） ----------
  const ICON = {
    weapon: '<path d="M8 36 L32 8 M28 8 L34 6 L32 12 M12 28 L16 32 M6 38 L10 34"/>',
    head: '<path d="M8 26 Q20 4 32 26 Z M6 26 L34 26 M20 6 L20 2"/>',
    shoulder: '<path d="M6 24 Q12 10 20 16 Q28 10 34 24 M10 24 L10 30 M30 24 L30 30"/>',
    body: '<path d="M12 8 L28 8 L34 16 L28 18 L28 34 L12 34 L12 18 L6 16 Z M20 8 L20 34"/>',
    belt: '<path d="M4 18 L36 18 L36 24 L4 24 Z M16 16 L24 16 L24 26 L16 26 Z"/>',
    legs: '<path d="M12 6 L28 6 L30 34 L22 34 L20 16 L18 34 L10 34 Z"/>',
    boots: '<path d="M12 6 L20 6 L20 26 L32 28 L32 34 L12 34 Z"/>',
    cape: '<path d="M14 6 L26 6 L34 34 Q20 30 6 34 Z"/>',
    bracelet: '<circle cx="20" cy="20" r="12"/><circle cx="20" cy="20" r="8"/>',
    ring: '<circle cx="20" cy="24" r="10"/><path d="M16 12 L20 6 L24 12 Z"/>',
    accessory: '<path d="M20 4 L20 14 M14 14 L26 14 L20 34 Z"/><circle cx="20" cy="24" r="3"/>'
  };
  function icon(type, color) {
    return `<svg class="eq-ico" viewBox="0 0 40 40" fill="none" stroke="${color || "#3a2a1a"}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICON[type] || ICON.accessory}</svg>`;
  }
  function cnInt(n) { const d = TSQ.EQ.cnNum; if (n <= 10) return d[n]; if (n < 20) return "十" + (n % 10 ? d[n % 10] : ""); return d[Math.floor(n / 10)] + "十" + (n % 10 ? d[n % 10] : ""); }
  function nameColor(it) { return it.awaken ? "#ff2a2a" : EQ().colors[it.color].css; }

  // ---------- 浮窗 ----------
  function fmtStat(k, v) {
    if (EQ().pctStats.includes(k)) return `+${Math.round(v * 1000)}‰ ${sn(k)}`;
    return `+${v} ${sn(k)}`;
  }
  function tooltipHTML(it, hero, opt) {
    opt = opt || {};
    if (!it) return "";
    const grade = E().gradeOf(it);
    const tierName = EQ().tiers[it.tier].name;
    let h = `<div class="tt">`;
    if (opt.header) h += `<div class="tt-head">— ${opt.header} —</div>`;
    if (!it.identified) {
      h += `<div class="tt-name" style="color:#ddd">未鉴定的${esc(it.name)}</div><div class="g">未鉴定</div>
        <div class="w">点击背包中的【鉴定】后再到打造面板【开光】决定属性</div></div>`;
      return h;
    }
    h += `<div class="tt-name" style="color:${nameColor(it)}">${tierName}的${esc(it.name)}${it.jie ? `（${cnInt(it.jie)}阶）` : ""}(${E().gradeName(grade)})${it.locked ? '<span class="g" style="margin-left:24px;font-weight:normal">已锁</span>' : ""}</div>`;
    if (it.awaken) {
      const need = E().awakenNeed(it), full = it.awaken.lv >= it.awaken.cap;
      const cur = full ? need : it.awaken.exp;
      h += `<div class="w">觉醒等级： ${it.awaken.lv}/${it.awaken.cap}<span class="aw-bar"><i style="width:${Math.min(100, cur / need * 100)}%"></i><b>${cur}/${need}</b></span></div>`;
    }
    h += `<div class="stars">${Array.from({ length: 13 }, (_, i) => `<span class="${i < it.stars ? "on" : "off"}">★</span>`).join("")}</div>`;
    h += `<div class="dias">${Array.from({ length: 9 }, (_, i) => `<span class="${i < it.mingke ? "on" : "off"}">◆</span>`).join("")}</div>`;
    h += `<div class="g">${it.bound ? "已绑定" : "未绑定"}<span class="gap"></span>${EQ().typeNames[it.type]}</div>`;
    if (it.unique) h += `<div class="g">装备唯一</div>`;
    h += `<div class="w">物品耐久：<span class="${it.dur[0] > 0 ? "g" : "r"}">${it.dur[0]}/${it.dur[1]}</span>${it.dur[0] <= 0 ? '<span class="r">（已损坏，属性失效）</span>' : ""}</div>`;
    const bad = hero ? E().reqProblems(hero, it) : [];
    const cls = it.req.classes ? it.req.classes.map((c) => TSQ.DATA.classes[c].name).join("/") : "全职业";
    const gen = it.req.gender ? (it.req.gender === "m" ? "男" : "女") : "";
    const rb = ["未转", "人物一转", "人物二转", "人物三转"][it.req.rebirth] || "";
    const rc = (k) => (bad.includes(k) ? "r" : "g");
    h += `<div><span class="${rc("等级不足")}">等级需求：${it.req.level}</span><span class="gap"></span><span class="${rc("职业不符")}${bad.includes("性别不符") ? " r" : ""}">职业需求：${gen}${cls}</span><span class="gap"></span><span class="${rc("转生不足")}">转生需求：${rb}</span></div>`;
    if (it.req.attr) h += `<div class="${rc("属性不足")}">属性需求：需要${Object.entries(it.req.attr).map(([k, v]) => v + sn(k)).join("、")}</div>`;
    const base = E().baseFinal(it);
    h += `<div class="w">基础属性：${Object.entries(base).map(([k, v]) => `+${v} ${sn(k)}`).join("　")}</div>`;
    if (it.kaiguang) h += `<div class="w">（可开光）</div>`;
    if (it.affixes.length) h += `<div class="b">增强属性：${it.bound ? it.affixes.map((a) => `<span class="${a.rare ? "rare" : ""}">${fmtStat(a.stat, a.value)}${a.lockBonus ? "↑" : ""}</span>`).join(" ") : "？？？"}</div>`;
    if (it.bindAttr) h += `<div class="g">绑定属性：${it.bound ? fmtStat(it.bindAttr.stat, it.bindAttr.value) : "？？？"}</div>`;
    if (it.shenqi) h += `<div class="g">${it.shenqi.name}：${it.shenqi.text}</div>`;
    if (it.mingke) {
      if (it.type === "weapon") h += `<div class="m">${it.mingke}级铭刻：+${Math.round(it.mingke * R().mingke.weaponAtkPct * 100)}% 基础攻击</div>`;
      else if (EQ().armorTypes.includes(it.type)) h += `<div class="m">${it.mingke}级铭刻：+${Math.round(E().mingkeHpPct(it) * 1000)}‰ HP上限</div>`;
      else h += `<div class="m">${it.mingke}级铭刻</div>`;
    }
    if (it.enchant && it.enchant.lv) {
      const baseV = E().enchantValue(it);
      const ym = (hero && TSQ.Yuanshen) ? TSQ.Yuanshen.mult(hero) : 1;
      const curV = ym > 1 ? baseV * ym : baseV;
      const note = ym > 1 ? `（含元神×${ym}）` : "";
      h += `<div class="m">${it.enchant.lv}级附魔：+${curV} ${it.enchant.type === "p" ? "防御" : "法术防"}${note}</div>`;
    }
    if (it.spirit.length) {
      h += `<div class="y">通灵属性：</div>`;
      it.spirit.forEach((a) => (h += `<div class="y">${fmtStat(a.stat, a.value)}</div>`));
    }
    it.holes.forEach((ho) => {
      const hc = EQ().holeColors[ho.color];
      if (ho.gem) {
        const gm = EQ().gems[ho.gem.id];
        h += `<div class="c"><i class="dot" style="background:${hc.css}"></i>【${EQ().cnNum[ho.gem.lv]}级${gm.name}】 +${E().gemValue(ho.gem.id, ho.gem.lv)} ${sn(gm.stat)}</div>`;
      } else h += `<div class="c2"><i class="dot hollow" style="border-color:${hc.css}"></i>【${hc.name}色宝石孔】</div>`;
    });
    if (it.maxHoles) h += `<div class="g">当前孔数/最大孔数：${it.holes.length}/${it.maxHoles}</div>`;
    const setId = it.setId;
    if (setId) {
      const set = EQ().sets[setId];
      const worn = hero ? (E().setCounts(hero)[setId] || new Set()) : new Set();
      h += `<div class="set">${set.name}(${worn.size}/8)</div>`;
      h += `<div>${set.pieceOrder.map((t) => `<span class="${worn.has(t) ? "w" : "dim"}">${set.pieceNames[t]}</span>`).join(" ")}</div>`;
      for (let i = 0; i < set.bonus.length; i += 2) {
        h += `<div>${[set.bonus[i], set.bonus[i + 1]].filter(Boolean).map((b) => `<span class="${worn.size >= b.n ? "g" : "dim"}">${b.text}</span>`).join("　")}</div>`;
      }
      if (set.desc && !it.desc) h += `<div class="lore">${set.desc}</div>`;
    }
    if (it.desc) h += `<div class="lore">${esc(it.desc)}</div>`;
    h += `<div class="w">出售单价：${E().fmtYinpiao(E().sellPrice(it))}</div>`;
    return h + `</div>`;
  }
  function showTip(html, x, y) {
    const tip = $("#tooltip");
    tip.className = "eqtip";
    tip.innerHTML = html;
    tip.style.display = "block"; tip.style.left = "0px"; tip.style.top = "0px";
    const r = tip.getBoundingClientRect(), pad = 8;
    let left = x + 16, top = y + 12;
    if (left + r.width > innerWidth - pad) left = Math.max(pad, x - r.width - 12);
    if (top + r.height > innerHeight - pad) top = Math.max(pad, innerHeight - r.height - pad);
    tip.style.left = left + "px"; tip.style.top = top + "px";
  }
  function hideTip() { const t = $("#tooltip"); t.style.display = "none"; }
  function tipFor(it, hero, compare) {
    let html = `<div class="tt-wrap">${tooltipHTML(it, hero)}`;
    if (compare) {
      const cur = E().equippedSameType(hero, it);
      if (cur && cur !== it) html += tooltipHTML(cur, hero, { header: "当前装备" });
    }
    return html + "</div>";
  }
  function bindTip(el, it, hero, compare) {
    if (!it) return;
    const f = (e) => showTip(tipFor(it, hero, compare), e.clientX, e.clientY);
    el.onmouseenter = f; el.onmousemove = f; el.onmouseleave = hideTip;
  }

  function slotHTML(it, label) {
    if (!it) return `<div class="eqs empty"><span class="eqs-lbl">${label || ""}</span></div>`;
    return `<div class="eqs" style="--qc:${nameColor(it)}">${icon(it.type, "#e9d6a8")}
      ${it.stars ? `<span class="eqs-star">${it.stars}★</span>` : ""}${it.awaken ? '<span class="eqs-aw">醒</span>' : ""}
      ${!it.bound ? '<span class="eqs-nb">未绑</span>' : ""}${it.dur[0] <= 0 ? '<span class="eqs-broken">损</span>' : ""}</div>`;
  }

  function fabaoSlotHTML(curFabao) {
    if (!curFabao) return `<div class="eqs empty fabao-empty"><span class="eqs-lbl">法宝</span></div>`;
    return `<div class="eqs eqs-fabao" style="--qc:#ff9800">
      <span class="eqs-fb-ico">${curFabao.def.icon}</span>
      <span class="eqs-star">${curFabao.rank}阶</span>
    </div>`;
  }

  // ---------- 纸娃娃（人物·装备页） ----------
  const LEFT = ["head", "shoulder", "body", "belt", "legs", "boots", "cape", "weapon"];
  const RIGHT = ["ring1", "ring2", "bracelet1", "bracelet2", "acc1", "acc2", "acc3", "acc4"];
  function renderPaperdoll(root, hero, onChange) {
    const slotName = (id) => EQ().slots.find((s) => s.id === id).name;
    const col = (ids) => ids.map((id) => `<div class="pd-slot" data-slot="${id}">${slotHTML(hero.equipment[id], slotName(id))}</div>`).join("");
    const sets = E().setCounts(hero);
    const setLine = Object.entries(sets).map(([k, s]) => `${EQ().sets[k].name} ${s.size}/8`).join("；") || "无套装";
    const curFabao = TSQ.Fabao ? TSQ.Fabao.equippedFabao(hero) : null;
    const fbText = curFabao ? `【${curFabao.rank}阶·${curFabao.def.name}】` : "未装备法宝";
    root.innerHTML = `<div class="pd">
      <div class="pd-col">${col(LEFT)}</div>
      <div class="pd-mid">
        <canvas id="pd-cv" width="150" height="185"></canvas>
        <div class="pd-fabao-wrap">
          <div class="pd-slot pd-fabao-slot" id="pd-slot-fabao">
            ${fabaoSlotHTML(curFabao)}
          </div>
          <div class="pd-fabao-desc">
            <span class="pd-fabao-tag">法宝位（三转）</span>
            <span class="pd-fabao-val">${fbText}</span>
          </div>
        </div>
        <div class="pd-info">${setLine}</div>
        <div class="pd-info small">16部位+法宝位 · 悬停看属性 · 点击卸下</div>
      </div>
      <div class="pd-col">${col(RIGHT)}</div>
    </div>`;
    const cv = $("#pd-cv", root);
    if (cv && TSQ.UI && TSQ.UI.drawStick) { TSQ.UI.drawStick(cv, "hero"); }
    $all(".pd-slot[data-slot]", root).forEach((el) => {
      const it = hero.equipment[el.dataset.slot];
      bindTip(el, it, hero, false);
      el.onclick = () => { if (!it) return; hideTip(); const r = E().unequip(hero, el.dataset.slot); onChange(r); };
    });
    const fbEl = $("#pd-slot-fabao", root);
    if (fbEl && TSQ.Fabao) {
      if (curFabao) {
        const f = (e) => showTip(TSQ.Fabao.tooltipHTML(curFabao, hero), e.clientX, e.clientY);
        fbEl.onmouseenter = f; fbEl.onmousemove = f; fbEl.onmouseleave = hideTip;
        fbEl.onclick = () => {
          hideTip();
          const r = TSQ.Fabao.unequip(hero);
          onChange(r);
        };
      } else {
        const f = (e) => showTip(`<div class="tt fabao-tt"><div class="tt-name" style="color:#ff9800">法宝装备位（三转）</div><div class="w">三转后开启。可在人物面板「法宝」页签选择法宝装备并使用印记之魂进阶。</div></div>`, e.clientX, e.clientY);
        fbEl.onmouseenter = f; fbEl.onmousemove = f; fbEl.onmouseleave = hideTip;
        fbEl.onclick = () => {
          hideTip();
          if (TSQ.UI && TSQ.UI.state) {
            TSQ.UI.state.charTab = "法宝";
            if (typeof TSQ.UI.renderChar === "function") TSQ.UI.renderChar();
          }
        };
      }
    }
  }

  // ---------- 背包 ----------
  const bagState = { sel: -1 };
  function renderBag(root, hero, onChange) {
    const sel = hero.bag[bagState.sel];
    root.innerHTML = `<div class="modal-body bag2">
      <div>
        <div class="sec-t">装备（悬停：左=此件，右=当前装备 对比）</div>
        <div class="bag2-grid" id="b2-eq"></div>
        <div class="sec-t">宝石</div><div class="bag2-gems" id="b2-gems"></div>
        <div class="sec-t">材料</div><div class="bag2-mats" id="b2-mats"></div>
      </div>
      <div class="bag2-side">
        <div class="sec-t">选中装备</div>
        <div id="b2-sel">${sel ? tooltipHTML(sel.item, hero) : '<div class="hint">点击左侧装备</div>'}</div>
        <div class="b2-acts">${sel ? `
          <button class="btn primary small" data-b="wear">穿戴</button>
          ${!sel.item.bound ? '<button class="btn small" data-b="bind">绑定（显示？？？属性）</button>' : ""}
          ${!sel.item.identified ? '<button class="btn small" data-b="ident">鉴定</button>' : ""}
          <button class="btn small" data-b="forge">去打造</button>
          <button class="btn small danger" data-b="sell">出售 ${E().fmtYinpiao(E().sellPrice(sel.item))}</button>` : ""}
        </div>
        <div class="hint mt8">银两 ${hero.silver} · 银票 ${hero.yinpiao} · 元神值 ${(hero.yuanshen && typeof hero.yuanshen === "object") ? (hero.yuanshen.value || 0) : (hero.yuanshen || 0)}</div>
      </div></div>`;
    const g = $("#b2-eq", root);
    for (let i = 0; i < 30; i++) {
      const e = hero.bag[i];
      const d = document.createElement("div");
      d.className = "bag2-cell" + (i === bagState.sel ? " sel" : "");
      d.innerHTML = slotHTML(e && e.item);
      if (e) { bindTip(d, e.item, hero, true); d.onclick = () => { bagState.sel = i; hideTip(); renderBag(root, hero, onChange); }; }
      g.appendChild(d);
    }
    $("#b2-gems", root).innerHTML = Object.entries(hero.gemInv).sort().map(([k, n]) => {
      const [id, lv] = k.split(":"); const gm = EQ().gems[id];
      return `<span class="gem-chip" title="${sn(gm.stat)} +${E().gemValue(id, +lv)}"><i class="dot" style="background:${EQ().holeColors[gm.hole].css}"></i>${lv}级${gm.name}×${n}</span>`;
    }).join("");
    $("#b2-mats", root).innerHTML = Object.entries(hero.mats).filter(([, n]) => n > 0).map(([id, n]) =>
      `<span class="mat-chip" title="${EQ().materials[id].desc}">${EQ().materials[id].name}×${n}</span>`).join("");
    $all("[data-b]", root).forEach((b) => (b.onclick = () => {
      const i = bagState.sel, it = hero.bag[i] && hero.bag[i].item; let r;
      if (b.dataset.b === "wear") { r = TSQ.Game.equipFromBag(hero, i); if (r.ok) bagState.sel = -1; }
      if (b.dataset.b === "bind") { E().bindItem(it); r = { ok: true, msg: "已绑定，附加属性已显示" }; }
      if (b.dataset.b === "ident") r = E().identifyDo(hero, it);
      if (b.dataset.b === "sell") { r = E().sellDo(hero, i); bagState.sel = -1; }
      if (b.dataset.b === "forge") { forgeState.sel = { src: "bag", key: i }; TSQ.UI.openModal("forge"); return; }
      onChange(r); renderBag(root, hero, onChange);
    }));
  }

  // ---------- 打造面板 ----------
  const TABS = ["打造", "原料合成", "升星", "铭刻", "打孔", "洗孔", "镶嵌", "摘除", "宝石合成", "附魔", "通灵", "开光", "属性改造", "套装改造", "觉醒", "分解", "修理"];
  const NO_ITEM = ["打造", "原料合成", "宝石合成"];
  const forgeState = {
    tab: "打造", sel: null, hole: -1, log: [],
    ftype: "head", ffam: "taixu", ftier: "radiant", qty: {},
    chain: "shanggu", chainLv: 5, chainBase: 5,
    n: { star: 1, mk: 1, drill: 1, wash: 1, gem: 5, ench: 1, water: 0, kg: 1, extra: 0, aw: 5, feed: 10 },
    wenyu: false, guiyuan: false, drillTool: null, enchType: "m", tl: "tongling_50", kgTool: "kg_nvshen",
    locks: [], gemSel: null, autoTo: 13, mkTo: 9, wenyuStop: true
  };
  function selItem(hero) {
    const s = forgeState.sel; if (!s) return null;
    if (s.src === "eq") return hero.equipment[s.key] || null;
    const e = hero.bag[s.key]; return e ? e.item : null;
  }
  const nBtns = (key, from, to, label) => `<div class="nrow"><span class="nlab">${label}</span>${Array.from({ length: to - from + 1 }, (_, i) => from + i)
    .map((v) => `<button class="nb ${forgeState.n[key] === v ? "on" : ""}" data-n="${key}" data-v="${v}">${v}</button>`).join("")}</div>`;
  const rateBox = (p, label) => `<div class="rate"><div class="rate-lab">${label || "成功率"}</div><div class="rate-v" style="color:${p >= 0.8 ? "#3c3" : p >= 0.4 ? "#e90" : "#e33"}">${P(p)}</div><div class="rate-bar"><i style="width:${p * 100}%"></i></div></div>`;
  const lackBox = (pv) => (pv && pv.lack && pv.lack.length ? `<div class="lack">⚠ ${pv.lack.join("；")}</div>` : "");
  const haveTxt = (hero, id) => `${EQ().materials[id].name}（持有 ${hero.mats[id] || 0}）`;
  const holeChips = (it, filter) => `<div class="hchips">${it.holes.map((h, i) => {
    const hc = EQ().holeColors[h.color]; const dis = filter && !filter(h);
    return `<button class="hchip ${forgeState.hole === i ? "on" : ""} ${dis ? "dis" : ""}" data-hole="${i}" style="--hc:${hc.css}" ${dis ? "disabled" : ""}>${h.gem ? h.gem.lv : "○"}</button>`;
  }).join("") || '<span class="hint">没有孔</span>'}</div>`;

  function opPanel(hero, it) {
    const t = forgeState.tab, n = forgeState.n;
    let h = "";
    if (t === "打造") {
      const fams = EQ().families.filter((f) => f.types.includes(forgeState.ftype));
      if (!fams.find((f) => f.id === forgeState.ffam)) forgeState.ffam = fams[0].id;
      const tplId = forgeState.ffam + "_" + forgeState.ftype;
      const rec = E().forgeRecipe(tplId, forgeState.ftier);
      rec.forEach((r) => { if (forgeState.qty[r.key] == null) forgeState.qty[r.key] = r.qty; });
      const pv = E().forgePreview(hero, tplId, forgeState.ftier, forgeState.qty);
      h += `<div class="frow">类型 <select data-sel="ftype">${Object.entries(EQ().typeNames).map(([k, v]) => `<option value="${k}" ${k === forgeState.ftype ? "selected" : ""}>${v}</option>`).join("")}</select>
        等级 <select data-sel="ffam">${fams.map((f) => `<option value="${f.id}" ${f.id === forgeState.ffam ? "selected" : ""}>${f.level}级 ${f.name}</option>`).join("")}</select>
        档次 <select data-sel="ftier">${EQ().tierOrder.map((k) => `<option value="${k}" ${k === forgeState.ftier ? "selected" : ""}>${EQ().tiers[k].name}（${EQ().tiers[k].matGrade}等材料）</option>`).join("")}</select></div>`;
      h += `<table class="rec"><tr><th>材料</th><th>基础</th><th>投入</th><th>持有</th></tr>${rec.map((r) => `<tr><td>${EQ().materials[r.key].name}${r.rare ? '<span class="rare-tag">稀有×3权重</span>' : ""}</td><td>${r.qty}</td>
        <td><button class="pm" data-q="${r.key}" data-d="-1">−</button><input class="qin" data-qin="${r.key}" value="${forgeState.qty[r.key]}"><button class="pm" data-q="${r.key}" data-d="1">＋</button></td><td>${hero.mats[r.key] || 0}</td></tr>`).join("")}</table>`;
      h += `<div class="nrow"><span class="nlab">一键倍数</span>${[1, 2, 3, 4, 5].map((m) => `<button class="nb ${Math.abs(pv.mult - m) < 0.01 ? "on" : ""}" data-mult="${m}">${m}倍</button>`).join("")}</div>`;
      h += `<div class="mult">当前倍数 <b>${pv.mult.toFixed(2)}</b> 倍 ${pv.mult >= 5 ? '<span class="g">（满倍：必橙、最大孔数 10）</span>' : ""}</div>`;
      h += `<div class="odds">${EQ().colorOrder.map((c, i) => `<div class="odd"><span style="color:${EQ().colors[c].css}">${EQ().colors[c].name}</span><div class="ob"><i style="width:${pv.odds[i] * 100}%;background:${EQ().colors[c].css}"></i></div><b>${P(pv.odds[i])}</b></div>`).join("")}</div>`;
      h += `<div class="small">最大孔数 ${pv.maxHoles} · 每孔开出率 ${P(pv.holeP)} · 银两 ${pv.silver}</div>${lackBox(pv)}`;
      h += `<div class="acts"><button class="btn" data-act="sim">模拟打造</button><button class="btn primary" data-act="forge" ${pv.ok ? "" : "disabled"}>打造</button></div>`;
      return h;
    }
    if (t === "原料合成") {
      const ch = EQ().synthChains.find((c) => c.id === forgeState.chain);
      const lvs = ch.kind === "enchant" ? [1, 2, 3, 4, 5] : [5, 4, 3, 2];
      if (!lvs.includes(forgeState.chainLv)) forgeState.chainLv = lvs[0];
      const pv = E().synthPreview(hero, ch.id, forgeState.chainLv, forgeState.chainBase);
      h += `<div class="frow">材料 <select data-sel="chain">${EQ().synthChains.map((c) => `<option value="${c.id}" ${c.id === ch.id ? "selected" : ""}>${c.name}</option>`).join("")}</select>
        从 <select data-sel="chainLv">${lvs.map((l) => `<option value="${l}" ${l === forgeState.chainLv ? "selected" : ""}>${EQ().materials[ch.key(l)].name}</option>`).join("")}</select></div>`;
      h += `<div class="nrow"><span class="nlab">合成基数</span>${[2, 3, 4, 5].map((v) => `<button class="nb ${forgeState.chainBase === v ? "on" : ""}" data-cb="${v}">${v}合1</button>`).join("")}</div>`;
      h += pv.src ? `<div class="small">${haveTxt(hero, pv.src)} → ${EQ().materials[pv.dst].name}（持有 ${hero.mats[pv.dst] || 0}）</div>` : "";
      h += rateBox(pv.p || 0) + `<div class="small">失败：投入的材料全部消失</div>` + lackBox(pv);
      h += `<div class="acts"><button class="btn primary" data-act="synth" ${pv.ok ? "" : "disabled"}>合成</button><button class="btn" data-act="synth10" ${pv.ok ? "" : "disabled"}>连续合成×10</button></div>`;
      return h;
    }
    if (t === "宝石合成") {
      const keys = Object.keys(hero.gemInv).sort();
      if (!forgeState.gemSel || !hero.gemInv[forgeState.gemSel]) forgeState.gemSel = keys[0] || null;
      h += `<div class="gemlist">${keys.map((k) => { const [id, lv] = k.split(":"); const gm = EQ().gems[id];
        return `<button class="gem-chip ${k === forgeState.gemSel ? "on" : ""}" data-gsel="${k}"><i class="dot" style="background:${EQ().holeColors[gm.hole].css}"></i>${lv}级${gm.name}×${hero.gemInv[k]}</button>`; }).join("")}</div>`;
      if (forgeState.gemSel) {
        const [id, lv] = forgeState.gemSel.split(":");
        const pv = E().gemSynthPreview(hero, id, +lv, n.gem);
        h += nBtns("gem", 3, 5, "放入宝石数");
        h += `<div class="small">${lv}级${EQ().gems[id].name}（+${E().gemValue(id, +lv)}）→ ${+lv + 1}级（+${E().gemValue(id, Math.min(7, +lv + 1))}）· 需要${pv.charm ? EQ().materials[pv.charm].name : ""}（持有 ${hero.mats[pv.charm] || 0}）</div>`;
        h += rateBox(pv.p) + `<div class="small">失败：放入的宝石全部消失（合成符照扣）</div>` + lackBox(pv);
        h += `<div class="acts"><button class="btn primary" data-act="gsynth" ${pv.ok ? "" : "disabled"}>合成</button></div>`;
      }
      return h;
    }
    if (!it) return `<div class="hint">← 先在左侧选择一件装备</div>`;
    if (t === "升星") {
      const pv = E().starPreview(hero, it, n.star);
      h += `<div class="small">当前 ${it.stars}/13 星 · 每星 +${R().starUp.statPerStar * 100}% 基础属性</div>`;
      h += nBtns("star", 1, 5, "合成基数（宝石数）");
      if (pv.stone) h += `<div class="small">${haveTxt(hero, pv.stone)} · 银两 ${pv.silver}</div>`;
      h += rateBox(pv.p) + `<div class="small">失败：宝石消失，${pv.drop ? (pv.drop[1] ? `掉 ${pv.drop[0]}~${pv.drop[1]} 星` : "不掉星") : ""}；装备不会碎</div>` + lackBox(pv);
      h += `<div class="acts"><button class="btn primary" data-act="star" ${pv.ok ? "" : "disabled"}>升星</button>
        自动升至 <select data-sel="autoTo">${Array.from({ length: 13 }, (_, i) => i + 1).map((v) => `<option ${v === forgeState.autoTo ? "selected" : ""}>${v}</option>`).join("")}</select> 星
        <button class="btn" data-act="autostar" ${pv.ok ? "" : "disabled"}>自动升星</button>
        <button class="btn" data-act="wuxian">无限宝石（持有 ${hero.mats.wuxian_gem || 0}）</button></div>`;
      return h;
    }
    if (t === "铭刻") {
      const pv = E().mingkePreview(hero, it, n.mk, forgeState.wenyu);
      h += `<div class="small">当前 ${it.mingke}/9 级 · 武器每级 +3% 基础攻击，防具每级 +2% 基础防御 +0.5% HP上限</div>`;
      h += nBtns("mk", 1, R().mingke.maxStones, "生命石数");
      h += `<label class="chk"><input type="checkbox" data-chk="wenyu" ${forgeState.wenyu ? "checked" : ""}> 放入温玉（持有 ${hero.mats.wenyu || 0}）：失败不掉级</label>`;
      if (pv.stone) h += `<div class="small">${haveTxt(hero, pv.stone)}</div>`;
      h += rateBox(pv.p) + `<div class="small">失败惩罚：${pv.penalty || ""}</div>` + lackBox(pv);
      h += `<div class="acts"><button class="btn primary" data-act="mk" ${pv.ok ? "" : "disabled"}>铭刻</button>
        自动升至 <select data-sel="mkTo">${Array.from({ length: 9 }, (_, i) => i + 1).map((v) => `<option ${v === forgeState.mkTo ? "selected" : ""}>${v}</option>`).join("")}</select> 级
        <label class="chk"><input type="checkbox" data-chk="wenyuStop" ${forgeState.wenyuStop ? "checked" : ""}>温玉用完即停</label>
        <button class="btn" data-act="automk" ${pv.ok ? "" : "disabled"}>自动铭刻</button></div>`;
      return h;
    }
    if (t === "打孔") {
      const pv = E().drillPreview(hero, it, n.drill, forgeState.drillTool);
      h += `<div class="small">当前孔数/最大孔数：${it.holes.length}/${it.maxHoles} · 同色孔最多 6 个</div>${holeChips(it)}`;
      if (pv.tools) {
        h += `<div class="frow">打孔器 <select data-sel="drillTool">${pv.tools.map((tl) => `<option value="${tl}" ${tl === pv.tool ? "selected" : ""}>${haveTxt(hero, tl)}</option>`).join("")}</select></div>`;
        h += nBtns("drill", 1, R().drill.maxTools, "打孔器数");
        h += `<div class="small">新孔颜色概率：${Object.entries(R().drill.newHoleWeight).map(([c, w]) => `${EQ().holeColors[c].name} ${w}%`).join(" · ")}</div>`;
      }
      h += rateBox(pv.p || 0, `第 ${pv.k} 孔成功率`) + `<div class="small">失败：打孔器消耗，装备无损</div>` + lackBox(pv);
      h += `<div class="acts"><button class="btn primary" data-act="drill" ${pv.ok ? "" : "disabled"}>打孔</button></div>`;
      return h;
    }
    if (t === "洗孔") {
      h += `<div class="small">选择一个<b>空孔</b>（镶了宝石的孔要先摘除）</div>${holeChips(it, (x) => !x.gem)}`;
      const pv = E().washPreview(hero, it, forgeState.hole, n.wash);
      h += nBtns("wash", 1, R().washHole.maxCharms, "洗孔符数（越多粉/紫越高）");
      if (pv.odds) h += `<div class="odds">${Object.entries(pv.odds).map(([c, p]) => `<div class="odd"><span style="color:${EQ().holeColors[c].css}">${EQ().holeColors[c].name}</span><div class="ob"><i style="width:${p * 100}%;background:${EQ().holeColors[c].css}"></i></div><b>${P(p)}</b></div>`).join("")}</div>`;
      h += `<div class="small">${haveTxt(hero, "wash_charm")}</div>` + lackBox(pv);
      h += `<div class="acts"><button class="btn primary" data-act="wash" ${pv.ok ? "" : "disabled"}>洗孔</button></div>`;
      return h;
    }
    if (t === "镶嵌") {
      h += `<div class="small">选择空孔，再点同颜色宝石。粉红=五维 · 淡紫=攻击 · 天蓝=防御 · 鹅黄=闪避/命中/爆击</div>${holeChips(it, (x) => !x.gem)}`;
      const ho = it.holes[forgeState.hole];
      const keys = Object.keys(hero.gemInv).sort();
      h += `<div class="gemlist">${keys.map((k) => { const [id, lv] = k.split(":"); const gm = EQ().gems[id];
        const okc = ho && !ho.gem && gm.hole === ho.color;
        return `<button class="gem-chip ${okc ? "" : "dis"}" data-sock="${k}" ${okc ? "" : "disabled"}><i class="dot" style="background:${EQ().holeColors[gm.hole].css}"></i>${lv}级${gm.name} +${E().gemValue(id, +lv)}${sn(gm.stat)}×${hero.gemInv[k]}</button>`; }).join("")}</div>`;
      return h;
    }
    if (t === "摘除") {
      h += `<div class="small">选择有宝石的孔</div>${holeChips(it, (x) => !!x.gem)}`;
      const ho = it.holes[forgeState.hole];
      if (ho && ho.gem) {
        h += `<div class="small">【${ho.gem.lv}级${EQ().gems[ho.gem.id].name}】 低级摘除符：降 2 级（≤2 级消失），持有 ${hero.mats.remove_low || 0}；高级摘除符·${ho.gem.lv}级：无损，持有 ${hero.mats["remove_high_" + ho.gem.lv] || 0}</div>`;
        h += `<div class="acts"><button class="btn" data-act="rmlow">低级摘除符</button><button class="btn primary" data-act="rmhigh">高级摘除符</button></div>`;
      }
      return h;
    }
    if (t === "附魔") {
      const ym = (hero && TSQ.Yuanshen) ? TSQ.Yuanshen.mult(hero) : 1;
      const pv = E().enchantPreview(hero, it, forgeState.enchType, n.ench, forgeState.guiyuan);
      const curV = it.enchant ? E().enchantValue(it) * ym : 0;
      const ysVal = (hero && hero.yuanshen && typeof hero.yuanshen === "object") ? (hero.yuanshen.value || 0) : ((hero && hero.yuanshen) || 0);
      h += `<div class="small">当前：${it.enchant ? `${it.enchant.lv}级${it.enchant.type === "p" ? "物防" : "法防"}附魔 +${curV}${ym > 1 ? `（元神×${ym}）` : ""}` : "未附魔"} · 元神值 ${ysVal} · 当前元神倍率 <b style="color:#ffd84a">×${ym}</b></div>`;
      h += `<div class="nrow"><span class="nlab">附魔类型</span><button class="nb ${forgeState.enchType === "p" ? "on" : ""}" data-et="p">物防</button><button class="nb ${forgeState.enchType === "m" ? "on" : ""}" data-et="m">法防</button></div>`;
      h += nBtns("ench", 1, 5, "元神倍数");
      h += `<label class="chk"><input type="checkbox" data-chk="guiyuan" ${forgeState.guiyuan ? "checked" : ""}> 归元灵玉（持有 ${hero.mats.guiyuan || 0}）：失败不掉级</label>`;
      if (pv.stone) h += `<div class="small">目标 ${pv.target} 级 · ${haveTxt(hero, pv.stone)} · 元神 ${pv.yuanshen}${pv.note ? ` · <span class="r">${pv.note}</span>` : ""}</div>`;
      h += rateBox(pv.p || 0) + (pv.penalty ? `<div class="small">${pv.penalty}</div>` : "") + lackBox(pv);
      h += `<div class="acts"><button class="btn primary" data-act="ench" ${pv.ok ? "" : "disabled"}>附魔</button></div>`;
      return h;
    }
    if (t === "通灵") {
      const pv = E().spiritPreview(hero, it, forgeState.tl, n.water);
      h += `<div class="frow">通灵 <select data-sel="tl">${["tongling_20", "tongling_50", "tongling_80"].map((x) => `<option value="${x}" ${x === forgeState.tl ? "selected" : ""}>${haveTxt(hero, x)}</option>`).join("")}</select></div>`;
      h += nBtns("water", 0, R().spirit.maxWater, "无上养元水（+15灵气）");
      h += `<div class="mult">灵气 <b>${pv.g}</b> / 100（覆盖原通灵）</div>`;
      h += `<div class="odds">${pv.dist.map((p, i) => `<div class="odd"><span>${i + 1}条</span><div class="ob"><i style="width:${p * 100}%;background:#ffe14d"></i></div><b>${P(p)}</b></div>`).join("")}</div>` + lackBox(pv);
      h += `<div class="acts"><button class="btn primary" data-act="spirit" ${pv.ok ? "" : "disabled"}>通灵</button></div>`;
      return h;
    }
    if (t === "开光") {
      if (!it.kaiguang) return `<div class="hint">此装备不可开光（凰的灰烬 / 时光的灰烬 / 流星碎片 可开光）</div>`;
      if (!it.identified) return `<div class="small">未鉴定装备需先鉴定</div><div class="acts"><button class="btn primary" data-act="ident">鉴定</button></div>`;
      const pv = E().kaiguangPreview(hero, it, forgeState.kgTool, n.kg);
      h += `<div class="frow">开光道具 <select data-sel="kgTool">${Object.keys(R().kaiguang.tools).map((x) => `<option value="${x}" ${x === forgeState.kgTool ? "selected" : ""}>${haveTxt(hero, x)}</option>`).join("")}</select></div>`;
      h += nBtns("kg", 1, R().kaiguang.maxTools, "道具数");
      h += `<div class="odds">${EQ().colorOrder.map((c, i) => `<div class="odd"><span style="color:${EQ().colors[c].css}">${EQ().colors[c].name}</span><div class="ob"><i style="width:${pv.odds[i] * 100}%;background:${EQ().colors[c].css}"></i></div><b>${P(pv.odds[i])}</b></div>`).join("")}</div>`;
      h += (pv.warn ? `<div class="lack">${pv.warn}</div>` : "") + lackBox(pv);
      h += `<div class="acts"><button class="btn primary" data-act="kg" ${pv.ok ? "" : "disabled"}>开光</button></div>`;
      return h;
    }
    if (t === "属性改造") {
      forgeState.locks = forgeState.locks.filter((i) => i < it.affixes.length);
      const pv = E().reforgePreview(hero, it, forgeState.locks, n.extra);
      h += `<div class="small">勾选要锁定的词条（锁定的不变，首次锁定 +10%）</div>`;
      h += it.affixes.map((a, i) => `<label class="chk"><input type="checkbox" data-lock="${i}" ${forgeState.locks.includes(i) ? "checked" : ""}> ${it.bound ? fmtStat(a.stat, a.value) : "？？？"}${a.rare ? "（稀有）" : ""}</label>`).join("<br>");
      h += nBtns("extra", 0, R().reforge.maxExtra, "额外棱柱（提高稀有词条）");
      if (pv.prism) h += `<div class="small">消耗 ${EQ().materials[pv.prism].name}×${pv.np}（持有 ${hero.mats[pv.prism] || 0}）· 银两 ${pv.silver}</div>`;
      if (pv.rare != null) h += rateBox(pv.rare, "每条出现稀有词条概率");
      h += lackBox(pv) + `<div class="acts"><button class="btn primary" data-act="reforge" ${pv.ok ? "" : "disabled"}>改造</button></div>`;
      return h;
    }
    if (t === "套装改造") {
      const pv = E().setReformPreview(hero, it);
      if (pv.set) h += `<div class="set-prev"><b style="color:#ffd040">${pv.set.name}</b><br>${pv.set.bonus.map((b) => b.text).join("<br>")}</div>`;
      h += `<div class="small">材料：${Object.entries(R().setReform.mats).map(([m, k]) => `${EQ().materials[m].name}×${k}（持有 ${hero.mats[m] || 0}）`).join("、")}；成功率 100%，不影响属性/星/铭刻/宝石；改造后不能属性改造</div>`;
      h += lackBox(pv) + `<div class="acts"><button class="btn primary" data-act="setref" ${pv.ok ? "" : "disabled"}>套装改造</button></div>`;
      return h;
    }
    if (t === "觉醒") {
      if (it.awaken) {
        h += `<div class="mult">觉醒等级 <b>${it.awaken.lv}/${it.awaken.cap}</b> · 经验 ${it.awaken.exp}/${E().awakenNeed(it)}</div>`;
        h += nBtns("feed", 1, 10, "注入灵元");
        h += `<div class="acts"><button class="btn primary" data-act="feed">注灵（灵元 ${hero.mats.lingyuan || 0}）</button><button class="btn" data-act="bodhi">神器吞灵：菩提子 +10 上限（持有 ${hero.mats.bodhi || 0}）</button></div>`;
        return h;
      }
      const pv = E().awakenPreview(hero, it, n.aw);
      h += `<div class="small">条件：≥140 级、光芒、橙色、13 星、9 铭刻、无宝石、已绑定、人物三转。成功后 12 孔全开，成长上限 60。</div>`;
      h += nBtns("aw", 1, 5, `玄兵·一等倍数（×${R().awaken.baseXuanbing}）`);
      h += `<div class="small">${haveTxt(hero, "xuanbing_1")} · 本次需要 ${pv.need}</div>`;
      h += rateBox(pv.p) + `<div class="small">失败：玄兵消失</div>` + lackBox(pv);
      h += `<div class="acts"><button class="btn primary" data-act="awaken" ${pv.ok ? "" : "disabled"}>觉醒</button></div>`;
      return h;
    }
    if (t === "分解") {
      if (!forgeState.sel || forgeState.sel.src !== "bag") return `<div class="hint">只能分解背包里的装备（先卸下）</div>`;
      const pv = E().decomposePreview(hero, it);
      if (pv.ok) h += `<div class="small">可能获得：${EQ().materials[pv.ess].name}×${pv.n}，${P(pv.nextChance)} 额外灵淬精华</div>`;
      h += (pv.warn ? `<div class="lack">${pv.warn}</div>` : "") + lackBox(pv);
      h += `<div class="acts"><button class="btn danger" data-act="decomp" ${pv.ok ? "" : "disabled"}>分解</button></div>`;
      return h;
    }
    if (t === "修理") {
      h += `<div class="small">耐久 ${it.dur[0]}/${it.dur[1]}（每场胜利 -${R().durability.lossPerBattle}，归零属性失效）</div>`;
      h += `<div class="small">普通修理（银票 ${E().repairCost(it, "normal")}）：耐久上限 -${R().durability.normalMaxLossPct * 100}%<br>高级修理（银两 ${E().repairCost(it, "adv")}）：上限不变</div>`;
      h += `<div class="acts"><button class="btn" data-act="rep_n">普通修理</button><button class="btn primary" data-act="rep_a">高级修理</button><button class="btn" data-act="rep_all">全身高级修理</button></div>`;
      return h;
    }
    return h;
  }

  function renderForge(root, hero, onChange) {
    const ym = (hero && TSQ.Yuanshen) ? TSQ.Yuanshen.mult(hero) : 1;
    if (forgeState._enchAlignMult !== ym) {
      forgeState._enchAlignMult = ym;
      forgeState.n.ench = Math.min(5, Math.max(1, ym));
    }
    const it = selItem(hero);
    const t = forgeState.tab;
    const picker = (() => {
      if (NO_ITEM.includes(t)) return `<div class="hint">此页签不需要选择装备</div>`;
      let s = `<div class="sec-t">已装备</div><div class="fpick">`;
      EQ().slots.forEach((sl) => { const x = hero.equipment[sl.id]; if (x) s += `<div class="fp ${forgeState.sel && forgeState.sel.src === "eq" && forgeState.sel.key === sl.id ? "sel" : ""}" data-pick="eq:${sl.id}">${slotHTML(x)}</div>`; });
      s += `</div><div class="sec-t">背包</div><div class="fpick">`;
      hero.bag.forEach((e, i) => { s += `<div class="fp ${forgeState.sel && forgeState.sel.src === "bag" && forgeState.sel.key === i ? "sel" : ""}" data-pick="bag:${i}">${slotHTML(e.item)}</div>`; });
      return s + `</div>`;
    })();
    root.innerHTML = `<div class="ftabs">${TABS.map((x) => `<button class="ftab ${x === t ? "on" : ""}" data-tab="${x}">${x}</button>`).join("")}</div>
      <div class="fbody">
        <div class="fleft">${picker}</div>
        <div class="fmid">${NO_ITEM.includes(t) ? `<div class="hint">银两 ${hero.silver} · 银票 ${hero.yinpiao}</div>` : (it ? tooltipHTML(it, hero) : '<div class="hint">请选择装备</div>')}</div>
        <div class="fright"><div class="op-title">${t}</div>${opPanel(hero, it)}
          <div class="flog">${forgeState.log.slice(-8).reverse().map((l) => `<div class="${l.ok ? "g" : "r"}">${l.msg}</div>`).join("")}</div></div>
      </div>`;
    const rerender = () => renderForge(root, hero, onChange);
    const done = (r) => { if (r) { forgeState.log.push(r); onChange(r, true); } rerender(); };
    $all("[data-tab]", root).forEach((b) => (b.onclick = () => { forgeState.tab = b.dataset.tab; forgeState.hole = -1; rerender(); }));
    $all("[data-pick]", root).forEach((el) => {
      const [src, key] = el.dataset.pick.split(":");
      const x = src === "eq" ? hero.equipment[key] : hero.bag[+key].item;
      bindTip(el, x, hero, src === "bag");
      el.onclick = () => { hideTip(); forgeState.sel = { src, key: src === "eq" ? key : +key }; forgeState.hole = -1; forgeState.locks = []; rerender(); };
    });
    $all("[data-n]", root).forEach((b) => (b.onclick = () => { forgeState.n[b.dataset.n] = +b.dataset.v; rerender(); }));
    $all("[data-sel]", root).forEach((s) => (s.onchange = () => {
      const k = s.dataset.sel; let v = s.value;
      if (["chainLv", "autoTo", "mkTo"].includes(k)) v = +v;
      forgeState[k] = v; if (k === "ftype" || k === "ffam" || k === "ftier") forgeState.qty = {};
      rerender();
    }));
    $all("[data-chk]", root).forEach((c) => (c.onchange = () => { forgeState[c.dataset.chk] = c.checked; rerender(); }));
    $all("[data-lock]", root).forEach((c) => (c.onchange = () => {
      const i = +c.dataset.lock; forgeState.locks = c.checked ? [...forgeState.locks, i] : forgeState.locks.filter((x) => x !== i); rerender();
    }));
    $all("[data-hole]", root).forEach((b) => (b.onclick = () => { forgeState.hole = +b.dataset.hole; rerender(); }));
    $all("[data-q]", root).forEach((b) => (b.onclick = () => {
      const k = b.dataset.q, base = E().forgeRecipe(forgeState.ffam + "_" + forgeState.ftype, forgeState.ftier).find((r) => r.key === k).qty;
      forgeState.qty[k] = Math.max(0, (forgeState.qty[k] || 0) + (+b.dataset.d) * Math.max(1, Math.round(base / 2))); rerender();
    }));
    $all("[data-qin]", root).forEach((inp) => (inp.onchange = () => { forgeState.qty[inp.dataset.qin] = Math.max(0, parseInt(inp.value) || 0); rerender(); }));
    $all("[data-mult]", root).forEach((b) => (b.onclick = () => {
      E().forgeRecipe(forgeState.ffam + "_" + forgeState.ftype, forgeState.ftier).forEach((r) => (forgeState.qty[r.key] = r.qty * +b.dataset.mult)); rerender();
    }));
    $all("[data-cb]", root).forEach((b) => (b.onclick = () => { forgeState.chainBase = +b.dataset.cb; rerender(); }));
    $all("[data-gsel]", root).forEach((b) => (b.onclick = () => { forgeState.gemSel = b.dataset.gsel; rerender(); }));
    $all("[data-et]", root).forEach((b) => (b.onclick = () => { forgeState.enchType = b.dataset.et; rerender(); }));
    $all("[data-sock]", root).forEach((b) => (b.onclick = () => { const [id, lv] = b.dataset.sock.split(":"); done(E().socketDo(hero, it, forgeState.hole, id, +lv)); }));
    const n = forgeState.n;
    const acts = {
      sim: () => { const pv = E().forgePreview(hero, forgeState.ffam + "_" + forgeState.ftype, forgeState.ftier, forgeState.qty);
        return { ok: true, msg: `模拟打造：倍数 ${pv.mult.toFixed(2)} → 橙 ${P(pv.odds[4])} / 紫 ${P(pv.odds[3])} / 蓝 ${P(pv.odds[2])}` }; },
      forge: () => { const r = E().forgeDo(hero, forgeState.ffam + "_" + forgeState.ftype, forgeState.ftier, forgeState.qty); if (r.ok) forgeState.sel = { src: "bag", key: hero.bag.length - 1 }; return r; },
      synth: () => E().synthDo(hero, forgeState.chain, forgeState.chainLv, forgeState.chainBase),
      synth10: () => { let s = 0, f = 0; for (let i = 0; i < 10; i++) { const r = E().synthDo(hero, forgeState.chain, forgeState.chainLv, forgeState.chainBase); if (r.msg.includes("不足")) break; r.ok ? s++ : f++; } return { ok: s > 0, msg: `连续合成：成功 ${s}、失败 ${f}` }; },
      gsynth: () => { const [id, lv] = forgeState.gemSel.split(":"); return E().gemSynthDo(hero, id, +lv, n.gem); },
      star: () => E().starDo(hero, it, n.star),
      autostar: () => { let k = 0, r; while (it.stars < forgeState.autoTo && k++ < 500) { r = E().starDo(hero, it, n.star); if (!r.ok && r.msg.includes("不足")) break; }
        return { ok: it.stars >= forgeState.autoTo, msg: `自动升星 ${k} 次后：${it.stars} 星` }; },
      wuxian: () => E().wuxianDo(hero, it),
      mk: () => E().mingkeDo(hero, it, n.mk, forgeState.wenyu),
      automk: () => { let k = 0, r; while (it.mingke < forgeState.mkTo && k++ < 500) {
          if (forgeState.wenyu && forgeState.wenyuStop && !E().has(hero, "wenyu")) break;
          r = E().mingkeDo(hero, it, n.mk, forgeState.wenyu && E().has(hero, "wenyu")); if (!r.ok && r.msg.includes("不足")) break; }
        return { ok: it.mingke >= forgeState.mkTo, msg: `自动铭刻 ${k} 次后：${it.mingke} 级` }; },
      drill: () => E().drillDo(hero, it, n.drill, forgeState.drillTool),
      wash: () => E().washDo(hero, it, forgeState.hole, n.wash),
      rmlow: () => E().removeDo(hero, it, forgeState.hole, "remove_low"),
      rmhigh: () => E().removeDo(hero, it, forgeState.hole, "remove_high"),
      ench: () => E().enchantDo(hero, it, forgeState.enchType, n.ench, forgeState.guiyuan),
      spirit: () => E().spiritDo(hero, it, forgeState.tl, n.water),
      ident: () => E().identifyDo(hero, it),
      kg: () => E().kaiguangDo(hero, it, forgeState.kgTool, n.kg),
      reforge: () => { const r = E().reforgeDo(hero, it, forgeState.locks, n.extra); return r; },
      setref: () => E().setReformDo(hero, it),
      awaken: () => E().awakenDo(hero, it, n.aw),
      feed: () => E().awakenFeedDo(hero, it, n.feed),
      bodhi: () => E().bodhiDo(hero, it),
      decomp: () => { const r = E().decomposeDo(hero, forgeState.sel.key); forgeState.sel = null; return r; },
      rep_n: () => E().repairDo(hero, it, "normal"),
      rep_a: () => E().repairDo(hero, it, "adv"),
      rep_all: () => { let c = 0; Object.values(hero.equipment).forEach((x) => { if (x && x.dur[0] < x.dur[1] && E().repairDo(hero, x, "adv").ok) c++; }); return { ok: true, msg: `全身高级修理：${c} 件` }; }
    };
    $all("[data-act]", root).forEach((b) => (b.onclick = () => { const f = acts[b.dataset.act]; if (f) done(f()); }));
  }

  TSQ.EquipUI = { tooltipHTML, tipFor, bindTip, showTip, hideTip, slotHTML, icon, renderPaperdoll, renderBag, renderForge, forgeState, bagState, TABS };
})();
