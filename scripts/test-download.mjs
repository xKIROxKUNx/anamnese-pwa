import assert from 'node:assert/strict'
import {
  BLOB_URL_LIFETIME_MS,
  deliverBlob,
  downloadWithAnchor,
  pickDeliveryStrategy,
} from '../src/lib/download.ts'

console.log('🧪 Iniciando testes de entrega de arquivos (PDF/ZIP)...')

const UA = {
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
  firefoxIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  safariIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  desktopFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
  desktopChrome: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
}

// 1. Escolha da estratégia
console.log('1. Escolha da estratégia de entrega...')
{
  const pick = (userAgent, standalone, canShareFiles) =>
    pickDeliveryStrategy({ userAgent, standalone, canShareFiles })

  // O caso do relato: Firefox Android com o app instalado → link visível
  assert.equal(pick(UA.firefoxAndroid, true, false), 'dialog')
  // Firefox Android em aba normal → download direto
  assert.equal(pick(UA.firefoxAndroid, false, false), 'anchor')
  // iOS compartilha o arquivo quando o sistema permite (Safari e Firefox iOS)
  assert.equal(pick(UA.safariIos, false, true), 'share')
  assert.equal(pick(UA.safariIos, true, true), 'share')
  assert.equal(pick(UA.firefoxIos, false, true), 'share')
  // iOS sem compartilhamento de arquivos → download direto
  assert.equal(pick(UA.safariIos, false, false), 'anchor')
  // Chrome Android e desktop: download direto, mesmo se o sistema compartilha arquivos
  assert.equal(pick(UA.chromeAndroid, true, true), 'anchor')
  assert.equal(pick(UA.chromeAndroid, false, true), 'anchor')
  assert.equal(pick(UA.desktopChrome, false, false), 'anchor')
  assert.equal(pick(UA.desktopFirefox, false, false), 'anchor')
}

// Dublês do navegador
function makeDeps({ userAgent = UA.desktopChrome, standalone = false, share, canShare } = {}) {
  const log = []
  const timers = []
  const anchor = {
    style: {},
    click() {
      log.push(['click', this.href, this.download, this.attached])
    },
  }
  const deps = {
    document: {
      createElement(tag) {
        assert.equal(tag, 'a')
        return anchor
      },
      body: {
        appendChild(node) {
          node.attached = true
          log.push(['append'])
        },
        removeChild(node) {
          node.attached = false
          log.push(['remove'])
        },
      },
    },
    url: {
      createObjectURL() {
        log.push(['create'])
        return 'blob:mock/1'
      },
      revokeObjectURL(url) {
        log.push(['revoke', url])
      },
    },
    schedule(callback, delay) {
      timers.push({ callback, delay })
    },
    navigator: { userAgent, share, canShare },
    standalone,
  }
  return { deps, log, timers, anchor }
}

const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })

// 2. Âncora real: anexada durante o clique, sem rel nem target, URL viva por 60 s
console.log('2. Download por âncora anexada ao documento...')
{
  const { deps, log, timers, anchor } = makeDeps()
  downloadWithAnchor(blob, 'anamnese.pdf', deps)

  assert.deepEqual(
    log.map((entry) => entry[0]),
    ['create', 'append', 'click', 'remove'],
    'Ordem: cria URL, anexa, clica, remove',
  )
  const click = log.find((entry) => entry[0] === 'click')
  assert.equal(click[1], 'blob:mock/1')
  assert.equal(click[2], 'anamnese.pdf')
  assert.equal(click[3], true, 'O clique deve acontecer com a âncora anexada ao documento')
  assert.equal(anchor.rel, undefined, 'Sem rel=noopener (o Gecko pode abrir um contexto novo)')
  assert.equal(anchor.target, undefined, 'Sem target')

  assert.equal(timers.length, 1)
  assert.ok(timers[0].delay >= 40_000, 'A URL do blob deve durar pelo menos 40 s (o download do Firefox é assíncrono)')
  assert.equal(timers[0].delay, BLOB_URL_LIFETIME_MS)
  assert.equal(log.some((entry) => entry[0] === 'revoke'), false, 'Não revogar antes do prazo')
  timers[0].callback()
  assert.deepEqual(log.at(-1), ['revoke', 'blob:mock/1'])
}

// 3. deliverBlob por estratégia
console.log('3. Entrega por estratégia...')
{
  // Âncora (Chrome desktop)
  const a = makeDeps()
  const resultA = await deliverBlob(blob, 'a.pdf', a.deps)
  assert.deepEqual(resultA, { method: 'anchor' })

  // O clique da âncora acontece de forma síncrona: nenhuma espera antes dele
  const sync = makeDeps()
  const promise = deliverBlob(blob, 'a.pdf', sync.deps)
  assert.ok(sync.log.some((entry) => entry[0] === 'click'), 'O download deve começar na mesma chamada, sem await antes')
  await promise

  // Firefox Android instalado → diálogo, sem clique automático, URL entregue ao chamador
  const d = makeDeps({ userAgent: UA.firefoxAndroid, standalone: true })
  const resultD = await deliverBlob(blob, 'b.pdf', d.deps)
  assert.deepEqual(resultD, { method: 'dialog', url: 'blob:mock/1', filename: 'b.pdf' })
  assert.equal(d.log.some((entry) => entry[0] === 'click'), false)
  assert.equal(d.timers.length, 0, 'No diálogo, quem revoga a URL é o chamador, ao fechar')

  // iOS: compartilha o arquivo
  const shared = []
  const s = makeDeps({
    userAgent: UA.safariIos,
    share: async (data) => shared.push(data),
    canShare: () => true,
  })
  const resultS = await deliverBlob(blob, 'c.pdf', s.deps)
  assert.deepEqual(resultS, { method: 'share' })
  assert.equal(shared.length, 1)
  assert.equal(shared[0].files[0].name, 'c.pdf')
  assert.equal(s.log.some((entry) => entry[0] === 'click'), false)

  // iOS: o usuário fecha a folha → cancelado, sem fallback
  const abort = makeDeps({
    userAgent: UA.safariIos,
    share: async () => {
      throw Object.assign(new Error('cancelado'), { name: 'AbortError' })
    },
    canShare: () => true,
  })
  assert.deepEqual(await deliverBlob(blob, 'd.pdf', abort.deps), { method: 'cancelled' })

  // iOS: o sistema recusa (gesto perdido) → link visível como rede de segurança
  const denied = makeDeps({
    userAgent: UA.safariIos,
    share: async () => {
      throw Object.assign(new Error('sem gesto'), { name: 'NotAllowedError' })
    },
    canShare: () => true,
  })
  const resultDenied = await deliverBlob(blob, 'e.pdf', denied.deps)
  assert.equal(resultDenied.method, 'dialog')
  assert.equal(resultDenied.filename, 'e.pdf')
}

console.log('✅ Todos os testes de entrega de arquivos passaram com sucesso!')
