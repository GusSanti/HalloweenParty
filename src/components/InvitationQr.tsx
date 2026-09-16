import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { generateQrWithGoQr } from '../lib/goqr'
import { invitationQrPayload } from '../lib/qr'

export function InvitationQr({ code }: { code: string }) {
  const [src, setSrc] = useState('')
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    let objectUrl = ''
    const controller = new AbortController()
    const generate = async () => {
      try {
        const payload = invitationQrPayload(code)
        try {
          const image = await generateQrWithGoQr(payload, controller.signal)
          objectUrl = URL.createObjectURL(image)
          if (active) setSrc(objectUrl)
        } catch {
          if (!active) return
          const localImage = await QRCode.toDataURL(payload, { width: 480, margin: 4, errorCorrectionLevel: 'M' })
          if (active) setSrc(localImage)
        }
      } catch {
        if (active) setError(true)
      }
    }
    void generate()
    return () => {
      active = false
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [code])
  return error ? <p>Não foi possível gerar a imagem. Informe o código à portaria.</p>
    : src ? <img src={src} alt="QR Code do seu convite" /> : <p>Preparando QR Code...</p>
}
