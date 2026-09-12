export function Turnstile() {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
  return siteKey
    ? <div className="cf-turnstile turnstile-slot" data-sitekey={siteKey} data-theme="dark" data-language="pt-BR" />
    : <div className="turnstile-slot">Turnstile desativado no ambiente local.</div>
}
