import assert from 'node:assert/strict';
import worker from './worker/index.mjs';
import {env} from './check-accounts.mjs';
const origin='http://127.0.0.1:4174';
async function call(path,method='GET',body=null,cookie=''){
  return worker.fetch(new Request(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'CF-Connecting-IP':crypto.randomUUID()},...(body?{body:JSON.stringify(body)}:{})}),env);
}
async function login(username,password){const r=await call('/api/account-login','POST',{username,password,profile:'prof'});assert.equal(r.status,200);return r.headers.getSetCookie()[0].split(';')[0];}
const teacher=await login('professora@example.test','teacher-test-only'),student=await login('aluno.teste','account-test-only'),parent=await login('responsavel.teste','account-test-only');
let r=await call('/api/school','GET',null,teacher);assert.equal(r.status,200);let data=await r.json();
const studentId=data.students[0].id,parentId=data.accounts.find(a=>a.role==='parent').id;
assert.ok(data.accounts.find(a=>a.id===studentId).last_seen_at);
async function create(kind,values={}){const r=await call('/api/school/items','POST',{kind,title:'Título de teste',body:'Conteúdo fictício de teste',...values},teacher);assert.equal(r.status,201);return (await r.json()).id;}
const taskId=await create('task',{title:'Revisar o conteúdo da semana',body:'Escolha um tema da última aula e resolva três exercícios.',subject:'Matemática',studentId});
await create('notice',{title:'Boas-vindas à turma',body:'Use este espaço para acompanhar as atividades e conversar com a escola.'});
await create('event',{title:'Encontro com as famílias',body:'Conversa sobre a rotina de estudos e os próximos passos.',dueAt:'2026-11-20',format:'Online'});
const authorizationId=await create('authorization',{title:'Participação na atividade da turma',body:'Confirme a participação do aluno nesta atividade.',studentId});
await create('observation',{title:'Participação em aula',body:'Demonstrou empenho e fez boas perguntas durante a atividade.',studentId,category:'Participação'});
const attentionId=await create('observation',{title:'Observação reservada à família',body:'Acompanhar a rotina de descanso.',studentId,category:'Atenção'});
const reportId=await create('report',{title:'Relatório da semana',body:'O aluno avançou nas atividades. Em casa, reservem um horário para revisão.',studentId});
r=await call('/api/school','GET',null,parent);data=await r.json();assert.ok(!data.items.some(i=>i.id===reportId));assert.equal(data.students.length,0);
r=await call('/api/school/links','POST',{parentId,studentId},teacher);assert.equal(r.status,201);
r=await call('/api/school','GET',null,parent);data=await r.json();assert.equal(data.students.length,1);assert.ok(data.items.some(i=>i.id===reportId));
r=await call('/api/school','GET',null,student);data=await r.json();assert.ok(data.items.some(i=>i.id===taskId));assert.ok(!data.items.some(i=>i.id===authorizationId));assert.ok(!data.items.some(i=>i.id===attentionId));assert.equal(data.accounts.length,0);
r=await call('/api/school/items/'+taskId+'/response','POST',{status:'done'},student);assert.equal(r.status,200);
r=await call('/api/school','GET',null,teacher);data=await r.json();assert.ok(data.responses.some(a=>a.item_id===taskId&&a.account_id===studentId&&a.status==='done'));
r=await call('/api/school/items/'+authorizationId+'/response','POST',{status:'approved'},parent);assert.equal(r.status,200);
r=await call('/api/school/items/'+authorizationId+'/response','POST',{status:'approved'},student);assert.equal(r.status,403);
r=await call('/api/school/items','POST',{kind:'task',title:'Não permitido',body:'Não permitido'},student);assert.equal(r.status,403);
r=await call('/api/school/items','POST',{kind:'goal',title:'Estudar um pouco a cada dia'},student);assert.equal(r.status,201);const goalId=(await r.json()).id;
r=await call('/api/school/items/'+goalId+'/response','POST',{status:'done'},student);assert.equal(r.status,200);
r=await call('/api/school','GET',null,parent);data=await r.json();assert.ok(!data.items.some(i=>i.id===goalId));
r=await call('/api/school/items','POST',{kind:'message',title:'Dúvida',body:'Como posso revisar esta atividade?'},student);assert.equal(r.status,201);const messageId=(await r.json()).id;
r=await call('/api/school','GET',null,teacher);data=await r.json();assert.ok(data.items.some(i=>i.id===messageId));
r=await call('/api/school','GET',null,parent);data=await r.json();assert.ok(!data.items.some(i=>i.id===messageId));
r=await call('/api/school/links','POST',{parentId,studentId},parent);assert.equal(r.status,403);
r=await call('/api/school/items/'+taskId,'DELETE',null,student);assert.equal(r.status,403);
r=await call('/api/school');assert.equal(r.status,401);
// An independent teacher and their students never receive another class's data.
r=await call('/api/register-teacher','POST',{name:'Outra professora de teste',email:'outra@example.test',password:'teacher-test-only'});assert.equal(r.status,201);
const secondTeacher=env.DB.raw.prepare("SELECT * FROM accounts WHERE login='outra@example.test'").get();env.DB.raw.prepare("UPDATE accounts SET status='active' WHERE id=?").run(secondTeacher.id);
const other=await login('outra@example.test','teacher-test-only');
r=await call('/api/school','GET',null,other);data=await r.json();assert.equal(data.items.length,0);assert.equal(data.students.length,0);
r=await call('/api/school/items','POST',{kind:'report',title:'Não permitido',body:'Não permitido',studentId},other);assert.equal(r.status,403);
r=await call('/api/school/items/'+taskId+'/response','POST',{status:'done'},other);assert.equal(r.status,404);
r=await worker.fetch(new Request(origin+'/'),env);const shell=await r.text();assert.ok(shell.includes('id="school-app"'));assert.ok(!shell.includes('<iframe'));assert.ok(shell.includes('school.js'));assert.ok(shell.includes('brand-logo.svg'));
for(const asset of ['school.js','school.css','brand-icon.svg','brand-logo.svg']){r=await worker.fetch(new Request(origin+'/'+asset),env);assert.equal(r.status,200);}
const event=env.DB.raw.prepare("SELECT id FROM school_items WHERE kind='event'").get();
r=await call('/api/school/items/'+event.id,'PATCH',{dueAt:'2026-11-20T14:00',endAt:'2026-11-20T15:00'},teacher);assert.equal(r.status,200);
r=await call('/api/school/items/'+event.id,'PATCH',{dueAt:'2026-11-21T14:00'},teacher);assert.equal(r.status,200);
r=await call('/api/school','GET',null,parent);data=await r.json();const moved=data.items.find(item=>item.id===event.id);assert.equal(moved.due_at,'2026-11-21T14:00');assert.equal(moved.payload.endAt,'2026-11-21T15:00');
r=await call('/api/school/items/'+event.id,'PATCH',{dueAt:'2026-11-22T14:00'},student);assert.equal(r.status,403);
for(const [path,type]of [['favicon.ico','image/x-icon'],['favicon-32.png','image/png'],['apple-touch-icon.png','image/png']]){r=await worker.fetch(new Request(origin+'/'+path+'?v=4'),env);assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),type);const bytes=new Uint8Array(await r.arrayBuffer());assert.ok(bytes.length>100);assert.equal(bytes[0],path.endsWith('.ico')?0:137);}
console.log('Passed: native school data, student tasks and goals, linked family reports, authorizations, private messages, cross-class isolation, and permissions.');
