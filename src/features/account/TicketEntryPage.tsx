import AccountAccessPage from './AccountAccessPage'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { client } from '../../lib/localInvitations'
export default function TicketEntryPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  useEffect(() => {
    let active = true
    try {
      void client().auth.getUser().then(({ data }) => { if (active) setSignedIn(Boolean(data.user)) })
        .catch(() => { if (active) setSignedIn(false) })
    } catch { queueMicrotask(() => { if (active) setSignedIn(false) }) }
    return () => { active = false }
  }, [])
  if (signedIn === null) return <main className="route-loading">Verificando acesso...</main>
  return signedIn ? <Navigate to="/meu-ingresso" replace /> : <AccountAccessPage />
}
