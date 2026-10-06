import assert from 'node:assert/strict'
import {
  __setHistoryEnvForTest,
  dismissOverlays,
  registerOverlay,
} from '../src/lib/useBackToClose.ts'

console.log('🧪 Iniciando testes do Voltar que fecha popups e diálogos...')

/** Histórico de navegador simulado: pilha de entradas, go() assíncrono e popstate. */
function makeBrowser() {
  const entries = [{ url: '#/', state: { idx: 0 } }]
  let pos = 0
  const listeners = []
  const timers = []
  const pops = []

  const history = {
    get state() {
      return entries[pos].state
    },
    pushState(state, _title) {
      entries.splice(pos + 1)
      entries.push({ url: entries[pos].url, state })
      pos += 1
    },
    go(delta) {
      // Como no navegador: a travessia é assíncrona e dispara um único popstate
      pops.push(() => {
        pos = Math.max(0, Math.min(entries.length - 1, pos + delta))
        listeners.forEach((listener) => listener())
      })
    },
  }
  return {
    entries,
    get pos() {
      return pos
    },
    env: {
      history,
      addPopstate: (listener) => listeners.push(listener),
      schedule: (callback, delay) => timers.push({ callback, delay }),
    },
    /** Executa os setTimeout(0) pendentes (push adiado dos overlays). */
    flushTimers() {
      const due = timers.splice(0).filter((t) => t.delay === 0)
      due.forEach((t) => t.callback())
    },
    /** Entrega a travessia de histórico pendente (ou o Voltar do usuário). */
    flushPops() {
      pops.splice(0).forEach((run) => run())
    },
    back() {
      history.go(-1)
      this.flushPops()
    },
    navigate(url) {
      // Navegação do React Router: novo push sem a marcação de overlay
      entries.splice(pos + 1)
      entries.push({ url, state: { idx: pos + 1 } })
      pos += 1
    },
  }
}

function setup() {
  const browser = makeBrowser()
  __setHistoryEnvForTest(browser.env)
  return browser
}

// 1. Voltar fecha o overlay e fica na mesma tela
console.log('1. Voltar fecha o overlay sem sair da tela...')
{
  const browser = setup()
  browser.navigate('#/anamnese/geral')
  let aberto = true
  registerOverlay(() => {
    aberto = false
  })
  browser.flushTimers()
  assert.equal(browser.entries.length, 3, 'abrir o overlay adiciona uma entrada')
  assert.equal(browser.entries[browser.pos].url, '#/anamnese/geral')
  assert.ok(browser.entries[browser.pos].state.idx === 1, 'preserva o state do router')

  browser.back()
  assert.equal(aberto, false, 'o Voltar fechou o overlay')
  assert.equal(browser.entries[browser.pos].url, '#/anamnese/geral', 'continua na consulta')
  assert.equal(browser.pos, 1)

  // Um segundo Voltar já não tem overlay: segue o histórico normal (o router cuida)
  browser.back()
  assert.equal(browser.pos, 0)
}

// 2. Fechar por outro caminho remove a própria entrada (sem sobras)
console.log('2. Fechar por botão/Escape não deixa entrada sobrando...')
{
  const browser = setup()
  browser.navigate('#/anamnese/geral')
  let aberto = true
  const remover = registerOverlay(() => {
    aberto = false
  })
  browser.flushTimers()
  assert.equal(browser.pos, 2)

  aberto = false
  remover() // o componente fechou sozinho (efeito de limpeza)
  browser.flushPops()
  assert.equal(browser.pos, 1, 'voltou para a entrada da consulta')
  assert.equal(browser.entries[browser.pos].url, '#/anamnese/geral')
  assert.equal(aberto, false)

  // O popstate gerado por esse back() não pode fechar nada nem consumir overlay novo
  let segundo = true
  registerOverlay(() => {
    segundo = false
  })
  browser.flushTimers()
  assert.equal(segundo, true)
  browser.back()
  assert.equal(segundo, false)
}

// 3. Abrir e fechar antes do push adiado não mexe no histórico
console.log('3. Abrir e fechar em seguida (StrictMode) não deixa rastro...')
{
  const browser = setup()
  browser.navigate('#/anamnese/geral')
  const remover = registerOverlay(() => {})
  remover() // fechou antes do setTimeout(0)
  browser.flushTimers()
  browser.flushPops()
  assert.equal(browser.entries.length, 2)
  assert.equal(browser.pos, 1)
}

// 4. Overlays empilhados: cada Voltar fecha um
console.log('4. Overlays empilhados fecham um por Voltar...')
{
  const browser = setup()
  browser.navigate('#/')
  const fechados = []
  registerOverlay(() => fechados.push('gaveta'))
  browser.flushTimers()
  registerOverlay(() => fechados.push('dialogo'))
  browser.flushTimers()
  assert.equal(browser.pos, 3)

  browser.back()
  assert.deepEqual(fechados, ['dialogo'])
  browser.back()
  assert.deepEqual(fechados, ['dialogo', 'gaveta'])
  assert.equal(browser.pos, 1, 'voltou à tela, sem sair dela')
}

// 5. dismissOverlays limpa o histórico antes de navegar
console.log('5. dismissOverlays tira o overlay do histórico antes de navegar...')
{
  const browser = setup()
  browser.navigate('#/anamnese/geral/abc')
  const fechados = []
  registerOverlay(() => fechados.push('confirmar'))
  browser.flushTimers()
  assert.equal(browser.pos, 2)

  const pronto = dismissOverlays()
  browser.flushPops()
  await pronto
  assert.deepEqual(fechados, ['confirmar'], 'o overlay foi fechado')
  assert.equal(browser.pos, 1, 'o histórico voltou ao ponto anterior ao overlay')
  assert.equal(browser.entries[browser.pos].url, '#/anamnese/geral/abc')

  // Sem overlays, resolve na hora
  await dismissOverlays()
}

// 6. Overlay que ficou para trás depois de uma navegação não força um back() errado
console.log('6. Navegação com overlay aberto não volta para o lugar errado...')
{
  const browser = setup()
  browser.navigate('#/anamnese/geral')
  const remover = registerOverlay(() => {})
  browser.flushTimers()
  browser.navigate('#/outra') // alguém navegou com o overlay aberto
  const antes = browser.pos
  remover()
  browser.flushPops()
  assert.equal(browser.pos, antes, 'sem marcação no topo, não volta no histórico')
}

__setHistoryEnvForTest(null)
console.log('✅ Todos os testes do Voltar nos overlays passaram com sucesso!')
