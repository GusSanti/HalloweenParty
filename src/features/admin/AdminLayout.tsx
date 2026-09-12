import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getLocalAdminEmail, isLocalAdminAuthenticated, logoutLocalAdmin } from '../../lib/localInvitations'
import type { StaffSession } from '../../types/domain'

export default function AdminLayout() {
  const navigate = useNavigate()
  const authenticated = isLocalAdminAuthenticated()
  useEffect(() => { if (!authenticated) navigate('/admin/login', { replace: true }) }, [authenticated, navigate])
  if (!authenticated) return <main className="route-loading">Validando acesso...</main>
  const session: StaffSession = { role: 'admin', active: true, aal: 'aal2', email: getLocalAdminEmail() }
  function logout() { logoutLocalAdmin(); navigate('/admin/login') }
  const links = [{ to: '/admin', label: 'Visão geral', end: true }, { to: '/admin/convites', label: 'Ingressos' }, { to: '/admin/ler-qr', label: 'Ler QR Code' }]
  return <div className="admin-shell"><aside><div className="admin-brand"><strong>H26</strong><span>ADMIN</span></div><nav aria-label="Administração">{links.map((link) => <NavLink key={link.to} to={link.to} end={link.end}>{link.label}</NavLink>)}</nav><div className="admin-account"><span>{session.email}</span><small>Administrador local</small><button type="button" onClick={logout}>Sair</button></div></aside><main><header><span>HALLOWEEN / ADMIN LOCAL</span><b>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date())}</b></header><Outlet context={session} /></main></div>
}
