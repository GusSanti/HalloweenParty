export const eventConfig = {
  name: 'HALLOWEEN',
  date: '2026-10-24',
  location: 'Vale Verde',
  venueArea: 'Campo do Alencar',
  city: 'Abaeté',
  instagramUrl: 'https://instagram.com/halloween_abaete/',
  whatsappUrl: 'https://wa.me/553798702778',
  mapUrl: '',
  time: '20h30',
} as const

export function formatEventDate(value: string, style: 'short' | 'long' = 'short') {
  const date = new Date(value.length === 10 ? `${value}T12:00:00-03:00` : value)
  return new Intl.DateTimeFormat('pt-BR', style === 'long'
    ? { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }
    : { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' },
  ).format(date)
}
