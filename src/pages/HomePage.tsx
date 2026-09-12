import { Link } from 'react-router-dom'
import { eventConfig } from '../config/event'
import { Gallery } from '../features/gallery/Gallery'
import { getCurrentLocalAccount } from '../lib/localInvitations'

export function HomePage() {
  const hasAccount = Boolean(getCurrentLocalAccount())
  const ticketTarget = hasAccount ? '/meu-ingresso' : '/ingresso'
  const ticketLabel = hasAccount ? 'Meu ingresso' : 'Comprar ingresso'
  return <main>
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-kicker"><span>Uma noite em Abaeté</span><span aria-hidden="true">Nº 01 / 2026</span></div>
      <h1 id="hero-title">{eventConfig.name}</h1>
      <div className="hero-grid">
        <p className="vertical-note" aria-hidden="true">CAMPO DO ALENCAR · ABAETÉ</p>
        <div className="date-lockup" aria-label="24 de outubro de 2026"><span>24</span><span className="date-divider">.</span><span>10</span><span className="date-divider">.</span><span>26</span></div>
        <div className="hero-meta"><p>{eventConfig.location}<br />{eventConfig.city}<br />{eventConfig.time}</p><p className="hero-open-bar">OPEN<br /><strong>BAR</strong></p></div>
      </div>
      <div className="hero-action"><Link className="primary-cta" to={ticketTarget}><span>{ticketLabel}</span><span aria-hidden="true">↗</span></Link><p>{hasAccount ? 'Acesse seu convite e acompanhe a situação do ingresso' : 'Entre ou crie sua conta para acessar o convite'}</p></div>
    </section>

    <section className="open-bar-banner" id="open-bar" aria-label="Evento open bar"><span>OPEN BAR</span><small>BEBIDAS INCLUSAS</small></section>

    <section className="poster-showcase" id="evento" aria-labelledby="poster-title">
      <div className="poster-copy">
        <p className="section-index">01 / O EVENTO</p>
        <h2 id="poster-title">VENHA<br /><em>FANTASIADO.</em></h2>
        <p>Halloween Party no Campo do Alencar. Faça seu cadastro no site, combine o pagamento diretamente com a organização e acompanhe a liberação do seu convite.</p>
        <dl>
          <div><dt>Quando</dt><dd>24.10.2026 · {eventConfig.time}</dd></div>
          <div><dt>Onde</dt><dd>{eventConfig.location} · {eventConfig.city}</dd></div>
          <div><dt>Formato</dt><dd>Open bar</dd></div>
        </dl>
        <Link className="paper-cta" to={ticketTarget}>{ticketLabel} <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="poster-gallery" id="galeria"><Gallery /></div>
    </section>

    <section className="compact-bottom" aria-labelledby="invite-flow-title">
      <div className="invite-flow">
        <p className="section-index">02 / SEU CONVITE</p>
        <h2 id="invite-flow-title">SIMPLES E DIRETO.</h2>
        <ol><li><span>01</span><div><strong>Crie sua conta</strong><p>Cadastre seus dados e tenha um convite pessoal.</p></div></li><li><span>02</span><div><strong>Fale com a organização</strong><p>O pagamento é combinado diretamente, fora do site.</p></div></li><li><span>03</span><div><strong>Acompanhe a ativação</strong><p>Quando o pagamento for confirmado, seu QR Code ficará ativo.</p></div></li></ol>
        <Link className="primary-cta" to={ticketTarget}><span>{ticketLabel}</span><span aria-hidden="true">↗</span></Link>
      </div>
      <aside className="contact-card" aria-labelledby="contact-title">
        <p className="section-index">03 / CONTATO</p>
        <h2 id="contact-title">FALE COM A GENTE.</h2>
        <Link className="whatsapp-home" to={ticketTarget}><span>{hasAccount ? 'Acesso rápido' : 'Seu convite'}</span><strong>{ticketLabel.toUpperCase()}</strong><b aria-hidden="true">↗</b></Link>
        <a href={eventConfig.instagramUrl} rel="noreferrer" target="_blank"><span>Instagram</span><strong>@halloween_abaete</strong><b aria-hidden="true">↗</b></a>
      </aside>
    </section>

    <footer><div><strong>HALLOWEEN</strong><span>24.10.2026</span></div><p>{eventConfig.location}<br />{eventConfig.city} · {eventConfig.time}</p><nav aria-label="Links do rodapé"><Link to="/politica-de-privacidade">Política de privacidade</Link></nav><small>© 2026</small></footer>
  </main>
}
