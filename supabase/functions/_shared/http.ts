const allowedOrigin = Deno.env.get('PUBLIC_SITE_URL') ?? 'http://127.0.0.1:5173'

export function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': origin === allowedOrigin ? origin : allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  }
}

export function json(request: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' } })
}

export function fail(request: Request, message: string, status = 400) { return json(request, { error: message }, status) }
export function preflight(request: Request) { return new Response(null, { status: 204, headers: corsHeaders(request) }) }

export function safeError(error: unknown, context: string) {
  console.error(JSON.stringify({ context, message: error instanceof Error ? error.message : 'unknown_error' }))
}
