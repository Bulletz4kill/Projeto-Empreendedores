# Projeto Empreendedores — Planner Escolar

Portal escolar com três espaços: professora, pais e alunos. Inclui tela de entrada, demonstração do planner e acesso administrativo validado no servidor.

Site: https://planner-escolar-conexoes-leona.movisssss.chatgpt.site

## Estrutura

- `Planner Escolar (versão independente).html`: artefato original, preservado na raiz (o nome do arquivo pode usar acentuação Unicode decomposta).
- `site-planner/dist/`: interface e cópia adaptada do planner.
- `site-planner/worker/index.mjs`: servidor, login administrativo e sessão por cookie.
- `site-planner/prepare.cjs`: gera a cópia adaptada a partir do HTML original.
- `site-planner/build-worker.cjs`: incorpora os arquivos no Worker de hospedagem.
- `site-planner/check-auth.mjs`: testes da autenticação usando credenciais fictícias.
- `site-planner/login-preview.png`: imagem da tela de entrada.

## Preparar e verificar

Requer Node.js 22 ou superior. Não há dependências para instalar.

```sh
node site-planner/prepare.cjs
node site-planner/build-worker.cjs
node site-planner/check-auth.mjs
```

Para visualizar somente a interface estática:

```sh
node site-planner/preview.cjs
```

Abra http://127.0.0.1:4173. Essa prévia estática não executa as rotas de autenticação; elas são atendidas pelo Worker em hospedagem.

## Autenticação e hospedagem

Configure `ADMIN_USERNAME`, `ADMIN_PASSWORD` e `AUTH_SECRET` no ambiente do servidor. A senha e a chave de sessão devem ser segredos. Nenhum valor real de senha ou chave é incluído neste repositório.

O build gera `site-planner/dist/server/index.js`, um módulo Worker com `fetch(request, env)`. A configuração de Sites está em `site-planner/.openai/hosting.json`. O envio ao GitHub não publica automaticamente o site.

O site atual é privado na plataforma de hospedagem: primeiro há o acesso pelo ChatGPT e depois o acesso administrativo do portal. Os três perfis escolares ainda usam dados de demonstração, com armazenamento no navegador, sem sincronização entre usuários ou dispositivos. O administrador acessa a interface existente da professora; uma área de gestão de contas ainda não foi implementada.

Os testes cobrem senha correta e incorreta, proteção da rota administrativa, cookie alterado, origem de requisição, limite de tentativas e saída. O limite de tentativas reside na memória da instância e não é um bloqueio global distribuído.
