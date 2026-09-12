import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return <main className="content-page legal-page"><p className="eyebrow">Privacidade</p><h1>POLÍTICA DE<br />PRIVACIDADE</h1><p>Coletamos nome, e-mail, WhatsApp e data de nascimento para criar a conta do convidado, identificar o titular e administrar o acesso ao evento.</p><p>Nesta versão local, os cadastros e estados dos convites ficam armazenados somente neste navegador. Nenhum pagamento é processado pelo site.</p><p>Antes de uma futura publicação, a organização deverá conectar um servidor seguro e revisar esta política com o canal do controlador para solicitações relacionadas à LGPD.</p><Link className="text-link" to="/">← Voltar ao início</Link></main>
}
