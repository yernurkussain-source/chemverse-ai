/*ENGINE-START*/
// ===== CHEMISTRY ENGINE (real stoichiometry, pH, solubility, thermochemistry, kinetics) =====
const KW = 1e-14, AMB = 22, C_GLASS = 40;
const ION = {
  H:{z:1,M:1.008,f:'H⁺'}, OH:{z:-1,M:17.01,f:'OH⁻'}, Na:{z:1,M:22.99,f:'Na⁺'}, K:{z:1,M:39.10,f:'K⁺'}, Ag:{z:1,M:107.87,f:'Ag⁺'},
  Cu:{z:2,M:63.55,f:'Cu²⁺'}, Fe2:{z:2,M:55.85,f:'Fe²⁺'}, Fe3:{z:3,M:55.85,f:'Fe³⁺'}, Zn:{z:2,M:65.38,f:'Zn²⁺'}, Mg:{z:2,M:24.31,f:'Mg²⁺'},
  Ca:{z:2,M:40.08,f:'Ca²⁺'}, Ba:{z:2,M:137.33,f:'Ba²⁺'},
  Cl:{z:-1,M:35.45,f:'Cl⁻'}, NO3:{z:-1,M:62.00,f:'NO₃⁻'}, I:{z:-1,M:126.90,f:'I⁻'}, SO4:{z:-2,M:96.06,f:'SO₄²⁻'}, CO3:{z:-2,M:60.01,f:'CO₃²⁻'}, HCO3:{z:-1,M:61.02,f:'HCO₃⁻'},
  ZnOH4:{z:-2,M:133.41,f:'[Zn(OH)₄]²⁻'}, H2O2:{z:0,M:34.01,f:'H₂O₂'}
};
const PPT = {
  AgCl:{f:'AgCl',M:143.32,col:[244,244,238],d:'ақ, ірімшік тәрізді'},
  AgI:{f:'AgI',M:234.77,col:[238,222,130],d:'ақшыл-сары'},
  BaSO4:{f:'BaSO₄',M:233.39,col:[250,250,250],d:'ақ, ұсақ кристалды'},
  BaCO3:{f:'BaCO₃',M:197.34,col:[246,246,246],d:'ақ'},
  CaCO3:{f:'CaCO₃',M:100.09,col:[246,246,246],d:'ақ (лайлану)'},
  CuOH2:{f:'Cu(OH)₂',M:97.56,col:[70,140,232],d:'көк, іркілдек'},
  FeOH3:{f:'Fe(OH)₃',M:106.87,col:[158,72,30],d:'қызыл-қоңыр'},
  FeOH2:{f:'Fe(OH)₂',M:89.86,col:[118,140,108],d:'сұр-жасыл'},
  MgOH2:{f:'Mg(OH)₂',M:58.32,col:[246,246,246],d:'ақ'},
  ZnOH2:{f:'Zn(OH)₂',M:99.42,col:[246,246,246],d:'ақ, іркілдек'},
  Ag2O:{f:'Ag₂O',M:231.74,col:[92,62,42],d:'қоңыр'},
  CuCarb:{f:'(CuOH)₂CO₃',M:221.12,col:[62,168,150],d:'көкшіл-жасыл'}
};
const REAG = [
  {id:'HCl',f:'HCl',name:'Тұз қышқылы',c:'1 М',kind:'liq',ions:{H:1,Cl:1},haz:'g',cap:0xd23a3a,note:'Қышқыл: көз бен теріге тигізбе'},
  {id:'H2SO4',f:'H₂SO₄',name:'Күкірт қышқылы (сұйылт.)',c:'0,5 М',kind:'liq',ions:{H:1,SO4:.5},haz:'g',cap:0xd23a3a,note:'Қышқыл: көз бен теріге тигізбе'},
  {id:'NaOH',f:'NaOH',name:'Натрий гидроксиді',c:'1 М',kind:'liq',ions:{Na:1,OH:1},haz:'g',cap:0x2f5fd0,note:'Сілті: көзге өте қауіпті'},
  {id:'CaOH2',f:'Ca(OH)₂',name:'Әк суы',c:'0,02 М',kind:'liq',ions:{Ca:.02,OH:.04},haz:'g',cap:0x2f5fd0,note:'Әлсіз сілті'},
  {id:'Na2CO3',f:'Na₂CO₃',name:'Натрий карбонаты',c:'0,5 М',kind:'liq',ions:{Na:1,CO3:.5},cap:0x7d8799},
  {id:'NaCl',f:'NaCl',name:'Ас тұзы ерітіндісі',c:'1 М',kind:'liq',ions:{Na:1,Cl:1},cap:0x7d8799},
  {id:'KI',f:'KI',name:'Калий иодиді',c:'0,5 М',kind:'liq',ions:{K:.5,I:.5},cap:0x7d8799},
  {id:'AgNO3',f:'AgNO₃',name:'Күміс нитраты',c:'0,1 М',kind:'liq',ions:{Ag:.1,NO3:.1},haz:'gl',cap:0x3a3a3a,amber:true,note:'Теріні қарайтады: қолғап ки'},
  {id:'BaCl2',f:'BaCl₂',name:'Барий хлориді',c:'0,5 М',kind:'liq',ions:{Ba:.5,Cl:1},haz:'gl',cap:0x3a3a3a,note:'Улы: қолғаппен жұмыс істе, жұтпа'},
  {id:'CuSO4',f:'CuSO₄',name:'Мыс(II) сульфаты',c:'0,5 М',kind:'liq',ions:{Cu:.5,SO4:.5},haz:'gl',cap:0x3a3a3a,note:'Зиянды: жұтпа, қолғап ки'},
  {id:'FeCl3',f:'FeCl₃',name:'Темір(III) хлориді',c:'0,5 М',kind:'liq',ions:{Fe3:.5,Cl:1.5},haz:'gl',cap:0x3a3a3a,note:'Тітіркендіреді, дақ қалдырады'},
  {id:'H2O',f:'H₂O',name:'Дистилденген су',c:'',kind:'liq',ions:{},cap:0x9fb7c9},
  {id:'H2O2',f:'H₂O₂',name:'Сутек асқын тотығы',c:'3 %',kind:'liq',ions:{H2O2:0.88},haz:'g',cap:0xe9e9e9,note:'Тотықтырғыш: көз бен теріге тигізбе'},
  {id:'php',f:'Ф-ф',name:'Фенолфталеин',kind:'ind'},
  {id:'mo',f:'М-о',name:'Метилоранж',kind:'ind'},
  {id:'lit',f:'Лакмус',name:'Лакмус',kind:'ind'},
  {id:'uni',f:'Әмб.',name:'Әмбебап индикатор',kind:'ind'},
  {id:'Mg',f:'Mg',name:'Магний таспасы',kind:'sol',n:0.05/24.31,mass:'0,05 г'},
  {id:'Zn',f:'Zn',name:'Мырыш түйіршігі',kind:'sol',n:0.3/65.38,mass:'0,3 г'},
  {id:'Fe',f:'Fe',name:'Темір шеге',kind:'sol',n:0.5/55.85,mass:'0,5 г'},
  {id:'Cu',f:'Cu',name:'Мыс сымы',kind:'sol',n:0.5/63.55,mass:'0,5 г'},
  {id:'CaCO3',f:'CaCO₃',name:'Мәрмәр кесегі',kind:'sol',n:0.5/100.09,mass:'0,5 г'},
  {id:'MnO2',f:'MnO₂',name:'Марганец(IV) оксиді',kind:'sol',n:0.1/86.94,mass:'0,1 г'}
];
const REAG_BY = Object.fromEntries(REAG.map(r=>[r.id,r]));
const METAL = {
  Mg:{k:0.03,ion:'Mg',dH:-466.9,M:24.31,kCu:0.02,kAg:0.05,eq:'Mg + 2H⁺ → Mg²⁺ + H₂↑',obs:'Қарқынды көпіршіктер, ыдыс қызады'},
  Zn:{k:0.002,ion:'Zn',dH:-153.9,M:65.38,kCu:0.008,kAg:0.03,eq:'Zn + 2H⁺ → Zn²⁺ + H₂↑',obs:'Біркелкі көпіршіктер (сутек)'},
  Fe:{k:0.0007,ion:'Fe2',dH:-89.1,M:55.85,kCu:0.004,kAg:0.02,eq:'Fe + 2H⁺ → Fe²⁺ + H₂↑',obs:'Баяу көпіршіктер, ерітінді ақшыл-жасылданады'},
  Cu:{k:0,ion:'Cu',M:63.55,kCu:0,kAg:0.02},
  CaCO3:{k:0.004,ion:'Ca',M:100.09,carb:true,eq:'CaCO₃ + 2H⁺ → Ca²⁺ + CO₂↑ + H₂O',obs:'Мәрмәр бетінен CO₂ көпіршіктері'},
  MnO2:{k:0,M:86.94,kCu:0,kAg:0,cat:true}
};
let ENGINE_EMIT = ()=>{}, ENGINE_STATS = {ppt:new Set(), gas:{H2:0,CO2:0,O2:0}, cuDep:0, lime:false, agDep:0, residue:new Set(), amph:false, neut:0, noCu:false};

