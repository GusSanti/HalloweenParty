const encoder = new TextEncoder()

function hex(bytes: Uint8Array) { return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('') }
export async function sha256(value: string) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))) }
export function randomToken(bytes = 32) { const value = crypto.getRandomValues(new Uint8Array(bytes)); return btoa(String.fromCharCode(...value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '') }
export async function hmac(value: string, secret: string) { const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))) }
export async function verifyHmac(value: string, signature: string, secret: string) { const expected = await hmac(value, secret); if (expected.length !== signature.length) return false; let different = 0; for (let index = 0; index < expected.length; index++) different |= expected.charCodeAt(index) ^ signature.charCodeAt(index); return different === 0 }
export async function orderAccessToken(idempotencyKey: string) { const secret = Deno.env.get('TICKET_SIGNING_SECRET'); if (!secret) throw new Error('missing_ticket_signing_secret'); return `o_${await hmac(idempotencyKey, secret)}` }
export async function ticketQrPayload(ticketId: string, eventId: string) { const secret = Deno.env.get('TICKET_SIGNING_SECRET'); if (!secret) throw new Error('missing_ticket_signing_secret'); const value = `${ticketId}.${eventId}`; return `${value}.${await hmac(value, secret)}` }
export async function verifyTicketQr(payload: string) { const parts = payload.split('.'); if (parts.length !== 3) return null; const [ticketId, eventId, signature] = parts; const secret = Deno.env.get('TICKET_SIGNING_SECRET'); if (!secret || !await verifyHmac(`${ticketId}.${eventId}`, signature, secret)) return null; return { ticketId, eventId } }

export async function verifyMercadoPagoSignature(input: { xSignature: string; xRequestId: string; dataId: string; secret: string }) {
  const parts = Object.fromEntries(input.xSignature.split(',').map((part) => part.split('=', 2)))
  if (!parts.ts || !parts.v1 || !input.xRequestId || !input.dataId) return false
  const manifest = `id:${input.dataId};request-id:${input.xRequestId};ts:${parts.ts};`
  return verifyHmac(manifest, parts.v1, input.secret)
}
