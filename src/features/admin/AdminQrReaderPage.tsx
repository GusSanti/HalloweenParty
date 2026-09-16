import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { readQrImage, readQrVideoFrame } from '../../lib/qr'

export default function AdminQrReaderPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scanningRef = useRef(false)
  const requestRef = useRef<AbortController | null>(null)
  const cameraSessionRef = useRef(0)
  const [loading, setLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraStatus, setCameraStatus] = useState('')
  const [error, setError] = useState('')

  function stopCamera() {
    cameraSessionRef.current++
    scanningRef.current = false
    requestRef.current?.abort()
    requestRef.current = null
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
    setCameraStatus('')
  }

  useEffect(() => () => {
    cameraSessionRef.current++
    scanningRef.current = false
    requestRef.current?.abort()
    if (timerRef.current) clearTimeout(timerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  function openInvitation(code: string) {
    stopCamera()
    navigate(`/admin/convites?busca=${encodeURIComponent(code)}`)
  }

  async function scanCamera(attempt = 0) {
    if (!scanningRef.current || !videoRef.current) return
    const useRemoteReader = attempt === 8 || (attempt > 8 && (attempt - 8) % 20 === 0)
    requestRef.current = new AbortController()
    if (useRemoteReader) setCameraStatus('Confirmando a imagem com o leitor goQR...')
    try {
      const code = await readQrVideoFrame(videoRef.current, useRemoteReader, requestRef.current.signal)
      if (!scanningRef.current) return
      if (code) { openInvitation(code); return }
      setCameraStatus('Procurando QR Code — mantenha o código dentro do quadro.')
    } catch (cause) {
      if (!scanningRef.current) return
      setError(cause instanceof Error ? cause.message : 'Não foi possível ler o QR Code.')
      stopCamera()
      return
    }
    timerRef.current = setTimeout(() => { void scanCamera(attempt + 1) }, 350)
  }

  async function startCamera() {
    stopCamera()
    const cameraSession = cameraSessionRef.current
    setError(''); setCameraStatus('Abrindo a câmera...')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('')
      setError('Este navegador não permite leitura ao vivo. Use a opção de tirar ou enviar uma foto.')
      return
    }
    setCameraActive(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      if (cameraSession !== cameraSessionRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      if (!videoRef.current) throw new Error('Não foi possível preparar a visualização da câmera.')
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      scanningRef.current = true
      setCameraStatus('Procurando QR Code — mantenha o código dentro do quadro.')
      void scanCamera()
    } catch (cause) {
      stopCamera()
      const name = cause instanceof DOMException ? cause.name : ''
      if (name === 'NotAllowedError') setError('Permita o acesso à câmera nas configurações do navegador e tente novamente.')
      else if (name === 'NotFoundError') setError('Nenhuma câmera traseira foi encontrada. Use a opção de enviar uma foto.')
      else setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a câmera.')
    }
  }

  async function read(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    stopCamera()
    setLoading(true); setError('')
    try {
      const value = await readQrImage(file)
      openInvitation(value)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível ler o QR Code.') }
    finally { setLoading(false); event.target.value = '' }
  }

  return <section className="admin-content qr-reader-admin">
    <div className="admin-title"><div><span className="eyebrow">Portaria</span><h1>LER QR CODE</h1></div><span className="local-mode-badge">Local + goQR</span></div>
    <div className="qr-reader-card">
      {!cameraActive && <div className="camera-mark" aria-hidden="true"><span /><i /></div>}
      <div className="qr-live-scanner" hidden={!cameraActive}>
        <video ref={videoRef} muted playsInline aria-label="Imagem da câmera para leitura do QR Code" />
        <div className="qr-live-frame" aria-hidden="true" />
      </div>
      <h2>APONTE PARA O CONVITE</h2>
      <p>Escaneie ao vivo ou tire uma foto. Evite reflexos e mantenha o QR Code inteiro dentro do quadro.</p>
      <input ref={inputRef} id="qr-photo" type="file" accept="image/png,image/jpeg,image/heic,image/heif,image/gif,image/webp" capture="environment" onChange={read} hidden />
      <div className="qr-reader-actions">
        <button type="button" onClick={cameraActive ? stopCamera : startCamera} disabled={loading}>{cameraActive ? 'Fechar câmera' : 'Escanear ao vivo'}</button>
        <button className="secondary" type="button" onClick={() => inputRef.current?.click()} disabled={loading}>{loading ? 'Lendo QR Code...' : 'Tirar ou enviar foto'}</button>
      </div>
      {cameraStatus && <p className="qr-camera-status" role="status">{cameraStatus}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <small>A leitura começa no aparelho. Se necessário, uma imagem reduzida é enviada com HTTPS ao leitor goQR. Use PNG, JPG, HEIC, GIF ou WebP de até 15 MB.</small>
    </div>
  </section>
}
