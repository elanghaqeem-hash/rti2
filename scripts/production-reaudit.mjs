const BASE=(process.env.SMOKE_BASE_URL||'https://risetin.co.id').replace(/\/$/,'');
const results=[];
function out(name,ok,detail){results.push({name,ok,detail}); console.log(`AUDIT |${ok?'PASS':'FAIL'}| ${name} | ${detail}`);}
async function req(name,path,opts={},check){
  try{
    const r=await fetch(BASE+path,{redirect:'manual',headers:{'user-agent':'RTI-Production-Audit/2026-09-27',...(opts.headers||{})},...opts});
    const text=await r.text();
    const result=check?check(r,text):{ok:r.ok,detail:`HTTP ${r.status}`};
    out(name,!!result.ok,result.detail||`HTTP ${r.status}`);
    return {r,text};
  }catch(e){out(name,false,`request error: ${e?.message||e}`); return null;}
}
console.log('Target:',BASE);

const home=await req('homepage-current-rti2','/',{},(r,t)=>{
  const marker=/Technology That Moves\s*Business Forward/i.test(t)&&/Start Free Maturity Assessment/i.test(t);
  const legacy=/Countdown Timer Expired|PopularFX Theme/i.test(t);
  return {ok:r.status===200&&marker&&!legacy,detail:`HTTP ${r.status}; rti2Marker=${marker}; legacyMarker=${legacy}; server=${r.headers.get('server')||''}`};
});
if(home){
  for(const h of ['strict-transport-security','content-security-policy','x-frame-options','x-content-type-options','referrer-policy']){
    const v=home.r.headers.get(h); out('header:'+h,!!v,v||'missing');
  }
}

await req('route:/assessment','/assessment',{},(r,t)=>({ok:r.status===200&&/maturity|assessment/i.test(t),detail:`HTTP ${r.status}; marker=${/maturity|assessment/i.test(t)}`}));
await req('route:/contact','/contact',{},(r,t)=>({ok:r.status===200&&/inquiry|contact|RFQ/i.test(t),detail:`HTTP ${r.status}; marker=${/inquiry|contact|RFQ/i.test(t)}`}));
await req('route:/tools','/tools',{},(r,t)=>({ok:r.status===200&&/tools|diagnostic|assessment/i.test(t),detail:`HTTP ${r.status}; marker=${/tools|diagnostic|assessment/i.test(t)}`}));
await req('security.txt','/.well-known/security.txt',{},(r,t)=>({ok:r.status===200&&/^Contact:/mi.test(t)&&/^Expires:/mi.test(t),detail:`HTTP ${r.status}; contact=${/^Contact:/mi.test(t)}; expires=${/^Expires:/mi.test(t)}`}));
await req('route:/admin-access','/admin-access',{},(r,t)=>({ok:r.status===200&&/admin|login|access/i.test(t),detail:`HTTP ${r.status}; marker=${/admin|login|access/i.test(t)}`}));
await req('admin-page-redirect','/admin/leads',{},(r)=>({ok:[301,302,303,307,308].includes(r.status)&&(r.headers.get('location')||'').includes('/admin-access'),detail:`HTTP ${r.status}; location=${r.headers.get('location')||''}`}));
await req('admin-auth-status-unauth','/api/admin/auth/status',{},(r,t)=>({ok:r.status===401,detail:`HTTP ${r.status}; body=${t.slice(0,120).replace(/\s+/g,' ')}`}));
await req('lead-read-unauth','/api/leads',{},(r,t)=>({ok:r.status===401,detail:`HTTP ${r.status}; body=${t.slice(0,120).replace(/\s+/g,' ')}`}));
await req('system-setup-unauth','/api/admin/system/setup',{},(r,t)=>({ok:r.status===401,detail:`HTTP ${r.status}; body=${t.slice(0,120).replace(/\s+/g,' ')}`}));
await req('public-parameters','/api/parameters',{},(r,t)=>{
  let j=null; try{j=JSON.parse(t)}catch{}
  return {ok:r.status===200&&j?.success===true,detail:`HTTP ${r.status}; success=${j?.success===true}; dbConnected=${j?.database?.connected??'not-reported'}`};
});

const jsonHeaders={'content-type':'application/json'};
await req('api:assessment-route-exists','/api/assessment/score',{method:'POST',headers:jsonHeaders,body:'{}'},(r,t)=>({ok:r.status!==404,detail:`HTTP ${r.status}; body=${t.slice(0,150).replace(/\s+/g,' ')}`}));
await req('api:chat-route-exists','/api/chat',{method:'POST',headers:jsonHeaders,body:JSON.stringify({messages:[{role:'user',content:'RTI audit ping'}]})},(r,t)=>({ok:r.status!==404,detail:`HTTP ${r.status}; body=${t.slice(0,150).replace(/\s+/g,' ')}`}));
await req('api:headers-check-route-exists','/api/tools/headers-check',{method:'POST',headers:jsonHeaders,body:JSON.stringify({domain:'example.com',authorized:true})},(r,t)=>({ok:r.status!==404,detail:`HTTP ${r.status}; body=${t.slice(0,150).replace(/\s+/g,' ')}`}));
await req('api:lead-post-protection','/api/leads',{method:'POST',headers:jsonHeaders,body:JSON.stringify({source:'audit',name:'Audit Test',role:'QA',company:'RTI',sector:'Technology',email:'audit@example.com',needSummary:'Audit only',consent:true})},(r,t)=>({ok:r.status!==404&&r.status!==201,detail:`HTTP ${r.status}; expected protected rejection/no persistence; body=${t.slice(0,150).replace(/\s+/g,' ')}`}));

console.log('\n=== AUDIT SUMMARY ===');
for(const x of results) console.log(`${x.ok?'PASS':'FAIL'}\t${x.name}\t${x.detail}`);
const pass=results.filter(x=>x.ok).length, fail=results.length-pass;
console.log(`TOTAL=${results.length} PASS=${pass} FAIL=${fail}`);
process.exitCode=fail?1:0;
