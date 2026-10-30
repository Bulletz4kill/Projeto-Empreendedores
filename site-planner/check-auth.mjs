import assert from 'node:assert/strict';
import worker from './worker/index.mjs';
const env={ADMIN_USERNAME:'test-admin',ADMIN_PASSWORD:'test-only-password',AUTH_SECRET:crypto.randomUUID()};
const origin='https://test.example';
const login=(username,password,headers={})=>worker.fetch(new Request(origin+'/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify({username,password})}),env);
let response=await worker.fetch(new Request(origin+'/admin/planner.html'),env);
assert.equal(response.status,401);
response=await login('test-admin','wrong');assert.equal(response.status,401);
response=await login('test-admin','test-only-password');assert.equal(response.status,200);
const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);
response=await worker.fetch(new Request(origin+'/admin/planner.html',{headers:{Cookie:cookie.split(';')[0]}}),env);assert.equal(response.status,200);
assert.match(await response.text(),/planner/);
response=await worker.fetch(new Request(origin+'/admin/planner.html',{headers:{Cookie:cookie.split(';')[0]+'a'}}),env);assert.equal(response.status,401);
response=await login('test-admin','test-only-password',{Origin:'https://other.example'});assert.equal(response.status,403);
for(let i=0;i<5;i++){response=await login('test-admin','wrong',{'CF-Connecting-IP':'test-rate-limit'});assert.equal(response.status,401);}
response=await login('test-admin','test-only-password',{'CF-Connecting-IP':'test-rate-limit'});assert.equal(response.status,429);
response=await worker.fetch(new Request(origin+'/api/logout',{method:'POST',headers:{Origin:origin}}),env);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
for(const asset of ['/','/app.js','/styles.css','/planner.html']){response=await worker.fetch(new Request(origin+asset),env);assert.equal(response.status,200);assert.ok(!(await response.text()).includes(env.ADMIN_PASSWORD));}
console.log('Passed: login, invalid password, protected route, tampered cookie, origin check, rate limit, logout, and public assets.');
