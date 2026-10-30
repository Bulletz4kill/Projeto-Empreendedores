const schoolJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const schoolKinds=new Set(['task','notice','event','observation','report','authorization','message','goal','reminder','grade']);
const schoolTeacherKinds=new Set(['task','notice','event','observation','report','authorization','message','grade']);
function gradePayload(values){
  const subject=schoolClean(values.subject,80),period=String(values.period||''),score=Number(values.score),weight=Number(values.weight??1);
  if(!subject||!['1','2','3','4'].includes(period)||values.score===null||values.score===undefined||String(values.score).trim()===''||!Number.isFinite(score)||score<0||score>10||!Number.isFinite(weight)||weight<=0||weight>10)return null;
  return {subject,period,score,weight};
}
const schoolPublicAccount='id, name, login, role, created_by, last_seen_at';
export async function seedSchoolExamples(env,teacherId){
  const students=(await env.DB.prepare("SELECT id FROM accounts WHERE created_by = ? AND role = 'student' AND status = 'active'").bind(teacherId).all()).results;
  const rows=await globalThis.ConectaExamples.items(teacherId,students);
  let inserted=0;
  for(const row of rows){const result=await env.DB.prepare('INSERT INTO school_items (id,kind,teacher_id,student_id,author_id,title,body,payload,due_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(row.id,row.kind,row.teacher_id,row.student_id,row.author_id,row.title,row.body,JSON.stringify(row.payload),row.due_at,row.created_at,row.updated_at).run();inserted+=result.meta.changes||0;}
  return {inserted,students:students.length};
}
async function schoolContext(env,user){
  const teacherId=user.role==='teacher'?user.id:user.created_by;
  if(!teacherId)return {teacherId:null,students:[],accounts:[],links:[]};
  const all=(await env.DB.prepare(`SELECT ${schoolPublicAccount} FROM accounts WHERE created_by = ? AND status = 'active' ORDER BY name`).bind(teacherId).all()).results;
  const links=(await env.DB.prepare('SELECT parent_id, student_id FROM school_links WHERE teacher_id = ?').bind(teacherId).all()).results;
  const ids=user.role==='student'?[user.id]:user.role==='parent'?links.filter(link=>link.parent_id===user.id).map(link=>link.student_id):all.filter(a=>a.role==='student').map(a=>a.id);
  return {teacherId,students:all.filter(a=>a.role==='student'&&ids.includes(a.id)),accounts:user.role==='teacher'?all:[],links:user.role==='teacher'?links:links.filter(l=>l.parent_id===user.id)};
}
function schoolVisible(item,user,context){
  if(item.teacher_id!==context.teacherId)return false;
  if(['goal','reminder'].includes(item.kind))return item.author_id===user.id;
  if(item.kind==='message')return user.role==='teacher'||item.author_id===user.id||item.student_id===user.id;
  if(user.role==='teacher')return true;
  if(item.kind==='authorization'&&user.role==='student')return false;
  if(item.kind==='observation'&&item.payload?.category==='Atenção'&&user.role==='student')return false;
  return !item.student_id||context.students.some(a=>a.id===item.student_id);
}
async function schoolRows(env,teacherId){
  const rows=(await env.DB.prepare('SELECT * FROM school_items WHERE teacher_id = ? ORDER BY created_at DESC LIMIT 1000').bind(teacherId).all()).results;
  return rows.map(row=>({...row,payload:JSON.parse(row.payload||'{}')}));
}
function schoolClean(value,max=3000){return typeof value==='string'?value.trim().slice(0,max):'';}
async function schoolBody(request){const text=await request.text();if(text.length>12000)throw new Error('invalid_body');const data=JSON.parse(text);if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('invalid_body');return data;}
export async function schoolApi(request,env,url,user){
  const context=await schoolContext(env,user);
  if(!context.teacherId)return schoolJson({error:'Sua conta precisa estar vinculada a um professor.'},409);
  const path=url.pathname,now=new Date().toISOString();
  if(path==='/api/school/examples'&&request.method==='POST'){
    if(user.role!=='teacher')return schoolJson({error:'Somente o professor pode adicionar exemplos à turma.'},403);
    return schoolJson(await seedSchoolExamples(env,user.id),201);
  }
  if(path==='/api/school'&&request.method==='GET'){
    const teacher=await env.DB.prepare('SELECT id, name FROM accounts WHERE id = ?').bind(context.teacherId).first();
    const items=(await schoolRows(env,context.teacherId)).filter(item=>schoolVisible(item,user,context));
    const responses=(await env.DB.prepare('SELECT r.* FROM school_responses r JOIN school_items i ON i.id = r.item_id WHERE i.teacher_id = ?').bind(context.teacherId).all()).results.filter(r=>user.role==='teacher'||r.account_id===user.id||context.students.some(a=>a.id===r.account_id));
    return schoolJson({user,teacher,students:context.students,accounts:context.accounts,links:context.links,items,responses});
  }
  if(path==='/api/school/links'&&request.method==='POST'){
    if(user.role!=='teacher')return schoolJson({error:'Somente o professor pode vincular responsáveis.'},403);
    const data=await schoolBody(request),parent=context.accounts.find(a=>a.id===data.parentId&&a.role==='parent'),student=context.students.find(a=>a.id===data.studentId);
    if(!parent||!student)return schoolJson({error:'Selecione um responsável e um aluno da sua turma.'},400);
    await env.DB.prepare('INSERT INTO school_links (parent_id, student_id, teacher_id) VALUES (?, ?, ?) ON CONFLICT(parent_id,student_id) DO NOTHING').bind(parent.id,student.id,user.id).run();
    return schoolJson({ok:true},201);
  }
  if(path==='/api/school/items'&&request.method==='POST'){
    const data=await schoolBody(request),kind=data.kind;
    if(!schoolKinds.has(kind))return schoolJson({error:'Tipo de registro inválido.'},400);
    if(user.role==='teacher'?!schoolTeacherKinds.has(kind):user.role==='student'?!['goal','reminder','message'].includes(kind):kind!=='message')return schoolJson({error:'Seu perfil não pode criar esse registro.'},403);
    const title=schoolClean(data.title,180),body=schoolClean(data.body,5000);
    if(!title||(!body&&!['goal','reminder','grade'].includes(kind)))return schoolJson({error:'Preencha o título e a descrição.'},400);
    let studentId=null;
    if(['goal','reminder'].includes(kind))studentId=user.id;
    else if(kind==='message'){
      if(user.role==='teacher'){
        const target=context.accounts.find(a=>a.id===data.studentId);
        if(!target)return schoolJson({error:'Selecione o aluno ou responsável destinatário.'},400);
        studentId=target.id;
      }else studentId=context.teacherId;
    }else if(data.studentId){
      if(!context.students.some(a=>a.id===data.studentId))return schoolJson({error:'Aluno não pertence à sua turma.'},403);
      studentId=data.studentId;
    }
    if(['observation','report','grade'].includes(kind)&&!studentId)return schoolJson({error:'Selecione um aluno.'},400);
    const payload={};
    if(kind==='grade'){const grade=gradePayload(data);if(!grade)return schoolJson({error:'Informe a matéria, o bimestre, uma nota de 0 a 10 e um peso maior que 0 e até 10.'},400);Object.assign(payload,grade);}
    if(kind==='task')payload.subject=schoolClean(data.subject,80)||'Geral';
    if(kind==='event')payload.format=schoolClean(data.format,60)||'Presencial';
    if(kind==='observation')payload.category=['Organização','Participação','Esforço','Convivência','Aprendizagem','Atenção'].includes(data.category)?data.category:'Participação';
    const due=schoolClean(data.dueAt,40);if(due&&!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(due))return schoolJson({error:'Data inválida.'},400);
    if(kind==='event'&&data.endAt){const end=schoolClean(data.endAt,40);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(end)||!due||end<=due)return schoolJson({error:'O término precisa ser depois do início.'},400);payload.endAt=end;}
    const id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO school_items (id,kind,teacher_id,student_id,author_id,title,body,payload,due_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id,kind,context.teacherId,studentId,user.id,title,body,JSON.stringify(payload),due||null,now,now).run();
    return schoolJson({id},201);
  }
  const responsePath=path.match(/^\/api\/school\/items\/([a-f0-9-]+)\/response$/);
  if(responsePath&&request.method==='POST'){
    const row=await env.DB.prepare('SELECT * FROM school_items WHERE id = ? AND teacher_id = ?').bind(responsePath[1],context.teacherId).first();
    if(!row)return schoolJson({error:'Registro não encontrado.'},404);
    const item={...row,payload:JSON.parse(row.payload)},data=await schoolBody(request);
    if(!schoolVisible(item,user,context))return schoolJson({error:'Acesso negado.'},403);
    const allowed=item.kind==='task'&&user.role==='student'?['done','pending']:['goal','reminder'].includes(item.kind)&&item.author_id===user.id?['done','pending']:item.kind==='authorization'&&user.role==='parent'?['approved','denied']:item.kind==='event'&&user.role==='parent'?['confirmed','pending']:['notice','report'].includes(item.kind)&&user.role!=='teacher'?['read']:[];
    if(!allowed.includes(data.status))return schoolJson({error:'Esta ação não está disponível para seu perfil.'},403);
    await env.DB.prepare('INSERT INTO school_responses (item_id,account_id,status,updated_at) VALUES (?,?,?,?) ON CONFLICT(item_id,account_id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at').bind(item.id,user.id,data.status,now).run();
    return schoolJson({ok:true});
  }
  const deletePath=path.match(/^\/api\/school\/items\/([a-f0-9-]+)$/);
  if(deletePath&&request.method==='PATCH'){
    const row=await env.DB.prepare('SELECT * FROM school_items WHERE id = ? AND teacher_id = ?').bind(deletePath[1],context.teacherId).first();
    if(row?.kind==='grade'){
      if(user.role!=='teacher'||row.author_id!==user.id)return schoolJson({error:'Somente o professor responsável pode editar a nota.'},403);
      const values=await schoolBody(request),payload=gradePayload(values),title=schoolClean(values.title,180),body=schoolClean(values.body,5000),due=schoolClean(values.dueAt,40);
      if(!payload||!title)return schoolJson({error:'Preencha a avaliação, matéria, bimestre, nota de 0 a 10 e peso de até 10.'},400);
      if(!context.students.some(a=>a.id===values.studentId))return schoolJson({error:'Selecione um aluno da sua turma.'},403);
      if(due&&!/^\d{4}-\d{2}-\d{2}$/.test(due))return schoolJson({error:'Data inválida.'},400);
      await env.DB.prepare('UPDATE school_items SET title=?,body=?,due_at=?,payload=?,student_id=?,updated_at=? WHERE id=? AND author_id=?').bind(title,body,due||null,JSON.stringify(payload),values.studentId,now,row.id,user.id).run();
      return schoolJson({ok:true});
    }
    if(user.role!=='teacher'||!row||row.author_id!==user.id||row.kind!=='event')return schoolJson({error:'Você só pode editar encontros publicados por você.'},403);
    const values=await schoolBody(request),due=schoolClean(values.dueAt,40),payload=JSON.parse(row.payload);
    if(!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(due))return schoolJson({error:'Informe a data e o horário do encontro.'},400);
    if(values.endAt!==undefined){const end=schoolClean(values.endAt,40);if(end&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(end)||end<=due))return schoolJson({error:'O término precisa ser depois do início.'},400);if(end)payload.endAt=end;else delete payload.endAt;}
    else if(payload.endAt&&row.due_at){const floating=value=>Date.parse(value+(value.includes('T')?'Z':'T00:00:00Z'));const duration=floating(payload.endAt)-floating(row.due_at);payload.endAt=new Date(floating(due)+duration).toISOString().slice(0,16);}
    const title=values.title===undefined?row.title:schoolClean(values.title,180),body=values.body===undefined?row.body:schoolClean(values.body,5000);
    if(!title||!body)return schoolJson({error:'Preencha o título e a descrição.'},400);
    if(values.format!==undefined)payload.format=schoolClean(values.format,60)||'Presencial';
    const studentId=values.studentId===undefined?row.student_id:values.studentId||null;
    if(studentId&&!context.students.some(a=>a.id===studentId))return schoolJson({error:'Selecione um aluno da sua turma.'},403);
    await env.DB.prepare('UPDATE school_items SET title=?,body=?,due_at=?,payload=?,student_id=?,updated_at=? WHERE id=? AND author_id=?').bind(title,body,due,JSON.stringify(payload),studentId,now,row.id,user.id).run();
    return schoolJson({ok:true});
  }
  if(deletePath&&request.method==='DELETE'){
    const row=await env.DB.prepare('SELECT id, author_id FROM school_items WHERE id = ? AND teacher_id = ?').bind(deletePath[1],context.teacherId).first();
    if(!row||row.author_id!==user.id)return schoolJson({error:'Você só pode remover seus próprios registros.'},403);
    await env.DB.prepare('DELETE FROM school_responses WHERE item_id = ?').bind(row.id).run();
    await env.DB.prepare('DELETE FROM school_items WHERE id = ? AND author_id = ?').bind(row.id,user.id).run();
    return schoolJson({ok:true});
  }
  return schoolJson({error:'Rota não encontrada.'},404);
}
