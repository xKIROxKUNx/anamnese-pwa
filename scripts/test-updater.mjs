import assert from 'node:assert/strict'
import {
  applyUpdate,
  checkForUpdate,
  dismissUpdate,
  parseVersionInfo,
  reloadUrl,
  shouldOfferUpdate,
} from '../src/lib/updater.ts'

console.log('🧪 Iniciando testes do atualizador (version.json)...')

const memory = () => {
  const data = new Map()
  return { get: (k) => data.get(k) ?? null, set: (k, v) => data.set(k, v), data }
}

const remoteInfo = { version: '1.3.0', build: 'bbbbbbb', builtAt: '2026-10-06T10:00:00Z' }

function makeCheckDeps(overrides = {}) {
  const calls = []
  return {
    calls,
    deps: {
      currentBuild: 'aaaaaaa',
      baseUrl: '/anamnese-pwa/',
      isOnline: () => true,
      fetch: async (url, init) => {
        calls.push({ url, init })
        return { ok: true, json: async () => remoteInfo }
      },
      now: () => 1234,
      session: memory(),
      ...overrides,
    },
  }
}

// 1. Formato do version.json
console.log('1. parseVersionInfo valida o formato...')
{
  assert.deepEqual(parseVersionInfo({ version: '1.3.0', build: 'abc', builtAt: 'x' }), {
    version: '1.3.0',
    build: 'abc',
    builtAt: 'x',
  })
  assert.equal(parseVersionInfo({ version: '1.3.0' }), null, 'sem build')
  assert.equal(parseVersionInfo({ build: 'abc' }), null, 'sem version')
  assert.equal(parseVersionInfo({ version: '', build: 'abc' }), null)
  assert.equal(parseVersionInfo(null), null)
  assert.equal(parseVersionInfo('texto'), null)
  assert.equal(parseVersionInfo({ version: 1, build: 2 }), null)
}

// 2. Quando oferecer
console.log('2. shouldOfferUpdate...')
{
  assert.equal(shouldOfferUpdate('aaaaaaa', remoteInfo, []), true, 'build diferente')
  assert.equal(shouldOfferUpdate('bbbbbbb', remoteInfo, []), false, 'mesma build')
  assert.equal(shouldOfferUpdate('aaaaaaa', remoteInfo, ['bbbbbbb']), false, 'build recusada ou já tentada')
  assert.equal(shouldOfferUpdate('aaaaaaa', remoteInfo, ['ccccccc']), true, 'recusou outra build, esta é nova')
}

// 3. Verificação
console.log('3. checkForUpdate...')
{
  // Há versão nova
  const a = makeCheckDeps()
  const found = await checkForUpdate(a.deps)
  assert.deepEqual(found, remoteInfo)
  assert.equal(a.calls.length, 1)
  assert.equal(a.calls[0].url, '/anamnese-pwa/version.json?t=1234', 'URL com parâmetro anti-cache')
  assert.equal(a.calls[0].init.cache, 'no-store')

  // Mesma build: nada a oferecer
  const same = makeCheckDeps({ currentBuild: 'bbbbbbb' })
  assert.equal(await checkForUpdate(same.deps), null)

  // Sem rede: nem tenta buscar
  const offline = makeCheckDeps({ isOnline: () => false })
  assert.equal(await checkForUpdate(offline.deps), null)
  assert.equal(offline.calls.length, 0, 'offline não faz requisição')

  // Falhas são silenciosas
  const falhaRede = makeCheckDeps({ fetch: async () => { throw new TypeError('Failed to fetch') } })
  assert.equal(await checkForUpdate(falhaRede.deps), null)
  const naoEncontrado = makeCheckDeps({ fetch: async () => ({ ok: false, json: async () => ({}) }) })
  assert.equal(await checkForUpdate(naoEncontrado.deps), null, '404 (ex.: modo de desenvolvimento)')
  const jsonInvalido = makeCheckDeps({ fetch: async () => ({ ok: true, json: async () => { throw new SyntaxError('x') } }) })
  assert.equal(await checkForUpdate(jsonInvalido.deps), null)
  const formatoErrado = makeCheckDeps({ fetch: async () => ({ ok: true, json: async () => ({ foo: 1 }) }) })
  assert.equal(await checkForUpdate(formatoErrado.deps), null)

  // Timeout: a requisição que não responde é abortada
  const lento = makeCheckDeps({
    timeoutMs: 20,
    fetch: (url, init) => new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('abortado', 'AbortError')))
    }),
  })
  assert.equal(await checkForUpdate(lento.deps), null)
}

