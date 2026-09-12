import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createLocalAccount, loginLocalAccount } from '../../lib/localInvitations'

export default function AccountAccessPage() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'choice' | 'login' | 'signup'>(searchParams.get('modo') === 'cadastro' ? 'signup' : 'choice')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === 'choice') return
    setError(''); setLoading(true)
    const form = new FormData(event.currentTarget)
    try {
      if (mode === 'signup') {
        const password = String(form.get('password') ?? '')
        if (password !== String(form.get('confirmation') ?? '')) throw new Error('As senhas não são iguais.')
        await createLocalAccount({
          fullName: String(form.get('fullName') ?? ''),
          email: String(form.get('email') ?? ''),
          phone: String(form.get('phone') ?? ''),
          password,
        })
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
      {mode === 'choice' ? <div className="account-choice">
        <p className="eyebrow">Primeiro passo</p>
        <h2>VOCÊ JÁ TEM<br />UMA CONTA?</h2>
        <p>Escolha uma opção para continuar.</p>
        <div><button type="button" onClick={() => setMode('login')}>Sim, entrar</button><button type="button" onClick={() => setMode('signup')}>Não, criar conta</button></div>
      </div> : <>
        <button className="account-mode-back" type="button" onClick={() => { setMode('choice'); setError('') }}>← Escolher outra opção</button>
        <form className="account-form" onSubmit={submit}>
        <p className="eyebrow">{mode === 'signup' ? 'Novo cadastro' : 'Minha conta'}</p>
        <h2>{mode === 'signup' ? 'CRIAR CONTA' : 'ENTRAR'}</h2>
        {mode === 'signup' && <>
          <label>Nome completo<input name="fullName" autoComplete="name" minLength={3} maxLength={120} required /></label>
          <label>WhatsApp<input name="phone" type="tel" inputMode="tel" autoComplete="tel" minLength={10} maxLength={20} placeholder="(37) 99999-9999" required /></label>
        </>}
        <label>E-mail<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
        <label>Senha<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required /></label>
        {mode === 'signup' && <label>Confirmar senha<input name="confirmation" type="password" autoComplete="new-password" minLength={8} required /></label>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="account-submit" type="submit" disabled={loading}>{loading ? 'Aguarde...' : mode === 'signup' ? 'Criar minha conta' : 'Entrar na minha conta'}</button>
        {mode === 'signup' && <small>Ao criar a conta, seu convite fica pendente até a confirmação manual da organização.</small>}
        </form>
      </>}
    </section>
  </main>
}