function newVessel(name, cap, kind){ return {name,cap,kind,V:0,T:AMB,ions:{},ppt:{},susp:{},pieces:[],ind:{},fizz:0,boil:false,residue:null,onHeater:false}; }
const g = (v,k)=>v.ions[k]||0;
function take(v,k,n){ v.ions[k]=(v.ions[k]||0)-n; if(v.ions[k]<1e-13) delete v.ions[k]; }
function addIon(v,k,n){ v.ions[k]=(v.ions[k]||0)+n; }
function addPpt(v,p,n){ v.ppt[p]=(v.ppt[p]||0)+n; v.susp[p]=(v.susp[p]||0)+n; ENGINE_STATS.ppt.add(p); }
function remPpt(v,p,n){ const t=v.ppt[p]||0; if(t<=0) return; const f=Math.min(1,n/t); v.susp[p]=(v.susp[p]||0)*(1-f); v.ppt[p]=t-n; if(v.ppt[p]<1e-12){ delete v.ppt[p]; delete v.susp[p]; } }
function heat(v,J){ const cap=Math.max(v.V,0)*4.18+C_GLASS; v.T+=J/cap; }
function gas(v,type,n){ v.fizz+=n*900; ENGINE_STATS.gas[type]=(ENGINE_STATS.gas[type]||0)+n; v.gasOut=v.gasOut||{}; v.gasOut[type]=(v.gasOut[type]||0)+n; }
const pp = (v,p)=>v.ppt[p]||0;

