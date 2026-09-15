import { Link } from 'react-router-dom'
import { eventConfig } from '../config/event'
import { Gallery } from '../features/gallery/Gallery'
import { useAuth } from '../lib/useAuth'

export function HomePage() {
  const { user, staffRole } = useAuth()
  const hasAccount = Boolean(user)
  const ticketTarget = staffRole ? '/admin' : hasAccount ? '/meu-ingresso' : '/ingresso'
  const ticketLabel = staffRole ? 'Painel administrativo' : hasAccount ? 'Meu ingresso' : 'Comprar ingresso'
  return <main>
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-kicker"><span>Uma noite em Abaeté</span><span aria-hidden="true">Nº 01 / 2026</span></div>
      <h1 id="hero-title">{eventConfig.name}</h1>
      <div className="hero-grid">
        <p className="vertical-note" aria-hidden="true">VALE VERDE · CAMPO DO ALENCAR · ABAETÉ</p>
        <div className="date-lockup" aria-label="24 de outubro de 2026"><span>24</span><span className="date-divider">.</span><span>10</span><span className="date-divider">.</span><span>26</span></div>
        <div className="hero-meta"><p>{eventConfig.location}<br />{eventConfig.venueArea}<br />{eventConfig.city} · {eventConfig.time}</p><p className="hero-open-bar">OPEN<br /><strong>BAR</strong></p></div>
      </div>
      <div className="hero-action"><Link className="primary-cta" to={ticketTarget}><span>{ticketLabel}</span><span aria-hidden="true">↗</span></Link><p>{staffRole ? 'Acesse a gestão dos ingressos e o leitor de QR Code' : hasAccount ? 'Acesse seu convite e acompanhe a situação do ingresso' : 'Entre ou crie sua conta para acessar o convite'}</p></div>
    </section>

    <section className="open-bar-banner" id="open-bar" aria-label="Evento open bar"><span>OPEN BAR</span><small>BEBIDAS INCLUSAS</small></section>

    <section className="poster-showcase" id="evento" aria-labelledby="poster-title">
      <div className="poster-copy">
        <p className="section-index">01 / O EVENTO</p>
        <h2 id="poster-title">VENHA<br /><em>FANTASIADO.</em></h2>
        <p>Halloween Party no Vale Verde, no Campo do Alencar, com open bar e entrada por convite pessoal.</p>
        <dl>
          <div><dt>Quando</dt><dd>24.10.2026 · {eventConfig.time}</dd></div>
          <div><dt>Onde</dt><dd>{eventConfig.location} · {eventConfig.venueArea} · {eventConfig.city}</dd></div>
          <div><dt>Formato</dt><dd>Open bar</dd></div>
        </dl>
        <Link className="paper-cta" to={ticketTarget}>{ticketLabel} <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="poster-gallery" id="galeria"><Gallery /></div>
    </section>

    <section className="venue-section" id="local" aria-labelledby="venue-title">
      <div className="venue-copy">
        <p className="section-index">02 / LOCALIZAÇÃO</p>
        <h2 id="venue-title">VALE<br /><em>VERDE.</em></h2>
        <p>O evento será no Vale Verde, espaço localizado no Campo do Alencar, em Abaeté.</p>
        <dl><div><dt>Local</dt><dd>{eventConfig.location}</dd></div><div><dt>Referência</dt><dd>{eventConfig.venueArea} · {eventConfig.city}</dd></div></dl>
      </div>
      <div className="map-placeholder" aria-label="Espaço reservado para o mapa do Vale Verde">
        <div><span>MAPA DA LOCALIZAÇÃO</span><strong>EM BREVE</strong><p>{eventConfig.location}<br />{eventConfig.venueArea} · {eventConfig.city}</p></div>
      </div>
    </section>

    <footer><div><strong>HALLOWEEN</strong><span>24.10.2026</span></div><nav aria-label="Links do rodapé"><Link to="/politica-de-privacidade">Política de privacidade</Link></nav><small>© 2026</small></footer>
  </main>
}
