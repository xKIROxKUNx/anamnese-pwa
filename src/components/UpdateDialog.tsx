import { useEffect, useRef } from 'react'
import type { VersionInfo } from '../lib/updater'
import { useBackToClose } from '../lib/useBackToClose'

interface Props {
  versao: VersionInfo
  atualizando: boolean
  erro: boolean
  onAtualizar: () => void
  onAgoraNao: () => void
}

export function UpdateDialog({ versao, atualizando, erro, onAtualizar, onAgoraNao }: Props) {
  const atualizarRef = useRef<HTMLButtonElement>(null)
  useBackToClose(true, onAgoraNao)

  useEffect(() => {
    atualizarRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !atualizando) onAgoraNao()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onAgoraNao, atualizando])

  return (
    <div
      className="dialog-backdrop dialog-backdrop--top"
      role="presentation"
      onClick={atualizando ? undefined : onAgoraNao}
    >
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="update-dialog-title"
        aria-describedby="update-dialog-text"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="update-dialog-title">Atualização disponível</h2>
        <p id="update-dialog-text">
          A versão <strong>{versao.version}</strong> do Anamnese está disponível. Ao atualizar, o app
          recarrega com a versão nova. Suas anamneses salvas não são afetadas.
        </p>
        {erro && (
          <p className="dialog__erro" role="alert">
            Não foi possível atualizar agora. Tente de novo.
          </p>
        )}
        <div className="dialog__actions">
          <button type="button" className="button" disabled={atualizando} onClick={onAgoraNao}>
            Agora não
          </button>
          <button
            type="button"
            className="button button--primary"
            ref={atualizarRef}
            disabled={atualizando}
            onClick={onAtualizar}
          >
            {atualizando ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>
      </div>
    </div>
  )
}
