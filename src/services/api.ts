import { supabase } from '../lib/supabase'
import type { PublicPost } from '../types/domain'

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status = 500) { super(message); this.status = status }
}

export async function getPublicPosts(slug?: string) {
  if (!supabase) return [] as PublicPost[]
  let query = supabase.from('posts').select('slug,title,excerpt,body_markdown,cover_image,published_at').eq('status', 'published').order('published_at', { ascending: false })
  if (slug) query = query.eq('slug', slug)
  const { data, error } = await query
  if (error) throw new ApiError('Não foi possível carregar as novidades.')
  return (data ?? []) as PublicPost[]
}
