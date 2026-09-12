# HALLOWEEN — 24.10.2026

Site local do Halloween Party Open Bar em Abaeté. O site não processa pagamentos: o convidado cria uma conta, compra diretamente pelo WhatsApp da organização e acompanha a ativação manual do ingresso e do QR Code.

## Fluxo do convidado

1. O convidado clica em **Comprar ingresso**.
2. Se já estiver logado, vai diretamente para **Meu ingresso**.
3. Sem sessão, escolhe entre **Entrar** e **Criar conta**.
4. O cadastro solicita nome completo, WhatsApp, e-mail e senha. Não solicita data de nascimento.
5. O ingresso começa como **Ainda não ativado** e exibe um botão grande para comprar pelo WhatsApp.
6. Depois da ativação manual no painel, o QR aparece como **Convite funcionando**.
7. Depois da baixa, o estado muda para **Convite já utilizado**.

## Painel administrativo

Abra `http://127.0.0.1:5173/admin`.

Credenciais locais atuais:

```text
E-mail: eduardosoares.email@gmail.com
Senha: bXEz9Pa
```

Na aba **Ingressos**, é possível pesquisar por nome ou e-mail e:

- ativar um ingresso pendente;
- dar baixa em um ingresso ativo;
- reativar um ingresso utilizado;
- devolver um ingresso para o estado pendente.

Na aba **Ler QR Code**, o administrador abre a câmera ou escolhe uma imagem. Depois da leitura, o painel abre o mesmo cadastro encontrado pela pesquisa, com as mesmas ações disponíveis.

## API de QR Code

O projeto usa a API do goQR / QR Server:

- [documentação de criação](https://goqr.me/api/doc/create-qr-code/): `https://api.qrserver.com/v1/create-qr-code/`;
- [documentação de leitura](https://goqr.me/api/doc/read-qr-code/): `https://api.qrserver.com/v1/read-qr-code/`.

O QR contém somente o código opaco do convite, sem nome, e-mail ou WhatsApp. A leitura envia a foto do QR ao serviço goQR. A API aceita PNG, GIF ou JPEG com menos de 1 MiB; o site reduz fotos maiores antes do envio.

## Rodar localmente

Requisitos: Node.js 20+ e npm.

```bash
npm install
npm run dev
```

Abra `http://127.0.0.1:5173/`.

## Armazenamento local

Esta versão funciona somente no navegador local, sem servidor:

- contas e ingressos ficam no `localStorage`;
- sessões ficam no `sessionStorage`;
- senhas de convidados são derivadas com PBKDF2 e salt aleatório;
- a credencial administrativa fica no código apenas como hash derivado;
- limpar os dados do navegador apaga contas e ingressos.

Esse modo serve para prototipação e demonstração. Antes de hospedar publicamente, autenticação, dados pessoais, ativação e baixa devem migrar para um backend seguro com autorização server-side, auditoria e controle de concorrência.

## Estrutura principal

- `src/features/account`: entrada única, cadastro, login e ingresso do convidado.
- `src/features/admin`: pesquisa, ativação, baixa e leitura do QR.
- `src/lib/localInvitations.ts`: armazenamento e estados do ingresso.
- `src/lib/goQr.ts`: integração de criação e leitura com o goQR.
- `src/pages/HomePage.tsx`: página pública e botões de compra.

## Testes

```bash
npm run lint
npm test
npm run build
npx playwright test --workers=2
```
