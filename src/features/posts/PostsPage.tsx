import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicPosts } from '../../services/api'
import type { PublicPost } from '../../types/domain'

export default function PostsPage() {
  const [posts, setPosts] = useState<PublicPost[]>([]); const [loading, setLoading] = useState(true)
  useEffect(() => { getPublicPosts().then(setPosts).finally(() => setLoading(false)) }, [])
  return <main className="content-page posts-page"><p className="eyebrow">Novidades</p><h1>ARQUIVO</h1>{loading ? <p>Carregando novidades...</p> : posts.length === 0 ? <div className="archive-empty">Nenhuma novidade publicada.</div> : <div className="post-list">{posts.map((post, index) => <Link to={`/novidades/${post.slug}`} key={post.slug}><span>{String(index + 1).padStart(2, '0')}</span><div><time>{new Intl.DateTimeFormat('pt-BR').format(new Date(post.published_at))}</time><h2>{post.title}</h2><p>{post.excerpt}</p></div><b>↗</b></Link>)}</div>}</main>
}
