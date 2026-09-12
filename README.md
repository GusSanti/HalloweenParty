# Halloween Party — integração Supabase

O cadastro/login usa Supabase Auth. Convites, permissões de equipe e auditoria
usam PostgreSQL com RLS. Não há conta administrativa fixa no código.
O arquivo src/lib/localInvitations.ts mantém nomes antigos por compatibilidade,
mas todas as operações são remotas; não lê contas nem permissões do localStorage.

## Aplicação ao banco existente

Se já executou SUPABASE_SETUP.sql, execute somente
supabase/migrations/202609120002_secure_integration.sql no SQL Editor.
Esse script atualiza funções e permissões sem apagar cadastros ou convites.
Para banco novo: execute SUPABASE_SETUP.sql e depois essa migração.
Não execute novamente o setup antigo depois da migração, pois ele sobrescreve
as funções protegidas pela versão antiga.

Em Authentication, configure confirmação de e-mail, senha mínima de 12 caracteres,
Site URL e Redirect URLs (incluindo /meu-ingresso no domínio local e publicado).
O arquivo supabase/config.toml configura somente o ambiente da CLI local;
não altera automaticamente o projeto hospedado.
Para envio de e-mails a convidados em produção, configure SMTP no Supabase.
Os limites de requisições de Auth são definidos no painel do Supabase.
CAPTCHA e MFA não foram habilitados automaticamente; exigem configuração própria.
Referência: https://supabase.com/docs/guides/auth/password-security

Use .env.local com VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.
Nunca coloque service_role ou senha do PostgreSQL no frontend.

Crie a conta da equipe em Authentication > Users e execute, com o e-mail correto:

```sql
insert into public.staff_profiles(user_id,role,active,display_name)
select id,'admin',true,'Administrador' from auth.users
where lower(email)=lower('seu-email@exemplo.com')
on conflict(user_id) do update set role='admin',active=true;
```

Use role='gate' para funcionários que só podem dar baixa. Contas criadas no
painel sem nome/telefone funcionam como equipe, mas não recebem convite.
Convidados devem se cadastrar pelo site, confirmar o e-mail e acessar Meu ingresso.
Cadastros antigos válidos no Auth recebem convite ao acessar a conta.
Contas do protótipo no localStorage não foram importadas; precisam de novo cadastro.

## Fluxo e segurança

- Auth valida senha/sessão; PostgreSQL verifica os campos do cadastro e o usuário autenticado.
- ensure_my_invitation cria um único convite pendente por usuário/evento ativo.
- Os novos códigos têm 122 bits aleatórios; os códigos antigos continuam válidos.
- QR é gerado e lido localmente com qrcode/jsqr. Nenhuma foto/código é enviado ao goQR.
- Ler QR abre o cadastro; Dar baixa executa a alteração atômica no PostgreSQL.
- Admin ativa, reativa ou deixa pendente. Portaria só usa convites ativos.
- RLS limita convidados aos próprios dados; navegador não pode escrever diretamente
  em convites, perfis da equipe ou auditoria, nem executar TRUNCATE.
- As funções conferem o evento ativo e registram mudanças em audit_logs.
- Conta atualiza a cada 10 segundos; painel, a cada 15 segundos e após uma alteração.
  Sem conexão não é possível liberar entrada.
- Um QR é um comprovante transferível por foto: a equipe deve conferir o nome do titular.

Posts e galeria já consultam o Supabase. O conteúdo fixo da página inicial permanece
em src/config/event.ts. Pagamentos continuam externos pelo WhatsApp.
O assistente visível é o botão do WhatsApp; Edge Functions de IA e upload são
opcionais e não foram implantadas no projeto remoto por esta alteração.

## Como testar

1. Aplique a migração, configure Auth e execute npm run dev.
2. Em um navegador, cadastre um convidado com e-mail acessível, confirme o e-mail
   e entre. Confira perfil e convite pending no Table Editor. Ainda não deve aparecer QR.
3. Em outro navegador/perfil (sessões separadas), entre como admin em /admin/login.
   Ative o convite. Em até 10 segundos o convidado deve ver o QR.
4. Leia uma imagem do QR no painel, confira o nome e dê baixa. O banco deve registrar
   used e audit_logs. Tente usar novamente: a segunda baixa deve ser recusada.
5. Cadastre outro convidado. Ele não deve conseguir listar o primeiro nem entrar no painel.
6. Teste login com senha errada, cadastro com telefone curto e confirmação divergente.
7. Entre como gate: não deve aparecer ativação; tentativas diretas também são recusadas.
8. Desative staff_profiles.active: as próximas operações devem falhar.
9. Bloqueie a rede: nenhuma operação deve ser confirmada apenas na interface.

Verificação automática:

```bash
npm test
npm run lint
npm run build
npx playwright test --workers=2
```

Os testes de banco usam PostgreSQL embarcado (PGlite) com estruturas simuladas de
Auth/Storage. Executam o SQL de verdade e verificam RLS, permissões, criação
idempotente, transições, auditoria e bloqueio de segunda baixa.
Não validam envio de e-mails nem a configuração do seu Supabase hospedado.
Testes de navegador não criam contas reais; validam bloqueios da interface.
O teste simultâneo entre duas portarias deve ser feito também no banco de homologação.
