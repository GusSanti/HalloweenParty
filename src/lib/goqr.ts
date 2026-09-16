const CREATE_ENDPOINT = 'https://api.qrserver.com/v1/create-qr-code/'
const READ_ENDPOINT = 'https://api.qrserver.com/v1/read-qr-code/?outputformat=json'
const MAX_UPLOAD_BYTES = 1_000_000
const REQUEST_TIMEOUT_MS = 12_000

function requestController(parent?: AbortSignal) {
  const controller = new AbortController()
  const abort = () => controller.abort(parent?.reason)
  if (parent?.aborted) abort()
  else parent?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  return {
    signal: controller.signal,
    close: () => {
      clearTimeout(timer)
      parent?.removeEventListener('abort', abort)
    },
  }
}

export function parseGoQrResponse(value: unknown) {
  if (!Array.isArray(value)) throw new Error('Resposta inválida do serviço de QR Code.')
  for (const barcode of value) {
    if (!barcode || typeof barcode !== 'object' || !('symbol' in barcode) || !Array.isArray(barcode.symbol)) continue
    for (const symbol of barcode.symbol) {
      if (!symbol || typeof symbol !== 'object') continue
      if ('data' in symbol && typeof symbol.data === 'string' && symbol.data.trim()) return symbol.data
    }
  }
  return null
}

export async function generateQrWithGoQr(payload: string, signal?: AbortSignal) {
  const body = new URLSearchParams({
    data: payload,
    size: '480x480',
    'charset-source': 'UTF-8',
    'charset-target': 'UTF-8',
    ecc: 'M',
    color: '000000',
    bgcolor: 'ffffff',
    qzone: '4',
    format: 'png',
  })
  const request = requestController(signal)
  try {
    const response = await fetch(CREATE_ENDPOINT, {
      method: 'POST',
      body,
      signal: request.signal,
      referrerPolicy: 'no-referrer',
    })
    if (!response.ok) throw new Error('O serviço de geração de QR Code está indisponível.')
    const image = await response.blob()
    if (image.type !== 'image/png' || image.size === 0)
      throw new Error('O serviço retornou uma imagem inválida.')
    return image
  } finally {
    request.close()
  }
}

export async function readQrWithGoQr(image: Blob, signal?: AbortSignal) {
  if (image.size >= MAX_UPLOAD_BYTES)
    throw new Error('A imagem preparada para leitura remota excede 1 MB.')
  const form = new FormData()
  form.append('file', image, 'qr-camera.jpg')
  const request = requestController(signal)
  try {
    const response = await fetch(READ_ENDPOINT, {
      method: 'POST',
      body: form,
      signal: request.signal,
      referrerPolicy: 'no-referrer',
    })
    if (!response.ok) throw new Error('O serviço de leitura de QR Code está indisponível.')
    return parseGoQrResponse(await response.json())
  } finally {
    request.close()
  }
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a foto.')), 'image/jpeg', quality)
  })
}

export async function prepareImageForGoQr(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível preparar a foto neste navegador.')

  for (const [maxDimension, quality] of [[1800, .88], [1600, .8], [1400, .72], [1200, .65]] as const) {
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))
    canvas.width = Math.max(1, Math.round(sourceWidth * scale))
    canvas.height = Math.max(1, Math.round(sourceHeight * scale))
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)
    const image = await canvasBlob(canvas, quality)
    if (image.size < MAX_UPLOAD_BYTES) return image
  }
  throw new Error('Não foi possível reduzir a foto para a leitura remota.')
}
