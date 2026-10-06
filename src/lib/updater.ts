/**
 * Atualizador do app: compara a build em uso com a publicada (version.json, gerado
 * a cada deploy pelo vite.config.ts) e, quando o usuário aceita, limpa o cache de
 * execução e recarrega forçando a versão nova.
 *
 * A atualização NÃO toca em localStorage nem em IndexedDB: é lá que ficam as
 * anamneses. Só service workers e o Cache Storage são apagados.
 */

export interface VersionInfo {
  version: string
  build: string
  builtAt?: string
}

/** Valida o conteúdo de version.json; devolve null se não tiver o formato esperado. */
export function parseVersionInfo(data: unknown): VersionInfo | null {
  if (!data || typeof data !== 'object') return null
  const { version, build, builtAt } = data as Record<string, unknown>
  if (typeof version !== 'string' || !version.trim()) return null
  if (typeof build !== 'string' || !build.trim()) return null
  return {
    version: version.trim(),
    build: build.trim(),
    builtAt: typeof builtAt === 'string' ? builtAt : undefined,
  }
}

/**
 * Oferece a atualização quando a build publicada é diferente da em uso e ainda não
 * foi recusada ("Agora não") nem tentada nesta sessão (se o CDN ainda serve a build
 * antiga depois de atualizar, não vale pedir de novo em loop).
 */
export function shouldOfferUpdate(
  currentBuild: string,
  remote: VersionInfo,
  ignoredBuilds: readonly string[],
): boolean {
  if (remote.build === currentBuild) return false
  return !ignoredBuilds.includes(remote.build)
}

// ----------------------------------------------------------- memória da sessão

const KEY_RECUSADA = 'anamnese:update:recusada'
const KEY_TENTADA = 'anamnese:update:tentada'

export interface SessionMemory {
  get(key: string): string | null
  set(key: string, value: string): void
}

const inMemory = new Map<string, string>()

/** sessionStorage com reserva em memória (modo privado, dados bloqueados). */
export function browserSession(): SessionMemory {
  return {
    get(key) {
      try {
        return window.sessionStorage.getItem(key) ?? inMemory.get(key) ?? null
      } catch {
        return inMemory.get(key) ?? null
      }
    },
    set(key, value) {
      inMemory.set(key, value)
      try {
        window.sessionStorage.setItem(key, value)
      } catch {
        // segue só em memória
      }
    },
  }
}

function ignoredBuilds(session: SessionMemory): string[] {
  return [session.get(KEY_RECUSADA), session.get(KEY_TENTADA)].filter((b): b is string => Boolean(b))
}

/** "Agora não": não pergunta de novo por esta build até o app ser aberto outra vez. */
export function dismissUpdate(build: string, session: SessionMemory = browserSession()): void {
  session.set(KEY_RECUSADA, build)
}

// ---------------------------------------------------------------- verificação

export interface CheckDeps {
  currentBuild: string
  /** URL base do app (ex.: /anamnese-pwa/). */
  baseUrl: string
  isOnline: () => boolean
  fetch: (url: string, init: { cache: 'no-store'; signal?: AbortSignal }) => Promise<{
    ok: boolean
    json: () => Promise<unknown>
  }>
  now: () => number
  session: SessionMemory
  timeoutMs?: number
}

/**
 * Consulta o version.json publicado. Devolve a versão nova a oferecer, ou null
 * quando não há nada a oferecer — inclusive sem rede ou se a consulta falhar
 * (404 no desenvolvimento, JSON inválido, timeout): nesses casos o app segue normal.
 */
export async function checkForUpdate(deps: CheckDeps): Promise<VersionInfo | null> {
  if (!deps.isOnline()) return null

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), deps.timeoutMs ?? 5000) : null
  try {
    const url = `${deps.baseUrl.replace(/\/?$/, '/')}version.json?t=${deps.now()}`
    const response = await deps.fetch(url, { cache: 'no-store', signal: controller?.signal })
    if (!response.ok) return null
    const remote = parseVersionInfo(await response.json())
    if (!remote) return null
    return shouldOfferUpdate(deps.currentBuild, remote, ignoredBuilds(deps.session)) ? remote : null
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function browserCheckDeps(): CheckDeps {
  return {
    currentBuild: typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev',
    baseUrl: import.meta.env.BASE_URL,
    isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
    fetch: (url, init) => window.fetch(url, init),
    now: () => Date.now(),
    session: browserSession(),
  }
}

// ------------------------------------------------------------------ aplicação

export interface ApplyDeps {
  serviceWorker?: { getRegistrations(): Promise<ReadonlyArray<{ unregister(): Promise<boolean> }>> }
  caches?: { keys(): Promise<string[]>; delete(key: string): Promise<boolean> }
  /** Endereço atual (origem + caminho + hash), sem parâmetros de busca. */
  location: { origin: string; pathname: string; hash: string }
  replace: (url: string) => void
  session: SessionMemory
}

/** Endereço de recarga: parâmetro novo na URL para o navegador não usar o index.html em cache. */
export function reloadUrl(location: ApplyDeps['location'], build: string): string {
  return `${location.origin}${location.pathname}?v=${encodeURIComponent(build)}${location.hash}`
}

/**
 * Limpa o cache de execução (service workers e Cache Storage) e recarrega o app
 * pelo endereço com parâmetro novo, forçando a versão publicada.
 */
export async function applyUpdate(remote: VersionInfo, deps: ApplyDeps): Promise<void> {
  // Registra a tentativa antes de recarregar: se o CDN ainda servir a build antiga,
  // o app não entra em ciclo de pedidos de atualização.
  deps.session.set(KEY_TENTADA, remote.build)

  try {
    const registrations = (await deps.serviceWorker?.getRegistrations()) ?? []
    await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)))
  } catch {
    // sem service worker ou bloqueado: segue para o cache
  }

  try {
    const keys = (await deps.caches?.keys()) ?? []
    await Promise.all(keys.map((key) => deps.caches!.delete(key).catch(() => false)))
  } catch {
    // Cache Storage indisponível: o recarregamento com parâmetro novo ainda ajuda
  }

  deps.replace(reloadUrl(deps.location, remote.build))
}

export function browserApplyDeps(): ApplyDeps {
  return {
    serviceWorker: 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
    caches: typeof caches !== 'undefined' ? caches : undefined,
    location: window.location,
    replace: (url) => window.location.replace(url),
    session: browserSession(),
  }
}

/** Remove o parâmetro ?v= do endereço depois de uma atualização, sem recarregar. */
export function cleanUpdateParam(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('v')) return
  url.searchParams.delete('v')
  window.history.replaceState(window.history.state, '', url.toString())
}
