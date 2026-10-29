// Node-based verification script for Round 11
const fs = require('fs');
const vm = require('vm');

// Mock browser environment
const window = {};
global.window = window;
global.TSQ = {};
window.TSQ = global.TSQ;
global.document = {
  addEventListener: () => {},
  getElementById: () => null,
  querySelectorAll: () => []
};
global.localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = v; },
  removeItem(k) { delete this.data[k]; }
};

function loadScript(path) {
  const code = fs.readFileSync(path, 'utf8');
  vm.runInThisContext(code, { filename: path });
}

// Load files in the exact order of index.html
loadScript('./data/rates.js');
loadScript('./js/data.js');
loadScript('./js/equip-data.js');
loadScript('./js/equip.js');
loadScript('./js/pet.js');
loadScript('./js/pet-advance-data.js');
loadScript('./js/pet-advance.js');
loadScript('./js/skill-data.js');
loadScript('./js/skill.js');
loadScript('./js/life-skill-data.js');
loadScript('./js/life-skill.js');
loadScript('./js/badge-data.js');
loadScript('./js/badge.js');
loadScript('./js/yuanshen.js');
loadScript('./js/title-data.js');
loadScript('./js/title.js');
loadScript('./js/fabao-data.js');
loadScript('./js/fabao.js');
loadScript('./js/mount-data.js');
loadScript('./js/mount.js');
loadScript('./js/spirit-data.js');
loadScript('./js/spirit.js');
loadScript('./js/sworn-data.js');
loadScript('./js/sworn.js');
loadScript('./js/guild-data.js');
loadScript('./js/guild.js');
loadScript('./js/rebirth-data.js');
loadScript('./js/rebirth.js');
loadScript('./js/vitality.js');
loadScript('./js/meridian-data.js');
loadScript('./js/meridian.js');
loadScript('./js/pet-codex.js');
loadScript('./js/game.js');

console.log("=== STARTING ROUND 11 TESTS ===");

const TSQ = window.TSQ;
let allPassed = true;
function assert(cond, msg) {
  if (cond) {
    console.log("  [PASS]", msg);
  } else {
    console.error("  [FAIL]", msg);
    allPassed = false;
  }
}

// Test 1: New Hero Rebirth Items & Defaults
console.log("\n--- Test 1: New Hero Creation & Rebirth Items ---");
const hero = TSQ.Game.createHero("xiuzhen", "测试者");
assert(hero.rebirth === 3, "New hero is rebirth 3 by default");
assert(hero.consumables.tianshu === 1, "New hero tianshu count is 1 (not 3)");
assert(hero.consumables.tianjuan_lingdan === 1, "New hero tianjuan_lingdan count is 1 (not 3)");
assert(hero.consumables.tianci_zhufu === 1, "New hero tianci_zhufu count is 1 (not 3)");

// Test 2: P2 Reset to Unreborn (0转)
console.log("\n--- Test 2: Reset to Unreborn (0转 Lv75) ---");
hero.rebirth = 0;
hero.rebirthAptBonus = 0;
hero.alliance = null;
TSQ.Rebirth.setDemoLevel(hero, 75);
assert(hero.rebirth === 0, "Hero rebirth is 0");
assert(hero.level === 75, "Hero level is 75");
assert(hero.alliance === null, "Hero alliance cleared");

// Verify 0 -> 1 -> 2 -> 3 rebirth flow
console.log("\n--- Test 2b: Rebirth 0 -> 1 -> 2 -> 3 Workflow ---");
const canRb1 = TSQ.Rebirth.canRebirth1(hero);
assert(canRb1.ok, "Can do rebirth 1 at Lv75 with tianshu: " + (canRb1.msg || "OK"));
const r1 = TSQ.Rebirth.doRebirth1(hero);
assert(r1.ok && hero.rebirth === 1, "Rebirth 1 succeeded, rebirth is now 1, level is " + hero.level);

TSQ.Rebirth.setDemoLevel(hero, 134);
const canRb2 = TSQ.Rebirth.canRebirth2(hero);
assert(canRb2.ok, "Can do rebirth 2 at Lv134 with tianjuan_lingdan");
const r2 = TSQ.Rebirth.doRebirth2(hero);
assert(r2.ok && hero.rebirth === 2, "Rebirth 2 succeeded, rebirth is now 2, level is " + hero.level);

