// CHEMVERSE AI · Олимпиада ядросы (таза JS, DOM-сыз). Claude Code бұны src/features/olympiad/core/*.ts-ке көшіреді.
// Мазмұны: атомдық массалар, формула парсері, теңдеуді тексеру және теңестіру, электрондық конфигурация,
// сандық есеп генераторлары (жауабын код есептейді — AI-ға сенбейміз).

// ---------- 1. Атомдық массалар (мектеп/олимпиада дөңгелектеуі) ----------
const AR = { H:1, He:4, Li:7, Be:9, B:11, C:12, N:14, O:16, F:19, Ne:20, Na:23, Mg:24, Al:27, Si:28, P:31, S:32, Cl:35.5, Ar:40,
  K:39, Ca:40, Cr:52, Mn:55, Fe:56, Cu:64, Zn:65, Br:80, Ag:108, I:127, Ba:137, Pb:207 };
const VM = 22.4;      // л/моль, қалыпты жағдай
const F = 96500;      // Кл/моль, Фарадей тұрақтысы

// ---------- 2. Формула парсері: "Fe2(SO4)3", "Na[Al(OH)4]", "CuSO4*5H2O", "MnO4^-", "Fe^3+", "e^-" ----------
function parseFormula(str){
  let s=str.trim(), charge=0;
  const cm=s.match(/\^(\d*)([+-])$/); if(cm){ charge=(cm[1]?+cm[1]:1)*(cm[2]==='+'?1:-1); s=s.slice(0,cm.index); }
  if(s==='e') return {el:{},charge:-1};
  const parts=s.split(/[*·]/); const total={};
  for(const part of parts){
    const m=part.match(/^(\d+)(.*)$/); const mult=m?+m[1]:1; const body=m?m[2]:part;
    const stack=[{}]; let i=0;
    while(i<body.length){
      const ch=body[i];
      if(ch==='('||ch==='['){ stack.push({}); i++; continue; }
      if(ch===')'||ch===']'){ i++; let n=''; while(/\d/.test(body[i]||'')) n+=body[i++]; const grp=stack.pop(), k=n?+n:1; const top=stack[stack.length-1]; for(const e in grp) top[e]=(top[e]||0)+grp[e]*k; continue; }
      const em=body.slice(i).match(/^([A-Z][a-z]?)(\d*)/); if(!em) throw new Error('Формула оқылмады: '+str);
      const top=stack[stack.length-1]; top[em[1]]=(top[em[1]]||0)+(em[2]?+em[2]:1); i+=em[0].length;
    }
    for(const e in stack[0]) total[e]=(total[e]||0)+stack[0][e]*mult;
  }
  return {el:total,charge};
}
function molarMass(formula){ const {el}=parseFormula(formula); let M=0; for(const e in el){ if(AR[e]==null) throw new Error('Атомдық масса жоқ: '+e); M+=AR[e]*el[e]; } return M; }
function massFraction(formula, element){ const {el}=parseFormula(formula); return AR[element]*(el[element]||0)/molarMass(formula); }

