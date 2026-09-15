export interface GalleryImage {
  id: string
  src: string
  alt: string
  caption?: string
  year?: number
  aspectRatio: 'portrait' | 'landscape' | 'wide'
}

export const localGallery: GalleryImage[] = [
  {
    id: 'cartaz-2026',
    src: '/images/event/halloween-party-2026.png',
    alt: 'Cartaz preto e branco do Halloween Party com boca de vampiro, data e local do evento',
    caption: 'Cartaz oficial',
    year: 2026,
    aspectRatio: 'portrait',
  },
  {
    id: 'vale-verde-area-externa',
    src: '/images/event/vale-verde-area-externa.jpg',
    alt: 'Área externa do Vale Verde com varanda coberta, jardim e estrutura do espaço',
    caption: 'Vale Verde · área externa',
    year: 2026,
    aspectRatio: 'landscape',
  },
  {
    id: 'vale-verde-espaco-coberto',
    src: '/images/event/vale-verde-espaco-coberto.jpg',
    alt: 'Espaço coberto do Vale Verde com salão aberto e área ampla para o evento',
    caption: 'Vale Verde · espaço coberto',
    year: 2026,
    aspectRatio: 'landscape',
  },
]