// 4. "Agora não" vale pela sessão
console.log('4. "Agora não" não pergunta de novo nesta sessão...')
{
  const a = makeCheckDeps()
  assert.deepEqual(await checkForUpdate(a.deps), remoteInfo)
  dismissUpdate(remoteInfo.build, a.deps.session)
  assert.equal(await checkForUpdate(a.deps), null, 'ao voltar à tela inicial, não repete')

  // Sessão nova (app aberto outra vez): pergunta de novo
  const novaSessao = makeCheckDeps()
  assert.deepEqual(await checkForUpdate(novaSessao.deps), remoteInfo)

  // Publicou outra build depois de recusar: avisa da nova
  const outra = makeCheckDeps({ session: a.deps.session, fetch: async () => ({ ok: true, json: async () => ({ version: '1.3.1', build: 'ddddddd' }) }) })
  assert.equal((await checkForUpdate(outra.deps)).build, 'ddddddd')
}

// 5. Aplicar a atualização
console.log('5. applyUpdate limpa o cache de execução e recarrega...')
{
  const log = []
  const session = memory()
  const deps = {
    serviceWorker: {
      getRegistrations: async () => [
        { unregister: async () => (log.push('sw1'), true) },
        { unregister: async () => (log.push('sw2'), true) },
      ],
    },
    caches: {
      keys: async () => ['workbox-precache-v2', 'runtime'],
      delete: async (key) => (log.push(`cache:${key}`), true),
    },
    location: { origin: 'https://xkiroxkunx.github.io', pathname: '/anamnese-pwa/', hash: '#/' },
    replace: (url) => log.push(`replace:${url}`),
    session,
  }
  await applyUpdate(remoteInfo, deps)

  assert.deepEqual(
    log.filter((entry) => entry.startsWith('sw')).sort(),
    ['sw1', 'sw2'],
    'todos os service workers desregistrados',
  )
  assert.deepEqual(
    log.filter((entry) => entry.startsWith('cache:')).sort(),
    ['cache:runtime', 'cache:workbox-precache-v2'],
    'todos os caches apagados',
  )
  assert.equal(
    log.at(-1),
    'replace:https://xkiroxkunx.github.io/anamnese-pwa/?v=bbbbbbb#/',
    'recarrega por último, com parâmetro novo e mantendo a rota',
  )
  assert.equal(
    reloadUrl({ origin: 'https://x.io', pathname: '/a/', hash: '#/anamnese/geral/1' }, 'abc'),
    'https://x.io/a/?v=abc#/anamnese/geral/1',
  )

  // A tentativa fica registrada: se o CDN ainda servir a build antiga, não pede em loop
  const depois = makeCheckDeps({ session })
  assert.equal(await checkForUpdate(depois.deps), null)

  // Sem service worker / Cache Storage (ou com falhas): ainda recarrega
  const log2 = []
  await applyUpdate(remoteInfo, {
    serviceWorker: { getRegistrations: async () => { throw new Error('bloqueado') } },
    caches: { keys: async () => { throw new Error('indisponível') }, delete: async () => true },
    location: deps.location,
    replace: (url) => log2.push(url),
    session: memory(),
  })
  assert.equal(log2.length, 1, 'falha na limpeza não impede o recarregamento')
  const log3 = []
  await applyUpdate(remoteInfo, { location: deps.location, replace: (url) => log3.push(url), session: memory() })
  assert.equal(log3.length, 1)
}

// 6. A atualização não toca no armazenamento das anamneses
console.log('6. applyUpdate não apaga localStorage nem IndexedDB...')
{
  const fonte = (await import('node:fs')).readFileSync('src/lib/updater.ts', 'utf8')
  const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  assert.ok(!/localStorage|indexedDB|IDBFactory|deleteDatabase/.test(codigo), 'updater.ts não pode mexer em dados do usuário')
}

console.log('✅ Todos os testes do atualizador passaram com sucesso!')
