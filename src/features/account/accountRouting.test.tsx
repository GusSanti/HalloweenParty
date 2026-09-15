import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import MyAccountPage from './MyAccountPage'

const services = vi.hoisted(() => ({
  getMyInvitation: vi.fn(),
  getStaffSession: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../../services/invitations', () => services)

beforeEach(() => {
  services.getMyInvitation.mockReset()
  services.getStaffSession.mockReset()
  services.signOut.mockReset()
})

test('conta da equipe que abre Meu ingresso volta ao painel administrativo', async () => {
  services.getStaffSession.mockResolvedValue({ role: 'admin', active: true, email: 'admin@example.com' })

  render(
    <MemoryRouter initialEntries={['/meu-ingresso']}>
      <Routes>
        <Route path="/meu-ingresso" element={<MyAccountPage />} />
        <Route path="/admin" element={<h1>Painel administrativo</h1>} />
      </Routes>
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: 'Painel administrativo' })).toBeVisible()
  await waitFor(() => expect(services.getMyInvitation).not.toHaveBeenCalled())
})
