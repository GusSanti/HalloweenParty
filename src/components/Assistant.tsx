import { useState } from 'react'
import type { FormEvent } from 'react'
import { askEventAssistant } from '../services/api'

export function Assistant() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!question.trim() || loading) return
    setLoading(true); setAnswer('')
    try { setAnswer((await askEventAssistant(question.trim())).answer) }
    catch { setAnswer('Não foi possível responder agora. Tente novamente ou fale com a equipe pelo WhatsApp oficial.') }
    finally { setLoading(false) }
  }
  return (
    <aside className={`assistant ${open ? 'open' : ''}`} aria-label="Assistente do evento">
      {open && <div className="assistant-panel">
        <div><span className="eyebrow">Assistente oficial</span><button type="button" onClick={() => setOpen(false)} aria-label="Fechar assistente">×</button></div>
        <h2>Dúvidas sobre o evento?</h2>
        <p>Pergunte sobre data, local, open bar, cadastro ou ativação do convite.</p>
        {answer && <p className="assistant-answer" aria-live="polite">{answer}</p>}
        <form onSubmit={submit}><label htmlFor="assistant-question">Sua pergunta</label><textarea id="assistant-question" maxLength={500} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Como recebo meu ingresso?" /><button type="submit" disabled={loading}>{loading ? 'Buscando a resposta...' : 'Perguntar'}</button></form>
      </div>}
      {!open && <button className="assistant-trigger" type="button" onClick={() => setOpen(true)}>Dúvidas? <span>↗</span></button>}
    </aside>
  )
}
