import { useEffect } from 'react'

/**
 * No celular, o teclado cobre a metade de baixo da tela e o campo em foco
 * costuma ficar embaixo dele. Este hook acompanha a visual viewport, marca
 * no <body> que o teclado está aberto e rola a página para manter o campo
 * ativo visível — entre o cabeçalho fixo e o topo do teclado.
 */

const KEYBOARD_THRESHOLD = 120
const GAP_ABOVE_KEYBOARD = 14
const GAP_BELOW_HEADER = 8

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

function isField(node: EventTarget | null): node is FieldElement {
  if (node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) return true
  // Checkbox e slider não abrem teclado — rolar por causa deles só atrapalha.
  return node instanceof HTMLInputElement && node.type !== 'checkbox' && node.type !== 'range'
}

export function useKeyboardAwareFields(): void {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    let raf = 0

    const keyboardHeight = () =>
      Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)

    const revealFocusedField = () => {
      const field = document.activeElement
      if (!isField(field)) return

      const headerHeight =
        document.querySelector('.form-header')?.getBoundingClientRect().height ?? 0
      const rect = field.getBoundingClientRect()
      const top = viewport.offsetTop + headerHeight + GAP_BELOW_HEADER
      const bottom = viewport.offsetTop + viewport.height - GAP_ABOVE_KEYBOARD

      let delta = 0
      if (rect.bottom > bottom) delta = rect.bottom - bottom
      else if (rect.top < top) delta = rect.top - top
      // Campo mais alto que o espaço livre: alinha o topo, que é onde se digita.
      if (delta > 0 && rect.height > bottom - top) delta = rect.top - top

      if (Math.abs(delta) > 2) window.scrollBy({ top: delta, behavior: 'smooth' })
    }

    const sync = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const height = keyboardHeight()
        const open = height > KEYBOARD_THRESHOLD
        document.body.dataset.keyboard = open ? 'open' : 'closed'
        document.body.style.setProperty('--keyboard-height', `${Math.round(height)}px`)
        if (open) revealFocusedField()
      })
    }

    const onFocusIn = (event: FocusEvent) => {
      if (!isField(event.target)) return
      // O teclado ainda está subindo: espera a viewport assentar.
      window.setTimeout(revealFocusedField, 250)
    }

    viewport.addEventListener('resize', sync)
    viewport.addEventListener('scroll', sync)
    document.addEventListener('focusin', onFocusIn)

    return () => {
      cancelAnimationFrame(raf)
      viewport.removeEventListener('resize', sync)
      viewport.removeEventListener('scroll', sync)
      document.removeEventListener('focusin', onFocusIn)
      delete document.body.dataset.keyboard
      document.body.style.removeProperty('--keyboard-height')
    }
  }, [])
}
