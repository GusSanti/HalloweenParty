import { expect, test } from '@playwright/test'

test('painel administrativo exige login local', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/admin\/login/)
  await expect(page.getByRole('heading', { name: 'ACESSO DA EQUIPE' })).toBeVisible()
})

test('leitor de QR abre o mesmo cadastro do ingresso', async ({ page }) => {
  await page.goto('/ingresso')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await page.getByLabel('Nome completo').fill('Pessoa do QR')
  await page.getByLabel('WhatsApp').fill('37999999999')
  await page.getByLabel('E-mail').fill('qr@example.com')
  await page.getByLabel('Senha', { exact: true }).fill('senha-segura-123')
  await page.getByLabel('Confirmar senha').fill('senha-segura-123')
  await page.getByRole('button', { name: 'Criar minha conta' }).click()

  const invitationCode = await page.locator('.invitation-code span').textContent()
  expect(invitationCode).toMatch(/^H26-/)

  await page.goto('/admin/login')
  await page.getByLabel('E-mail').fill('eduardosoares.email@gmail.com')
  await page.getByLabel('Senha', { exact: true }).fill('bXEz9Pa')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/admin$/)

  await page.route('**/v1/read-qr-code/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([{ type: 'qrcode', symbol: [{ seq: 0, data: `H26:${invitationCode}`, error: null }] }]),
    })
  })
  await page.goto('/admin/ler-qr')
  await page.locator('#qr-photo').setInputFiles({ name: 'convite.png', mimeType: 'image/png', buffer: Buffer.from('imagem-de-teste') })

  await expect(page).toHaveURL(/\/admin\/convites\?busca=H26-/)
  await expect(page.getByRole('heading', { name: 'Pessoa do QR' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ativar ingresso' })).toBeVisible()
})
