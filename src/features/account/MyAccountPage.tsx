import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { eventConfig } from '../../config/event'
import { InvitationQr } from '../../components/InvitationQr'
import { getCurrentLocalAccount, logoutLocalAccount, type LocalAccount } from '../../lib/localInvitations'

const statusCopy = {
  pending: { label: 'AINDA NÃO ATIVADO', title: 'AGUARDANDO LIBERAÇÃO', body: 'Seu cadastro foi recebido. Combine o pagamento diretamente com a organização. Assim que ele for confirmado manualmente, seu convite ficará ativo.', tone: 'pending' },
  active: { label: 'CONVITE FUNCIONANDO', title: 'SEU ACESSO ESTÁ LIBERADO', body: 'Apresente este QR Code na entrada. Ele é pessoal e funciona uma única vez.', tone: 'active' },
  used: { label: 'CONVITE JÁ UTILIZADO', title: 'ENTRADA REGISTRADA', body: 'Este convite já passou pela portaria e não pode ser usado novamente.', tone: 'used' },
} as const

export default function MyAccountPage() {
  const navigate = useNavigate()
  const [account, setAccount] = useState<LocalAccount | null>(null)

  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    let running = false
    const refresh = async () => {
      if (running) return
      running = true
      try {
        const value = await getCurrentLocalAccount()
        if (!active) return
        setAccount(value); setError('')
        if (!value) navigate('/ingresso', { replace: true })
      } catch (e) { if (active) { setAccount(null); setError(e instanceof Error ? e.message : 'Falha ao carregar.') } }
      finally { running = false }
    }
    void refresh()
    const timer = setInterval(refresh, 10000)
    return () => { active = false; clearInterval(timer) }
  }, [navigate])
  if (error) return <main className="route-loading" role="alert">{error}</main>
  if (!account) return <main className="route-loading">Abrindo sua conta...</main>
  const status = statusCopy[account.invitationStatus]
  const isPending = account.invitationStatus === 'pending'
  const whatsappMessage = isPending
    ? `Olá! Quero comprar e ativar o convite ${account.invitationCode}. Meu nome é ${account.fullName}.`
    : `Olá! Tenho uma dúvida sobre o convite ${account.invitationCode}. Meu nome é ${account.fullName}.`
  async function logout() { try { await logoutLocalAccount(); navigate('/') } catch { setError('Não foi possível sair.') } }

  return <main className={`account-portal status-${status.tone}`}>
    <header className="account-portal-head"><Link to="/">H<span>26</span></Link><div><span>{account.fullName}</span><button type="button" onClick={logout}>Sair</button></div></header>
    <section className="invitation-status" aria-labelledby="status-title">
      <div className="status-copy"><p><i aria-hidden="true" />{status.label}</p><h1 id="status-title">{status.title}</h1><div className="status-explanation">{status.body}</div><div className="ticket-whatsapp"><span>{isPending ? 'Ainda não comprou? Combine diretamente com a organização.' : 'Ficou com alguma dúvida sobre seu ingresso? Clique abaixo e fale com a organização.'}</span><a className="whatsapp-buy" href={`${eventConfig.whatsappUrl}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer"><span>{isPending ? 'Comprar pelo WhatsApp' : 'Tirar dúvida pelo WhatsApp'}</span><b aria-hidden="true">↗</b></a></div><dl><div><dt>Data</dt><dd>24.10.2026 · {eventConfig.time}</dd></div><div><dt>Local</dt><dd>{eventConfig.location} · {eventConfig.city}</dd></div><div><dt>Formato</dt><dd>Open bar</dd></div></dl></div>
      <article className="invitation-card">
        <div className="invitation-card-top"><span>CONVITE PESSOAL</span><strong>{account.invitationStatus === 'active' ? 'ATIVO' : account.invitationStatus === 'used' ? 'UTILIZADO' : 'PENDENTE'}</strong></div>
        <div className="invitation-qr">{account.invitationStatus === 'active' && <InvitationQr key={account.invitationCode} code={account.invitationCode} />}{account.invitationStatus === 'pending' && <span>AGUARDANDO<br />ATIVAÇÃO</span>}</div>
        <div className="invitation-code"><span>{account.invitationCode}</span><small>{account.fullName}</small></div>
      </article>
    </section>
    <section className="account-details"><div><p className="eyebrow">Seus dados</p><h2>CADASTRO</h2></div><dl><div><dt>Nome</dt><dd>{account.fullName}</dd></div><div><dt>E-mail</dt><dd>{account.email}</dd></div><div><dt>WhatsApp</dt><dd>{account.phone}</dd></div></dl></section>
  </main>
}