TSQ.Rebirth.setDemoLevel(hero, 162);
hero.pets.forEach(p => p.fighting = false); // unsummon pets for rebirth 3
if (hero.mount) hero.mount.riding = false;
const canRb3 = TSQ.Rebirth.canRebirth3(hero);
assert(canRb3.ok, "Can do rebirth 3 at Lv162 with tianci_zhufu");
const r3 = TSQ.Rebirth.doRebirth3(hero);
assert(r3.ok && hero.rebirth === 3 && hero.level === 30, "Rebirth 3 succeeded, rebirth is 3, level reset to 30");

// Test 3: Migrate old v1.3 save (must NOT grant resources)
console.log("\n--- Test 3: Old Save Migration (No Resource Leaks) ---");
const oldSave = {
  save_version: 2,
  name: "旧档角色",
  class_id: "xiake",
  rebirth: 2,
  level: 130,
  exp: 500,
  silver: 12345,
  yinpiao: 6789,
  yuanshen: { lv: 2, exp: 10, value: 50000 },
  primary: { str: 100, con: 80, agi: 50, int: 20, fai: 20 },
  consumables: { tianshu: 0 },
  pets: [],
  flags: {}
};
const migrated = TSQ.Game.migrate(JSON.parse(JSON.stringify(oldSave)));
assert(migrated.silver === 12345, "Silver unchanged after migrate");
assert(migrated.yinpiao === 6789, "Yinpiao unchanged after migrate");
assert(migrated.yuanshen.value === 50000, "Yuanshen value unchanged after migrate");
assert(migrated.exp === 500, "Exp unchanged after migrate");
assert(migrated.consumables.dahuandan === 0, "Dahuandan defaulted to 0, not gifted");
assert(migrated.diling.xuan === 0 && migrated.diling.bing === 0, "Diling defaulted to 0");
assert(migrated.petCodex.level === 0, "Pet codex defaulted to 0");
assert(migrated.flags.meridianDemoClaimed === false, "Meridian gift claim flag is false");

// Test 4: Di Ling System (4 elements, cost, cap 60%)
console.log("\n--- Test 4: Di Ling (玄/毒/火/冰 4项减伤) ---");
const testHero = TSQ.Game.createHero("xiake", "测试英雄");
testHero.yuanshen.value = 5000000;
testHero.yinpiao = 100000;

assert(TSQ.Meridian.dilingLevel(testHero, "xuan") === 0, "Initial xuan level is 0");
assert(TSQ.Meridian.dilingReducePct(testHero, "xuan") === 0, "Initial xuan reduce is 0%");

const upResult = TSQ.Meridian.upgradeDiLing(testHero, "xuan");
assert(upResult.ok, "Upgrade xuan level 1 succeeded");
assert(TSQ.Meridian.dilingLevel(testHero, "xuan") === 1, "Xuan level is 1");
assert(Math.abs(TSQ.Meridian.dilingReducePct(testHero, "xuan") - 0.015) < 1e-6, "Xuan reduce is 1.5%");

// Max level test
testHero.diling.xuan = 40;
assert(TSQ.Meridian.dilingReducePct(testHero, "xuan") === 0.60, "Xuan reduce capped at 60% (Lv40)");
const upMax = TSQ.Meridian.upgradeDiLing(testHero, "xuan");
assert(!upMax.ok, "Cannot upgrade past Lv40");

// Check combatStats
testHero.diling = { xuan: 10, du: 20, huo: 30, bing: 40 };
const stats = TSQ.Game.combatStats(testHero);
assert(Math.abs(stats.res_xuan - 0.15) < 1e-6, "combatStats.res_xuan is 15%");
assert(Math.abs(stats.res_du - 0.30) < 1e-6, "combatStats.res_du is 30%");
assert(Math.abs(stats.res_huo - 0.45) < 1e-6, "combatStats.res_huo is 45%");
assert(Math.abs(stats.res_bing - 0.60) < 1e-6, "combatStats.res_bing is 60%");

// Test 5: Meridian System (8脉 x 6穴 x 10层)
console.log("\n--- Test 5: Meridian (8脉 x 6穴 x 10层, 大还丹激活) ---");
testHero.exp = 5000000;
testHero.skillExp = 5000000;
testHero.consumables.dahuandan = 0;

// Test sequential unlocking: cannot upgrade point 1 before point 0 is activated
const upP1Locked = TSQ.Meridian.canUpgradePoint(testHero, "ren", 1);
assert(!upP1Locked.ok, "Point 1 is locked before Point 0 is activated");

// Level point 0 up to 9
for (let l = 0; l < 9; l++) {
  const r = TSQ.Meridian.upgradePoint(testHero, "ren", 0);
  assert(r.ok, `Ren Point 0 upgraded to layer ${l + 1}`);
}
assert(testHero.meridians.ren.points[0].layer === 9, "Ren Point 0 is layer 9");

