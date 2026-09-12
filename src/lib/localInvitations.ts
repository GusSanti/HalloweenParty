export type InvitationStatus = 'pending' | 'active' | 'used'

export interface LocalAccount {
  id: string
  fullName: string
  email: string
  phone: string
  passwordSalt: string
  passwordHash: string
  invitationCode: string
  invitationStatus: InvitationStatus
  createdAt: string
  activatedAt: string | null
  usedAt: string | null
}

const accountsKey = 'h26-local-accounts-v1'
const attendeeSessionKey = 'h26-attendee-session-v1'
const adminSessionKey = 'h26-local-admin-session-v1'
const defaultAdmin = {
  email: 'eduardosoares.email@gmail.com',
  passwordSalt: 'eVnJOvGwq7VR7k7ui1fDKA==',
  passwordHash: 'p8/O2LSnp8IMcuUeyUvjWPAC3n6EYuIViY2k9NI+XVo=',
}

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? '') as T } catch { return fallback }
}

function bytesToBase64(bytes: Uint8Array) {
  let value = ''
  bytes.forEach((byte) => { value += String.fromCharCode(byte) })
  return btoa(value)
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function derivePassword(password: string, salt: string) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: base64ToBytes(salt), iterations: 120_000, hash: 'SHA-256' }, material, 256)
  return bytesToBase64(new Uint8Array(bits))
}

function newSalt() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)))
}

function newInvitationCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const values = crypto.getRandomValues(new Uint8Array(8))
  const token = Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
  return `H26-${token.slice(0, 4)}-${token.slice(4)}`
}

export function listLocalAccounts() {
  return readJson<LocalAccount[]>(accountsKey, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function saveAccounts(accounts: LocalAccount[]) {
  localStorage.setItem(accountsKey, JSON.stringify(accounts))
  window.dispatchEvent(new Event('h26:accounts-changed'))
}

export async function createLocalAccount(input: { fullName: string; email: string; phone: string; password: string }) {
  const accounts = listLocalAccounts()
  const email = input.email.trim().toLowerCase()
  if (accounts.some((account) => account.email === email)) throw new Error('Já existe uma conta com este e-mail.')
  const passwordSalt = newSalt()
  const account: LocalAccount = {
    id: crypto.randomUUID(),
    fullName: input.fullName.trim(),
    email,
    phone: input.phone.replace(/\D/g, ''),
    passwordSalt,
    passwordHash: await derivePassword(input.password, passwordSalt),
    invitationCode: newInvitationCode(),
    invitationStatus: 'pending',
    createdAt: new Date().toISOString(),
    activatedAt: null,
    usedAt: null,
  }
  saveAccounts([...accounts, account])
  sessionStorage.setItem(attendeeSessionKey, account.id)
  return account
}

export async function loginLocalAccount(emailValue: string, password: string) {
  const email = emailValue.trim().toLowerCase()
  const account = listLocalAccounts().find((candidate) => candidate.email === email)
  if (!account || await derivePassword(password, account.passwordSalt) !== account.passwordHash) throw new Error('E-mail ou senha incorretos.')
  sessionStorage.setItem(attendeeSessionKey, account.id)
  return account
}

export function getCurrentLocalAccount() {
  const id = sessionStorage.getItem(attendeeSessionKey)
  return id ? listLocalAccounts().find((account) => account.id === id) ?? null : null
}

export function logoutLocalAccount() {
  sessionStorage.removeItem(attendeeSessionKey)
}

export function updateInvitationStatus(id: string, status: InvitationStatus) {
  const now = new Date().toISOString()
  const accounts = listLocalAccounts().map((account) => account.id === id ? {
    ...account,
    invitationStatus: status,
    activatedAt: status === 'active' ? (account.activatedAt ?? now) : account.activatedAt,
    usedAt: status === 'used' ? now : status === 'active' ? null : account.usedAt,
  } : account)
  saveAccounts(accounts)
}

export async function loginLocalAdmin(emailValue: string, password: string) {
  if (defaultAdmin.email !== emailValue.trim().toLowerCase() || await derivePassword(password, defaultAdmin.passwordSalt) !== defaultAdmin.passwordHash) throw new Error('E-mail ou senha incorretos.')
  sessionStorage.setItem(adminSessionKey, 'active')
  return defaultAdmin.email
}

export function isLocalAdminAuthenticated() {
  return sessionStorage.getItem(adminSessionKey) === 'active'
}

export function getLocalAdminEmail() {
  return defaultAdmin.email
}

export function logoutLocalAdmin() {
  sessionStorage.removeItem(adminSessionKey)
}
