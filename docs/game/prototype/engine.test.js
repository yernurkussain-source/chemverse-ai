// Химия қозғалтқышының тесттері. Іске қосу: node engine.test.js
// Claude Code бұларды Vitest-ке (src/features/chem-engine/*.test.ts) көшіреді — сандар осы күйінде қалуы керек.
const fs=require('fs'), vm=require('vm'), path=require('path'), assert=require('assert');
const ctx={console}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'engine.js'),'utf8')+';this.E={newVessel,addLiquid,addPiece,step,pH,REAG_BY,transfer,absorbCO2,residueOf,get S(){return ENGINE_STATS}}',ctx);
const {newVessel,addLiquid,addPiece,step,pH,REAG_BY:R,transfer,absorbCO2}=ctx.E;
const near=(a,b,tol,msg)=>assert.ok(Math.abs(a-b)<=tol,`${msg}: ${a} ≠ ${b} ± ${tol}`);
let pass=0; const t=(name,fn)=>{ fn(); pass++; console.log('✓',name); };
const sol=(id,mL,cap=100)=>{ const v=newVessel('x',cap,'beaker'); addLiquid(v,R[id].ions,mL); return v; };

t('Күшті қышқыл мен негіздің pH-ы',()=>{ near(pH(sol('HCl',20)),0,0.01,'HCl 1 М'); near(pH(sol('NaOH',20)),14,0.01,'NaOH 1 М'); near(pH(sol('CaOH2',20)),12.6,0.02,'әк суы'); });
t('Тұздар гидролизі',()=>{ near(pH(sol('Na2CO3',20)),12.01,0.02,'Na2CO3'); near(pH(sol('CuSO4',20)),3.65,0.02,'CuSO4'); near(pH(sol('FeCl3',20)),1.25,0.02,'FeCl3'); near(pH(sol('NaCl',20)),7,0.01,'NaCl'); });
t('Бейтараптану: pH 7 және жылу',()=>{ const v=sol('HCl',10); addLiquid(v,R.NaOH.ions,10); near(pH(v),7,0.01,'pH'); near(v.T,26.62,0.05,'T (57,1 кДж/моль, шыны 40 Дж/К)'); });
t('Карбонатты сатылап титрлеу (HCO₃⁻)',()=>{ const v=sol('Na2CO3',10); addLiquid(v,R.HCl.ions,2.5); near(pH(v),10.33,0.01,'буфер'); addLiquid(v,R.HCl.ions,2.5); near(pH(v),8.34,0.01,'HCO3-'); assert.ok(!(v.ppt.x)); });
t('AgCl тұнбасы',()=>{ const v=sol('NaCl',5,20); addLiquid(v,R.AgNO3.ions,5); near(v.ppt.AgCl,0.0005,1e-9,'AgCl моль'); });
t('Cu(OH)₂ қышқылда ериді',()=>{ const v=sol('CuSO4',10); addLiquid(v,R.NaOH.ions,10); near(v.ppt.CuOH2,0.005,1e-9,'тұнба'); addLiquid(v,R.HCl.ions,15); assert.ok(!v.ppt.CuOH2,'ерімеді'); });
t('Zn(OH)₂ амфотерлі',()=>{ const v=sol('HCl',10); addPiece(v,'Zn'); for(let i=0;i<3000;i++) step(v,0.5,false); addLiquid(v,R.NaOH.ions,12); assert.ok(v.ppt.ZnOH2>0); addLiquid(v,R.NaOH.ions,20); assert.ok(!v.ppt.ZnOH2&&v.ions.ZnOH4>0); });
t('Mg + HCl: жылдамдық пен жылу',()=>{ const v=sol('HCl',20); addPiece(v,'Mg'); let s=0; while(v.pieces[0].n>v.pieces[0].n0/2){ step(v,0.1,false); s+=0.1; } near(s,18.5,0.6,'t½'); });
t('Fe + CuSO₄ → мыс қабаты',()=>{ const v=sol('CuSO4',20); addPiece(v,'Fe'); for(let i=0;i<300;i++) step(v,0.1,false); assert.ok(v.pieces[0].coatCu>4e-4); });
t('Буландыру: NaCl кристалы',()=>{ const v=sol('NaCl',10); v.onHeater=true; let s=0; while(v.V>0&&s<2000){ step(v,0.5,true); s+=0.5; } near(v.residue.salts[0].g,0.5844,0.001,'NaCl г'); assert.equal(v.residue.salts[0].f,'NaCl'); });
t('H₂O₂ + MnO₂ → O₂ (катализатор жұмсалмайды)',()=>{ const v=newVessel('t',20,'tube'); addLiquid(v,R.H2O2.ions,10); addPiece(v,'MnO2'); for(let i=0;i<200;i++) step(v,0.1,false); assert.ok(v.gasOut.O2>2.5e-3); near(v.pieces[0].n,v.pieces[0].n0,1e-12,'MnO2'); });
t('Әк суы: лайлану, артық CO₂-де мөлдірлену',()=>{ const v=newVessel('t',20,'tube'); addLiquid(v,R.CaOH2.ions,10); for(let i=0;i<10;i++) absorbCO2(v,4e-5); assert.ok(v.ppt.CaCO3>1.5e-4,'лайланбады'); for(let i=0;i<200;i++) absorbCO2(v,4e-5); assert.ok(!(v.ppt.CaCO3>1e-5),'мөлдірленбеді'); });
t('Сүзу: тұнба қағазда қалады',()=>{ const a=sol('CuSO4',10); addLiquid(a,R.NaOH.ions,10); for(let i=0;i<300;i++) step(a,0.1,false); const b=newVessel('d',100,'beaker'), paper={}; while(a.V>0) transfer(a,b,1,paper); near(paper.CuOH2,0.005,1e-9,'қағазда'); assert.ok(!Object.keys(b.ppt).length); near(b.V,20,1e-9,'сүзінді'); });
console.log(`\n${pass} тест өтті`);
