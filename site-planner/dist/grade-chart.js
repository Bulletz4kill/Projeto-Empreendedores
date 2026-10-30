(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const colors=['#24694b','#306aaf','#a75920','#8455a3','#a13969','#397c83'];
  function points(items,filter){
    return items.filter(i=>i.kind==='grade'&&i.student_id===filter.student&&(!filter.subject||i.payload.subject.trim().toLocaleLowerCase('pt-BR')===filter.subject)&&(!filter.period||i.payload.period===filter.period)).map(i=>({...i,time:Date.parse((i.due_at||i.created_at).slice(0,10)+'T12:00:00Z')})).filter(i=>Number.isFinite(i.time)&&Number.isFinite(i.payload.score)).sort((a,b)=>a.time-b.time||a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
  }
  function render(data,filter){
    const all=data.items.filter(i=>i.kind==='grade');if(!all.length)return '';
    const students=data.students.filter(s=>all.some(i=>i.student_id===s.id));
    if(!students.some(s=>s.id===filter.student))filter.student=students[0]?.id;
    const subjects=[...new Map(all.filter(i=>i.student_id===filter.student).map(i=>[i.payload.subject.trim().toLocaleLowerCase('pt-BR'),i.payload.subject])).entries()];
    if(!subjects.some(([id])=>id===filter.subject))filter.subject='';
    const options=(label,key,values)=>`<div><label for="chart-${key}">${label}</label><select id="chart-${key}" data-grade-filter="${key}">${values.map(([id,text])=>`<option value="${esc(id)}" ${filter[key]===id?'selected':''}>${esc(text)}</option>`).join('')}</select></div>`;
    const controls=`<div class="grade-filters">${options('Aluno','student',students.map(s=>[s.id,s.name]))}${options('Matéria','subject',[['','Todas as matérias'],...subjects])}${options('Bimestre','period',[['','Todos os bimestres'],...[1,2,3,4].map(n=>[String(n),n+'º bimestre'])])}</div>`;
    const rows=points(all,filter);if(!rows.length)return `<section class="school-card"><h2>Desempenho ao longo do tempo</h2>${controls}<p>Nenhuma nota neste período.</p></section>`;
    const groups=[...new Set(rows.map(i=>i.payload.subject.trim().toLocaleLowerCase('pt-BR')))];
    const lo=rows[0].time,hi=rows.at(-1).time,x=t=>hi===lo?430:66+(t-lo)/(hi-lo)*730,y=n=>250-n*21;
    const day=t=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',timeZone:'UTC'}).format(new Date(t));
    const num=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:1});
    const ticks=[...new Set(rows.map(i=>i.time))].filter((_,i,a)=>i===0||i===a.length-1||i%Math.ceil(a.length/6)===0);
    const lines=groups.map((subject,index)=>{const series=rows.filter(i=>i.payload.subject.trim().toLocaleLowerCase('pt-BR')===subject),color=colors[index%colors.length];return `<polyline fill="none" stroke="${color}" stroke-width="3" points="${series.map(i=>x(i.time)+','+y(i.payload.score)).join(' ')}"/>${series.map(i=>`<circle class="grade-dot" tabindex="0" role="img" aria-label="${esc(i.payload.subject+' · '+i.title+' · '+day(i.time)+' · nota '+num(i.payload.score))}" cx="${x(i.time)}" cy="${y(i.payload.score)}" r="5" fill="${color}" stroke="white" stroke-width="2"><title>${esc(i.title)} · ${esc(day(i.time))} · ${num(i.payload.score)}/10</title></circle>`).join('')}`;}).join('');
    const svg=`<svg viewBox="0 0 850 305" role="img" aria-labelledby="grade-chart-title grade-chart-desc"><title id="grade-chart-title">Evolução das notas por matéria</title><desc id="grade-chart-desc">Notas de 0 a 10, em ordem de data da avaliação. Cada linha representa uma matéria do aluno selecionado. Os valores completos estão na tabela abaixo.</desc>${[0,2,4,6,8,10].map(n=>`<line x1="66" y1="${y(n)}" x2="796" y2="${y(n)}" stroke="#dce7df"/><text x="49" y="${y(n)+5}" text-anchor="end">${n}</text>`).join('')}${ticks.map(t=>`<text x="${x(t)}" y="278" text-anchor="middle">${day(t)}</text>`).join('')}${lines}</svg>`;
    return `<section class="school-card"><h2>Desempenho ao longo do tempo</h2><p>Compare as avaliações de cada matéria. A data da avaliação é usada no gráfico; quando não informada, usamos a data do lançamento.</p>${controls}<div class="grade-chart">${svg}</div><div class="grade-legend">${groups.map((s,index)=>`<span><i style="background:${colors[index%colors.length]}"></i>${esc(rows.find(i=>i.payload.subject.trim().toLocaleLowerCase('pt-BR')===s).payload.subject)}</span>`).join('')}</div>${rows.length===1?'<p class="school-help">A primeira nota já aparece no gráfico. Novas avaliações formarão a linha de evolução.</p>':''}<details class="grade-table"><summary>Ver dados do gráfico (${rows.length} avaliações)</summary><div><table><caption>Notas do aluno selecionado em ordem cronológica</caption><thead><tr><th>Data</th><th>Matéria</th><th>Avaliação</th><th>Bimestre</th><th>Nota</th></tr></thead><tbody>${rows.map(i=>`<tr><td>${day(i.time)}</td><td>${esc(i.payload.subject)}</td><td>${esc(i.title)}</td><td>${esc(i.payload.period)}º</td><td>${num(i.payload.score)}</td></tr>`).join('')}</tbody></table></div></details></section>`;
  }
  window.ConectaGradeChart={render,points};
})();
