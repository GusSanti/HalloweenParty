import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link, useParams } from 'react-router-dom'
import { getPublicPosts } from '../../services/api'
import type { PublicPost } from '../../types/domain'

export default function PostDetailPage() {
  const { slug = '' } = useParams(); const [post, setPost] = useState<PublicPost | null | undefined>(undefined)
  useEffect(() => { getPublicPosts(slug).then((posts) => setPost(posts[0] ?? null)).catch(() => setPost(null)) }, [slug])
  if (post === undefined) return <main className="route-loading">Abrindo novidade...</main>
  if (!post) return <main className="error-page"><p>ARQUIVO</p><h1>Novidade não encontrada.</h1><Link to="/novidades">Voltar ao arquivo</Link></main>
  return <main className="content-page post-detail"><Link className="text-link" to="/novidades">← Arquivo</Link><time>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(post.published_at))}</time><h1>{post.title}</h1><p className="post-lead">{post.excerpt}</p>{post.cover_image && <img src={post.cover_image} alt="" />}<article><ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body_markdown}</ReactMarkdown></article></main>
}
