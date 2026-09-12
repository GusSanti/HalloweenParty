import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getStaffSession, logoutLocalAdmin } from '../../lib/localInvitations'


export default function AdminLayout() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Awaited<ReturnType<typeof getStaffSession>>>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const refresh = () => { void getStaffSession().then(value => { if (!active) return; setSession(value); if (!value) navigate('/admin/login', { replace: true }) }).catch(() => { if (active) { setSession(null); setError('Não foi possível validar o acesso.') } }) }
    refresh()
    const timer = setInterval(refresh, 15000)
    return () => { active = false; clearInterval(timer) }
  }, [navigate])
  if (!session) return <main className="route-loading">{error || 'Validando acesso...'}</main>
  async function logout() { try { await logoutLocalAdmin(); navigate('/admin/login') } catch { setError('Não foi possível sair.') } }
  const links = [{ to: '/admin', label: 'Visão geral', end: true }, { to: '/admin/convites', label: 'Ingressos' }, { to: '/admin/ler-qr', label: 'Ler QR Code' }]
  return <div className="admin-shell"><aside><div className="admin-brand"><strong>H26</strong><span>ADMIN</span></div><nav aria-label="Administração">{links.map((link) => <NavLink key={link.to} to={link.to} end={link.end}>{link.label}</NavLink>)}</nav><div className="admin-account"><span>{session.email}</span><small>Equipe autorizada</small><button type="button" onClick={logout}>Sair</button></div></aside><main><header><span>HALLOWEEN / ADMIN</span><b>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date())}</b></header>{error && <p role="alert">{error}</p>}<Outlet context={session} /></main></div>
}
