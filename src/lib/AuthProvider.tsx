import { useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { AuthContext } from './useAuth'
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ user: null as User | null, loading: true, error: '' })
  useEffect(() => {
    let active = true
    let revision = 0
    const connection = supabase
    const refresh = async () => {
      const request = ++revision
      try {
        if (!connection) throw new Error('Conexão indisponível. Confira o .env.local.')
        const { data, error } = await connection.auth.getUser()
        if (error && error.name !== 'AuthSessionMissingError') throw error
        if (active && request === revision) setState({ user: data.user, loading: false, error: '' })
      } catch {
        if (active && request === revision) setState({ user: null, loading: false, error: 'Não foi possível verificar sua sessão. Tente novamente.' })
      }
    }
    void refresh()
    const subscription = connection?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        revision++
        if (active) setState({ user: null, loading: false, error: '' })
      } else {
        // Leave the Auth callback before calling another Auth method.
        queueMicrotask(() => { if (active) void refresh() })
      }
    })
    window.addEventListener('focus', refresh)
    return () => { active = false; revision++; subscription?.data.subscription.unsubscribe(); window.removeEventListener('focus', refresh) }
  }, [])
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
