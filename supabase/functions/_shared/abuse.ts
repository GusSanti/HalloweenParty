import { sha256 } from './crypto.ts'
import { adminClient } from './supabase.ts'

export async function enforceRateLimit(request: Request, scope: string, limit: number, seconds: number) {
  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const { data, error } = await adminClient().rpc('consume_rate_limit', { p_key_hash: await sha256(`${scope}:${ip}`), p_limit: limit, p_window_seconds: seconds })
  if (error || !data) throw Object.assign(new Error('rate_limited'), { status: 429 })
}

export async function verifyTurnstile(token: string | undefined, request: Request) {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) return Deno.env.get('APP_ENV') !== 'production'
  if (!token) return false
  const body = new FormData(); body.set('secret', secret); body.set('response', token)
  const ip = request.headers.get('cf-connecting-ip'); if (ip) body.set('remoteip', ip)
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
  const result = await response.json() as { success?: boolean }
  return result.success === true
}