// ---------- 3. Теңдеуді тексеру және теңестіру ----------
function splitEq(eq){ const [l,r]=eq.split(/=|→|->/).map(x=>x.trim()); return {L:l.split(/\s\+\s/).map(x=>x.trim()), R:r.split(/\s\+\s/).map(x=>x.trim())}; }
// Оқушы енгізген коэффициенттер дұрыс па: атомдар мен заряд сақталады, бүтін оң сандар, ЕҮОБ = 1
function checkCoefficients(eq, coeffs){
  const {L,R}=splitEq(eq), sp=[...L,...R];
  if(coeffs.length!==sp.length||coeffs.some(c=>!Number.isInteger(c)||c<=0)) return {ok:false,reason:'Коэффициенттер бүтін оң сан болуы керек'};
  const bal={}; let q=0;
  sp.forEach((f,i)=>{ const {el,charge}=parseFormula(f), sgn=i<L.length?1:-1; for(const e in el) bal[e]=(bal[e]||0)+sgn*coeffs[i]*el[e]; q+=sgn*coeffs[i]*charge; });
  const bad=Object.entries(bal).filter(([e,v])=>v!==0).map(([e])=>e);
  if(bad.length) return {ok:false,reason:'Атомдар сақталмаған: '+bad.join(', ')};
  if(q!==0) return {ok:false,reason:'Заряд сақталмаған'};
  const g=coeffs.reduce((a,b)=>gcd(a,b)); if(g!==1) return {ok:false,reason:'Коэффициенттерді '+g+'-ке қысқарт'};
  return {ok:true};
}
function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ [a,b]=[b,a%b]; } return a; }
// Рационал сандармен Гаусс әдісі — нөлдік кеңістік бір өлшемді болса, ең кіші бүтін коэффициенттер
function balance(eq){
  const {L,R}=splitEq(eq), sp=[...L,...R], parsed=sp.map(parseFormula);
  const els=[...new Set(parsed.flatMap(p=>Object.keys(p.el)))];
  const rows=els.map(e=>parsed.map((p,i)=>(i<L.length?1:-1)*(p.el[e]||0)));
  if(parsed.some(p=>p.charge)) rows.push(parsed.map((p,i)=>(i<L.length?1:-1)*p.charge));
  const n=sp.length; const M=rows.map(r=>r.map(x=>[x,1]));                  // [num,den]
  const fr=(a,b)=>{ const g=gcd(a,b)||1; const s=b<0?-1:1; return [s*a/g,s*b/g]; };
  const sub=(a,b)=>fr(a[0]*b[1]-b[0]*a[1],a[1]*b[1]), mul=(a,b)=>fr(a[0]*b[0],a[1]*b[1]), div=(a,b)=>fr(a[0]*b[1],a[1]*b[0]);
  let r=0; const piv=[];
  for(let c=0;c<n&&r<M.length;c++){ let p=r; while(p<M.length&&M[p][c][0]===0) p++; if(p===M.length) continue; [M[r],M[p]]=[M[p],M[r]];
    const pv=M[r][c]; M[r]=M[r].map(x=>div(x,pv));
    for(let i=0;i<M.length;i++) if(i!==r&&M[i][c][0]!==0){ const f=M[i][c]; M[i]=M[i].map((x,j)=>sub(x,mul(f,M[r][j]))); }
    piv.push(c); r++; }
  const free=[...Array(n).keys()].filter(c=>!piv.includes(c));
  if(free.length!==1) return null;                                          // бір мәнді емес
  const fc=free[0], sol=Array(n).fill(null); sol[fc]=[1,1];
  piv.forEach((c,i)=>{ sol[c]=fr(-M[i][fc][0],M[i][fc][1]); });
  const lcm=sol.reduce((a,x)=>a*x[1]/gcd(a,x[1]),1); let ints=sol.map(x=>x[0]*lcm/x[1]);
  if(ints.every(x=>x<0)) ints=ints.map(x=>-x); if(ints.some(x=>x<=0)) return null;
  const g=ints.reduce((a,b)=>gcd(a,b)); return ints.map(x=>x/g);
}
function formatEq(eq, k){ const {L,R}=splitEq(eq); const f=(arr,o)=>arr.map((s,i)=>(k[i+o]===1?'':k[i+o])+s).join(' + '); return f(L,0)+' → '+f(R,L.length); }

