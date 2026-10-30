(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad=value=>String(value).padStart(2,'0'),key=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  const parse=value=>new Date(value.length===10?value+'T12:00:00':value),weekStart=date=>{const result=new Date(date);result.setDate(result.getDate()-(result.getDay()+6)%7);return result;};
  const weekdays=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  let cursor=new Date(),selected=key(cursor),view='month',includeTasks=true,context=null,root=null,handlers=null;
  const time=item=>item.due_at?.includes('T')?item.due_at.slice(11,16):'Dia todo';
  const formatDay=value=>new Intl.DateTimeFormat('pt-BR',{day:'numeric',month:'long',year:'numeric'}).format(parse(value));
  const items=()=>context.items.filter(item=>item.due_at&&(item.kind==='event'||includeTasks&&item.kind==='task')).sort((a,b)=>a.due_at.localeCompare(b.due_at));
  const onDay=date=>items().filter(item=>item.due_at.slice(0,10)===date);
  function chip(item,week=false){return `<button type="button" class="cal-event${item.kind==='task'?' task':''}${week?' week-event':''}" data-action="cal-open" data-id="${item.id}" ${context.user.role==='teacher'&&item.kind==='event'&&item.author_id===context.user.id?'draggable="true" data-cal-drag="'+item.id+'"':''} title="${esc(item.title)}"><span>${item.due_at.includes('T')?esc(time(item))+' ':''}${esc(item.title)}</span></button>`;}
  function month(){
    const first=new Date(cursor.getFullYear(),cursor.getMonth(),1),start=weekStart(first),today=key(new Date());
    return `<div class="cal-weekdays" role="row">${weekdays.map(day=>`<span role="columnheader">${day}</span>`).join('')}</div><div class="cal-month" role="grid" aria-label="Calendário do mês">${Array.from({length:42},(_,index)=>{const day=new Date(start);day.setDate(start.getDate()+index);const value=key(day),list=onDay(value);return `<div class="cal-cell${day.getMonth()!==cursor.getMonth()?' muted':''}${selected===value?' selected':''}" role="gridcell" tabindex="0" data-action="cal-day" data-cal-date="${value}" aria-label="${esc(formatDay(value))}, ${list.length} itens"><span class="cal-number${today===value?' today':''}">${day.getDate()}</span><div class="cal-cell-events">${list.slice(0,3).map(item=>chip(item)).join('')}${list.length>3?`<button type="button" class="cal-more" data-action="cal-more" data-cal-date="${value}">+${list.length-3} itens</button>`:''}</div></div>`;}).join('')}</div>`;
  }
  function week(){
    const first=weekStart(cursor),days=Array.from({length:7},(_,i)=>{const d=new Date(first);d.setDate(first.getDate()+i);return d;}),today=key(new Date());
    return `<div class="cal-week-scroll"><div class="cal-week-grid"><div class="cal-week-head"><div class="cal-zone">Horário</div>${days.map((day,i)=>`<div><span>${weekdays[i]}</span><button type="button" class="cal-week-number${key(day)===today?' today':''}" data-action="cal-day" data-cal-date="${key(day)}">${day.getDate()}</button>${onDay(key(day)).filter(item=>!item.due_at.includes('T')||Number(item.due_at.slice(11,13))<7||Number(item.due_at.slice(11,13))>=21).map(item=>chip(item)).join('')}</div>`).join('')}</div><div class="cal-hours-grid"><div class="cal-hour-labels">${Array.from({length:14},(_,i)=>`<span style="top:${i*44}px">${pad(i+7)}:00</span>`).join('')}</div>${days.map(day=>`<div class="cal-week-day" data-action="cal-slot" data-cal-date="${key(day)}" tabindex="0" role="button" aria-label="Agendar em ${esc(formatDay(key(day)))}">${onDay(key(day)).filter(item=>item.due_at.includes('T')&&Number(item.due_at.slice(11,13))>=7&&Number(item.due_at.slice(11,13))<21).map(item=>{
      const hour=Number(item.due_at.slice(11,13))+Number(item.due_at.slice(14,16))/60,top=(hour-7)*44;
      const duration=item.payload?.endAt?Math.max(0.5,(parse(item.payload.endAt)-parse(item.due_at))/3600000):1,height=Math.max(27,Math.min(duration*44,616-top));
      return `<div class="cal-timed" style="top:${top}px;height:${height}px">${chip(item,true)}</div>`;
    }).join('')}</div>`).join('')}</div></div></div>`;
  }
  function list(listItems=items()){
    return listItems.length?`<div class="cal-agenda-list">${listItems.map(item=>`<button type="button" class="cal-agenda-item" data-action="cal-open" data-id="${item.id}"><span class="cal-date-block"><strong>${parse(item.due_at).getDate()}</strong><small>${new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(parse(item.due_at))}</small></span><span><strong>${esc(item.title)}</strong><small>${esc(time(item))} · ${item.kind==='task'?'Prazo de tarefa':esc(item.payload?.format||'Encontro')}</small></span><span aria-hidden="true">↗</span></button>`).join('')}</div>`:'<div class="school-empty"><strong>Nenhum compromisso por aqui.</strong>Os encontros e prazos publicados pelo professor aparecerão no calendário.</div>';
  }
  function render(data,user){
    context={...data,user};
    const monthLabel=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(cursor);
    return `<section class="school-card calendar-card"><div class="cal-toolbar"><div class="cal-navigation"><button type="button" class="cal-today" data-action="cal-today">Hoje</button><button type="button" class="cal-arrow" data-action="cal-prev" aria-label="Período anterior">‹</button><button type="button" class="cal-arrow" data-action="cal-next" aria-label="Próximo período">›</button><h2>${esc(monthLabel)}</h2></div><div class="cal-views" aria-label="Visualização do calendário">${[['month','Mês'],['week','Semana'],['list','Lista']].map(([value,label])=>`<button type="button" data-action="cal-view" data-view="${value}" aria-pressed="${view===value}">${label}</button>`).join('')}</div>${user.role==='teacher'?'<button type="button" class="school-button" data-action="cal-create">+ Criar encontro</button>':''}</div><div class="cal-legend"><span><i></i> Encontros</span><label><input type="checkbox" data-cal-filter ${includeTasks?'checked':''}><i class="task"></i> Prazos de tarefas</label>${user.role==='teacher'?'<small>Clique em um dia para agendar. Arraste um encontro para mudar a data.</small>':''}</div><p id="cal-status" class="school-status" role="status"></p>${view==='month'?month():view==='week'?week():list()}</section>${view==='month'?`<section class="school-card"><div class="cal-day-title"><h2>${esc(formatDay(selected))}</h2>${user.role==='teacher'?'<button class="text-button" type="button" data-action="cal-create">Agendar neste dia</button>':''}</div>${list(onDay(selected))}</section>`:''}`;
  }
  function notify(text){const node=root.querySelector('#cal-status');if(node)node.textContent=text;}
  function modal(html){root.querySelector('#calendar-dialog')?.remove();const dialog=document.createElement('dialog');dialog.id='calendar-dialog';dialog.className='cal-dialog';dialog.innerHTML=html;root.append(dialog);dialog.showModal();return dialog;}
  function close(){const dialog=root.querySelector('#calendar-dialog');if(dialog){dialog.close();dialog.remove();}}
  function create(date=selected,hour='09:00',item=null){
    if(context.user.role!=='teacher')return;
    const start=item?.due_at?.includes('T')?item.due_at:date+'T'+hour;
    const end=item?.payload?.endAt||date+'T'+pad(Math.min(23,Number(hour.slice(0,2))+1))+hour.slice(2);
    modal(`<div class="cal-dialog-head"><h2>${item?'Editar encontro':'Novo encontro'}</h2><button type="button" data-action="cal-close" aria-label="Fechar">×</button></div><form class="school-form" data-cal-form ${item?'data-cal-edit="'+item.id+'"':''}><label for="cal-title">Título</label><input id="cal-title" name="title" maxlength="180" value="${esc(item?.title||'')}" required><div class="row"><div><label for="cal-start">Início</label><input id="cal-start" name="dueAt" type="datetime-local" value="${esc(start)}" required></div><div><label for="cal-end">Término</label><input id="cal-end" name="endAt" type="datetime-local" value="${esc(item?item.payload?.endAt||'':end)}"></div></div><label for="cal-audience">Participantes</label><select id="cal-audience" name="studentId"><option value="">Toda a turma</option>${context.students.map(student=>`<option value="${student.id}" ${item?.student_id===student.id?'selected':''}>${esc(student.name)} e responsáveis</option>`).join('')}</select><label for="cal-format">Formato</label><select id="cal-format" name="format"><option ${item?.payload?.format!=='Online'?'selected':''}>Presencial</option><option ${item?.payload?.format==='Online'?'selected':''}>Online</option></select><label for="cal-body">Descrição, local ou link do encontro</label><textarea id="cal-body" name="body" rows="3" maxlength="5000" required>${esc(item?.body||'')}</textarea><p class="school-status" id="cal-dialog-status" role="status"></p><div class="school-actions"><button class="school-button" type="submit">Salvar encontro</button><button class="school-button secondary" type="button" data-action="cal-close">Cancelar</button></div></form>`);
  }
  function details(id){
    const item=context.items.find(row=>row.id===id);if(!item)return;
    const response=context.responses.find(r=>r.item_id===id&&r.account_id===context.user.id)?.status;
    const canEdit=context.user.role==='teacher'&&item.author_id===context.user.id&&item.kind==='event';
    modal(`<div class="cal-dialog-head"><span class="school-pill">${item.kind==='task'?'Tarefa':'Encontro'}</span><button type="button" data-action="cal-close" aria-label="Fechar">×</button></div><h2>${esc(item.title)}</h2><p class="cal-detail-time">${esc(formatDay(item.due_at.slice(0,10)))} · ${esc(time(item))}${item.payload?.endAt?' — '+esc(item.payload.endAt.slice(11,16)):''}</p><p class="cal-detail-body">${esc(item.body)}</p><span class="school-pill">${item.kind==='task'?esc(item.payload?.subject||'Tarefa'):esc(item.payload?.format||'Presencial')}</span><div class="school-actions">${canEdit?`<button class="school-button" type="button" data-action="cal-edit" data-id="${item.id}">Editar encontro</button>`:''}${context.user.role==='parent'&&item.kind==='event'?`<button class="school-button" type="button" data-action="cal-response" data-id="${item.id}" data-status="${response==='confirmed'?'pending':'confirmed'}">${response==='confirmed'?'Desfazer confirmação':'Confirmar presença'}</button>`:''}${context.user.role==='student'&&item.kind==='task'?`<button class="school-button" type="button" data-action="cal-response" data-id="${item.id}" data-status="${response==='done'?'pending':'done'}">${response==='done'?'Marcar como pendente':'Concluir tarefa'}</button>`:''}<button class="school-button secondary" type="button" data-action="cal-close">Fechar</button></div>`);
  }
  function bind(container,callbacks){
    root=container;handlers=callbacks;
    root.addEventListener('click',async event=>{
      const node=event.target.closest('[data-action^="cal-"]');if(!node)return;
      const action=node.dataset.action;
      if(action==='cal-close'){close();return;}
      if(action==='cal-open'){details(node.dataset.id);return;}
      if(action==='cal-edit'){const item=context.items.find(i=>i.id===node.dataset.id);close();create(item.due_at.slice(0,10),time(item)==='Dia todo'?'09:00':time(item),item);return;}
      if(action==='cal-response'){node.disabled=true;try{await handlers.respond(node.dataset.id,node.dataset.status);close();await handlers.reload();}catch(error){notify(error.message);node.disabled=false;}return;}
      if(action==='cal-create'){create();return;}
      if(action==='cal-view')view=node.dataset.view;
      if(action==='cal-today'){cursor=new Date();selected=key(cursor);}
      if(action==='cal-prev'||action==='cal-next'){const delta=action==='cal-prev'?-1:1;if(view==='week')cursor.setDate(cursor.getDate()+delta*7);else cursor=new Date(cursor.getFullYear(),cursor.getMonth()+delta,1);selected=key(cursor);}
      if(action==='cal-day'||action==='cal-more'||action==='cal-slot'){
        selected=node.dataset.calDate;
        if(action!=='cal-more'&&context.user.role==='teacher'){
          const hour=action==='cal-slot'?pad(Math.max(7,Math.min(20,7+Math.floor((event.clientY-node.getBoundingClientRect().top)/44))))+':00':'09:00';create(selected,hour);return;
        }
      }
      handlers.render();
    });
    root.addEventListener('change',event=>{if(event.target.matches('[data-cal-filter]')){includeTasks=event.target.checked;handlers.render();}});
    root.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target.matches('[data-cal-date][tabindex]')){event.preventDefault();event.target.click();}});
    root.addEventListener('submit',async event=>{
      const form=event.target;if(!form.matches('[data-cal-form]'))return;event.preventDefault();const values=Object.fromEntries(new FormData(form));values.kind='event';
      const submit=form.querySelector('[type=submit]');submit.disabled=true;
      try{await handlers.save(values,form.dataset.calEdit);close();await handlers.reload();notify('Encontro salvo no calendário.');}catch(error){form.querySelector('#cal-dialog-status').textContent=error.message;submit.disabled=false;}
    });
    root.addEventListener('dragstart',event=>{const node=event.target.closest('[data-cal-drag]');if(node){event.dataTransfer.setData('text/plain',node.dataset.calDrag);event.dataTransfer.effectAllowed='move';}});
    root.addEventListener('dragover',event=>{if(context?.user.role==='teacher'&&event.target.closest('[data-cal-date]'))event.preventDefault();});
    root.addEventListener('drop',async event=>{
      const node=event.target.closest('[data-cal-date]');if(!node||context?.user.role!=='teacher')return;event.preventDefault();
      const item=context.items.find(i=>i.id===event.dataTransfer.getData('text/plain')&&i.kind==='event'&&i.author_id===context.user.id);if(!item)return;
      try{await handlers.save({dueAt:node.dataset.calDate+(item.due_at.includes('T')?'T'+item.due_at.slice(11,16):'')},item.id);await handlers.reload();notify('Data do encontro atualizada.');}catch(error){notify(error.message);}
    });
  }
  window.ConectaCalendar={render,bind};
})();
