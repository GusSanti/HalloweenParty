import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginLocalAdmin } from '../../lib/localInvitations'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true)
    const form = new FormData(event.currentTarget)
    try {
      await loginLocalAdmin(String(form.get('email') ?? ''), String(form.get('password') ?? ''))
      navigate('/admin')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.') }
    finally { setLoading(false) }
  }
  return <main className="admin-login"><section><Link className="account-back" to="/">← Voltar ao evento</Link><span>HALLOWEEN / ADMIN</span><h1>ACESSO DA EQUIPE</h1><p>Entre para pesquisar pessoas, ativar convites, dar baixa nos ingressos e ler QR Codes.</p></section><form onSubmit={submit}><p className="local-notice">Acesso da organização.</p><label>E-mail<input required name="email" type="email" autoComplete="username" /></label><label>Senha<input required name="password" type="password" autoComplete="current-password" minLength={1} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" disabled={loading}>{loading ? 'Aguarde...' : 'Entrar'}</button></form></main>
}
