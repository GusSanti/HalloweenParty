import { eventConfig } from '../config/event'

export function Assistant() {
  const message = encodeURIComponent('Olá! Tenho uma dúvida sobre o Halloween Party.')
  return (
    <aside className="assistant" aria-label="Atendimento do evento">
      <a className="assistant-trigger" href={`${eventConfig.whatsappUrl}?text=${message}`} target="_blank" rel="noreferrer" aria-label="Tirar dúvidas pelo WhatsApp">Dúvidas? <span aria-hidden="true">↗</span></a>
    </aside>
  )
}
