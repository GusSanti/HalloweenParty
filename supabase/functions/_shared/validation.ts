export function cleanPhone(value: string) { return value.replace(/\D/g, '') }
export function isEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254 }
export function asObject(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_body'); return value as Record<string, unknown> }
