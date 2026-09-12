import { useAccounts } from '../../lib/useAccounts'
import { Link } from 'react-router-dom'


export default function AdminDashboard() {
  const { accounts, error, loading } = useAccounts()
  if (error || loading) return <p role="status">{error || 'Carregando...'}</p>
  const values = [
    { value: accounts.length, label: 'Contas criadas' },
    { value: accounts.filter((account) => account.invitationStatus === 'pending').length, label: 'Aguardando ativação' },
    { value: accounts.filter((account) => account.invitationStatus === 'active').length, label: 'Convites ativos' },
    { value: accounts.filter((account) => account.invitationStatus === 'used').length, label: 'Entradas realizadas' },
  ]
  return <section className="admin-content"><div className="admin-title"><div><span className="eyebrow">Operação</span><h1>VISÃO GERAL</h1></div><Link className="admin-primary" to="/admin/convites">Gerenciar convites ↗</Link></div><div className="stats-grid">{values.map(({ value, label }) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div><section className="admin-callout"><span>OPEN BAR</span><div><h2>CADASTRO FEITO.<br />ATIVAÇÃO MANUAL.</h2><p>Depois de confirmar o pagamento recebido por fora, abra a lista de convites e ative o acesso da pessoa. O QR Code muda de estado após a atualização dos dados.</p></div></section></section>
}
