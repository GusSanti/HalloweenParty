import { describe, expect, it } from 'vitest'
import { parseGoQrResponse } from './goqr'

describe('resposta da API goQR', () => {
  it('extrai o conteúdo reconhecido pela API', () => {
    expect(parseGoQrResponse([{
      type: 'qrcode',
      symbol: [{ seq: 0, data: 'H26:H26-0123456789ABCDEF0123456789ABCDEF', error: null }],
    }])).toBe('H26:H26-0123456789ABCDEF0123456789ABCDEF')
  })

  it('trata uma imagem sem QR Code como leitura vazia', () => {
    expect(parseGoQrResponse([{
      type: 'qrcode',
      symbol: [{ seq: 0, data: null, error: 'could not find a barcode' }],
    }])).toBeNull()
  })

  it('rejeita uma resposta inesperada em vez de confiar em dados externos', () => {
    expect(() => parseGoQrResponse({ data: 'H26:H26-FAKE' })).toThrow('Resposta inválida')
  })
})
