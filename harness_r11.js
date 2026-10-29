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
let F=0;const ok=(c,m)=>{console.log((c?'  PASS ':'  FAIL ')+m);if(!c)F++;};
const G=TSQ.Game,M=TSQ.Meridian,C=TSQ.PetCodex;
// new hero rebirth items
const h=G.createHero("xiake","t");
ok(['tianshu','tianjuan_lingdan','tianci_zhufu'].every(k=>h.consumables[k]===1),'new hero 转生道具各1: '+JSON.stringify([h.consumables.tianshu,h.consumables.tianjuan_lingdan,h.consumables.tianci_zhufu]));
// save serializable
let js;try{js=JSON.stringify(h);ok(true,'hero JSON serializable');}catch(e){ok(false,'hero JSON serializable: '+e.message);}
// v1.3 save -> v1.4
const old=JSON.parse(js||'{}');delete old.diling;delete old.meridians;delete old.petCodex;delete old.petCombos;
if(old.consumables)delete old.consumables.dahuandan; if(old.flags){delete old.flags.meridianDemoClaimed;delete old.flags.petComboClaimed;}
(old.pets||[]).forEach(p=>delete p._ownerHero);
const snap=JSON.stringify({s:old.silver,y:old.yinpiao,ys:old.yuanshen,c:old.consumables,e:old.exp,pets:(old.pets||[]).length,m:old.mount});
localStorage.setItem('tsq_save_v2',JSON.stringify(old));
const L=G.load();ok(!!L,'v1.3 save loads');
const after=JSON.parse(JSON.stringify({s:L.silver,y:L.yinpiao,ys:L.yuanshen,c:Object.fromEntries(Object.entries(L.consumables).filter(([k])=>k!=='dahuandan')),e:L.exp,pets:L.pets.length,m:L.mount}));
ok(JSON.stringify(after)===JSON.stringify(JSON.parse(snap)),'migrate no freebies / no loss');
ok(L.consumables.dahuandan===0&&L.petCodex.level===0&&Object.values(L.diling).every(v=>v===0),'new fields zeroed');
G.save(L);ok(localStorage.getItem('tsq_save_v2').length>100&&JSON.parse(localStorage.getItem('tsq_save_v2')).diling,'re-save persists v1.4 fields');
// diling cap
const d=G.createHero("xiake","d");d.yuanshen.value=1e12;d.silver=1e12;d.yinpiao=1e12;
let n=0;while(M.upgradeDiLing(d,'xuan').ok&&n<100)n++;
ok(n===40&&Math.abs(M.dilingReducePct(d,'xuan')-0.6)<1e-9,'地灵 cap Lv40/60% (n='+n+')');
ok(Math.abs((G.combatStats(d).res_xuan||0)-0.6)<1e-9,'combatStats res_xuan 0.6');
// meridian
const m=G.createHero("xiake","m");m.exp=1e12;m.skill_exp=1e12;if(m.skillExp!==undefined)m.skillExp=1e12;
const con0=G.totalPrimary(m).con;let r;
for(let i=0;i<9;i++){r=M.upgradePoint(m,'ren',0);if(!r.ok){console.log(r.msg);break;}}
m.consumables.dahuandan=0;ok(!M.upgradePoint(m,'ren',0).ok,'经脉 L10 blocked without 大还丹');
m.consumables.dahuandan=1;ok(M.upgradePoint(m,'ren',0).ok&&m.consumables.dahuandan===0,'大还丹 breakthrough consumed');
ok(G.totalPrimary(m).con>=con0+10,'经脉 con +'+(G.totalPrimary(m).con-con0));
ok(!M.upgradePoint(m,'ren',2).ok,'next 穴 locked out of order');
ok(M.claimDemoPack(m).ok&&!M.claimDemoPack(m).ok,'meridian demo once');
// codex + combos
const p=G.createHero("xiake","p");C.claimDemoPack(p);ok(!C.claimDemoPack(p).ok,'combo demo once');
const fp=G.fightingPet(p);const hp0=TSQ.Pet.stats?TSQ.Pet.stats(fp).hp:null;
['dun','dundundun','dundundundun'].forEach(sp=>{const x=p.pets.find(q=>q.species===sp&&!q.fighting);r=C.eatPetForCombo(p,'combo_dundun',x.uid);});
const cid=Object.keys(p.petCombos).find(k=>/dun/.test(k));
ok(p.petCombos[cid].activated,'炖炖 combo active ('+cid+')');
if(hp0!==null)ok(TSQ.Pet.stats(fp).hp-hp0>=8000,'炖炖 +8000 HP: '+(TSQ.Pet.stats(fp).hp-hp0));
const keys=Object.keys(p.mount.owned||{});const lv0=p.petCodex.level;
const rest=keys.find(k=>!(p.mount.riding&&p.mount.current===k));
if(p.mount.riding&&p.mount.current)ok(!C.eatMount(p,p.mount.current).ok,'cannot eat ridden mount');
if(rest)ok(C.eatMount(p,rest).ok&&p.petCodex.level===lv0+1&&!p.mount.owned[rest],'图鉴 eats 骑宠 +1');
p.petCodex.level=48;ok(!C.eatMount(p,keys.find(k=>p.mount.owned[k]&&k!==p.mount.current)||'x').ok,'图鉴 cap 48');
try{JSON.stringify(p);ok(true,'serializable after combos');}catch(e){ok(false,'serial '+e.message);}
console.log(F?'FAILURES '+F:'ALL PASS');
