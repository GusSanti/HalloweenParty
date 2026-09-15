import AccountAccessPage from './AccountAccessPage'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth'
export default function TicketEntryPage() {
  const { user, staffRole, loading, error } = useAuth()
  if (loading) return <main className="route-loading">Verificando acesso...</main>
  if (error) return <main className="route-loading" role="alert">{error}</main>
  if (staffRole) return <Navigate to="/admin" replace />
  return user ? <Navigate to="/meu-ingresso" replace /> : <AccountAccessPage />
}
