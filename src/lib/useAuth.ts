import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
export const AuthContext = createContext<{ user: User | null; loading: boolean; error: string }>({
  user: null, loading: true, error: '',
})
export function useAuth() { return useContext(AuthContext) }
