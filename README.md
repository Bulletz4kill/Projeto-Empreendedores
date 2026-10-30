# Conecta+ — Projeto Empreendedores

Portal escolar com cadastro de professores, aprovação pelo administrador e criação de acessos de alunos e responsáveis pelos professores.

## Cópia pública sem dados escolares

Este repositório não contém o HTML original, seus nomes, registros escolares, notas, mensagens ou integrações da plataforma original. O HTML legado é neutro; os painéis atuais estão incluídos no código e começam sem dados escolares cadastrados. O site hospedado e a cópia local completa são mantidos separadamente. Nenhuma senha real, chave de sessão ou credencial de publicação está incluída aqui.

## Executar e testar

Requer Node.js 22.13 ou superior, sem instalar dependências.

```sh
node site-planner/prepare.cjs
node site-planner/build-worker.cjs
node site-planner/check-auth.mjs
node site-planner/check-accounts.mjs
node site-planner/check-school.mjs
node site-planner/preview-worker.mjs
```

A prévia completa abre em http://127.0.0.1:4174, usa banco em memória e contas explicitamente fictícias dos testes. Não altera a hospedagem. A prévia estática opcional usa `node site-planner/preview.cjs` e a porta 4173.

## Configuração do servidor

Defina `ADMIN_USERNAME`, `ADMIN_PASSWORD` e `AUTH_SECRET` no ambiente. Senha e chave de sessão devem ser configuradas como segredos; não as grave no Git. Use um binding D1 chamado `DB` e aplique `site-planner/drizzle/0000_accounts.sql`. A configuração de Sites está em `site-planner/.openai/hosting.json`; para uma hospedagem própria, substitua a identidade do projeto pela sua.

O Worker final é gerado em `site-planner/dist/server/index.js`. O upload ao GitHub não publica automaticamente o site.

## Fluxo de acesso

1. O professor se cadastra com nome, e-mail e senha.
2. O administrador aprova o cadastro no painel administrativo.
3. O professor cria usuários e senhas para alunos e responsáveis.
4. Cada conta entra no perfil correspondente. Professores veem apenas os acessos que criaram.

As senhas de novas contas usam PBKDF2 com salt individual. As sessões usam cookies assinados, HttpOnly, Secure e SameSite. O limite de tentativas fica na memória de cada instância; não é um bloqueio distribuído.

Os testes cobrem aprovação, senha incorreta, isolamento de perfis, permissões de criação, ausência de hashes nas respostas, cookies alterados, logout e carregamento do planner. Nenhuma conta real é criada pelos testes. Os painéis atuais usam o D1 para tarefas, avisos, agenda, evolução, relatórios, metas, mensagens, autorizações e vínculos entre responsáveis e alunos. Aplique todas as migrações da pasta drizzle em ordem.

O login escolar identifica o perfil pelo cadastro após validar a senha, mesmo quando outra aba está selecionada. Uma conta de aluno continua sem permissões de professor. Ao entrar, o cookie do outro tipo de sessão é encerrado. O formulário mantém a senha protegida em caso de erro para permitir a correção.

Os painéis são renderizados diretamente no site, sem iframe. Professores publicam atividades e acompanham respostas; alunos organizam metas e concluem tarefas; responsáveis vinculados acompanham relatórios e respondem a autorizações. Mensagens privadas ficam restritas ao professor e ao destinatário. A logo vetorial está em site-planner/dist/brand-logo.svg.

## Notas e exemplos

A aba Notas calcula médias ponderadas e mostra a evolução cronológica por aluno, matéria e bimestre. O gráfico usa a data da avaliação ou, quando ausente, a data do lançamento. Execute `node site-planner/check-chart.mjs` para verificar ordenação, filtros e casos sem notas.

Os dados de exemplo do gerador são inteiramente fictícios. Professores podem adicioná-los à própria turma pelo painel; repetir a carga não duplica registros existentes. Eles são identificados pelo título Exemplo e por um marcador no payload. A carga não substitui dados cadastrados, cria logins ou altera vínculos familiares. A demonstração na tela de acesso também usa esses exemplos.
