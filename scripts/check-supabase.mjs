// Read-only check of exactly the project selected in .env.local.
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
const env = parseEnv(readFileSync(new URL('../.env.local', import.meta.url), 'utf8'))
const url = env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key?.startsWith('sb_publishable_')) throw new Error('Confira a configuração publicável em .env.local.')
const headers = { apikey: key }
try {
  const settings = await fetch(url + '/auth/v1/settings', { headers, signal: AbortSignal.timeout(15000) })
  console.log('Auth:', settings.status)
  if (!settings.ok) process.exitCode = 1
  else {
    const data = await settings.json()
    console.log('Provedor de e-mail:', data.external?.email === true ? 'ativado' : 'DESATIVADO')
    console.log('Confirmação de e-mail:', data.mailer_autoconfirm === false ? 'exigida' : 'desativada')
  }
  for (const [table, columns] of Object.entries({
    event_settings: 'id,active', posts: 'slug,status', gallery_items: 'id,image_path',
    attendee_profiles: 'user_id,full_name', invitations: 'id,code,status', staff_profiles: 'user_id,role',
  })) {
    const response = await fetch(url + '/rest/v1/' + table + '?select=' + columns + '&limit=0',
      { headers, signal: AbortSignal.timeout(15000) })
    if (response.ok) console.log(table + ': API acessível (consulta sem registros)')
    else {
      const data = await response.json().catch(() => ({}))
      const denied = ['401','403'].includes(String(response.status)) && data.code === '42501'
      console.log(table + ': ' + (denied ? 'acesso anônimo bloqueado' : 'verificar esquema/configuração') +
        ' [' + response.status + ', ' + (data.code ?? 'sem código') + ']')
      if (!denied) process.exitCode = 1
    }
  }
  console.log('Nenhum cadastro, convite ou configuração foi alterado. RPCs e RLS autenticada exigem testes com usuários.')
} catch {
  console.error('Não foi possível concluir a conexão. Verifique rede e configuração no .env.local.')
  process.exitCode = 1
}
