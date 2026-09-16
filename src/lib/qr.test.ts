import { describe, expect, it } from 'vitest'
import QRCode from 'qrcode'
import { invitationQrPayload, normalizeInvitationQr, readInvitationCodeFromPixels } from './qr'

const code = 'H26-0123456789ABCDEF0123456789ABCDEF'

function qrPixels(payload: string, scale = 5, margin = 4) {
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' })
  const width = (qr.modules.size + margin * 2) * scale
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255)
  for (let row = 0; row < qr.modules.size; row++) {
    for (let column = 0; column < qr.modules.size; column++) {
      if (!qr.modules.get(row, column)) continue
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const pixel = (((row + margin) * scale + y) * width + (column + margin) * scale + x) * 4
          pixels[pixel] = 0
          pixels[pixel + 1] = 0
          pixels[pixel + 2] = 0
        }
      }
    }
  }
  return { pixels, width }
}

describe('QR Code de convites', () => {
  it('normaliza o formato atual e o formato legado', () => {
    expect(normalizeInvitationQr(` H26:${code.toLowerCase()} `)).toBe(code)
    expect(normalizeInvitationQr('H26-ABCD-EFGH')).toBe('H26-ABCD-EFGH')
    expect(invitationQrPayload(code)).toBe(`H26:${code}`)
  })

  it('rejeita conteúdo que não seja um convite', () => {
    expect(normalizeInvitationQr('https://example.com')).toBeNull()
    expect(normalizeInvitationQr('H26:H26-../../ADMIN')).toBeNull()
  })

  it('lê os pixels de um QR igual ao gerado para o convidado', () => {
    const { pixels, width } = qrPixels(`H26:${code}`)
    expect(readInvitationCodeFromPixels(pixels, width, width)).toBe(code)
  })
})
