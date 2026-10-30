import assets from './assets.mjs';
const encoder=new TextEncoder(), limits=new Map();
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
const unhex=value=>Uint8Array.from(value.match(/../g)||[],s=>parseInt(s,16));
const cookieOptions='HttpOnly; Secure; SameSite=Strict; Path=/';
async function key(secret){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function sign(value,secret){return crypto.subtle.sign('HMAC',await key(secret),encoder.encode(value));}
async function issueCookie(name,id,env){const body=Date.now()+28800000+'.'+id+'.'+crypto.randomUUID();return `${name}=${body}.${hex(await sign(body,env.AUTH_SECRET))}; ${cookieOptions}; Max-Age=28800`;}
async function loginResponse(user,name,id,env){
  const response=json({user});
  response.headers.append('Set-Cookie',await issueCookie(name,id,env));
  const other=name==='planner_admin'?'planner_account':'planner_admin';
  response.headers.append('Set-Cookie',`${other}=; ${cookieOptions}; Max-Age=0`);
  return response;
}
async function sessionId(request,name,env){
  if(!env.AUTH_SECRET)return null;
  const cookie=request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);
  if(!cookie)return null;
  const parts=cookie.split('.');
  if(parts.length!==4||!/^\d+$/.test(parts[0])||Number(parts[0])<Date.now()||!parts[1]||!parts[2]||!/^[a-f0-9]{64}$/.test(parts[3]))return null;
  return await crypto.subtle.verify('HMAC',await key(env.AUTH_SECRET),unhex(parts[3]),encoder.encode(parts.slice(0,3).join('.')))?parts[1]:null;
}
async function isAdmin(request,env){return await sessionId(request,'planner_admin',env)==='admin';}
async function accountSession(request,env){const id=await sessionId(request,'planner_account',env);if(!id||!env.DB)return null;return env.DB.prepare("SELECT id, name, login, role, status FROM accounts WHERE id = ? AND status = 'active'").bind(id).first();}
async function passwordHash(password,salt){const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(salt),iterations:100000,hash:'SHA-256'},material,256));}
async function validPassword(password,account){const derived=await passwordHash(password,account.salt);const k=await key(account.salt);const signature=await crypto.subtle.sign('HMAC',k,encoder.encode(account.password_hash));return crypto.subtle.verify('HMAC',k,signature,encoder.encode(derived));}
function throttle(request,action,max=8){const now=Date.now(),ip=request.headers.get('CF-Connecting-IP')||'local',id=action+':'+ip;for(const [k,v]of limits)if(v.until<now)limits.delete(k);const item=limits.get(id)||{count:0,until:now+300000};item.count++;limits.set(id,item);return item.count>max;}
function clearThrottle(request,action){limits.delete(action+':'+(request.headers.get('CF-Connecting-IP')||'local'));}
async function readBody(request){const text=await request.text();if(text.length>4096)throw new Error('invalid_body');try{const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value;}catch{throw new Error('invalid_body');}}
function cleanLogin(value){return typeof value==='string'?value.trim().toLowerCase():'';}
function validFields(data){return typeof data.name==='string'&&data.name.trim().length>=2&&data.name.trim().length<=120&&/^[a-z0-9][a-z0-9@._+\-]{2,119}$/.test(cleanLogin(data.login))&&typeof data.password==='string'&&data.password.length>=8&&data.password.length<=128;}
async function createAccount(data,role,status,createdBy,env){
  const salt=hex(crypto.getRandomValues(new Uint8Array(16))),id=crypto.randomUUID(),now=new Date().toISOString();
  const hash=await passwordHash(data.password,salt);
  const result=await env.DB.prepare('INSERT INTO accounts (id, name, login, password_hash, salt, role, status, created_by, created_at, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(login) DO NOTHING').bind(id,data.name.trim(),cleanLogin(data.login),hash,salt,role,status,createdBy,now,status==='active'?now:null).run();
  if(!result.meta.changes)return null;
  return {id,name:data.name.trim(),login:cleanLogin(data.login),role,status};
}
const publicFields='id, name, login, role, status, created_at, approved_at';
async function api(request,env,url){
  const path=url.pathname;
  if(request.method!=='GET'&&request.headers.get('Origin')!==url.origin)return json({error:'Origem inválida.'},403);
  if(path==='/api/logout'&&request.method==='POST'){
    const response=json({ok:true});
    response.headers.append('Set-Cookie',`planner_admin=; ${cookieOptions}; Max-Age=0`);
    response.headers.append('Set-Cookie',`planner_account=; ${cookieOptions}; Max-Age=0`);
    return response;
  }
  if(path==='/api/login'&&request.method==='POST'){
    if(!env.ADMIN_PASSWORD||!env.AUTH_SECRET)return json({error:'Autenticação indisponível.'},503);
    if(throttle(request,'admin',5))return json({error:'Muitas tentativas. Aguarde cinco minutos.'},429);
    const data=await readBody(request);
    if(typeof data.username!=='string'||typeof data.password!=='string'||data.username.length>120||data.password.length>256)return json({error:'Usuário ou senha incorretos.'},401);
    const expected=await sign(JSON.stringify([env.ADMIN_USERNAME||'hortiz',env.ADMIN_PASSWORD]),env.AUTH_SECRET);
    if(!await crypto.subtle.verify('HMAC',await key(env.AUTH_SECRET),expected,encoder.encode(JSON.stringify([data.username,data.password]))))return json({error:'Usuário ou senha incorretos.'},401);
    clearThrottle(request,'admin');
    return loginResponse({role:'admin',name:'Administrador'},'planner_admin','admin',env);
  }
  if(path==='/api/me'&&request.method==='GET'){
    if(await isAdmin(request,env))return json({user:{role:'admin',name:'Administrador'}});
    const user=await accountSession(request,env);return user?json({user}):json({error:'Faça login novamente.'},401);
  }
  if(path==='/api/register-teacher'&&request.method==='POST'){
    if(!env.DB||!env.AUTH_SECRET)return json({error:'Cadastro temporariamente indisponível.'},503);
    if(throttle(request,'register',5))return json({error:'Muitas tentativas. Aguarde cinco minutos.'},429);
    const data=await readBody(request);data.login=data.email;
    if(!validFields(data)||!/^\S+@\S+\.\S+$/.test(data.login))return json({error:'Confira o nome, o e-mail e a senha com pelo menos 8 caracteres.'},400);
    const user=await createAccount(data,'teacher','pending',null,env);
    return user?json({message:'Cadastro recebido! Aguarde a aprovação do administrador.'},201):json({error:'Este e-mail já possui um cadastro.'},409);
  }
  if(path==='/api/account-login'&&request.method==='POST'){
    if(!env.DB||!env.AUTH_SECRET)return json({error:'Autenticação indisponível.'},503);
    const data=await readBody(request),login=cleanLogin(data.username);
    if(!login||login.length>120||typeof data.password!=='string'||!data.password.length||data.password.length>128)return json({error:'Informe seu usuário e sua senha.'},400);
    if(throttle(request,'account-login-total',120))return json({error:'Muitas tentativas nesta conexão. Aguarde cinco minutos.'},429);
    const action='account-login:'+login;
    if(throttle(request,action))return json({error:'Muitas tentativas para este usuário. Aguarde cinco minutos e tente novamente.'},429);
    // Logins are unique. Authenticate the account, then use its server-stored role.
    const account=await env.DB.prepare('SELECT * FROM accounts WHERE login = ?').bind(login).first();
    if(!account){await passwordHash(data.password,'00000000000000000000000000000000');return json({error:'Usuário ou senha incorretos.'},401);}
    if(!await validPassword(data.password,account))return json({error:'Usuário ou senha incorretos.'},401);
    if(account.status!=='active')return json({error:'Seu cadastro aguarda aprovação do administrador.'},403);
    clearThrottle(request,action);
    return loginResponse({id:account.id,name:account.name,role:account.role},'planner_account',account.id,env);
  }
  if(path==='/api/teachers'&&request.method==='GET'){
    if(!await isAdmin(request,env))return json({error:'Acesso restrito ao administrador.'},403);
    if(!env.DB)return json({error:'Banco de dados indisponível.'},503);
    const rows=await env.DB.prepare(`SELECT ${publicFields} FROM accounts WHERE role = 'teacher' ORDER BY status DESC, created_at DESC LIMIT 200`).all();
    return json({accounts:rows.results});
  }
  const approval=path.match(/^\/api\/teachers\/([a-f0-9-]+)\/approve$/);
  if(approval&&request.method==='POST'){
    if(!await isAdmin(request,env))return json({error:'Acesso restrito ao administrador.'},403);
    if(!env.DB)return json({error:'Banco de dados indisponível.'},503);
    const result=await env.DB.prepare("UPDATE accounts SET status = 'active', approved_at = ? WHERE id = ? AND role = 'teacher' AND status = 'pending'").bind(new Date().toISOString(),approval[1]).run();
    return result.meta.changes?json({ok:true}):json({error:'Cadastro pendente não encontrado.'},404);
  }
  if(path==='/api/accounts'){
    const teacher=await accountSession(request,env);
    if(teacher?.role!=='teacher')return json({error:'Acesso restrito a professores aprovados.'},403);
    if(request.method==='GET'){
      const rows=await env.DB.prepare(`SELECT ${publicFields} FROM accounts WHERE created_by = ? ORDER BY created_at DESC LIMIT 200`).bind(teacher.id).all();return json({accounts:rows.results});
    }
    if(request.method==='POST'){
      const data=await readBody(request);
      if(!['student','parent'].includes(data.role)||!validFields(data))return json({error:'Informe nome, usuário sem espaços e senha com pelo menos 8 caracteres.'},400);
      const user=await createAccount(data,data.role,'active',teacher.id,env);
      return user?json({user},201):json({error:'Este usuário já está em uso. Escolha outro.'},409);
    }
  }
  if(path==='/api/planner'&&request.method==='GET'){
    const admin=await isAdmin(request,env),account=admin?null:await accountSession(request,env);
    if(!admin&&!account)return json({error:'Sua sessão expirou. Entre novamente.'},401);
    const role=admin?'prof':{teacher:'prof',parent:'pais',student:'alunos'}[account.role];
    const scope=admin?'admin':account.id;
    let html=assets['/planner.html'].body.replace('<head>',`<head><script>window.__plannerRole=${JSON.stringify(role)};</script>`);
    html=html.replace('const Nu="planner-abc:"','const Nu="planner-abc:'+scope+':"');
    return new Response(html,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  return json({error:'Rota não encontrada.'},404);
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/')){
      try{return await api(request,env,url);}catch(error){return json({error:error.message==='invalid_body'?'Requisição inválida.':'Não foi possível concluir a operação. Tente novamente.'},error.message==='invalid_body'?400:503);}
    }
    if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Método não permitido',{status:405});
    let pathname=url.pathname;
    if(pathname==='/admin/planner.html'){
      if(!await isAdmin(request,env))return new Response('Faça login como administrador.',{status:401});
      pathname='/planner.html';
    }
    if(pathname==='/')pathname='/index.html';
    const asset=assets[pathname];if(!asset)return new Response('Página não encontrada',{status:404});
    return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'SAMEORIGIN'}});
  }
};