function precip(key,ppt,re,eq,obs,extra){
  return {key,ppt,eq,obs,
    n:v=>Math.min(...Object.entries(re).map(([i,c])=>g(v,i)/c)),
    apply:(v,n)=>{ for(const [i,c] of Object.entries(re)) take(v,i,c*n); addPpt(v,ppt,(extra&&extra.k||1)*n); if(extra&&extra.co2) gas(v,'CO2',extra.co2*n); }};
}
function dissolve(key,ppt,h,ion,ionK,eq,obs,co2){
  return {key,eq,obs,
    n:v=>Math.min(g(v,'H')/h, pp(v,ppt)),
    apply:(v,n)=>{ take(v,'H',h*n); remPpt(v,ppt,n); addIon(v,ion,ionK*n); if(co2) gas(v,'CO2',n); }};
}
const INSTANT = [
  {key:'neut',eq:'H⁺ + OH⁻ → H₂O',obs:'Бейтараптану: жылу бөлінеді',dH:-57.1,
    n:v=>Math.min(g(v,'H'),g(v,'OH')), apply:(v,n)=>{take(v,'H',n);take(v,'OH',n);ENGINE_STATS.neut+=n;}},
  {key:'hco3',eq:'H⁺ + CO₃²⁻ → HCO₃⁻',obs:'Алдымен гидрокарбонат түзіледі — газ әлі бөлінбейді',
    n:v=>Math.min(g(v,'H'),g(v,'CO3')), apply:(v,n)=>{take(v,'H',n);take(v,'CO3',n);addIon(v,'HCO3',n);}},
  {key:'acidCO3',eq:'H⁺ + HCO₃⁻ → CO₂↑ + H₂O',obs:'Газ көпіршіктері бөлінді (CO₂)',
    n:v=>Math.min(g(v,'H'),g(v,'HCO3')), apply:(v,n)=>{take(v,'H',n);take(v,'HCO3',n);gas(v,'CO2',n);}},
  {key:'ohHCO3',eq:'HCO₃⁻ + OH⁻ → CO₃²⁻ + H₂O',obs:'Гидрокарбонат сілтімен әрекеттесті',
    n:v=>Math.min(g(v,'OH'),g(v,'HCO3')), apply:(v,n)=>{take(v,'OH',n);take(v,'HCO3',n);addIon(v,'CO3',n);}},
  dissolve('dCuOH2','CuOH2',2,'Cu',1,'Cu(OH)₂ + 2H⁺ → Cu²⁺ + 2H₂O','Көк тұнба қышқылда еріді'),
  dissolve('dFeOH3','FeOH3',3,'Fe3',1,'Fe(OH)₃ + 3H⁺ → Fe³⁺ + 3H₂O','Қоңыр тұнба қышқылда еріді'),
  dissolve('dFeOH2','FeOH2',2,'Fe2',1,'Fe(OH)₂ + 2H⁺ → Fe²⁺ + 2H₂O','Тұнба еріді'),
  dissolve('dMgOH2','MgOH2',2,'Mg',1,'Mg(OH)₂ + 2H⁺ → Mg²⁺ + 2H₂O','Ақ тұнба еріді'),
  dissolve('dZnOH2','ZnOH2',2,'Zn',1,'Zn(OH)₂ + 2H⁺ → Zn²⁺ + 2H₂O','Ақ тұнба қышқылда еріді'),
  dissolve('dAg2O','Ag2O',2,'Ag',2,'Ag₂O + 2H⁺ → 2Ag⁺ + H₂O','Қоңыр тұнба еріді'),
  dissolve('dCaCO3','CaCO3',2,'Ca',1,'CaCO₃ + 2H⁺ → Ca²⁺ + CO₂↑ + H₂O','Тұнба көпіршіп еріді',true),
  dissolve('dBaCO3','BaCO3',2,'Ba',1,'BaCO₃ + 2H⁺ → Ba²⁺ + CO₂↑ + H₂O','Тұнба көпіршіп еріді',true),
  dissolve('dCuCarb','CuCarb',4,'Cu',2,'(CuOH)₂CO₃ + 4H⁺ → 2Cu²⁺ + CO₂↑ + 3H₂O','Тұнба көпіршіп еріді',true),
  {key:'dZnOH4',eq:'[Zn(OH)₄]²⁻ + 4H⁺ → Zn²⁺ + 4H₂O',obs:'Қышқылдандыру',
    n:v=>Math.min(g(v,'H')/4,g(v,'ZnOH4')), apply:(v,n)=>{take(v,'H',4*n);take(v,'ZnOH4',n);addIon(v,'Zn',n);}},
  precip('pAgCl','AgCl',{Ag:1,Cl:1},'Ag⁺ + Cl⁻ → AgCl↓','Ақ ірімшік тәрізді тұнба (хлорид-ионға сапалық реакция)'),
  precip('pAgI','AgI',{Ag:1,I:1},'Ag⁺ + I⁻ → AgI↓','Ақшыл-сары тұнба (иодид-ионға сапалық реакция)'),
  precip('pBaSO4','BaSO4',{Ba:1,SO4:1},'Ba²⁺ + SO₄²⁻ → BaSO₄↓','Ақ тұнба, қышқылда ерімейді (сульфат-ионға сапалық реакция)'),
  precip('pBaCO3','BaCO3',{Ba:1,CO3:1},'Ba²⁺ + CO₃²⁻ → BaCO₃↓','Ақ тұнба'),
  precip('pCaCO3','CaCO3',{Ca:1,CO3:1},'Ca²⁺ + CO₃²⁻ → CaCO₃↓','Ақ лайлану'),
  precip('pCuCarb','CuCarb',{Cu:2,CO3:2},'2Cu²⁺ + 2CO₃²⁻ + H₂O → (CuOH)₂CO₃↓ + CO₂↑','Көкшіл-жасыл тұнба және көпіршіктер',{co2:1}),
  precip('pFeCarb','FeOH3',{Fe3:2,CO3:3},'2Fe³⁺ + 3CO₃²⁻ + 3H₂O → 2Fe(OH)₃↓ + 3CO₂↑','Қоңыр тұнба және көпіршіктер',{k:2,co2:3}),
  precip('pCuOH2','CuOH2',{Cu:1,OH:2},'Cu²⁺ + 2OH⁻ → Cu(OH)₂↓','Көк іркілдек тұнба'),
  precip('pFeOH3','FeOH3',{Fe3:1,OH:3},'Fe³⁺ + 3OH⁻ → Fe(OH)₃↓','Қызыл-қоңыр тұнба (Fe³⁺ сапалық реакциясы)'),
  precip('pFeOH2','FeOH2',{Fe2:1,OH:2},'Fe²⁺ + 2OH⁻ → Fe(OH)₂↓','Сұр-жасыл тұнба (Fe²⁺)'),
  precip('pMgOH2','MgOH2',{Mg:1,OH:2},'Mg²⁺ + 2OH⁻ → Mg(OH)₂↓','Ақ тұнба'),
  precip('pZnOH2','ZnOH2',{Zn:1,OH:2},'Zn²⁺ + 2OH⁻ → Zn(OH)₂↓','Ақ іркілдек тұнба'),
  precip('pAg2O','Ag2O',{Ag:2,OH:2},'2Ag⁺ + 2OH⁻ → Ag₂O↓ + H₂O','Қоңыр тұнба'),
  {key:'amph',eq:'Zn(OH)₂ + 2OH⁻ → [Zn(OH)₄]²⁻',obs:'Артық сілтіде тұнба еріді: Zn(OH)₂ амфотерлі',
    n:v=>Math.min(pp(v,'ZnOH2'),g(v,'OH')/2), apply:(v,n)=>{remPpt(v,'ZnOH2',n);take(v,'OH',2*n);addIon(v,'ZnOH4',n);ENGINE_STATS.amph=true;}}
];

