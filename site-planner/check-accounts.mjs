import assert from 'node:assert/strict';
import worker from './worker/index.mjs';
import {testDatabase} from './testing/d1.mjs';
const DB=testDatabase(),env={DB,ADMIN_USERNAME:'preview-admin',ADMIN_PASSWORD:'preview-password',AUTH_SECRET:crypto.randomUUID()},origin='http://127.0.0.1:4174';
export {env};
async function call(path,method='GET',data=null,cookie='',ip=crypto.randomUUID()){
  return worker.fetch(new Request(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'CF-Connecting-IP':ip},...(data?{body:JSON.stringify(data)}:{})}),env);
}
const cookie=response=>response.headers.getSetCookie()[0].split(';')[0];
let response=await call('/api/register-teacher','POST',{name:'Professora de teste',email:'professora@example.test',password:'teacher-test-only'});assert.equal(response.status,201);
const stored=DB.raw.prepare('SELECT * FROM accounts').get();assert.equal(stored.status,'pending');assert.notEqual(stored.password_hash,'teacher-test-only');assert.equal(stored.password_hash.length,64);
response=await call('/api/register-teacher','POST',{name:'Outra professora',email:'PROFESSORA@example.test',password:'teacher-test-only'});assert.equal(response.status,409);
response=await call('/api/account-login','POST',{username:'professora@example.test',password:'teacher-test-only',profile:'prof'});assert.equal(response.status,403);
response=await call('/api/accounts','POST',{role:'student',name:'Teste',login:'teste',password:'student-test-only'});assert.equal(response.status,403);
response=await call('/api/login','POST',{username:env.ADMIN_USERNAME,password:env.ADMIN_PASSWORD});assert.equal(response.status,200);const adminCookie=cookie(response);
response=await call('/api/teachers','GET',null,adminCookie);assert.equal(response.status,200);const list=await response.json();assert.equal(list.accounts.length,1);assert.ok(!JSON.stringify(list).includes('password_hash'));
response=await call('/api/teachers/'+stored.id+'/approve','POST',{},adminCookie);assert.equal(response.status,200);
response=await call('/api/account-login','POST',{username:'professora@example.test',password:'wrong-password',profile:'prof'});assert.equal(response.status,401);
response=await call('/api/account-login','POST',{username:'PROFESSORA@example.test',password:'teacher-test-only',profile:'prof'});assert.equal(response.status,200);const teacherCookie=cookie(response);
response=await call('/api/accounts','POST',{role:'teacher',name:'Tentativa',login:'other.teacher',password:'teacher-test-only'},teacherCookie);assert.equal(response.status,400);
for(const [role,login,profile]of [['student','aluno.teste','alunos'],['parent','responsavel.teste','pais']]){
  response=await call('/api/accounts','POST',{role,name:role==='student'?'Aluno de teste':'Responsável de teste',login,password:'account-test-only'},teacherCookie);assert.equal(response.status,201);
  response=await call('/api/account-login','POST',{username:login,password:'account-test-only',profile});assert.equal(response.status,200);const childCookie=cookie(response);
  response=await call('/api/accounts','GET',null,childCookie);assert.equal(response.status,403);
  response=await call('/api/planner','GET',null,childCookie);assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('window.__plannerRole="'+profile+'"'));assert.ok(!html.includes('Storage Sandbox'));assert.ok(!html.includes('Penpal bridge initialization'));
  response=await call('/api/account-login','POST',{username:login,password:'account-test-only',profile:'prof'});assert.equal(response.status,401);
}
response=await call('/api/accounts','GET',null,teacherCookie);assert.equal((await response.json()).accounts.length,2);
response=await call('/api/teachers/'+stored.id+'/approve','POST',{},teacherCookie);assert.equal(response.status,403);
response=await call('/api/planner');assert.equal(response.status,401);
response=await call('/api/logout','POST',{},teacherCookie);assert.equal(response.headers.getSetCookie().length,2);
console.log('Passed: registration, duplicate email, password hashing, pending approval, admin approval, teacher login, student and parent accounts, role restrictions, planner loading, and logout.');
