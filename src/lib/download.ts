/**
 * Entrega de arquivos gerados no navegador (PDF e ZIP do histórico).
 *
 * O jsPDF faz o download com um <a download> solto do DOM e um clique sintético
 * adiado por setTimeout. No Firefox para Android, dentro do app instalado
 * (PWA em tela cheia), esse caminho termina numa janela about:blank em vez de
 * baixar o arquivo. Por isso a entrega é feita aqui, de forma explícita:
 *
 *  - 'anchor': <a> real, anexado ao documento, clique nativo e síncrono, e a URL
 *    do blob viva por tempo suficiente para o gerenciador de downloads buscá-la;
 *  - 'share': folha de compartilhamento do sistema (iOS, onde o download de blob
 *    é frágil). O Firefox para Android não compartilha arquivos;
 *  - 'dialog': o app não tenta baixar sozinho e mostra um link real para o
 *    usuário tocar (clique confiável). Usado onde o download automático falha.
 */

export type DeliveryStrategy = 'anchor' | 'share' | 'dialog'

export interface DeliveryEnv {
  userAgent: string
  /** O app está aberto como aplicativo instalado (display-mode: standalone). */
  standalone: boolean
  /** navigator.canShare({ files }) é verdadeiro para um arquivo deste tipo. */
  canShareFiles: boolean
}

/** Tempo que a URL do blob continua válida depois do clique. */
export const BLOB_URL_LIFETIME_MS = 60_000

export function pickDeliveryStrategy(env: DeliveryEnv): DeliveryStrategy {
  const ua = env.userAgent
  const firefox = /Firefox|FxiOS/i.test(ua)
  const ios = /iPhone|iPad|iPod/i.test(ua)

  // Firefox (Android ou iOS) no app instalado: sem confirmação em aparelho de que
  // o download automático funcione, o caminho seguro é o link visível.
  if (firefox && env.standalone) return 'dialog'
  if (ios && env.canShareFiles) return 'share'
  return 'anchor'
}

export type DeliveryResult =
  | { method: 'anchor' | 'share' | 'cancelled' }
  | { method: 'dialog'; url: string; filename: string }

/** Pontos de contato com o navegador, injetáveis para teste. */
export interface DeliveryDeps {
  document: Pick<Document, 'createElement'> & { body: Pick<HTMLElement, 'appendChild' | 'removeChild'> }
  url: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>
  schedule: (callback: () => void, delay: number) => unknown
  navigator: {
    userAgent: string
    share?: (data: ShareData) => Promise<void>
    canShare?: (data: ShareData) => boolean
  }
  standalone: boolean
}

export function browserDeps(): DeliveryDeps {
  const standalone =
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return {
    document,
    url: URL,
    schedule: (callback, delay) => window.setTimeout(callback, delay),
    navigator,
    standalone,
  }
}

function makeFile(blob: Blob, filename: string): File | null {
  try {
    return new File([blob], filename, { type: blob.type })
  } catch {
    return null
  }
}

function canShareFile(deps: DeliveryDeps, file: File | null): boolean {
  if (!file) return false
  const { navigator: nav } = deps
  return typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })
}

/** Baixa o blob com um <a> real, anexado ao documento, e um clique nativo. */
export function downloadWithAnchor(blob: Blob, filename: string, deps: DeliveryDeps): void {
  const url = deps.url.createObjectURL(blob)
  const anchor = deps.document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  deps.document.body.appendChild(anchor)
  anchor.click()
  deps.document.body.removeChild(anchor)
  deps.schedule(() => deps.url.revokeObjectURL(url), BLOB_URL_LIFETIME_MS)
}

/**
 * Entrega o arquivo ao usuário. Deve ser chamada de dentro do toque no botão,
 * sem esperas (await) antes dela, para preservar o gesto do usuário.
 */
export async function deliverBlob(
  blob: Blob,
  filename: string,
  deps: DeliveryDeps = browserDeps(),
): Promise<DeliveryResult> {
  const file = makeFile(blob, filename)
  const strategy = pickDeliveryStrategy({
    userAgent: deps.navigator.userAgent,
    standalone: deps.standalone,
    canShareFiles: canShareFile(deps, file),
  })

  if (strategy === 'dialog') {
    return { method: 'dialog', url: deps.url.createObjectURL(blob), filename }
  }

  if (strategy === 'share' && file && deps.navigator.share) {
    try {
      await deps.navigator.share({ files: [file], title: filename })
      return { method: 'share' }
    } catch (error) {
      const name = (error as { name?: string } | null)?.name
      if (name === 'AbortError') return { method: 'cancelled' }
      // Sem gesto válido ou recusado pelo sistema: o link visível ainda funciona.
      return { method: 'dialog', url: deps.url.createObjectURL(blob), filename }
    }
  }

  downloadWithAnchor(blob, filename, deps)
  return { method: 'anchor' }
}
