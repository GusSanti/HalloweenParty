import { expect, test } from '@playwright/test'

test('visitante vê comprar ingresso sem provisionar convite', async ({ page }) => {
  let provisions = 0
  await page.route('**/rest/v1/rpc/ensure_my_invitation', async route => {
    provisions++; await route.abort()
  })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Comprar ingresso', exact: true }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Meu ingresso', exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Comprar ingresso', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'VOCÊ JÁ TEM UMA CONTA?' })).toBeVisible()
  expect(provisions).toBe(0)
})

test('cadastro aguarda confirmação do Auth e não inventa convite', async ({ page }) => {
  let signupData: Record<string, unknown> = {}
  await page.route('**/auth/v1/signup**', async route => {
    signupData = route.request().postDataJSON()
    await route.fulfill({ json: {
      id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated',
      email: 'maria@example.com', app_metadata: {}, user_metadata: {},
      identities: [], created_at: new Date().toISOString(),
    } })
  })
  await page.goto('/ingresso')
  await page.getByRole('button', { name: 'Não, criar conta' }).click()
  await page.getByLabel('Nome completo').fill('Maria Teste')
  await page.getByLabel('WhatsApp').fill('37999999999')
  await page.getByLabel('E-mail').fill('maria@example.com')
  await page.getByLabel('Senha', { exact: true }).fill('senha-segura-123')
  await page.getByLabel('Confirmar senha').fill('senha-segura-123')
  await page.getByRole('button', { name: 'Criar minha conta' }).click()
  await expect(page.getByRole('status')).toContainText('Confira seu e-mail')
  await expect(page.locator('.invitation-card')).toHaveCount(0)
  expect(signupData.data).toEqual({ full_name: 'Maria Teste', phone: '37999999999' })
})

test('menu do evento mantém as ações funcionando sem hash', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('24 de outubro de 2026')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Tirar dúvidas pelo WhatsApp' })).toHaveAttribute('href', /wa\.me\/553798702778/)
  const menu = page.getByRole('button', { name: 'Abrir menu' })
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('button', { name: 'O evento', exact: true }).click()
  await expect(page).not.toHaveURL(/#evento/)
  await page.getByRole('link', { name: 'Comprar ingresso' }).nth(1).click()
  await expect(page).toHaveURL(/\/ingresso/)
})
