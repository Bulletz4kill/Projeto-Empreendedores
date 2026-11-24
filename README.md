# Conecta+ — Portal escolar

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

```sh
node site-planner/prepare.cjs
node site-planner/build-worker.cjs
node site-planner/check-auth.mjs
node site-planner/check-accounts.mjs
node site-planner/check-school.mjs
node site-planner/check-chart.mjs
node site-planner/check-report.mjs
node site-planner/check-migration.mjs
node site-planner/preview-worker.mjs
```

A prévia usa banco em memória em http://127.0.0.1:4174 e contas fictícias definidas nos testes. Não altera a hospedagem.

## Servidor e migração

Use o binding D1 DB e aplique todas as migrações da pasta drizzle em ordem. Configure ADMIN_USERNAME, ADMIN_PASSWORD e AUTH_SECRET no ambiente; senha e chave de sessão são segredos. A identidade em .openai/hosting.json pertence ao projeto original; substitua-a antes de hospedar uma cópia própria.

A migração 0002 adiciona somente o esquema. Após publicá-la, o ADM pode executar POST /api/admin/migrate-legacy com sessão autenticada para preservar e associar os cadastros antigos a uma escola e turma existentes. A operação é idempotente e mantém senhas, notas, registros e vínculos familiares. O ADM cria em seguida o acesso do gestor para cada escola migrada. Migrações e exemplos não criam credenciais de produção automaticamente.

As senhas usam PBKDF2 com salt individual; sessões usam cookies assinados HttpOnly/Secure/SameSite. A escola precisa estar autorizada para suas contas entrarem. Os testes verificam isolamento entre escolas e turmas, permissões de criação/edição, privacidade de mensagens, capacidade contratada, preços, suspensão, boletim e preservação na migração.

## Solicitação de contratação

Em Acesso da escola, a opção Ainda não tem plano abre os planos e o formulário de solicitação. POST /api/institution-request cria uma escola pendente e um gestor com senha protegida. O gestor pode entrar somente para acompanhar ou ajustar o pedido; turmas e contas ficam bloqueadas até autorização do ADM. Escolas suspensas também ficam restritas a essa tela, enquanto professores, alunos e responsáveis permanecem sem acesso ao portal. A solicitação é uma demonstração sem pagamento. Execute `node site-planner/check-contract.mjs` para testar o fluxo, preços, bloqueio, duplicidades e limite de solicitações.
