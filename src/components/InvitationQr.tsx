import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
export function InvitationQr({ code }: { code: string }) {
  const [src, setSrc] = useState('')
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    void QRCode.toDataURL('H26:' + code, { width: 480, margin: 4, errorCorrectionLevel: 'M' })
      .then(value => { if (active) setSrc(value) })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [code])
  return error ? <p>Não foi possível gerar a imagem. Informe o código à portaria.</p>
    : src ? <img src={src} alt="QR Code do seu convite" /> : <p>Preparando QR Code...</p>
}
