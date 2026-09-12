import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createLocalAccount, loginLocalAccount } from '../../lib/localInvitations'

export default function AccountAccessPage() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup'>(searchParams.get('modo') === 'cadastro' ? 'signup' : 'login')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true)
    const form = new FormData(event.currentTarget)
    try {
      if (mode === 'signup') {
        const password = String(form.get('password') ?? '')
        if (password !== String(form.get('confirmation') ?? '')) throw new Error('As senhas não são iguais.')
        const result = await createLocalAccount({
          fullName: String(form.get('fullName') ?? ''),
          email: String(form.get('email') ?? ''),
          phone: String(form.get('phone') ?? ''),
          password,
        })
        if (result.needsConfirmation) {
          setNotice('Confira seu e-mail para confirmar o cadastro. Se já tiver uma conta, entre com sua senha.')
          return
        }
      } else {
        await loginLocalAccount(String(form.get('email') ?? ''), String(form.get('password') ?? ''))
      }
      navigate('/meu-ingresso')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível continuar.')
    } finally { setLoading(false) }
  }

  return <main className="account-access">
    <section className="account-access-intro">
      <Link className="account-back" to="/">← Voltar ao evento</Link>
      <div><span>HALLOWEEN / CONVITES</span><h1>SEU ACESSO<br />À NOITE.</h1><p>Entre ou crie sua conta. Depois, compre diretamente com a organização e acompanhe aqui a ativação do convite.</p></div>
      <strong>OPEN BAR</strong>
    </section>
    <section className="account-form-wrap">
      <div className="account-tabs" role="tablist" aria-label="Acesso à conta">
        <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => { setMode('login'); setError('') }}>Entrar</button>
        <button className={mode === 'signup' ? 'active' : ''} type="button" onClick={() => { setMode('signup'); setError('') }}>Criar conta</button>
      </div>
      <form className="account-form" onSubmit={submit}>
        <p className="eyebrow">{mode === 'signup' ? 'Novo cadastro' : 'Minha conta'}</p>
        <h2>{mode === 'signup' ? 'CRIAR CONTA' : 'ENTRAR'}</h2>
        {mode === 'signup' && <>
          <label>Nome completo<input name="fullName" autoComplete="name" minLength={3} maxLength={120} required /></label>
          <label>WhatsApp<input name="phone" type="tel" inputMode="tel" autoComplete="tel" minLength={10} maxLength={20} placeholder="(37) 99999-9999" required /></label>
        </>}
        <label>E-mail<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
        <label>Senha<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 12 : 1} maxLength={128} required /></label>
        {mode === 'signup' && <label>Confirmar senha<input name="confirmation" type="password" autoComplete="new-password" minLength={8} required /></label>}
        {notice && <p role="status">{notice}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="account-submit" type="submit" disabled={loading}>{loading ? 'Aguarde...' : mode === 'signup' ? 'Criar minha conta' : 'Entrar na minha conta'}</button>
        {mode === 'signup' && <small>Ao criar a conta, seu convite fica pendente até a confirmação manual da organização.</small>}
      </form>
    </section>
  </main>
}
