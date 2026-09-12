import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getCurrentLocalAccount } from '../lib/localInvitations'
import { Assistant } from './Assistant'

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const isTicketPortal = location.pathname === '/meu-ingresso'
  const hasAccount = Boolean(getCurrentLocalAccount())
  function jumpTo(id: string) {
    setMenuOpen(false)
    const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' })
    if (isHome) scroll()
    else { navigate('/'); window.setTimeout(scroll, 80) }
  }
  return (
    <>
      <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
      {!isTicketPortal && <header className="site-header">
        <Link className="wordmark" to="/" aria-label="Halloween — página inicial">H<span>26</span></Link>
        <nav className={menuOpen ? 'open' : ''} aria-label="Navegação principal">
          <button type="button" onClick={() => jumpTo('evento')}>O evento</button>
          <button type="button" onClick={() => jumpTo('open-bar')}>Open bar</button>
        </nav>
        <Link className="header-cta" to={hasAccount ? '/meu-ingresso' : '/ingresso'}>{hasAccount ? 'Meu ingresso' : 'Comprar ingresso'}</Link>
        <button className="menu-toggle" type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
          {menuOpen ? 'Fechar' : 'Menu'}
        </button>
      </header>}
      <div id="conteudo"><Outlet /></div>
      {isHome && <Assistant />}
    </>
  )
}
