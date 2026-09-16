import jsQR from 'jsqr'

const MAX_FILE_SIZE = 15 * 1024 * 1024
const SUPPORTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
])
const INVITATION_CODE = /^(?:H26:)?(H26-(?:[A-Z2-9]{4}-[A-Z2-9]{4}|[A-F0-9]{32}))$/

type QrImageSource = CanvasImageSource & { width: number; height: number }
type DetectedBarcode = { rawValue?: string }
type BarcodeDetectorInstance = { detect(source: ImageBitmapSource): Promise<DetectedBarcode[]> }
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance

/** Convert both current and legacy QR payloads to the code stored in the database. */
export function normalizeInvitationQr(value: string) {
  const normalized = value.replace(/^\uFEFF/, '').trim().toUpperCase()
  return INVITATION_CODE.exec(normalized)?.[1] ?? null
}

function decodePixels(data: Uint8ClampedArray, width: number, height: number) {
  return jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null
}

/** Exported separately so generated codes can be verified without a camera. */
export function readInvitationCodeFromPixels(data: Uint8ClampedArray, width: number, height: number) {
  const value = decodePixels(data, width, height)
  return value ? normalizeInvitationQr(value) : null
}

async function readWithNativeDetector(source: QrImageSource) {
  const Detector = (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
  if (!Detector) return { code: null, foundQr: false }
  try {
    const barcodes = await new Detector({ formats: ['qr_code'] }).detect(source)
    for (const barcode of barcodes) {
      const rawValue = barcode.rawValue?.trim()
      if (!rawValue) continue
      const code = normalizeInvitationQr(rawValue)
      if (code) return { code, foundQr: true }
    }
    return { code: null, foundQr: barcodes.length > 0 }
  } catch {
    // BarcodeDetector is only an optimization. jsQR remains the cross-browser fallback.
    return { code: null, foundQr: false }
  }
}

interface ScanRegion {
  x: number
  y: number
  width: number
  height: number
  maxDimension: number
}

function scanRegions(source: QrImageSource) {
  const { width, height } = source
  const regions: ScanRegion[] = [
    { x: 0, y: 0, width, height, maxDimension: 2400 },
    { x: width * .1, y: height * .1, width: width * .8, height: height * .8, maxDimension: 2200 },
    { x: width * .2, y: height * .2, width: width * .6, height: height * .6, maxDimension: 2000 },
    // Overlapping quadrants recover a small QR Code even when it is off-centre.
    { x: 0, y: 0, width: width * .65, height: height * .65, maxDimension: 1800 },
    { x: width * .35, y: 0, width: width * .65, height: height * .65, maxDimension: 1800 },
    { x: 0, y: height * .35, width: width * .65, height: height * .65, maxDimension: 1800 },
    { x: width * .35, y: height * .35, width: width * .65, height: height * .65, maxDimension: 1800 },
  ]

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Não foi possível abrir a imagem neste navegador.')

  let foundQr = false
  for (const region of regions) {
    const scale = Math.min(1, region.maxDimension / Math.max(region.width, region.height))
    canvas.width = Math.max(1, Math.round(region.width * scale))
    canvas.height = Math.max(1, Math.round(region.height * scale))
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(
      source,
      region.x, region.y, region.width, region.height,
      0, 0, canvas.width, canvas.height,
    )
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const rawValue = decodePixels(pixels.data, pixels.width, pixels.height)
    if (rawValue) {
      foundQr = true
      const code = normalizeInvitationQr(rawValue)
      if (code) return { code, foundQr }
    }
  }
  return { code: null, foundQr }
}

async function loadImage(file: File): Promise<{ source: QrImageSource; close: () => void }> {
  if ('createImageBitmap' in globalThis) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bitmap, close: () => bitmap.close() }
    } catch {
      // Some Safari versions expose createImageBitmap but cannot decode camera formats with it.
    }
  }

  const url = URL.createObjectURL(file)
  const image = new Image()
  image.decoding = 'async'
  try {
    image.src = url
    await image.decode()
    return {
      source: Object.assign(image, { width: image.naturalWidth, height: image.naturalHeight }),
      close: () => URL.revokeObjectURL(url),
    }
  } catch {
    URL.revokeObjectURL(url)
    throw new Error('Não foi possível abrir a foto. Tente novamente usando JPG ou PNG.')
  }
}

// Decode on the device: ticket credentials and photos never leave the browser.
export async function readQrImage(file: File) {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type) || file.size > MAX_FILE_SIZE)
    throw new Error('Use uma imagem PNG, JPG, HEIC, GIF ou WebP de até 15 MB.')

  const { source, close } = await loadImage(file)
  try {
    if (!source.width || !source.height)
      throw new Error('A foto está vazia ou corrompida. Tire outra foto e tente novamente.')

    const nativeResult = await readWithNativeDetector(source)
    if (nativeResult.code) return nativeResult.code

    const fallbackResult = scanRegions(source)
    if (fallbackResult.code) return fallbackResult.code
    if (nativeResult.foundQr || fallbackResult.foundQr)
      throw new Error('O QR Code foi lido, mas não pertence a um convite deste evento.')
    throw new Error('Nenhum QR Code foi encontrado. Mantenha a câmera firme, evite reflexos e enquadre o código inteiro.')
  } finally {
    close()
  }
}
