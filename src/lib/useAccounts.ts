import { useEffect, useState } from 'react'
import { listInvitations, type AttendeeInvitation } from '../services/invitations'
export function useAccounts() {
  const [accounts, setAccounts] = useState<AttendeeInvitation[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let disposed = false
    let running = false
    const refresh = async () => {
      if (running) return
      running = true
      try { const data = await listInvitations(); if (!disposed) { setAccounts(data); setError('') } }
      catch (e) { if (!disposed) { setAccounts([]); setError(e instanceof Error ? e.message : 'Falha ao carregar.') } }
      finally { running = false; if (!disposed) setLoading(false) }
    }
    void refresh()
    const timer = window.setInterval(refresh, 15000)
    window.addEventListener('h26:accounts-changed', refresh)
    return () => { disposed = true; clearInterval(timer); window.removeEventListener('h26:accounts-changed', refresh) }
  }, [])
  return { accounts, error, loading }
}
