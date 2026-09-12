import { beforeEach, describe, expect, it } from 'vitest'
import { createLocalAccount, getCurrentLocalAccount, updateInvitationStatus } from './localInvitations'

describe('convites locais', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

  it('cria uma conta com convite pendente', async () => {
    const account = await createLocalAccount({ fullName: 'Maria Teste', email: 'maria@example.com', phone: '37999999999', password: 'senha-segura-123' })
    expect(account.invitationStatus).toBe('pending')
    expect(account.invitationCode).toMatch(/^H26-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(getCurrentLocalAccount()?.email).toBe('maria@example.com')
  })

  it('controla a ativação e a baixa manual do ingresso', async () => {
    const account = await createLocalAccount({ fullName: 'Maria Teste', email: 'maria@example.com', phone: '37999999999', password: 'senha-segura-123' })
    updateInvitationStatus(account.id, 'active')
    expect(getCurrentLocalAccount()?.invitationStatus).toBe('active')
    updateInvitationStatus(account.id, 'used')
    expect(getCurrentLocalAccount()?.invitationStatus).toBe('used')
  })
})
