export type StaffRole = 'admin' | 'gate'

export interface PublicPost {
  slug: string
  title: string
  excerpt: string
  body_markdown: string
  cover_image: string | null
  published_at: string
}

export interface StaffSession {
  role: StaffRole
  active: boolean
  aal: 'aal1' | 'aal2'
  email: string
}
