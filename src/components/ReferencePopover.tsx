import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReferenceEvaluation, ReferenceInfoDefinition } from '../lib/references'

interface Props {
  evaluation: ReferenceEvaluation | null
  referenceInfo: ReferenceInfoDefinition | null
  fieldLabel: string
  fieldId: string
}

export function ReferencePopover({ evaluation, referenceInfo, fieldLabel }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [coords, setCoords] = useState<{
    top: number
    left: number
    placeAbove?: boolean
    maxHeight?: number
  } | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number | null>(null)
  const titleId = useId()

  const status = evaluation?.status
  const statusLabel =
    status === 'normal' ? 'Normal' : status === 'alerta' ? 'Alerta' : status === 'alterado' ? 'Alterado' : 'Referência'

  // Atualiza coordenadas para desktop quando abrir
  const updateCoords = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const popoverWidth = Math.min(360, window.innerWidth - 24)
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const placeAbove = spaceBelow < 320 && spaceAbove > spaceBelow

    // Alinhamento horizontal: tenta alinhar à direita do trigger, mantendo dentro da tela
    let left = rect.right - popoverWidth
    if (left < 12) left = 12
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12
    }

    // Calcula altura máxima dinamicamente para nunca vazar os limites da tela (topo ou rodapé)
    const maxHeight = placeAbove
      ? Math.min(520, Math.max(200, spaceAbove - 24))
      : Math.min(520, Math.max(200, spaceBelow - 24))

    const top = placeAbove ? rect.top - 8 : rect.bottom + 8

    setCoords({ top, left, placeAbove, maxHeight })
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    updateCoords()
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    if (isPinned) return
    timeoutRef.current = window.setTimeout(() => {
      setIsOpen(false)
    }, 180)
  }

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (isOpen && isPinned) {
      setIsOpen(false)
      setIsPinned(false)
    } else {
      updateCoords()
      setIsOpen(true)
      setIsPinned(true)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsPinned(false)
  }

  // Fecha com tecla Escape ou clique fora
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('scroll', updateCoords, { passive: true })
    window.addEventListener('resize', updateCoords, { passive: true })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('scroll', updateCoords)
      window.removeEventListener('resize', updateCoords)
    }
  }, [isOpen])

  // Ranges a exibir: do evaluation ou do info estático
  const ranges = evaluation?.ranges ?? referenceInfo?.ranges ?? []
  const title = evaluation?.rangesTitle ?? referenceInfo?.rangesTitle ?? `Valores de referência — ${fieldLabel}`
  const clinicalNote = evaluation?.clinicalNote ?? referenceInfo?.clinicalNote
  const recHint = evaluation?.futureRecommendationHint ?? referenceInfo?.defaultRecommendationHint

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="field__ref-badge-trigger"
        data-status={status ?? 'neutral'}
        data-active={isOpen}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Valores de referência para ${fieldLabel}: ${statusLabel}`}
        title={`Clique para ver valores de referência e classificação`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleTriggerClick}
      >
        <span className="field__ref-badge-icon" aria-hidden="true">
          i
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div className="ref-popover-portal-container">
            {/* Backdrop no mobile para fechar facilmente com um toque */}
            <div
              className="ref-popover__backdrop"
              onClick={handleClose}
              aria-hidden="true"
            />

            <div
              ref={popoverRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="ref-popover"
              data-status={status ?? 'neutral'}
              data-place-above={coords?.placeAbove}
              style={
                coords && window.innerWidth > 640
                  ? {
                      position: 'fixed',
                      top: coords.placeAbove ? 'auto' : `${coords.top}px`,
                      bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
                      left: `${coords.left}px`,
                      maxHeight: `${coords.maxHeight}px`,
                    }
                  : undefined
              }
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {/* Cabeçalho */}
              <div className="ref-popover__header">
                <div className="ref-popover__title-wrap">
                  <span className="ref-popover__badge-dot" data-status={status ?? 'neutral'} />
                  <h4 id={titleId} className="ref-popover__title">
                    {fieldLabel}
                  </h4>
                </div>
                <button
                  type="button"
                  className="ref-popover__close"
                  onClick={handleClose}
                  aria-label="Fechar informativo de referências"
                >
                  ✕
                </button>
              </div>

              {/* Subtítulo da diretriz */}
              <div className="ref-popover__source">{title}</div>

              {/* Banner do Valor Atual se preenchido */}
              {evaluation ? (
                <div className="ref-popover__current" data-status={status}>
                  <div className="ref-popover__current-top">
                    <span className="ref-popover__status-pill" data-status={status}>
                      {status === 'normal' && '🟢 '}
                      {status === 'alerta' && '🟡 '}
                      {status === 'alterado' && '🔴 '}
                      {evaluation.statusLabel}
                    </span>
                    <strong className="ref-popover__current-val">
                      {evaluation.currentValueFormatted}
                    </strong>
                  </div>
                  <div className="ref-popover__classification">
                    {evaluation.classification}
                  </div>
                </div>
              ) : (
                <div className="ref-popover__empty-hint">
                  Preencha o campo para obter a classificação imediata conforme os valores abaixo:
                </div>
              )}

              {/* Tabela de faixas de referência */}
              {ranges.length > 0 && (
                <div className="ref-popover__table">
                  <div className="ref-popover__table-header">
                    <span>Faixa</span>
                    <span>Classificação</span>
                  </div>
                  <div className="ref-popover__table-body">
                    {ranges.map((range, index) => (
                      <div
                        key={index}
                        className="ref-popover__row"
                        data-status={range.status}
                        data-current={Boolean(range.isCurrent)}
                      >
                        <div className="ref-popover__col-range">
                          <span className="ref-popover__row-dot" data-status={range.status} />
                          <code>{range.range}</code>
                        </div>
                        <div className="ref-popover__col-label">
                          <span>{range.label}</span>
                          {range.isCurrent && (
                            <span className="ref-popover__current-tag">Valor atual</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nota clínica semiológica */}
              {clinicalNote && (
                <div className="ref-popover__note">
                  <strong>Nota clínica:</strong> {clinicalNote}
                </div>
              )}

              {/* Slot para Recomendações Futuras */}
              <div className="ref-popover__rec-box">
                <div className="ref-popover__rec-header">
                  <span className="ref-popover__rec-icon">💡</span>
                  <span className="ref-popover__rec-title">Conduta &amp; Recomendações</span>
                  <span className="ref-popover__rec-badge">Preview</span>
                </div>
                <p className="ref-popover__rec-text">
                  {recHint ||
                    'Módulo de recomendações terapêuticas personalizadas para este parâmetro será habilitado em breve.'}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
