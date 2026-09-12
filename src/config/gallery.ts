export interface GalleryImage {
  id: string
  src: string
  alt: string
  caption?: string
  year?: number
  aspectRatio: 'portrait' | 'landscape' | 'wide'
}

// Novas imagens reais podem ser adicionadas aqui para ampliar o carrossel.
export const localGallery: GalleryImage[] = [
  {
    id: 'cartaz-2026',
    src: '/images/event/halloween-party-2026.png',
    alt: 'Cartaz preto e branco do Halloween Party com boca de vampiro, data e local do evento',
    caption: 'Cartaz oficial',
    year: 2026,
    aspectRatio: 'portrait',
  },
]