function equilibrate(v){
  if(v.V<=0) return;
  for(let it=0; it<14; it++){
    let any=false;
    for(const R of INSTANT){
      const n=R.n(v);
      if(n>1e-11){ const T0=v.T; R.apply(v,n); if(R.dH) heat(v,-R.dH*1000*n); any=true; ENGINE_EMIT(v,R.key,{eq:R.eq,obs:R.obs,dT:v.T-T0}); }
    }
    if(!any) break;
  }
}

function pH(v){
  if(v.V<=0.05) return null;
  const L=v.V/1000, c=k=>g(v,k)/L;
  const d=c('H')-c('OH');
  const A=6.3e-3*c('Fe3')+1e-7*c('Cu')+1e-9*c('Zn')+3e-10*c('Fe2');
  const B=2.1e-4*c('CO3'), hc=c('HCO3'), co=c('CO3');
  let h;
  if(d>1e-7) h=d/2+Math.sqrt(d*d/4+A+KW);
  else if(d<-1e-7){ const o=-d; const oh=o/2+Math.sqrt(o*o/4+B+KW); h=KW/oh; }
  else if(hc>1e-6 && co>1e-6) h=Math.pow(10,-(10.33+Math.log10(co/hc)));
  else if(hc>1e-6) h=Math.pow(10,-8.34);
  else if(B>A) h=KW/Math.sqrt(B+KW);
  else h=Math.sqrt(A+KW);
  return -Math.log10(h);
}

