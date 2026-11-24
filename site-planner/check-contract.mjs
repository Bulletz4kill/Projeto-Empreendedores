import assert from 'node:assert/strict';
import {env,call,login,admin,teacher,institutionId} from './check-accounts.mjs';
const request={schoolName:'Escola solicitante de teste',name:'Gestora solicitante',login:'gestora.solicitante',password:'request-test-only',studentLimit:350,billingCycle:'annual',paymentOption:'upfront',status:'active'};
let r=await call('/api/institution-request','POST',request);assert.equal(r.status,201);const result=await r.json();assert.equal(result.status,'pending');assert.ok(!JSON.stringify(result).includes('request-test-only'));
const stored=env.DB.raw.prepare('SELECT * FROM accounts WHERE login=?').get(request.login),school=env.DB.raw.prepare('SELECT * FROM institutions WHERE id=?').get(stored.institution_id);assert.equal(school.status,'pending');assert.equal(school.amount_cents,160000);assert.equal(stored.account_kind,'institution');assert.notEqual(stored.password_hash,request.password);
const manager=await login(request.login,request.password);
r=await call('/api/institution','GET',null,manager);let snapshot=await r.json();assert.equal(snapshot.institution.status,'pending');assert.equal(snapshot.accounts.length,0);assert.equal(snapshot.classes.length,0);
for(const path of ['/api/institution/classes','/api/institution/accounts','/api/institution/members','/api/institution/links']){r=await call(path,'POST',{name:'Proibido',academicYear:2026},manager);assert.equal(r.status,403);}
r=await call('/api/institutions','GET',null,manager);assert.equal(r.status,403);r=await call('/api/school','GET',null,manager);assert.equal(r.status,403);
r=await call('/api/institution/plan-request','POST',{studentLimit:1100,billingCycle:'monthly',paymentOption:'installments'},manager);assert.equal(r.status,201);r=await call('/api/institution','GET',null,manager);snapshot=await r.json();assert.equal(snapshot.institution.amount_cents,305000);assert.equal(snapshot.institution.status,'pending');
const count=env.DB.raw.prepare('SELECT count(*) AS n FROM institutions').get().n;r=await call('/api/institution-request','POST',request);assert.equal(r.status,409);assert.equal(env.DB.raw.prepare('SELECT count(*) AS n FROM institutions').get().n,count);
r=await call('/api/institution/plan-request','POST',{studentLimit:350,billingCycle:'annual'},teacher);assert.equal(r.status,403);
r=await call('/api/institutions/'+school.id,'PATCH',{name:request.schoolName,status:'active',studentLimit:1100,billingCycle:'annual',paymentOption:'installments'},admin);assert.equal(r.status,200);
r=await call('/api/institution/classes','POST',{name:'Turma autorizada',academicYear:2026},manager);assert.equal(r.status,201);
for(let n=0;n<6;n++){r=await call('/api/institution-request','POST',{},'','request-rate-test');assert.equal(r.status,n<5?400:429);}
r=await call('/api/institution','GET',null,await login('gestao.teste','manager-test-only'));assert.equal((await r.json()).institution.id,institutionId);
console.log('Passed: public plan request, forced pending status, secure manager login, locked management until ADM approval, repricing, duplicate prevention and throttling.');
