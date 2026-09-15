import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
export type StaffRole = 'admin' | 'gate'
export const AuthContext = createContext<{ user: User | null; staffRole: StaffRole | null; loading: boolean; error: string }>({
  user: null, staffRole: null, loading: true, error: '',
})
export function useAuth() { return useContext(AuthContext) }
