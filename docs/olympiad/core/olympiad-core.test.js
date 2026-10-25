// Іске қосу: node olympiad-core.test.js
const C=require('./olympiad-core.js'), assert=require('assert');
let n=0; const t=(name,fn)=>{ fn(); n++; console.log('✓',name); };
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<=e,`${a} ≠ ${b}`);
t('Молярлық массалар',()=>{ near(C.molarMass('H2SO4'),98); near(C.molarMass('Fe2(SO4)3'),400); near(C.molarMass('Na[Al(OH)4]'),118); near(C.molarMass('CuSO4*5H2O'),250); near(C.molarMass('Ca(H2PO4)2'),234); near(C.molarMass('KMnO4'),158); });
t('Массалық үлес',()=>{ near(C.massFraction('P2O5','O'),80/142); near(C.massFraction('NH4NO3','N'),0.35); near(C.massFraction('Fe3O4','Fe'),168/232); });
const B=[['KMnO4 + HCl = KCl + MnCl2 + Cl2 + H2O',[2,16,2,2,5,8]],['Cu + HNO3 = Cu(NO3)2 + NO2 + H2O',[1,4,1,2,2]],['Cu + HNO3 = Cu(NO3)2 + NO + H2O',[3,8,3,2,4]],
 ['K2Cr2O7 + HCl = KCl + CrCl3 + Cl2 + H2O',[1,14,2,2,3,7]],['Zn + HNO3 = Zn(NO3)2 + NH4NO3 + H2O',[4,10,4,1,3]],['Cu + H2SO4 = CuSO4 + SO2 + H2O',[1,2,1,1,2]],
 ['AlCl3 + Na2CO3 + H2O = Al(OH)3 + CO2 + NaCl',[2,3,3,2,3,6]],['Al + NaOH + H2O = Na[Al(OH)4] + H2',[2,2,6,2,3]],['C6H6 + O2 = CO2 + H2O',[2,15,12,6]],['H2S + O2 = SO2 + H2O',[2,3,2,2]],
 ['SO2 + H2S = S + H2O',[1,2,3,2]],['MnO4^- + Fe^2+ + H^+ = Mn^2+ + Fe^3+ + H2O',[1,5,8,1,5,4]],['FeS2 + O2 = Fe2O3 + SO2',[4,11,2,8]]];
t('Теңестіру (13 теңдеу)',()=>{ for(const [eq,k] of B){ assert.deepStrictEqual(C.balance(eq),k,eq); assert.ok(C.checkCoefficients(eq,k).ok,eq); } });
t('Қате коэффициенттерді табу',()=>{ assert.ok(!C.checkCoefficients(B[0][0],[2,16,2,2,5,7]).ok); assert.match(C.checkCoefficients(B[8][0],[4,30,24,12]).reason,/қысқарт/); });
t('Электрондық конфигурация',()=>{ const fe=C.econf(26); assert.equal(fe.full,'1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁶ 4s²'); assert.equal(fe.unpaired,4);
  const cr=C.econf(24); assert.equal(cr.occ['3d'],5); assert.equal(cr.occ['4s'],1); assert.equal(cr.unpaired,6);
  const cu=C.econf(29); assert.equal(cu.occ['3d'],10); assert.equal(cu.unpaired,1); assert.equal(C.econf(35).unpaired,1); assert.equal(C.econf(7).unpaired,3); assert.equal(C.econf(20).full,'1s² 2s² 2p⁶ 3s² 3p⁶ 4s²'); });
t('Соңғы электронның квант сандары',()=>{ assert.deepStrictEqual(C.lastElectronQN(7),{n:2,l:1,ml:1,ms:0.5}); assert.deepStrictEqual(C.lastElectronQN(8),{n:2,l:1,ml:-1,ms:-0.5}); assert.deepStrictEqual(C.lastElectronQN(8,'plusFirst'),{n:2,l:1,ml:1,ms:-0.5}); assert.deepStrictEqual(C.lastElectronQN(26),{n:3,l:2,ml:-2,ms:-0.5}); });
t('Генераторлар: қайталанады және жауабы дұрыс',()=>{ for(const id of Object.keys(C.GEN)) for(let sd=1;sd<=25;sd++){ const a=C.generate(id,sd), b=C.generate(id,sd); assert.deepStrictEqual(a,b); assert.ok(isFinite(a.answer)&&a.answer>=0,id); assert.ok(a.kk.length>20&&a.steps.length>=1,id); } });
t('Генераторлардың нақты мәндері',()=>{ const f=C.generate('faraday',3); const m=f.kk.match(/(\d+(?:,\d+)?) А ток күшімен (\d+) с/); assert.ok(m);
  near(C.GEN.faraday.gen(()=>0).answer,64*1*1930/(2*96500)); near(C.GEN.vant_hoff.gen(()=>0).answer,4); near(C.GEN.Kc_HI.gen(()=>0).answer,4); near(C.GEN.plate.gen(()=>0).answer,3.2); });
t('Сандық жауапты тексеру',()=>{ assert.ok(C.checkNumeric('2,39',2.3876).ok); assert.ok(!C.checkNumeric('2.5',2.3876).ok); assert.match(C.checkNumeric('2387.6',2.3876).reason,/Бірлік/); assert.ok(C.checkNumeric('5',5,0).ok); });
console.log(`\n${n} тест өтті`);
