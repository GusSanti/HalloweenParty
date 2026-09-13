// Supabase Auth and PostgreSQL are the only source of identity and invitations.
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import type { AuthError } from '@supabase/supabase-js'
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

export class AuthenticationError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AuthenticationError'
    this.code = code
  }
}

export function authMessage(error: Pick<AuthError, 'code' | 'status'>, operation: 'signup' | 'signin') {
  const code = error.code
  if (code === 'email_not_confirmed') return 'Esta conta antiga ainda está pendente de liberação no Supabase. Fale com a organização.'
  if (code === 'invalid_credentials') return 'E-mail ou senha incorretos.'
  if (code === 'user_already_exists' || code === 'email_exists') return 'Este e-mail já possui uma conta. Entre com a senha ou recupere o acesso.'
  if (code === 'weak_password') return 'A senha não atende aos requisitos de segurança do cadastro.'
  if (code === 'email_address_invalid') return 'Informe um endereço de e-mail válido.'
  if (code === 'email_address_not_authorized') return 'O servidor de e-mail ainda não está autorizado a enviar para este endereço.'
  if (code === 'email_provider_disabled') return 'O cadastro com e-mail e senha está desativado no Supabase. Ative o provedor Email em Authentication → Sign In / Providers.'
  if (code === 'over_email_send_rate_limit') return 'Muitos e-mails foram solicitados. Aguarde alguns minutos antes de tentar novamente.'
  if (code === 'over_request_rate_limit') return 'Muitas tentativas foram feitas deste dispositivo. Aguarde alguns minutos antes de tentar novamente.'
  if (code === 'captcha_failed') return 'A verificação de segurança falhou. Recarregue a página e tente novamente.'
  if (code === 'signup_disabled') return 'Novos cadastros estão temporariamente desativados.'
  if (operation === 'signup' && (code === 'unexpected_failure' || error.status === 500))
    return 'O banco de dados recusou o cadastro. A organização precisa verificar os gatilhos do Supabase.'
  if (operation === 'signin') return 'Não foi possível entrar agora. Tente novamente em alguns instantes.'
  return 'Não foi possível cadastrar agora. Tente novamente em alguns instantes.'
}

export function invitationMessage(error: { code?: string; message?: string }) {
  if (error.code === 'PGRST202')
    return 'A configuração de convites ainda não foi aplicada no Supabase. Execute a migration mais recente no SQL Editor.'
  if (error.message?.includes('active_event_not_found'))
    return 'Nenhum evento ativo foi encontrado. Ative o evento no painel administrativo.'
  if (error.message?.includes('invalid_attendee_metadata') || error.message?.includes('invalid_attendee_profile'))
    return 'Seu cadastro está incompleto. Saia da conta e refaça o cadastro com nome e WhatsApp válidos.'
  if (error.code === '42501')
    return 'O Supabase recusou o acesso à criação do convite. Aplique as permissões da migration mais recente.'
  return 'Não foi possível preparar seu convite. Atualize a página; se continuar, verifique os logs do Supabase.'
}
export const signupSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  phone: z.string().transform(v => v.replace(/\D/g, '')).pipe(z.string().regex(/^[0-9]{10,15}$/)),
  password: z.string().min(6).max(128),
})
export async function signUpAttendee(input: z.input<typeof signupSchema>) {
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) throw new Error('Confira nome, e-mail, WhatsApp e senha de 6 a 128 caracteres.')
  const v = parsed.data
  const { data, error } = await client().auth.signUp({ email: v.email, password: v.password,
    options: { emailRedirectTo: window.location.origin + '/meu-ingresso', data: { full_name: v.fullName, phone: v.phone } } })
  if (error) throw new AuthenticationError(authMessage(error, 'signup'), error.code)
  if (!data.session) throw new AuthenticationError(
    'O cadastro foi criado, mas o Supabase ainda exige confirmação de e-mail. Desative “Confirm email” no painel de autenticação.',
    'email_confirmation_enabled',
  )
}
export async function signIn(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const { error } = await client().auth.signInWithPassword({ email: normalizedEmail, password })
  if (error) throw new AuthenticationError(authMessage(error, 'signin'), error.code)
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
  if (ensureError) throw new Error(invitationMessage(ensureError))
  return (await listInvitations(user.id))[0] ?? null
}
export async function updateInvitationStatus(id: string, status: InvitationStatus) {
  const { error } = await client().rpc('set_invitation_status', { p_invitation_id: id, p_status: status })
  if (error) throw new Error('Alteração recusada. Atualize a lista e confira suas permissões.')
  window.dispatchEvent(new Event('h26:accounts-changed'))
}
