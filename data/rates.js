/* =====================================================================
 * 《天书奇谭》成功率与消耗总表（唯一需要调参的文件）
 * ---------------------------------------------------------------------
 * 改完直接刷新浏览器即可生效（不需要构建）。
 * 约定：所有概率写成 0~1 的小数（0.85 = 85%）。
 * 设计原则：投入的材料 / 宝石 / 倍数越多 → 成功率越高（界面实时显示）。
 * 曲线说明见项目根目录《成功率设计.md》。
 * 注意：此文件是 JS（为了能写注释、并支持直接双击 index.html 打开），
 *       只改等号右边的数字即可，别删逗号和括号。
 * ===================================================================== */
window.TSQ = window.TSQ || {};
TSQ.RATES = {

  /* ---------- 1. 装备打造：倍数 → 颜色概率 ----------
   * 倍数 = 各材料「投入量 / 配方基础量」的加权平均（稀有材料权重更高），范围 1~5。
   * 5 倍 = 满倍：必出橙色、最大孔数固定 10（用户确认 5 倍即满倍）。
   * 每行是 [白, 绿, 蓝, 紫, 橙] 的百分比，非整数倍数按相邻两行线性插值。 */
  forge: {
    fullMultiple: 5,
    materialWeight: { rare: 3, normal: 1 },      // 玄兵/灵胄 = rare，其余 = normal
    colorTable: {
      1: [30, 35, 22, 11, 2],
      2: [15, 30, 30, 19, 6],
      3: [6, 20, 34, 28, 12],
      4: [2, 10, 28, 35, 25],
      5: [0, 0, 0, 0, 100]
    },
    // 最大孔数：未满倍时 = maxHolesBase + floor(倍数-1)，满倍 = 10
    maxHolesBase: 6,
    // 当前已开孔数 ~ 二项分布(最大孔数, p)，p = currentHoleP0 + currentHolePerMult × 倍数
    currentHoleP0: 0.30,
    currentHolePerMult: 0.07,
    silverPerLevel: 20                            // 打造银两 = 装备等级 × 此值 × 倍数
  },

  /* ---------- 2. 原料合成（N 合 1） ----------
   * 基数 = 一次投入几个低等材料；5 合 1 = 100%（附魔石 3 级以上例外）。 */
  synth: {
    material: { 2: 0.40, 3: 0.60, 4: 0.80, 5: 1.00 },
    enchantStoneHigh: { 2: 0.30, 3: 0.45, 4: 0.60, 5: 0.80 }   // 合成 3~6 级附魔石
  },

  /* ---------- 3. 升星 0→13 ----------
   * base[i] = 从 i 星升到 i+1 星、只放 1 颗宝石时的成功率。
   * 每多放 1 颗宝石（基数 2~5），成功率 × (1 + perExtraStone)，上限 cap。
   * 失败：宝石全部消失，并按 failDrop 掉星（星越高掉越多），装备不会碎。 */
  starUp: {
    max: 13,
    base: [0.95, 0.93, 0.90, 0.86, 0.82, 0.78, 0.72, 0.65, 0.58, 0.50, 0.38, 0.26, 0.15],
    perExtraStone: 0.25,
    cap: 0.99,
    failDrop: [                                   // [从星, 到星, 最少掉, 最多掉]
      [0, 3, 0, 0],
      [4, 6, 1, 1],
      [7, 9, 1, 2],
      [10, 12, 2, 3]
    ],
    statPerStar: 0.04,                            // 每星 +4% 白字基础属性
    silverPerTry: 200                             // 每次银两 = 此值 × (当前星+1)
  },

  /* ---------- 4. 铭刻 0→9 ----------
   * base[i] = 从 i 级到 i+1 级、放 1 颗生命石时的成功率；最多放 3 颗，每多 1 颗 × (1+perExtraStone)。
   * 失败：1~3 级掉 1 级，4~6 级掉 2 级，≥7 级直接掉回 1 级；放温玉则本次不掉级（温玉照样消耗）。 */
  mingke: {
    max: 9,
    base: [0.90, 0.82, 0.74, 0.66, 0.58, 0.50, 0.42, 0.34, 0.26],
    maxStones: 3,
    perExtraStone: 0.20,
    cap: 0.98,
    failDrop: { low: 1, mid: 2, resetFrom: 7 },  // resetFrom 级及以上失败 → 1 级
    weaponAtkPct: 0.03, armorDefPct: 0.02, armorHpPct: 0.005,
    silverPerTry: 300
  },

  /* ---------- 5. 打孔 ----------
   * base[k] = 打第 k 个孔（k 从 1 开始）只放 1 个打孔器的成功率；
   * 放 n 个打孔器：成功率 = 1 - (1-base)^n（多放更稳）。失败只消耗打孔器。 */
  drill: {
    base: [1, 1, 1, 1, 1, 0.95, 0.90, 0.70, 0.55, 0.40, 0.30, 0.20],
    maxTools: 3,
    newHoleWeight: { pink: 15, purple: 15, blue: 35, yellow: 35 },
    maxSameColor: 6
  },

  /* ---------- 6. 洗孔 ----------
   * 每次在 1 个空孔上放 1~5 张洗孔符；颜色按权重重随。
   * 多放洗孔符：粉红/淡紫的权重 × (1 + rareBoostPerExtra × (张数-1))。 */
  washHole: {
    weight: { pink: 12, purple: 12, blue: 38, yellow: 38 },
    rareBoostPerExtra: 0.6,
    maxCharms: 5,
    silverPerTry: 100
  },

  /* ---------- 7. 宝石合成 / 摘除 ----------
   * 3~5 块同级同种宝石合成 1 块高一级；失败全部消失。1~3 级用低级合成符，4~6 级用高级合成符。 */
  gemSynth: { 3: 0.60, 4: 0.80, 5: 1.00, maxLevel: 7, silver: 500 },
  gemRemove: { lowCharmDrop: 2 },                 // 低级摘除符：宝石降 2 级（≤2 级直接消失）

  /* ---------- 8. 附魔（5 件防具，60 级以上） ----------
   * base[L-1] = 附到 L 级、1 倍元神时的成功率；元神倍数 1~5，每多 1 倍 × (1+perExtraMult)。
   * 失败：附魔掉 1 级；放归元灵玉不掉级。 */
  enchant: {
    minItemLevel: 60,
    base: [0.95, 0.85, 0.70, 0.55, 0.40, 0.28],
    perExtraMult: 0.20,
    cap: 0.99,
    yuanshenPerLevel: 2000,                       // 元神 = 此值 × 目标级 × 倍数
    valuePerLevel: [2.4, 5.6, 9.6, 15.2, 22.4, 31.818] // 附魔值 = 装备等级 × 系数 × (1 + 星数×5%)；140 级 13 星 6 级 ≈ 7350（对齐参考截图）
  },

  /* ---------- 9. 通灵 ----------
   * 灵气 g = 通灵道具灵气 + 无上养元水 × waterBonus（上限 100）。
   * 条数：至少 1 条；第 k 条(k=2..5) 出现概率 = (g/100)^(k-1) × lineFactor。 */
  spirit: { maxLines: 5, waterBonus: 15, maxWater: 3, lineFactor: 0.95,
            pctStats: ["hp_pct"], valuePerLevel: 0.35 },

  /* ---------- 10. 开光（鉴定类装备） ----------
   * 每种开光道具 1 个时的出橙率；放 n 个：1-(1-p)^n（最多 3 个）。仙人之泪额外 +1 最大孔、开孔率更高。 */
  kaiguang: {
    tools: { kg_stone: 0.10, kg_nvshen: 0.30, kg_xianren: 0.15 },
    maxTools: 3,
    xianrenHoleBonus: 0.15
  },

  /* ---------- 11. 属性改造（魔术棱柱） ----------
   * 基础 1 个棱柱；每锁定 1 条 +1 棱柱 +lockSilver 银；首次锁定的词条 +10%。
   * 额外多放棱柱（0~4）：稀有词条（爆击/忽视物防/忽视法防/韧性）出现率 + rarePerExtra。 */
  reforge: { basePrism: 1, prismPerLock: 1, lockSilver: 1000, silver: 800,
             rareBase: 0.03, rarePerExtra: 0.04, maxExtra: 4, lockBonus: 0.10 },

  /* ---------- 12. 套装改造 ----------
   * 基础材料必定成功；多放魔锻锭不影响（规格写的是不失败）。 */
  setReform: { minLevel: 110, mats: { xuanbing_frag: 5, moduan: 3, lost_manual: 1 } },

  /* ---------- 13. 觉醒（≥140、光芒橙、13星、9铭刻、无宝石、已绑定、三转） ----------
   * 玄兵一等投入倍数 1~5：成功率 = table[倍数]（5 倍 = 100%）。失败材料消失。 */
  awaken: { baseXuanbing: 10, table: { 1: 0.20, 2: 0.40, 3: 0.60, 4: 0.80, 5: 1.00 },
            capDefault: 60, capMax: 160, capPerBodhi: 10, statPerLevel: 0.01,
            expPerLevel: 53.55, expPerLingyuan: 100 }, // 注灵升级所需经验 = expPerLevel × 当前觉醒等级（60 级 = 3213，对齐截图）

  /* ---------- 14. 分解 ----------
   * 产出精华数 = colorBase[颜色] + 星数×perStar + 宝石数×perGem（取整）。 */
  decompose: { colorBase: { green: 1, blue: 2, purple: 3, orange: 5 }, perStar: 0.3, perGem: 0.5,
               nextTierChance: 0.15 },

  /* ---------- 15. 耐久与修理 ----------
   * 每场战斗胜利每件装备 -lossPerBattle；归零属性失效。
   * 普通修理（银票）：耐久上限 -normalMaxLossPct；高级修理（银两×advancedCostMult）不降上限。 */
  durability: { lossPerBattle: 1, normalMaxLossPct: 0.05, costPerPoint: 2, advancedCostMult: 3 }
};