function addLiquid(v, ions, mL, T=AMB){
  if(mL<=0) return;
  const V0=v.V;
  v.T = V0>0 ? (v.T*(V0*4.18+C_GLASS)+T*mL*4.18)/((V0+mL)*4.18+C_GLASS) : (v.T*C_GLASS+T*mL*4.18)/(mL*4.18+C_GLASS);
  v.V+=mL;
  if(v.residue){ for(const s of v.residue.ions){ addIon(v,s[0],s[1]); } v.residue=null; }
  for(const [k,c] of Object.entries(ions)) addIon(v,k,c*mL/1000);
  equilibrate(v);
}
function addPiece(v, id){
  const m=METAL[id], r=REAG_BY[id];
  v.pieces.push({metal:id,n:r.n,n0:r.n,coatCu:0,coatAg:0});
}
function transfer(src, dst, mL, sink){
  mL=Math.min(mL, src.V); if(mL<=0) return 0;
  const f=mL/src.V, moved={}, emptying=src.V-mL<0.3;
  for(const [k,n] of Object.entries(src.ions)){ moved[k]=n*f; src.ions[k]=n*(1-f); }
  const mp={};
  for(const p of Object.keys(src.ppt)){ const s=src.susp[p]||0, tot=src.ppt[p]; const n=emptying?tot:s*f; mp[p]=n; src.susp[p]=emptying?0:s-n; src.ppt[p]=tot-n; if(src.ppt[p]<1e-12){ delete src.ppt[p]; delete src.susp[p]; } }
  const ind={}; for(const [k,d] of Object.entries(src.ind)){ ind[k]=d*f; src.ind[k]=d*(1-f); }
  const T=src.T; src.V-=mL; if(src.V<0.01){ src.V=0; src.ions={}; src.ind={}; }
  const conc={}; for(const [k,n] of Object.entries(moved)) conc[k]=n/(mL/1000);
  for(const [k,d] of Object.entries(ind)) dst.ind[k]=(dst.ind[k]||0)+d;
  if(sink){ for(const [p,n] of Object.entries(mp)) if(n>0) sink[p]=(sink[p]||0)+n; }
  else for(const [p,n] of Object.entries(mp)){ if(n<=0) continue; dst.ppt[p]=(dst.ppt[p]||0)+n; dst.susp[p]=(dst.susp[p]||0)+n; }
  addLiquid(dst, conc, mL, T);
  return mL;
}
// CO2 gas bubbling through a solution: absorbed by OH- (limewater turns milky), excess CO2 dissolves CaCO3 as Ca(HCO3)2
function absorbCO2(v, n){
  if(v.V<=0.05||n<=0) return n;
  let r=n; const c0=pp(v,'CaCO3');
  const a=Math.min(r*0.9,g(v,'OH')/2); if(a>0){ take(v,'OH',2*a); addIon(v,'CO3',a); r-=a; equilibrate(v); }
  let slow=g(v,'OH')>1e-9?0:r*0.12; // without free OH-, CO2 is absorbed slowly (weak acid, most bubbles escape)
  const b=Math.min(slow,g(v,'CO3')); if(b>0){ take(v,'CO3',b); addIon(v,'HCO3',2*b); r-=b; slow-=b; }
  const c=Math.min(slow,pp(v,'CaCO3')); if(c>0){ remPpt(v,'CaCO3',c); addIon(v,'Ca',c); addIon(v,'HCO3',2*c); r-=c;
    ENGINE_EMIT(v,'clear',{eq:'CaCO₃ + CO₂ + H₂O → Ca(HCO₃)₂',obs:'Артық CO₂-ден лайлану жоғалды: еритін кальций гидрокарбонаты түзілді'}); }
  equilibrate(v);
  if(pp(v,'CaCO3')>c0+1e-9){ ENGINE_STATS.lime=true; ENGINE_EMIT(v,'lime',{eq:'CO₂ + Ca(OH)₂ → CaCO₃↓ + H₂O',obs:'Әк суы лайланды — бұл көмірқышқыл газы'}); }
  return r;
}
const SYM={Na:'Na',K:'K',Ag:'Ag',Cu:'Cu',Fe2:'Fe',Fe3:'Fe',Zn:'Zn',Mg:'Mg',Ca:'Ca',Ba:'Ba',Cl:'Cl',NO3:'NO₃',I:'I',SO4:'SO₄',CO3:'CO₃',HCO3:'HCO₃',OH:'OH',ZnOH4:'[Zn(OH)₄]'};
const POLY={NO3:1,SO4:1,CO3:1,HCO3:1,OH:1};
const SUB=n=>n===1?'':String(n).replace(/\d/g,d=>'₀₁₂₃₄₅₆₇₈₉'[d]);
const gcd=(a,b)=>b?gcd(b,a%b):a;
function residueOf(ions){
  const cats=[],ans=[];
  for(const [k,n] of Object.entries(ions)){ if(k==='H'||n<1e-10) continue; const z=ION[k].z; (z>0?cats:ans).push({k,eq:n*Math.abs(z)}); }
  let h=ions.H||0;
  for(const a of ['Cl','NO3','I','SO4']){ const e=ans.find(x=>x.k===a); if(e&&h>0){ const d=Math.min(h,e.eq); e.eq-=d; h-=d; } }
  const out={}; let i=0,j=0;
  while(i<cats.length&&j<ans.length){
    if(ans[j].eq<1e-12){j++;continue;}
    const d=Math.min(cats[i].eq,ans[j].eq); const key=cats[i].k+'|'+ans[j].k; out[key]=(out[key]||0)+d;
    cats[i].eq-=d; ans[j].eq-=d; if(cats[i].eq<1e-12) i++; if(ans[j].eq<1e-12) j++;
  }
  return Object.entries(out).map(([key,eq])=>{
    const [c,a]=key.split('|'); const zc=ION[c].z, za=-ION[a].z, l=zc*za/gcd(zc,za), nc=l/zc, na=l/za;
    const f=SYM[c]+SUB(nc)+(POLY[a]&&na>1?'('+SYM[a]+')'+SUB(na):SYM[a]+SUB(na));
    const mol=eq/l; return {f, g:mol*(nc*ION[c].M+na*ION[a].M)};
  }).filter(s=>s.g>0.0005).sort((a,b)=>b.g-a.g);
}
function dryOut(v){
  const salts=residueOf(v.ions);
  v.residue={salts, ions:Object.entries(v.ions).filter(([k])=>k!=='H')};
  salts.forEach(s=>ENGINE_STATS.residue.add(s.f));
  v.ions={}; v.V=0; v.boil=false;
  ENGINE_EMIT(v,'dry',{eq:'H₂O(с) → H₂O(г)↑',obs:'Су толық буланды. Қалдық: '+(salts.length?salts.map(s=>s.f+' '+s.g.toFixed(2).replace('.',',')+' г').join(', '):'жоқ (таза су еді)')});
}