// ---------- 4. Электрондық конфигурация ----------
const SYM=['','H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe'];
const ORDER=['1s','2s','2p','3s','3p','4s','3d','4p','5s','4d','5p'];
const CAPS={s:2,p:6,d:10,f:14};
const EXC={24:{'3d':5,'4s':1},29:{'3d':10,'4s':1},41:{'4d':4,'5s':1},42:{'4d':5,'5s':1},44:{'4d':7,'5s':1},45:{'4d':8,'5s':1},46:{'4d':10,'5s':0},47:{'4d':10,'5s':1}};
function econf(Z){
  if(Z<1||Z>54) throw new Error('Z 1–54 аралығында');
  const occ={}; let left=Z; for(const o of ORDER){ if(left<=0) break; const c=Math.min(CAPS[o[1]],left); occ[o]=c; left-=c; }
  if(EXC[Z]) Object.assign(occ,EXC[Z]);
  const byShell=Object.keys(occ).filter(k=>occ[k]>0).sort((a,b)=>(+a[0]-+b[0])||('spdf'.indexOf(a[1])-'spdf'.indexOf(b[1])));
  const sup=n=>String(n).replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const full=byShell.map(k=>k+sup(occ[k])).join(' ');
  let unpaired=0; for(const k in occ){ const cap=CAPS[k[1]], orb=cap/2, e=occ[k]; unpaired+=e<=orb?e:cap-e; }
  return {Z,symbol:SYM[Z],occ,full,unpaired,valence:Object.keys(occ).filter(k=>+k[0]===Math.max(...Object.keys(occ).map(x=>+x[0]))).reduce((a,k)=>a+occ[k],0)};
}
// Соңғы электронның квант сандары. Ескерту: m_l реттілігі оқулыққа байланысты — мұғалім баптауда таңдайды.
function lastElectronQN(Z, mlOrder='minusFirst'){
  const {occ}=econf(Z); let last=null; for(const o of ORDER){ if(occ[o]) last=o; } if(EXC[Z]) last=Object.keys(EXC[Z]).find(k=>EXC[Z][k]>0&&k[1]!=='s')||last;
  const n=+last[0], l='spdf'.indexOf(last[1]), e=occ[last], orb=2*l+1;
  const idx=e<=orb?e-1:e-orb-1, ms=e<=orb?+0.5:-0.5;
  const mls=[...Array(orb).keys()].map(i=>i-l); if(mlOrder==='plusFirst') mls.reverse();
  return {n,l,ml:mls[idx],ms};
}

