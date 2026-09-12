import { useEffect, useState } from 'react'
import { localGallery, type GalleryImage } from '../../config/gallery'
import { supabase } from '../../lib/supabase'

export function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>(localGallery)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [active, setActive] = useState<GalleryImage | null>(null)
  useEffect(() => {
    const client = supabase
    if (!client) return
    client.from('gallery_items').select('id,image_path,alt_text,caption,archive_year,aspect_ratio').eq('published', true).order('sort_order').then(({ data }) => {
      if (!data?.length) return
      const remote = data.map((item) => ({ id: item.id, src: client.storage.from('event-media').getPublicUrl(item.image_path).data.publicUrl, alt: item.alt_text, caption: item.caption ?? undefined, year: item.archive_year ?? undefined, aspectRatio: (item.aspect_ratio ?? 'landscape') as GalleryImage['aspectRatio'] }))
      setImages([...localGallery, ...remote])
    })
  }, [])
  useEffect(() => {
    if (!active) return
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setActive(null) }
    document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape)
  }, [active])
  if (!images.length) return <div className="gallery-empty"><span>H26</span><div><p>O arquivo fotográfico será aberto aqui.</p><small>Imagens reais do evento · sem cenas geradas</small></div></div>
  const image = images[currentIndex]
  const showPrevious = () => setCurrentIndex((index) => (index - 1 + images.length) % images.length)
  const showNext = () => setCurrentIndex((index) => (index + 1) % images.length)

  return <>
    <div className="gallery-slider">
      <figure className={image.aspectRatio}>
        <button className="gallery-image-button" type="button" onClick={() => setActive(image)} aria-label={`Ampliar: ${image.alt}`}>
          <img src={image.src} alt={image.alt} loading="eager" decoding="async" />
        </button>
        <figcaption><span>{image.caption ?? 'HALLOWEEN'}</span><span>{String(currentIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span></figcaption>
      </figure>
      <div className="gallery-controls" aria-label="Controles do carrossel">
        <div>
          {images.map((item, index) => <button className={index === currentIndex ? 'active' : ''} type="button" key={item.id} onClick={() => setCurrentIndex(index)} aria-label={`Mostrar slide ${index + 1}`} aria-current={index === currentIndex ? 'true' : undefined} />)}
        </div>
        {images.length > 1 && <nav aria-label="Navegar pelos slides"><button type="button" onClick={showPrevious} aria-label="Slide anterior">←</button><button type="button" onClick={showNext} aria-label="Próximo slide">→</button></nav>}
      </div>
    </div>
    {active && <div className="lightbox" role="dialog" aria-modal="true" aria-label="Cartaz ampliado" onClick={() => setActive(null)}><button type="button" onClick={() => setActive(null)} aria-label="Fechar cartaz">Fechar ×</button><img src={active.src} alt={active.alt} onClick={(event) => event.stopPropagation()} /><p>{active.caption ?? 'HALLOWEEN'} · {active.year ?? 'ARQUIVO'}</p></div>}
  </>
}
