const orgJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const accountColumns="id,name,login,CASE WHEN account_kind='institution' THEN 'institution' ELSE role END AS role,status,created_by,institution_id,last_seen_at,created_at";
const orgClean=(value,max=120)=>typeof value==='string'?value.trim().slice(0,max):'';
function planPrice(limit,option){return Number(limit)<=350?(option==='installments'?180000:160000):(option==='installments'?280000:260000)+Math.max(0,Number(limit)-1000)*250;}
async function orgBody(request){try{const text=await request.text();if(text.length>12000)throw Error();const body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw Error();return body;}catch{throw Error('invalid_body');}}
async function orgBatch(env,statements){if(!statements.length)return [];return env.DB.batch(statements);}
export async function migrateLegacy(env){
  const teachers=(await env.DB.prepare("SELECT id,name,status FROM accounts WHERE role='teacher' AND account_kind='person' AND institution_id IS NULL AND created_by IS NULL").all()).results;
  let migrated=0;
  for(const teacher of teachers){const now=new Date().toISOString(),year=new Date().getUTCFullYear(),count=await env.DB.prepare("SELECT count(*) AS total FROM accounts WHERE created_by=? AND role='student'").bind(teacher.id).first(),capacity=Math.max(350,count.total);
    await orgBatch(env,[
      env.DB.prepare("INSERT INTO institutions(id,name,status,billing_cycle,student_limit,amount_cents,created_at,updated_at) VALUES(?,?,?,'annual',?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(teacher.id,'Escola existente · '+teacher.name,teacher.status==='active'?'active':'pending',capacity,planPrice(capacity,'upfront'),now,now),
      env.DB.prepare('INSERT INTO classes(id,institution_id,name,academic_year,created_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(teacher.id,teacher.id,'Turma existente',year,now),
      env.DB.prepare('UPDATE accounts SET institution_id=? WHERE id=? OR (created_by=? AND institution_id IS NULL)').bind(teacher.id,teacher.id,teacher.id),
      env.DB.prepare("INSERT INTO class_members(class_id,account_id) SELECT ?,id FROM accounts WHERE institution_id=? AND role IN ('teacher','student') ON CONFLICT(class_id,account_id) DO NOTHING").bind(teacher.id,teacher.id),
      env.DB.prepare('UPDATE school_items SET institution_id=?,class_id=? WHERE teacher_id=? AND institution_id IS NULL').bind(teacher.id,teacher.id,teacher.id)
    ]);migrated++;
  }
  return {migrated};
}
async function institutionSnapshot(env,id){
  const institution=await env.DB.prepare('SELECT * FROM institutions WHERE id=?').bind(id).first();
  const accounts=(await env.DB.prepare(`SELECT ${accountColumns} FROM accounts WHERE institution_id=? ORDER BY name`).bind(id).all()).results;
  const classes=(await env.DB.prepare('SELECT * FROM classes WHERE institution_id=? ORDER BY academic_year DESC,name').bind(id).all()).results;
  const members=(await env.DB.prepare('SELECT m.* FROM class_members m JOIN classes c ON c.id=m.class_id WHERE c.institution_id=?').bind(id).all()).results;
  const links=(await env.DB.prepare('SELECT l.parent_id,l.student_id FROM school_links l JOIN accounts a ON a.id=l.parent_id WHERE a.institution_id=?').bind(id).all()).results;
  return {institution,accounts,classes,members,links};
}
function validOrg(data){return orgClean(data.name).length>=2&&['monthly','annual'].includes(data.billingCycle)&&['upfront','installments'].includes(data.paymentOption||'upfront')&&Number.isInteger(Number(data.studentLimit))&&Number(data.studentLimit)>=1&&Number(data.studentLimit)<=100000&&['pending','active','suspended'].includes(data.status)&&Number.isFinite(Number(data.passGrade??6))&&Number(data.passGrade??6)>=0&&Number(data.passGrade??6)<=10&&Number.isFinite(Number(data.attendanceMin??75))&&Number(data.attendanceMin??75)>=0&&Number(data.attendanceMin??75)<=100;}
export async function institutionApi(request,env,url,user,admin,createAccount){
  const path=url.pathname,now=new Date().toISOString();
  if(path==='/api/admin/migrate-legacy'&&request.method==='POST'){if(!admin)return orgJson({error:'Acesso restrito ao ADM.'},403);return orgJson(await migrateLegacy(env));}
  if(path==='/api/institutions'&&request.method==='GET'){
    if(!admin)return orgJson({error:'Acesso restrito ao ADM.'},403);
    const institutions=(await env.DB.prepare("SELECT i.*,(SELECT count(*) FROM accounts a WHERE a.institution_id=i.id AND a.role='student') AS student_count,(SELECT count(*) FROM classes c WHERE c.institution_id=i.id) AS class_count,(SELECT count(*) FROM accounts a WHERE a.institution_id=i.id AND a.account_kind='institution') AS manager_count FROM institutions i ORDER BY i.created_at DESC").all()).results;
    return orgJson({institutions});
  }
  if(path==='/api/institutions'&&request.method==='POST'){
    if(!admin)return orgJson({error:'Acesso restrito ao ADM.'},403);const data=await orgBody(request);
    if(!validOrg(data))return orgJson({error:'Confira escola, situação, ciclo, capacidade e valor visual.'},400);
    const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO institutions(id,name,status,billing_cycle,student_limit,amount_cents,payment_option,pass_grade,attendance_min,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,orgClean(data.name),data.status,data.billingCycle,Number(data.studentLimit),planPrice(data.studentLimit,data.paymentOption),data.paymentOption||'upfront',Number(data.passGrade??6),Number(data.attendanceMin??75),now,now).run();return orgJson({id},201);
  }
  const institutionPath=path.match(/^\/api\/institutions\/([a-f0-9-]+)$/);
  if(institutionPath&&request.method==='PATCH'){
    if(!admin)return orgJson({error:'Acesso restrito ao ADM.'},403);const data=await orgBody(request);if(!validOrg(data))return orgJson({error:'Confira os dados da assinatura visual.'},400);
    const count=await env.DB.prepare("SELECT count(*) AS total FROM accounts WHERE institution_id=? AND role='student'").bind(institutionPath[1]).first();if(Number(data.studentLimit)<count.total)return orgJson({error:'A capacidade não pode ser menor que o total de alunos cadastrados.'},409);
    const result=await env.DB.prepare('UPDATE institutions SET name=?,status=?,billing_cycle=?,student_limit=?,amount_cents=?,payment_option=?,pass_grade=?,attendance_min=?,updated_at=? WHERE id=?').bind(orgClean(data.name),data.status,data.billingCycle,Number(data.studentLimit),planPrice(data.studentLimit,data.paymentOption),data.paymentOption||'upfront',Number(data.passGrade??6),Number(data.attendanceMin??75),now,institutionPath[1]).run();return result.meta.changes?orgJson({ok:true}):orgJson({error:'Escola não encontrada.'},404);
  }
  const managerPath=path.match(/^\/api\/institutions\/([a-f0-9-]+)\/manager$/);
  if(managerPath&&request.method==='POST'){
    if(!admin)return orgJson({error:'Acesso restrito ao ADM.'},403);const institution=await env.DB.prepare('SELECT id FROM institutions WHERE id=?').bind(managerPath[1]).first();if(!institution)return orgJson({error:'Escola não encontrada.'},404);const data=await orgBody(request);const account=await createAccount(data,'institution','active',null,env,institution.id);return account?orgJson({user:account},201):orgJson({error:'Confira nome, usuário único e senha com pelo menos 8 caracteres.'},400);
  }
  if(!path.startsWith('/api/institution'))return orgJson({error:'Rota não encontrada.'},404);
  if(user?.role!=='institution')return orgJson({error:'Apenas a instituição gerencia turmas e contas.'},403);
  const schoolId=user.institution_id;
  if(path==='/api/institution'&&request.method==='GET')return orgJson(await institutionSnapshot(env,schoolId));
  if(path==='/api/institution/classes'&&request.method==='POST'){
    const data=await orgBody(request),year=Number(data.academicYear);if(orgClean(data.name).length<1||!Number.isInteger(year)||year<2000||year>2100)return orgJson({error:'Informe o nome da turma e um ano letivo válido.'},400);
    const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO classes(id,institution_id,name,academic_year,created_at) VALUES(?,?,?,?,?)').bind(id,schoolId,orgClean(data.name),year,now).run();return orgJson({id},201);
  }
  if(path==='/api/institution/accounts'&&request.method==='POST'){
    const data=await orgBody(request);if(!['teacher','student','parent'].includes(data.role))return orgJson({error:'Perfil inválido.'},400);
    const classRow=data.classId?await env.DB.prepare('SELECT id FROM classes WHERE id=? AND institution_id=?').bind(data.classId,schoolId).first():null;
    if(data.role!=='parent'&&!classRow)return orgJson({error:'Selecione uma turma desta escola.'},400);
    let child=null;if(data.role==='parent'&&data.studentId){child=await env.DB.prepare("SELECT id FROM accounts WHERE id=? AND institution_id=? AND role='student'").bind(data.studentId,schoolId).first();if(!child)return orgJson({error:'Selecione um aluno desta escola.'},400);}
    if(data.role==='student'){const limit=await env.DB.prepare("SELECT i.student_limit,(SELECT count(*) FROM accounts a WHERE a.institution_id=i.id AND a.role='student') AS total FROM institutions i WHERE id=?").bind(schoolId).first();if(limit.total>=limit.student_limit)return orgJson({error:'Limite de alunos atingido. Solicite ao ADM a alteração da capacidade.'},409);}
    const account=await createAccount(data,data.role,'active',user.id,env,schoolId);if(!account)return orgJson({error:'Confira nome, usuário único e senha com pelo menos 8 caracteres.'},400);
    const statements=[];if(classRow&&data.role!=='parent')statements.push(env.DB.prepare('INSERT INTO class_members(class_id,account_id) VALUES(?,?)').bind(classRow.id,account.id));if(child)statements.push(env.DB.prepare('INSERT INTO school_links(parent_id,student_id,teacher_id) VALUES(?,?,?)').bind(account.id,child.id,user.id));await orgBatch(env,statements);return orgJson({user:account},201);
  }
  if(path==='/api/institution/members'&&request.method==='POST'){
    const data=await orgBody(request),account=await env.DB.prepare("SELECT id FROM accounts WHERE id=? AND institution_id=? AND role IN ('teacher','student') AND account_kind='person'").bind(data.accountId,schoolId).first(),classRow=await env.DB.prepare('SELECT id FROM classes WHERE id=? AND institution_id=?').bind(data.classId,schoolId).first();if(!account||!classRow)return orgJson({error:'Selecione uma turma e uma conta desta escola.'},400);
    await env.DB.prepare('INSERT INTO class_members(class_id,account_id) VALUES(?,?) ON CONFLICT(class_id,account_id) DO NOTHING').bind(classRow.id,account.id).run();return orgJson({ok:true},201);
  }
  if(path==='/api/institution/links'&&request.method==='POST'){
    const data=await orgBody(request),parent=await env.DB.prepare("SELECT id FROM accounts WHERE id=? AND institution_id=? AND role='parent'").bind(data.parentId,schoolId).first(),student=await env.DB.prepare("SELECT id FROM accounts WHERE id=? AND institution_id=? AND role='student'").bind(data.studentId,schoolId).first();if(!parent||!student)return orgJson({error:'Selecione responsável e aluno desta escola.'},400);
    await env.DB.prepare('INSERT INTO school_links(parent_id,student_id,teacher_id) VALUES(?,?,?) ON CONFLICT(parent_id,student_id) DO NOTHING').bind(parent.id,student.id,user.id).run();return orgJson({ok:true},201);
  }
  return orgJson({error:'Rota não encontrada.'},404);
}
