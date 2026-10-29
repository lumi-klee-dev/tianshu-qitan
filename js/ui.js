/* UI 渲染与交互 */
(function () {
  const G = () => TSQ.Game;
  const D = () => TSQ.DATA;
  let state = {
    hero: null,
    battle: null,
    areaId: "north_forest",
    forgeItem: null, // { source: 'eq'|'bag', key }
    forgeHole: -1,
    selectedBag: -1,
    petIdx: 0,
    charTab: "装备",
    petTab: "悟性",
    ysSubTab: "境界",
    selectedMeridian: "ren",
    skillTab: "职业技能",
    lifeSel: "mining", // v0.7：主界面「采集一次」选中的生活技能
    // v0.6 宠物养成二期：四个页签的临时选择（不写存档，刷新后回到默认值）
    petAdv: {
      goldStep: 0, same: 1, other: 0,
      armQuality: {},
      refineNode: "jianzhuang", srcPetIdx: 0, manualIdx: 0, useKaishi: false,
      subPetUid: "", fuseMode: "normal"
    }
  };
  // v0.6：养成操作的系统日志（面板里的操作不进战斗，单独一条浅色日志流）
  const sysLogs = [];
  function pushSysLog(msg) {
    sysLogs.push(msg);
    if (sysLogs.length > 14) sysLogs.shift();
    const box = document.getElementById("battle-log");
    if (box && !state.battle) {
      box.innerHTML = `<div class="line sys">欢迎来到《${D().title}》界面试玩。简笔画仅为原创占位美术。</div>
        <div class="line sys">可打开：背包 / 人物（装备·加点）/ 打造 / 宠物，或进入野外战斗。</div>` +
        sysLogs.map((l) => `<div class="line ${/失败|不足|无法/.test(l) ? "dmg" : "good"}">${l}</div>`).join("");
      box.scrollTop = box.scrollHeight;
    } else if (state.battle) {
      state.battle.log.push(msg);
    }
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return [...(root || document).querySelectorAll(sel)]; }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (el.style.display = "none"), 2200);
  }

  function showTip(html, x, y) {
    const tip = $("#tooltip");
    tip.innerHTML = html;
    tip.style.display = "block";
    const pad = 12;
    let left = x + 14, top = y + 14;
    tip.style.left = "0px"; tip.style.top = "0px";
    const rect = tip.getBoundingClientRect();
    if (left + rect.width > window.innerWidth - pad) left = x - rect.width - 10;
    if (top + rect.height > window.innerHeight - pad) top = y - rect.height - 10;
    tip.style.left = Math.max(pad, left) + "px";
    tip.style.top = Math.max(pad, top) + "px";
  }
  function hideTip() { $("#tooltip").style.display = "none"; }

  function qualityColor(q) { return (D().quality[q] && D().quality[q].color) || "#ddd"; }
  function itemTooltipHTML(item) { return TSQ.EquipUI.tipFor(item, state.hero, true); }

  function drawStick(canvas, kind) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#3a2a1a";
    ctx.fillStyle = "#3a2a1a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    if (kind === "hero") {
      ctx.beginPath();
      ctx.arc(w / 2, 28, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2, 42); ctx.lineTo(w / 2, 85); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2, 55); ctx.lineTo(w / 2 - 22, 70); ctx.moveTo(w / 2, 55); ctx.lineTo(w / 2 + 22, 70); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2, 85); ctx.lineTo(w / 2 - 18, 115); ctx.moveTo(w / 2, 85); ctx.lineTo(w / 2 + 18, 115); ctx.stroke();
      ctx.strokeStyle = "#a06020";
      ctx.beginPath(); ctx.moveTo(w / 2 + 22, 70); ctx.lineTo(w / 2 + 34, 40); ctx.stroke();
    } else if (kind === "rabbit") {
      ctx.beginPath(); ctx.ellipse(w / 2, h / 2 + 10, 28, 22, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(w / 2 - 12, 28, 6, 16, -0.2, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(w / 2 + 12, 28, 6, 16, 0.2, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(w / 2 - 8, h / 2 + 5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(w / 2 + 8, h / 2 + 5, 2, 0, Math.PI * 2); ctx.fill();
    } else if (kind === "cat") {
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2 - 18, h / 2 - 18); ctx.lineTo(w / 2 - 8, h / 2 - 32); ctx.lineTo(w / 2 - 2, h / 2 - 16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2 + 18, h / 2 - 18); ctx.lineTo(w / 2 + 8, h / 2 - 32); ctx.lineTo(w / 2 + 2, h / 2 - 16); ctx.stroke();
      ctx.fillRect(w / 2 - 8, h / 2 - 2, 3, 3); ctx.fillRect(w / 2 + 5, h / 2 - 2, 3, 3);
    } else if (kind === "monster") {
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(w / 2 - 10, h / 2 - 5, 4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(w / 2 + 10, h / 2 - 5, 4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(w / 2, h / 2 + 10, 10, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    } else {
      ctx.font = "28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(kind || "?", w / 2, h / 2 + 10);
    }
  }

  function bindSlotEvents(el, item, onClick) {
    el.onmouseenter = (e) => { if (item) showTip(itemTooltipHTML(item), e.clientX, e.clientY); };
    el.onmousemove = (e) => { if (item) showTip(itemTooltipHTML(item), e.clientX, e.clientY); };
    el.onmouseleave = hideTip;
    if (onClick) el.onclick = onClick;
  }

  function renderSlotContent(el, item) {
    el.classList.toggle("empty", !item);
    el.innerHTML = TSQ.EquipUI.slotHTML(item);
  }

  function renderConsumableSlot(el, id, qty) {
    const c = D().consumables[id];
    el.innerHTML = "";
    el.classList.toggle("empty", !qty);
    if (!c || !qty) { el.innerHTML = '<span class="lbl" style="opacity:.4">空</span>'; return; }
    const ico = document.createElement("div");
    ico.className = "ico";
    ico.textContent = c.icon;
    el.appendChild(ico);
    const lbl = document.createElement("div");
    lbl.className = "lbl";
    lbl.textContent = c.name.slice(0, 4);
    el.appendChild(lbl);
    const q = document.createElement("div");
    q.className = "qty";
    q.textContent = qty;
    el.appendChild(q);
  }

  function refreshTop() {
    const h = state.hero;
    const sec = G().syncVitals(h);
    $("#lbl-name").textContent = h.name;
    $("#lbl-class").textContent = `${D().classes[h.class_id].name} Lv${h.level}`;
    $("#lbl-silver").textContent = h.silver + " 银";
    $("#bar-hp").style.width = ((h.hp / h.maxHp) * 100) + "%";
    $("#bar-mp").style.width = ((h.mp / h.maxMp) * 100) + "%";
    $("#bar-xp").style.width = ((h.exp / h.exp_need) * 100) + "%";
    $("#txt-hp").textContent = `${h.hp}/${h.maxHp}`;
    $("#txt-mp").textContent = `${h.mp}/${h.maxMp}`;
    $("#txt-xp").textContent = `潜能 ${h.unspent}`;
    const curTitle = TSQ.Title ? TSQ.Title.currentTitle(h) : null;
    const curFabao = TSQ.Fabao ? TSQ.Fabao.equippedFabao(h) : null;
    const curSpirit = TSQ.Spirit ? TSQ.Spirit.currentSpirit(h) : null;
    const swornActive = TSQ.Sworn ? TSQ.Sworn.isBuffActive(h) : false;
    $("#hero-meta").innerHTML = `
      ${curTitle ? `<div class="hero-title-badge">【${curTitle.name}】</div>` : ""}
      <div><b>${h.name}</b></div>
      <div>${D().classes[h.class_id].name} · Lv${h.level} · <span class="hero-rebirth-tag">${["未转","一转","二转","三转"][h.rebirth || 0]}</span></div>
      <div class="small">${D().classes[h.class_id].desc}</div>
      ${h.alliance && h.alliance.name ? `<div class="small hero-alliance-tag">联盟：【${h.alliance.name}】</div>` : ""}
      ${(h.rebirth || 0) >= 2 && h.vitality ? `<div class="small hero-vitality-tag">活力：${h.vitality.current}/${h.vitality.max}</div>` : ""}
      ${curFabao ? `<div class="small hero-fabao-meta">法宝：【${curFabao.rank}阶·${curFabao.def.name}】</div>` : ""}
      ${curSpirit ? `<div class="small hero-spirit-meta">精灵：【${curSpirit.rank}阶·${curSpirit.level}级 ${curSpirit.name}】</div>` : ""}
      ${h.sworn && h.sworn.enabled ? `<div class="small hero-sworn-meta">结义：【${h.sworn.title}】契合度 ${h.sworn.harmony} ${swornActive ? "✨Buff" : ""}</div>` : ""}
      ${h.guild ? `<div class="small hero-guild-meta">帮会：【${h.guild.name}】活跃 ${h.guild.activity} · 贡献 ${h.guild.contrib}</div>` : ""}
      <div class="small mt8">物攻 ${sec.patk} · 法攻 ${sec.matk}</div>
      <div class="small">物防 ${sec.pdef} · 法防 ${sec.mdef} · 速 ${sec.spd}</div>
      <div class="small mt8">出战宠：${(() => { const p = G().fightingPet(h); return p ? `${p.name} Lv${p.level}（战力 ${TSQ.Pet.stats(p).power}）` : "无"; })()}</div>`;
    const c = $("#hero-canvas");
    if (c) drawStick(c, "hero");
  }

  function refreshQuickBag() {
    const grid = $("#quick-grid");
    grid.innerHTML = "";
    const h = state.hero;
    ["upstone_shen", "lifestone_shen", "wenyu", "wash_charm"].forEach((id) => {
      const el = document.createElement("div");
      el.className = "slot";
      const m = TSQ.EQ.materials[id];
      el.innerHTML = `<div class="ico">${m.icon || "石"}</div><div class="lbl">${m.name.slice(0, 4)}</div><div class="qty">${h.mats[id] || 0}</div>`;
      el.title = m.name;
      el.onclick = () => openModal("forge");
      grid.appendChild(el);
    });
    const order = ["hp_potion_s", "mp_potion_s", "catch_scroll", "gem_bag", "pet_food"];
    order.forEach((id) => {
      const el = document.createElement("div");
      el.className = "slot";
      renderConsumableSlot(el, id, h.consumables[id] || 0);
      el.title = (D().consumables[id] && D().consumables[id].name) || id;
      el.onclick = () => {
        if (id === "hp_potion_s" && G().useConsumable(h, id, 1)) {
          h.hp = Math.min(h.maxHp, h.hp + 60); toast("使用小回血丹"); refreshAll();
        } else if (id === "mp_potion_s" && G().useConsumable(h, id, 1)) {
          h.mp = Math.min(h.maxMp, h.mp + 40); toast("使用小回蓝丹"); refreshAll();
        } else if (id === "gem_bag") {
          const r = G().openGemBag(h); toast(r.msg); refreshAll();
        } else toast((D().consumables[id].name) + " ×" + (h.consumables[id] || 0) + "（在打造/战斗中使用）");
      };
      grid.appendChild(el);
    });
    h.bag.slice(0, 6).forEach((entry) => {
      const el = document.createElement("div");
      el.className = "slot";
      if (entry.kind === "equip") {
        renderSlotContent(el, entry.item);
        bindSlotEvents(el, entry.item, () => openModal("bag"));
      }
      grid.appendChild(el);
    });
  }

  function refreshWorld() {
    const area = D().areas.find((a) => a.id === state.areaId);
    $("#scene-label").textContent = "地点：" + area.name;
    const arena = $("#battle-arena");
    arena.innerHTML = "";
    if (!state.battle) {
      arena.innerHTML = `
        <div class="fighter">
          <div class="sprite"><canvas width="100" height="120" id="idle-hero"></canvas></div>
          <div class="name">${state.hero.name}</div>
          <div class="small">点击下方「进入野外」开始战斗</div>
        </div>
        <div class="fighter" id="idle-pet-slot"></div>
        <div class="fighter">
          <div class="sprite" style="opacity:.4"><canvas width="100" height="120" id="idle-q"></canvas></div>
          <div class="name">？？？</div>
        </div>`;
      drawStick($("#idle-hero"), "hero");
      drawStick($("#idle-q"), "monster");
      const idlePet = G().fightingPet(state.hero);
      const slot = $("#idle-pet-slot");
      if (idlePet) {
        slot.appendChild(petArtNode(idlePet, "pet-art-box small"));
        const nm = document.createElement("div");
        nm.className = "name";
        nm.textContent = `${idlePet.name} Lv${idlePet.level}`;
        slot.appendChild(nm);
      } else {
        slot.innerHTML = `<div class="sprite" style="opacity:.35">宠</div><div class="name">无出战宠</div>`;
      }
      // v0.6：养成操作（武装/进化/炼化/融合）的系统日志接在欢迎语后面
      $("#battle-log").innerHTML = `<div class="line sys">欢迎来到《${D().title}》界面试玩。简笔画仅为原创占位美术。</div>
        <div class="line sys">可打开：背包 / 人物（装备·加点）/ 打造 / 宠物，或进入野外战斗。</div>` +
        sysLogs.map((l) => `<div class="line ${/失败|不足|无法|已消耗/.test(l) ? "dmg" : "good"}">${l}</div>`).join("");
      // v0.7：生活技能最小接入 —— 主界面直接采集 / 制作一次（产出进背包 · 材料，日志写在这里）
      const lifeOpts = TSQ.LifeSkill.lifeList(state.hero).map((s) =>
        `<option value="${s.def.id}" ${state.lifeSel === s.def.id ? "selected" : ""}>${s.def.name} Lv${s.lv}</option>`).join("");
      $("#action-bar").innerHTML = `
        <button class="btn primary" id="btn-wild">进入野外</button>
        <button class="btn" data-area="north_forest">北影月森林</button>
        <button class="btn" data-area="east_forest">东影月森林</button>
        <button class="btn" id="btn-heal">营地休整</button>
        <span class="life-inline">生活：<select id="life-sel">${lifeOpts}</select></span>
        <button class="btn" id="btn-life">采集 / 制作一次</button>`;
      $("#btn-wild").onclick = () => beginBattle();
      $all("[data-area]").forEach((b) => b.onclick = () => { state.areaId = b.dataset.area; beginBattle(); });
      const btnLife = $("#btn-life");
      if (btnLife) btnLife.onclick = () => {
        const sel = $("#life-sel");
        state.lifeSel = sel ? sel.value : state.lifeSel;
        const r = TSQ.LifeSkill.lifeGather(state.hero, state.lifeSel);
        toast(r.msg); refreshAll();
      };
      $("#btn-heal").onclick = () => {
        const sec = G().syncVitals(state.hero);
        state.hero.hp = sec.hp; state.hero.mp = sec.mp;
        G().healPetsAtCamp(state.hero);
        const p = G().fightingPet(state.hero);
        toast("休整完毕，状态全满" + (p ? `，${p.name} 体力恢复` : "")); refreshAll();
      };
      return;
    }
    const b = state.battle;
    const monKind = b.mon.doodle === "兔" ? "rabbit" : b.mon.doodle === "猫" ? "cat" : "monster";
    const batPet = G().fightingPet(state.hero);
    const pst = batPet ? TSQ.Pet.stats(batPet) : null;
    arena.innerHTML = `
      <div class="fighter">
        <div class="sprite"><canvas width="100" height="120" id="bat-hero"></canvas></div>
        <div class="name">${state.hero.name}</div>
        <div class="bar hp hpbar"><i style="width:${(state.hero.hp/state.hero.maxHp)*100}%"></i></div>
        <div class="small">${state.hero.hp}/${state.hero.maxHp}</div>
      </div>
      <div class="fighter" id="bat-pet-slot">
        ${pst ? `<div class="name">${batPet.name} Lv${batPet.level}</div>
        <div class="bar hp hpbar"><i style="width:${(pst.curHp/pst.maxHp)*100}%"></i></div>
        <div class="small">${pst.curHp}/${pst.maxHp}${pst.down ? " · 倒下" : ""}</div>` : `<div class="name">无出战宠</div>`}
      </div>
      <div class="fighter">
        <div class="sprite"><canvas width="100" height="120" id="bat-mon"></canvas></div>
        <div class="name">${b.mon.name} Lv${b.mon.level}</div>
        <div class="bar hp hpbar"><i style="width:${(b.mon.hp/b.mon.maxHp)*100}%"></i></div>
        <div class="small">${b.mon.hp}/${b.mon.maxHp}</div>
      </div>`;
    drawStick($("#bat-hero"), "hero");
    drawStick($("#bat-mon"), monKind);
    if (batPet) {
      const ps = $("#bat-pet-slot");
      ps.insertBefore(petArtNode(batPet, "pet-art-box small"), ps.firstChild);
    }
    $("#battle-log").innerHTML = b.log.slice(-12).map((l) => {
      const cls = l.includes("伤害") ? "dmg" : l.includes("胜利") || l.includes("成功") || l.includes("升级") ? "good" : "sys";
      return `<div class="line ${cls}">${l}</div>`;
    }).join("");
    const log = $("#battle-log"); log.scrollTop = log.scrollHeight;

    if (b.over) {
      $("#action-bar").innerHTML = `<button class="btn primary" id="btn-again">再战</button>
        <button class="btn" id="btn-leave">离开野外</button>`;
      $("#btn-again").onclick = () => beginBattle();
      $("#btn-leave").onclick = () => { state.battle = null; refreshWorld(); refreshTop(); };
    } else {
      // v0.5：战斗技能按钮取 TSQ.Skill（已学技能，本职系优先）
      const skills = TSQ.Skill.battleSkills(state.hero);
      let html = `<button class="btn primary" id="btn-atk">普攻</button>`;
      skills.forEach((sid) => {
        const sk = TSQ.Skill.get(sid);
        if (!sk) return;
        const mc = TSQ.Skill.mpCost(state.hero, sid);
        html += `<button class="btn" data-sk="${sid}" title="${sk.desc}（耗蓝 ${mc}）">${sk.name}</button>`;
      });
      html += `<button class="btn" id="btn-catch">唤妖符捕捉</button>`;
      html += `<button class="btn danger" id="btn-flee">逃跑</button>`;
      $("#action-bar").innerHTML = html;
      $("#btn-atk").onclick = () => { G().playerAttack(state.hero, state.battle, null); refreshAll(); };
      $all("[data-sk]").forEach((btn) => btn.onclick = () => {
        G().playerAttack(state.hero, state.battle, btn.dataset.sk); refreshAll();
      });
      $("#btn-catch").onclick = () => { G().tryCatch(state.hero, state.battle); refreshAll(); };
      $("#btn-flee").onclick = () => {
        state.battle.log.push("你逃跑了。");
        state.battle = null; toast("逃离战斗"); refreshAll();
      };
    }
  }

  function beginBattle() {
    state.battle = G().startBattle(state.hero, state.areaId);
    refreshAll();
  }

  function openModal(id) {
    $all(".modal-layer").forEach((m) => m.classList.remove("open"));
    const layer = $("#modal-" + id);
    if (!layer) return;
    layer.classList.add("open");
    if (id === "char") renderChar();
    if (id === "bag") renderBag();
    if (id === "forge") renderForge();
    if (id === "pet") renderPet();
    if (id === "skill") renderSkill();
    if (id === "mount") renderMount();
    if (id === "sworn") renderSworn();
    if (id === "guild") renderGuild();
    if (id === "rebirth") renderRebirth();
    if (id === "vitality") renderVitality();
  }
  function closeModals() {
    $all(".modal-layer").forEach((m) => m.classList.remove("open"));
    hideTip();
  }

  function meridianSummaryText(h) {
    if (!h.meridians) return "未贯通";
    let activePoints = 0, totalLayers = 0;
    Object.values(h.meridians).forEach((m) => {
      (m.points || []).forEach((pt) => {
        totalLayers += (pt.layer || 0);
        if (pt.activated) activePoints++;
      });
    });
    return totalLayers > 0 ? `已通 ${totalLayers}/480 层（激活 ${activePoints}/48 穴）` : "未贯通";
  }

  function renderChar() {
    const h = state.hero;
    const sec = G().combatStats(h);
    const body = $("#char-body");
    const tabs = ["装备", "属性", "转生", "历练", "经脉", "称号", "法宝", "心法", "徽章", "元神", "精灵", "结义", "帮会"];
    let tabHtml = `<div class="tabs">${tabs.map((t) =>
      `<div class="tab ${state.charTab === t ? "active" : ""}" data-ctab="${t}">${t}</div>`
    ).join("")}</div>`;

    if (state.charTab === "装备") {
      body.innerHTML = tabHtml + `<div class="modal-body"><div class="char-layout eqlayout">
        <div id="paperdoll2"></div>
        <div>
          <div class="info-block">
            <div>名称：<b>${h.name}</b>　${D().classes[h.class_id].name} · Lv${h.level} · 人物<span class="hero-rebirth-tag">${["未转","一转","二转","三转"][h.rebirth || 0]}</span></div>
            <!-- v0.8 / v0.9：称号 / 法宝 / 徽章 / 元神 汇总 -->
            <div class="small">${ysBadgeLine(h)}</div>
          </div>
          <div class="stats-list" id="sec-stats"></div>
        </div>
        <div>
          <div class="panel-title" style="border-radius:4px;margin-bottom:8px">背包装备（悬停对比，点击穿上）</div>
          <div class="slot-grid" style="grid-template-columns:repeat(4,1fr)" id="char-bag-mini"></div>
        </div>
      </div></div>`;
      TSQ.EquipUI.renderPaperdoll($("#paperdoll2"), h, (r) => { if (r) toast(r.msg); refreshAll(); renderChar(); });
      const secEl = $("#sec-stats");
      const keys = ["hp", "mp", "spd", "patk", "pdef", "matk", "mdef", "pcrit", "mcrit", "pdodge", "mdodge", "phit", "mhit", "imdodge", "imdef", "rage_turn"];
      secEl.innerHTML = keys.map((k) => {
        let v = sec[k] || 0;
        if (k === "hp") v = `${h.hp}/${sec.hp}`;
        if (k === "mp") v = `${h.mp}/${sec.mp}`;
        return `<div class="row"><span>${TSQ.EQ.statNames[k] || D().secondaryNames[k]}</span><span class="val">${v}</span></div>`;
      }).join("");
      const mini = $("#char-bag-mini");
      h.bag.forEach((entry, i) => {
        if (entry.kind !== "equip") return;
        const el = document.createElement("div");
        el.className = "slot";
        renderSlotContent(el, entry.item);
        bindSlotEvents(el, entry.item, () => {
          hideTip();
          const r = G().equipFromBag(h, i);
          toast(r.msg); refreshAll(); renderChar();
        });
        mini.appendChild(el);
      });
    } else if (state.charTab === "属性") {
      const pri = h.primary;
      const curTitle = TSQ.Title ? TSQ.Title.currentTitle(h) : null;
      const curFabao = TSQ.Fabao ? TSQ.Fabao.equippedFabao(h) : null;
      const curMount = TSQ.Mount ? TSQ.Mount.currentMount(h) : null;
      const curSpirit = TSQ.Spirit ? TSQ.Spirit.currentSpirit(h) : null;
      const isRiding = !!(h.mount && h.mount.riding);
      const sec2 = sec;
      body.innerHTML = tabHtml + `<div class="modal-body"><div class="char-layout">
        <div class="stats-list">${["hp","mp","rage","spd","regen","patk","pdef","matk","mdef","pcrit","mcrit","pdodge","mdodge"].map((k) => {
          const sec2 = G().combatStats(h);
          let v = sec2[k];
          if (k === "hp") v = `${h.hp}/${sec2.hp}`;
          if (k === "mp") v = `${h.mp}/${sec2.mp}`;
          if (k === "rage") v = `0/${sec2.rage}`;
          return `<div class="row"><span>${D().secondaryNames[k]}</span><span class="val">${v}</span></div>`;
        }).join("")}</div>
        <div class="info-block">
          <div>名称：<b>${h.name}</b></div>
          <div>职业：${D().classes[h.class_id].name}</div>
          <div>等级：${h.level}</div>
          <!-- v1.3：转生修真与三转联盟 -->
          <div>转生：<span class="hero-rebirth-tag">【${["未转","一转","二转","三转"][h.rebirth || 0]}】</span> <button class="btn tiny primary" id="btn-goto-rebirth">转生修真</button></div>
          <div>联盟：<span class="hero-alliance-tag">【${(h.alliance && h.alliance.name) || ((h.rebirth || 0) >= 3 ? "未选择联盟（菩提子处转职）" : "三转开放")}】</span></div>
          <div>活力：<span class="hero-vitality-tag">${(h.rebirth || 0) >= 2 ? `${(h.vitality && h.vitality.current) || 0}/1000` : "二转开放"}</span> <button class="btn tiny primary" id="btn-goto-vitality">活力历练</button></div>
          <!-- v0.9：称号与法宝入口 -->
          <div class="mt8">称号：<span class="hero-title-tag">【${curTitle ? curTitle.name : "未佩戴"}】</span> <button class="btn tiny" id="btn-goto-title">管理称号</button></div>
          <div>法宝：<span class="hero-fabao-tag">【${curFabao ? `${curFabao.rank}阶·${curFabao.def.name}` : "未装备"}】</span> <button class="btn tiny" id="btn-goto-fabao">法宝进阶</button></div>
          <!-- v1.0：骑宠入口 -->
          <div>骑宠：<span class="hero-mount-tag">【${curMount ? `${curMount.name}（${isRiding ? "出战骑乘" : "休息中"}）` : "未乘骑"}】</span> <button class="btn tiny primary" id="btn-goto-mount">管理骑宠</button></div>
          <!-- v1.1：精灵入口 -->
          <div>精灵：<span class="hero-spirit-tag">【${curSpirit ? `${curSpirit.rank}阶·${curSpirit.level}级 ${curSpirit.name}` : "未获得"}】</span> <button class="btn tiny primary" id="btn-goto-spirit">管理精灵</button></div>
          <!-- v1.2：结义与帮会入口 -->
          <div>结义：<span class="hero-sworn-meta">【${h.sworn && h.sworn.enabled ? `${h.sworn.title}（契合度 ${h.sworn.harmony}）` : "未结义"}】</span> <button class="btn tiny primary" id="btn-goto-sworn">金兰结义</button></div>
          <div>帮会：<span class="hero-guild-meta">【${h.guild ? `${h.guild.name}（活跃 ${h.guild.activity}）` : "未加入"}】</span> <button class="btn tiny primary" id="btn-goto-guild">帮会武功</button></div>
          <!-- v1.4：元神·地灵 元素减伤抗性与经脉入口 -->
          <div class="mt8"><b>元素抗性（元神·地灵减伤）：</b> <button class="btn tiny primary" id="btn-goto-diling">修炼地灵</button></div>
          <div class="resist-grid mt4">
            <div class="resist-cell"><span class="rn">玄抗减伤</span><span class="rv">${((sec2.res_xuan || 0) * 100).toFixed(1)}%</span></div>
            <div class="resist-cell"><span class="rn">毒抗减伤</span><span class="rv">${((sec2.res_du || 0) * 100).toFixed(1)}%</span></div>
            <div class="resist-cell"><span class="rn">火抗减伤</span><span class="rv">${((sec2.res_huo || 0) * 100).toFixed(1)}%</span></div>
            <div class="resist-cell"><span class="rn">冰抗减伤</span><span class="rv">${((sec2.res_bing || 0) * 100).toFixed(1)}%</span></div>
          </div>
          <div class="mt8">经脉：<span class="hero-meridian-meta">【${meridianSummaryText(h)}】</span> <button class="btn tiny primary" id="btn-goto-meridian">贯通经脉</button></div>
          <!-- v0.8 ~ v1.4 汇总（左侧战斗属性已含装备 / 称号 / 法宝 / 骑宠 / 精灵 / 结义 / 帮会 / 转生资质 / 经脉 / 联盟被动 / 徽章加成与元神附魔倍率） -->
          <div class="small mt8">${ysBadgeLine(h)}</div>
          <div class="hint">左侧为战斗属性（已含装备 / 称号 / 法宝 / 骑宠 / 精灵 / 结义 / 帮会 / 转生 / 经脉 / 联盟 / 徽章 / 元神附魔倍率）；右侧分配潜力点后点「确定」生效。</div>
          <!-- v0.7：已婚 / 亲密度（⚙ 演示开关，真实结婚任务线未做） -->
          <div class="ls-demo mt8">
            <label class="small"><input type="checkbox" id="chk-married" ${TSQ.LifeSkill.married(h) ? "checked" : ""}> 已婚（⚙ 演示开关）</label>
            <span class="small">亲密度 <b id="txt-intimacy">${TSQ.LifeSkill.intimacy(h)}</b></span>
            <button class="btn tiny" data-int2="${-TSQ.LifeSkillData.CONST.INTIMACY_STEP}">−${TSQ.LifeSkillData.CONST.INTIMACY_STEP}</button>
            <button class="btn tiny" data-int2="${TSQ.LifeSkillData.CONST.INTIMACY_STEP}">+${TSQ.LifeSkillData.CONST.INTIMACY_STEP}</button>
          </div>
          <div class="hint">改完可在「技能 · 夫妻」页学习 / 演练夫妻技能。</div>
        </div>
        <div class="attr-box" id="attr-box"></div>
      </div></div>`;
      const btnRebirth = $("#btn-goto-rebirth");
      if (btnRebirth) btnRebirth.onclick = () => { state.charTab = "转生"; renderChar(); };
      const btnVitality = $("#btn-goto-vitality");
      if (btnVitality) btnVitality.onclick = () => { state.charTab = "历练"; renderChar(); };
      const btnTitle = $("#btn-goto-title");
      if (btnTitle) btnTitle.onclick = () => { state.charTab = "称号"; renderChar(); };
      const btnFabao = $("#btn-goto-fabao");
      if (btnFabao) btnFabao.onclick = () => { state.charTab = "法宝"; renderChar(); };
      const btnMount = $("#btn-goto-mount");
      if (btnMount) btnMount.onclick = () => { openModal("mount"); };
      const btnSpirit = $("#btn-goto-spirit");
      if (btnSpirit) btnSpirit.onclick = () => { state.charTab = "精灵"; renderChar(); };
      const btnSworn = $("#btn-goto-sworn");
      if (btnSworn) btnSworn.onclick = () => { openModal("sworn"); };
      const btnGuild = $("#btn-goto-guild");
      if (btnGuild) btnGuild.onclick = () => { openModal("guild"); };
      const btnDiling = $("#btn-goto-diling");
      if (btnDiling) btnDiling.onclick = () => { state.charTab = "元神"; state.ysSubTab = "地灵"; renderChar(); };
      const btnMeridian = $("#btn-goto-meridian");
      if (btnMeridian) btnMeridian.onclick = () => { state.charTab = "元神"; state.ysSubTab = "经脉"; renderChar(); };
      const box = $("#attr-box");
      ["str", "con", "agi", "int", "fai"].forEach((k) => {
        const row = document.createElement("div");
        row.className = "attr-row";
        const pending = h.pending[k] || 0;
        row.innerHTML = `<span class="lab">${D().primaryNames[k]}</span>
          <span class="num">${pri[k] + pending}</span>
          <span class="delta">${pending ? "+" + pending : ""}</span>
          <button class="pm" data-m="${k}">−</button>
          <button class="pm" data-p="${k}">＋</button>`;
        box.appendChild(row);
      });
      const foot = document.createElement("div");
      foot.className = "mt12";
      foot.innerHTML = `<div class="mb8">潜力：<b id="pot">${h.unspent - Object.values(h.pending).reduce((a, b) => a + b, 0)}</b></div>
        <button class="btn primary" id="btn-confirm-pts">确定</button>
        <button class="btn" id="btn-reset-pts">重置</button>`;
      box.appendChild(foot);
      $all("[data-p]", box).forEach((b) => b.onclick = () => {
        const left = h.unspent - Object.values(h.pending).reduce((a, c) => a + c, 0);
        if (left <= 0) { toast("没有潜力点了"); return; }
        h.pending[b.dataset.p]++; renderChar();
      });
      $all("[data-m]", box).forEach((b) => b.onclick = () => {
        if (h.pending[b.dataset.m] > 0) { h.pending[b.dataset.m]--; renderChar(); }
      });
      // v0.7：已婚 / 亲密度（⚙ 演示开关）
      const chkM = $("#chk-married");
      if (chkM) chkM.onchange = () => { TSQ.LifeSkill.setMarried(h, chkM.checked); refreshAll(); renderChar(); };
      $all("[data-int2]").forEach((b) => b.onclick = () => {
        const v = TSQ.LifeSkill.addIntimacy(h, Number(b.dataset.int2));
        toast("亲密度 " + v + "（⚙ 演示数值）"); refreshAll(); renderChar();
      });
      $("#btn-confirm-pts").onclick = () => {
        const used = G().applyPendingPoints(h);
        toast(used ? `已分配 ${used} 点潜力` : "没有可确认的加点");
        refreshAll(); renderChar();
      };
      $("#btn-reset-pts").onclick = () => {
        h.pending = { str: 0, con: 0, agi: 0, int: 0, fai: 0 };
        renderChar();
      };
    } else if (state.charTab === "称号") {
      // v0.9：称号佩戴 / 卸下（佩戴上限 1 个），光辉属性直接计入人物面板汇总
      body.innerHTML = tabHtml + renderTitleTab(h);
      $all("[data-tact]", body).forEach((b) => b.onclick = () => {
        const id = b.dataset.tid, act = b.dataset.tact;
        const r = act === "off" ? TSQ.Title.takeOff(h) : TSQ.Title.wear(h, id);
        if (r && r.msg) pushSysLog(r.msg);
        toast(r.msg); refreshAll(); renderChar();
      });
    } else if (state.charTab === "法宝") {
      // v0.9：三转法宝位装备 / 卸下 / 印记之魂进阶（每阶主属性 +15 ⚙，上限 10 阶）
      body.innerHTML = tabHtml + renderFabaoTab(h);
      $all("[data-fequip]", body).forEach((b) => b.onclick = () => {
        const id = b.dataset.fequip;
        const r = TSQ.Fabao.equip(h, id);
        if (r && r.msg) pushSysLog(r.msg);
        toast(r.msg); refreshAll(); renderChar();
      });
      $all("[data-funequip]", body).forEach((b) => b.onclick = () => {
        const r = TSQ.Fabao.unequip(h);
        if (r && r.msg) pushSysLog(r.msg);
        toast(r.msg); refreshAll(); renderChar();
      });
      $all("[data-fadvance]", body).forEach((b) => b.onclick = () => {
        const id = b.dataset.fadvance;
        const r = TSQ.Fabao.advance(h, id);
        if (r && r.msg) pushSysLog(r.msg);
        toast(r.msg); refreshAll(); renderChar();
      });
    } else if (state.charTab === "徽章") {
      // v0.8：徽章佩戴 / 卸下（上限 ⚙ 默认 3 枚），加成直接进人物面板汇总
      body.innerHTML = tabHtml + renderBadgeTab(h);
      $all("[data-bdg]", body).forEach((b) => b.onclick = () => {
        const id = b.dataset.bdg, act = b.dataset.act;
        const r = act === "off" ? TSQ.Badge.takeOff(h, id) : TSQ.Badge.wear(h, id);
        if (r && r.msg) pushSysLog(r.msg);
        toast(r.msg); refreshAll(); renderChar();
      });
    } else if (state.charTab === "经脉") {
      state.ysSubTab = "经脉";
      body.innerHTML = tabHtml + renderYsTab(h);
      bindYsEvents(body, h, () => renderChar());
    } else if (state.charTab === "元神") {
      // v0.8 & v1.4：元神等级 / 经验 / 倍率 + 元神地灵 + 经脉
      body.innerHTML = tabHtml + renderYsTab(h);
      bindYsEvents(body, h, () => renderChar());
    } else if (state.charTab === "心法") {
      // v0.5：心法已实装，这里只做引导，完整面板在「技能」按钮里
      body.innerHTML = tabHtml + `<div class="modal-body"><div class="hint">心法（8 系）与技能学习已实装，请在左侧「技能」面板查看与操作。</div>
        <div class="mt12"><button class="btn primary" id="btn-goto-skill">打开技能 · 心法面板</button></div>
        <div class="mt12">已学技能：</div>
        <div class="skill-grid pet mt8">${Object.keys(h.skills).map((sid) => {
          const sk = TSQ.Skill.get(sid);
          return sk ? `<div class="skill-cell">${sk.name}<br><span class="small">Lv${TSQ.Skill.skillLevel(h, sid)}</span></div>` : "";
        }).join("")}
          ${Array(6).fill(0).map(() => `<div class="skill-cell empty">空</div>`).join("")}
        </div></div>`;
      $("#btn-goto-skill").onclick = () => openModal("skill");
    } else if (state.charTab === "精灵") {
      // v1.1：精灵 / 萝莉页签（持有、兑换、培养、人物与宠物加成）
      body.innerHTML = tabHtml + renderSpiritTab(h);
      bindSpiritEvents(body, h);
    } else if (state.charTab === "结义") {
      // v1.2：结义页签（契合度、过周、任务、金兰Buff、兄弟卡片）
      body.innerHTML = tabHtml + `<div class="modal-body">` + renderSwornContent(h) + `</div>`;
      bindSwornEvents(body, h, () => renderChar());
    } else if (state.charTab === "帮会") {
      // v1.2：帮会武功科技页签（6项武功升级、捐献官兑换元魄）
      body.innerHTML = tabHtml + `<div class="modal-body">` + renderGuildContent(h) + `</div>`;
      bindGuildEvents(body, h, () => renderChar());
    } else if (state.charTab === "转生") {
      // v1.3：转生与三转联盟页签
      body.innerHTML = tabHtml + `<div class="modal-body">` + renderRebirthContent(h) + `</div>`;
      bindRebirthEvents(body, h, () => renderChar());
    } else if (state.charTab === "历练") {
      // v1.3：活力与历练日常页签
      body.innerHTML = tabHtml + `<div class="modal-body">` + renderVitalityContent(h) + `</div>`;
      bindVitalityEvents(body, h, () => renderChar());
    } else {
      body.innerHTML = tabHtml + `<div class="modal-body"><div class="hint">未找到该页签内容。</div></div>`;
    }
    $all("[data-ctab]").forEach((t) => t.onclick = () => { state.charTab = t.dataset.ctab; renderChar(); });
  }

  /* ══════════════════════════════════════════════════════════════════
     称号 / 法宝 / 徽章 / 元神 页签（v0.8 & v0.9）
     ══════════════════════════════════════════════════════════════════ */
  const BD = () => TSQ.BadgeData;
  const YS = () => TSQ.Yuanshen;

  // 人物面板（装备页 / 属性页）共用的一行汇总
  function ysBadgeLine(h) {
    const parts = [];
    if (TSQ.Title) {
      const curT = TSQ.Title.currentTitle(h);
      parts.push(`称号：<b>${curT ? curT.name : "无"}</b>`);
    }
    if (TSQ.Fabao) {
      const fb = TSQ.Fabao.equippedFabao(h);
      parts.push(`法宝：<b>${fb ? `${fb.rank}阶·${fb.def.name}` : "无"}</b>`);
    }
    if (TSQ.Mount) {
      const curM = TSQ.Mount.currentMount(h);
      const isRiding = !!(h.mount && h.mount.riding);
      const soulName = curM && curM.soul ? `${curM.soul.name}Lv${curM.soul.lv}` : "无兽魂";
      parts.push(`骑宠：<b>${curM ? `${curM.name}（${isRiding ? "骑乘中" : "休息"}·${soulName}）` : "无"}</b>`);
    }
    if (TSQ.Badge) {
      const worn = (h.badges && h.badges.worn) || [];
      const names = worn.map((id) => (BD().badgeById(id) || {}).name).filter(Boolean);
      parts.push(`徽章：${names.length ? names.join("、") : "无"}`);
    }
    if (TSQ.Yuanshen) {
      const yl = YS().level(h), ym = YS().mult(h);
      parts.push(`元神 <b>Lv${yl}</b>（附魔×${ym}）`);
    }
    if (TSQ.Spirit) {
      const curSp = TSQ.Spirit.currentSpirit(h);
      parts.push(`精灵：<b>${curSp ? `${curSp.rank}阶·${curSp.level}级 ${curSp.name}` : "无"}</b>`);
    }
    if (TSQ.Sworn && h.sworn && h.sworn.enabled) {
      parts.push(`结义：<b>${h.sworn.title}（契合 ${h.sworn.harmony}）</b>`);
    }
    if (TSQ.Guild && h.guild) {
      parts.push(`帮会：<b>${h.guild.name}</b>`);
    }
    if (TSQ.Meridian) {
      if (h.diling) {
        const dlv = (h.diling.xuan || 0) + (h.diling.du || 0) + (h.diling.huo || 0) + (h.diling.bing || 0);
        if (dlv > 0) parts.push(`地灵：<b>共${dlv}级</b>`);
      }
      if (h.meridians) {
        let totalL = 0;
        Object.values(h.meridians).forEach((m) => (m.points || []).forEach((p) => totalL += (p.layer || 0)));
        if (totalL > 0) parts.push(`经脉：<b>${totalL}/480层</b>`);
      }
    }
    return parts.join("　·　");
  }

  function statTextOf(def) { return TSQ.Badge.statText(def); }

  /* ---------------- 称号页 ---------------- */
  function renderTitleTab(h) {
    const T = TSQ.Title, TD = TSQ.TitleData, K = TD.CONST;
    const list = T.list(h);
    const cur = T.currentTitle(h);
    const bonus = T.bonus(h);
    const pctStats = (TSQ.EQ && TSQ.EQ.pctStats) || [];
    const sum = Object.entries(bonus.flat).map(([k, v]) =>
      `${TSQ.EQ.statNames[k] || k} +${v}`).concat(
      Object.entries(bonus.pct).map(([k, v]) => `${TSQ.EQ.statNames[k] || k} +${Math.round(v * 1000)}‰`)
    );
    let html = `<div class="modal-body">
      <div class="skill-top">
        <div>当前佩戴：<b>${cur ? `【${cur.name}】` : "（未佩戴称号）"}</b></div>
        <div>拥有称号：<b>${list.filter((x) => x.owned).length}</b> / ${list.length} 个</div>
        <div>佩戴规则：<b>1</b> 个生效（可随时卸下/更换）</div>
        ${cur ? `<button class="btn small danger" data-tact="off">卸下当前称号</button>` : ""}
      </div>
      <div class="hint mt8">规格说明：称号在皇城<b>姜太后</b>处领取，按系列分等级（剧情、成就、活动、PK 系列）；佩戴 1 个生效。<b>光辉</b>系统附加属性效果，缺数标 <b>⚙ 默认</b>。佩戴加成实时计入人物属性汇总。</div>
      <div class="mt8"><b>当前光辉总加成</b>：${sum.length ? sum.join("　") : "（未佩戴称号，暂无光辉加成）"}</div>
      <div class="bdg-grid mt8">`;
    list.forEach((t) => {
      const cls = t.worn ? "on" : (t.owned ? "" : "dim");
      html += `<div class="bdg-card ${cls}">
        <div class="bdg-top">
          <span class="bdg-ico">${t.def.icon}</span>
          <b class="ttl-name">${t.def.name}</b>
          <span class="badge ${t.def.cat === "PK系列" ? "zs" : (t.def.cat === "成就系列" ? "main" : "")}">${t.def.cat}</span>
          <span class="badge">${t.def.src}</span>
          ${t.worn ? '<span class="bdg-on">佩戴中</span>' : (t.owned ? '<span class="wf-flag">已获得</span>' : '<span class="wf-flag">未获得</span>')}
        </div>
        <div class="small">${t.def.desc}</div>
        <div class="bdg-stats"><b>光辉加成</b>：${Object.entries(t.def.stats).map(([k, v]) =>
          pctStats.includes(k) ? `${TSQ.EQ.statNames[k] || k} +${Math.round(v * 1000)}‰` : `${TSQ.EQ.statNames[k] || k} +${v}`).join("　")}</div>
        <div class="sk-foot">
          <span class="small">${t.def.src}</span>
          ${t.worn
            ? `<button class="btn small danger" data-tact="off">卸下</button>`
            : `<button class="btn small primary" data-tact="on" data-tid="${t.def.id}" ${t.owned ? "" : "disabled"}>佩戴</button>`}
        </div>
      </div>`;
    });
    return html + `</div>
      <div class="hint mt8">演示角色已发放 ${K.DEMO.grantTitles.length} 个称号并默认佩戴 1 个；点击「佩戴」可自由切换，点击「卸下」可恢复无称号状态。</div>
    </div>`;
  }

  /* ---------------- 法宝页 ---------------- */
  function renderFabaoTab(h) {
    const F = TSQ.Fabao, FD = TSQ.FabaoData, K = FD.CONST;
    const cur = F.equippedFabao(h);
    const list = F.list(h);
    const soulId = FD.SOUL_ITEM.id;
    const soulCount = (h.mats && h.mats[soulId]) || 0;
    const unlocked = F.canUnlock(h);

    let html = `<div class="modal-body">
      <div class="skill-top">
        <div>法宝位状态：<b>${unlocked ? "已开启（三转专属）" : "未开启"}</b></div>
        <div>拥有【印记之魂】：<b style="color:#ffd23a">${soulCount}</b> 颗</div>
        <div>当前装备：<b>${cur ? `【${cur.rank}阶·${cur.def.name}】` : "未装备法宝"}</b></div>
        <div>阶数上限：<b>${K.MAX_RANK} 阶</b>（⚙ 默认）</div>
      </div>
      <div class="hint mt8">规格说明：三转后新增装备位<b>“法宝”</b>。使用<b>印记之魂</b>进阶，每进 1 阶主属性 <b>+${K.STAT_PER_RANK}</b>（官方原话，缺数标 <b>⚙ 默认</b>）。装备面板 16 格中间增加法宝格。</div>`;

    if (cur) {
      const def = cur.def, rank = cur.rank;
      const rankBonus = rank * K.STAT_PER_RANK;
      const cost = rank < K.MAX_RANK ? K.SOUL_COST(rank) : 0;
      const canAdv = rank < K.MAX_RANK && soulCount >= cost;
      html += `<div class="fabao-featured mt8">
        <div class="fabao-feat-head">
          <div class="fabao-feat-title">
            <span class="fabao-ico-lg">${def.icon}</span>
            <div>
              <b style="color:#ff9800;font-size:16px">【${F.cnRank(rank)}阶·${def.name}】</b>
              <span class="badge main">装备中</span>
              <span class="badge zs">三转专属</span>
            </div>
          </div>
          <div>
            ${rank < K.MAX_RANK
              ? `<button class="btn primary small" data-fadvance="${def.id}" ${canAdv ? "" : "disabled"}>使用印记之魂进阶（耗 ${cost} 颗）</button>`
              : `<span class="badge on">已至满阶</span>`}
            <button class="btn small danger" data-funequip="1">卸下法宝</button>
          </div>
        </div>
        <div class="fabao-rank-bar-wrap mt8">
          <div class="bar xp"><i style="width:${(rank / K.MAX_RANK) * 100}%"></i></div>
          <span class="small">${rank} / ${K.MAX_RANK} 阶</span>
        </div>
        <div class="fabao-props mt8">
          <div><b>基础属性</b>：${Object.entries(def.baseStats).map(([k, v]) => `${TSQ.EQ.statNames[k] || k} +${v}`).join("　")}</div>
          <div style="color:#d4a020"><b>进阶淬炼</b>：${def.primaryStatName} +${rankBonus}（每进 1 阶 +15 ⚙）</div>
          ${rank < K.MAX_RANK
            ? `<div style="color:#2c7a3f"><b>下阶预览</b>：${def.primaryStatName} +${rankBonus + K.STAT_PER_RANK}（增加 15 点，进阶需消耗印记之魂 ×${cost}）</div>`
            : `<div style="color:#d4a020"><b>境界圆满</b>：已达 ${K.MAX_RANK} 阶法宝最高境界！</div>`}
        </div>
        <div class="small mt8" style="color:#8a7050">${def.desc}</div>
      </div>`;
    } else {
      html += `<div class="fabao-featured mt8 empty">
        <div class="hint">当前未装备法宝。请从下方拥有的法宝中点击「装备」法宝。</div>
      </div>`;
    }

    html += `<div class="mt12"><b>法宝收藏库</b>（点击「装备」切换，或直接进阶）：</div>
      <div class="bdg-grid mt8">`;

    list.forEach((fb) => {
      const isEq = fb.isEquipped;
      const rank = fb.rank;
      const def = fb.def;
      const rankBonus = rank * K.STAT_PER_RANK;
      const cost = rank < K.MAX_RANK ? K.SOUL_COST(rank) : 0;
      const canAdv = rank < K.MAX_RANK && soulCount >= cost;
      html += `<div class="bdg-card ${isEq ? "on" : ""}">
        <div class="bdg-top">
          <span class="bdg-ico">${def.icon}</span>
          <b style="color:#ff9800">${def.name}</b>
          <span class="badge ${isEq ? "main" : ""}">${rank}阶 / 10阶</span>
          ${isEq ? '<span class="bdg-on">装备中</span>' : '<span class="wf-flag">备用</span>'}
        </div>
        <div class="small">${def.desc}</div>
        <div class="bdg-stats">
          <div>基础：${Object.entries(def.baseStats).map(([k, v]) => `${TSQ.EQ.statNames[k] || k} +${v}`).join(" ")}</div>
          <div style="color:#d4a020">进阶：${def.primaryStatName} +${rankBonus}（每阶+15）</div>
        </div>
        <div class="sk-foot">
          ${rank < K.MAX_RANK
            ? `<button class="btn tiny" data-fadvance="${def.id}" ${canAdv ? "" : "disabled"}>进阶(耗${cost})</button>`
            : `<span class="small dim">满阶</span>`}
          ${isEq
            ? `<button class="btn tiny danger" data-funequip="1">卸下</button>`
            : `<button class="btn tiny primary" data-fequip="${def.id}">装备</button>`}
        </div>
      </div>`;
    });

    html += `</div>
      <div class="hint mt8">演示角色初始发放 1 件法宝（番天印）及备选法宝，附带 35 颗印记之魂；可直接点击进阶体验每阶属性 +15。</div>
    </div>`;
    return html;
  }

  /* ---------------- 徽章页 ---------------- */
  function renderBadgeTab(h) {
    const B = TSQ.Badge, K = BD().CONST;
    const list = B.list(h);
    const worn = (h.badges && h.badges.worn) || [];
    const bonus = B.bonus(h);
    const pctStats = (TSQ.EQ && TSQ.EQ.pctStats) || [];
    const sum = Object.entries(bonus.flat).map(([k, v]) =>
      `${TSQ.EQ.statNames[k] || k} +${v}`).concat(
      Object.entries(bonus.pct).map(([k, v]) => `${TSQ.EQ.statNames[k] || k} +${Math.round(v * 1000)}‰`)
    );
    let html = `<div class="modal-body">
      <div class="skill-top">
        <div>已佩戴：<b>${worn.length}</b> / ${K.MAX_WEAR}（⚙ 默认上限）</div>
        <div>拥有：<b>${list.filter((x) => x.owned).length}</b> / ${list.length} 枚</div>
        <div>银两：<b>${h.silver || 0}</b></div>
        <div>元神丹：<b>${(h.mats && h.mats[BD().PILL.id]) || 0}</b>（元神页使用）</div>
      </div>
      <div class="hint mt8">徽章名 / 佩戴上限 / 数值规格未随包，全部为 <b>⚙ 默认</b>（集中在 <code>js/badge-data.js</code>）；
        拿到规格后改数据即可，逻辑不用动。佩戴后加成直接进「装备 / 属性」页的人物属性汇总。</div>
      <div class="mt8"><b>当前徽章总加成</b>：${sum.length ? sum.join("　") : "（未佩戴徽章）"}</div>
      <div class="bdg-grid mt8">`;
    list.forEach((b) => {
      const cls = b.worn ? "on" : (b.owned ? "" : "dim");
      html += `<div class="bdg-card ${cls}">
        <div class="bdg-top">
          <span class="bdg-ico">${b.def.icon}</span>
          <b>${b.def.name}</b>
          <span class="badge ${b.def.src === "⚙默认" ? "zs" : ""}">${b.def.src}</span>
          <span class="badge">${b.def.cat}</span>
          ${b.worn ? '<span class="bdg-on">佩戴中</span>' : (b.owned ? '<span class="wf-flag">未佩戴</span>' : '<span class="wf-flag">未拥有</span>')}
        </div>
        <div class="small">${b.def.desc}</div>
        <div class="bdg-stats">${Object.entries(b.def.stats).map(([k, v]) =>
          pctStats.includes(k) ? `${TSQ.EQ.statNames[k] || k} +${Math.round(v * 1000)}‰` : `${TSQ.EQ.statNames[k] || k} +${v}`).join("　")}</div>
        <div class="sk-foot">
          <span class="small">等级 Lv${b.lv} / ${K.BADGE_MAX_LV}（⚙ 默认）</span>
          ${b.worn
            ? `<button class="btn small danger" data-bdg="${b.def.id}" data-act="off">卸下</button>`
            : `<button class="btn small primary" data-bdg="${b.def.id}" data-act="on" ${b.owned ? "" : "disabled"}>佩戴</button>`}
        </div>
      </div>`;
    });
    return html + `</div>
      <div class="hint mt8">佩戴上限 ${K.MAX_WEAR} 枚（⚙ 默认）；满了先卸下一枚再戴。演示角色已发放 ${BD().CONST.DEMO.grantBadges.length} 枚并默认戴上 ${BD().CONST.DEMO.wearBadges.length} 枚。</div>
      </div>`;
  }

  /* ---------------- 元神页 ---------------- */
  function renderYsTab(h) {
    state.ysSubTab = state.ysSubTab || "境界";
    const subtabs = [
      { id: "境界", name: "元神境界" },
      { id: "地灵", name: "元神·地灵" },
      { id: "经脉", name: "八脉·经脉" }
    ];
    let subtabHtml = `<div class="pet-tabs mb8" style="margin-bottom:12px">${subtabs.map((t) =>
      `<div class="tab ${state.ysSubTab === t.id ? "active" : ""}" data-ystab="${t.id}">${t.name}</div>`
    ).join("")}</div>`;

    if (state.ysSubTab === "地灵") {
      return `<div class="modal-body">${subtabHtml}${renderDiLingContent(h)}</div>`;
    }
    if (state.ysSubTab === "经脉") {
      return `<div class="modal-body">${subtabHtml}${renderMeridianContent(h)}</div>`;
    }

    const Y = YS(), K = BD().CONST;
    const lv = Y.level(h), need = Y.need(h), cur = Y.exp(h), m = Y.mult(h);
    const pct = need ? Math.min(100, Math.round((cur / need) * 100)) : 100;
    const pills = Y.pillCount(h), silver = Y.silverCost(h);
    let html = `<div class="modal-body">
      ${subtabHtml}
      <div class="skill-top">
        <div>元神等级：<b>Lv${lv}</b> / ${K.YS_MAX_LV}（⚙ 默认上限）</div>
        <div>当前经验：<b>${cur}</b>${need ? ` / ${need}` : "（已满级）"}</div>
        <div>附魔倍率：<b class="ys-mult">×${m}</b>（⚙ 默认 每 2 级 +1 倍，上限 ×${K.YS_MAX_MULT}）</div>
        <div>元神值：<b>${Y.pool(h)}</b>（附魔消耗，沿用 v0.7）</div>
        <div>银两：<b>${h.silver || 0}</b>　${BD().PILL.name}：<b>${pills}</b></div>
      </div>
      <div class="ys-panel mt8">
        <div class="ys-head">
          <span class="ys-lvbig">Lv${lv}</span>
          <span class="grow"></span>
          <span class="ys-now">生效倍率 ×${m}</span>
        </div>
        <div class="prof-bar"><i style="width:${pct}%"></i></div>
        <div class="small">元神经验 ${cur}${need ? `/${need}` : "（满级）"}</div>
        <div class="ys-acts">
          <button class="btn small primary" data-ys="pill" data-n="1" ${Y.maxed(h) || pills < 1 ? "disabled" : ""}>服${BD().PILL.name}×1（+${K.YS_PILL_EXP} 经验）</button>
          <button class="btn small" data-ys="pill" data-n="10" ${Y.maxed(h) || pills < 1 ? "disabled" : ""}>连服 ×10</button>
          <button class="btn small primary" data-ys="silver" ${Y.maxed(h) || (h.silver || 0) < silver ? "disabled" : ""}>银两升级（${silver} 银）</button>
        </div>
        <div class="small mt8">⚙ 默认：1 颗${BD().PILL.name} = ${K.YS_PILL_EXP} 元神经验；银两升级 = 目标等级 ×${K.YS_SILVER_PER_LV} 银，直接 +1 级；
          每升 1 级元神值 +${K.YS_VALUE_PER_LV}×等级。</div>
      </div>
      <div class="mt12"><b>等级 → 附魔倍率</b>（⚙ 默认）</div>
      <div class="ys-table mt8">`;
    for (let l = 1; l <= K.YS_MAX_LV; l++) {
      html += `<div class="ys-row ${l === lv ? "cur" : ""}">
        <span class="ys-lv">Lv${l}</span>
        <span class="ys-mm">×${Y.multOfLevel(l)}</span>
        <span class="small">升级经验 ${K.YS_EXP_NEED(l)}</span>
        ${l === lv ? '<span class="badge main">当前</span>' : ""}
      </div>`;
    }
    return html + `</div>
      <div class="hint mt8">倍率作用点（本轮只做 UI 与结算的<b>只读接入</b>，不改动 <code>data/rates.js</code> 的成功率表）：
        ① 打造面板「附魔」页显示当前倍率，并把「元神倍数」默认值对齐它；
        ② 装备浮窗的附魔值显示 <b>基础值 × 倍率</b>；
        ③ 人物面板 / 战斗结算的防御按同一倍率计入增量。规格里「元神 1–5 倍」的成功率算法本身不变。</div>
      </div>`;
  }

  /* ══════════ 元神·地灵 (v1.4) ══════════ */
  function renderDiLingContent(h) {
    if (!TSQ.Meridian) return `<div class="hint">地灵经脉模块未加载。</div>`;
    TSQ.Meridian.initHero(h);
    const DLD = TSQ.MeridianData.DILING;
    const curYs = (h.yuanshen && h.yuanshen.value) || 0;
    const curYp = h.yinpiao || 0;
    const curSil = h.silver || 0;

    const cardsHtml = DLD.ELEMENTS.map((el) => {
      const curLv = TSQ.Meridian.dilingLevel(h, el.id);
      const isMax = curLv >= DLD.MAX_LEVEL;
      const curReduce = (TSQ.Meridian.dilingReducePct(h, el.id) * 100).toFixed(1);
      const nextReduce = Math.min(DLD.MAX_REDUCE * 100, (curLv + 1) * DLD.REDUCE_PER_LEVEL * 100).toFixed(1);
      const ysCost = DLD.costYuanshen(curLv);
      const silverCost = DLD.costSilver(curLv);
      const canUp = TSQ.Meridian.canUpgradeDiLing(h, el.id);

      return `
        <div class="diling-card ${isMax ? 'maxed' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:15px;font-weight:bold;color:#f1c40f">${el.name}（${el.element}属性）</span>
            <span class="badge ${isMax ? 'main' : ''}">Lv.${curLv} / ${DLD.MAX_LEVEL}</span>
          </div>
          <div style="font-size:18px;font-weight:bold;color:#2ecc71;margin:4px 0">
            减伤：${curReduce}%
            ${!isMax ? `<span style="font-size:13px;color:#aaa"> → ${nextReduce}%</span>` : ''}
          </div>
          <div class="small" style="color:#bbb">${el.desc}</div>
          <div class="small" style="color:#aaa;margin-top:4px">
            ${isMax ? '<span style="color:#f1c40f;font-weight:bold">已臻化境（最高减伤 60%）</span>' :
              `升级需消耗：<br>元神 <b>${ysCost.toLocaleString()}</b> 点 · 银票/银两 <b>${silverCost.toLocaleString()}</b> 两`}
          </div>
          <div style="margin-top:auto;padding-top:8px">
            <button class="btn small primary" style="width:100%" data-dl-upgrade="${el.id}" ${(!canUp.ok || isMax) ? 'disabled' : ''}>
              ${isMax ? '已满级' : '修炼突破'}
            </button>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div>
        <div class="skill-top" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            元神值：<b style="color:#f1c40f">${curYs.toLocaleString()}</b>　银票：<b>${curYp.toLocaleString()}</b>　银两：<b>${curSil.toLocaleString()}</b>
          </div>
          <div class="small" style="color:#2ecc71">
            玄/毒/火/冰减伤直接生效于战斗结算
          </div>
        </div>
        <div class="hint mt8">元神·地灵（§4.3）：四大元素抗性，全职业可修；消耗元神+银票（无银票则用银两 ⚙）；每级减伤 1.5% × 等级，上限 60% ⚙（40 级封顶）。减伤已进战斗属性！</div>
        <div class="diling-grid mt12">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  /* ══════════ 八脉·经脉 (v1.4) ══════════ */
  function renderMeridianContent(h) {
    if (!TSQ.Meridian) return `<div class="hint">地灵经脉模块未加载。</div>`;
    TSQ.Meridian.initHero(h);
    const MDATA = TSQ.MeridianData.MERIDIAN;
    state.selectedMeridian = state.selectedMeridian || "ren";
    const curMDef = MDATA.MERIDIANS.find((m) => m.id === state.selectedMeridian) || MDATA.MERIDIANS[0];
    const curMState = (h.meridians && h.meridians[curMDef.id]) || { points: [] };

    const pills = (h.consumables && h.consumables[MDATA.DAHUANDAN_ID]) || 0;

    // 8 脉选择按钮
    const tabButtons = MDATA.MERIDIANS.map((m) => {
      const ms = (h.meridians && h.meridians[m.id]) || { points: [] };
      let layers = 0;
      (ms.points || []).forEach((p) => layers += (p.layer || 0));
      return `
        <button class="meridian-tab-btn ${m.id === curMDef.id ? 'active' : ''}" data-meridian-tab="${m.id}">
          ${m.name} (${layers}/60)
        </button>
      `;
    }).join("");

    // 6 个穴位卡片
    const pointCards = curMDef.points.map((pname, idx) => {
      const pt = (curMState.points && curMState.points[idx]) || { name: pname, layer: 0, activated: false };
      const isLocked = idx > 0 && !((curMState.points && curMState.points[idx - 1]) || {}).activated;
      const isDone = pt.layer >= MDATA.LAYERS_PER_POINT && pt.activated;
      const isActivating = (pt.layer === 9);
      const expCost = MDATA.costExp(pt.layer);
      const skillExpCost = MDATA.costSkillExp(pt.layer);
      const canUp = TSQ.Meridian.canUpgradePoint(h, curMDef.id, idx);

      let boostTag = "";
      if (idx === 4 && curMDef.boost5) {
        boostTag = `
          <div class="meridian-boost-tag mt4">
            <b>${curMDef.boost5.name}</b>：${curMDef.boost5.desc}
            <div style="font-weight:bold;margin-top:2px">${pt.activated ? '✓ 技能加成已生效' : '🔒 激活第5穴后点亮'}</div>
          </div>
        `;
      } else if (idx === 5 && curMDef.boost6) {
        boostTag = `
          <div class="meridian-boost-tag mt4">
            <b>${curMDef.boost6.name}</b>：${curMDef.boost6.desc}
            <div style="font-weight:bold;margin-top:2px">${pt.activated ? '✓ 终极突破已生效' : '🔒 激活第6穴后点亮'}</div>
          </div>
        `;
      }

      const pct = Math.min(100, pt.layer * 10);

      return `
        <div class="meridian-point-card ${isDone ? 'activated' : ''} ${isLocked ? 'locked' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:bold;font-size:14px;color:#f1c40f">第${idx + 1}穴 · ${pname}穴</span>
            <span class="badge ${isDone ? 'main' : ''}">${isDone ? '已激活' : `第 ${pt.layer} / 10 层`}</span>
          </div>
          <div class="prof-bar mt4"><i style="width:${pct}%"></i></div>
          <div class="small" style="color:#2ecc71;margin-top:2px">
            属性增益：<b>${curMDef.attrName} +${pt.layer}</b>
          </div>
          ${boostTag}
          <div style="margin-top:auto;padding-top:8px">
            ${isDone ?
              '<button class="btn tiny" disabled style="width:100%">十层圆满 · 已激活</button>' :
              (isLocked ?
                `<button class="btn tiny" disabled style="width:100%">前置穴位未激活</button>` :
                (isActivating ?
                  `<button class="btn tiny primary" style="width:100%;background:#e67e22;border-color:#d35400" data-meridian-upgrade="${curMDef.id}" data-point-idx="${idx}" ${!canUp.ok ? 'disabled' : ''}>
                    突破激活 (需大还丹×1)
                  </button>
                  <div class="small" style="color:#aaa;margin-top:4px">
                    需人经 ${expCost.toLocaleString()} · 技经 ${skillExpCost.toLocaleString()} · 大还丹×1
                  </div>` :
                  `<button class="btn tiny primary" style="width:100%" data-meridian-upgrade="${curMDef.id}" data-point-idx="${idx}" ${!canUp.ok ? 'disabled' : ''}>
                    修炼升层 (升至第${pt.layer + 1}层)
                  </button>
                  <div class="small" style="color:#aaa;margin-top:4px">
                    需人经 ${expCost.toLocaleString()} · 技经 ${skillExpCost.toLocaleString()}
                  </div>`
                )
              )
            }
          </div>
        </div>
      `;
    }).join("");

    return `
      <div>
        <div class="skill-top" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            人物经验：<b>${(h.exp || 0).toLocaleString()}</b>　技能经验：<b>${(h.skillExp || 0).toLocaleString()}</b>　大还丹：<b style="color:#e67e22">${pills}</b> 颗
          </div>
          <div>
            <button class="btn tiny" id="btn-meridian-demo" ${h.flags.meridianDemoClaimed ? 'disabled' : ''}>
              ${h.flags.meridianDemoClaimed ? '演示礼包已领取' : '⚙ 演示礼包：领取大还丹与经脉资材'}
            </button>
          </div>
        </div>
        <div class="hint mt8">经脉（§4.4）：“八脉一通，谁敢不从”。8 条经脉，每条 6 个穴位，每个穴位 10 层；升层消耗技能经验与人物经验，第 10 层需 1 颗【大还丹】激活；每层增加对应一级属性；激活第 5/6 穴时获得技能强化标记与属性加成！</div>
        <div class="meridian-tabs mt12">
          ${tabButtons}
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:10px 12px;margin-bottom:12px">
          <div style="font-weight:bold;font-size:15px;color:#a29bfe">【${curMDef.name}】（修真主属性：${curMDef.attrName}）</div>
          <div class="small" style="color:#bbb;margin-top:4px">${curMDef.desc}</div>
        </div>
        <div class="meridian-points-grid">
          ${pointCards}
        </div>
      </div>
    `;
  }

  function bindYsEvents(container, h, rerender) {
    $all("[data-ys]", container).forEach((b) => b.onclick = () => {
      const mode = b.dataset.ys, n = Number(b.dataset.n || 1);
      const r = mode === "silver" ? TSQ.Yuanshen.upgradeBySilver(h) : TSQ.Yuanshen.takePill(h, n);
      if (r && r.msg) pushSysLog(r.msg);
      toast(r.msg); refreshAll(); rerender();
    });

    $all("[data-ystab]", container).forEach((b) => b.onclick = () => {
      state.ysSubTab = b.dataset.ystab;
      rerender();
    });

    $all("[data-dl-upgrade]", container).forEach((b) => b.onclick = () => {
      const elemId = b.dataset.dlUpgrade;
      const r = TSQ.Meridian.upgradeDiLing(h, elemId);
      if (r && r.msg) { pushSysLog(r.msg); toast(r.msg); }
      refreshAll(); rerender();
    });

    $all("[data-meridian-tab]", container).forEach((b) => b.onclick = () => {
      state.selectedMeridian = b.dataset.meridianTab;
      rerender();
    });

    $all("[data-meridian-upgrade]", container).forEach((b) => b.onclick = () => {
      const mId = b.dataset.meridianUpgrade;
      const pIdx = Number(b.dataset.pointIdx);
      const r = TSQ.Meridian.upgradePoint(h, mId, pIdx);
      if (r && r.msg) { pushSysLog(r.msg); toast(r.msg); }
      refreshAll(); rerender();
    });

    const bDemo = $("#btn-meridian-demo", container);
    if (bDemo) {
      bDemo.onclick = () => {
        const r = TSQ.Meridian.claimDemoPack(h);
        if (r && r.msg) { pushSysLog(r.msg); toast(r.msg); }
        refreshAll(); rerender();
      };
    }
  }

  /* ---------------- 精灵 / 萝莉页（v1.1） ---------------- */
  function renderSpiritTab(h) {
    if (!TSQ.Spirit) return `<div class="modal-body"><div class="hint">精灵系统尚未就绪。</div></div>`;
    TSQ.Spirit.initHero(h);
    const sp = h.spirit;
    const curSpirit = TSQ.Spirit.currentSpirit(h);
    const loli = sp.loli;
    const costNormal = TSQ.Spirit.trainCost(h);
    const costLow = TSQ.SpiritData.CONST.TRAIN_COST_LOW; // 30500
    const curYs = (h.yuanshen && h.yuanshen.value) || 0;
    const badgeCount = sp.badgeCount || 0;
    const fPet = G().fightingPet(h);
    const fPetSt = fPet ? TSQ.Pet.stats(fPet) : null;
    const spBonus = curSpirit ? TSQ.SpiritData.spiritStats(curSpirit.rank, curSpirit.level) : null;
    const loliBonus = loli ? TSQ.SpiritData.loliStats(loli.rank, loli.level) : null;

    let html = `<div class="modal-body spirit-modal-body">
      <div class="skill-top spirit-summary-bar">
        <div>精灵徽章：<b class="highlight">${badgeCount}</b> 枚（仙境府邸日常 / 兑换白精灵）</div>
        <div>元神池：<b class="highlight">${curYs}</b> 点元神值（用于培养）</div>
        <div>当前人物等级：<b>Lv${h.level}</b>（${h.level < 139 ? "Lv<139 基准：普通培养扣 30,500 元神 ⚙" : "Lv≥139：普通培养扣 45,000 元神 ⚙"}）</div>
      </div>

      <!-- 兑换与日常区 -->
      <div class="spirit-exchange-card mt8">
        <div class="exchange-title">
          <span>🏰 <b>仙境府邸 · 精灵王国兑换所</b></span>
          <span class="small hint">20 枚精灵徽章换 1 只白精灵</span>
        </div>
        <div class="exchange-actions mt8">
          <button class="btn primary" id="btn-exchange-spirit" ${badgeCount >= 20 ? "" : "disabled"}>
            20徽章兑换白精灵
          </button>
          <button class="btn small" id="btn-spirit-daily-mission" title="模拟完成每日精灵王国任务">
            每日任务：+2 徽章 +1 种子
          </button>
          <button class="btn tiny" id="btn-spirit-add-badges" title="测试用快捷增加 20 枚徽章">
            +20 徽章（测试）
          </button>
        </div>
      </div>

      <div class="spirit-dual-grid mt8">
        <!-- 白精灵卡片 -->
        <div class="spirit-card">
          <div class="spirit-card-head">
            <span class="spirit-ico">${curSpirit ? curSpirit.icon : "🧚‍♀️"}</span>
            <div class="spirit-head-info">
              <div class="spirit-name"><b>${curSpirit ? curSpirit.name : "白精灵"}</b> <span class="spirit-badge-pill">${curSpirit ? `${curSpirit.rank}阶·${curSpirit.level}级` : "未拥有"}</span></div>
              <div class="small">${curSpirit ? curSpirit.desc : "纯白仙灵，同时守护人物与出战宠物"}</div>
            </div>
          </div>

          ${curSpirit ? `
          <div class="spirit-rank-bar-wrap mt8">
            <span class="small">阶级进度：<b>${curSpirit.rank} 阶 ${curSpirit.level} 级</b> / 9 阶 5 级（共 ${spBonus ? spBonus.step : 0}/45 级）</span>
            <div class="bar mt4"><i style="width:${Math.round(((spBonus ? spBonus.step : 1) / 45) * 100)}%"></i></div>
          </div>

          <div class="spirit-props-box mt8">
            <div class="spirit-prop-title">【同步属性加成】同时进入人物 combatStats 与出战宠物：</div>
            <div class="spirit-prop-grid">
              <span>生命 +${spBonus.flat.hp}</span>
              <span>法力 +${spBonus.flat.mp}</span>
              <span>物攻 +${spBonus.flat.patk}</span>
              <span>法攻 +${spBonus.flat.matk}</span>
              <span>物防 +${spBonus.flat.pdef}</span>
              <span>法防 +${spBonus.flat.mdef}</span>
              <span>速度 +${spBonus.flat.spd}</span>
              <span>五维 +${spBonus.flat.str}</span>
            </div>
          </div>

          <div class="spirit-pet-sync-box mt8">
            <span>🐾 出战宠物同调：${fPet ? `【${fPet.name}】（战力 <b>${fPetSt.power}</b>，已享受白精灵加成）` : "当前无出战宠物（携带宠物出战即享同等加成）"}</span>
          </div>

          <div class="spirit-train-actions mt8">
            <button class="btn primary" id="btn-train-spirit">
              普通培养（扣 ${costNormal} 元神）
            </button>
            <button class="btn small" id="btn-train-spirit-low" title="按 <139 级基准扣 30,500 元神">
              基准培养（扣 30,500 元神）
            </button>
          </div>
          ` : `
          <div class="hint mt8">当前尚未持有白精灵。请使用上方的「20徽章兑换白精灵」按钮兑换。</div>
          `}
        </div>

        <!-- 萝莉养成卡片 -->
        <div class="spirit-card loli-card">
          <div class="spirit-card-head">
            <span class="spirit-ico">${loli ? loli.icon : "👧"}</span>
            <div class="spirit-head-info">
              <div class="spirit-name"><b>${loli ? loli.name : "小萝莉"}</b> <span class="loli-badge-pill">${loli ? `${loli.rank}阶·${loli.level}级` : "未解锁"}</span></div>
              <div class="small">${loli ? loli.desc : "卡萝莉特色养成，随突破为人物提供深厚属性庇护"}</div>
            </div>
          </div>

          ${loli ? `
          <div class="spirit-rank-bar-wrap mt8">
            <span class="small">阶级进度：<b>${loli.rank} 阶 ${loli.level} 级</b> / 5 阶 9 级（共 ${loliBonus ? loliBonus.step : 0}/45 级）</span>
            <div class="bar mt4"><i style="width:${Math.round(((loliBonus ? loliBonus.step : 1) / 45) * 100)}%"></i></div>
          </div>

          <div class="spirit-props-box mt8">
            <div class="spirit-prop-title">【人物属性加成】直接进入人物 combatStats：</div>
            <div class="spirit-prop-grid">
              <span>生命 +${loliBonus.flat.hp}</span>
              <span>法力 +${loliBonus.flat.mp}</span>
              <span>物攻 +${loliBonus.flat.patk}</span>
              <span>法攻 +${loliBonus.flat.matk}</span>
              <span>物防 +${loliBonus.flat.pdef}</span>
              <span>法防 +${loliBonus.flat.mdef}</span>
              <span>速度 +${loliBonus.flat.spd}</span>
              <span>五维 +${loliBonus.flat.str}</span>
            </div>
          </div>

          <div class="spirit-train-actions mt8">
            <button class="btn primary" id="btn-train-loli">
              萝莉培养（扣 ${costNormal} 元神）
            </button>
            <button class="btn small" id="btn-train-loli-low" title="按 <139 级基准扣 30,500 元神">
              基准培养（扣 30,500 元神）
            </button>
          </div>
          ` : `
          <div class="hint mt8">萝莉系统尚未初始化。</div>
          `}
        </div>
      </div>
    </div>`;
    return html;
  }

  function bindSpiritEvents(body, h) {
    const btnEx = $("#btn-exchange-spirit", body);
    if (btnEx) {
      btnEx.onclick = () => {
        const r = TSQ.Spirit.exchangeWhiteSpirit(h);
        if (r && r.msg) pushSysLog(r.msg);
        toast(r.msg);
        refreshAll();
        renderChar();
      };
    }
    const btnDaily = $("#btn-spirit-daily-mission", body);
    if (btnDaily) {
      btnDaily.onclick = () => {
        TSQ.Spirit.addBadges(h, 2);
        toast("完成仙境府邸日常，获得精灵徽章×2、精灵种子×1！");
        refreshAll();
        renderChar();
      };
    }
    const btnAdd = $("#btn-spirit-add-badges", body);
    if (btnAdd) {
      btnAdd.onclick = () => {
        TSQ.Spirit.addBadges(h, 20);
        toast("获得精灵徽章×20（测试）！");
        refreshAll();
        renderChar();
      };
    }
    const btnTrainSp = $("#btn-train-spirit", body);
    if (btnTrainSp) {
      btnTrainSp.onclick = () => {
        const r = TSQ.Spirit.trainSpirit(h);
        if (r && r.msg) pushSysLog(r.msg);
        toast(r.msg);
        refreshAll();
        renderChar();
      };
    }
    const btnTrainSpLow = $("#btn-train-spirit-low", body);
    if (btnTrainSpLow) {
      btnTrainSpLow.onclick = () => {
        const r = TSQ.Spirit.trainSpirit(h, { mode: "low" });
        if (r && r.msg) pushSysLog(r.msg);
        toast(r.msg);
        refreshAll();
        renderChar();
      };
    }
    const btnTrainLoli = $("#btn-train-loli", body);
    if (btnTrainLoli) {
      btnTrainLoli.onclick = () => {
        const r = TSQ.Spirit.trainLoli(h);
        if (r && r.msg) pushSysLog(r.msg);
        toast(r.msg);
        refreshAll();
        renderChar();
      };
    }
    const btnTrainLoliLow = $("#btn-train-loli-low", body);
    if (btnTrainLoliLow) {
      btnTrainLoliLow.onclick = () => {
        const r = TSQ.Spirit.trainLoli(h, { mode: "low" });
        if (r && r.msg) pushSysLog(r.msg);
        toast(r.msg);
        refreshAll();
        renderChar();
      };
    }
  }

  function afterOp(r) { if (r && r.msg) toast(r.msg); refreshAll(); }
  function renderBag() { TSQ.EquipUI.renderBag($("#bag-body"), state.hero, afterOp); }
  function renderForge() { TSQ.EquipUI.renderForge($("#forge-body"), state.hero, afterOp); }

  // ---------------- 技能 · 心法面板（v0.5） ----------------
  function bookSummary(h) {
    const S = TSQ.Skill;
    return Object.keys(S.CONST.BOOK_POINTS).map((k) =>
      `${S.CONST.BOOK_NAMES[k]}×${(h.skillBooks && h.skillBooks[k]) || 0}`).join(" · ");
  }

  function renderSkill() {
    const h = state.hero;
    const S = TSQ.Skill;
    const body = $("#skill-body");
    // v0.7：天资（稀有技能）门槛表 —— 职业技能页与天资页共用同一份规则
    const talentMap = {};
    if (TSQ.LifeSkill) TSQ.LifeSkill.talentList(h).forEach((t) => (talentMap[t.id] = t));
    const tabs = ["职业技能", "心法", "天资", "夫妻", "生活"];
    const tabHtml = `<div class="tabs">${tabs.map((t) =>
      `<div class="tab ${state.skillTab === t ? "active" : ""}" data-stab="${t}">${t}</div>`).join("")}</div>`;

    if (state.skillTab === "职业技能") {
      const cls = D().classes[h.class_id];
      let html = `<div class="modal-body">
        <div class="skill-top">
          <div>职业：<b>${cls.name}</b> · Lv${h.level}</div>
          <div>技能经验：<b>${h.skillExp || 0}</b></div>
          <div>技能书：${bookSummary(h)}</div>
          <div>修为：<b>${h.xiuwei || 0}</b></div>
        </div>
        <div class="hint mt8">下一级需<b>同时</b>满足 4 条：有技能书 / 心法达标 / 熟练度 8 层 / 技能经验足够。
        熟练度只在「怪物等级与技能适用等级差 ≤5」的战斗中使用才涨（⚙ 默认口径）。</div>`;
      S.xinfaList().forEach((xf) => {
        const main = S.isMainXinfa(h.class_id, xf.id);
        const xfLv = S.xinfaLevel(h, xf.id);
        html += `<div class="xf-section ${main ? "main" : ""}">
          <div class="xf-head"><b>${xf.name}</b>
            <span class="wf-tag">心法 Lv${xfLv}</span>
            ${main ? '<span class="badge main">擅长</span>' : '<span class="badge">非本职</span>'}
            <span class="small">${xf.desc}</span></div>
          <div class="skill-cards">`;
        S.skillsOfXinfa(xf.id).forEach((sk) => {
          const lv = S.skillLevel(h, sk.id);
          const pp = S.profProgress(h, sk.id);
          const chk = S.canLearn(h, sk.id);
          const expNeed = S.learnExpCost(sk, chk.target || 1);
          const catCls = sk.cat === "转生" ? "zs" : sk.cat === "稀有" ? "xy" : "";
          // v0.7：稀有（天资）技能在职业技能页同样显示天资解锁门槛，两页规则一致（不另设一套）
          const tg = sk.cat === "稀有" ? talentMap[sk.id] : null;
          const gateOk = !tg || tg.unlockOk;
          html += `<div class="skill-card ${main ? "main" : ""} ${lv > 0 ? "" : "locked"}">
            <div class="sk-top"><b>${sk.name}</b><span class="badge ${catCls}">${sk.cat}</span>
              <span class="badge rage">${sk.rage}</span></div>
            <div class="small">${sk.desc}</div>
            <div class="small">等级 ${lv}${lv > 0 ? ` · 适用等级 ${S.applicableLevel(h, sk.id)}` : " · 未学习"}</div>
            <div class="prof-bar"><i style="width:${pp.pct}%"></i></div>
            <div class="small">熟练度 ${pp.layer}/8 层${pp.need ? `（${pp.cur}/${pp.need}）` : "（已满）"}</div>
            <div class="cond-list">
              ${(chk.prereq ? `<div class="cond ${chk.prereq.ok ? "ok" : "no"}">${chk.prereq.ok ? "✓" : "✗"} 前置「${chk.prereq.name}」Lv${chk.prereq.level}/${chk.prereq.need}</div>` : "")}
              ${chk.conds.map((c) => `<div class="cond ${c.ok ? "ok" : "no"}">${c.ok ? "✓" : "✗"} ${c.label} <span class="cd">${c.detail}</span></div>`).join("")}
              ${tg ? tg.unlockConds.map((c) => `<div class="cond ${c.ok ? "ok" : "no"}">${c.ok ? "✓" : "✗"} ${c.label} <span class="cd">${c.detail}</span></div>`).join("") : ""}
            </div>
            <div class="sk-foot">
              <span class="small">下一级 Lv${chk.target || "—"}：经验 ${expNeed} · 心法 ${chk.xfNeed || "—"}</span>
              <button class="btn small primary" data-learn="${sk.id}" ${chk.ok && gateOk ? "" : "disabled"}>${lv > 0 ? "升级" : "学习"}</button>
            </div>
            ${lv >= S.CONST.SKILL_MAX_LV ? `<div class="small lv11">${sk.lv11}</div>` : ""}
          </div>`;
        });
        html += `</div></div>`;
      });
      html += `</div>`;
      body.innerHTML = tabHtml + html;
      $all("[data-learn]", body).forEach((b) => b.onclick = () => {
        const id = b.dataset.learn;
        // 稀有（天资）技能走 LifeSkill.talentLearn：门槛 + 职业技能 4 条件一起判定
        const sk = S.get(id);
        const r = (sk && sk.cat === "稀有") ? TSQ.LifeSkill.talentLearn(h, id) : S.learn(h, id);
        toast(r.msg); refreshAll(); renderSkill();
      });
    } else if (state.skillTab === "心法") {
      const cap = S.xinfaCap(h);
      let html = `<div class="modal-body">
        <div class="skill-top">
          <div>技能经验：<b>${h.skillExp || 0}</b></div>
          <div>修为：<b>${h.xiuwei || 0}</b><span class="small">（= 心法已耗技能经验 × ${S.CONST.XIUWEI_RATE}）</span></div>
          <div>心法上限 = 人物等级 Lv${cap}</div>
          <div>参考：<b>1 级升到 10 级共需 ${S.xinfaCost(1, 10)}</b> 技能经验（25×(10+1${S.CONST.XINFA_EXP_OFFSET ? "+1" : ""})×9）</div>
        </div>
        <div class="hint mt8">升级耗费 = 25×(N+M${S.CONST.XINFA_EXP_OFFSET ? "+1" : ""})×(N−M)。
          ${S.CONST.XINFA_EXP_OFFSET === 0 ? "当前为验收清单口径（1→10 = 2475）；CONST.XINFA_EXP_OFFSET 改 1 即切到 §2.3 公式口径（1→10 = 2700）。" : "当前为 §2.3 公式口径（1→10 = 2700）。"}</div>
        <div class="xinfa-table">`;
      S.xinfaList().forEach((xf) => {
        const main = S.isMainXinfa(h.class_id, xf.id);
        const lv = S.xinfaLevel(h, xf.id);
        const c1 = S.xinfaCost(lv, Math.min(cap, lv + 1));
        const t10 = Math.min(cap, lv + 10);
        const c10 = S.xinfaCost(lv, t10);
        html += `<div class="xinfa-row ${main ? "main" : ""}">
          <span class="xf-name"><b>${xf.name}</b>${main ? '<span class="badge main">擅长</span>' : ""}</span>
          <span class="xf-lv">Lv${lv} / ${cap}</span>
          <span class="xf-cost small">+1 需 ${c1}${lv >= cap ? "（已满级）" : ""}</span>
          <span class="xf-cost small">+10 → Lv${t10} 需 ${c10}</span>
          <button class="btn small" data-xf="${xf.id}" data-n="1" ${lv >= cap ? "disabled" : ""}>+1</button>
          <button class="btn small primary" data-xf="${xf.id}" data-n="10" ${lv >= cap ? "disabled" : ""}>+10</button>
        </div>`;
      });
      html += `</div>
        <div class="mt12"><b>全心法奖励</b></div>
        <div class="bonus-list">${S.bonusProgress(h).map((b) =>
          `<div class="bonus-row ${b.done ? "done" : ""}">${b.done ? "✓ 已领取" : `${b.count}/${b.total} 系`}：8 系全 ≥${b.min} 级 → 潜力 +${b.pot}</div>`).join("")}
        </div>
        <div class="hint mt8">修为影响持续回合与技能威力（持续回合 = round(3 + 修为/${Math.round(1 / S.CONST.TURN_PER_XIUWEI)})，⚙ 默认）。</div>
      </div>`;
      body.innerHTML = tabHtml + html;
      $all("[data-xf]", body).forEach((b) => b.onclick = () => {
        const r = S.upgradeXinfa(h, b.dataset.xf, Number(b.dataset.n));
        if (!r.ok) { toast(r.msg); renderSkill(); return; }
        let msg = r.msg;
        (r.bonus || []).forEach((g) => (msg += `；全心法 ≥${g.min} 奖励 潜力+${g.pot}`));
        toast(msg); refreshAll(); renderSkill();
      });
    } else if (state.skillTab === "天资") {
      body.innerHTML = tabHtml + renderTalent(h);
      $all("[data-talent]", body).forEach((b) => b.onclick = () => {
        const r = TSQ.LifeSkill.talentLearn(h, b.dataset.talent);
        toast(r.msg); refreshAll(); renderSkill();
      });
      $all("[data-goto]", body).forEach((b) => b.onclick = () => {
        state.skillTab = "职业技能"; renderSkill();
        toast("已跳到「职业技能」页，天资等级与此处共用同一份数据");
      });
    } else if (state.skillTab === "夫妻") {
      body.innerHTML = tabHtml + renderCouple(h);
      $all("[data-clearn]", body).forEach((b) => b.onclick = () => {
        const r = TSQ.LifeSkill.coupleLearn(h, b.dataset.clearn);
        toast(r.msg); refreshAll(); renderSkill();
      });
      $all("[data-ccast]", body).forEach((b) => b.onclick = () => {
        const r = TSQ.LifeSkill.coupleCast(h, b.dataset.ccast);
        toast(r.msg); refreshAll(); renderSkill();
      });
      const tg = $("#btn-toggle-marry", body);
      if (tg) tg.onclick = () => { TSQ.LifeSkill.setMarried(h, !TSQ.LifeSkill.married(h)); refreshAll(); renderSkill(); };
      $all("[data-int]", body).forEach((b) => b.onclick = () => {
        const v = TSQ.LifeSkill.addIntimacy(h, Number(b.dataset.int));
        toast("亲密度 " + v + "（⚙ 演示数值）"); refreshAll(); renderSkill();
      });
    } else if (state.skillTab === "生活") {
      body.innerHTML = tabHtml + renderLife(h);
      $all("[data-lgather]", body).forEach((b) => b.onclick = () => {
        const r = TSQ.LifeSkill.lifeGather(h, b.dataset.lgather);
        toast(r.msg); refreshAll(); renderSkill();
      });
      $all("[data-lup]", body).forEach((b) => b.onclick = () => {
        const r = TSQ.LifeSkill.lifeUpgrade(h, b.dataset.lup, b.dataset.mode);
        toast(r.msg); refreshAll(); renderSkill();
      });
    } else {
      body.innerHTML = tabHtml + `<div class="modal-body"><div class="hint">「${state.skillTab}」为后续扩展占位。</div></div>`;
    }
    $all("[data-stab]", body).forEach((t) => t.onclick = () => { state.skillTab = t.dataset.stab; renderSkill(); });
  }

  // v0.7：条件行 ✓/✗（与职业技能页同一套样式）
  function condHtml(conds) {
    return `<div class="cond-list">${conds.map((c) =>
      `<div class="cond ${c.ok ? "ok" : "no"}">${c.ok ? "✓" : "✗"} ${c.label} <span class="cd">${c.detail}</span></div>`).join("")}</div>`;
  }

  /* ---------------- 天资页：稀有技能的筛选视图（不双算等级） ---------------- */
  function renderTalent(h) {
    const S = TSQ.Skill, L = TSQ.LifeSkill;
    const list = L.talentList(h);
    let html = `<div class="modal-body">
      <div class="skill-top">
        <div>职业：<b>${D().classes[h.class_id].name}</b> · Lv${h.level}</div>
        <div>技能经验：<b>${h.skillExp || 0}</b></div>
        <div>技能书：${bookSummary(h)}</div>
        <div>修为：<b>${h.xiuwei || 0}</b></div>
      </div>
      <div class="hint mt8">天资 = 稀有（天资）技能的<b>筛选视图</b>：等级 / 熟练度 / 学习 4 条件全部与「职业技能」页共用同一份
        <code>hero.skills</code> 数据，<b>不另算一套等级</b>。下面的「解锁门槛」是本页额外加的 ⚙ 默认 条件；
        原版天资靠副本 / 任务掉落，本轮未做（见 README）。</div>
      <div class="ls-grid mt8">`;
    list.forEach((t) => {
      const lv = t.lv;
      const chk = t.learn;
      html += `<div class="skill-card ${t.owner ? "main" : ""} ${lv > 0 ? "" : "locked"}">
        <div class="sk-top"><b>${t.skill.name}</b>
          <span class="badge ${t.meta.extra ? "zs" : "xy"}">${t.meta.extra ? "稀有技能" : "天资·" + t.meta.element}</span>
          ${t.owner ? '<span class="badge main">本职</span>' : '<span class="badge">非本职</span>'}
          ${t.meta.extra ? '<span class="badge zs">慈悲系额外</span>' : ""}
          <span class="badge rage">冷却 ${t.cd} 回合 ⚙</span></div>
        <div class="small">${t.meta.effect}</div>
        <div class="small">心法：${t.xf.name} · 蓝耗 ${t.mp}${S.rageCost(h, t.id) > 0 ? " · 耗怒 " + S.rageCost(h, t.id) : ""}</div>
        <div class="small">等级 ${lv}${lv > 0 ? ` · 适用等级 ${S.applicableLevel(h, t.id)}` : " · 未学习"}</div>
        <div class="prof-bar"><i style="width:${t.prof.pct}%"></i></div>
        <div class="small">熟练度 ${t.prof.layer}/8 层${t.prof.need ? `（${t.prof.cur}/${t.prof.need}）` : "（已满）"}</div>
        ${condHtml(t.unlockConds)}
        ${condHtml(chk.conds)}
        <div class="sk-foot">
          <span class="small">下一级 Lv${chk.target || "—"}：经验 ${t.expNeed} · 心法 ${chk.xfNeed || "—"}</span>
          <button class="btn small primary" data-talent="${t.id}" ${chk.ok && t.unlockOk ? "" : "disabled"}>${lv > 0 ? "升级" : "学习"}</button>
          <button class="btn small" data-goto="${t.id}">职业技能页查看</button>
        </div>
        ${lv >= S.CONST.SKILL_MAX_LV ? `<div class="small lv11">${t.skill.lv11}</div>` : ""}
      </div>`;
    });
    return html + `</div></div>`;
  }

  /* ---------------- 夫妻页 ---------------- */
  function renderCouple(h) {
    const L = TSQ.LifeSkill;
    const list = L.coupleList(h);
    const m = L.married(h);
    let html = `<div class="modal-body">
      <div class="skill-top">
        <div>婚姻状态：<b class="${m ? "ok-txt" : "no-txt"}">${m ? "已婚" : "未婚"}</b>（⚙ 演示开关）</div>
        <div>配偶：${h.flags.spouse || "—"}（⚙ 默认）</div>
        <div>亲密度：<b>${L.intimacy(h)}</b>（⚙ 默认）</div>
        <div>银两：<b>${h.silver || 0}</b></div>
        <div>技能经验：<b>${h.skillExp || 0}</b></div>
      </div>
      <div class="ls-demo mt8">
        <button class="btn small" id="btn-toggle-marry">${m ? "置为未婚" : "置为已婚"}（⚙ 演示）</button>
        <button class="btn small" data-int="${-TSQ.LifeSkillData.CONST.INTIMACY_STEP}">亲密度 −${TSQ.LifeSkillData.CONST.INTIMACY_STEP}</button>
        <button class="btn small" data-int="${TSQ.LifeSkillData.CONST.INTIMACY_STEP}">亲密度 +${TSQ.LifeSkillData.CONST.INTIMACY_STEP}</button>
        <span class="small">原版：结婚即可学「情意绵绵」，亲密度 3000 / 5000 解锁「情深似海」/「同心同德」；真实结婚任务线本轮未做。</span>
      </div>
      ${m ? "" : '<div class="hint mt8 no-txt">当前未婚：所有夫妻技能禁用（学习 / 演练按钮均不可用）。</div>'}
      <div class="ls-grid mt8">`;
    list.forEach((c) => {
      html += `<div class="skill-card ${c.lv > 0 ? "main" : "locked"}">
        <div class="sk-top"><b>${c.def.name}</b>
          <span class="badge ${c.def.src === "原版" ? "" : "zs"}">${c.def.src}</span>
          <span class="badge rage">冷却 ${c.def.cd} 回合</span>
          <span class="badge">蓝耗 ${c.mp}</span>
          ${c.lv > 0 ? `<span class="wf-tag">已学 Lv${c.lv}${c.cd > 0 ? " · 冷却 " + c.cd : ""}</span>` : '<span class="wf-flag">未学习</span>'}
        </div>
        <div class="small">${c.def.desc}</div>
        <div class="small">亲密度门槛 ${c.def.intimacy} · 双方等级 ≥${c.def.lvReq} · 上限 Lv${TSQ.LifeSkillData.CONST.COUPLE_MAX_LV}（⚙ 默认）</div>
        ${condHtml(c.conds)}
        <div class="sk-foot">
          <span class="small">${c.maxed ? "已满级" : `下一级 Lv${c.nextLv}：银两 ${c.silver} · 技能经验 ${c.exp}`}</span>
          <button class="btn small primary" data-clearn="${c.def.id}" ${c.canLearn ? "" : "disabled"}>${c.lv > 0 ? "升级" : "学习"}</button>
          <button class="btn small" data-ccast="${c.def.id}" ${c.canCast ? "" : "disabled"}>演练释放</button>
        </div>
      </div>`;
    });
    return html + `</div>
      <div class="hint mt8">「演练释放」为非战斗演示：按等级与亲密度算效果，扣法力并写日志（战斗中会写进战斗日志）；冷却按演练次数递减（⚙ 默认）。</div>
      </div>`;
  }

  /* ---------------- 生活页 ---------------- */
  function renderLife(h) {
    const L = TSQ.LifeSkill;
    const list = L.lifeList(h);
    const bag = L.lifeBag(h);
    let html = `<div class="modal-body">
      <div class="skill-top">
        <div>银两：<b>${h.silver || 0}</b></div>
        <div>生活技能：<b>${list.length}</b> 项（原版 4 采集 + ⚙ 默认 3 项）</div>
        <div>上限 Lv${TSQ.LifeSkillData.CONST.LIFE_MAX_LV}（⚙ 默认）</div>
        <div>升级：生活经验 或 银两（⚙ 默认 二选一）</div>
      </div>
      <div class="hint mt8">采集 / 制作一次会给产出（直接进「背包 · 材料」）与生活经验；等级越高可采到的档位越好。
        完整产出表与资源点分布本轮未做（见 README）。</div>
      <div class="xinfa-table mt8">`;
    list.forEach((s) => {
      html += `<div class="ls-row">
        <span class="ls-name"><b>${s.def.icon} ${s.def.name}</b>
          <span class="badge ${s.def.src === "原版" ? "" : "zs"}">${s.def.src}</span>
          <span class="small">${s.def.kind}</span></span>
        <span class="ls-lv">Lv${s.lv}</span>
        <span class="ls-exp">
          <div class="prof-bar"><i style="width:${s.pct}%"></i></div>
          <span class="small">${s.maxed ? "已满级" : `生活经验 ${s.exp}/${s.need}`}</span>
        </span>
        <span class="ls-yield small">
          当前产出：${s.yieldItem ? `${s.yieldItem.name}（持有 ${s.have}）` : "—"}
          ${s.nextYield ? `<br>下一档 Lv${s.nextYield.needLv}：${s.nextYield.name}` : "<br>已达最高档"}
        </span>
        <button class="btn small" data-lgather="${s.def.id}">${s.def.kind === "制作" ? "制作一次" : "采集一次"}</button>
        <button class="btn small primary" data-lup="${s.def.id}" data-mode="exp" ${s.canExpUp ? "" : "disabled"}>经验升级</button>
        <button class="btn small" data-lup="${s.def.id}" data-mode="silver" ${s.canSilverUp ? "" : "disabled"}>银两升级 ${s.silver || ""}</button>
      </div>`;
    });
    html += `</div>
      <div class="mt12"><b>生活产出背包</b>（背包 · 材料区同源）</div>
      <div class="ls-chips">${bag.length
        ? bag.map((b) => `<span class="ls-chip">${b.name}×${b.n}</span>`).join("")
        : '<span class="hint">还没有产出，点上面的「采集一次」试试。</span>'}</div>
      </div>`;
    return html;
  }

  function petArtNode(pet, cls) {
    const box = document.createElement("div");
    box.className = cls || "pet-art-box";
    if (pet && pet.art) {
      const img = document.createElement("img");
      img.className = "pet-art";
      img.src = pet.art;
      img.alt = pet.name;
      img.title = `${pet.name}（立绘占位：${pet.source || "参考图"}）`;
      img.onerror = () => {
        if (pet.artAlt && img.src.indexOf(pet.artAlt) < 0) { img.src = pet.artAlt; return; }
        img.style.display = "none";
        const fb = document.createElement("div");
        fb.className = "pet-art-fallback";
        fb.textContent = pet.doodle || "宠";
        box.appendChild(fb);
      };
      box.appendChild(img);
    } else {
      const fb = document.createElement("div");
      fb.className = "pet-art-fallback";
      fb.textContent = (pet && pet.doodle) || "宠";
      box.appendChild(fb);
    }
    return box;
  }

  function renderPet() {
    const h = state.hero;
    if (!h.pets) h.pets = [];
    if (state.petIdx >= h.pets.length) state.petIdx = 0;
    const pet = h.pets[state.petIdx];
    const body = $("#pet-body");
    const tabs = ["悟性", "武装", "抗性", "进化", "炼化", "融合", "图鉴", "组合"];
    body.innerHTML = `<div class="modal-body pet-layout">
      <div class="pet-col">
        <div id="pet-art-slot"></div>
        <div class="pet-list" id="pet-list"></div>
        <div class="flex mt8 flex-wrap">
          <button class="btn small primary" id="p-carry">携带</button>
          <button class="btn small" id="p-rename">改名</button>
          <button class="btn small" id="p-feed">喂养</button>
          <button class="btn small danger" id="p-release">放生</button>
          <button class="btn small primary" id="p-goto-mount" style="margin-left:auto">骑宠面板 ➔</button>
        </div>
        <div class="attr-box mt12" id="pet-left"></div>
      </div>
      <div class="pet-col">
        <div class="pet-head" id="pet-head"></div>
        <div class="flex"><b>资质（五维）</b><span class="grow"></span>
          <button class="btn small" id="p-apt">自动服用资质丹</button></div>
        <div class="apt-bars" id="apt-bars"></div>
        <div class="mt12"><b>天赋</b></div>
        <div class="talent-list" id="pet-talents"></div>
        <div class="mt12"><b>技能</b></div>
        <!-- 附录 P1.1：宠物技能格用 .skill-grid.pet（flex-wrap + 固定格宽，窄屏不溢出） -->
        <div class="skill-grid pet" id="pet-skills"></div>
        <div class="mt12"><b>内丹</b></div>
        <div class="neidan-grid" id="pet-neidan"></div>
        <div class="pet-tabs mt12">${tabs.map((t) =>
          `<div class="tab ${state.petTab === t ? "active" : ""}" data-ptab="${t}">${t}</div>`).join("")}</div>
        <!-- v0.6：四个养成页签的真实控件渲染在这里（悟性 / 抗性仍是一句占位） -->
        <div class="pet-tab-body mt8" id="pet-tab-body"></div>
      </div>
    </div>`;

    const list = $("#pet-list");
    if (!h.pets.length) {
      list.innerHTML = `<div class="hint" style="padding:8px">暂无宠物。去野外用唤妖符捕捉，或在活动中兑换神兽。</div>`;
      $("#pet-left").innerHTML = "";
      $("#p-carry").disabled = true;
      return;
    }

    const artSlot = $("#pet-art-slot");
    artSlot.appendChild(petArtNode(pet));
    const cap = document.createElement("div");
    cap.className = "pet-caption";
    cap.innerHTML = `<b>${pet.name}</b> <span class="pet-badge">${pet.tier || pet.type}</span>
      <div class="small">Lv${pet.level} · ${D().growthRates[pet.growth].name}成长 · 战力 ${TSQ.Pet.stats(pet).power}</div>
      <div class="small">获得：${pet.source || "野外捕捉"}</div>`;
    artSlot.appendChild(cap);

    h.pets.forEach((p, i) => {
      const el = document.createElement("div");
      el.className = "item" + (i === state.petIdx ? " active" : "");
      const st = TSQ.Pet.stats(p);
      const thumb = document.createElement("div");
      thumb.className = "thumb";
      if (p.art) {
        const im = document.createElement("img");
        im.src = p.art; im.alt = p.name;
        im.onerror = () => { im.style.display = "none"; im.parentElement.textContent = p.doodle || "宠"; };
        thumb.appendChild(im);
      } else thumb.textContent = p.doodle || "宠";
      el.appendChild(thumb);
      const info = document.createElement("div");
      info.innerHTML = `<b>${p.name}</b> ${p.fighting ? '<span class="pet-badge on">出战</span>' : '<span class="pet-badge off">休息</span>'}
        <br><span class="small">Lv${p.level} · ${p.tier || p.type} · 战力 ${st.power}</span>`;
      el.appendChild(info);
      el.onclick = () => { state.petIdx = i; renderPet(); };
      list.appendChild(el);
    });

    const st = TSQ.Pet.stats(pet);
    const spTip = (pet.fighting && TSQ.Spirit) ? (() => {
      const curSp = TSQ.Spirit.currentSpirit(h);
      if (!curSp) return "";
      const pb = TSQ.Spirit.petBonus(h, pet);
      return `<div class="spirit-pet-tip mt4 small" style="color:#00cec9">🧚 出战宠享【${curSp.name}】加成：物攻/法攻 +${pb.flat.patk}、速度 +${pb.flat.spd}、生命 +${pb.flat.hp}</div>`;
    })() : "";
    $("#p-carry").textContent = pet.fighting ? "休息" : "携带出战";
    $("#pet-head").innerHTML = `
      <span class="pet-badge ${pet.fighting ? "on" : "off"}">${pet.fighting ? "出战中" : "休息中"}</span>
      <span class="small">生命 ${st.curHp}/${st.maxHp}　物攻 ${st.patk}　法攻 ${st.matk}　速度 ${st.spd}</span>
      ${spTip}`;

    $("#pet-left").innerHTML = `
      <div class="attr-row"><span class="lab">等级</span><span class="num">${pet.level}</span></div>
      <div class="attr-row"><span class="lab">成长</span><span class="num" style="width:auto">${D().growthRates[pet.growth].name}</span></div>
      <div class="attr-row"><span class="lab">忠诚</span><span class="num">${pet.loyalty}/100</span></div>
      <div class="attr-row"><span class="lab">寿命</span><span class="num" style="width:auto">${pet.life[0]}/${pet.life[1]}</span></div>
      <div class="attr-row"><span class="lab">悟性</span><span class="num">${pet.wuxing}</span></div>
      <div class="divider"></div>
      ${["str","con","agi","int","fai"].map((k) =>
        `<div class="attr-row"><span class="lab">${D().primaryNames[k]}</span><span class="num">${pet.primary[k]}</span>
         <button class="pm" data-pp="${k}">＋</button></div>`).join("")}
      <div class="small">潜力：${pet.unspent}</div>`;

    $all("[data-pp]").forEach((b) => b.onclick = () => {
      if (pet.unspent <= 0) return toast("宠物没有潜力点");
      pet.primary[b.dataset.pp]++; pet.unspent--; renderPet();
    });

    const apt = $("#apt-bars");
    TSQ.Pet.aptRows(pet).forEach((r) => {
      apt.innerHTML += `<div class="apt-row"><span>${r.name}</span>
        <div class="apt-bar"><i style="width:${r.pct}%"></i></div>
        <span>${r.cur}/${r.max}</span></div>`;
    });

    const tl = $("#pet-talents");
    const talents = TSQ.Pet.talentList(pet);
    if (!talents.length) {
      tl.innerHTML = `<div class="hint">无天赋（普通宠物有几率领悟，神兽自带天赋）</div>`;
    } else {
      // 附录 P1.3：天赋数值取自 PET_TALENT_VALUES，UI 标「(⚙暂定)」提示可替换
      talents.forEach((t) => {
        const chip = document.createElement("div");
        chip.className = "talent-chip";
        chip.innerHTML = `<b>${t.name}</b><span>${t.desc || ""} <i class="wf-flag">(⚙暂定)</i></span>`;
        chip.title = t.desc || t.name;
        tl.appendChild(chip);
      });
    }

    // v0.6：技能名解析要覆盖炼化 / 进化技能（不在 TSQ.DATA.skills 里，见 js/pet-advance.js › skillName）
    const sk = $("#pet-skills");
    const maxSlots = (TSQ.PetAdvance && TSQ.PetAdvance.CONST.refine.maxSkillSlots) || 12;
    for (let i = 0; i < maxSlots; i++) {
      const sid = pet.skills[i];
      const cell = document.createElement("div");
      cell.className = "skill-cell" + (sid ? "" : " empty");
      cell.textContent = sid ? petSkillName(sid) : "空";
      if (sid) {
        cell.title = (TSQ.PetAdvance && TSQ.PetAdvance.skillDesc(sid)) ||
          ((D().skills[sid] || {}).desc || petSkillName(sid));
        cell.onmouseenter = (e) => showTip(`<div class="t-name">${petSkillName(sid)}</div>
          <div class="t-lore">${cell.title}</div>`, e.clientX, e.clientY);
        cell.onmousemove = (e) => showTip(`<div class="t-name">${petSkillName(sid)}</div>
          <div class="t-lore">${cell.title}</div>`, e.clientX, e.clientY);
        cell.onmouseleave = hideTip;
      }
      sk.appendChild(cell);
    }
    const nd = $("#pet-neidan");
    pet.neidan.forEach((n) => {
      const cell = document.createElement("div");
      cell.className = "neidan-cell";
      if (n) { cell.style.background = n.color; cell.textContent = n.name.slice(0, 2); }
      else cell.textContent = "空";
      nd.appendChild(cell);
    });

    renderPetTab(h, pet);
    $all("[data-ptab]").forEach((t) => t.onclick = () => { state.petTab = t.dataset.ptab; renderPet(); });

    $("#p-carry").onclick = () => {
      TSQ.Pet.setFighting(h, state.petIdx);
      toast(pet.fighting ? `${pet.name} 携带出战` : `${pet.name} 转为休息`);
      refreshAll(); renderPet();
    };
    $("#p-rename").onclick = () => {
      const n = prompt("新名字：", pet.name);
      if (n && n.trim()) { pet.name = n.trim().slice(0, 8); toast("改名成功"); refreshAll(); renderPet(); }
    };
    $("#p-feed").onclick = () => {
      if (!G().useConsumable(h, "pet_food", 1)) return toast("没有宠粮");
      pet.loyalty = Math.min(100, pet.loyalty + 20);
      TSQ.Pet.heal(pet);
      toast(`${pet.name} 忠诚 +20，体力恢复`); refreshAll(); renderPet();
    };
    $("#p-release").onclick = () => {
      if (!confirm(`确定放生 ${pet.name}？`)) return;
      h.pets.splice(state.petIdx, 1);
      if (h.pets.length && !h.pets.some((p) => p.fighting)) h.pets[0].fighting = true;
      state.petIdx = 0; toast("已放生"); refreshAll(); renderPet();
    };
    $("#p-apt").onclick = () => {
      if (!G().useConsumable(h, "apt_pill", 1)) return toast("没有资质丹");
      const keys = Object.keys(pet.apt);
      const k = keys[Math.floor(Math.random() * keys.length)];
      pet.apt[k].cur = Math.min(pet.apt[k].max, pet.apt[k].cur + Math.max(2, Math.round(pet.apt[k].max * 0.01)));
      toast(`${D().primaryNames[k]}资质提升`); refreshAll(); renderPet();
    };
    const pGotoMount = $("#p-goto-mount");
    if (pGotoMount) pGotoMount.onclick = () => openModal("mount");
  }

  /* ══════════════════════════════════════════════════════════════════
     宠物养成二期 v0.6：武装 / 进化 / 炼化 / 融合 四个页签
     ══════════════════════════════════════════════════════════════════ */
  const PA = () => TSQ.PetAdvance;
  const PAD = () => TSQ.PetAdvanceData;

  // 技能名：优先炼化 / 进化技能表，再退回 TSQ.DATA.skills
  function petSkillName(sid) {
    if (!sid) return "空";
    const n = PA() && PA().skillName(sid);
    if (n) return n;
    const s = D().skills[sid];
    return s ? s.name : sid;
  }

  // 养成操作统一出口：写日志 + 提示 + 重绘宠物面板（并保存）
  function petAct(r) {
    if (r && r.msg) pushSysLog(r.msg);
    refreshAll();                      // 存档 + 重绘（含系统日志区）
    if (r && r.msg) toast(r.msg);
    renderPet();
  }

  function renderPetTab() {
    const h = state.hero;
    const box = $("#pet-tab-body");
    if (!box) return;
    const pet = h.pets[state.petIdx];
    if (!pet) { box.innerHTML = `<div class="hint">暂无宠物。</div>`; return; }
    if (!PA()) { box.innerHTML = `<div class="hint">宠物养成模块未加载。</div>`; return; }
    if (state.petTab === "武装") return renderArmTab(h, pet, box);
    if (state.petTab === "进化") return renderEvolveTab(h, pet, box);
    if (state.petTab === "炼化") return renderRefineTab(h, pet, box);
    if (state.petTab === "融合") return renderFuseTab(h, pet, box);
    if (state.petTab === "抗性") return renderResistTab(h, pet, box);
    if (state.petTab === "图鉴") return renderCodexTab(h, pet, box);
    if (state.petTab === "组合") return renderComboTab(h, pet, box);
    // 悟性：保持 v0.5 的一句占位
    box.innerHTML = `<div class="hint">当前悟性 ${pet.wuxing}。悟性影响领悟技能概率（演示占位，本轮不改）。</div>`;
  }

  /* ---------- 抗性：玄 / 毒 / 火 / 冰（接入元神·地灵数值） ---------- */
  function renderResistTab(h, pet, box) {
    const sec = G().combatStats(h);
    const xuan = ((sec.res_xuan || 0) * 100).toFixed(1) + "%";
    const du = ((sec.res_du || 0) * 100).toFixed(1) + "%";
    const huo = ((sec.res_huo || 0) * 100).toFixed(1) + "%";
    const bing = ((sec.res_bing || 0) * 100).toFixed(1) + "%";
    box.innerHTML = `<div class="hint mb8">元素抗性（已接入元神·地灵系统）。人物修炼地灵提升的四大属性减伤抗性已实时生效于战斗结算。</div>
      <div class="resist-grid">
        <div class="resist-cell"><span class="rn">玄抗减伤</span><span class="rv">${xuan}</span></div>
        <div class="resist-cell"><span class="rn">毒抗减伤</span><span class="rv">${du}</span></div>
        <div class="resist-cell"><span class="rn">火抗减伤</span><span class="rv">${huo}</span></div>
        <div class="resist-cell"><span class="rn">冰抗减伤</span><span class="rv">${bing}</span></div>
      </div>
      <div class="hint mt8">前往人物面板「元神」→「地灵」可消耗元神与银两/银票升级减伤抗性（每级 +1.5%，上限 60%）。</div>`;
  }

  /* ---------- 宠物图鉴（§6.15）：吃骑宠升图鉴等级 ---------- */
  function renderCodexTab(h, pet, box) {
    if (!TSQ.PetCodex) { box.innerHTML = `<div class="hint">宠物图鉴模块未加载。</div>`; return; }
    TSQ.PetCodex.initHero(h);
    const lv = TSQ.PetCodex.codexLevel(h);
    const maxLv = TSQ.PetCodex.CONST.CODEX_MAX_LEVEL;
    const bonusPct = (TSQ.PetCodex.codexBonusPct(h) * 100).toFixed(1);

    const ownedMounts = (h.mount && h.mount.owned) ? Object.entries(h.mount.owned) : [];

    let mountsHtml = "";
    if (ownedMounts.length === 0) {
      mountsHtml = `<div class="hint mt8">当前没有任何骑宠。可领取下方演示礼包获得测试骑宠。</div>`;
    } else {
      mountsHtml = `<div class="mt8" style="display:flex;flex-direction:column;gap:8px">` +
        ownedMounts.map(([mKey, m]) => {
          const isRiding = !!(h.mount && h.mount.riding && h.mount.current === mKey);
          const mDef = (TSQ.MountData && TSQ.MountData.mountById(m.defId)) || {};
          const name = m.name || mDef.name || mKey;
          return `
            <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <div>
                <b>${name}</b> · Lv.${m.level || 1} <span class="small" style="color:#aaa">(${mDef.category || "坐骑"})</span>
                ${isRiding ? '<span class="mount-badge on" style="margin-left:6px">当前骑乘中（不可奉献）</span>' : ''}
              </div>
              <div>
                ${isRiding ?
                  '<button class="btn tiny" disabled>骑乘中</button>' :
                  `<button class="btn tiny primary" data-codex-eat="${mKey}" ${lv >= maxLv ? 'disabled' : ''}>奉献入图鉴（+1级）</button>`
                }
              </div>
            </div>
          `;
        }).join("") +
        `</div>`;
    }

    box.innerHTML = `
      <div class="skill-top" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <div>图鉴等级：<b style="color:#f1c40f;font-size:16px">Lv.${lv}</b> / ${maxLv} 级</div>
          <div class="small" style="color:#2ecc71;margin-top:2px">全属性增幅：<b>+${bonusPct}%</b>（每级 +5‰，全属性增益进宠物属性）</div>
        </div>
        <div>
          <button class="btn tiny" id="btn-codex-demo" ${h.flags.petComboClaimed ? 'disabled' : ''}>
            ${h.flags.petComboClaimed ? '演示礼包已领取' : '⚙ 演示礼包：领取组合与图鉴宠物'}
          </button>
        </div>
      </div>
      <div class="hint mt8">规则（§6.15）：吃掉 1 只骑宠图鉴等级 +1，上限 48 级满级。从骑宠列表选非当前骑乘的奉献，当前宠物全属性按千分比获得大幅提升！</div>
      <div class="mt12"><b>拥有骑宠清单（选择非骑乘骑宠献祭）：</b></div>
      ${mountsHtml}
    `;

    $all("[data-codex-eat]", box).forEach((btn) => {
      btn.onclick = () => {
        const mKey = btn.dataset.codexEat;
        const r = TSQ.PetCodex.eatMount(h, mKey);
        if (r && r.msg) {
          pushSysLog(r.msg);
          toast(r.msg);
        }
        refreshAll();
        renderPet();
      };
    });

    const bDemo = $("#btn-codex-demo", box);
    if (bDemo) {
      bDemo.onclick = () => {
        const r = TSQ.PetCodex.claimDemoPack(h);
        if (r && r.msg) {
          pushSysLog(r.msg);
          toast(r.msg);
        }
        refreshAll();
        renderPet();
      };
    }
  }

  /* ---------- 宠物组合（§6.15）：集齐指定宠物吃掉达成组合 ---------- */
  function renderComboTab(h, pet, box) {
    if (!TSQ.PetCodex) { box.innerHTML = `<div class="hint">宠物组合模块未加载。</div>`; return; }
    TSQ.PetCodex.initHero(h);
    const combos = TSQ.PetCodex.CONST.COMBOS;

    const combosHtml = combos.map((cb) => {
      const cbState = h.petCombos[cb.id] || { collected: {}, activated: false };
      const bonusStr = Object.entries(cb.bonus).map(([k, v]) => {
        const n = D().secondaryNames[k] || TSQ.EQ.statNames[k] || k;
        return `${n} +${v}`;
      }).join("、");

      const reqChips = cb.required.map((req) => {
        const isDone = !!cbState.collected[req.species];
        if (isDone) {
          return `
            <div class="combo-req-chip done">
              <span>✓ <b>${req.name}</b> (已献祭)</span>
            </div>
          `;
        }

        const cand = (h.pets || []).find((p) => p.species === req.species && !p.fighting);
        const fightingOne = (h.pets || []).find((p) => p.species === req.species && p.fighting);

        let actHtml = "";
        if (cand) {
          actHtml = `<button class="btn tiny primary" data-combo-eat="${cand.uid}" data-combo-id="${cb.id}">献祭【${cand.name}】</button>`;
        } else if (fightingOne) {
          actHtml = `<span class="small" style="color:#e74c3c">出战中不可献祭</span>`;
        } else {
          actHtml = `<span class="small" style="color:#888">未持有</span>`;
        }

        return `
          <div class="combo-req-chip">
            <span><b>${req.name}</b></span>
            ${actHtml}
          </div>
        `;
      }).join("");

      return `
        <div class="combo-card ${cbState.activated ? 'activated' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <span style="font-size:15px;font-weight:bold;color:#f1c40f">${cb.name}</span>
              <span class="small" style="color:#2ecc71;margin-left:8px;font-weight:bold">【加成：${bonusStr}】</span>
            </div>
            <div>
              ${cbState.activated ?
                '<span class="mount-badge on">✓ 组合已激活（属性已生效）</span>' :
                '<span class="mount-badge off">组合收集中</span>'
              }
            </div>
          </div>
          <div class="small" style="color:#bbb">${cb.desc}</div>
          <div class="combo-req-grid mt4">
            ${reqChips}
          </div>
        </div>
      `;
    }).join("");

    box.innerHTML = `
      <div class="skill-top" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <b>宠物组合（§6.15）</b>
          <div class="small" style="color:#aaa;margin-top:2px">吃掉指定宠物达成组合，集齐后永久加成当前宠物属性！</div>
        </div>
        <div>
          <button class="btn tiny" id="btn-combo-demo" ${h.flags.petComboClaimed ? 'disabled' : ''}>
            ${h.flags.petComboClaimed ? '演示礼包已领取' : '⚙ 演示礼包：领取组合与图鉴宠物'}
          </button>
        </div>
      </div>
      <div class="mt12">
        ${combosHtml}
      </div>
    `;

    $all("[data-combo-eat]", box).forEach((btn) => {
      btn.onclick = () => {
        const pUid = btn.dataset.comboEat;
        const cbId = btn.dataset.comboId;
        const r = TSQ.PetCodex.eatPetForCombo(h, cbId, pUid);
        if (r && r.msg) {
          pushSysLog(r.msg);
          toast(r.msg);
        }
        refreshAll();
        renderPet();
      };
    });

    const bDemo = $("#btn-combo-demo", box);
    if (bDemo) {
      bDemo.onclick = () => {
        const r = TSQ.PetCodex.claimDemoPack(h);
        if (r && r.msg) {
          pushSysLog(r.msg);
          toast(r.msg);
        }
        refreshAll();
        renderPet();
      };
    }
  }

  /* ---------- 武装（§6.13）：9 格 + 材料背包 ---------- */
  function renderArmTab(h, pet, box) {
    const A = PA(), AD = PAD();
    const slots = A.armSlots(pet);
    const qOpts = (sel) => AD.ARM_QUALITY.map((q) =>
      `<option value="${q.id}" ${sel === q.id ? "selected" : ""}>${q.name}</option>`).join("");
    const cell = (s) => {
      const q = s.active ? A.qualityMeta(s.quality) : null;
      const pct = s.active && s.durMax ? Math.round((s.dur / s.durMax) * 100) : 0;
      const statTxt = s.stats.map((x) => `${x.name}+${x.value}`).join("　");
      return `<div class="arm-cell ${s.active ? "on" : "off"}" data-arm="${s.def.id}">
        <div class="arm-top"><b>${s.def.name}</b>${q ? `<i class="q-dot" style="background:${q.color}"></i><span class="small" style="color:${q.color}">${q.name}</span>` : `<span class="small">未激活</span>`}</div>
        <div class="small arm-stat">${statTxt}</div>
        <div class="dur-bar"><i style="width:${pct}%"></i></div>
        <div class="small">耐久 ${s.active ? `${s.dur}/${s.durMax}` : "—"}${s.broken ? ' <span style="color:#a22">已损坏</span>' : ""}</div>
        <div class="arm-acts">
          ${s.active
            ? `<button class="btn tiny" data-a="repair" data-id="${s.def.id}">修理</button>
               <button class="btn tiny danger" data-a="off" data-id="${s.def.id}">卸下</button>`
            : `<select class="qsel" data-q="${s.def.id}">${qOpts(state.petAdv.armQuality[s.def.id] || "white")}</select>
               <button class="btn tiny primary" data-a="on" data-id="${s.def.id}">激活</button>`}
        </div>
      </div>`;
    };
    const groups = AD.ARM_CLASSES.map((c) => `
      <div class="arm-group">
        <div class="arm-group-t">${c.name}</div>
        <div class="arm-row">${slots.filter((s) => s.def.cat === c.id).map(cell).join("")}</div>
      </div>`).join("");

    box.innerHTML = `
      <div class="hint mb8">武装 9 件 × 3 类（§6.13）。激活消耗同品质「武装精铁」×1；耐久归零后属性失效，修理可复原。</div>
      <div class="mat-bar">
        ${AD.ARM_MATS.map((m) => `<span class="pa-chip" title="${m.desc}">${m.name}×${A.itemCount(h, m.id)}</span>`).join("")}
        <span class="grow"></span>
        <select id="arm-synth-q">${AD.ARM_QUALITY.slice(1).map((q) =>
          `<option value="${q.id}">${q.name}</option>`).join("")}</select>
        <button class="btn tiny" id="arm-synth">合成</button>
      </div>
      ${groups}
      <div class="hint mt8">合成：3 份低一档 → 1 份高一档，成功率 绿→蓝 90% / 蓝→紫 75% / 紫→橙 50%（规格给定）。</div>`;

    // 悬停显示属性与耐久
    $all("[data-arm]", box).forEach((el) => {
      const s = slots.find((x) => x.def.id === el.dataset.arm);
      if (!s) return;
      const q = s.active ? A.qualityMeta(s.quality) : A.qualityMeta("white");
      const tip = `<div class="t-name">${s.def.name}${s.active ? `·${q.name}` : "（未激活）"}</div>
        <div class="t-tag">${AD.ARM_CLASSES.find((c) => c.id === s.def.cat).name}类武装</div>
        <div class="t-stat">${s.stats.map((x) => `${x.name} +${x.value}`).join("<br>")}</div>
        <div class="t-lore">耐久 ${s.active ? `${s.dur}/${s.durMax}` : "未激活"}${s.active ? `（当前为 ${q.name}品质基准）` : "（显示为白品质基准）"}</div>`;
      el.onmouseenter = (e) => showTip(tip, e.clientX, e.clientY);
      el.onmousemove = (e) => showTip(tip, e.clientX, e.clientY);
      el.onmouseleave = hideTip;
    });
    $all("[data-q]", box).forEach((sel) => sel.onchange = () => {
      state.petAdv.armQuality[sel.dataset.q] = sel.value;
    });
    $all("[data-a]", box).forEach((b) => b.onclick = () => {
      const id = b.dataset.id, act = b.dataset.a;
      let r;
      if (act === "on") r = A.activateArm(h, pet, id, state.petAdv.armQuality[id] || "white");
      else if (act === "off") r = A.deactivateArm(h, pet, id);
      else r = A.repairArm(h, pet, id);
      hideTip(); petAct(r);
    });
    const sb = $("#arm-synth", box);
    if (sb) sb.onclick = () => petAct(A.synthArmMaterial(h, $("#arm-synth-q", box).value));
  }

  /* ---------- 进化（§6.7） ---------- */
  function renderEvolveTab(h, pet, box) {
    const A = PA(), AD = PAD(), K = A.CONST.evolve;
    const st = state.petAdv;
    st.same = Math.min(st.same, K.maxAssist);
    const pv = A.previewEvolve(h, pet, { same: st.same, other: st.other, goldStep: st.goldStep });
    const evoSkills = (pet.evolveSkills || []).map((id) => A.skillName(id) || id);
    const aptTxt = Object.entries(pv.aptGain).filter(([, v]) => v > 0)
      .map(([k, v]) => `${D().primaryNames[k]}+${v}`).join("　") || "（先放入辅助宠券）";
    const stepper = (key, val, max, label) => `
      <div class="evo-row">
        <span class="el">${label}</span>
        <button class="pm" data-evo="${key}" data-d="-1">−</button>
        <span class="ev">${val}</span>
        <button class="pm" data-evo="${key}" data-d="1">＋</button>
        <span class="small">（持有 ${max}）</span>
      </div>`;

    box.innerHTML = `
      <div class="evo-head">
        <span>进化等级 <b>${pet.evolveLv || 0}</b> / ${K.maxLv}</span>
        <span class="grow"></span>
        <span class="small">已解锁：${evoSkills.length ? evoSkills.join("、") : "无"}</span>
      </div>
      ${stepper("same", Math.min(st.same, pv.availSame), pv.availSame, `同系券（${pv.sameCouponName}）`)}
      ${stepper("other", Math.min(st.other, pv.availOther), pv.availOther, "异系辅宠券")}
      <div class="evo-row">
        <span class="el">投入金子</span>
        <input type="range" id="evo-gold" min="0" max="${K.goldMaxStep}" step="1" value="${st.goldStep}" style="flex:1">
        <span class="ev" id="evo-gold-txt">${pv.gold} 两金（+${Math.round(st.goldStep * K.goldPerStep * 100)}%）</span>
        <span class="small">持有 ${h.gold || 0}</span>
      </div>
      <div class="evo-row">
        <span class="el">成功率</span>
        <span class="rate-big" id="evo-rate">${Math.round(pv.rate * 100)}%</span>
        <span class="small">消耗：进化之灵×${K.spiritCost}（持有 ${A.itemCount(h, "evolve_spirit")}）</span>
        <span class="grow"></span>
        <button class="btn small primary" id="evo-go" ${pv.ok ? "" : "disabled"}>进化</button>
      </div>
      <div class="small mt8">资质奖励（辅宠该项资质 ×1%，取最高）：<span class="val">${aptTxt}</span></div>
      <div class="small">${pv.nextUnlock ? `进化到 ${(pet.evolveLv || 0) + 1} 级将解锁【${pv.nextUnlock.name}】` : "无新的解锁档位"}</div>
      ${pv.lacks.length ? `<div class="small" style="color:#a22">${pv.lacks.join("、")}</div>` : ""}
      <div class="hint mt8">成功率 = 基础 ${Math.round(K.base * 100)}% + 同系 +8%/只 + 异系 +5%/只 + 金子每 ${K.goldStep} 两 +${Math.round(K.goldPerStep * 100)}%，上限 ${Math.round(K.cap * 100)}%（⚙ 默认基础档）。失败时辅宠与进化之灵同样消耗。</div>`;

    $all("[data-evo]", box).forEach((b) => b.onclick = () => {
      const d = +b.dataset.d;
      if (b.dataset.evo === "same") st.same = Math.max(0, Math.min(K.maxAssist, st.same + d));
      else st.other = Math.max(0, Math.min(K.maxAssist, st.other + d));
      renderPetTab();
    });
    const gs = $("#evo-gold", box);
    gs.oninput = () => {
      st.goldStep = +gs.value;
      const p2 = A.previewEvolve(h, pet, { same: st.same, other: st.other, goldStep: st.goldStep });
      $("#evo-gold-txt", box).textContent = `${p2.gold} 两金（+${Math.round(st.goldStep * K.goldPerStep * 100)}%）`;
      $("#evo-rate", box).textContent = Math.round(p2.rate * 100) + "%";
      $("#evo-go", box).disabled = !p2.ok;
    };
    $("#evo-go", box).onclick = () => petAct(A.doEvolve(h, pet, { same: st.same, other: st.other, goldStep: st.goldStep }));
  }

  /* ---------- 炼化（§6.6） ---------- */
  function renderRefineTab(h, pet, box) {
    const A = PA(), AD = PAD(), K = A.CONST.refine;
    const st = state.petAdv;
    const node = AD.REFINE_NODES[st.refineNode] || AD.REFINE_NODES.jianzhuang;
    const rate = A.extractRate(node, st.useKaishi);
    // 源宠默认选「会这个技能」的那只，省得用户自己找
    if (!(h.pets[st.srcPetIdx] && (h.pets[st.srcPetIdx].skills || []).includes(node.id))) {
      const i = h.pets.findIndex((p) => (p.skills || []).includes(node.id));
      if (i >= 0) st.srcPetIdx = i;
    }
    const srcPet = h.pets[st.srcPetIdx] || h.pets[0];
    const canExtract = srcPet && (srcPet.skills || []).includes(node.id);
    const anyKnows = h.pets.some((p) => (p.skills || []).includes(node.id));
    const codexNeed = (node.lv || 1) >= K.codexFromLv;
    const myRefine = Object.entries(pet.refineSkills || {}).map(([id, lv]) =>
      `${A.skillName(id)}·${lv}级${A.effectText(AD.REFINE_NODES[id], lv)}`).join("　") || "（未学习）";
    const manuals = h.refineManuals || [];
    if (st.manualIdx >= manuals.length) st.manualIdx = 0;
    const m = manuals[st.manualIdx];
    const mNode = m ? AD.REFINE_NODES[m.nodeId] : null;
    const preName = mNode && mNode.pre ? (A.skillName(mNode.pre) || mNode.pre) : null;
    const hasPre = mNode ? (!mNode.pre || (pet.skills || []).includes(mNode.pre)) : false;

    const chainHTML = AD.REFINE_CHAINS.map((c) => `
      <div class="chain">
        <div class="chain-t">${c.name}</div>
        <div class="chain-nodes">${c.nodes.map((id) => {
          const n = AD.REFINE_NODES[id];
          return `<span class="node-chip ${st.refineNode === id ? "sel" : ""}" data-node="${id}"
            title="${n.desc}｜抽取成功率 ${Math.round(A.extractRate(n, false) * 100)}%">${n.name}<i>${n.lv}</i></span>`;
        }).join('<span class="arrow">→</span>')}</div>
      </div>`).join("");

    box.innerHTML = `
      <div class="refine-layout">
        <div class="refine-left">
          <div class="pa-sec">可选炼化链（${AD.REFINE_CHAINS.length} 条）</div>
          ${chainHTML}
          <div class="hint mt8">点击节点选中；链内后者需要前者作为前置技能。</div>
        </div>
        <div class="refine-right">
          <div class="pa-sec">抽取（源宠 → 密录）</div>
          <div class="evo-row">
            <span class="el">源宠</span>
            <select id="rf-src">${h.pets.map((p, i) =>
              `<option value="${i}" ${i === st.srcPetIdx ? "selected" : ""}>${p.name}（${(p.skills || []).includes(node.id) ? "会" : "不会"}【${node.name}】）</option>`).join("")}</select>
          </div>
          <div class="small">目标技能：<b>${node.name}</b>·${node.lv} 级　成功率 <b>${Math.round(rate * 100)}%</b>
            （1 级 80%，每高一级 −10%）</div>
          <div class="small">消耗：空白万兽密录×1（持有 ${A.itemCount(h, "blank_manual")}）
            ${codexNeed ? `　万兽宝鉴×1（持有 ${A.itemCount(h, "beast_codex")}）` : ""}</div>
          <label class="chk"><input type="checkbox" id="rf-kaishi" ${st.useKaishi ? "checked" : ""}>使用开示丹（持有 ${A.itemCount(h, "kaishi_dan")}）：成功率 +${Math.round(K.kaishiBonus * 100)}%</label>
          <button class="btn small primary mt8" id="rf-extract" ${canExtract ? "" : "disabled"}>抽取密录</button>
          ${canExtract ? "" : `<span class="small" style="color:#a22">${anyKnows ? "请在上面选择会该技能的源宠" : "没有任何宠物会【${node.name}】，无法抽取"}</span>`}
          <div class="divider"></div>
          <div class="pa-sec">学习（密录 → 目标宠 ${pet.name}）</div>
          ${manuals.length
            ? `<select id="rf-manual">${manuals.map((x, i) =>
                `<option value="${i}" ${i === st.manualIdx ? "selected" : ""}>${A.manualName(x)}</option>`).join("")}</select>
               <div class="small">前置：${mNode ? (preName ? `需已会【${preName}】${hasPre ? "✓" : "✗"}` : "无") : "—"}
                 ${mNode ? `　效果：${A.effectText(mNode, mNode.lv)}` : ""}</div>
               <button class="btn small primary mt8" id="rf-learn" ${hasPre ? "" : "disabled"}>给 ${pet.name} 学习</button>`
            : `<div class="hint">密录背包为空。先从会对应技能的源宠抽取。</div>`}
          <div class="divider"></div>
          <div class="pa-sec">${pet.name} 已学炼化技能</div>
          <div class="small">${myRefine}</div>
        </div>
      </div>
      <div class="hint mt8">成品属性：丹药健体 +830×Lv 生命、天神祝福 +2500×Lv 生命（规格给定）；其余为 ⚙ 默认简化值。技能格满 ${K.maxSkillSlots} 格时提示无法学习。</div>`;

    $all("[data-node]", box).forEach((el) => el.onclick = () => { st.refineNode = el.dataset.node; renderPetTab(); });
    $("#rf-src", box).onchange = (e) => { st.srcPetIdx = +e.target.value; renderPetTab(); };
    const kk = $("#rf-kaishi", box);
    kk.onchange = () => { st.useKaishi = kk.checked; renderPetTab(); };
    $("#rf-extract", box).onclick = () => petAct(A.extractRefine(h, h.pets[st.srcPetIdx], node.id, st.useKaishi));
    const ms = $("#rf-manual", box);
    if (ms) ms.onchange = (e) => { st.manualIdx = +e.target.value; renderPetTab(); };
    const lb = $("#rf-learn", box);
    if (lb) lb.onclick = () => petAct(A.applyRefine(h, pet, st.manualIdx));
  }

  /* ---------- 融合（§6.11） ---------- */
  function renderFuseTab(h, pet, box) {
    const A = PA(), AD = PAD(), K = A.CONST.fuse;
    const st = state.petAdv;
    // 同种副宠（技能栏已清空）
    const subs = h.pets.filter((p) => p !== pet && p.species === pet.species);
    if (!subs.some((p) => p.uid === st.subPetUid)) st.subPetUid = subs.length ? subs[0].uid : "";
    const sub = subs.find((p) => p.uid === st.subPetUid) || null;
    const pv = A.previewFuse(h, pet, sub, st.fuseMode);
    const gainTxt = Object.entries(pv.gain).filter(([, v]) => v > 0)
      .map(([k, v]) => `${D().primaryNames[k]}+${v}`).join("　") || "—";

    box.innerHTML = `
      <div class="fuse-head">
        <span>主宠：<b>${pet.name}</b></span>
        <span class="small">飞升 ${pet.flags && pet.flags.feisheng ? "✓" : "✗"}　已融合 ${pet.fuseCount || 0}/${K.maxCount} 次</span>
        <span class="grow"></span>
        <span class="small">金子 ${h.gold || 0}　银两 ${h.silver || 0}</span>
      </div>
      <div class="evo-row">
        <span class="el">副宠</span>
        <select id="fu-sub">
          ${subs.length ? subs.map((p) => `<option value="${p.uid}" ${p.uid === st.subPetUid ? "selected" : ""}>
            ${p.name}（技能 ${(p.skills || []).length} 个）</option>`).join("")
            : `<option value="">无同种副宠</option>`}
        </select>
        <button class="btn tiny" id="fu-clear" ${sub && (sub.skills || []).length ? "" : "disabled"}>清空副宠技能</button>
      </div>
      <div class="evo-row">
        <span class="el">方式</span>
        ${AD.FUSE_MODES.map((m) => `<label class="chk"><input type="radio" name="fumode" value="${m.id}" ${st.fuseMode === m.id ? "checked" : ""}>${m.name}（${m.cost}，约 ${Math.round(m.rate * 100)}%）</label>`).join("")}
      </div>
      <div class="evo-row">
        <span class="el">成功率</span>
        <span class="rate-big">${Math.round(pv.rate * 100)}%</span>
        <span class="grow"></span>
        <button class="btn small primary" id="fu-go" ${pv.ok ? "" : "disabled"}>融合</button>
      </div>
      <div class="small mt8">成功资质加成（副宠对应资质 ×5%）：<span class="val">${gainTxt}</span></div>
      ${pv.lacks.length ? `<div class="small" style="color:#a22">${pv.lacks.join("、")}</div>` : ""}
      <div class="hint mt8">条件：主宠已飞升（本轮不实装飞升 UI，演示宠「星澜飞骥」已预置标记）+ 副宠同种且技能栏已清空 + 每只主宠最多 ${K.maxCount} 次。失败时副宠同样消失。</div>`;

    const ss = $("#fu-sub", box);
    if (ss) ss.onchange = (e) => { st.subPetUid = e.target.value; renderPetTab(); };
    $all("input[name=fumode]", box).forEach((r) => r.onchange = () => { st.fuseMode = r.value; renderPetTab(); });
    const cb = $("#fu-clear", box);
    if (cb) cb.onclick = () => {
      if (!sub) return;
      if (!confirm(`清空 ${sub.name} 的全部技能？该操作不可撤销。`)) return;
      sub.skills = [];
      pushSysLog(`${sub.name} 的技能栏已清空（融合前置）`);
      refreshAll(); renderPet();
    };
    $("#fu-go", box).onclick = () => {
      if (!pv.ok) return;
      if (!confirm(`融合后副宠 ${sub.name} 将消失（无论成败），确定？`)) return;
      petAct(A.doFuse(h, pet, sub, st.fuseMode));
    };
  }

  /* ══════════════════════════════════════════════════════════════════
     骑宠 / 兽魂 面板（v1.0）
     ══════════════════════════════════════════════════════════════════ */
  function renderMount() {
    const h = state.hero;
    if (!TSQ.Mount) return;
    TSQ.Mount.initHero(h);

    const M = TSQ.Mount, MD = TSQ.MountData, K = MD.CONST;
    const body = $("#mount-body");
    if (!body) return;

    state.mountTab = state.mountTab || "骑宠契约";
    const tabs = ["骑宠契约", "兽魂系统", "神仙感应", "骑宠技能"];
    let tabHtml = `<div class="tabs">${tabs.map((t) =>
      `<div class="tab ${state.mountTab === t ? "active" : ""}" data-mtab="${t}">${t}</div>`
    ).join("")}</div>`;

    const cur = M.currentMount(h);
    if (!cur) {
      body.innerHTML = tabHtml + `<div class="modal-body"><div class="hint">未拥有任何骑宠。</div></div>`;
      return;
    }

    const { primary: mountPri, contractBonus, soulStats } = M.mountStats(h, cur);
    const isRiding = !!(h.mount && h.mount.riding);
    const def = MD.mountById(cur.defId) || MD.MOUNTS[0];

    if (state.mountTab === "骑宠契约") {
      let ownedListHtml = Object.values(h.mount.owned || {}).map((m) => {
        const isCur = m.defId === cur.defId;
        const mDef = MD.mountById(m.defId) || m;
        return `<div class="item ${isCur ? "active" : ""}" data-sel-mount="${m.defId}">
          <div class="thumb">${mDef.doodle || "🐎"}</div>
          <div style="flex:1">
            <div><b>${m.name}</b> <span class="mount-badge ${isRiding && isCur ? "on" : "off"}">${isRiding && isCur ? "出战中" : "休息"}</span></div>
            <div class="small" style="color:#aaa">Lv.${m.level} · 忠诚 ${m.loyalty} · 潜力 ${m.unspent}</div>
          </div>
        </div>`;
      }).join("");

      // 未拥有的演示骑宠（可一键认主领养）
      const unownedDefs = MD.MOUNTS.filter((d) => !h.mount.owned[d.id]);
      let adoptBtns = unownedDefs.map((d) =>
        `<button class="btn tiny" data-adopt-mount="${d.id}">认主【${d.name}】</button>`
      ).join(" ");

      body.innerHTML = tabHtml + `<div class="modal-body mount-layout">
        <!-- 左列：骑宠列表与当前属性 -->
        <div class="mount-col">
          <div class="mount-art-box">
            <div class="mount-art-fallback">${def.doodle || "🐎"}</div>
            <div class="mount-caption">
              <span><b>${cur.name}</b> (${def.category || "御行灵兽"})</span>
              <span class="mount-badge ${isRiding ? "on" : "off"}">${isRiding ? "出战骑乘中" : "步行休息中"}</span>
            </div>
          </div>

          <div>
            <div class="small mb4"><b>已拥有的骑宠列表（点击切换）：</b></div>
            <div class="mount-list">${ownedListHtml}</div>
          </div>

          ${unownedDefs.length ? `
            <div class="flex items-center gap4 flex-wrap">
              <span class="small">可认主演示骑宠：</span>
              ${adoptBtns}
            </div>
          ` : ""}

          <!-- 骑宠主要动作 -->
          <div class="flex gap4 flex-wrap mt4">
            <button class="btn small ${isRiding ? "danger" : "primary"}" id="m-toggle-ride">${isRiding ? "收起下骑" : "翻身骑乘"}</button>
            <button class="btn small" id="m-rename">改名</button>
            <button class="btn small" id="m-feed">喂养忠诚 (+20)</button>
            <button class="btn tiny" id="m-subloy" title="测试喂养功能">忠诚-15</button>
          </div>

          <!-- 骑宠属性数值 -->
          <div class="attr-box mt8">
            <div class="attr-row"><span class="lab">成熟等级</span><span class="num">Lv.${cur.level}</span></div>
            <div class="attr-row"><span class="lab">成熟经验</span><span class="num" style="width:auto">${cur.exp} / ${cur.expNeed}</span></div>
            <div class="attr-row"><span class="lab">携带等级</span><span class="num">${cur.reqLevel} 级</span></div>
            <div class="attr-row"><span class="lab">忠诚度</span><span class="num">${cur.loyalty} / 100</span></div>
            <div class="attr-row"><span class="lab">亲密度</span><span class="num">${cur.intimacy} / 1000</span></div>
            <div class="divider"></div>
            <div class="flex"><span class="small"><b>一级属性</b>（点 ＋ 分配潜力）</span><span class="grow"></span><span class="small">潜力点：<b style="color:#ffd23a">${cur.unspent}</b></span></div>
            ${["str", "con", "agi", "int", "fai"].map((k) => {
              const baseV = cur.primary[k] || 0;
              const petV = (contractBonus && contractBonus[k]) || 0;
              const soulV = (soulStats && soulStats[k]) || 0;
              const totalV = mountPri[k] || 0;
              const toHero = Math.round(totalV * K.PLAYER_PRIMARY_BONUS_RATIO);
              return `<div class="attr-row">
                <span class="lab">${D().primaryNames[k]}</span>
                <span class="num" style="width:auto">${baseV}${petV ? `<span style="color:#2ecc71;font-size:10px">+契${petV}</span>` : ""}${soulV ? `<span style="color:#9b59b6;font-size:10px">+魂${soulV}</span>` : ""} (共${totalV})</span>
                <span class="delta" style="font-size:10px;color:#ffd23a">→人+${toHero}</span>
                <button class="pm" data-mpot="${k}">＋</button>
              </div>`;
            }).join("")}
            <div class="hint small mt4" style="color:#2ecc71">⭐ 骑乘出战时，骑宠一级属性 ×5% 进人物 combatStats。</div>
          </div>
        </div>

        <!-- 右列：战宠契约与经验分流 -->
        <div class="mount-col">
          <div class="panel-title" style="border-radius:4px">
            <span>战宠契约 (已签 ${cur.contracts.length} / ${K.CONTRACT_MAX} 只)</span>
            <span class="small" style="font-weight:normal">契约宠 10% 一级属性转化给骑宠</span>
          </div>

          <div class="hint">
            骑宠最多与 <b>${K.CONTRACT_MAX} 只</b>已绑定参战宠签订灵犀契约。契约宠 5 项一级属性的 10% 加给骑宠；契约宠获得的经验 <b>100% 分流</b>给骑宠！
          </div>

          <!-- 契约经验分流演示区 -->
          <div style="background:rgba(46,204,113,0.1);border:1px dashed #2ecc71;border-radius:6px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
            <div>
              <b style="color:#2ecc71">★ 契约经验分流演示</b>
              <div class="small">模拟参战契约宠在战斗中获得经验，经验 100% 全部分流给骑宠升级！</div>
            </div>
            <div class="flex gap6">
              <button class="btn small primary" id="m-divert-500" ${cur.contracts.length === 0 ? "disabled" : ""}>分流 500 经验</button>
              <button class="btn small" id="m-divert-2000" ${cur.contracts.length === 0 ? "disabled" : ""}>分流 2000 经验</button>
            </div>
          </div>

          <!-- 英雄拥有的战宠列表，可签/解除契约 -->
          <div class="small mt4"><b>我的战宠（选择签约）：</b></div>
          <div style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
            ${(h.pets || []).length === 0 ? `<div class="hint">暂无宠物。</div>` : (h.pets || []).map((p) => {
              const isContracted = cur.contracts.includes(p.uid);
              const canContract = cur.contracts.length < K.CONTRACT_MAX;
              const bonusStr = ["str", "con", "agi", "int", "fai"]
                .map((k) => `${D().primaryNames[k]}+${Math.round((p.primary[k] || 0) * K.CONTRACT_PRIMARY_BONUS_RATIO)}`)
                .join(" ");
              return `<div class="contract-card ${isContracted ? "active" : ""}">
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="font-size:24px">${p.doodle || "宠"}</div>
                  <div>
                    <div><b>${p.name}</b> <span class="pet-badge">${p.tier || p.type}</span> Lv.${p.level} ${p.fighting ? '<span class="pet-badge on">参战</span>' : ""}</div>
                    <div class="small" style="color:#aaa">10%属性转化：${bonusStr}</div>
                  </div>
                </div>
                <div>
                  ${isContracted
                    ? `<button class="btn small danger" data-uncontract="${p.uid}">解除契约</button>`
                    : `<button class="btn small primary" data-contract="${p.uid}" ${canContract ? "" : "disabled"}>${canContract ? "签订契约" : "契约已满"}</button>`
                  }
                </div>
              </div>`;
            }).join("")}
          </div>
        </div>
      </div>`;

      // 绑定骑宠页事件
      $all("[data-sel-mount]").forEach((el) => {
        el.onclick = () => { M.selectMount(h, el.dataset.selMount); refreshAll(); renderMount(); };
      });
      $all("[data-adopt-mount]").forEach((b) => {
        b.onclick = () => { const r = M.adoptMount(h, b.dataset.adoptMount); if (r.msg) toast(r.msg); refreshAll(); renderMount(); };
      });
      $("#m-toggle-ride").onclick = () => {
        const r = M.toggleRiding(h);
        if (r.msg) toast(r.msg);
        refreshAll(); renderMount();
      };
      $("#m-rename").onclick = () => {
        const name = prompt("请输入骑宠新名称：", cur.name);
        if (name && name.trim()) {
          const r = M.renameMount(h, cur.defId, name);
          if (r.msg) toast(r.msg);
          refreshAll(); renderMount();
        }
      };
      $("#m-feed").onclick = () => {
        const r = M.feedLoyalty(h, cur.defId);
        if (r.msg) toast(r.msg);
        refreshAll(); renderMount();
      };
      $("#m-subloy").onclick = () => {
        const r = M.reduceLoyalty(h, cur.defId, 15);
        if (r.msg) toast(r.msg);
        refreshAll(); renderMount();
      };
      $all("[data-mpot]").forEach((b) => {
        b.onclick = () => {
          const r = M.addPotential(h, cur.defId, b.dataset.mpot);
          if (r.msg) toast(r.msg);
          refreshAll(); renderMount();
        };
      });
      $all("[data-contract]").forEach((b) => {
        b.onclick = () => {
          const r = M.contractPet(h, cur.defId, b.dataset.contract);
          if (r.msg) toast(r.msg);
          refreshAll(); renderMount();
        };
      });
      $all("[data-uncontract]").forEach((b) => {
        b.onclick = () => {
          const r = M.uncontractPet(h, cur.defId, b.dataset.uncontract);
          if (r.msg) toast(r.msg);
          refreshAll(); renderMount();
        };
      });
      const bDivert500 = $("#m-divert-500");
      if (bDivert500) bDivert500.onclick = () => {
        const r = M.divertExp(h, cur.defId, 500);
        if (r.msg) toast(r.msg);
        refreshAll(); renderMount();
      };
      const bDivert2000 = $("#m-divert-2000");
      if (bDivert2000) bDivert2000.onclick = () => {
        const r = M.divertExp(h, cur.defId, 2000);
        if (r.msg) toast(r.msg);
        refreshAll(); renderMount();
      };
    } else if (state.mountTab === "兽魂系统") {
      const eqSoul = cur.soul;
      let eqSoulProps = "";
      if (eqSoul) {
        const sDef = MD.soulDefById(eqSoul.defId);
        if (sDef && typeof sDef.stats === "function") {
          const st = sDef.stats(eqSoul.lv);
          eqSoulProps = Object.entries(st)
            .map(([k, v]) => `${TSQ.EQ.statNames[k] || D().primaryNames[k] || k} +${v}`)
            .join("　");
        }
      }

      body.innerHTML = tabHtml + `<div class="modal-body">
        <div class="panel-title" style="border-radius:4px">当前骑宠【${cur.name}】装备的兽魂（每骑可装备 1 个）</div>
        <div class="soul-equipped-box">
          ${eqSoul ? `
            <div class="soul-slot-item">
              <div class="soul-icon soul-q-${eqSoul.quality}">魂</div>
              <div style="flex:1">
                <div style="font-size:15px;font-weight:bold;color:${eqSoul.color}">
                  【${eqSoul.quality}·${eqSoul.name}】 Lv.${eqSoul.lv} / ${K.MAX_SOUL_LEVEL}
                </div>
                <div class="small mb4">升级进度：${eqSoul.lv >= K.MAX_SOUL_LEVEL ? '<b style="color:#2ecc71">已臻化境（最高 10 级 MAX）</b>' : `${eqSoul.exp} / ${K.SOUL_EXP_NEED(eqSoul.lv)}`}</div>
                <div class="small" style="color:#ffd23a">
                  附加属性：${eqSoulProps || "无"}
                </div>
              </div>
              <div class="flex gap6">
                <button class="btn small danger" id="m-unequip-soul">卸下兽魂</button>
              </div>
            </div>
          ` : `
            <div style="text-align:center;padding:16px;color:#aaa">
              <span>【当前骑宠尚未装备兽魂】</span>
              <div class="small mt4">从下方兽魂仓库中选择一颗兽魂，点击「装备」即可为骑宠与人物附加强大魂力！</div>
            </div>
          `}
        </div>

        <div class="flex justify-between items-center mt8 mb6 flex-wrap gap8">
          <div class="panel-title" style="margin:0;padding:0;background:none;border:none">
            <span>兽魂仓库 (共 ${h.mount.soulBag.length} 颗)</span>
            <span class="small" style="font-weight:normal;color:#aaa">（吞噬经验：绿20 / 蓝50 / 紫400 / 橙800 / 白5 ⚙，升n级经验=20×n² ⚙）</span>
          </div>
          <div class="flex gap6">
            <button class="btn tiny" id="m-eat-white" ${!eqSoul || eqSoul.lv >= K.MAX_SOUL_LEVEL ? "disabled" : ""}>一键吞噬白色</button>
            <button class="btn tiny" id="m-eat-green" ${!eqSoul || eqSoul.lv >= K.MAX_SOUL_LEVEL ? "disabled" : ""}>一键吞噬绿色</button>
            <button class="btn tiny ${h.flags && h.flags.lastDemoPackDay === new Date().toDateString() ? 'disabled' : 'primary'}" id="m-grant-souls" ${h.flags && h.flags.lastDemoPackDay === new Date().toDateString() ? 'disabled' : ''}>
              ${h.flags && h.flags.lastDemoPackDay === new Date().toDateString() ? '补给包（今日已领）' : '领取补给材料包'}
            </button>
          </div>
        </div>

        <div class="soul-grid" id="soul-bag-grid">
          ${h.mount.soulBag.map((soul, idx) => `
            <div class="soul-card soul-q-${soul.quality} ${state.selectedSoulIdx === idx ? "selected" : ""}" data-sidx="${idx}">
              <div style="font-weight:bold">${soul.quality}·${soul.name}</div>
              <div>Lv.${soul.lv} ${soul.lv >= K.MAX_SOUL_LEVEL ? "(MAX)" : ""}</div>
              <div class="soul-exp-tag">吞噬提供 +${K.SOUL_FEED_EXP[soul.quality] || 5} 经验</div>
            </div>
          `).join("")}
        </div>

        <div class="mt8 p8" style="background:rgba(0,0,0,0.3);border:1px solid var(--wood);border-radius:4px" id="selected-soul-bar">
          ${state.selectedSoulIdx != null && h.mount.soulBag[state.selectedSoulIdx] ? `
            <div class="flex justify-between items-center flex-wrap gap8">
              <div>
                <b>选中：【${h.mount.soulBag[state.selectedSoulIdx].quality}·${h.mount.soulBag[state.selectedSoulIdx].name}】</b> (Lv.${h.mount.soulBag[state.selectedSoulIdx].lv})
                <span class="small ml8" style="color:#2ecc71">可提供魂力经验：+${K.SOUL_FEED_EXP[h.mount.soulBag[state.selectedSoulIdx].quality] || 5}</span>
              </div>
              <div class="flex gap6">
                <button class="btn small primary" id="m-equip-sel-soul">装备到当前骑宠</button>
                <button class="btn small" id="m-eat-sel-soul" ${!eqSoul || eqSoul.lv >= K.MAX_SOUL_LEVEL ? "disabled" : ""}>吞噬此兽魂为已装兽魂升级</button>
              </div>
            </div>
          ` : `<div class="small hint">点击上方仓库中的任一兽魂，可进行「装备」或「吞噬升级已装兽魂」。</div>`}
        </div>
      </div>`;

      // 绑定兽魂页事件
      const bUnequip = $("#m-unequip-soul");
      if (bUnequip) bUnequip.onclick = () => {
        const r = M.unequipSoul(h, cur.defId);
        if (r.msg) toast(r.msg);
        refreshAll(); renderMount();
      };
      $all("[data-sidx]").forEach((c) => {
        c.onclick = () => {
          state.selectedSoulIdx = parseInt(c.dataset.sidx, 10);
          renderMount();
        };
      });
      const bEquipSel = $("#m-equip-sel-soul");
      if (bEquipSel) bEquipSel.onclick = () => {
        if (state.selectedSoulIdx == null) return;
        const r = M.equipSoul(h, cur.defId, state.selectedSoulIdx);
        state.selectedSoulIdx = null;
        if (r.msg) toast(r.msg);
        refreshAll(); renderMount();
      };
      const bEatSel = $("#m-eat-sel-soul");
      if (bEatSel) bEatSel.onclick = () => {
        if (state.selectedSoulIdx == null || !eqSoul) return;
        const r = M.feedSoul(h, eqSoul, [state.selectedSoulIdx]);
        state.selectedSoulIdx = null;
        if (r.msg) toast(r.msg);
        refreshAll(); renderMount();
      };
      const bEatWhite = $("#m-eat-white");
      if (bEatWhite) bEatWhite.onclick = () => {
        if (!eqSoul) return;
        const idxs = [];
        h.mount.soulBag.forEach((s, i) => { if (s.quality === "白") idxs.push(i); });
        if (idxs.length === 0) return toast("兽魂仓库中暂无白色品质兽魂");
        const r = M.feedSoul(h, eqSoul, idxs);
        state.selectedSoulIdx = null;
        if (r.msg) toast(r.msg);
        refreshAll(); renderMount();
      };
      const bEatGreen = $("#m-eat-green");
      if (bEatGreen) bEatGreen.onclick = () => {
        if (!eqSoul) return;
        const idxs = [];
        h.mount.soulBag.forEach((s, i) => { if (s.quality === "绿") idxs.push(i); });
        if (idxs.length === 0) return toast("兽魂仓库中暂无绿色品质兽魂");
        const r = M.feedSoul(h, eqSoul, idxs);
        state.selectedSoulIdx = null;
        if (r.msg) toast(r.msg);
        refreshAll(); renderMount();
      };
      const bGrant = $("#m-grant-souls");
      if (bGrant) bGrant.onclick = () => {
        const r = M.grantDemoPack(h);
        if (r.msg) toast(r.msg);
        refreshAll(); renderMount();
      };
    } else if (state.mountTab === "神仙感应") {
      body.innerHTML = tabHtml + `<div class="modal-body">
        <div class="hint mb12">
          【神仙感应与兽魂获取】官指原版中通过神仙感应获取兽魂。散仙感应消耗银两，可产出白/绿/蓝兽魂；真仙感应消耗 5 两金子（原版设定），必定降临紫微（紫）或梵天（橙）极品神魂！
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div style="border:1px solid #3498db;border-radius:8px;padding:16px;background:rgba(52,152,219,0.08);text-align:center">
            <div style="font-size:36px">☁️</div>
            <div style="font-size:16px;font-weight:bold;color:#3498db;margin:6px 0">散仙感应台</div>
            <div class="small" style="color:#aaa;margin-bottom:12px">消耗 10,000 银两，感应散仙、地仙。产出碎灵(白)、灵木(绿)、幽泉(蓝)兽魂。</div>
            <button class="btn primary" id="m-summon-silver">感应散仙 (消耗 10,000 银)</button>
          </div>

          <div style="border:2px solid #e67e22;border-radius:8px;padding:16px;background:rgba(230,126,34,0.1);text-align:center">
            <div style="font-size:36px">✨</div>
            <div style="font-size:16px;font-weight:bold;color:#e67e22;margin:6px 0">真仙降临坛 (原版 5 两金)</div>
            <div class="small" style="color:#ffd23a;margin-bottom:12px">消耗 5 两金子（当前金子：${h.gold || 0} 两），直接引动九天真仙！必得紫微(紫)或梵天(橙)极品神级兽魂！</div>
            <button class="btn primary" id="m-summon-gold" style="background:#e67e22;border-color:#d35400">直接召唤真仙 (消耗 5 金)</button>
          </div>
        </div>

        <div class="mt16" style="text-align:center">
          <button class="btn" id="m-quick-pack">快捷获取演示兽魂补给包（白/绿/蓝/紫/橙各若干）</button>
        </div>
      </div>`;

      $("#m-summon-silver").onclick = () => {
        const r = M.summonSoul(h, false);
        if (r.msg) toast(r.msg);
        refreshAll(); renderMount();
      };
      $("#m-summon-gold").onclick = () => {
        const r = M.summonSoul(h, true);
        if (r.msg) toast(r.msg);
        refreshAll(); renderMount();
      };
      $("#m-quick-pack").onclick = () => {
        const r = M.grantDemoPack(h);
        if (r.msg) toast(r.msg);
        refreshAll(); renderMount();
      };
    } else if (state.mountTab === "骑宠技能") {
      body.innerHTML = tabHtml + `<div class="modal-body">` + renderMountSkillContent(h, cur) + `</div>`;
      bindMountSkillEvents(body, h, cur);
    }

    $all("[data-mtab]").forEach((t) => {
      t.onclick = () => { state.mountTab = t.dataset.mtab; renderMount(); };
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     骑宠技能（v1.2）
     ══════════════════════════════════════════════════════════════════ */
  function renderMountSkillContent(h, cur) {
    const MD = TSQ.MountData;
    const SC = MD.SKILL_CONST || { MAX_PURPLE: 1, MAX_BLUE: 3, MAX_SKILLS: 6, MIN_ACTIVE_LEVEL: 2 };
    const learned = cur.skills || [];

    const purpleCount = learned.filter((s) => {
      const d = MD.skillDefById(s.id);
      return d && d.quality === "紫";
    }).length;

    const blueCount = learned.filter((s) => {
      const d = MD.skillDefById(s.id);
      return d && d.quality === "蓝";
    }).length;

    // 已学技能列表
    const learnedHtml = learned.map((s) => {
      const def = MD.skillDefById(s.id);
      if (!def) return "";
      const isActive = (s.level || 1) >= SC.MIN_ACTIVE_LEVEL;
      const qClass = def.quality === "橙" ? "quality-orange" : def.quality === "紫" ? "quality-purple" : def.quality === "蓝" ? "quality-blue" : def.quality === "绿" ? "quality-green" : "quality-white";

      return `
        <div class="mount-skill-card">
          <div class="mount-skill-head">
            <div>
              <span class="skill-quality-badge ${qClass}">【${def.quality}】</span>
              <b style="color:#fff;font-size:14px">${def.name}</b>
              <span class="badge" style="background:#34495e;margin-left:4px">Lv.${s.level}</span>
            </div>
            <span class="mount-badge ${isActive ? 'on' : 'off'}">${isActive ? '生效中' : '未满2级不生效'}</span>
          </div>
          <div class="small" style="color:#ffd23a;margin:2px 0">${def.desc}</div>
          <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08)">
            <button class="btn tiny primary" data-sk-up="${s.id}">研习提升(Lv.${(s.level || 1) + 1})</button>
            <button class="btn tiny danger" data-sk-forget="${s.id}">遗忘技能</button>
          </div>
        </div>
      `;
    }).join("");

    // 补齐空格
    const emptySlots = Math.max(0, SC.MAX_SKILLS - learned.length);
    const emptyHtml = Array(emptySlots).fill(0).map(() => `
      <div class="mount-skill-card empty-slot">
        <span class="small">【空技能槽位】</span>
      </div>
    `).join("");

    // 领悟技能池（列出可学习技能）
    const pools = ["风雷", "明光", "灵幻", "通用"];
    const poolNames = { "风雷": "风雷丹池（攻速/敏捷/身法）", "明光": "明光丹池（防御/生命/抗性）", "灵幻": "灵幻丹池（法术/法力/恢复）", "通用": "通用神威池（极品/基础）" };

    const poolSectionsHtml = pools.map((p) => {
      const skillsInPool = Object.values(MD.SKILL_DEFS).filter((d) => d.pool === p);
      const cardsHtml = skillsInPool.map((d) => {
        const isAlreadyLearned = learned.some((s) => s.id === d.id);
        const qClass = d.quality === "橙" ? "quality-orange" : d.quality === "紫" ? "quality-purple" : d.quality === "蓝" ? "quality-blue" : d.quality === "绿" ? "quality-green" : "quality-white";
        return `
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:8px 10px;display:flex;flex-direction:column;gap:4px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <span class="skill-quality-badge ${qClass}">【${d.quality}】</span>
                <b>${d.name}</b>
              </div>
              ${isAlreadyLearned ? '<span class="small" style="color:#aaa">已习得</span>' : `<button class="btn tiny primary" data-sk-learn="${d.id}">领悟</button>`}
            </div>
            <div class="small" style="color:#bbb">${d.desc}</div>
          </div>
        `;
      }).join("");

      return `
        <div style="margin-bottom:12px">
          <div style="font-weight:bold;color:#54a0ff;font-size:13px;margin-bottom:6px">🔮 ${poolNames[p]}</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:8px">
            ${cardsHtml}
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="mount-skill-wrap">
        <div class="hint mb8">
          【骑宠技能系统（v1.2 规格对齐）】品质橙/紫/蓝/绿/白；官方专题规则：<b>骑宠最多 1 个紫、3 个蓝</b>；学习消耗对应丹药（凝神丹、风雷丹、明光丹、灵幻丹）；<b>技能 ≥2 级才生效</b>！加成进人物与骑宠属性。
        </div>

        <!-- 技能名额与品质配额栏 -->
        <div class="mount-skill-quota-bar">
          <div>当前骑宠：<b style="color:#ffd23a">${cur.name}</b></div>
          <div>总技能格：<b>${learned.length}</b> / ${SC.MAX_SKILLS}</div>
          <div>
            紫色技能配额：<b style="color:#9b59b6">${purpleCount}</b> / ${SC.MAX_PURPLE}
            ${purpleCount >= SC.MAX_PURPLE ? '<span class="badge" style="background:#e74c3c">紫色已满(上限1)</span>' : '<span class="badge" style="background:#2ecc71">可学紫</span>'}
          </div>
          <div>
            蓝色技能配额：<b style="color:#3498db">${blueCount}</b> / ${SC.MAX_BLUE}
            ${blueCount >= SC.MAX_BLUE ? '<span class="badge" style="background:#e74c3c">蓝色已满(上限3)</span>' : '<span class="badge" style="background:#2ecc71">可学蓝</span>'}
          </div>
        </div>

        <!-- 当前骑宠已学技能 -->
        <div>
          <div class="panel-title" style="border-radius:4px;margin-bottom:8px">🐾 当前骑宠已学技能（≥2级生效中，实时加持人物与骑宠属性）</div>
          <div class="mount-skill-grid">
            ${learnedHtml}
            ${emptyHtml}
          </div>
        </div>

        <!-- 领悟灵丹持有量与一键测试栏 -->
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
              <span>💊 领悟灵丹库存：</span>
              <span>凝神丹：<b style="color:#ffd23a">${h.consumables.ningshen_pill || 0}</b></span>
              <span>风雷丹：<b style="color:#3498db">${h.consumables.fenglei_pill || 0}</b></span>
              <span>明光丹：<b style="color:#2ecc71">${h.consumables.mingguang_pill || 0}</b></span>
              <span>灵幻丹：<b style="color:#9b59b6">${h.consumables.linghuan_pill || 0}</b></span>
            </div>
            <button class="btn small ${h.flags && h.flags.skillPillsClaimed ? 'disabled' : ''}" id="m-btn-grant-pills" ${h.flags && h.flags.skillPillsClaimed ? 'disabled' : ''}>
              ${h.flags && h.flags.skillPillsClaimed ? '领悟神丹礼包（已领取）' : '领取领悟神丹礼包（各10颗）'}
            </button>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;border-top:1px dashed rgba(255,255,255,0.1);padding-top:8px">
            <span class="small" style="color:#aaa;line-height:26px">🧪 规格上限拦截手测捷径：</span>
            <button class="btn tiny" id="m-test-purple-1">领悟紫色技能【紫霄御风】</button>
            <button class="btn tiny danger" id="m-test-purple-2">领悟第2个紫色技能（测试拦截）</button>
            <button class="btn tiny" id="m-test-blue-3">一键学满3个蓝色技能</button>
            <button class="btn tiny danger" id="m-test-blue-4">领悟第4个蓝色技能（测试拦截）</button>
          </div>
        </div>

        <!-- 可领悟技能池 -->
        <div>
          <div class="panel-title" style="border-radius:4px;margin-bottom:8px">📖 骑宠技能领悟池（各系技能池）</div>
          ${poolSectionsHtml}
        </div>
      </div>
    `;
  }

  function bindMountSkillEvents(container, h, cur) {
    const M = TSQ.Mount;

    // 领悟技能
    $all("[data-sk-learn]", container).forEach((b) => {
      b.onclick = () => {
        const skId = b.dataset.skLearn;
        const r = M.learnSkill(h, cur.defId, skId, 2);
        if (r && r.msg) toast(r.msg);
        refreshAll();
        renderMount();
      };
    });

    // 升级技能
    $all("[data-sk-up]", container).forEach((b) => {
      b.onclick = () => {
        const skId = b.dataset.skUp;
        const r = M.upgradeSkill(h, cur.defId, skId);
        if (r && r.msg) toast(r.msg);
        refreshAll();
        renderMount();
      };
    });

    // 遗忘技能
    $all("[data-sk-forget]", container).forEach((b) => {
      b.onclick = () => {
        const skId = b.dataset.skForget;
        const r = M.forgetSkill(h, cur.defId, skId);
        if (r && r.msg) toast(r.msg);
        refreshAll();
        renderMount();
      };
    });

    // 发放灵丹包
    const bPills = $("#m-btn-grant-pills", container);
    if (bPills) bPills.onclick = () => {
      const r = M.grantSkillPills(h);
      if (r && r.msg) toast(r.msg);
      refreshAll();
      renderMount();
    };

    // 拦截捷径手测
    const bPur1 = $("#m-test-purple-1", container);
    if (bPur1) bPur1.onclick = () => {
      const r = M.learnSkill(h, cur.defId, "mount_sk_zixiao", 2);
      if (r && r.msg) toast(r.msg);
      refreshAll(); renderMount();
    };
    const bPur2 = $("#m-test-purple-2", container);
    if (bPur2) bPur2.onclick = () => {
      const r = M.learnSkill(h, cur.defId, "mount_sk_zhenyuan", 2);
      if (r && r.msg) toast(r.msg);
      refreshAll(); renderMount();
    };
    const bBlu3 = $("#m-test-blue-3", container);
    if (bBlu3) bBlu3.onclick = () => {
      M.learnSkill(h, cur.defId, "mount_sk_fengchi", 2);
      M.learnSkill(h, cur.defId, "mount_sk_jianbi", 2);
      const r = M.learnSkill(h, cur.defId, "mount_sk_qiguan", 2);
      if (r && r.msg) toast("已一键补齐3个蓝色技能！");
      refreshAll(); renderMount();
    };
    const bBlu4 = $("#m-test-blue-4", container);
    if (bBlu4) bBlu4.onclick = () => {
      const r = M.learnSkill(h, cur.defId, "mount_sk_lingyao", 2);
      if (r && r.msg) toast(r.msg);
      refreshAll(); renderMount();
    };
  }

  /* ══════════════════════════════════════════════════════════════════
     结义系统（v1.2）
     ══════════════════════════════════════════════════════════════════ */
  function renderSwornContent(h) {
    if (TSQ.Sworn) TSQ.Sworn.initHero(h);
    const SD = TSQ.SwornData;
    const sw = h.sworn || {};
    const isBuffOn = TSQ.Sworn ? TSQ.Sworn.isBuffActive(h) : false;
    const remSec = TSQ.Sworn ? TSQ.Sworn.getBuffRemainingSeconds(h) : 0;
    const remMin = Math.floor(remSec / 60);

    const brothersHtml = (sw.brothers || []).map((b) => `
      <div class="brother-card">
        <div class="brother-avatar">${b.avatar || "🤝"}</div>
        <div style="flex:1">
          <div><b>${b.name}</b> <span class="small" style="color:#ffd23a">Lv.${b.level} · ${b.className}</span></div>
          <div class="small" style="color:#aaa">亲密度：<b style="color:#2ecc71">${b.intimacy}</b> (>100 已满足)</div>
          <div class="small" style="color:#bbb;font-style:italic;margin-top:2px">“${b.quote}”</div>
        </div>
      </div>
    `).join("");

    const questsHtml = (SD.QUESTS || []).map((q) => `
      <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.03);padding:10px 14px;border-radius:6px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.08)">
        <div style="flex:1;margin-right:12px">
          <div><b style="color:#ffd23a">【${q.name}】</b> <span class="small" style="color:#2ecc71">契合度 +${q.harmonyReward} ${q.pillReward ? "· 获赠【凝神丹】×" + q.pillCount : ""}</span></div>
          <div class="small" style="color:#aaa;margin-top:2px">${q.desc}</div>
        </div>
        <button class="btn primary small" data-sw-quest="${q.id}">执行任务</button>
      </div>
    `).join("");

    const canSwornChk = TSQ.Sworn.canSworn(h);
    const c = h.consumables || {};

    return `
      <div class="sworn-wrap">
        <div class="hint mb8">
          【金兰结义系统（v1.2 规格对齐）】3~8 人 >40 级，亲密度 >100；道具金兰香、桃园酒、八拜案（使者 65,22）。契合度初始 200，每周 −50（任务可补）；奖励金兰戒指、结义徽章、2小时金兰同心增益Buff！
        </div>

        ${!sw.enabled ? `
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px">
            <div style="font-weight:bold;color:#f39c12;margin-bottom:6px">📋 结义开启条件检查（§7.7 规格）：</div>
            <div class="small" style="line-height:22px">
              1. 人物等级 > 40：当前 Lv${h.level} ${h.level > 40 ? '<span style="color:#2ecc71">（✅ 已满足）</span>' : '<span style="color:#e74c3c">（❌ 未满足，需>40级）</span>'}<br>
              2. 兄弟亲密度 > 100：断浪 120、月咏 115、风语 105 <span style="color:#2ecc71">（✅ 全部已满足）</span><br>
              3. 结义必备信物：
                 金兰香 <b style="color:${(c.jinlan_xiang || 0) >= 1 ? '#2ecc71' : '#e74c3c'}">${c.jinlan_xiang || 0}/1</b>、
                 桃园酒 <b style="color:${(c.taoyuan_jiu || 0) >= 1 ? '#2ecc71' : '#e74c3c'}">${c.taoyuan_jiu || 0}/1</b>、
                 八拜案 <b style="color:${(c.babai_an || 0) >= 1 ? '#2ecc71' : '#e74c3c'}">${c.babai_an || 0}/1</b>
                 ${canSwornChk.ok ? '<span style="color:#2ecc71">（✅ 信物已齐）</span>' : '<span style="color:#e74c3c">（❌ 信物未齐）</span>'}
            </div>
            <div style="margin-top:8px">
              <button class="btn small" id="sw-btn-buy-items">在结义使者处备齐信物（消耗 15,000 银两）</button>
            </div>
          </div>
        ` : ''}

        <!-- 顶部结义状态与开关 -->
        <div class="sworn-header-box">
          <div>
            <div style="font-size:16px">结义誓约：<b style="color:#ff9f43">【${sw.title || "生死与共"}】</b> <span class="mount-badge ${sw.enabled ? 'on' : 'off'}">${sw.enabled ? "金兰同盟（已结义）" : "未结义"}</span></div>
            <div class="small" style="color:#aaa;margin-top:4px">结义人数：${(sw.brothers ? sw.brothers.length : 0) + 1} 人（主角 + 3名NPC兄弟） · 周数：第 ${sw.weeksPassed || 0} 周</div>
          </div>
          <button class="btn ${sw.enabled ? 'danger' : 'primary'}" id="sw-btn-toggle">
            ${sw.enabled ? '解除结义' : (canSwornChk.ok ? '八拜结义（条件已齐）' : '八拜结义（需备齐信物）')}
          </button>
        </div>

        <!-- 契合度与过周 -->
        <div class="sworn-harmony-box">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <b>兄弟契合度：</b><span style="font-size:16px;font-weight:bold;color:#f39c12">${sw.harmony || 0}</span> / ${sw.maxHarmony || 1000}
              <span class="small" style="color:#aaa;margin-left:8px">（初始 200，每周 −50，任务可补充）</span>
            </div>
            <div>
              <button class="btn small" id="sw-btn-week">过一周（契合度 −50）</button>
            </div>
          </div>
          <div class="sworn-bar-wrap">
            <div class="sworn-bar-fill" style="width:${Math.min(100, ((sw.harmony || 0) / (sw.maxHarmony || 1000)) * 100)}%"></div>
          </div>
        </div>

        <!-- 2小时金兰同心Buff -->
        <div class="sworn-buff-card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-size:15px;font-weight:bold;color:#2ecc71">✨ 2小时增益：【金兰同心】Buff <span class="mount-badge ${isBuffOn ? 'on' : 'off'}">${isBuffOn ? `生效中（剩余约 ${remMin} 分钟）` : "未生效/已过期"}</span></div>
              <div class="small" style="color:#ecf0f1;margin-top:4px">
                加成属性（全额进人物 combatStats）：<b>生命 +3000、物攻 +240、法攻 +240、物防 +160、法防 +160、生命上限 +5%、双攻 +3%！</b>
              </div>
            </div>
            <button class="btn primary small" id="sw-btn-buff">激活 / 续期 2小时金兰Buff</button>
          </div>
        </div>

        <!-- 结义任务与骑宠领悟丹联动 -->
        <div>
          <div class="panel-title" style="border-radius:4px;margin-bottom:8px">📜 结义任务（恢复契合度，任务「各显神通」产出骑宠领悟丹【凝神丹】）</div>
          ${questsHtml}
        </div>

        <!-- 3 名 NPC 兄弟卡片 -->
        <div>
          <div class="panel-title" style="border-radius:4px;margin-bottom:8px">🤝 结义金兰兄弟（等级 >40，亲密度 >100 满足规格）</div>
          <div class="brothers-grid">
            ${brothersHtml}
          </div>
        </div>

        <!-- 结义信物奖励展示 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px">
            <div style="font-weight:bold;color:#a29bfe">💍 结义奖励信物：【金兰戒指】</div>
            <div class="small" style="color:#aaa;margin:4px 0">专属结义对戒，属性：生命 +1600、法力 +800、物攻 +120、法攻 +120。</div>
            <div class="small" style="color:#2ecc71">状态：${sw.ringAwarded ? "已发放至背包，可随时佩戴至戒指槽位" : "结义时自动发放"}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px">
            <div style="font-weight:bold;color:#ffd23a">🏅 结义徽章：【结义徽章】</div>
            <div class="small" style="color:#aaa;margin:4px 0">进入徽章账本，属性：生命 +1500、物攻/法攻 +120、物防/法防 +120。</div>
            <div class="small" style="color:#2ecc71">状态：${(h.badges && h.badges.owned && h.badges.owned.jieyi) ? "已解锁入账本，可在「徽章」页直接佩戴" : "结义时自动解锁"}</div>
          </div>
        </div>
      </div>
    `;
  }

  function bindSwornEvents(container, h, rerender) {
    const btnBuy = $("#sw-btn-buy-items", container);
    if (btnBuy) btnBuy.onclick = () => {
      const r = TSQ.Sworn.buySwornItems(h);
      if (r && r.msg) toast(r.msg);
      refreshAll();
      rerender();
    };

    const btnToggle = $("#sw-btn-toggle", container);
    if (btnToggle) btnToggle.onclick = () => {
      const r = TSQ.Sworn.toggleSworn(h);
      if (r && r.msg) toast(r.msg);
      refreshAll();
      rerender();
    };

    const btnWeek = $("#sw-btn-week", container);
    if (btnWeek) btnWeek.onclick = () => {
      const r = TSQ.Sworn.passOneWeek(h);
      if (r && r.msg) toast(r.msg);
      refreshAll();
      rerender();
    };

    const btnBuff = $("#sw-btn-buff", container);
    if (btnBuff) btnBuff.onclick = () => {
      const r = TSQ.Sworn.activateBuff(h);
      if (r && r.msg) toast(r.msg);
      refreshAll();
      rerender();
    };

    $all("[data-sw-quest]", container).forEach((b) => {
      b.onclick = () => {
        const qid = b.dataset.swQuest;
        const r = TSQ.Sworn.doQuest(h, qid);
        if (r && r.msg) toast(r.msg);
        refreshAll();
        rerender();
      };
    });
  }

  function renderSworn() {
    const h = state.hero;
    if (TSQ.Sworn) TSQ.Sworn.initHero(h);
    const body = $("#sworn-body");
    if (!body) return;
    body.innerHTML = `<div class="modal-body">` + renderSwornContent(h) + `</div>`;
    bindSwornEvents(body, h, () => renderSworn());
  }

  /* ══════════════════════════════════════════════════════════════════
     帮会武功科技（v1.2）
     ══════════════════════════════════════════════════════════════════ */
  function renderGuildContent(h) {
    if (TSQ.Guild) TSQ.Guild.initHero(h);
    const GD = TSQ.GuildData;
    const g = h.guild || {};
    const skills = g.skills || {};

    const techGridHtml = GD.SKILLS.map((def) => {
      const sk = skills[def.id] || { level: 1, star: 0 };
      const totalStars = (sk.level - 1) * 10 + sk.star;
      const cost = GD.calcUpgradeCost(sk.level, sk.star);
      const isMax = sk.level >= GD.CONST.MAX_LEVEL && sk.star >= GD.CONST.MAX_STAR;

      const starsDisplay = Array(10).fill(0).map((_, i) =>
        `<span style="color:${i < sk.star ? '#ffd23a' : '#444'};font-size:12px">★</span>`
      ).join("");

      let bonusDesc = "";
      if (def.type === "hp") bonusDesc = `当前加成：生命上限 +${(totalStars * 0.5).toFixed(1)}%`;
      else if (def.type === "mp") bonusDesc = `当前加成：法力上限 +${(totalStars * 0.5).toFixed(1)}%`;
      else if (def.type === "patk") bonusDesc = `当前加成：物理攻击 +${(totalStars * 0.5).toFixed(1)}%`;
      else if (def.type === "matk") bonusDesc = `当前加成：法术攻击 +${(totalStars * 0.5).toFixed(1)}%`;
      else if (def.type === "recovery") bonusDesc = `当前加成：仙法治疗 +${(totalStars * 0.5).toFixed(1)}%，战斗自然恢复 +${totalStars * 8}`;
      else if (def.type === "rage") bonusDesc = `当前加成：怒气上限与开局怒气 +${totalStars * 2}`;

      return `
        <div class="guild-tech-card">
          <div class="guild-card-top">
            <div>
              <span style="font-size:18px">${def.icon}</span>
              <b style="font-size:14px;color:#fff">${def.name}</b>
              <span class="small" style="color:#aaa">（${def.alias}）</span>
            </div>
            <span class="badge" style="background:#2980b9;color:#fff;font-weight:bold">${sk.level} 级 · ${sk.star} 星</span>
          </div>
          <div class="guild-star-row">${starsDisplay}</div>
          <div class="small" style="color:#2ecc71;font-weight:bold">${bonusDesc}</div>
          <div class="small" style="color:#aaa">${def.desc}</div>
          <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:8px;margin-top:auto;display:flex;justify-content:space-between;align-items:center">
            <div class="small" style="color:#ccc">
              ${isMax ? '<span style="color:#ffd23a">已达满级满星</span>' : `消耗：<b>${cost.contrib}</b>帮贡 · <b>${cost.silver}</b>银 · <b>${cost.yuanpo}</b>元魄`}
            </div>
            ${isMax ? '' : `<button class="btn primary tiny" data-g-up="${def.id}">精进突破</button>`}
          </div>
        </div>
      `;
    }).join("");

    const donateHtml = GD.DONATIONS.map((d) => {
      let costText = "";
      if (d.silverCost) costText = `${d.silverCost} 银两`;
      else if (d.matId) {
        const hasCount = (h.mats && h.mats[d.matId]) || 0;
        costText = `${d.matName} × ${d.costNum} (持有: ${hasCount})`;
      }
      return `
        <div class="guild-donate-card">
          <div style="flex:1;margin-right:10px">
            <div><b style="color:#54a0ff">${d.name}</b> <span class="small" style="color:#2ecc71">+${d.yuanpoGain} 元魄 · +${d.contribGain} 帮贡</span></div>
            <div class="small" style="color:#aaa">${costText}</div>
          </div>
          <button class="btn tiny primary" data-g-donate="${d.id}">捐献</button>
        </div>
      `;
    }).join("");

    return `
      <div class="guild-wrap">
        <div class="hint mb8">
          【帮会武功科技（v1.2 规格对齐）】入口：帮会大厅 帮会使者 →「使用帮会科技」→ 武功页（需要 3000 帮会活跃度，人物等级 ≥125 解锁）。帮会捐献官处显示的是帮会开放的上限（当前开放：10级10星），不是个人进度。
        </div>

        <!-- 帮会顶部信息卡 -->
        <div class="guild-header-box">
          <div>
            <div style="font-size:16px">帮会名称：<b style="color:#54a0ff">【${g.name || "天书盟"}】</b> <span class="small" style="color:#ffd23a">帮会等级 Lv.${g.level || 5}</span></div>
            <div class="small" style="color:#ecf0f1;margin-top:4px">
              帮会活跃度：<b style="color:#2ecc71">${g.activity || 0}</b> / 3000 (已达标) · 人物等级：<b style="color:#2ecc71">Lv${h.level}</b> (≥125 已解锁)
            </div>
          </div>
          <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
            <div class="small">帮会贡献：<b style="color:#ffd23a;font-size:14px">${g.contrib || 0}</b> 点</div>
            <div class="small">元魄库存：<b style="color:#ff9f43;font-size:14px">${g.yuanpo || 0}</b> 点</div>
            <div class="small">银两：<b style="color:#fff;font-size:14px">${h.silver || 0}</b> 银</div>
            <button class="btn small" id="g-btn-salary">领取每日科技俸禄 (+3000帮贡, +2万元魄)</button>
          </div>
        </div>

        <!-- 6项武功科技卡片 -->
        <div>
          <div class="panel-title" style="border-radius:4px;margin-bottom:8px">
            ⚔️ 帮会使者 · 帮会武功项目（生命/法力/物攻/法攻/恢复/怒气，每星 +0.5%，全额计入人物属性）
          </div>
          <div class="guild-tech-grid">
            ${techGridHtml}
          </div>
        </div>

        <!-- 帮会捐献官 (元魄来源) -->
        <div>
          <div class="panel-title" style="border-radius:4px;margin-bottom:8px">
            🏛️ 帮会捐献官 · 元魄兑换（规格证实：上古神器碎片 3250、失落的锻造法 1.9万、醒悟丹 5万）
          </div>
          <div class="small" style="color:#aaa;margin-bottom:8px">说明：帮会捐献官处展示的是帮会开放的科技上限（10级 · 10星），不是个人进度。捐献可快速充实元魄与帮贡。</div>
          <div class="guild-donate-grid">
            ${donateHtml}
          </div>
        </div>
      </div>
    `;
  }

  function bindGuildEvents(container, h, rerender) {
    $all("[data-g-up]", container).forEach((b) => {
      b.onclick = () => {
        const skillId = b.dataset.gUp;
        const r = TSQ.Guild.upgradeSkill(h, skillId);
        if (r && r.msg) toast(r.msg);
        refreshAll();
        rerender();
      };
    });

    $all("[data-g-donate]", container).forEach((b) => {
      b.onclick = () => {
        const did = b.dataset.gDonate;
        const r = TSQ.Guild.donate(h, did);
        if (r && r.msg) toast(r.msg);
        refreshAll();
        rerender();
      };
    });

    const btnSalary = $("#g-btn-salary", container);
    if (btnSalary) btnSalary.onclick = () => {
      const r = TSQ.Guild.claimSalary(h);
      if (r && r.msg) toast(r.msg);
      refreshAll();
      rerender();
    };
  }

  function renderGuild() {
    const h = state.hero;
    if (TSQ.Guild) TSQ.Guild.initHero(h);
    const body = $("#guild-body");
    if (!body) return;
    body.innerHTML = `<div class="modal-body">` + renderGuildContent(h) + `</div>`;
    bindGuildEvents(body, h, () => renderGuild());
  }

  /* ══════════ 转生修真与三转联盟 (v1.3) ══════════ */
  function renderRebirthContent(h) {
    if (TSQ.Rebirth) TSQ.Rebirth.migrate(h);
    const RD = TSQ.RebirthData;
    const rb = h.rebirth || 0;
    const stageNames = ["未转", "一转", "二转", "三转"];
    const maxLv = RD.CONST.MAX_LEVEL_BY_REBIRTH[rb] || 100;
    const c = h.consumables || {};

    const rb1Chk = TSQ.Rebirth.canRebirth1(h);
    const rb2Chk = TSQ.Rebirth.canRebirth2(h);
    const rb3Chk = TSQ.Rebirth.canRebirth3(h);

    const fp = (TSQ.Game && typeof TSQ.Game.fightingPet === "function") ? TSQ.Game.fightingPet(h) : null;
    const isRiding = !!(h.mount && h.mount.riding);

    let allianceHtml = "";
    if (rb < 3) {
      allianceHtml = `
        <div class="rebirth-stage-card">
          <div class="panel-title" style="margin:0;padding:0;background:none;border:none">
            <span>✨ 幻想城·菩提子 阵营联盟转职（三转开放）</span>
            <span class="mount-badge off">三转锁定</span>
          </div>
          <div class="small" style="color:#aaa">达到三转后，可前往幻想城 NPC 菩提子处二选一转职【坚韧天选者】或【勇武天选者】，修习专属 6 大阵营专职被动技能！</div>
        </div>
      `;
    } else {
      const curAl = h.alliance ? RD.allianceById(h.alliance.id) : null;
      const curAlId = curAl ? curAl.id : null;
      const ysVal = (h.yuanshen && h.yuanshen.value) || 0;

      const pListHtml = curAl ? curAl.passives.map((p) => {
        const curLv = (h.alliance.passives && h.alliance.passives[p.id]) || 1;
        const curBonus = p.calc(curLv);
        const cost = RD.CONST.PASSIVE_UPGRADE_COST(curLv);
        const canUp = curLv < RD.CONST.MAX_PASSIVE_LEVEL && ysVal >= cost;

        const bonusStr = Object.entries(curBonus).map(([k, v]) => {
          const name = TSQ.EQ.statNames[k] || D().secondaryNames[k] || k;
          return `${name} +${v}`;
        }).join("、");

        return `
          <div class="passive-item-card">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <b>${p.icon} ${p.name}</b>
                <span class="skill-quality-badge quality-purple" style="margin-left:6px">${p.statType}</span>
                <span style="font-weight:bold;color:#f1c40f;margin-left:6px">Lv.${curLv}/10</span>
              </div>
              <button class="btn tiny ${canUp ? 'primary' : 'disabled'}" data-upgrade-passive="${p.id}" ${canUp ? '' : 'disabled'}>
                ${curLv >= RD.CONST.MAX_PASSIVE_LEVEL ? '已满级' : `升级 (耗 ${(cost / 10000).toFixed(0)} 万元神)`}
              </button>
            </div>
            <div class="small" style="color:#aaa">${p.desc}</div>
            <div class="small" style="color:#2ecc71">当前加成：<b>${bonusStr}</b></div>
          </div>
        `;
      }).join("") : `<div class="hint">请在下方二选一加入阵营联盟，激活阵营专职被动！</div>`;

      allianceHtml = `
        <div class="rebirth-stage-card current">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-size:16px;font-weight:bold;color:#00cec9">🏛️ 幻想城 NPC·菩提子 阵营联盟专职</div>
              <div class="small" style="color:#aaa;margin-top:2px">当前元神存量：<b style="color:#ffd23a">${ysVal.toLocaleString()}</b> 元神（研习被动消耗元神）</div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn small ${curAlId === 'tenacity' ? 'primary' : ''}" id="rb-btn-join-tenacity">
                ${curAlId === 'tenacity' ? '🛡️ 当前：坚韧天选者' : '加入坚韧天选者'}
              </button>
              <button class="btn small ${curAlId === 'valiance' ? 'primary' : ''}" id="rb-btn-join-valiance">
                ${curAlId === 'valiance' ? '⚔️ 当前：勇武天选者' : '加入勇武天选者'}
              </button>
            </div>
          </div>

          <div style="margin-top:10px">
            <div class="panel-title" style="border-radius:4px;margin-bottom:8px">
              ${curAl ? `🌟 【${curAl.name}】6大专职被动（全额计入人物 combatStats）` : "⚠️ 尚未加入联盟，请点击上方按钮选择转职"}
            </div>
            <div class="passives-grid">
              ${pListHtml}
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="rebirth-wrap">
        <!-- 顶部转生概览 -->
        <div class="sworn-header-box" style="background:rgba(241, 196, 15, 0.08);border-color:rgba(241, 196, 15, 0.3)">
          <div>
            <div style="font-size:16px">转生修真境界：<b style="color:#f1c40f">【${stageNames[rb]}】</b> <span class="mount-badge on">Lv.${h.level} / ${maxLv} 级上限</span></div>
            <div class="small" style="color:#aaa;margin-top:4px">
              阵营联盟：<b style="color:#00cec9">${(h.alliance && h.alliance.name) || "无"}</b> · 
              转生资质加成：<b style="color:#2ecc71">${((h.rebirthAptBonus || (rb >= 2 ? 0.1 : 0)) * 100).toFixed(0)}% ⚙</b> · 
              未分配自由潜力：<b style="color:#f39c12">${h.unspent || 0} 点</b>
            </div>
          </div>
        </div>

        <!-- 一转卡片 -->
        <div class="rebirth-stage-card ${rb >= 1 ? 'done' : (rb === 0 ? 'current' : '')}">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-size:15px;font-weight:bold;color:${rb >= 1 ? '#2ecc71' : '#f1c40f'}">
                1️⃣ 一转涅槃 ${rb >= 1 ? '<span class="mount-badge on">已达成</span>' : '<span class="mount-badge off">未达成</span>'}
              </div>
              <div class="small" style="color:#aaa;margin-top:2px">
                准入条件：等级 ≥ 75（当前 Lv${h.level}，${h.level >= 75 ? '✅' : '❌'}） · 道具【天书】×1（持有：${c.tianshu || 0}/1，${(c.tianshu || 0) >= 1 ? '✅' : '❌'}）
              </div>
            </div>
            ${rb === 0 ? `
              <button class="btn ${rb1Chk.ok ? 'primary' : 'disabled'}" id="rb-btn-do-rb1" ${rb1Chk.ok ? '' : 'disabled'}>
                执行一转涅槃
              </button>
            ` : `<span class="small" style="color:#2ecc71">已成功一转（等级重算、潜力与心法返还、技能经验双倍）</span>`}
          </div>
          <div class="small" style="color:#ddd;background:rgba(0,0,0,0.2);padding:8px 10px;border-radius:4px">
            规格收益：等级按对照表重新换算（75→60, 80→63, 85→66, 90→70, 95→75, 100→80）；<b>自由潜力点与心法经验全部返还</b>，心法重置为 1 级（技能等级不变）；<b>额外 +10 自由潜力</b>；打怪<b>技能经验双倍</b>；满级上限提至 139 级。
          </div>
        </div>

        <!-- 二转卡片 -->
        <div class="rebirth-stage-card ${rb >= 2 ? 'done' : (rb === 1 ? 'current' : '')}">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-size:15px;font-weight:bold;color:${rb >= 2 ? '#2ecc71' : (rb === 1 ? '#f1c40f' : '#888')}">
                2️⃣ 二转脱胎换骨 ${rb >= 2 ? '<span class="mount-badge on">已达成</span>' : '<span class="mount-badge off">未达成</span>'}
              </div>
              <div class="small" style="color:#aaa;margin-top:2px">
                准入条件：一转等级 ≥ 134（当前 Lv${h.level}，${h.level >= 134 ? '✅' : '❌'}） · 道具【天卷灵丹】×1（持有：${c.tianjuan_lingdan || 0}/1，${(c.tianjuan_lingdan || 0) >= 1 ? '✅' : '❌'}）
              </div>
            </div>
            ${rb === 1 ? `
              <button class="btn ${rb2Chk.ok ? 'primary' : 'disabled'}" id="rb-btn-do-rb2" ${rb2Chk.ok ? '' : 'disabled'}>
                执行二转脱胎换骨
              </button>
            ` : (rb >= 2 ? `<span class="small" style="color:#2ecc71">已成功二转（资质提升10%、活力历练已解锁）</span>` : `<span class="small" style="color:#666">需先完成一转</span>`)}
          </div>
          <div class="small" style="color:#ddd;background:rgba(0,0,0,0.2);padding:8px 10px;border-radius:4px">
            规格收益：等级换算（134→125, 135→126）；<b>额外 +10 自由潜力</b>；<b>资质再提高 10% ⚙</b>；满级上限提至 162 级；正式解锁<b>【活力与历练】</b>日常系统。
          </div>
        </div>

        <!-- 三转卡片 -->
        <div class="rebirth-stage-card ${rb >= 3 ? 'done' : (rb === 2 ? 'current' : '')}">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-size:15px;font-weight:bold;color:${rb >= 3 ? '#2ecc71' : (rb === 2 ? '#f1c40f' : '#888')}">
                3️⃣ 三转飞升成圣 ${rb >= 3 ? '<span class="mount-badge on">已达成</span>' : '<span class="mount-badge off">未达成</span>'}
              </div>
              <div class="small" style="color:#aaa;margin-top:2px">
                准入条件：二转等级 ≥ 162（当前 Lv${h.level}，${h.level >= 162 ? '✅' : '❌'}） · 道具【天赐祝福】×1（持有：${c.tianci_zhufu || 0}/1，${(c.tianci_zhufu || 0) >= 1 ? '✅' : '❌'}） · 无出战宠（${fp ? '❌' : '✅'}） · 未骑乘（${isRiding ? '❌' : '✅'}）
              </div>
            </div>
            ${rb === 2 ? `
              <button class="btn ${rb3Chk.ok ? 'primary' : 'disabled'}" id="rb-btn-do-rb3" ${rb3Chk.ok ? '' : 'disabled'}>
                执行三转飞升成圣
              </button>
            ` : (rb >= 3 ? `<span class="small" style="color:#2ecc71">已成功三转（满级179、菩提子联盟转职已开放）</span>` : `<span class="small" style="color:#666">需先完成二转</span>`)}
          </div>
          <div class="small" style="color:#ddd;background:rgba(0,0,0,0.2);padding:8px 10px;border-radius:4px">
            规格收益：<b>等级统一重置为 Lv30</b>；<b>满级开放至 179 级</b>；可穿任意等级装备与携带任意骑宠；前往幻想城 NPC 菩提子处转职两大联盟（坚韧天选者 / 勇武天选者）。
          </div>
        </div>

        <!-- 菩提子联盟专职板块 -->
        ${allianceHtml}

        <!-- 演示辅助捷径 -->
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px">
          <div style="font-weight:bold;color:#f39c12;margin-bottom:8px">⚙ 转生测试辅助捷径（端到端验证 0→3 推进与联盟）：</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn tiny" id="rb-btn-demo-items">备齐转生道具（天书/天卷灵丹/天赐祝福 各1）</button>
            <button class="btn tiny" id="rb-btn-demo-lv80">设为一转测试等级 (Lv.80)</button>
            <button class="btn tiny" id="rb-btn-demo-lv135">设为二转测试等级 (Lv.135)</button>
            <button class="btn tiny" id="rb-btn-demo-lv162">设为三转测试等级 (Lv.162)</button>
            <button class="btn tiny" id="rb-btn-demo-reset-rb">⚙ 演示：重置为未转</button>
            <button class="btn tiny" id="rb-btn-demo-ys">赠送 100 万元神（研习被动）</button>
          </div>
        </div>
      </div>
    `;
  }

  function bindRebirthEvents(container, h, rerender) {
    const bRb1 = $("#rb-btn-do-rb1", container);
    if (bRb1) bRb1.onclick = () => {
      const r = TSQ.Rebirth.doRebirth1(h);
      if (r && r.msg) toast(r.msg);
      refreshAll(); rerender();
    };
    const bRb2 = $("#rb-btn-do-rb2", container);
    if (bRb2) bRb2.onclick = () => {
      const r = TSQ.Rebirth.doRebirth2(h);
      if (r && r.msg) toast(r.msg);
      refreshAll(); rerender();
    };
    const bRb3 = $("#rb-btn-do-rb3", container);
    if (bRb3) bRb3.onclick = () => {
      const r = TSQ.Rebirth.doRebirth3(h);
      if (r && r.msg) toast(r.msg);
      refreshAll(); rerender();
    };
    const bTen = $("#rb-btn-join-tenacity", container);
    if (bTen) bTen.onclick = () => {
      const r = TSQ.Rebirth.chooseAlliance(h, "tenacity");
      if (r && r.msg) toast(r.msg);
      refreshAll(); rerender();
    };
    const bVal = $("#rb-btn-join-valiance", container);
    if (bVal) bVal.onclick = () => {
      const r = TSQ.Rebirth.chooseAlliance(h, "valiance");
      if (r && r.msg) toast(r.msg);
      refreshAll(); rerender();
    };
    $all("[data-upgrade-passive]", container).forEach((b) => {
      b.onclick = () => {
        const pid = b.dataset.upgradePassive;
        const r = TSQ.Rebirth.upgradePassive(h, pid);
        if (r && r.msg) toast(r.msg);
        refreshAll(); rerender();
      };
    });
    // Demo helpers
    const bDemoItems = $("#rb-btn-demo-items", container);
    if (bDemoItems) bDemoItems.onclick = () => {
      const r = TSQ.Rebirth.grantDemoRebirthPack(h);
      if (r && r.msg) toast(r.msg);
      refreshAll(); rerender();
    };
    const bLv80 = $("#rb-btn-demo-lv80", container);
    if (bLv80) bLv80.onclick = () => {
      TSQ.Rebirth.setDemoLevel(h, 80);
      refreshAll(); rerender();
    };
    const bLv135 = $("#rb-btn-demo-lv135", container);
    if (bLv135) bLv135.onclick = () => {
      TSQ.Rebirth.setDemoLevel(h, 135);
      refreshAll(); rerender();
    };
    const bLv162 = $("#rb-btn-demo-lv162", container);
    if (bLv162) bLv162.onclick = () => {
      TSQ.Rebirth.setDemoLevel(h, 162);
      refreshAll(); rerender();
    };
    const bResetRb = $("#rb-btn-demo-reset-rb", container);
    if (bResetRb) bResetRb.onclick = () => {
      h.rebirth = 0;
      h.rebirthAptBonus = 0;
      h.alliance = null;
      TSQ.Rebirth.setDemoLevel(h, 75);
      toast("已重置为【未转 Lv.75】，可从一转开始完整推进！");
      refreshAll(); rerender();
    };
    const bDemoYs = $("#rb-btn-demo-ys", container);
    if (bDemoYs) bDemoYs.onclick = () => {
      h.yuanshen = h.yuanshen || { value: 0 };
      h.yuanshen.value = (h.yuanshen.value || 0) + 1000000;
      toast("已获赠 1,000,000 元神！");
      refreshAll(); rerender();
    };
  }

  function renderRebirth() {
    const h = state.hero;
    if (TSQ.Rebirth) TSQ.Rebirth.migrate(h);
    const body = $("#rebirth-body");
    if (!body) return;
    body.innerHTML = `<div class="modal-body">` + renderRebirthContent(h) + `</div>`;
    bindRebirthEvents(body, h, () => renderRebirth());
  }

  /* ══════════ 活力与历练 (v1.3) ══════════ */
  function renderVitalityContent(h) {
    if (TSQ.Vitality) TSQ.Vitality.ensureVitality(h);
    const V = TSQ.Vitality;
    const isUnlocked = V.isUnlocked(h);
    const v = h.vitality || { current: 0, max: 1000, dailyQuestsDone: 0 };
    const rate = V.calcExchangeRate(h);

    if (!isUnlocked) {
      return `
        <div class="vitality-wrap">
          <div class="sworn-header-box" style="background:rgba(108, 92, 231, 0.08);border-color:rgba(108, 92, 231, 0.3)">
            <div>
              <div style="font-size:16px">活力与历练：<b style="color:#a29bfe">【尚未解锁】</b> <span class="mount-badge off">二转开放</span></div>
              <div class="small" style="color:#aaa;margin-top:4px">规格规则（§7.10）：人物完成二转后开放活力系统与日常历练。</div>
            </div>
            <button class="btn primary small" id="vit-btn-demo-unlock">设为二转（体验活力与历练）</button>
          </div>
          <div class="hint">当前人物境界为【${["未转","一转","二转","三转"][h.rebirth || 0]}】，请先在「转生」面板中完成二转！</div>
        </div>
      `;
    }

    const curVit = v.current || 0;
    const maxVit = v.max || 1000;
    const fillPct = Math.min(100, (curVit / maxVit) * 100);

    return `
      <div class="vitality-wrap">
        <div class="hint mb8">
          【活力与历练系统（v1.3 §7.10 规格对齐）】二转开放；上限 1000 点，每小时 +10 点自然累积（离线读档自动补算）；活力挂机每点换 1100~2500 元神（按人物修为插值）；历练任务每日 3 次奖励元神与经验！
        </div>

        <!-- 活力存储与挂机 -->
        <div class="sworn-harmony-box">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <b>当前活力存量：</b>
              <span style="font-size:20px;font-weight:bold;color:#a29bfe">${curVit}</span> / ${maxVit} 点
              <span class="small" style="color:#aaa;margin-left:8px">（每小时自然恢复 +10 点，上限 1000）</span>
            </div>
            <div style="color:#ffd23a;font-weight:bold">
              当前修为：${h.xiuwei || 0} · 挂机转化率：${rate} 元神 / 点
            </div>
          </div>
          <div class="vitality-bar-wrap">
            <div class="vitality-bar-fill" style="width:${fillPct}%"></div>
          </div>
          <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;align-items:center">
            <span class="small" style="color:#ccc">🧘 活力打坐挂机：</span>
            <button class="btn small" data-vit-spend="50" ${curVit < 50 ? 'disabled' : ''}>挂机 50 点 (${(50 * rate).toLocaleString()}元神)</button>
            <button class="btn small" data-vit-spend="100" ${curVit < 100 ? 'disabled' : ''}>挂机 100 点 (${(100 * rate).toLocaleString()}元神)</button>
            <button class="btn small primary" data-vit-spend="all" ${curVit <= 0 ? 'disabled' : ''}>全部挂机 (${(curVit * rate).toLocaleString()}元神)</button>
          </div>
        </div>

        <!-- 历练日常任务 -->
        <div class="sworn-buff-card" style="background:rgba(108, 92, 231, 0.08);border-color:rgba(108, 92, 231, 0.3)">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-size:15px;font-weight:bold;color:#a29bfe">📜 历练日常任务 <span class="mount-badge ${v.dailyQuestsDone < 3 ? 'on' : 'off'}">今日进度：${v.dailyQuestsDone || 0} / 3 次</span></div>
              <div class="small" style="color:#ecf0f1;margin-top:4px">
                每次历练奖励：<b>元神 +50,000、人物经验 +80,000、银两 +20,000！</b>
              </div>
            </div>
            <button class="btn primary" id="vit-btn-do-quest" ${v.dailyQuestsDone >= 3 ? 'disabled' : ''}>
              ${v.dailyQuestsDone >= 3 ? '今日历练已达上限 (3/3)' : '执行历练任务'}
            </button>
          </div>
        </div>

        <!-- 演示辅助 -->
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px">
          <div style="font-weight:bold;color:#f39c12;margin-bottom:8px">⚙ 活力与历练测试辅助捷径：</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn tiny" id="vit-btn-fill">补满活力 (1000/1000)</button>
            <button class="btn tiny" id="vit-btn-reset-quest">重置今日历练次数 (0/3)</button>
          </div>
        </div>
      </div>
    `;
  }

  function bindVitalityEvents(container, h, rerender) {
    const bUnlock = $("#vit-btn-demo-unlock", container);
    if (bUnlock) bUnlock.onclick = () => {
      h.rebirth = 2;
      TSQ.Vitality.ensureVitality(h);
      toast("已设为二转，成功解锁活力与历练系统！");
      refreshAll(); rerender();
    };
    $all("[data-vit-spend]", container).forEach((b) => {
      b.onclick = () => {
        const mode = b.dataset.vitSpend;
        const cur = (h.vitality && h.vitality.current) || 0;
        const amt = mode === "all" ? cur : Number(mode);
        const r = TSQ.Vitality.cultivate(h, amt);
        if (r && r.msg) toast(r.msg);
        refreshAll(); rerender();
      };
    });
    const bQuest = $("#vit-btn-do-quest", container);
    if (bQuest) bQuest.onclick = () => {
      const r = TSQ.Vitality.doDailyQuest(h);
      if (r && r.msg) toast(r.msg);
      refreshAll(); rerender();
    };
    const bFill = $("#vit-btn-fill", container);
    if (bFill) bFill.onclick = () => {
      const r = TSQ.Vitality.restoreVitality(h);
      if (r && r.msg) toast(r.msg);
      refreshAll(); rerender();
    };
    const bResetQ = $("#vit-btn-reset-quest", container);
    if (bResetQ) bResetQ.onclick = () => {
      const r = TSQ.Vitality.resetDailyQuest(h);
      if (r && r.msg) toast(r.msg);
      refreshAll(); rerender();
    };
  }

  function renderVitality() {
    const h = state.hero;
    if (TSQ.Vitality) TSQ.Vitality.ensureVitality(h);
    const body = $("#vitality-body");
    if (!body) return;
    body.innerHTML = `<div class="modal-body">` + renderVitalityContent(h) + `</div>`;
    bindVitalityEvents(body, h, () => renderVitality());
  }

  function refreshAll() {
    G().save(state.hero);
    refreshTop();
    refreshQuickBag();
    refreshWorld();
  }

  // v0.5：可用 ?class=xiake|cike|shushi|xiuzhen 指定演示角色职业（默认修真）
  function pickClass() {
    const c = new URLSearchParams(location.search).get("class");
    return c && D().classes[c] ? c : "xiuzhen";
  }

  function init() {
    const params = new URLSearchParams(location.search);
    if (params.get("reset")) G().clearSave();
    state.hero = G().load() || G().createHero(pickClass(), "云起");
    const rb = $("#btn-reset-save");
    if (rb) rb.onclick = () => {
      if (confirm("重置存档并恢复演示角色？")) {
        G().clearSave(); state.hero = G().createHero(pickClass(), "云起");
        refreshAll(); toast("已重置存档（" + D().classes[state.hero.class_id].name + "）");
      }
    };
    G().syncVitals(state.hero);
    // v0.6：养成日志接到主界面日志区
    if (TSQ.PetAdvance) TSQ.PetAdvance.onLog = pushSysLog;
    // v0.7：天资 / 夫妻 / 生活日志同样接主界面日志区（战斗中会进战斗日志）
    if (TSQ.LifeSkill) TSQ.LifeSkill.onLog = pushSysLog;
    // v0.8：徽章 / 元神 日志接主界面日志区
    if (TSQ.Badge) TSQ.Badge.onLog = pushSysLog;
    if (TSQ.Yuanshen) TSQ.Yuanshen.onLog = pushSysLog;
    // v0.9：称号 / 法宝 日志接主界面日志区
    if (TSQ.Title) TSQ.Title.onLog = pushSysLog;
    if (TSQ.Fabao) TSQ.Fabao.onLog = pushSysLog;
    // v1.0：骑宠 / 兽魂 日志接主界面日志区
    if (TSQ.Mount) TSQ.Mount.onLog = pushSysLog;
    // v1.1：精灵 / 萝莉 日志接主界面日志区
    if (TSQ.Spirit) TSQ.Spirit.onLog = pushSysLog;
    // v1.2：结义 / 帮会 日志接主界面日志区
    if (TSQ.Sworn) TSQ.Sworn.onLog = pushSysLog;
    if (TSQ.Guild) TSQ.Guild.onLog = pushSysLog;
    // v1.3：转生 / 活力历练 日志接主界面日志区
    if (TSQ.Rebirth) TSQ.Rebirth.onLog = pushSysLog;
    if (TSQ.Vitality) TSQ.Vitality.onLog = pushSysLog;
    $("#nav-bag").onclick = () => openModal("bag");
    $("#nav-char").onclick = () => { state.charTab = "属性"; openModal("char"); };
    $("#nav-eq").onclick = () => { state.charTab = "装备"; openModal("char"); };
    const navBadge = $("#nav-badge");
    if (navBadge) navBadge.onclick = () => { state.charTab = "徽章"; openModal("char"); };
    const navYs = $("#nav-ys");
    if (navYs) navYs.onclick = () => { state.charTab = "元神"; openModal("char"); };
    const navSpirit = $("#nav-spirit");
    if (navSpirit) navSpirit.onclick = () => { state.charTab = "精灵"; openModal("char"); };
    $("#nav-skill").onclick = () => openModal("skill");
    $("#nav-forge").onclick = () => openModal("forge");
    $("#nav-pet").onclick = () => openModal("pet");
    const navMount = $("#nav-mount");
    if (navMount) navMount.onclick = () => openModal("mount");
    const navSworn = $("#nav-sworn");
    if (navSworn) navSworn.onclick = () => openModal("sworn");
    const navGuild = $("#nav-guild");
    if (navGuild) navGuild.onclick = () => openModal("guild");
    const navRebirth = $("#nav-rebirth");
    if (navRebirth) navRebirth.onclick = () => openModal("rebirth");
    const navVitality = $("#nav-vitality");
    if (navVitality) navVitality.onclick = () => openModal("vitality");
    $all("[data-close]").forEach((b) => b.onclick = closeModals);
    $all(".modal-layer").forEach((layer) => {
      layer.addEventListener("click", (e) => { if (e.target === layer) closeModals(); });
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModals(); });
    refreshAll();
    // v0.6 & v1.4：?petTab=进化|武装|炼化|融合|图鉴|组合 直接进宠物面板的对应页签
    const pt = new URLSearchParams(location.search).get("petTab");
    if (pt && ["悟性", "武装", "抗性", "进化", "炼化", "融合", "图鉴", "组合"].includes(pt)) state.petTab = pt;
    // v1.4：?ysTab=境界|地灵|经脉
    const yt = new URLSearchParams(location.search).get("ysTab");
    if (yt && ["境界", "地灵", "经脉"].includes(yt)) state.ysSubTab = yt;
    // v0.7：?open=skills&skillTab=天资|夫妻|生活 深链（也兼容旧的 ?open=skill）
    const st = params.get("skillTab");
    if (st && ["职业技能", "心法", "天资", "夫妻", "生活"].includes(st)) state.skillTab = st;
    const q = params.get("open");
    if (q === "bag" || q === "forge" || q === "pet" || q === "mount") openModal(q);
    if (q === "qichong") openModal("mount");
    if (q === "skill" || q === "skills") { if (!st) state.skillTab = "职业技能"; openModal("skill"); }
    if (q === "xinfa") { state.skillTab = "心法"; openModal("skill"); }
    if (q === "char" || q === "attr") { state.charTab = "属性"; openModal("char"); }
    if (q === "eq") { state.charTab = "装备"; openModal("char"); }
    // v1.2：结义 / 帮会 直达
    if (q === "sworn" || q === "jieyi") openModal("sworn");
    if (q === "guild" || q === "banghui") openModal("guild");
    // v1.3：转生 / 活力历练 直达
    if (q === "rebirth" || q === "zhuansheng") openModal("rebirth");
    if (q === "vitality" || q === "huoli" || q === "lilian") openModal("vitality");
    // v1.4：地灵 / 经脉 / 图鉴 / 组合 直达
    if (q === "meridian" || q === "jingmai") { state.charTab = "元神"; state.ysSubTab = "经脉"; openModal("char"); }
    if (q === "diling") { state.charTab = "元神"; state.ysSubTab = "地灵"; openModal("char"); }
    if (q === "codex" || q === "tujian") { state.petTab = "图鉴"; openModal("pet"); }
    if (q === "combo" || q === "zuhe") { state.petTab = "组合"; openModal("pet"); }
    // v0.8 ~ v1.4：?open=badge|ys|title|fabao|spirit|sworn|guild|rebirth|vitality 直达对应页签；?charTab=指定人物面板页签
    const ct = params.get("charTab");
    if (ct && ["装备", "属性", "转生", "历练", "经脉", "称号", "法宝", "心法", "徽章", "元神", "精灵", "结义", "帮会"].includes(ct)) { state.charTab = ct; openModal("char"); }
    if (q === "badge") { state.charTab = "徽章"; openModal("char"); }
    if (q === "ys" || q === "yuanshen") { state.charTab = "元神"; openModal("char"); }
    if (q === "title" || q === "chenghao") { state.charTab = "称号"; openModal("char"); }
    if (q === "fabao") { state.charTab = "法宝"; openModal("char"); }
    if (q === "spirit" || q === "jingling") { state.charTab = "精灵"; openModal("char"); }
    const mt = params.get("mountTab");
    if (mt) {
      if (mt.includes("技") || mt === "skill" || mt === "skills") state.mountTab = "骑宠技能";
      else if (mt.includes("魂") || mt === "soul") state.mountTab = "兽魂系统";
      else if (mt.includes("仙") || mt === "summon") state.mountTab = "神仙感应";
      else state.mountTab = "骑宠契约";
      openModal("mount");
    }
  }

  TSQ.UI = { init, refreshAll, openModal, toast, drawStick, state, renderChar, renderMount, renderSworn, renderGuild, renderRebirth, renderVitality };
  document.addEventListener("DOMContentLoaded", init);
})();
