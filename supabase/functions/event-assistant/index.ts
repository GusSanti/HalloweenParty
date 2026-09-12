import { enforceRateLimit } from '../_shared/abuse.ts'
import { fail, json, preflight, safeError } from '../_shared/http.ts'
import { adminClient } from '../_shared/supabase.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return preflight(request)
  if (request.method !== 'POST') return fail(request, 'Método não permitido.', 405)
  try {
    await enforceRateLimit(request, 'assistant', 12, 60)
    const { message } = await request.json() as { message?: string }
    const question = String(message ?? '').trim()
    if (!question || question.length > 500) return fail(request, 'Digite uma pergunta de até 500 caracteres.', 422)
    const supabase = adminClient()
    const [{ data: event }, { data: ticketTypes }, { data: faqs }, { data: posts }] = await Promise.all([
      supabase.from('event_settings').select('event_name,event_date,location_name,city,event_time,instagram_url,whatsapp_url,map_url,age_rating,entry_rules,parking_info,dress_code').eq('active', true).single(),
      supabase.from('ticket_types').select('name,price_cents,max_per_order,sales_start,sales_end').eq('active', true),
      supabase.from('faqs').select('question,answer').eq('published', true).order('sort_order').limit(20),
      supabase.from('posts').select('title,excerpt,body_markdown,published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(8),
    ])
    if (!event) throw new Error('active_event_not_found')
    const apiKey = Deno.env.get('OPENAI_API_KEY'); const model = Deno.env.get('OPENAI_MODEL')
    if (!apiKey || !model) return fail(request, 'O assistente ainda não está disponível.', 503)
    const verifiedContext = JSON.stringify({ event, ticketTypes, faqs, publishedPosts: posts })
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, store: false, max_output_tokens: 260, instructions: 'Você é o assistente oficial do evento Halloween em Abaeté. Responda em português brasileiro. Use somente as informações verificadas fornecidas no contexto. Não invente atrações, horários, classificação, artistas, regras, disponibilidade ou políticas. Se algo não estiver disponível, diga claramente que a informação ainda não foi divulgada e indique o WhatsApp oficial somente se ele estiver no contexto. Nunca afirme que um pagamento foi aprovado, nunca valide ingressos e nunca solicite senhas, dados de cartão ou segredos.', input: `CONTEXTO VERIFICADO:\n${verifiedContext}\n\nPERGUNTA DO VISITANTE:\n${question}` }) })
    if (!response.ok) throw new Error(`openai_${response.status}`)
    const result = await response.json() as { output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> }
    const answer = result.output?.flatMap((item) => item.content ?? []).find((part) => part.type === 'output_text')?.text
    if (!answer) throw new Error('openai_empty_response')
    return json(request, { answer })
  } catch (error) { const status = Number((error as { status?: number }).status ?? 500); safeError(error, 'event_assistant'); return fail(request, status === 429 ? 'Muitas perguntas em pouco tempo. Aguarde um momento.' : 'Não foi possível responder agora.', status) }
})
