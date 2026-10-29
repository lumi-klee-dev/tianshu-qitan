/* 元神·地灵 与 经脉 逻辑系统 v1.4
   ─────────────────────────────────────────────────────────────────────
   功能：
   - 地灵（玄/毒/火/冰 4 项属性减伤，上限 40 级 / 减伤封顶 60%）
   - 地灵升级（消耗元神 + 银票/银两）
   - 经脉（奇经八脉，每脉 6 穴，每穴 10 层）
   - 经脉升层（消耗 技能经验 + 人物经验）与第 10 层激活（消耗 1 个大还丹）
   - 激活第 5/6 穴技能强化标记与属性加成
   - 一级属性加成汇入 totalPrimary、减伤抗性汇入 combatStats
   - 演示礼包限领一次（flags.meridianDemoClaimed）
   ─────────────────────────────────────────────────────────────────────*/
(function () {
  window.TSQ = window.TSQ || {};

  const MD = () => TSQ.MeridianData;

  function log(msg) {
    if (typeof TSQ.Meridian.onLog === "function") {
      TSQ.Meridian.onLog(msg);
    }
  }

  function ensureStructure(hero) {
    if (!hero) return;
    hero.diling = hero.diling || {};
    MD().DILING.ELEMENTS.forEach((el) => {
      if (typeof hero.diling[el.id] !== "number") {
        hero.diling[el.id] = 0;
      }
    });

    hero.meridians = hero.meridians || {};
    MD().MERIDIAN.MERIDIANS.forEach((m) => {
      if (!hero.meridians[m.id]) {
        hero.meridians[m.id] = {
          id: m.id,
          points: m.points.map((pname) => ({
            name: pname,
            layer: 0,
            activated: false
          }))
        };
      } else {
        const curM = hero.meridians[m.id];
        if (!Array.isArray(curM.points) || curM.points.length !== m.points.length) {
          curM.points = m.points.map((pname, idx) => {
            const oldP = (curM.points && curM.points[idx]) || {};
            return {
              name: pname,
              layer: typeof oldP.layer === "number" ? oldP.layer : 0,
              activated: !!oldP.activated
            };
          });
        }
      }
    });

    hero.consumables = hero.consumables || {};
    if (typeof hero.consumables[MD().MERIDIAN.DAHUANDAN_ID] !== "number") {
      hero.consumables[MD().MERIDIAN.DAHUANDAN_ID] = 0;
    }

    hero.flags = hero.flags || {};
    if (typeof hero.flags.meridianDemoClaimed !== "boolean") {
      hero.flags.meridianDemoClaimed = false;
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

  /* ══════════ 地灵（§4.3） ══════════ */
  function dilingLevel(hero, elemId) {
    if (!hero || !hero.diling) return 0;
    return hero.diling[elemId] || 0;
  }

  function dilingReducePct(hero, elemId) {
    const lv = dilingLevel(hero, elemId);
    return Math.min(MD().DILING.MAX_REDUCE, lv * MD().DILING.REDUCE_PER_LEVEL);
  }

  function canUpgradeDiLing(hero, elemId) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);
    const elemDef = MD().DILING.ELEMENTS.find((e) => e.id === elemId);
    if (!elemDef) return { ok: false, msg: "未知的地灵属性" };

    const curLv = dilingLevel(hero, elemId);
    if (curLv >= MD().DILING.MAX_LEVEL) {
      return { ok: false, msg: `【${elemDef.name}】已达到最高境界（Lv${MD().DILING.MAX_LEVEL}，减伤 60%）！` };
    }

    const ysCost = MD().DILING.costYuanshen(curLv);
    const curYs = (hero.yuanshen && hero.yuanshen.value) || 0;
    if (curYs < ysCost) {
      return { ok: false, msg: `元神值不足！升级【${elemDef.name}】需 ${ysCost.toLocaleString()} 元神（当前：${curYs.toLocaleString()}）。` };
    }

    const silverCost = MD().DILING.costSilver(curLv);
    const curSilverTotal = (hero.yinpiao || 0) + (hero.silver || 0);
    if (curSilverTotal < silverCost) {
      return { ok: false, msg: `银两/银票不足！升级【${elemDef.name}】需 ${silverCost.toLocaleString()} 银（当前可用：${curSilverTotal.toLocaleString()}）。` };
    }

    return { ok: true, elemDef, curLv, nextLv: curLv + 1, ysCost, silverCost };
  }

  function upgradeDiLing(hero, elemId) {
    const chk = canUpgradeDiLing(hero, elemId);
    if (!chk.ok) return chk;

    // 扣除元神
    hero.yuanshen.value -= chk.ysCost;

    // 扣除银票（优先扣银票，不足扣银两）
    let remainSilver = chk.silverCost;
    if ((hero.yinpiao || 0) >= remainSilver) {
      hero.yinpiao -= remainSilver;
    } else {
      remainSilver -= (hero.yinpiao || 0);
      hero.yinpiao = 0;
      hero.silver = Math.max(0, (hero.silver || 0) - remainSilver);
    }

    // 等级提升
    hero.diling[elemId] = chk.nextLv;
    const newReduce = dilingReducePct(hero, elemId);
    const msg = `⚡ 消耗 ${chk.ysCost.toLocaleString()} 元神与 ${chk.silverCost.toLocaleString()} 银两，【${chk.elemDef.name}】成功提升至 Lv${chk.nextLv}！${chk.elemDef.element}属性天资减伤提升至 ${(newReduce * 100).toFixed(1)}%！`;
    log(msg);
    return { ok: true, msg, level: chk.nextLv, reducePct: newReduce };
  }

  function dilingBonus(hero) {
    const res = { res_xuan: 0, res_du: 0, res_huo: 0, res_bing: 0 };
    if (!hero || !hero.diling) return res;
    MD().DILING.ELEMENTS.forEach((el) => {
      res[el.statKey] = dilingReducePct(hero, el.id);
    });
    return res;
  }

  /* ══════════ 经脉（§4.4） ══════════ */
  function canUpgradePoint(hero, meridianId, pointIndex) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);

    const mDef = MD().MERIDIAN.MERIDIANS.find((m) => m.id === meridianId);
    if (!mDef) return { ok: false, msg: "未知的经脉" };

    const mState = hero.meridians[meridianId];
    if (!mState || !mState.points[pointIndex]) return { ok: false, msg: "未找到穴位数据" };

    const pt = mState.points[pointIndex];
    if (pt.layer >= MD().MERIDIAN.LAYERS_PER_POINT) {
      return { ok: false, msg: `【${mDef.name} · ${pt.name}穴】已修炼至最高十层圆满！` };
    }

    // 顺序检查：上一穴位必须激活（第 1 穴无需前置）
    if (pointIndex > 0) {
      const prevPt = mState.points[pointIndex - 1];
      if (!prevPt.activated) {
        return { ok: false, msg: `须先将前一穴位【${prevPt.name}穴】突破至第十层并激活，方可打通此穴！` };
      }
    }

    const isActivating = (pt.layer === 9); // 9升10为激活
    const expCost = MD().MERIDIAN.costExp(pt.layer);
    const skillExpCost = MD().MERIDIAN.costSkillExp(pt.layer);

    if ((hero.exp || 0) < expCost) {
      return { ok: false, msg: `人物经验不足！修炼【${pt.name}穴】需消耗 ${expCost.toLocaleString()} 人物经验（当前：${(hero.exp || 0).toLocaleString()}）。` };
    }
    if ((hero.skillExp || 0) < skillExpCost) {
      return { ok: false, msg: `技能经验不足！修炼【${pt.name}穴】需消耗 ${skillExpCost.toLocaleString()} 技能经验（当前：${(hero.skillExp || 0).toLocaleString()}）。` };
    }

    if (isActivating) {
      const pillCount = (hero.consumables && hero.consumables[MD().MERIDIAN.DAHUANDAN_ID]) || 0;
      if (pillCount < 1) {
        return { ok: false, msg: `突破至第十层「激活穴位」额外需要 1 颗【${MD().MERIDIAN.DAHUANDAN_NAME}】！可在商城或演示礼包领取。` };
      }
    }

    return {
      ok: true,
      mDef,
      pointName: pt.name,
      curLayer: pt.layer,
      nextLayer: pt.layer + 1,
      isActivating,
      expCost,
      skillExpCost
    };
  }

  function upgradePoint(hero, meridianId, pointIndex) {
    const chk = canUpgradePoint(hero, meridianId, pointIndex);
    if (!chk.ok) return chk;

    // 扣除经验
    hero.exp -= chk.expCost;
    hero.skillExp -= chk.skillExpCost;

    const mState = hero.meridians[meridianId];
    const pt = mState.points[pointIndex];

    if (chk.isActivating) {
      hero.consumables[MD().MERIDIAN.DAHUANDAN_ID] -= 1;
      pt.layer = 10;
      pt.activated = true;

      let extraMsg = "";
      if (pointIndex === 4 && chk.mDef.boost5) {
        extraMsg = ` 🌟 激活第5穴！触发【${chk.mDef.boost5.name}】：${chk.mDef.boost5.desc}`;
      } else if (pointIndex === 5 && chk.mDef.boost6) {
        extraMsg = ` 🏆 激活第6穴！触发【${chk.mDef.boost6.name}】：${chk.mDef.boost6.desc}`;
      }

      const msg = `🎉 消耗 1 颗【${MD().MERIDIAN.DAHUANDAN_NAME}】与资材，【${chk.mDef.name} · ${pt.name}穴】突破十层大圆满成功激活！${chk.mDef.attrName}+1！${extraMsg}`;
      log(msg);
      return { ok: true, msg, layer: 10, activated: true };
    } else {
      pt.layer += 1;
      const msg = `⚡ 消耗 ${chk.expCost.toLocaleString()} 人物经验与 ${chk.skillExpCost.toLocaleString()} 技能经验，【${chk.mDef.name} · ${pt.name}穴】提升至 第${pt.layer}层！${chk.mDef.attrName}+1！`;
      log(msg);
      return { ok: true, msg, layer: pt.layer, activated: false };
    }
  }

  // 经脉汇总属性（一级属性加成 + 技能强化标记列表）
  function meridianBonus(hero) {
    const primary = { str: 0, con: 0, agi: 0, int: 0, fai: 0 };
    const boosts = [];
    if (!hero || !hero.meridians) return { primary, boosts };

    MD().MERIDIAN.MERIDIANS.forEach((m) => {
      const mState = hero.meridians[m.id];
      if (!mState || !Array.isArray(mState.points)) return;

      mState.points.forEach((pt, pIdx) => {
        // 每层 +1 对应一级属性
        if (pt.layer > 0) {
          primary[m.attrKey] = (primary[m.attrKey] || 0) + pt.layer;
        }

        // 第 5 穴激活加成
        if (pIdx === 4 && pt.activated && m.boost5) {
          boosts.push({
            meridian: m.name,
            point: pt.name,
            type: "skill_5",
            name: m.boost5.name,
            desc: m.boost5.desc
          });
          if (m.boost5.bonus) {
            Object.entries(m.boost5.bonus).forEach(([k, v]) => {
              primary[k] = (primary[k] || 0) + v;
            });
          }
        }

        // 第 6 穴激活加成
        if (pIdx === 5 && pt.activated && m.boost6) {
          boosts.push({
            meridian: m.name,
            point: pt.name,
            type: "skill_6",
            name: m.boost6.name,
            desc: m.boost6.desc
          });
          if (m.boost6.bonus) {
            Object.entries(m.boost6.bonus).forEach(([k, v]) => {
              primary[k] = (primary[k] || 0) + v;
            });
          }
        }
      });
    });

    return { primary, boosts };
  }

  // 演示礼包：限领一次（flags.meridianDemoClaimed）
  function claimDemoPack(hero) {
    if (!hero) return { ok: false, msg: "无角色数据" };
    ensureStructure(hero);
    if (hero.flags.meridianDemoClaimed) {
      return { ok: false, msg: "演示礼包每位角色仅限领取一次！" };
    }

    hero.flags.meridianDemoClaimed = true;
    hero.consumables[MD().MERIDIAN.DAHUANDAN_ID] = (hero.consumables[MD().MERIDIAN.DAHUANDAN_ID] || 0) + 10;
    hero.skillExp = (hero.skillExp || 0) + 500000;
    hero.exp = (hero.exp || 0) + 1000000;

    const msg = `⚙ 演示辅助：已成功领取经脉礼包！获得【${MD().MERIDIAN.DAHUANDAN_NAME}】×10、技能经验 +500,000、人物经验 +1,000,000！`;
    log(msg);
    return { ok: true, msg };
  }

  TSQ.Meridian = {
    initHero,
    migrate,
    dilingLevel,
    dilingReducePct,
    canUpgradeDiLing,
    upgradeDiLing,
    dilingBonus,
    canUpgradePoint,
    upgradePoint,
    meridianBonus,
    claimDemoPack,
    onLog: null
  };
})();

