import type { ReferenceEvaluation, ReferenceInfoDefinition } from './references'

export interface PopoverPlacementOptions {
  triggerRect: {
    top: number
    bottom: number
    left: number
    right: number
  }
  windowInnerWidth: number
  windowInnerHeight: number
  measuredContentHeight?: number | null
  estimatedHeight?: number
}

export interface PopoverPlacementResult {
  top?: number
  bottom?: number
  left: number
  placeAbove: boolean
  maxHeight: number
  availableSpace: number
  contentHeight: number
}

/**
 * Estima a altura necessária do popover baseando-se no conteúdo real a ser exibido.
 * Evita saltos visuais (layout shift / flipping) entre o estado pré-mount e pós-mount.
 */
export function getEstimatedPopoverHeight(
  evaluation: ReferenceEvaluation | null,
  referenceInfo: ReferenceInfoDefinition | null,
): number {
  const ranges = evaluation?.ranges ?? referenceInfo?.ranges ?? []
  const hasEvaluation = Boolean(evaluation)
  const hasClinicalNote = Boolean(evaluation?.clinicalNote ?? referenceInfo?.clinicalNote)

  // Overhead básico: padding (32px), header c/ título e fechar (36px),
  // subtítulo da diretriz (20px), caixa de recomendações (90px) e gaps (48px)
  let height = 226

  // Banner de valor atual vs hint de campo vazio
  height += hasEvaluation ? 72 : 36

  // Tabela de faixas: cabeçalho da tabela (30px) + cada linha (~34px)
  if (ranges.length > 0) {
    height += 30 + ranges.length * 34
  }

  // Nota clínica semiológica
  if (hasClinicalNote) {
    height += 48
  }

  return height
}

/**
 * Calcula a posição e dimensão vertical ideal do popover, garantindo que a tabela
 * nunca seja truncada ou encolhida indevidamente por restrições de espaço livre.
 */
export function computePopoverPlacement({
  triggerRect,
  windowInnerWidth,
  windowInnerHeight,
  measuredContentHeight,
  estimatedHeight = 460,
}: PopoverPlacementOptions): PopoverPlacementResult {
  const popoverWidth = Math.min(360, windowInnerWidth - 24)
  const offset = 8
  const margin = 16

  // Espaço disponível real entre o trigger e as margens de resguardo da viewport
  const spaceBelow = windowInnerHeight - triggerRect.bottom - offset - margin
  const spaceAbove = triggerRect.top - offset - margin

  // Altura requerida pelo conteúdo (usa medição real do scrollHeight se disponível, ou estimativa precisa)
  const contentHeight =
    measuredContentHeight && measuredContentHeight > 0
      ? measuredContentHeight
      : estimatedHeight

  // Abre para cima quando o espaço abaixo for insuficiente para comportar o conteúdo completo
  // e acima houver mais espaço livre do que abaixo
  const placeAbove = spaceBelow < contentHeight && spaceAbove > spaceBelow

  // Alinhamento horizontal: alinha com a borda direita do trigger, respeitando margens
  let left = triggerRect.right - popoverWidth
  if (left < 12) left = 12
  if (left + popoverWidth > windowInnerWidth - 12) {
    left = windowInnerWidth - popoverWidth - 12
  }

  // Altura máxima permitida dentro do espaço disponível do lado escolhido
  const availableSpace = placeAbove ? spaceAbove : spaceBelow
  // Teto máximo de 680px para comportar até as maiores tabelas sem rolagem artificial em monitores altos
  const maxHeight = Math.min(680, Math.max(120, availableSpace))

  const top = placeAbove ? undefined : triggerRect.bottom + offset
  const bottom = placeAbove ? windowInnerHeight - triggerRect.top + offset : undefined

  return {
    top,
    bottom,
    left,
    placeAbove,
    maxHeight,
    availableSpace,
    contentHeight,
  }
}