function step(v, dt, heaterOn){
  const tf=Math.pow(2,(v.T-20)/10);
  if(v.V>0.05){
    const L=v.V/1000;
    for(const p of v.pieces){
      if(p.n<=1e-9) continue;
      const m=METAL[p.metal];
      if(m.cat){ const h2o2=g(v,'H2O2'); if(h2o2>1e-9){ const dn=h2o2*(1-Math.exp(-0.035*tf*dt)); const T0=v.T; take(v,'H2O2',dn); gas(v,'O2',dn/2); heat(v,98000*dn);
          ENGINE_EMIT(v,'cat',{eq:'2H₂O₂ → 2H₂O + O₂↑ (MnO₂ — катализатор)',obs:'Қарқынды көпіршіктер: оттек бөлінеді, ал MnO₂ жұмсалмайды',dT:v.T-T0}); } continue; }
      const cH=g(v,'H')/L;
      if(m.k>0 && cH>1e-5){
        const dn=Math.min(m.k*cH*p.n*tf*dt, p.n, g(v,'H')/2);
        if(dn>0){ const T0=v.T; p.n-=dn; take(v,'H',2*dn); addIon(v,m.ion,dn); gas(v,m.carb?'CO2':'H2',dn); if(m.dH) heat(v,-m.dH*1000*dn); ENGINE_EMIT(v,'acid_'+p.metal,{eq:m.eq,obs:m.obs,dT:v.T-T0}); }
      } else if(p.metal==='Cu' && cH>1e-3 && !g(v,'Ag')){ ENGINE_STATS.noCu=true; ENGINE_EMIT(v,'noCu',{eq:'Cu + H⁺ → реакция жүрмейді',obs:'Мыс белсенділік қатарында сутектен кейін тұр, сондықтан қышқылдан сутекті ығыстырмайды'}); }
      if(p.metal!=='CaCO3'){
        const cCu=g(v,'Cu')/L;
        if(m.kCu>0 && cCu>1e-5 && p.n>1e-9){
          const dn=Math.min(m.kCu*cCu*p.n*tf*dt, p.n, g(v,'Cu'));
          if(dn>0){ p.n-=dn; take(v,'Cu',dn); addIon(v,m.ion,dn); p.coatCu+=dn; ENGINE_STATS.cuDep+=dn;
            ENGINE_EMIT(v,'cu_'+p.metal,{eq:p.metal+' + Cu²⁺ → '+ION[m.ion].f+' + Cu',obs:'Металл бетінде қызыл мыс қабаты пайда болды'}); }
        }
        const cAg=g(v,'Ag')/L;
        if(m.kAg>0 && cAg>1e-5 && p.n>1e-9){
          const dn=Math.min(m.kAg*cAg*p.n*tf*dt, p.n, g(v,'Ag')/2);
          if(dn>0){ p.n-=dn; take(v,'Ag',2*dn); addIon(v,m.ion,dn); p.coatAg+=2*dn; ENGINE_STATS.agDep+=2*dn;
            ENGINE_EMIT(v,'ag_'+p.metal,{eq:p.metal+' + 2Ag⁺ → '+ION[m.ion].f+' + 2Ag',obs:p.metal==='Cu'?'Сымда күміс кристалдары өседі, ерітінді көгереді':'Металл бетіне күміс қонды'}); }
        }
      }
    }
    equilibrate(v);
  }
  // heating, boiling, evaporation
  if(v.onHeater && heaterOn){
    const P=350*dt;
    if(v.V>0.05){
      if(v.T<100){ heat(v,P); if(v.T>=100){ const extra=(v.T-100)*(v.V*4.18+C_GLASS); v.T=100; evap(v,extra/2260); } }
      else { v.T=100; evap(v,P/2260); }
    } else v.T=Math.min(v.T+P/C_GLASS*0.25,180);
  } else {
    if(v.T>AMB+0.01||v.T<AMB-0.01){ const k=v.V>0.05?0.0035:0.02; v.T=AMB+(v.T-AMB)*Math.exp(-k*dt); }
    if(v.T<99.5) v.boil=false;
  }
  for(const k in v.susp) v.susp[k]*=Math.exp(-dt/6);
  v.fizz*=Math.exp(-dt/1.4);
}
function evap(v,grams){
  const hc=g(v,'HCO3'); if(hc>1e-9){ take(v,'HCO3',hc); addIon(v,'CO3',hc/2); gas(v,'CO2',hc/2); ENGINE_EMIT(v,'hco3boil',{eq:'2HCO₃⁻ → CO₃²⁻ + CO₂↑ + H₂O',obs:'Қыздырғанда гидрокарбонат ыдырады'}); }
  if(!v.boil){ v.boil=true; ENGINE_EMIT(v,'boil',{eq:'t = 100 °C',obs:'Ерітінді қайнап жатыр, су буланады'}); }
  v.V-=grams; if(v.V<=0.25) dryOut(v);
}

