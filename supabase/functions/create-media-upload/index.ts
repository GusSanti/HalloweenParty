import { requireStaff } from '../_shared/auth.ts'
import { fail, json, preflight, safeError } from '../_shared/http.ts'

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return preflight(request)
  if (request.method !== 'POST') return fail(request, 'Método não permitido.', 405)
  try {
    const { user, supabase } = await requireStaff(request, ['admin'])
    const { mimeType, size, purpose } = await request.json() as { mimeType?: string; size?: number; purpose?: string }
    if (!mimeType || !allowed.has(mimeType) || !Number.isInteger(size) || Number(size) < 1 || Number(size) > 10 * 1024 * 1024) return fail(request, 'Arquivo inválido. Envie JPG, PNG, WebP ou AVIF de até 10 MB.', 422)
    const folder = purpose === 'gallery' ? 'gallery' : 'posts'; const path = `${folder}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${extensions[mimeType]}`
    const { data, error } = await supabase.storage.from('event-media').createSignedUploadUrl(path); if (error) throw error
    await supabase.from('audit_logs').insert({ actor_user_id: user.id, action: 'media.upload.authorized', entity_type: 'storage_object', entity_id: path, metadata: { mime_type: mimeType, size } })
    return json(request, { path, token: data.token, signedUrl: data.signedUrl })
  } catch (error) { const status = Number((error as { status?: number }).status ?? 500); safeError(error, 'create_media_upload'); return fail(request, status === 403 ? 'Você não tem permissão para enviar arquivos.' : 'Não foi possível preparar o envio.', status) }
})
