import { useEffect, useRef } from 'react'

/**
 * Faz o botão Voltar (do aparelho ou do navegador) fechar popups, diálogos e a
 * gaveta do menu em vez de sair da tela: cada overlay aberto ganha uma entrada
 * no histórico e o Voltar consome a do topo.
 *
 * - Fechar por outro caminho (X, Escape, clique fora, botão) remove a própria
 *   entrada com history.back(), para o histórico não acumular entradas.
 * - Quem for navegar enquanto há overlay aberto deve chamar dismissOverlays()
 *   antes, para o histórico ficar limpo.
 */

const MARK = '__overlay'

interface Entry {
  id: number
  close: () => void
}

/** Pontos de contato com o navegador, injetáveis para teste. */
export interface HistoryEnv {
  history: Pick<History, 'pushState' | 'go' | 'state'>
  addPopstate: (listener: () => void) => void
  schedule: (callback: () => void, delay: number) => unknown
}

let env: HistoryEnv | null = null
const stack: Entry[] = []
let ignoredPops = 0
let waiting: Array<() => void> = []
let nextId = 1

function getEnv(): HistoryEnv | null {
  if (env) return env
  if (typeof window === 'undefined') return null
  env = {
    history: window.history,
    addPopstate: (listener) => window.addEventListener('popstate', listener),
    schedule: (callback, delay) => window.setTimeout(callback, delay),
  }
  env.addPopstate(onPopState)
  return env
}

function onPopState() {
  if (ignoredPops > 0) {
    ignoredPops -= 1
  } else {
    stack.pop()?.close()
  }
  const done = waiting
  waiting = []
  done.forEach((resolve) => resolve())
}

function markerOf(entry: Entry): boolean {
  const state = env?.history.state as Record<string, unknown> | null
  return state?.[MARK] === entry.id
}

function push(entry: Entry) {
  const e = getEnv()
  if (!e) return
  const current = (e.history.state ?? {}) as Record<string, unknown>
  e.history.pushState({ ...current, [MARK]: entry.id }, '')
  stack.push(entry)
}

/** Remove a entrada de um overlay que fechou por outro caminho que não o Voltar. */
function release(entry: Entry) {
  const index = stack.indexOf(entry)
  if (index === -1) return
  const wasTop = index === stack.length - 1
  stack.splice(index, 1)
  // Só volta no histórico se a entrada ainda está no topo: se alguém já navegou
  // (ou trocou o state), voltar levaria a um lugar errado.
  if (wasTop && markerOf(entry)) {
    ignoredPops += 1
    env?.history.go(-1)
  }
}

/**
 * Fecha silenciosamente todos os overlays e espera o histórico voltar ao ponto
 * anterior. Use antes de navegar para outra rota.
 */
export function dismissOverlays(): Promise<void> {
  const e = getEnv()
  const count = stack.length
  if (!e || count === 0) return Promise.resolve()

  const closing = stack.splice(0, count)
  ignoredPops += 1
  return new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    waiting.push(finish)
    // Se o popstate não vier, segue em frente em vez de travar a navegação.
    e.schedule(() => {
      if (!settled && ignoredPops > 0) ignoredPops -= 1
      finish()
    }, 400)
    e.history.go(-count)
    closing.forEach((entry) => entry.close())
  })
}

/** Ponto de entrada para testes: troca o ambiente e zera o estado. */
export function __setHistoryEnvForTest(next: HistoryEnv | null) {
  env = next
  stack.length = 0
  ignoredPops = 0
  waiting = []
  nextId = 1
  if (next) next.addPopstate(onPopState)
}

/** Dispara o popstate manualmente (testes). */
export const __popStateForTest = onPopState

/**
 * Registra um overlay aberto. Devolve a função que o remove quando ele fecha por
 * outro caminho que não o Voltar. É o núcleo do hook, separado para ser testado.
 */
export function registerOverlay(close: () => void): () => void {
  const entry: Entry = { id: nextId++, close }
  const e = getEnv()
  // Adia o push: no StrictMode (desenvolvimento) o efeito monta, desmonta e
  // monta de novo, e um push/back imediato deixaria entradas sobrando.
  let cancelled = false
  e?.schedule(() => {
    if (!cancelled) push(entry)
  }, 0)

  return () => {
    cancelled = true
    release(entry)
  }
}

export function useBackToClose(aberto: boolean, fechar: () => void) {
  const fecharRef = useRef(fechar)
  fecharRef.current = fechar

  useEffect(() => {
    if (!aberto) return
    return registerOverlay(() => fecharRef.current())
  }, [aberto])
}
