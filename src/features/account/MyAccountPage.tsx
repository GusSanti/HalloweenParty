import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { eventConfig } from '../../config/event'
import { createQrImageUrl } from '../../lib/goQr'
import { getCurrentLocalAccount, logoutLocalAccount, type LocalAccount } from '../../lib/localInvitations'

const statusCopy = {
  pending: { label: 'AINDA NÃO ATIVADO', title: 'AGUARDANDO LIBERAÇÃO', body: 'Seu cadastro foi recebido. Combine o pagamento diretamente com a organização. Assim que ele for confirmado manualmente, seu convite ficará ativo.', tone: 'pending' },
  active: { label: 'CONVITE FUNCIONANDO', title: 'SEU ACESSO ESTÁ LIBERADO', body: 'Apresente este QR Code na entrada. Ele é pessoal e funciona uma única vez.', tone: 'active' },
  used: { label: 'CONVITE JÁ UTILIZADO', title: 'ENTRADA REGISTRADA', body: 'Este convite já passou pela portaria e não pode ser usado novamente.', tone: 'used' },
} as const

export default function MyAccountPage() {
  const navigate = useNavigate()
  const [account, setAccount] = useState<LocalAccount | null>(() => getCurrentLocalAccount())

  useEffect(() => {
    if (!account) { navigate('/entrar', { replace: true }); return }
    const refresh = () => setAccount(getCurrentLocalAccount())
    window.addEventListener('h26:accounts-changed', refresh)
    return () => window.removeEventListener('h26:accounts-changed', refresh)
  }, [account, navigate])

  if (!account) return <main className="route-loading">Abrindo sua conta...</main>
  const status = statusCopy[account.invitationStatus]
  const qr = createQrImageUrl(`H26:${account.invitationCode}`)
  const isPending = account.invitationStatus === 'pending'
  const whatsappMessage = isPending
    ? `Olá! Quero comprar e ativar o convite ${account.invitationCode}. Meu nome é ${account.fullName}.`
    : `Olá! Tenho uma dúvida sobre o convite ${account.invitationCode}. Meu nome é ${account.fullName}.`
  function logout() { logoutLocalAccount(); navigate('/') }

  return <main className={`account-portal status-${status.tone}`}>
    <header className="account-portal-head"><Link to="/">H<span>26</span></Link><div><span>{account.fullName}</span><button type="button" onClick={logout}>Sair</button></div></header>
    <section className="invitation-status" aria-labelledby="status-title">
      <div className="status-copy"><p><i aria-hidden="true" />{status.label}</p><h1 id="status-title">{status.title}</h1><div className="status-explanation">{status.body}</div><div className="ticket-whatsapp"><span>{isPending ? 'Ainda não comprou? Combine diretamente com a organização.' : 'Ficou com alguma dúvida sobre seu ingresso? Clique abaixo e fale com a organização.'}</span><a className="whatsapp-buy" href={`${eventConfig.whatsappUrl}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer"><span>{isPending ? 'Comprar pelo WhatsApp' : 'Tirar dúvida pelo WhatsApp'}</span><b aria-hidden="true">↗</b></a></div><dl><div><dt>Data</dt><dd>24.10.2026 · {eventConfig.time}</dd></div><div><dt>Local</dt><dd>{eventConfig.location} · {eventConfig.city}</dd></div><div><dt>Formato</dt><dd>Open bar</dd></div></dl></div>
      <article className="invitation-card">
        <div className="invitation-card-top"><span>CONVITE PESSOAL</span><strong>{account.invitationStatus === 'active' ? 'ATIVO' : account.invitationStatus === 'used' ? 'UTILIZADO' : 'PENDENTE'}</strong></div>
        <div className="invitation-qr">{qr && <img src={qr} alt={`QR Code do convite ${account.invitationCode}`} />}{account.invitationStatus === 'pending' && <span>AGUARDANDO<br />ATIVAÇÃO</span>}</div>
        <div className="invitation-code"><span>{account.invitationCode}</span><small>{account.fullName}</small></div>
      </article>
    </section>
    <section className="account-details"><div><p className="eyebrow">Seus dados</p><h2>CADASTRO</h2></div><dl><div><dt>Nome</dt><dd>{account.fullName}</dd></div><div><dt>E-mail</dt><dd>{account.email}</dd></div><div><dt>WhatsApp</dt><dd>{account.phone}</dd></div></dl></section>
  </main>
}
