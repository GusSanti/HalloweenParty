import { expect, test } from '@playwright/test'
test('sinalizador local não concede acesso administrativo', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('role','admin')
    localStorage.setItem('accounts',JSON.stringify([{ invitationStatus:'active' }]))
  })
  await page.goto('/admin')
  await expect(page.getByText(/Não foi possível validar o acesso|ACESSO DA EQUIPE/).first()).toBeVisible()
  await expect(page.getByRole('heading',{name:'VISÃO GERAL'})).toHaveCount(0)
})
test('confirmação de senha rejeitada antes do cadastro remoto', async ({ page }) => {
  let signups = 0
  await page.route('**/auth/v1/signup**', async route => { signups++; await route.abort() })
  await page.goto('/ingresso')
  await page.getByRole('button',{name:'Não, criar conta',exact:true}).click()
  await page.getByLabel('Nome completo').fill('Maria Teste')
  await page.getByLabel('WhatsApp').fill('37999999999')
  await page.getByLabel('E-mail').fill('teste@example.com')
  await page.getByLabel('Senha',{exact:true}).fill('Senha-valida-123')
  await page.getByLabel('Confirmar senha').fill('Senha-diferente-123')
  await page.getByRole('button',{name:'Criar minha conta'}).click()
  await expect(page.getByRole('alert')).toHaveText('As senhas não são iguais.')
  expect(signups).toBe(0)
})
