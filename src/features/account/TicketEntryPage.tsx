import { Navigate } from 'react-router-dom'
import { getCurrentLocalAccount } from '../../lib/localInvitations'
import AccountAccessPage from './AccountAccessPage'

export default function TicketEntryPage() {
  return getCurrentLocalAccount() ? <Navigate to="/meu-ingresso" replace /> : <AccountAccessPage />
}
