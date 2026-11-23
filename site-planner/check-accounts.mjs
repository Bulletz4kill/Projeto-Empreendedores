import assert from 'node:assert/strict';
import worker from './worker/index.mjs';
import {testDatabase} from './testing/d1.mjs';
const DB=testDatabase(),env={DB,ADMIN_USERNAME:'preview-admin',ADMIN_PASSWORD:'preview-password',AUTH_SECRET:crypto.randomUUID()},origin='http://127.0.0.1:4174';
export {env};
export async function call(path,method='GET',data=null,cookie='',ip=crypto.randomUUID()){return worker.fetch(new Request(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'CF-Connecting-IP':ip},...(data?{body:JSON.stringify(data)}:{})}),env);}
export const cookie=r=>r.headers.getSetCookie()[0].split(';')[0];
export async function login(username,password){const r=await call('/api/account-login','POST',{username,password});assert.equal(r.status,200,await r.clone().text());return cookie(r);}
let r=await call('/api/login','POST',{username:env.ADMIN_USERNAME,password:env.ADMIN_PASSWORD});assert.equal(r.status,200);export const admin=cookie(r);
r=await call('/api/institutions','POST',{name:'Colégio de demonstração',status:'active',billingCycle:'annual',paymentOption:'upfront',studentLimit:350},admin);assert.equal(r.status,201);export const institutionId=(await r.json()).id;
r=await call('/api/institutions/'+institutionId+'/manager','POST',{name:'Gestão de teste',login:'gestao.teste',password:'manager-test-only'},admin);assert.equal(r.status,201);
export const manager=await login('gestao.teste','manager-test-only');
async function makeClass(name){const r=await call('/api/institution/classes','POST',{name,academicYear:2026},manager);assert.equal(r.status,201);return (await r.json()).id;}
export const classA=await makeClass('Turma A'),classB=await makeClass('Turma B');
export async function makeAccount(role,name,loginValue,classId=classA,studentId=''){const r=await call('/api/institution/accounts','POST',{role,name,login:loginValue,password:role==='teacher'?'teacher-test-only':'account-test-only',classId,studentId},manager);assert.equal(r.status,201,await r.clone().text());return (await r.json()).user.id;}
export const teacherId=await makeAccount('teacher','Professora de teste','professora@example.test'),teacherTwoId=await makeAccount('teacher','Segundo professor','outro.prof');
export const studentId=await makeAccount('student','Aluno de teste','aluno.teste'),studentBId=await makeAccount('student','Aluno da turma B','aluno.b',classB);
export const parentId=await makeAccount('parent','Responsável de teste','responsavel.teste','',studentId);
export const teacher=await login('professora@example.test','teacher-test-only'),teacherTwo=await login('outro.prof','teacher-test-only'),student=await login('aluno.teste','account-test-only'),parent=await login('responsavel.teste','account-test-only');
for(const c of [teacher,teacherTwo,student,parent]){r=await call('/api/institution/accounts','POST',{role:'student',name:'Proibido',login:'proibido',password:'account-test-only',classId:classA},c);assert.equal(r.status,403);r=await call('/api/institutions','GET',null,c);assert.equal(r.status,403);}
r=await call('/api/register-teacher','POST',{name:'Proibido',email:'x@example.test',password:'password-only'});assert.equal(r.status,403);
r=await call('/api/accounts','POST',{role:'parent',name:'Proibido',login:'proibido',password:'password-only'},teacher);assert.equal(r.status,403);
r=await call('/api/institution','GET',null,manager);const snapshot=await r.json();assert.equal(snapshot.members.filter(m=>m.class_id===classA).length,3);assert.ok(!JSON.stringify(snapshot).includes('password_hash'));assert.equal(snapshot.links.length,1);
r=await call('/api/institution/accounts','POST',{role:'teacher',name:'Duplicado',login:'OUTRO.PROF',password:'teacher-test-only',classId:classA},manager);assert.equal(r.status,400);
r=await call('/api/account-login','POST',{username:'aluno.teste',password:'wrong'});assert.equal(r.status,401);
for(let n=0;n<8;n++){r=await call('/api/account-login','POST',{username:'aluno.teste',password:'wrong'},'','rate-test');assert.equal(r.status,401);}r=await call('/api/account-login','POST',{username:'aluno.teste',password:'account-test-only'},'','rate-test');assert.equal(r.status,429);
const stored=DB.raw.prepare('SELECT * FROM accounts WHERE id=?').get(studentId);assert.notEqual(stored.password_hash,'account-test-only');assert.equal(stored.password_hash.length,64);
console.log('Passed: institution-only account creation, class memberships, manager access, family links, hashing, duplicate logins and authentication.');
