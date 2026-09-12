import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listLocalAccounts, updateInvitationStatus, type LocalAccount } from '../../lib/localInvitations'

export default function AdminInvitationsPage() {
  const [searchParams] = useSearchParams()
  const [accounts, setAccounts] = useState<LocalAccount[]>(() => listLocalAccounts())
  const [query, setQuery] = useState(() => searchParams.get('busca') ?? '')
  useEffect(() => {
    const refresh = () => setAccounts(listLocalAccounts())
    window.addEventListener('h26:accounts-changed', refresh)
    return () => window.removeEventListener('h26:accounts-changed', refresh)
  }, [])
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    return value ? accounts.filter((account) => `${account.fullName} ${account.email} ${account.invitationCode}`.toLowerCase().includes(value)) : accounts
  }, [accounts, query])
  function change(account: LocalAccount, status: LocalAccount['invitationStatus']) {
    const action = status === 'active' ? 'ativar' : status === 'used' ? 'marcar como utilizado' : 'voltar para pendente'
    if (!window.confirm(`Deseja ${action} o convite de ${account.fullName}?`)) return
    updateInvitationStatus(account.id, status)
  }

  return <section className="admin-content invitations-admin">
    <div className="admin-title"><div><span className="eyebrow">Aprovação manual</span><h1>CONVITES</h1></div><span className="local-mode-badge">Dados locais</span></div>
    <label className="admin-search-label">Pesquisar ingresso por nome ou e-mail<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite o nome ou e-mail da pessoa" /></label>
    {filtered.length === 0 ? <div className="admin-empty"><strong>NENHUM CADASTRO</strong><p>As contas criadas pelos convidados aparecerão aqui.</p></div> : <div className="invitation-admin-list">{filtered.map((account) => <article key={account.id}>
      <header><div><span className={`invite-status ${account.invitationStatus}`}>{account.invitationStatus === 'active' ? 'Ativo' : account.invitationStatus === 'used' ? 'Utilizado' : 'Pendente'}</span><h2>{account.fullName}</h2></div><strong>{account.invitationCode}</strong></header>
      <dl><div><dt>E-mail</dt><dd>{account.email}</dd></div><div><dt>WhatsApp</dt><dd>{account.phone}</dd></div><div><dt>Cadastro</dt><dd>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(account.createdAt))}</dd></div></dl>
      <div className="invite-actions">{account.invitationStatus !== 'active' && <button className="activate" type="button" onClick={() => change(account, 'active')}>Ativar ingresso</button>}{account.invitationStatus === 'active' && <button type="button" onClick={() => change(account, 'used')}>Dar baixa no ingresso</button>}{account.invitationStatus !== 'pending' && <button className="secondary" type="button" onClick={() => change(account, 'pending')}>Deixar pendente</button>}</div>
    </article>)}</div>}
  </section>
}
