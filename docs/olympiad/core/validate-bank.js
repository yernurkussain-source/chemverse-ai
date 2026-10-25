// Есептер банкін тексеру: node validate-bank.js (TOPICS.json мен PROBLEMS.json бір папкада жоғарыда)
const C=require('./olympiad-core.js'), path=require('path'), assert=require('assert');
const P=require(path.join(__dirname,'..','PROBLEMS.json')), T=require(path.join(__dirname,'..','TOPICS.json'));
const ids=new Set(); let err=0;
for(const p of P){
  try{
    assert.ok(!ids.has(p.id),'қайталанған id'); ids.add(p.id);
    assert.ok(T.find(t=>t.n===p.topic),'тақырып жоқ');
    assert.ok(p.kk&&p.solution.length&&p.hints.length===3,'мәтін/шешім/3 ишара');
    if(p.type==='balance'){ assert.deepStrictEqual(C.balance(p.equation),p.coeffs); assert.ok(C.checkCoefficients(p.equation,p.coeffs).ok); }
    if(p.type==='econf'){ assert.equal(C.econf(p.Z).unpaired,p.unpaired); }
    if(p.type==='mcq'){ assert.ok(p.correct>=0&&p.correct<p.choices.length); }
    if(p.type==='numeric'){ assert.ok(isFinite(p.answer.value)); assert.ok(C.checkNumeric(String(p.answer.value).replace('.',','),p.answer.value,p.answer.tol).ok); }
    if(p.type==='open'){ assert.ok(p.rubric.length>=3); }
  }catch(e){ err++; console.log('✗',p.id,e.message); }
}
const per={}; P.forEach(p=>per[p.topic]=(per[p.topic]||0)+1);
console.log(`${P.length} есеп тексерілді, қате: ${err}. Тақырыптар бойынша:`,JSON.stringify(per));
process.exit(err?1:0);
