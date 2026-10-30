const profiles={
  prof:{title:'Espaço da professora',greeting:'Boas-vindas, professora!',description:'Acompanhe sua turma e aproxime as famílias.',demo:'Conhecer o espaço da professora'},
  pais:{title:'Espaço dos pais',greeting:'Boas-vindas, família!',description:'Participe de cada etapa da aprendizagem.',demo:'Conhecer o espaço dos pais'},
  alunos:{title:'Espaço dos alunos',greeting:'Seu próximo passo começa aqui!',description:'Organize seus estudos e celebre suas conquistas.',demo:'Conhecer o espaço dos alunos'}
};
const $=selector=>document.querySelector(selector),tabs=[...document.querySelectorAll('[data-role]')];
let selected='prof',adminMode=false,currentUser=null,busy=false;
async function api(path,options={}){
  const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível concluir a operação.');return data;
}
function loginView(){
  $('#credentials').hidden=false;$('#teacher-registration').hidden=true;
  $('#teacher-registration').reset();$('#registration-status').textContent='';
  $('.create-access').hidden=selected!=='prof'||adminMode;$('.demo').hidden=adminMode;
  $('#form-title').textContent=adminMode?'Acesso do administrador':profiles[selected].greeting;
  $('#form-description').textContent=adminMode?'Entre para administrar o portal escolar.':profiles[selected].description;
}
function selectProfile(role){
  if(busy)return;
  selected=role;adminMode=false;
  tabs.forEach(tab=>{const active=tab.dataset.role===role;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
  $('#access-form').setAttribute('aria-labelledby','tab-'+role);
  $('label[for="email"]').textContent='E-mail ou usuário';$('#email').placeholder='Seu e-mail ou usuário';
  $('#credentials').reset();$('#password').type='password';$('#toggle-password').textContent='Mostrar';
  $('#toggle-password').setAttribute('aria-label','Mostrar senha');$('#toggle-password').setAttribute('aria-pressed','false');
  $('#form-status').textContent='';$('#demo-enter').textContent=profiles[role].demo+' →';loginView();
}
tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>selectProfile(tab.dataset.role));
  tab.addEventListener('keydown',event=>{
    let next;if(['ArrowRight','ArrowDown'].includes(event.key))next=(index+1)%tabs.length;
    if(['ArrowLeft','ArrowUp'].includes(event.key))next=(index+tabs.length-1)%tabs.length;
    if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;
    if(next!==undefined&&!busy){event.preventDefault();selectProfile(tabs[next].dataset.role);tabs[next].focus();}
  });
});
$('#toggle-password').addEventListener('click',()=>{
  const show=$('#password').type==='password';$('#password').type=show?'text':'password';$('#toggle-password').textContent=show?'Ocultar':'Mostrar';
  $('#toggle-password').setAttribute('aria-label',show?'Ocultar senha':'Mostrar senha');$('#toggle-password').setAttribute('aria-pressed',String(show));
});
$('#admin-access').addEventListener('click',()=>{
  if(busy)return;adminMode=true;$('#credentials').reset();$('label[for="email"]').textContent='Usuário';$('#email').placeholder='Seu usuário de administrador';$('#form-status').textContent='';loginView();$('#email').focus();
});
$('#create-teacher').addEventListener('click',()=>{
  $('#credentials').reset();$('#credentials').hidden=true;$('.create-access').hidden=true;$('.demo').hidden=true;
  $('#teacher-registration').hidden=false;$('#form-title').textContent='Criar acesso de professor';$('#form-description').textContent='Cadastre-se para organizar sua turma e conectar as famílias.';$('#teacher-name').focus();
});
$('#registration-back').addEventListener('click',()=>{if(!busy){loginView();$('#email').focus();}});
$('#teacher-registration').addEventListener('submit',async event=>{
  event.preventDefault();const status=$('#registration-status');
  if($('#teacher-password').value!==$('#teacher-confirm').value){status.textContent='As senhas precisam ser iguais.';$('#teacher-confirm').focus();return;}
  busy=true;const button=event.target.querySelector('[type="submit"]');button.disabled=true;status.textContent='Enviando cadastro…';
  try{const result=await api('/api/register-teacher',{method:'POST',body:JSON.stringify({name:$('#teacher-name').value,email:$('#teacher-email').value,password:$('#teacher-password').value})});event.target.reset();status.textContent=result.message;}
  catch(error){status.textContent=error.message;$('#teacher-password').value='';$('#teacher-confirm').value='';}
  finally{busy=false;button.disabled=false;}
});
function workspace(user){
  currentUser=user;$('#login').hidden=true;$('#workspace').hidden=false;
  const isAdmin=user.role==='admin',isTeacher=user.role==='teacher';
  $('#workspace-title').textContent=isAdmin?'Administração · Portal escolar':user.name+' · '+({teacher:'Professor',parent:'Responsável',student:'Aluno'}[user.role]||'Demonstração');
  $('#account-management').hidden=!isAdmin&&!isTeacher;$('#create-account').hidden=!isTeacher;
  $('#management-title').textContent=isAdmin?'Acessos de professores':'Acessos da turma';
  $('#management-description').textContent=isAdmin?'Aprove os professores para que eles possam criar acessos de alunos e pais.':'Crie os acessos de alunos e responsáveis. Apenas os cadastros criados por você aparecem aqui.';
  $('#account-list').replaceChildren();$('#management-status').textContent='';
  $('#planner').hidden=isAdmin;$('#planner').removeAttribute('src');$('#planner').removeAttribute('srcdoc');
  $('#logout').focus();window.scrollTo(0,0);
}
async function loadPlanner(){
  const frame=$('#planner');frame.hidden=false;
  $('#management-status').textContent='Carregando planner…';
  try{
    const response=await fetch('/api/planner');
    if(!response.ok){const data=await response.json();throw new Error(data.error||'Não foi possível carregar o planner.');}
    const html=await response.text();frame.srcdoc=html;
    $('#management-status').textContent='';
  }catch(error){frame.hidden=true;$('#account-management').hidden=false;$('#management-status').textContent=error.message;}
}
async function loadAccounts(){
  if(!currentUser||!['admin','teacher'].includes(currentUser.role))return;
  const admin=currentUser.role==='admin';$('#management-status').textContent='Carregando acessos…';
  try{
    const result=await api(admin?'/api/teachers':'/api/accounts');$('#account-list').replaceChildren();
    if(!result.accounts.length){$('#management-status').textContent=admin?'Nenhum professor cadastrado ainda. Os pedidos aparecerão aqui.':'Nenhum acesso criado ainda. Preencha o formulário acima para começar.';return;}
    $('#management-status').textContent='';
    for(const account of result.accounts){
      const row=document.createElement('div');row.className='account-row';const details=document.createElement('div');
      const name=document.createElement('strong');name.textContent=account.name;const info=document.createElement('p');info.textContent=account.login+' · '+({teacher:'Professor',student:'Aluno',parent:'Responsável'}[account.role]);details.append(name,info);row.append(details);
      if(admin&&account.status==='pending'){
        const button=document.createElement('button');button.type='button';button.textContent='Aprovar professor';
        button.addEventListener('click',async()=>{button.disabled=true;try{await api('/api/teachers/'+encodeURIComponent(account.id)+'/approve',{method:'POST',body:'{}'});await loadAccounts();}catch(error){$('#management-status').textContent=error.message;button.disabled=false;}});row.append(button);
      }else{const badge=document.createElement('span');badge.className='account-badge';badge.textContent='Acesso ativo';row.append(badge);}
      $('#account-list').append(row);
    }
  }catch(error){$('#management-status').textContent=error.message;}
}
$('#credentials').addEventListener('submit',async event=>{
  event.preventDefault();const status=$('#form-status'),button=event.target.querySelector('[type="submit"]');
  busy=true;button.disabled=true;status.textContent='Verificando acesso…';
  try{
    const result=await api(adminMode?'/api/login':'/api/account-login',{method:'POST',body:JSON.stringify({username:$('#email').value,password:$('#password').value,profile:selected})});
    event.target.reset();workspace(result.user);
    if(result.user.role==='admin')await loadAccounts();
    else{await loadPlanner();if(result.user.role==='teacher')await loadAccounts();}
  }catch(error){status.textContent=error.message;$('#password').value='';}
  finally{busy=false;button.disabled=false;}
});
$('#create-account').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.target.querySelector('[type="submit"]');button.disabled=true;
  const name=$('#account-name').value,role=$('#account-role').value;
  try{
    const result=await api('/api/accounts',{method:'POST',body:JSON.stringify({role,name,login:$('#account-login').value,password:$('#account-password').value})});
    event.target.reset();await loadAccounts();$('#management-status').textContent='Acesso de '+({student:'aluno',parent:'responsável'}[role])+' criado para '+name+'. Usuário: '+result.user.login+'. A senha não será exibida novamente.';
  }catch(error){$('#management-status').textContent=error.message;$('#account-password').value='';}
  finally{button.disabled=false;}
});
$('#refresh-accounts').addEventListener('click',loadAccounts);
$('#demo-enter').addEventListener('click',()=>{
  $('#credentials').reset();workspace({name:profiles[selected].title,role:'demo'});$('#workspace-title').textContent=profiles[selected].title+' · Demonstração';
  $('#planner').hidden=false;$('#planner').src='planner.html#'+selected;
});
$('#logout').addEventListener('click',async()=>{
  const button=$('#logout');button.disabled=true;
  try{
    if(currentUser&&currentUser.role!=='demo')await api('/api/logout',{method:'POST',body:'{}'});
    currentUser=null;$('#workspace').hidden=true;$('#planner').removeAttribute('src');$('#planner').removeAttribute('srcdoc');$('#create-account').reset();$('#login').hidden=false;selectProfile(selected);$('#tab-'+selected).focus();
  }catch(error){$('#workspace-title').textContent=error.message;}
  finally{button.disabled=false;}
});
selectProfile('prof');
