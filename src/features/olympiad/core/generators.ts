// ---------- 5. Сандық есеп генераторлары ----------
// Әрқайсысы: gen(rng) → {topic, kk (шарты), answer, unit, tol, steps[]}. rng — тұқымды кездейсоқ сан (қайталанатын).
import { AR, F, molarMass, parseFormula, VM } from "./formula";

export type Rng = () => number;
export type GenProblem = { kk: string; answer: number; unit: string; tol: number; steps: string[]; formula?: string };
export type Generator = { topic: number; gen(r: Rng): GenProblem };

export function mulberry32(a: number): Rng { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const pick = <T,>(r: Rng, arr: T[]) => arr[Math.floor(r() * arr.length)];
export const rint = (r: Rng, a: number, b: number, step = 1) => a + step * Math.floor(r() * ((b - a) / step + 1));
export const fx = (x: number, d = 2) => (+x.toFixed(d)).toString().replace('.', ',');
export const sub = (f: string) => f.replace(/(\d+)/g, m => m.replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[+d]));
export const GEN: Record<string, Generator> = {
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
    const f=n===1?'CH₄':`C${n}H${2*n+2}`.replace(/\d/g,d=>'₀₁₂₃₄₅₆₇₈₉'[+d]);
    return {kk:`${V} л ${f} толық жану үшін қанша литр оттек керек (бірдей жағдайда)?`,answer:Vo,unit:'л',tol:0.001,steps:[`CₙH₂ₙ₊₂ + (3n+1)/2 O₂ → nCO₂ + (n+1)H₂O`,`n = ${n}: O₂ коэффициенті ${fx(o2,1)}`,`V(O₂) = ${V} · ${fx(o2,1)} = ${fx(Vo,1)} л`]}; }},
  mix_MgAl:{topic:21,gen(r){ const nAl=rint(r,1,4)/10, nMg=rint(r,1,4)/20; const m=nAl*27+nMg*24, V=nAl*1.5*VM, w=nMg*24/m*100;
    return {kk:`${fx(m,2)} г магний мен алюминий қоспасына натрий гидроксидінің артық ерітіндісі әсер еткенде ${fx(V,2)} л (қ.ж.) газ бөлінді. Қоспадағы магнийдің массалық үлесін (%) тап.`,answer:w,unit:'%',tol:0.01,steps:[`Сілтімен тек Al әрекеттеседі: 2Al + 2NaOH + 6H₂O → 2Na[Al(OH)₄] + 3H₂`,`n(H₂) = ${fx(V/VM,3)} моль → n(Al) = ${fx(nAl,3)} моль, m(Al) = ${fx(nAl*27,2)} г`,`m(Mg) = ${fx(nMg*24,2)} г, ω(Mg) = ${fx(w,1)}%`]}; }},
  pH_strong:{topic:7,gen(r){ const acid=r()<0.5, p=rint(r,1,4), C=Math.pow(10,-p); const ph=acid?p:14-p;
    return {kk:`${acid?'HCl':'NaOH'} ерітіндісінің концентрациясы ${fx(C,4)} моль/л. Ерітіндінің pH мәнін есепте.`,answer:ph,unit:'',tol:0.001,steps:[acid?`[H⁺] = ${fx(C,4)} → pH = −lg ${fx(C,4)} = ${p}`:`[OH⁻] = ${fx(C,4)} → pOH = ${p}, pH = 14 − ${p} = ${14-p}`]}; }},
  plate:{topic:19,gen(r){ const n=rint(r,1,5)/20, dm=n*8;
    return {kk:`Темір пластинка мыс(II) сульфаты ерітіндісіне батырылды. Біраз уақыттан кейін пластинканың массасы ${fx(dm,2)} г артты. Пластинкаға қонған мыстың массасын (г) есепте.`,answer:n*64,unit:'г',tol:0.01,steps:[`Fe + CuSO₄ → FeSO₄ + Cu: 1 моль әрекеттескенде масса 64 − 56 = 8 г артады`,`n = ${fx(dm,2)} / 8 = ${fx(n,3)} моль`,`m(Cu) = ${fx(n,3)} · 64 = ${fx(n*64,2)} г`]}; }}
};
export function generate(id: string, seed = 1) { const g = GEN[id]; const p = g.gen(mulberry32(seed)); return { id, seed, topic: g.topic, ...p }; }
