(()=>{
  const root=document.querySelector('#school-app');
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let user=null,data=null,page='home',demo=false,requestVersion=0,editingGradeId=null;
  let chartFilter={student:'',subject:'',period:''};
  let gradeStudentFilter='';
  const menus={teacher:[['home','Painel da turma'],['accounts','Alunos e acessos'],['evolution','Registrar evolução'],['reports','Relatório semanal'],['families','Participação das famílias'],['events','Agenda e encontros'],['authorizations','Autorizações'],['messages','Mensagens'],['publish','Publicar']],student:[['home','Meu planner'],['achievements','Minhas conquistas'],['tasks','Tarefas'],['notices','Avisos'],['events','Agenda'],['messages','Dúvidas com a professora']],parent:[['home','Semana do aluno'],['reports','Relatórios'],['help','Como ajudar em casa'],['events','Encontros e agenda'],['notices','Recados'],['authorizations','Autorizações'],['messages','Conversa']]};
  const titles={teacher:'Sua turma, mais conectada.',student:'Seu próximo passo começa aqui.',parent:'Mais perto de cada conquista.'};
  Object.values(menus).forEach(menu=>menu.splice(2,0,['grades','Notas']));
  const byKind=kind=>data.items.filter(item=>item.kind===kind);
  const nameOf=id=>id===user.id?user.name:id===data.teacher?.id?data.teacher.name:([...data.students,...data.accounts].find(a=>a.id===id)?.name||'Comunidade escolar');
  const statusOf=(item,accountId=user.id)=>data.responses.find(r=>r.item_id===item.id&&r.account_id===accountId)?.status;
  const date=value=>value?new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',...(value.includes('T')?{timeStyle:'short'}:{})}).format(new Date(value.length===10?value+'T12:00:00':value)):'';
  const button=(text,action,extra='',secondary=false)=>`<button class="school-button${secondary?' secondary':''}" type="button" data-action="${action}" ${extra}>${esc(text)}</button>`;
  const empty=(title,body)=>`<div class="school-empty"><strong>${esc(title)}</strong>${esc(body)}</div>`;
  const card=(title,body,help='')=>`<section class="school-card"><h2>${esc(title)}</h2>${help?`<p>${esc(help)}</p>`:''}${body}</section>`;
  const stats=rows=>`<div class="school-stats">${rows.map(([count,label])=>`<div class="school-stat"><strong>${esc(count)}</strong><span>${esc(label)}</span></div>`).join('')}</div>`;
  const field=(label,name,type='text',required=true,value='')=>`<div><label for="school-${name}">${esc(label)}</label><input id="school-${name}" name="${name}" type="${type}" maxlength="180" ${required?'required':''} value="${esc(value)}"></div>`;
  const area=(label,name='body',value='')=>`<div><label for="school-${name}">${esc(label)}</label><textarea id="school-${name}" name="${name}" rows="4" maxlength="5000" required>${esc(value)}</textarea></div>`;
  const select=(label,name,values,optional=false)=>`<div><label for="school-${name}">${esc(label)}</label><select id="school-${name}" name="${name}" ${optional?'':'required'}>${optional?'<option value="">Toda a turma</option>':''}${values.map(([id,text])=>`<option value="${esc(id)}">${esc(text)}</option>`).join('')}</select></div>`;
  const studentSelect=(optional=false)=>select('Aluno','studentId',data.students.map(a=>[a.id,a.name]),optional);
  const form=(kind,body,label='Salvar')=>`<form class="school-form" data-kind="${kind}">${body}<button class="school-button" type="submit">${esc(label)}</button></form>`;
  const responseButton=(item,status,label)=>button(label,'respond',`data-id="${item.id}" data-status="${status}"`,true);
  function itemCard(item,controls=''){
    const tag=item.payload.category||item.payload.subject||({notice:'Aviso',report:'Relatório',event:'Encontro',authorization:'Autorização'}[item.kind]||'');
    const audience=item.student_id&&item.kind!=='message'?nameOf(item.student_id):'Toda a turma';
    const responses=data.responses.filter(r=>r.item_id===item.id);
    const footer=user.role==='teacher'?`${audience}${responses.length?' · '+responses.length+' resposta(s)':''}`:item.due_at?'Prazo: '+date(item.due_at):date(item.created_at);
    const remove=item.author_id===user.id?`<button class="text-button" type="button" data-action="remove" data-id="${item.id}">Remover</button>`:'';
    return `<article class="school-item"><div class="school-item-head"><h3>${esc(item.title)}</h3>${tag?`<span class="school-pill">${esc(tag)}</span>`:''}</div><p>${esc(item.body)}</p><div class="school-meta">${esc(footer)}${user.role==='teacher'&&item.due_at?' · '+esc(date(item.due_at)):''}</div>${controls||remove?`<div class="school-actions">${controls}${remove}</div>`:''}</article>`;
  }
  function listing(kind,none,description,control=()=>'',filter=()=>true){const items=byKind(kind).filter(filter);return items.length?`<div class="school-list">${items.map(item=>itemCard(item,control(item))).join('')}</div>`:empty(none,description);}
  function tasks(){
    return listing('task','Sem tarefas publicadas.','As atividades enviadas pelo professor aparecerão aqui.',item=>{
      if(user.role==='student'){const done=statusOf(item)==='done';return `<label class="school-check${done?' done':''}"><input type="checkbox" data-task="${item.id}" ${done?'checked':''}><span>${done?'Tarefa concluída':'Marcar como concluída'}</span></label>`;}
      if(user.role==='parent'){const relevant=data.students.filter(a=>!item.student_id||a.id===item.student_id);return relevant.map(a=>`<span class="school-pill">${esc(a.name)}: ${statusOf(item,a.id)==='done'?'concluída':'pendente'}</span>`).join('');}
      const relevant=data.students.filter(a=>!item.student_id||a.id===item.student_id);return `<span class="school-pill">${relevant.filter(a=>statusOf(item,a.id)==='done').length}/${relevant.length} concluíram</span>`;
    });
  }
  function notices(){return listing('notice','Nenhum recado por enquanto.','Novidades da escola aparecerão aqui.',item=>user.role==='teacher'?'':statusOf(item)==='read'?'<span class="school-pill">Leitura confirmada</span>':responseButton(item,'read','Confirmar leitura'));}
  function events(){return listing('event','Sua agenda está livre.','Os encontros e eventos publicados pelo professor aparecerão aqui.',item=>user.role==='parent'?responseButton(item,statusOf(item)==='confirmed'?'pending':'confirmed',statusOf(item)==='confirmed'?'Presença confirmada · Desfazer':'Confirmar presença'):`<span class="school-pill">${esc(item.payload.format||'Presencial')}</span>`);}
  function reports(){return listing('report','Nenhum relatório publicado.','O professor poderá compartilhar a evolução do aluno nesta área.',item=>user.role==='parent'&&statusOf(item)!=='read'?responseButton(item,'read','Confirmar leitura'):'');}
  function authorizations(){return listing('authorization','Nenhuma autorização pendente.','Os pedidos da escola aparecerão aqui.',item=>{
    if(user.role==='teacher')return data.responses.filter(r=>r.item_id===item.id).map(r=>`<span class="school-pill">${esc(nameOf(r.account_id))}: ${r.status==='approved'?'autorizou':'não autorizou'}</span>`).join('');
    const status=statusOf(item);return `<span class="school-pill">${status==='approved'?'Autorizado':status==='denied'?'Não autorizado':'Aguardando resposta'}</span>`+responseButton(item,'approved','Autorizar')+responseButton(item,'denied','Não autorizar');
  });}
  function goals(){
    const goals=byKind('goal'),done=goals.filter(i=>statusOf(i)==='done').length;
    const controls=item=>`<label class="school-check${statusOf(item)==='done'?' done':''}"><input type="checkbox" data-task="${item.id}" ${statusOf(item)==='done'?'checked':''}><span>${statusOf(item)==='done'?'Concluído':'Marcar como concluído'}</span></label>`;
    return `<div class="school-grid">${card('Minhas metas',`<p class="school-help">${done} de ${goals.length} metas cumpridas</p><div class="school-progress"><span style="width:${goals.length?done/goals.length*100:0}%"></span></div>${listing('goal','Uma meta de cada vez.','Adicione sua primeira meta de estudos.',controls)}`)}${card('Adicionar meta ou lembrete',form('personal',select('O que deseja adicionar?','kind',[['goal','Meta de estudos'],['reminder','Lembrete']])+field('Título','title')+field('Quando?','dueAt','date',false),'Adicionar'))}</div>${card('Lembretes',listing('reminder','Nenhum lembrete ainda.','Guarde aqui os próximos passos da sua rotina.',controls))}`;
  }
  function home(){
    if(user.role==='teacher')return stats([[data.students.length,'Alunos na turma'],[byKind('task').length,'Tarefas publicadas'],[byKind('observation').length,'Registros de evolução'],[data.accounts.filter(a=>a.role==='parent').length,'Responsáveis cadastrados']])+`<div class="school-grid">${card('Sua turma, em movimento',data.students.length?data.students.map(a=>`<div class="school-person"><span class="school-avatar">${esc(a.name.slice(0,1))}</span><div><strong>${esc(a.name)}</strong><p>${byKind('observation').filter(i=>i.student_id===a.id).length} registros de evolução · ${byKind('report').filter(i=>i.student_id===a.id).length} relatórios</p></div></div>`).join(''):empty('Comece pela sua turma.','Crie os acessos dos alunos e responsáveis em Alunos e acessos.'))}${card('Próximos passos',`<p>Conecte a rotina de estudos com a participação da família.</p><div class="school-actions">${button('Publicar uma tarefa','page','data-page="publish"')}${button('Registrar uma conquista','page','data-page="evolution"',true)}${button('Gerenciar acessos','page','data-page="accounts"',true)}</div>`)}</div><div class="school-grid">${card('Tarefas da turma',tasks())}${card('Recados recentes',notices())}</div>`;
    if(user.role==='student')return stats([[byKind('task').filter(i=>statusOf(i)!=='done').length,'Tarefas pendentes'],[byKind('goal').filter(i=>statusOf(i)==='done').length,'Metas cumpridas'],[byKind('observation').length,'Conquistas registradas'],[byKind('event').length,'Itens na agenda']])+goals()+card('Suas próximas tarefas',tasks());
    const linked=data.students.length;
    return (!linked?`<div class="school-alert">Seu acesso já está ativo. Peça ao professor para vincular sua conta ao aluno em Alunos e acessos. Os recados gerais da turma já podem ser consultados.</div>`:'')+stats([[linked,'Alunos acompanhados'],[byKind('report').length,'Relatórios disponíveis'],[byKind('authorization').filter(i=>!statusOf(i)).length,'Autorizações pendentes'],[byKind('notice').filter(i=>!statusOf(i)).length,'Recados não lidos']])+`<div class="school-links">${data.students.map(a=>`<span class="school-child">Acompanhando ${esc(a.name)}</span>`).join('')}</div><div class="school-grid">${card('Evolução e conquistas',listing('observation','As conquistas aparecerão aqui.','Acompanhe os registros compartilhados pelo professor.'))}${card('Tarefas de casa',tasks())}</div>${card('Últimos recados',notices())}`;
  }
  function publish(){return card('Compartilhar com a turma',form('publish',select('Tipo de publicação','kind',[['task','Tarefa'],['notice','Aviso / recado'],['event','Encontro ou evento'],['authorization','Pedido de autorização']])+studentSelect(true)+field('Título','title')+area('Descrição e orientações')+`<div class="row">${field('Data ou prazo (opcional)','dueAt','date',false)}${field('Matéria (para tarefas)','subject','text',false)}</div>`+select('Formato (para encontros)','format',[['Presencial','Presencial'],['Online','Online']]),'Publicar'), 'A publicação será exibida aos alunos e responsáveis da sua turma, conforme o tipo de conteúdo.');}
  function evolution(){return `<div class="school-grid">${card('Registrar evolução',data.students.length?form('observation',studentSelect()+select('Categoria','category',['Organização','Participação','Esforço','Convivência','Aprendizagem','Atenção'].map(a=>[a,a]))+field('Título do registro','title')+area('O que você observou?'),'Registrar evolução'):empty('Cadastre um aluno primeiro.','Abra Alunos e acessos para começar.'))}${card('Registros compartilhados',listing('observation','Nenhum registro ainda.','Reconheça esforço, participação e avanços além das notas.'))}</div>`;}
  function reportPage(){
    if(user.role!=='teacher')return card('Relatórios de acompanhamento',reports());
    return `<div class="school-grid">${card('Relatório semanal',data.students.length?form('report',studentSelect()+field('Período / título','title','text',true,'Relatório da semana')+area('Resumo da evolução e orientações para casa')+button('Preencher com os registros do aluno','draft','',true),'Publicar relatório'):empty('Selecione sua turma.','Cadastre um aluno em Alunos e acessos.'))}${card('Relatórios publicados',reports())}</div>`;
  }
  function accountPage(){
    const parents=data.accounts.filter(a=>a.role==='parent');
    return card('Vincular responsáveis aos alunos',parents.length&&data.students.length?form('link',select('Responsável','parentId',parents.map(a=>[a.id,a.name]))+studentSelect(),'Vincular responsável'):empty('Crie os dois acessos primeiro.','Depois de cadastrar aluno e responsável, selecione-os aqui para conectar o acompanhamento.'))+card('Vínculos da turma',data.links.length?data.links.map(link=>`<div class="school-person"><span class="school-avatar">↔</span><div><strong>${esc(nameOf(link.parent_id))}</strong><p>Responsável por ${esc(nameOf(link.student_id))}</p></div></div>`).join(''):empty('Nenhum vínculo definido.','As informações individuais do aluno ficam disponíveis apenas aos responsáveis vinculados.'));
  }
  function families(){
    const parents=data.accounts.filter(a=>a.role==='parent');
    return card('Participação das famílias',parents.length?parents.map(parent=>{
      const children=data.links.filter(link=>link.parent_id===parent.id).map(link=>nameOf(link.student_id));
      const reads=data.responses.filter(r=>r.account_id===parent.id&&r.status==='read').length;
      return `<div class="school-person"><span class="school-avatar">${esc(parent.name.slice(0,1))}</span><div><strong>${esc(parent.name)}</strong><p>${children.length?'Responsável por '+esc(children.join(', ')):'Ainda sem aluno vinculado'}</p><p>${parent.last_seen_at?'Último acesso: '+esc(date(parent.last_seen_at)):'Ainda não entrou no portal'} · ${reads} leituras confirmadas</p></div></div>`;
    }).join(''):empty('Nenhum responsável cadastrado.','Crie o acesso da família e vincule ao aluno em Alunos e acessos.'),'Acompanhe os acessos e as confirmações de leitura para orientar o contato com cada família.');
  }
  function messages(){
    const items=byKind('message').slice().reverse();
    const history=items.length?`<div class="school-chat">${items.map(item=>`<div class="school-message${item.author_id===user.id?' own':''}"><strong>${esc(nameOf(item.author_id))}</strong>${user.role==='teacher'?`<div class="school-meta">${item.author_id===user.id?'Para '+esc(nameOf(item.student_id)):'Recebida'}</div>`:''}<div>${esc(item.body)}</div><div class="school-meta">${esc(date(item.created_at))}</div></div>`).join('')}</div>`:empty('A conversa começa aqui.','Envie dúvidas, orientações e feedback de forma direta.');
    const compose=user.role==='teacher'?(data.accounts.length?select('Destinatário','studentId',data.accounts.map(a=>[a.id,a.name+' · '+(a.role==='student'?'Aluno':'Responsável')])):null):`<p class="school-help">Mensagem para ${esc(data.teacher?.name||'seu professor')}</p>`;
    return `<div class="school-grid">${card('Conversas',history)}${card('Enviar mensagem',compose===null?empty('Cadastre um acesso primeiro.','As contas da sua turma aparecerão como destinatárias.'):form('message',compose+area('Sua mensagem'),'Enviar mensagem'),'A conversa fica disponível somente ao professor e ao destinatário.')}</div>`;
  }
  function grades(){
    if(gradeStudentFilter&&!data.students.some(s=>s.id===gradeStudentFilter))gradeStudentFilter='';
    const items=byKind('grade').filter(i=>!gradeStudentFilter||i.student_id===gradeStudentFilter),editing=items.find(i=>i.id===editingGradeId),v=editing?{...editing.payload,title:editing.title,body:editing.body,studentId:editing.student_id,dueAt:editing.due_at||''}:{weight:1,period:'1',studentId:gradeStudentFilter};
    const studentFilter=`<div class="grade-filters"><div><label for="grade-student-filter">Filtrar notas por aluno</label><select id="grade-student-filter"><option value="">Todos os alunos</option>${data.students.map(s=>`<option value="${esc(s.id)}" ${s.id===gradeStudentFilter?'selected':''}>${esc(s.name)}${s.login?' · '+esc(s.login):''}</option>`).join('')}</select></div></div><p class="school-help">${gradeStudentFilter?'Exibindo médias e avaliações de '+esc(nameOf(gradeStudentFilter))+'.':'Exibindo médias e avaliações de todos os alunos.'}</p>`;
    const number=n=>Number(n).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
    const groups=new Map();
    for(const item of items){const p=item.payload,key=JSON.stringify([item.student_id,p.subject.trim().toLocaleLowerCase('pt-BR'),p.period]);if(!groups.has(key))groups.set(key,{student:item.student_id,subject:p.subject,period:p.period,sum:0,weight:0,count:0});const g=groups.get(key);g.sum+=p.score*p.weight;g.weight+=p.weight;g.count++;}
    const summary=groups.size?`<div class="grade-summary">${[...groups.values()].map(g=>`<article class="grade-average"><div><span class="school-meta">${esc(nameOf(g.student))} · ${esc(g.period)}º bimestre</span><h3>${esc(g.subject)}</h3><p>${g.count} avaliação(ões)</p></div><strong>${number(g.sum/g.weight)}<small>/10</small></strong></article>`).join('')}</div>`:empty('As notas aparecerão aqui.','As médias serão calculadas por aluno, matéria e bimestre.');
    const history=items.length?items.map(item=>`<article class="school-item"><div class="school-item-head"><div><h3>${esc(item.title)}</h3><p>${esc(nameOf(item.student_id))} · ${esc(item.payload.subject)} · ${esc(item.payload.period)}º bimestre</p></div><span class="grade-score">${number(item.payload.score)}<small>/10</small></span></div><div class="school-meta">Peso ${esc(item.payload.weight)}${item.due_at?' · '+esc(date(item.due_at)):''}</div>${item.body?`<p>${esc(item.body)}</p>`:''}${user.role==='teacher'?`<div class="school-actions">${button('Editar','grade-edit',`data-id="${item.id}"`,true)}${button('Excluir','remove',`data-id="${item.id}"`,true)}</div>`:''}</article>`).join(''):empty('Nenhuma avaliação lançada.','Cada avaliação publicada ficará disponível ao aluno e aos responsáveis vinculados.');
    let editor='';
    if(user.role==='teacher'){
      const options=(label,name,choices)=>`<div><label for="grade-${name}">${label}</label><select id="grade-${name}" name="${name}" required>${choices.map(([id,text])=>`<option value="${esc(id)}" ${String(v[name])===String(id)?'selected':''}>${esc(text)}</option>`).join('')}</select></div>`;
      const numeric=(label,name,min,max,step)=>`<div><label for="grade-${name}">${label}</label><input id="grade-${name}" name="${name}" type="number" min="${min}" max="${max}" step="${step}" required value="${esc(v[name]??'')}"></div>`;
      editor=card(editing?'Editar nota':'Lançar nota',data.students.length?`<form class="school-form" data-kind="grade" ${editing?'data-edit-id="'+editing.id+'"':''}>${options('Aluno','studentId',data.students.map(s=>[s.id,s.name]))}${field('Matéria','subject','text',true,v.subject||'')}${options('Bimestre','period',[1,2,3,4].map(n=>[n,n+'º bimestre']))}${field('Avaliação','title','text',true,v.title||'')}${numeric('Nota (0 a 10)','score',0,10,'0.1')}${numeric('Peso','weight','0.1',10,'0.1')}${field('Data da avaliação (opcional)','dueAt','date',false,v.dueAt||'')}<div><label for="grade-body">Comentário (opcional)</label><textarea id="grade-body" name="body" rows="3" maxlength="5000">${esc(v.body||'')}</textarea></div><div class="school-actions"><button class="school-button" type="submit">${editing?'Salvar alterações':'Publicar nota'}</button>${editing?button('Cancelar','grade-cancel','',true):''}</div></form>`:empty('Cadastre um aluno primeiro.','Abra Alunos e acessos para criar os acessos da sua turma.'));
    }
    return window.ConectaGradeChart.render(data,chartFilter)+card('Notas e médias',studentFilter+summary,'Média ponderada: soma das notas multiplicadas pelos pesos, dividida pela soma dos pesos. Escala de 0 a 10.')+`<div class="school-grid">${editor}${card('Avaliações',history)}</div>`;
  }
  function content(){if(page==='grades')return grades();if(page==='events')return window.ConectaCalendar.render(data,user);switch(page){case 'accounts':return accountPage();case 'families':return families();case 'publish':return publish();case 'evolution':return evolution();case 'reports':return reportPage();case 'tasks':return card('Tarefas de casa',tasks());case 'notices':return card(user.role==='parent'?'Recados da escola':'Avisos da turma',notices());case 'achievements':return card('Minhas conquistas',listing('observation','Seu progresso merece ser celebrado.','Os registros de esforço, participação e aprendizagem feitos pelo professor aparecerão aqui.'));case 'authorizations':return card('Autorizações',authorizations());case 'messages':return messages();case 'help':return `<div class="school-grid">${card('Como apoiar em casa','<p>Combine uma rotina de estudos e descanso. Pergunte como o aluno está se sentindo, acompanhe os prazos e reconheça o esforço, além dos resultados.</p><p>Quando surgir uma dificuldade, converse com o professor para combinar os próximos passos.</p>')}${card('Orientações do professor',reports())}</div>`;default:return home();}}
  function render(){
    const management=document.querySelector('#account-management');if(root.contains(management))root.before(management);management.hidden=!(user.role==='teacher'&&page==='accounts'&&!demo);
    root.innerHTML=`<div class="school"><div class="school-top"><div><h1>${esc(titles[user.role])}</h1><p>${esc(user.name)} · ${user.role==='teacher'?'Espaço do professor':user.role==='student'?'Espaço do aluno':'Espaço da família'}${data.teacher&&user.role!=='teacher'?' · Professor(a): '+esc(data.teacher.name):''}</p></div><span class="school-tag">${demo?'Demonstração':'● Conectado à sua turma'}</span></div><nav class="school-nav" aria-label="Seções do portal">${menus[user.role].map(([id,label])=>`<button type="button" data-action="page" data-page="${id}" ${page===id?'aria-current="page"':''}>${esc(label)}</button>`).join('')}<button type="button" data-action="refresh">↻ Atualizar</button></nav><p id="school-status" class="school-status" role="status" aria-live="polite"></p><div id="school-content">${content()}</div></div>`;
    if(user.role==='teacher'&&page==='home'&&!demo)root.querySelector('#school-content').insertAdjacentHTML('beforeend',card('Explore com exemplos','<p>Adicione notas, tarefas, metas, agenda e registros fictícios aos alunos cadastrados. Os títulos começam com “Exemplo”. Repetir esta ação não duplica os exemplos existentes.</p>'+button('Adicionar exemplos à turma','seed-examples')));
    if(user.role==='teacher'&&page==='accounts'&&!demo){management.style.margin='0 0 20px';root.querySelector('#school-content').prepend(management);}
  }
  function notice(message,error=false){const node=root.querySelector('#school-status');if(node){node.textContent=message;node.classList.toggle('error',error);}}
  async function request(path,method='GET',body=null){
    if(demo&&method!=='GET')throw new Error('Entre com sua conta para salvar e compartilhar informações.');
    const response=await fetch(path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Não foi possível concluir a operação.');return result;
  }
  async function refresh(){
    if(!user||demo)return;
    const version=++requestVersion;
    try{const result=await request('/api/school');if(version!==requestVersion||!user)return;data=result;render();}
    catch(error){if(version===requestVersion){if(data){notice(error.message,true);}else root.innerHTML=`<div class="school">${card('Não foi possível carregar sua turma',`<p>${esc(error.message)}</p>${button('Tentar novamente','refresh')}`)}</div>`;}}
  }
  root.addEventListener('click',async event=>{
    const node=event.target.closest('[data-action]');if(!node)return;
    const action=node.dataset.action;
    if(action.startsWith('cal-'))return;
    if(action==='grade-edit'||action==='grade-cancel'){editingGradeId=action==='grade-edit'?node.dataset.id:null;render();root.querySelector('[data-kind="grade"] input')?.focus();return;}
    if(action==='page'){page=node.dataset.page;render();return;}
    if(action==='refresh'){await refresh();return;}
    if(action==='draft'){
      const form=node.closest('form'),id=form.elements.studentId.value;
      const observations=byKind('observation').filter(item=>item.student_id===id);
      form.elements.body.value=observations.length?observations.map(item=>item.title+': '+item.body).join('\n\n')+'\n\nEm casa: acompanhem a rotina, conversem sobre as dificuldades e celebrem os avanços.':'';
      if(!observations.length)notice('Este aluno ainda não tem registros de evolução. Escreva o relatório ou registre uma observação primeiro.');return;
    }
    node.disabled=true;
    try{
      if(action==='remove')await request('/api/school/items/'+node.dataset.id,'DELETE');
      if(action==='seed-examples'){const result=await request('/api/school/examples','POST',{});await refresh();notice(result.inserted?result.inserted+' registros fictícios adicionados. Todos têm o título Exemplo.':'Os exemplos já estão disponíveis para esta turma.');return;}
      if(action==='respond')await request('/api/school/items/'+node.dataset.id+'/response','POST',{status:node.dataset.status});
      await refresh();notice('Alteração salva.');
    }catch(error){notice(error.message,true);node.disabled=false;}
  });
  root.addEventListener('change',async event=>{
    if(event.target.id==='grade-student-filter'){gradeStudentFilter=event.target.value;editingGradeId=null;render();root.querySelector('#grade-student-filter')?.focus();return;}
    if(event.target.dataset.gradeFilter){chartFilter[event.target.dataset.gradeFilter]=event.target.value;render();root.querySelector('#chart-'+event.target.dataset.gradeFilter)?.focus();return;}
    const node=event.target;if(!node.dataset.task)return;
    node.disabled=true;
    try{await request('/api/school/items/'+node.dataset.task+'/response','POST',{status:node.checked?'done':'pending'});await refresh();notice('Progresso salvo.');}
    catch(error){node.checked=!node.checked;node.disabled=false;notice(error.message,true);}
  });
  root.addEventListener('submit',async event=>{
    const form=event.target;if(!form.matches('[data-kind]'))return;event.preventDefault();
    const values=Object.fromEntries(new FormData(form)),kind=form.dataset.kind;
    if(kind==='message')values.title='Conversa';
    if(!['publish','personal','link'].includes(kind))values.kind=kind;
    const submit=form.querySelector('[type=submit]');submit.disabled=true;notice('Salvando…');
    try{await request(kind==='link'?'/api/school/links':'/api/school/items'+(form.dataset.editId?'/'+form.dataset.editId:''),form.dataset.editId?'PATCH':'POST',values);if(kind==='grade')editingGradeId=null;await refresh();notice(kind==='link'?'Responsável vinculado ao aluno.':'Salvo e compartilhado com os perfis autorizados.');}
    catch(error){notice(error.message,true);submit.disabled=false;}
  });
  window.ConectaCalendar.bind(root,{
    render, reload:refresh,
    save:(values,id)=>request('/api/school/items'+(id?'/'+id:''),id?'PATCH':'POST',values),
    respond:(id,status)=>request('/api/school/items/'+id+'/response','POST',{status})
  });
  window.ConectaSchool={
    async open(account,options={}){
      user=account;demo=!!options.demo;data=null;page='home';editingGradeId=null;gradeStudentFilter='';chartFilter={student:'',subject:'',period:''};root.hidden=false;
      if(demo){const teacher={id:user.role==='teacher'?user.id:'demo-teacher',name:'Professor de exemplo'},student={id:user.role==='student'?user.id:'demo-student',name:'Aluno de exemplo',role:'student'},parent={id:user.role==='parent'?user.id:'demo-parent',name:'Responsável de exemplo',role:'parent'};const items=await window.ConectaExamples.items(teacher.id,[student]);data={teacher,students:[student],accounts:user.role==='teacher'?[student,parent]:[],links:[{parent_id:parent.id,student_id:student.id}],items:items.filter(i=>user.role==='teacher'||(!['goal','reminder'].includes(i.kind)||i.author_id===user.id)&&!(i.kind==='authorization'&&user.role==='student')&&(i.kind!=='message'||i.author_id===user.id||i.student_id===user.id)),responses:[]};render();notice('Demonstração com dados fictícios. Entre com sua conta para salvar e compartilhar informações.');return;}
      root.innerHTML='<div class="school"><div class="school-loading" role="status">Carregando sua turma…</div></div>';await refresh();
    },
    close(){requestVersion++;user=null;data=null;const management=document.querySelector('#account-management');if(root.contains(management))root.before(management);root.replaceChildren();root.hidden=true;},
    refresh
  };
})();
