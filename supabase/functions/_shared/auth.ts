import { adminClient } from './supabase.ts'

function readAal(token: string) {
  try { const payload = JSON.parse(atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))); return payload.aal === 'aal2' ? 'aal2' : 'aal1' }
  catch { return 'aal1' }
}

export async function requireStaff(request: Request, allowed: Array<'admin' | 'gate'> = ['admin', 'gate']) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw Object.assign(new Error('unauthorized'), { status: 401 })
  const supabase = adminClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw Object.assign(new Error('unauthorized'), { status: 401 })
  const { data: profile } = await supabase.from('staff_profiles').select('role,active,display_name').eq('user_id', user.id).maybeSingle()
  if (!profile?.active || !allowed.includes(profile.role)) throw Object.assign(new Error('forbidden'), { status: 403 })
  const aal = readAal(token)
  if (aal !== 'aal2') throw Object.assign(new Error('mfa_required'), { status: 403 })
  return { user, profile, aal, supabase }
}
