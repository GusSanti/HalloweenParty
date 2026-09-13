import { describe, expect, it, vi } from 'vitest'
vi.mock('../lib/supabase', () => ({ supabase: null }))
import { AuthenticationError, authMessage, client, invitationMessage, signupSchema } from './invitations'
describe('cadastro Supabase', () => {
  const valid = { fullName: 'Maria Teste', email: ' Maria@Example.com ', phone: '(37) 99999-9999', password: 'senha-longa-123' }
  it('normaliza e-mail e telefone', () => {
    expect(signupSchema.parse(valid)).toMatchObject({ email: 'maria@example.com', phone: '37999999999' })
  })
  it('rejeita dados inválidos e senhas curtas', () => {
    for (const change of [{ fullName: ' ' }, { email: 'x' }, { phone: '123' }, { password: '12345' }])
      expect(signupSchema.safeParse({ ...valid, ...change }).success).toBe(false)
  })
  it('não oferece armazenamento local quando não há conexão configurada', () => {
    localStorage.setItem('role', 'admin')
    expect(() => client()).toThrow('Configure')
  })
  it('mantém um código verificável nos erros de autenticação', () => {
    const error = new AuthenticationError('Confirme o e-mail.', 'email_not_confirmed')
    expect(error).toMatchObject({ name: 'AuthenticationError', code: 'email_not_confirmed' })
  })
  it('explica quando o provedor de e-mail está desativado', () => {
    expect(authMessage({ code: 'email_provider_disabled', status: 400 }, 'signup'))
      .toContain('Ative o provedor Email')
  })
  it('distingue o limite geral de tentativas do limite de envio de e-mails', () => {
    expect(authMessage({ code: 'over_request_rate_limit', status: 429 }, 'signup'))
      .toContain('Muitas tentativas')
    expect(authMessage({ code: 'over_email_send_rate_limit', status: 429 }, 'signup'))
      .toContain('Muitos e-mails')
  })
  it('explica quando a função de criação do convite não foi instalada', () => {
    expect(invitationMessage({ code: 'PGRST202' })).toContain('migration mais recente')
  })
  it('explica dados incompletos e ausência de evento ativo', () => {
    expect(invitationMessage({ message: 'invalid_attendee_metadata' })).toContain('cadastro está incompleto')
    expect(invitationMessage({ message: 'active_event_not_found' })).toContain('evento ativo')
  })
})
