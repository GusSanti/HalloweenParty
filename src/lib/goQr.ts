const createEndpoint = 'https://api.qrserver.com/v1/create-qr-code/'
const readEndpoint = 'https://api.qrserver.com/v1/read-qr-code/'
const maxReadBytes = 1_048_576

export function createQrImageUrl(payload: string, size = 480) {
  const params = new URLSearchParams({ data: payload, size: `${size}x${size}`, format: 'png', ecc: 'M', qzone: '4', color: '0-0-0', bgcolor: '240-232-220' })
  return `${createEndpoint}?${params.toString()}`
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally { URL.revokeObjectURL(url) }
}

async function prepareQrPhoto(file: File) {
  if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) throw new Error('Use uma imagem PNG, JPG ou GIF.')
  if (file.size < maxReadBytes) return file
  const image = await loadImage(file)
  const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
  const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', .72))
  if (!compressed || compressed.size >= maxReadBytes) throw new Error('A foto ficou grande demais. Aproxime a câmera do QR Code e tente novamente.')
  return new File([compressed], 'qr-code.jpg', { type: 'image/jpeg' })
}

export async function readQrImage(file: File) {
  const prepared = await prepareQrPhoto(file)
  const body = new FormData()
  body.set('file', prepared)
  const response = await fetch(`${readEndpoint}?outputformat=json`, { method: 'POST', body })
  if (!response.ok) throw new Error('O serviço de leitura não respondeu. Tente novamente.')
  const result = await response.json() as Array<{ symbol?: Array<{ data?: string | null; error?: string | null }> }>
  const symbol = result[0]?.symbol?.[0]
  if (!symbol?.data || symbol.error) throw new Error('Nenhum QR Code válido foi encontrado na imagem.')
  return symbol.data.trim()
}
