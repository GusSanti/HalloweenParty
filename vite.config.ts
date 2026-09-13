import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Local development uses .env.local. Hosted builds use environment variables
// configured in the deployment platform; the values are public client config.
export default defineConfig(() => {
  let localEnv: Record<string, string | undefined> = {}
  try { localEnv = parseEnv(readFileSync(new URL('./.env.local', import.meta.url), 'utf8')) }
  catch { /* Hosted builds intentionally do not include .env.local. */ }
  const url = (localEnv.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.trim()
  const key = (localEnv.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY)?.trim()
  if (!url || !key || !URL.canParse(url) || new URL(url).protocol !== 'https:')
    throw new Error('Configure VITE_SUPABASE_URL com a URL HTTPS do projeto Supabase.')
  if (!key.startsWith('sb_publishable_'))
    throw new Error('Configure VITE_SUPABASE_PUBLISHABLE_KEY com uma chave sb_publishable_; nunca use uma chave secreta.')
  return {
    plugins: [react()],
    envPrefix: [],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(url),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(key),
    },
  }
})
