import jsQR from 'jsqr'
// Decode on the device: ticket credentials and photos never leave the browser.
export async function readQrImage(file: File) {
  if (!['image/png','image/jpeg','image/gif','image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024)
    throw new Error('Use uma imagem PNG, JPG, GIF ou WebP de até 15 MB.')
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Não foi possível abrir a imagem.')
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const value = jsQR(pixels.data, pixels.width, pixels.height)?.data.trim().toUpperCase()
    if (!value || !/^(H26:)?H26-([A-Z2-9]{4}-[A-Z2-9]{4}|[A-F0-9]{32})$/.test(value))
      throw new Error('Nenhum convite válido encontrado. Aproxime a câmera ou pesquise o código manualmente.')
    return value
  } finally { bitmap.close() }
}
