// @vitest-environment node
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { afterEach, expect, it, vi } from 'vitest'
import config from '../../vite.config'

afterEach(() => vi.unstubAllEnvs())
it('a conexão vem do .env.local mesmo se o terminal aponta para outro projeto', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://outro-projeto.invalid')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_outro_projeto')
  const expected = parseEnv(readFileSync('.env.local', 'utf8'))
  if (typeof config !== 'function') throw new Error('Configuração inesperada do Vite.')
  const resolved = await config({ command: 'build', mode: 'production' })
  // Compare booleans so failure output never prints project keys.
  expect(resolved.define?.['import.meta.env.VITE_SUPABASE_URL'] === JSON.stringify(expected.VITE_SUPABASE_URL?.trim())).toBe(true)
  expect(resolved.define?.['import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY'] === JSON.stringify(expected.VITE_SUPABASE_PUBLISHABLE_KEY?.trim())).toBe(true)
  expect(resolved.envPrefix).toEqual([])
})
