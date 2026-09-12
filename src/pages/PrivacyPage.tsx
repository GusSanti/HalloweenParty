import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return <main className="content-page legal-page"><p className="eyebrow">Privacidade</p><h1>POLÍTICA DE<br />PRIVACIDADE</h1><p>Coletamos nome, e-mail e WhatsApp para criar a conta do convidado, identificar o titular e administrar o acesso ao evento.</p><p>Os cadastros e estados dos convites são armazenados no Supabase, com acesso limitado ao titular e à equipe autorizada. A sessão de acesso é mantida neste dispositivo. Nenhum pagamento é processado pelo site.</p><p>A leitura e a geração do QR Code acontecem no dispositivo. Para dúvidas sobre seus dados, entre em contato com a organização pelo WhatsApp informado no site.</p><Link className="text-link" to="/">← Voltar ao início</Link></main>
}