// Attempt activation without dahuandan
const upActNoPill = TSQ.Meridian.canUpgradePoint(testHero, "ren", 0);
assert(!upActNoPill.ok, "Cannot activate point 0 at layer 9 without dahuandan");

// Give 1 dahuandan and activate
testHero.consumables.dahuandan = 1;
const upActSuccess = TSQ.Meridian.upgradePoint(testHero, "ren", 0);
assert(upActSuccess.ok && testHero.meridians.ren.points[0].layer === 10 && testHero.meridians.ren.points[0].activated, "Point 0 activated to layer 10 with dahuandan");
assert(testHero.consumables.dahuandan === 0, "Dahuandan consumed");

// Check primary attribute bonus
const mb = TSQ.Meridian.meridianBonus(testHero);
assert(mb.primary.con >= 10, "Ren meridian adds at least 10 con for 10 layers");

// Test demo meridian pack (limited to 1)
testHero.flags.meridianDemoClaimed = false;
const claimM = TSQ.Meridian.claimDemoPack(testHero);
assert(claimM.ok && testHero.consumables.dahuandan === 10, "Meridian demo pack granted 10 dahuandan");
const claimM2 = TSQ.Meridian.claimDemoPack(testHero);
assert(!claimM2.ok, "Meridian demo pack cannot be claimed twice");

// Test 6: Pet Codex & Combos
console.log("\n--- Test 6: Pet Codex & Combos ---");
testHero.flags.petComboClaimed = false;
const claimP = TSQ.PetCodex.claimDemoPack(testHero);
assert(claimP.ok, "Pet combo demo pack granted pets");
const claimP2 = TSQ.PetCodex.claimDemoPack(testHero);
assert(!claimP2.ok, "Pet combo demo pack cannot be claimed twice");

// Check mounts in testHero.mount.owned
assert(testHero.mount.owned.mount_lingyu != null, "Lingyu mount available for sacrifice");
testHero.mount.riding = true;
testHero.mount.current = "mount_langsihai";

// Cannot eat currently ridden mount
const eatRiding = TSQ.PetCodex.eatMount(testHero, "mount_langsihai");
assert(!eatRiding.ok, "Cannot eat currently ridden mount");

// Eat lingyu mount -> codex level +1
const eatNonRiding = TSQ.PetCodex.eatMount(testHero, "mount_lingyu");
assert(eatNonRiding.ok && testHero.petCodex.level === 1, "Eaten Lingyu mount, codex level is 1");
assert(testHero.mount.owned.mount_lingyu == null, "Lingyu mount removed from owned");

// Check pet stats with codex bonus
const samplePet = testHero.pets[0];
const petStatsBefore = TSQ.Pet.stats(samplePet, testHero);
assert(petStatsBefore.hp > 0, "Pet stats calculated successfully: HP=" + petStatsBefore.hp);

// Test Dundun combo
console.log("\n--- Test 6b: Dundun Combo (+8000 HP) ---");
const dun1 = testHero.pets.find(p => p.species === "dun");
const dun3 = testHero.pets.find(p => p.species === "dundundun");
const dun4 = testHero.pets.find(p => p.species === "dundundundun");
assert(dun1 && dun3 && dun4, "All 3 Dundun pets present in hero pets");

// Sacrifice dun
const rD1 = TSQ.PetCodex.eatPetForCombo(testHero, "combo_dundun", dun1.uid);
assert(rD1.ok, "Sacrificed 'dun'");
const rD3 = TSQ.PetCodex.eatPetForCombo(testHero, "combo_dundun", dun3.uid);
assert(rD3.ok, "Sacrificed 'dundundun'");
const rD4 = TSQ.PetCodex.eatPetForCombo(testHero, "combo_dundun", dun4.uid);
assert(rD4.ok && rD4.activated, "Sacrificed 'dundundundun' and Dundun combo activated!");

// Verify Dundun combo gives +8000 HP to pet stats
const petStatsAfter = TSQ.Pet.stats(samplePet, testHero);
console.log("Pet HP before Dundun combo:", petStatsBefore.hp, "after Dundun combo:", petStatsAfter.hp);
assert(petStatsAfter.hp >= petStatsBefore.hp + 8000, "Pet HP increased by at least 8000 from Dundun combo");

console.log("\n=== ALL ROUND 11 TESTS PASSED: " + allPassed + " ===");
process.exit(allPassed ? 0 : 1);
