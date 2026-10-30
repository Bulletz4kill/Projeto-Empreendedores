(()=>{
  const source='conecta-example-v1';
  async function items(teacherId,students,now=new Date()){
    const day=offset=>{const d=new Date(now);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
    const result=[];
    async function add(key,kind,title,body,student=null,payload={},offset=0,author=teacherId){
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source+teacherId+key))),b=>b.toString(16).padStart(2,'0')).join('').slice(0,32);
      const id=hash.slice(0,8)+'-'+hash.slice(8,12)+'-'+hash.slice(12,16)+'-'+hash.slice(16,20)+'-'+hash.slice(20);
      result.push({id,kind,teacher_id:teacherId,student_id:student,author_id:author,title:'Exemplo · '+title,body,payload:{...payload,source},due_at:day(offset),created_at:now.toISOString(),updated_at:now.toISOString()});
    }
    await add('notice','notice','Semana de aprendizagem','Conteúdo fictício para explorar os recados e a confirmação de leitura.');
    await add('event','event','Encontro com as famílias','Encontro fictício para conhecer a agenda e testar a confirmação de presença.',null,{format:'Online'},3);
    for(const s of students){
      const key=s.id;
      for(const [subject,scores]of [['Matemática',[5.5,6.8,7.5,8.7]],['Português',[6,7.2,7,9]]])for(let n=0;n<scores.length;n++)await add(key+subject+n,'grade',`${subject}: avaliação ${n+1}`,'Nota fictícia para demonstrar o gráfico de evolução.',s.id,{subject,period:'4',score:scores[n],weight:n===3?2:1},-42+n*12);
      await add(key+'task','task','Revisão da semana','Atividade fictícia: revise o conteúdo e separe suas dúvidas.',s.id,{subject:'Matemática'},2);
      await add(key+'observation','observation','Avanço na organização','Registro fictício: passou a organizar melhor os materiais e os prazos.',s.id,{category:'Organização'},-2);
      await add(key+'report','report','Acompanhamento semanal','Relatório fictício: apresentou evolução na participação. Em casa, combine um horário curto de revisão.',s.id,{},-1);
      await add(key+'authorization','authorization','Oficina de leitura','Pedido fictício para testar a resposta da família. Não corresponde a uma atividade real.',s.id,{},5);
      await add(key+'message','message','Conversa','Mensagem fictícia: use este canal para conversar sobre a rotina de estudos.',s.id);
      await add(key+'goal','goal','Estudar 20 minutos por dia','Meta fictícia para testar o acompanhamento.',s.id,{},4,s.id);
      await add(key+'reminder','reminder','Organizar a mochila','Lembrete fictício para explorar o planner.',s.id,{},1,s.id);
    }
    return result;
  }
  globalThis.ConectaExamples={items,source};
})();
