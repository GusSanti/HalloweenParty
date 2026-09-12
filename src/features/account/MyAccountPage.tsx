import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { eventConfig } from '../../config/event'
import { InvitationQr } from '../../components/InvitationQr'
import { getCurrentLocalAccount, logoutLocalAccount, type LocalAccount } from '../../lib/localInvitations'

const statusCopy = {
  pending: { label: 'INGRESSO PENDENTE', title: 'FALTA 1 PASSO', body: 'Sua conta já está pronta. Compre pelo WhatsApp e aguarde a organização ativar seu ingresso.', tone: 'pending' },
  active: { label: 'CONVITE FUNCIONANDO', title: 'INGRESSO ATIVO', body: 'Apresente este QR Code na entrada. Ele é pessoal e funciona uma única vez.', tone: 'active' },
  used: { label: 'CONVITE JÁ UTILIZADO', title: 'INGRESSO JÁ UTILIZADO', body: 'Este convite já passou pela portaria e não pode ser usado novamente.', tone: 'used' },
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
      <div className="status-copy"><p><i aria-hidden="true" />{status.label}</p><h1 id="status-title">{status.title}</h1><div className="status-explanation">{status.body}</div>{isPending && <ol className="ticket-steps"><li className="done"><span>1</span><div><strong>Conta criada</strong><small>Seu cadastro está concluído.</small></div><b aria-label="Concluído">✓</b></li><li className="current"><span>2</span><div><strong>Compre pelo WhatsApp</strong><small>Combine o pagamento com a organização.</small></div></li><li><span>3</span><div><strong>Aguarde a ativação</strong><small>Depois da confirmação, seu QR Code será liberado.</small></div></li></ol>}<div className="ticket-whatsapp"><span>{isPending ? 'Clique abaixo para comprar seu ingresso.' : 'Precisa de ajuda? Fale com a organização.'}</span><a className="whatsapp-buy" href={`${eventConfig.whatsappUrl}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer"><span>{isPending ? 'Comprar pelo WhatsApp' : 'Falar pelo WhatsApp'}</span><b aria-hidden="true">↗</b></a></div><dl><div><dt>Data</dt><dd>24.10.2026 · {eventConfig.time}</dd></div><div><dt>Local</dt><dd>{eventConfig.location} · {eventConfig.city}</dd></div><div><dt>Formato</dt><dd>Open bar</dd></div></dl></div>
      <article className="invitation-card">
        <div className="invitation-card-top"><span>CONVITE PESSOAL</span><strong>{account.invitationStatus === 'active' ? 'ATIVO' : account.invitationStatus === 'used' ? 'UTILIZADO' : 'PENDENTE'}</strong></div>
        <div className="invitation-qr">{account.invitationStatus === 'active' && <InvitationQr key={account.invitationCode} code={account.invitationCode} />}{account.invitationStatus === 'pending' && <span>AGUARDANDO<br />ATIVAÇÃO</span>}</div>
        <div className="invitation-code"><span>{account.invitationCode}</span><small>{account.fullName}</small></div>
      </article>
    </section>
    <section className="account-details"><div><p className="eyebrow">Seus dados</p><h2>CADASTRO</h2></div><dl><div><dt>Nome</dt><dd>{account.fullName}</dd></div><div><dt>E-mail</dt><dd>{account.email}</dd></div><div><dt>WhatsApp</dt><dd>{account.phone}</dd></div></dl></section>
  </main>
}
