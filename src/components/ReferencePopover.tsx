import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReferenceEvaluation, ReferenceInfoDefinition } from '../lib/references'
import {
  computePopoverPlacement,
  getEstimatedPopoverHeight,
  type PopoverPlacementResult,
} from '../lib/popoverPlacement'

interface Props {
  evaluation: ReferenceEvaluation | null
  referenceInfo: ReferenceInfoDefinition | null
  fieldLabel: string
  fieldId: string
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function ReferencePopover({ evaluation, referenceInfo, fieldLabel }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [coords, setCoords] = useState<PopoverPlacementResult | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number | null>(null)
  const titleId = useId()

  const status = evaluation?.status
  const statusLabel =
    status === 'normal' ? 'Normal' : status === 'alerta' ? 'Alerta' : status === 'alterado' ? 'Alterado' : 'Referência'

  // Atualiza coordenadas para desktop quando abrir ou redimensionar/rolar
  const updateCoords = () => {
    if (!triggerRef.current || typeof window === 'undefined') return
    const rect = triggerRef.current.getBoundingClientRect()

    const estimatedHeight = getEstimatedPopoverHeight(evaluation, referenceInfo)
    const measuredHeight = popoverRef.current ? popoverRef.current.scrollHeight : null

    const nextCoords = computePopoverPlacement({
      triggerRect: rect,
      windowInnerWidth: window.innerWidth,
      windowInnerHeight: window.innerHeight,
      measuredContentHeight: measuredHeight,
      estimatedHeight,
    })

    setCoords((prev) => {
      if (
        prev &&
        prev.top === nextCoords.top &&
        prev.bottom === nextCoords.bottom &&
        prev.left === nextCoords.left &&
        prev.placeAbove === nextCoords.placeAbove &&
        prev.maxHeight === nextCoords.maxHeight
      ) {
        return prev
      }
      return nextCoords
    })
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
    }, 240)
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

  // Recalcula coordenadas antes do paint para evitar saltos ou flickering visual
  useIsomorphicLayoutEffect(() => {
    if (isOpen) {
      updateCoords()
    }
  }, [isOpen, evaluation, referenceInfo])

  // Fecha com tecla Escape ou clique fora, e mantém coordenadas sincronizadas
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

    const onScrollOrResize = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      // Se o botão de trigger foi completamente rolado para fora da visão, fecha o popover
      if (rect.bottom < -20 || rect.top > window.innerHeight + 20) {
        handleClose()
        return
      }
      updateCoords()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true })
    window.addEventListener('resize', onScrollOrResize, { passive: true })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
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
              data-place-above={
                coords && typeof window !== 'undefined' && window.innerWidth > 640
                  ? coords.placeAbove
                  : undefined
              }
              style={
                coords && typeof window !== 'undefined' && window.innerWidth > 640
                  ? {
                      position: 'fixed',
                      top: coords.top !== undefined ? `${coords.top}px` : 'auto',
                      bottom: coords.bottom !== undefined ? `${coords.bottom}px` : 'auto',
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
