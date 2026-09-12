import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// The project selected in .env.local is the sole connection source.
// Do not merge .env, mode-specific files or shell variables into these values.
export default defineConfig(() => {
  let env: Record<string, string | undefined>
  try { env = parseEnv(readFileSync(new URL('./.env.local', import.meta.url), 'utf8')) }
  catch { throw new Error('Crie .env.local com VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.') }
  const url = env.VITE_SUPABASE_URL?.trim()
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !key || !URL.canParse(url) || new URL(url).protocol !== 'https:')
    throw new Error('Confira a URL HTTPS e a chave publicável em .env.local.')
  if (!key.startsWith('sb_publishable_'))
    throw new Error('Use a chave sb_publishable_ do seu projeto em .env.local; não use uma chave secreta.')
  return {
    plugins: [react()],
    envPrefix: [],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(url),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(key),
    },
  }
})
