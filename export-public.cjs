const fs=require('fs');const path=require('path');
const root=__dirname,target=path.join(root,'github-public');
const files=['.gitignore','.github/workflows/check.yml','site-planner/.gitignore','site-planner/.openai/hosting.json','site-planner/build-worker.cjs','site-planner/check-auth.mjs','site-planner/check-accounts.mjs','site-planner/prepare.cjs','site-planner/preview.cjs','site-planner/preview-worker.mjs','site-planner/testing/d1.mjs','site-planner/worker/index.mjs','site-planner/drizzle/0000_accounts.sql','site-planner/dist/index.html','site-planner/dist/styles.css','site-planner/dist/app.js','export-public.cjs'];
files.push('site-planner/check-school.mjs','site-planner/worker/school.mjs','site-planner/drizzle/0001_school.sql','site-planner/dist/school.js','site-planner/dist/school.css','site-planner/dist/brand-icon.svg','site-planner/dist/brand-logo.svg');
files.push('site-planner/dist/calendar.js','site-planner/create-favicon.cjs','site-planner/dist/favicon.ico','site-planner/dist/favicon-32.png','site-planner/dist/apple-touch-icon.png');
files.push('site-planner/dist/grade-chart.js','site-planner/dist/examples.js','site-planner/check-chart.mjs');
files.push('site-planner/dist/portal.css');
files.push('site-planner/worker/institutions.mjs','site-planner/drizzle/0002_institutions.sql','site-planner/dist/institutions.js','site-planner/dist/institutions.css','site-planner/dist/report-card.js','site-planner/dist/report-card.css','site-planner/check-migration.mjs','site-planner/check-report.mjs');
for(const file of files){const destination=path.join(target,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(root,file),destination);}
const prepare=path.join(target,'site-planner/prepare.cjs');
fs.writeFileSync(prepare,fs.readFileSync(prepare,'utf8').replace("let html = fs.readFileSync(path.join(root, source), 'utf8');","if(!source){console.log('Public export: using the empty planner, without school data.');process.exit(0);}\nlet html = fs.readFileSync(path.join(root, source), 'utf8');"));
// The public repository intentionally excludes the original artifact and its datasets.
fs.writeFileSync(path.join(target,'site-planner/dist/planner.html'),'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conecta+ | Planner</title><style>body{font:16px system-ui;color:#245b3b;padding:40px;line-height:1.7;background:#f6f8f4}main{max-width:650px;margin:auto;padding:30px;background:white;border:1px solid #dce6db;border-radius:12px}</style></head><body><main id="planner"><h1>Conecta+</h1><h2>Espaço pedagógico</h2><p>Esta cópia pública contém o código de autenticação e gestão de acessos. O conteúdo escolar e o HTML original foram omitidos para preservar os dados do projeto.</p><p>Conecte seu próprio conteúdo pedagógico antes de usar este ambiente com uma turma.</p></main></body></html>');
fs.writeFileSync(path.join(target,'README.md'),'# Conecta+ — Projeto Empreendedores\n\nPortal escolar com cadastro de professores, aprovação pelo administrador e criação de acessos de alunos e responsáveis pelos professores.\n\n## Cópia pública sem dados escolares\n\nEste repositório não contém o HTML original, seus nomes, registros escolares, notas, mensagens ou integrações da plataforma original. O planner incluído está vazio. O site hospedado e a cópia local completa são mantidos separadamente. Nenhuma senha real, chave de sessão ou credencial de publicação está incluída aqui.\n\n## Executar e testar\n\nRequer Node.js 22.13 ou superior, sem instalar dependências.\n\n```sh\nnode site-planner/prepare.cjs\nnode site-planner/build-worker.cjs\nnode site-planner/check-auth.mjs\nnode site-planner/check-accounts.mjs\nnode site-planner/preview-worker.mjs\n```\n\nA prévia completa abre em http://127.0.0.1:4174, usa banco em memória e contas explicitamente fictícias dos testes. Não altera a hospedagem. A prévia estática opcional usa `node site-planner/preview.cjs` e a porta 4173.\n\n## Configuração do servidor\n\nDefina `ADMIN_USERNAME`, `ADMIN_PASSWORD` e `AUTH_SECRET` no ambiente. Senha e chave de sessão devem ser configuradas como segredos; não as grave no Git. Use um binding D1 chamado `DB` e aplique `site-planner/drizzle/0000_accounts.sql`. A configuração de Sites está em `site-planner/.openai/hosting.json`; para uma hospedagem própria, substitua a identidade do projeto pela sua.\n\nO Worker final é gerado em `site-planner/dist/server/index.js`. O upload ao GitHub não publica automaticamente o site.\n\n## Fluxo de acesso\n\n1. O professor se cadastra com nome, e-mail e senha.\n2. O administrador aprova o cadastro no painel administrativo.\n3. O professor cria usuários e senhas para alunos e responsáveis.\n4. Cada conta entra no perfil correspondente. Professores veem apenas os acessos que criaram.\n\nAs senhas de novas contas usam PBKDF2 com salt individual. As sessões usam cookies assinados, HttpOnly, Secure e SameSite. O limite de tentativas fica na memória de cada instância; não é um bloqueio distribuído.\n\nOs testes cobrem aprovação, senha incorreta, isolamento de perfis, permissões de criação, ausência de hashes nas respostas, cookies alterados, logout e carregamento do planner. Nenhuma conta real é criada pelos testes. O conteúdo pedagógico e a sincronização entre famílias e turmas precisam ser conectados separadamente.\n');
const readmePath=path.join(target,'README.md');
fs.writeFileSync(readmePath,fs.readFileSync(readmePath,'utf8').replace('O planner incluído está vazio.','O HTML legado é neutro; os painéis atuais estão incluídos no código e começam sem dados escolares cadastrados.').replace('O conteúdo pedagógico e a sincronização entre famílias e turmas precisam ser conectados separadamente.','Os painéis atuais usam o D1 para tarefas, avisos, agenda, evolução, relatórios, metas, mensagens, autorizações e vínculos entre responsáveis e alunos. Aplique todas as migrações da pasta drizzle em ordem.').replace('node site-planner/check-accounts.mjs\n','node site-planner/check-accounts.mjs\nnode site-planner/check-school.mjs\n'));
fs.appendFileSync(readmePath,'\nO login escolar identifica o perfil pelo cadastro após validar a senha, mesmo quando outra aba está selecionada. Uma conta de aluno continua sem permissões de professor. Ao entrar, o cookie do outro tipo de sessão é encerrado. O formulário mantém a senha protegida em caso de erro para permitir a correção.\n\nOs painéis são renderizados diretamente no site, sem iframe. Professores publicam atividades e acompanham respostas; alunos organizam metas e concluem tarefas; responsáveis vinculados acompanham relatórios e respondem a autorizações. Mensagens privadas ficam restritas ao professor e ao destinatário. A logo vetorial está em site-planner/dist/brand-logo.svg.\n');
fs.appendFileSync(readmePath,'\n## Notas e exemplos\n\nA aba Notas calcula médias ponderadas e mostra a evolução cronológica por aluno, matéria e bimestre. O gráfico usa a data da avaliação ou, quando ausente, a data do lançamento. Execute `node site-planner/check-chart.mjs` para verificar ordenação, filtros e casos sem notas.\n\nOs dados de exemplo do gerador são inteiramente fictícios. Professores podem adicioná-los à própria turma pelo painel; repetir a carga não duplica registros existentes. Eles são identificados pelo título Exemplo e por um marcador no payload. A carga não substitui dados cadastrados, cria logins ou altera vínculos familiares. A demonstração na tela de acesso também usa esses exemplos.\n');
fs.writeFileSync(readmePath,`# Conecta+ — Portal escolar

Código público sem registros reais, HTML escolar original ou credenciais de produção. Os nomes e dados dos testes são fictícios.

## Organização

- ADM da plataforma: cadastra e autoriza escolas; define ciclo mensal/anual e capacidade contratada. Assinaturas são somente visuais, sem pagamento, checkout ou cobrança automática.
- Gestão da instituição: cria turmas, contas de professores/alunos/responsáveis, associa professores e alunos às turmas e vincula familiares aos alunos.
- Professor: publica notas, frequência, tarefas, eventos, observações e relatórios nas turmas a que foi vinculado. Não cria contas.
- Aluno e responsável: mantêm seus painéis e acesso apenas aos dados permitidos pela turma e pelos vínculos familiares.

O boletim unificado apresenta avaliações por componente, médias ponderadas, faltas e aulas por aluno, disciplina, ano e bimestre. Notas ausentes aparecem como traço; zero é uma nota real. A parcial exclui avaliação final; a média final pondera todas as avaliações lançadas. Substitutivas não trocam notas automaticamente. O gráfico cronológico continua disponível.

## Planos demonstrativos

| Capacidade | À vista | Em até 12x (total) |
| --- | --- | --- |
| Até 350 alunos | R$ 1.600 | R$ 1.800 |
| De 351 a 1.000 alunos | R$ 2.600 | R$ 2.800 |
| Acima de 1.000 | Base de R$ 2.600 + R$ 2,50/aluno excedente | Base de R$ 2.800 + R$ 2,50/aluno excedente |

O servidor calcula os valores pela capacidade informada. O ciclo de assinatura é administrativo/visual e não executa cobranças.

## Executar

Requer Node.js 22.13 ou superior. Não precisa instalar dependências.

\`\`\`sh
node site-planner/prepare.cjs
node site-planner/build-worker.cjs
node site-planner/check-auth.mjs
node site-planner/check-accounts.mjs
node site-planner/check-school.mjs
node site-planner/check-chart.mjs
node site-planner/check-report.mjs
node site-planner/check-migration.mjs
node site-planner/preview-worker.mjs
\`\`\`

A prévia usa banco em memória em http://127.0.0.1:4174 e contas fictícias definidas nos testes. Não altera a hospedagem.

## Servidor e migração

Use o binding D1 DB e aplique todas as migrações da pasta drizzle em ordem. Configure ADMIN_USERNAME, ADMIN_PASSWORD e AUTH_SECRET no ambiente; senha e chave de sessão são segredos. A identidade em .openai/hosting.json pertence ao projeto original; substitua-a antes de hospedar uma cópia própria.

A migração 0002 adiciona somente o esquema. Após publicá-la, o ADM pode executar POST /api/admin/migrate-legacy com sessão autenticada para preservar e associar os cadastros antigos a uma escola e turma existentes. A operação é idempotente e mantém senhas, notas, registros e vínculos familiares. O ADM cria em seguida o acesso do gestor para cada escola migrada. Migrações e exemplos não criam credenciais de produção automaticamente.

As senhas usam PBKDF2 com salt individual; sessões usam cookies assinados HttpOnly/Secure/SameSite. A escola precisa estar autorizada para suas contas entrarem. Os testes verificam isolamento entre escolas e turmas, permissões de criação/edição, privacidade de mensagens, capacidade contratada, preços, suspensão, boletim e preservação na migração.
`);
console.log('Public export prepared: '+files.length+' source files, README, and empty planner.');
