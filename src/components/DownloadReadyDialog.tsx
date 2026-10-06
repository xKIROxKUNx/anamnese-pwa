import { useEffect, useRef } from 'react'
import { useBackToClose } from '../lib/useBackToClose'

interface Props {
  title: string
  /** URL do blob já criada por lib/download.ts; é revogada ao fechar. */
  url: string
  filename: string
  blob: Blob
  onClose: () => void
}

/**
 * Rede de segurança do download: um link real, visível, que o usuário toca.
 * Um clique confiável num <a download> anexado à tela é tratado como download
 * normal até no Firefox para Android com o app instalado.
 */
export function DownloadReadyDialog({ title, url, filename, blob, onClose }: Props) {
  const linkRef = useRef<HTMLAnchorElement>(null)
  useBackToClose(true, onClose)

  const sharable = (() => {
    if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return null
    try {
      const file = new File([blob], filename, { type: blob.type })
      return navigator.canShare({ files: [file] }) ? file : null
    } catch {
      return null
    }
  })()

  useEffect(() => {
    linkRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => () => URL.revokeObjectURL(url), [url])

  const compartilhar = async () => {
    if (!sharable) return
    try {
      await navigator.share({ files: [sharable], title: filename })
    } catch {
      // Cancelado pelo usuário ou recusado pelo sistema: o link continua disponível.
    }
  }

  return (
    <div className="dialog-backdrop dialog-backdrop--top" role="presentation" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="download-dialog-title">{title}</h2>
        <p>
          O arquivo <strong>{filename}</strong> está pronto. Toque em <em>Baixar</em> para salvá-lo
          neste aparelho.
        </p>
        <div className="dialog__actions dialog__actions--stack">
          <a className="button button--primary" href={url} download={filename} ref={linkRef}>
            Baixar
          </a>
          {sharable && (
            <button type="button" className="button" onClick={compartilhar}>
              Compartilhar
            </button>
          )}
          <button type="button" className="button button--ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
