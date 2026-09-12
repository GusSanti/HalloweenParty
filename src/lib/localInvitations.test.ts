import { describe, expect, it, vi } from 'vitest'
vi.mock('./supabase', () => ({ supabase: null }))
import { client, signupSchema } from './localInvitations'
describe('cadastro Supabase', () => {
  const valid = { fullName: 'Maria Teste', email: ' Maria@Example.com ', phone: '(37) 99999-9999', password: 'senha-longa-123' }
  it('normaliza e-mail e telefone', () => {
    expect(signupSchema.parse(valid)).toMatchObject({ email: 'maria@example.com', phone: '37999999999' })
  })
  it('rejeita dados inválidos e senhas curtas', () => {
    for (const change of [{ fullName: ' ' }, { email: 'x' }, { phone: '123' }, { password: '12345678' }])
      expect(signupSchema.safeParse({ ...valid, ...change }).success).toBe(false)
  })
  it('não oferece armazenamento local quando não há conexão configurada', () => {
    localStorage.setItem('h26-local-admin-session-v1', 'active')
    expect(() => client()).toThrow('Configure')
  })
})
