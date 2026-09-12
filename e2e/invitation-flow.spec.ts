import { expect, test } from '@playwright/test'

test('cadastro fica pendente e pode ser ativado manualmente', async ({ page }) => {
  await page.goto('/ingresso')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await page.getByLabel('Nome completo').fill('Maria Teste')
  await page.getByLabel('WhatsApp').fill('37999999999')
  await page.getByLabel('E-mail').fill('maria@example.com')
  await page.getByLabel('Senha', { exact: true }).fill('senha-segura-123')
  await page.getByLabel('Confirmar senha').fill('senha-segura-123')
  await page.getByRole('button', { name: 'Criar minha conta' }).click()
  await expect(page.getByRole('heading', { name: 'AGUARDANDO LIBERAÇÃO' })).toBeVisible()

  await page.goto('/admin/login')
  await page.getByLabel('E-mail').fill('eduardosoares.email@gmail.com')
  await page.getByLabel('Senha', { exact: true }).fill('bXEz9Pa')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto('/admin/convites')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Ativar ingresso' }).click()

  await page.goto('/ingresso')
  await expect(page.getByRole('heading', { name: 'SEU ACESSO ESTÁ LIBERADO' })).toBeVisible()
  await expect(page.getByAltText(/QR Code do convite/)).toBeVisible()
})

test('menu do evento mantém as ações funcionando sem hash', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('24 de outubro de 2026')).toBeVisible()
  const menu = page.getByRole('button', { name: 'Abrir menu' })
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('button', { name: 'O evento', exact: true }).click()
  await expect(page).not.toHaveURL(/#evento/)
  await page.getByRole('link', { name: 'Comprar ingresso' }).nth(1).click()
  await expect(page).toHaveURL(/\/ingresso/)
})