// colours
const clamp01=x=>Math.max(0,Math.min(1,x));
const lerp3=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
function over(o,c,a){ if(a<=0) return; const na=a+o.a*(1-a); o.r=(c[0]*a+o.r*o.a*(1-a))/na; o.g=(c[1]*a+o.g*o.a*(1-a))/na; o.b=(c[2]*a+o.b*o.a*(1-a))/na; o.a=na; }
const UNI=[[1,[220,30,35]],[3,[238,120,30]],[5,[236,206,40]],[7,[60,168,70]],[9,[40,115,200]],[11,[72,52,165]],[13,[112,32,140]]];
function uniColor(p){ if(p<=1) return UNI[0][1]; for(let i=0;i<UNI.length-1;i++){ const [a,ca]=UNI[i],[b,cb]=UNI[i+1]; if(p<=b) return lerp3(ca,cb,(p-a)/(b-a)); } return UNI[UNI.length-1][1]; }
function indColor(id,p){
  if(id==='php'){ return p<8.2?null:{c:[225,25,128],a:clamp01((p-8.2)/1.8)*0.88}; }
  if(id==='mo'){ return {c:p<=3.1?[214,42,46]:p>=4.4?[240,196,40]:lerp3([214,42,46],[240,196,40],(p-3.1)/1.3),a:.72}; }
  if(id==='lit'){ const R=[200,32,44],P=[124,52,142],B=[38,62,190]; return {c:p<=4.5?R:p>=8.3?B:p<6.4?lerp3(R,P,(p-4.5)/1.9):lerp3(P,B,(p-6.4)/1.9),a:.7}; }
  if(id==='uni') return {c:uniColor(p),a:.78};
}
function liquidColor(v){
  const o={r:208,g:230,b:242,a:.16};
  if(v.V<=0.05) return o;
  const L=v.V/1000, c=k=>g(v,k)/L;
  over(o,[52,126,226],Math.min(.8,c('Cu')*1.7));
  over(o,[206,128,24],Math.min(.86,c('Fe3')*2.4));
  over(o,[160,206,128],Math.min(.45,c('Fe2')*1.6));
  const p=pH(v);
  for(const [id,drops] of Object.entries(v.ind)){
    if(drops<=0||p==null) continue;
    const s=Math.min(1,drops*15/Math.max(v.V,1)); const ic=indColor(id,p); if(ic) over(o,ic.c,ic.a*s);
  }
  let tot=0,cr=0,cg=0,cb=0;
  for(const [k,n] of Object.entries(v.susp)){ tot+=n; const col=PPT[k].col; cr+=col[0]*n; cg+=col[1]*n; cb+=col[2]*n; }
  if(tot>1e-7) over(o,[cr/tot,cg/tot,cb/tot],Math.min(.92,tot/L*14));
  return o;
}
function settledInfo(v){
  let tot=0,cr=0,cg=0,cb=0;
  for(const [k,n] of Object.entries(v.ppt)){ const s=n-(v.susp[k]||0); if(s<=0) continue; tot+=s; const col=PPT[k].col; cr+=col[0]*s; cg+=col[1]*s; cb+=col[2]*s; }
  return tot>1e-8?{mol:tot,col:[cr/tot,cg/tot,cb/tot]}:{mol:0,col:[255,255,255]};
}
/*ENGINE-END*/
