import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { readQrImage } from '../../lib/goQr'

export default function AdminQrReaderPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function read(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setLoading(true); setError('')
    try {
      const value = await readQrImage(file)
      navigate(`/admin/convites?busca=${encodeURIComponent(value.replace(/^H26:/, ''))}`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível ler o QR Code.') }
    finally { setLoading(false); event.target.value = '' }
  }

  return <section className="admin-content qr-reader-admin">
    <div className="admin-title"><div><span className="eyebrow">Portaria</span><h1>LER QR CODE</h1></div><span className="local-mode-badge">Leitura local</span></div>
    <div className="qr-reader-card">
      <div className="camera-mark" aria-hidden="true"><span /><i /></div>
      <h2>APONTE PARA O CONVITE</h2>
      <p>Abra a câmera, enquadre somente o QR Code e tire uma foto. Depois da leitura, o cadastro da pessoa será aberto com as mesmas opções de ativar ou dar baixa.</p>
      <input ref={inputRef} id="qr-photo" type="file" accept="image/png,image/jpeg,image/gif,image/webp" capture="environment" onChange={read} hidden />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={loading}>{loading ? 'Lendo QR Code...' : 'Abrir câmera e ler QR Code'}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
      <small>A foto é processada somente no seu dispositivo. Use PNG, JPG, GIF ou WebP de até 15 MB.</small>
    </div>
  </section>
}