// ---------- 5. Сандық есеп генераторлары ----------
// Әрқайсысы: gen(rng) → {topic, kk (шарты), answer, unit, tol, steps[]}. rng — тұқымды кездейсоқ сан (қайталанатын).
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const pick=(r,arr)=>arr[Math.floor(r()*arr.length)];
const rint=(r,a,b,step=1)=>a+step*Math.floor(r()*((b-a)/step+1));
const fx=(x,d=2)=>(+x.toFixed(d)).toString().replace('.',',');
const sub=f=>f.replace(/(\d+)/g,m=>m.replace(/\d/g,d=>'₀₁₂₃₄₅₆₇₈₉'[d]));
const GEN={
  w_basic:{topic:11,gen(r){ const s=pick(r,['NaCl','KNO3','CuSO4','Na2CO3']), ms=rint(r,5,40,5), mw=rint(r,60,300,20); const w=ms/(ms+mw)*100;
    return {kk:`${ms} г ${sub(s)} ${mw} г суда ерітілді. Ерітіндідегі тұздың массалық үлесін (%) есепте.`,answer:w,unit:'%',tol:0.01,steps:[`m(ерітінді) = ${ms} + ${mw} = ${ms+mw} г`,`ω = ${ms} / ${ms+mw} · 100% = ${fx(w)}%`]}; }},
  w_mix:{topic:11,gen(r){ const m1=rint(r,100,400,50), w1=rint(r,5,20,5), m2=rint(r,100,400,50), w2=rint(r,25,40,5); const w=(m1*w1+m2*w2)/(m1+m2);
    return {kk:`${m1} г ${w1}%-дық және ${m2} г ${w2}%-дық тұз ерітінділері араластырылды. Алынған ерітіндідегі тұздың массалық үлесі (%) қанша?`,answer:w,unit:'%',tol:0.01,steps:[`m(тұз) = ${m1}·${fx(w1/100)} + ${m2}·${fx(w2/100)} = ${fx((m1*w1+m2*w2)/100)} г`,`m(ерітінді) = ${m1+m2} г`,`ω = ${fx(w)}%`]}; }},
  w_to_C:{topic:11,gen(r){ const c=pick(r,[{f:'H2SO4',w:98,rho:1.84},{f:'HNO3',w:63,rho:1.39},{f:'HCl',w:36.5,rho:1.18},{f:'NaOH',w:40,rho:1.43}]); const M=molarMass(c.f), C=10*c.w*c.rho/M;
    return {kk:`Тығыздығы ${fx(c.rho)} г/мл ${fx(c.w,1)}%-дық ${sub(c.f)} ерітіндісінің молярлық концентрациясын (моль/л) есепте.`,answer:C,unit:'моль/л',tol:0.01,steps:[`1 л ерітіндінің массасы = 1000 · ${fx(c.rho)} = ${fx(1000*c.rho,0)} г`,`m(${sub(c.f)}) = ${fx(1000*c.rho,0)} · ${fx(c.w/100,3)} = ${fx(10*c.w*c.rho,1)} г`,`n = ${fx(10*c.w*c.rho,1)} / ${fx(M,1)} = ${fx(C)} моль → C = ${fx(C)} моль/л`]}; }},
  C_prep:{topic:11,gen(r){ const s=pick(r,['NaOH','NaCl','KOH','Na2CO3']), V=pick(r,[100,200,250,500]), C=pick(r,[0.1,0.2,0.5,1]); const M=molarMass(s), m=C*V/1000*M;
    return {kk:`${V} мл ${fx(C,1)} М ${sub(s)} ерітіндісін дайындау үшін қанша грамм ${sub(s)} керек?`,answer:m,unit:'г',tol:0.01,steps:[`n = C·V = ${fx(C,1)} · ${fx(V/1000,3)} = ${fx(C*V/1000,3)} моль`,`m = n·M = ${fx(C*V/1000,3)} · ${fx(M,1)} = ${fx(m)} г`]}; }},
  gas_H2:{topic:19,gen(r){ const me=pick(r,[{s:'Zn',z:2},{s:'Mg',z:2},{s:'Fe',z:2},{s:'Al',z:3}]), m=rint(r,1,10)*AR[me.s]/10; const n=m/AR[me.s], nH2=n*me.z/2, V=nH2*VM;
    return {kk:`${fx(m,2)} г ${me.s} тұз қышқылының артық мөлшерімен әрекеттесті. Бөлінген сутектің көлемін (л, қ.ж.) есепте.`,answer:V,unit:'л',tol:0.01,steps:[`n(${me.s}) = ${fx(m,2)} / ${AR[me.s]} = ${fx(n,3)} моль`,me.s==='Al'?'2Al + 6HCl → 2AlCl₃ + 3H₂':`${me.s} + 2HCl → ${me.s}Cl₂ + H₂`,`n(H₂) = ${fx(nH2,3)} моль, V = ${fx(nH2,3)} · 22,4 = ${fx(V)} л`]}; }},
  excess:{topic:6,gen(r){ const mNaCl=rint(r,10,40)*0.585, mAg=rint(r,10,40)*1.7; const n1=mNaCl/58.5, n2=mAg/170, n=Math.min(n1,n2), m=n*143.5;
    return {kk:`${fx(mNaCl,2)} г NaCl бар ерітіндіге ${fx(mAg,2)} г AgNO₃ бар ерітінді қосылды. Түзілген тұнбаның массасын (г) есепте.`,answer:m,unit:'г',tol:0.01,steps:[`n(NaCl) = ${fx(n1,3)} моль, n(AgNO₃) = ${fx(n2,3)} моль`,`AgNO₃ + NaCl → AgCl↓ + NaNO₃ — артық емес зат: ${n1<n2?'NaCl':'AgNO₃'}`,`m(AgCl) = ${fx(n,3)} · 143,5 = ${fx(m)} г`]}; }},
  faraday:{topic:8,gen(r){ const me=pick(r,[{s:'Cu',z:2,salt:'CuSO₄'},{s:'Ag',z:1,salt:'AgNO₃'},{s:'Zn',z:2,salt:'ZnSO₄'}]), I=pick(r,[1,2,2.5,5]), t=pick(r,[1930,3600,965,7200]); const m=AR[me.s]*I*t/(me.z*F);
    return {kk:`${me.salt} ерітіндісі инертті электродтармен ${fx(I,1)} А ток күшімен ${t} с электролизденді. Катодта бөлінген ${me.s} массасын (г) есепте (F = 96500 Кл/моль).`,answer:m,unit:'г',tol:0.01,steps:[`m = M·I·t / (z·F)`,`m = ${AR[me.s]}·${fx(I,1)}·${t} / (${me.z}·96500) = ${fx(m,3)} г`]}; }},
  vant_hoff:{topic:9,gen(r){ const g=pick(r,[2,3,4]), T1=pick(r,[10,20,30]), dT=pick(r,[20,30,40]); const k=Math.pow(g,dT/10);
    return {kk:`Реакцияның температуралық коэффициенті γ = ${g}. Температураны ${T1} °C-тан ${T1+dT} °C-қа көтергенде реакция жылдамдығы неше есе артады?`,answer:k,unit:'есе',tol:0.001,steps:[`v₂/v₁ = γ^((t₂−t₁)/10) = ${g}^${dT/10} = ${fx(k,0)}`]}; }},
  Kc_HI:{topic:10,gen(r){ const c0=pick(r,[1,2,0.5]), a=pick(r,[0.5,0.6,0.8,0.75]); const x=c0*a, K=(2*x)**2/((c0-x)**2);
    return {kk:`H₂ + I₂ ⇌ 2HI. Бастапқы [H₂] = [I₂] = ${fx(c0,1)} моль/л. Тепе-теңдік орнағанда сутектің ${a*100}%-ы әрекеттесті. Тепе-теңдік константасын (Kc) есепте.`,answer:K,unit:'',tol:0.01,steps:[`Әрекеттескені x = ${fx(x,2)} моль/л`,`[H₂] = [I₂] = ${fx(c0-x,2)}; [HI] = ${fx(2*x,2)}`,`Kc = ${fx(2*x,2)}² / (${fx(c0-x,2)}·${fx(c0-x,2)}) = ${fx(K,2)}`]}; }},
  empirical:{topic:25,gen(r){ const c=pick(r,['C2H6','C3H8','C2H4','C4H10','C6H6','C3H6','C2H6O','CH4O']); const {el}=parseFormula(c), M=molarMass(c);
    const ws=Object.keys(el).map(e=>`${e} — ${fx(AR[e]*el[e]/M*100,1)}%`).join(', ');
    return {kk:`Заттың құрамы: ${ws}. Сутек бойынша салыстырмалы тығыздығы ${fx(M/2,1)}. Молекулалық формуласын анықта (жауабы — молярлық масса, г/моль).`,answer:M,unit:'г/моль',tol:0.01,formula:c,steps:[`M = 2 · ${fx(M/2,1)} = ${M} г/моль`,`Әр элемент атомдарының саны = ω·M / Ar`,`Формула: ${sub(c)}`]}; }},
  alkane_M:{topic:26,gen(r){ const n=rint(r,2,8), M=14*n+2;
    return {kk:`Алканның молярлық массасы ${M} г/моль. Ондағы көміртек атомдарының санын тап.`,answer:n,unit:'',tol:0,steps:[`CₙH₂ₙ₊₂: 14n + 2 = ${M}`,`n = ${n}`]}; }},
  combustion:{topic:26,gen(r){ const n=rint(r,1,5), V=rint(r,1,10); const o2=(3*n+1)/2, Vo=V*o2;
    const f=n===1?'CH₄':`C${n}H${2*n+2}`.replace(/\d/g,d=>'₀₁₂₃₄₅₆₇₈₉'[d]);
    return {kk:`${V} л ${f} толық жану үшін қанша литр оттек керек (бірдей жағдайда)?`,answer:Vo,unit:'л',tol:0.001,steps:[`CₙH₂ₙ₊₂ + (3n+1)/2 O₂ → nCO₂ + (n+1)H₂O`,`n = ${n}: O₂ коэффициенті ${fx(o2,1)}`,`V(O₂) = ${V} · ${fx(o2,1)} = ${fx(Vo,1)} л`]}; }},
  mix_MgAl:{topic:21,gen(r){ const nAl=rint(r,1,4)/10, nMg=rint(r,1,4)/20; const m=nAl*27+nMg*24, V=nAl*1.5*VM, w=nMg*24/m*100;
    return {kk:`${fx(m,2)} г магний мен алюминий қоспасына натрий гидроксидінің артық ерітіндісі әсер еткенде ${fx(V,2)} л (қ.ж.) газ бөлінді. Қоспадағы магнийдің массалық үлесін (%) тап.`,answer:w,unit:'%',tol:0.01,steps:[`Сілтімен тек Al әрекеттеседі: 2Al + 2NaOH + 6H₂O → 2Na[Al(OH)₄] + 3H₂`,`n(H₂) = ${fx(V/VM,3)} моль → n(Al) = ${fx(nAl,3)} моль, m(Al) = ${fx(nAl*27,2)} г`,`m(Mg) = ${fx(nMg*24,2)} г, ω(Mg) = ${fx(w,1)}%`]}; }},
  pH_strong:{topic:7,gen(r){ const acid=r()<0.5, p=rint(r,1,4), C=Math.pow(10,-p); const ph=acid?p:14-p;
    return {kk:`${acid?'HCl':'NaOH'} ерітіндісінің концентрациясы ${fx(C,4)} моль/л. Ерітіндінің pH мәнін есепте.`,answer:ph,unit:'',tol:0.001,steps:[acid?`[H⁺] = ${fx(C,4)} → pH = −lg ${fx(C,4)} = ${p}`:`[OH⁻] = ${fx(C,4)} → pOH = ${p}, pH = 14 − ${p} = ${14-p}`]}; }},
  plate:{topic:19,gen(r){ const n=rint(r,1,5)/20, dm=n*8;
    return {kk:`Темір пластинка мыс(II) сульфаты ерітіндісіне батырылды. Біраз уақыттан кейін пластинканың массасы ${fx(dm,2)} г артты. Пластинкаға қонған мыстың массасын (г) есепте.`,answer:n*64,unit:'г',tol:0.01,steps:[`Fe + CuSO₄ → FeSO₄ + Cu: 1 моль әрекеттескенде масса 64 − 56 = 8 г артады`,`n = ${fx(dm,2)} / 8 = ${fx(n,3)} моль`,`m(Cu) = ${fx(n,3)} · 64 = ${fx(n*64,2)} г`]}; }}
};
function generate(id, seed=1){ const g=GEN[id]; const p=g.gen(mulberry32(seed)); return {id,seed,topic:g.topic,...p}; }
// Оқушы жауабын тексеру: сан, бірлік қатесі, дөңгелектеу
// tol — салыстырмалы рұқсат (0,01 = 1 %); tol = 0 — дәл сәйкестік
function checkNumeric(user, answer, tol=0.01){ const u=typeof user==='string'?parseFloat(user.replace(',','.')):user; if(!isFinite(u)) return {ok:false,reason:'Сан енгіз'};
  const ok=Math.abs(u-answer)<=tol*Math.abs(answer)+1e-9; if(ok) return {ok:true};
  for(const k of [1000,0.001,100,0.01]) if(Math.abs(u-answer*k)<=tol*Math.abs(answer*k)) return {ok:false,reason:'Бірлікті тексер (мысалы, г ↔ кг, мл ↔ л)'};
  return {ok:false,reason:'Жауап дұрыс емес'}; }

if(typeof module!=='undefined') module.exports={sub,AR,VM,F,parseFormula,molarMass,massFraction,checkCoefficients,balance,formatEq,econf,lastElectronQN,GEN,generate,checkNumeric,mulberry32};
