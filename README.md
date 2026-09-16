# Halloween Party — integração Supabase

O cadastro/login usa Supabase Auth. Convites, permissões de equipe e auditoria
usam PostgreSQL com RLS. Não há conta administrativa fixa no código.
A camada src/services/invitations.ts consulta exclusivamente o cliente único de
src/lib/supabase.ts. Sessões compartilhadas pelas telas usam AuthProvider/useAuth.

## Aplicação ao banco existente

Em desenvolvimento local, `.env.local` é a fonte da URL/chave da aplicação.
Em builds hospedados, configure `VITE_SUPABASE_URL` e
`VITE_SUPABASE_PUBLISHABLE_KEY` no painel da plataforma. O arquivo local tem
precedência quando existe e nunca deve ser enviado ao Git. Após alterá-lo,
reinicie o servidor. Node.js 20.19+ ou 22.12+ é necessário.

A pasta supabase NÃO é um banco nem estabelece conexões. Ela contém:

- SUPABASE_SETUP.sql: definição consolidada das tabelas, funções e RLS atuais;
- migrations/202609120002_secure_integration.sql: atualização para quem aplicou
  o setup anterior à integração segura.

Se a migração já foi aplicada no seu projeto, esta limpeza não exige recriar
tabelas. Para um projeto novo, o setup consolidado já inclui as proteções.
Nenhum dos scripts contém URL, chave ou senha de outro projeto.
Os scripts são executados manualmente no SQL Editor do projeto correto.

Foram removidos o modelo de ambiente das funções não utilizadas, o cliente
server-side não utilizado, o esquema/seed de pagamentos e os testes antigos
com credenciais fixas. A aplicação mantém as tabelas da integração atual.

1. Antes do login, os botões do site mostram **Comprar ingresso**.
2. Ao clicar, a pessoa responde **Você já tem uma conta?** e escolhe entre **Sim, entrar** e **Não, criar conta**.
3. Depois do login, todos os botões de compra passam a mostrar **Meu ingresso** e abrem diretamente o convite.
4. O cadastro solicita nome completo, WhatsApp, e-mail e senha. Não solicita data de nascimento.
5. O ingresso começa como **Pendente** e mostra três passos: conta criada, compra pelo WhatsApp e espera pela ativação.
6. Depois da ativação manual no painel, o QR aparece como **Ingresso ativo** e o botão do WhatsApp permanece disponível para ajuda.
7. Depois da baixa, o estado muda para **Convite já utilizado**.

Em Authentication > Providers > Email, desative **Confirm email** e configure a
senha mínima em 6 caracteres. Assim o cadastro já cria uma sessão e abre o ingresso.
Configure também Site URL e Redirect URLs do domínio local e publicado.
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

Em um projeto hospedado já existente, aplique as migrations em ordem no SQL
Editor. Se o cadastro autenticar mas a tela informar que não conseguiu preparar
o convite, execute `supabase/migrations/202609130003_restore_invitation_rpc.sql`.
Para reparar a conta administrativa deste projeto e remover os demais acessos
de equipe, execute depois `supabase/ADMIN_ACCESS_REPAIR.sql`. O segundo script
não armazena nem altera a senha.

Convidados se cadastram pelo site e acessam Meu ingresso imediatamente.
Cadastros antigos válidos no Auth recebem convite ao acessar a conta.
Contas do protótipo no localStorage não foram importadas; precisam de novo cadastro.

## Fluxo e segurança

- Auth cria a conta e a sessão sem envio de confirmação por e-mail.
- PostgreSQL valida os campos depois da autenticação, antes de criar perfil ou convite.
- ensure_my_invitation cria um único convite pendente por usuário/evento ativo.
- Os novos códigos têm 122 bits aleatórios; os códigos antigos continuam válidos.
- QR é gerado pela API goQR, com `qrcode` local como contingência. A leitura usa câmera ao vivo ou foto, tenta os leitores do aparelho e recorre à goQR com uma imagem reduzida; todo resultado é validado no formato do evento.
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
O atendimento é feito pelo botão do WhatsApp. As funções de IA e upload que
não eram utilizadas pela interface foram removidas do repositório.

## Como testar

1. Aplique a migração, configure Auth e execute npm run dev.
2. Em um navegador, cadastre um convidado e confira o acesso imediato. Confira perfil
   e convite pending no Table Editor. Ainda não deve aparecer QR.
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
npm run check:supabase
```

Os testes de banco usam PostgreSQL embarcado (PGlite) com estruturas simuladas de
Auth/Storage. Executam o SQL de verdade e verificam RLS, permissões, criação
idempotente, transições, auditoria e bloqueio de segunda baixa.
Não validam envio de e-mails nem a configuração do seu Supabase hospedado.
Testes de navegador não criam contas reais; validam bloqueios da interface.
O teste simultâneo entre duas portarias deve ser feito também no banco de homologação.

## Checagem do projeto conectado

npm run check:supabase lê .env.local e faz apenas consultas de leitura ao Auth
e às tabelas esperadas, sem imprimir chaves ou dados pessoais. Verifica também
que o acesso anônimo às tabelas privadas é recusado. Não cria usuários, não
altera permissões e não aplica SQL. Essa checagem não substitui testes com duas
contas autenticadas, pois a chave pública não pode inspecionar todas as regras
internas do banco.
