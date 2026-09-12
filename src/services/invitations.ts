// Supabase Auth and PostgreSQL are the only source of identity and invitations.
import { z } from 'zod'
import { supabase } from '../lib/supabase'
export type InvitationStatus = 'pending' | 'active' | 'used'
export interface AttendeeInvitation {
  id: string; fullName: string; email: string; phone: string;
  invitationCode: string; invitationStatus: InvitationStatus;
  createdAt: string; activatedAt: string | null; usedAt: string | null;
}
export function client() {
  if (!supabase) throw new Error('Configure a conexão com o Supabase para continuar.')
  return supabase
}
export const signupSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  phone: z.string().transform(v => v.replace(/\D/g, '')).pipe(z.string().regex(/^[0-9]{10,15}$/)),
  password: z.string().min(12).max(128),
})
export async function signUpAttendee(input: z.input<typeof signupSchema>) {
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) throw new Error('Confira nome, e-mail, WhatsApp e senha de 12 a 128 caracteres.')
  const v = parsed.data
  const { data, error } = await client().auth.signUp({ email: v.email, password: v.password,
    options: { emailRedirectTo: window.location.origin + '/meu-ingresso', data: { full_name: v.fullName, phone: v.phone } } })
  if (error) throw new Error('Não foi possível cadastrar. Confira os dados ou tente novamente mais tarde.')
  return { needsConfirmation: !data.session }
}
export async function signIn(email: string, password: string) {
  const { error } = await client().auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (error) throw new Error('Confira e-mail, senha e confirmação do e-mail.')
}
export async function getStaffSession() {
  const { data: { user }, error } = await client().auth.getUser()
  if (error && error.name !== 'AuthSessionMissingError') throw new Error('Não foi possível validar a sessão. Tente novamente.')
  if (!user) return null
  const { data, error: profileError } = await client().from('staff_profiles').select('role,active').eq('user_id', user.id).maybeSingle()
  if (profileError) throw new Error('Não foi possível verificar as permissões.')
  return data?.active ? { role: data.role as 'admin' | 'gate', active: true, email: user.email ?? '' } : null
}
export async function signInStaff(email: string, password: string) {
  await signIn(email, password)
  if (!await getStaffSession()) { await signOut(); throw new Error('Usuário sem acesso à equipe.') }
}
export async function signOut() {
  const { error } = await client().auth.signOut()
  if (error) throw new Error('Não foi possível sair. Tente novamente.')
}
export const signOutStaff = signOut
export async function listInvitations(owner?: string): Promise<AttendeeInvitation[]> {
  const result: AttendeeInvitation[] = []
  for (let offset = 0; ; offset += 500) {
    let query = client().from('invitations').select('id,code,status,created_at,activated_at,used_at,attendee_profiles!inner(full_name,email,phone),event_settings!inner(active)').eq('event_settings.active', true).order('id').range(offset, offset + 499)
    if (owner) query = query.eq('attendee_user_id', owner)
    const { data, error } = await query
    if (error) throw new Error('Não foi possível carregar os convites. Verifique a conexão.')
    for (const row of data ?? []) {
      const p = (Array.isArray(row.attendee_profiles) ? row.attendee_profiles[0] : row.attendee_profiles) as { full_name: string; email: string; phone: string }
      result.push({ id: row.id, fullName: p.full_name, email: p.email, phone: p.phone, invitationCode: row.code, invitationStatus: row.status, createdAt: row.created_at, activatedAt: row.activated_at, usedAt: row.used_at })
    }
    if (!data || data.length < 500) break
  }
  return result.sort((a,b) => b.createdAt.localeCompare(a.createdAt))
}
export async function getMyInvitation() {
  const { data: { user }, error } = await client().auth.getUser()
  if (error && error.name !== 'AuthSessionMissingError') throw new Error('Não foi possível validar a sessão. Tente novamente.')
  if (!user) return null
  const { error: ensureError } = await client().rpc('ensure_my_invitation')
  if (ensureError) throw new Error('Não foi possível preparar seu convite. Confira o cadastro e o evento ativo.')
  return (await listInvitations(user.id))[0] ?? null
}
export async function updateInvitationStatus(id: string, status: InvitationStatus) {
  const { error } = await client().rpc('set_invitation_status', { p_invitation_id: id, p_status: status })
  if (error) throw new Error('Alteração recusada. Atualize a lista e confira suas permissões.')
  window.dispatchEvent(new Event('h26:accounts-changed'))
}
