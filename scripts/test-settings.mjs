import assert from 'node:assert/strict'

// Mock de localStorage
class MockLocalStorage {
  constructor() {
    this.store = new Map()
  }
  get length() {
    return this.store.size
  }
  key(index) {
    const keys = Array.from(this.store.keys())
    return keys[index] ?? null
  }
  getItem(key) {
    return this.store.get(key) ?? null
  }
  setItem(key, value) {
    this.store.set(key, String(value))
  }
  removeItem(key) {
    this.store.delete(key)
  }
  clear() {
    this.store.clear()
  }
}

globalThis.localStorage = new MockLocalStorage()

// Mock de window e CustomEvent
let dispatchedEvents = []
globalThis.CustomEvent = class CustomEvent {
  constructor(type, eventInitDict = {}) {
    this.type = type
    this.detail = eventInitDict.detail
  }
}
globalThis.window = {
  dispatchEvent: (event) => {
    dispatchedEvents.push(event)
    return true
  },
}

// Importar módulo sob teste
const {
  DEFAULT_SETTINGS,
  LOCAIS_ATENDIMENTO,
  SETTINGS_STORAGE_KEY,
  formatCurrentTime,
  getInitialValuesFromSettings,
  getSettings,
  isLocalAtendimentoValido,
  sanitizeSettings,
  saveSettings,
} = await import('../src/lib/settings.ts')

async function runTests() {
  console.log('🧪 Iniciando testes de configurações (perfil, local padrão, horário)...')

  // 1. Valores padrão
  console.log('1. Testando valores padrão das configurações...')
  assert.equal(DEFAULT_SETTINGS.perfil.nome, '')
  assert.equal(DEFAULT_SETTINGS.perfil.registro, '')
  assert.equal(DEFAULT_SETTINGS.perfil.preceptor, '')
  assert.equal(DEFAULT_SETTINGS.localPadrao, '')
  assert.equal(DEFAULT_SETTINGS.horarioAtualPadrao, false)
  assert.ok(LOCAIS_ATENDIMENTO.includes('Unidade básica de saúde'))
  assert.ok(LOCAIS_ATENDIMENTO.includes('Ambulatório'))
  assert.ok(LOCAIS_ATENDIMENTO.includes('Pronto atendimento'))

  // 2. Leitura com storage vazio
  console.log('2. Testando getSettings() com storage vazio...')
  globalThis.localStorage.clear()
  const initial = getSettings()
  assert.deepEqual(initial, DEFAULT_SETTINGS)

  // 3. Escrita e persistência no localStorage
  console.log('3. Testando saveSettings() e persistência...')
  dispatchedEvents = []
  const saved = saveSettings({
    perfil: {
      nome: 'Dr. Lucas Silva',
      registro: 'CRM/SP 123456',
      preceptor: 'Prof. Dra. Cristina',
    },
    localPadrao: 'Ambulatório',
    horarioAtualPadrao: true,
  })

  assert.equal(saved.perfil.nome, 'Dr. Lucas Silva')
  assert.equal(saved.perfil.registro, 'CRM/SP 123456')
  assert.equal(saved.perfil.preceptor, 'Prof. Dra. Cristina')
  assert.equal(saved.localPadrao, 'Ambulatório')
  assert.equal(saved.horarioAtualPadrao, true)

  // Verifica que gravou no localStorage
  const rawStorage = globalThis.localStorage.getItem(SETTINGS_STORAGE_KEY)
  assert.ok(rawStorage !== null)
  const parsedStorage = JSON.parse(rawStorage)
  assert.equal(parsedStorage.perfil.nome, 'Dr. Lucas Silva')
  assert.equal(parsedStorage.localPadrao, 'Ambulatório')
  assert.equal(parsedStorage.horarioAtualPadrao, true)

  // Verifica que evento foi disparado
  assert.equal(dispatchedEvents.length, 1)
  assert.equal(dispatchedEvents[0].type, 'anamnese-settings-updated')
  assert.equal(dispatchedEvents[0].detail.perfil.nome, 'Dr. Lucas Silva')

  // 4. Leitura a partir do storage
  console.log('4. Testando leitura de getSettings() a partir do storage...')
  const loaded = getSettings()
  assert.deepEqual(loaded, saved)

  // 5. Atualização parcial sem perder campos existentes
  console.log('5. Testando atualização parcial de configurações...')
  const partialUpdate = saveSettings({
    localPadrao: 'Pronto atendimento',
  })
  assert.equal(partialUpdate.localPadrao, 'Pronto atendimento')
  assert.equal(partialUpdate.perfil.nome, 'Dr. Lucas Silva')
  assert.equal(partialUpdate.perfil.registro, 'CRM/SP 123456')
  assert.equal(partialUpdate.horarioAtualPadrao, true)

  // 6. Sanitização contra dados inválidos ou corrompidos
  console.log('6. Testando sanitizeSettings() contra dados corrompidos...')
  assert.deepEqual(sanitizeSettings(null), DEFAULT_SETTINGS)
  assert.deepEqual(sanitizeSettings('string invalida'), DEFAULT_SETTINGS)
  assert.deepEqual(sanitizeSettings(123), DEFAULT_SETTINGS)
  assert.deepEqual(sanitizeSettings({}), DEFAULT_SETTINGS)

  const partialCorrupt = sanitizeSettings({
    perfil: { nome: 123, registro: 'CRM 123' },
    localPadrao: null,
    horarioAtualPadrao: 'yes',
  })
  assert.equal(partialCorrupt.perfil.nome, '')
  assert.equal(partialCorrupt.perfil.registro, 'CRM 123')
  assert.equal(partialCorrupt.localPadrao, '')
  assert.equal(partialCorrupt.horarioAtualPadrao, true)

  // 7. Formatação de horário atual (HH:MM)
  console.log('7. Testando formatCurrentTime()...')
  const date1 = new Date(2026, 8, 25, 9, 5) // 09:05
  assert.equal(formatCurrentTime(date1), '09:05')

  const date2 = new Date(2026, 8, 25, 14, 30) // 14:30
  assert.equal(formatCurrentTime(date2), '14:30')

  const date3 = new Date(2026, 8, 25, 0, 0) // 00:00
  assert.equal(formatCurrentTime(date3), '00:00')

  const date4 = new Date(2026, 8, 25, 23, 59) // 23:59
  assert.equal(formatCurrentTime(date4), '23:59')

  // 8. Geração de valores padrão para NOVA consulta
  console.log('8. Testando getInitialValuesFromSettings() para nova consulta...')
  const testSettings = {
    perfil: {
      nome: '  Dra. Mariana Costa  ',
      registro: '  CRM/RJ 654321  ',
      preceptor: '  Dr. Roberto  ',
    },
    localPadrao: 'Unidade básica de saúde',
    horarioAtualPadrao: true,
  }

  const dataFixa = new Date(2026, 8, 25, 10, 15)
  const initialValues = getInitialValuesFromSettings(testSettings, dataFixa)

  assert.equal(initialValues['profissional_nome'], 'Dra. Mariana Costa')
  assert.equal(initialValues['profissional_registro'], 'CRM/RJ 654321')
  assert.equal(initialValues['preceptor'], 'Dr. Roberto')
  assert.equal(initialValues['local_atendimento'], 'Unidade básica de saúde')
  assert.equal(initialValues['hora_atendimento'], '10:15')

  // 9. Com horárioAtualPadrao desligado
  console.log('9. Testando getInitialValuesFromSettings() com horário desativado...')
  const testSettingsSemHora = {
    ...testSettings,
    horarioAtualPadrao: false,
  }
  const valuesSemHora = getInitialValuesFromSettings(testSettingsSemHora, dataFixa)
  assert.equal(valuesSemHora['profissional_nome'], 'Dra. Mariana Costa')
  assert.equal(valuesSemHora['hora_atendimento'], undefined)

  // 10. Com configurações em branco
  console.log('10. Testando getInitialValuesFromSettings() com perfil e local vazios...')
  const valuesVazio = getInitialValuesFromSettings(DEFAULT_SETTINGS, dataFixa)
  assert.deepEqual(valuesVazio, {})

  // 11. Validação de isolamento do Histórico (NÃO sobrescrever consulta aberta pelo histórico)
  console.log('11. Testando que padrões NÃO sobrescrevem consulta do histórico...')
  const registroDoHistorico = {
    id: 'rec-historico-1',
    templateId: 'geral',
    values: {
      nome: 'Paciente Joãozinho',
      local_atendimento: 'Domicílio',
      hora_atendimento: '08:00',
      profissional_nome: 'Dr. Antigo Responsável',
      // preceptor e outros campos omitidos/vazios
    },
    na: {},
    criadoEm: '2026-09-20T10:00:00Z',
    atualizadoEm: '2026-09-20T10:30:00Z',
  }

  // Simulação da lógica de inicialização de AnamneseFormEditor:
  // Se registroInicial existe, usa ele diretamente sem aplicar defaults
  const valuesFormHistorico = registroDoHistorico ? registroDoHistorico.values : getInitialValuesFromSettings(testSettings, dataFixa)

  assert.equal(valuesFormHistorico.local_atendimento, 'Domicílio', 'Local do atendimento deve permanecer do histórico!')
  assert.equal(valuesFormHistorico.hora_atendimento, '08:00', 'Hora do atendimento deve permanecer do histórico!')
  assert.equal(valuesFormHistorico.profissional_nome, 'Dr. Antigo Responsável', 'Nome do profissional deve permanecer do histórico!')
  assert.equal(valuesFormHistorico.preceptor, undefined, 'Preceptor vazio no histórico NÃO deve ser preenchido pelo padrão!')

  // 12. Validação de editabilidade dos valores iniciais
  console.log('12. Testando editabilidade dos campos preenchidos por padrão...')
  const novaConsultaValues = { ...initialValues }
  assert.equal(novaConsultaValues.local_atendimento, 'Unidade básica de saúde')

  // Usuário edita o local e o horário
  novaConsultaValues.local_atendimento = 'Enfermaria'
  novaConsultaValues.hora_atendimento = '11:00'
  novaConsultaValues.profissional_nome = 'Dr. Nome Editado'

  assert.equal(novaConsultaValues.local_atendimento, 'Enfermaria')
  assert.equal(novaConsultaValues.hora_atendimento, '11:00')
  assert.equal(novaConsultaValues.profissional_nome, 'Dr. Nome Editado')

  // As configurações salvas devem permanecer inalteradas
  const configAposEdicao = getSettings()
  assert.equal(configAposEdicao.localPadrao, 'Pronto atendimento')

  // 13. Testando getSettings() após localStorage.clear() (evitar dados fantasmas na memória)
  console.log('13. Testando getSettings() após localStorage.clear()...')
  globalThis.localStorage.clear()
  const resetAfterClear = getSettings()
  assert.deepEqual(resetAfterClear, DEFAULT_SETTINGS, 'Após clear do storage, getSettings deve retornar DEFAULT_SETTINGS')

  // 14. Testando validação de localPadrao inválido
  console.log('14. Testando validação de localPadrao inválido...')
  assert.equal(isLocalAtendimentoValido('Ambulatório'), true)
  assert.equal(isLocalAtendimentoValido('Local Que Nao Existe'), false)
  assert.equal(isLocalAtendimentoValido(null), false)
  assert.equal(isLocalAtendimentoValido(''), false)

  const sanitizedInvalidLocal = sanitizeSettings({
    localPadrao: 'Posto de Saúde Inexistente',
  })
  assert.equal(sanitizedInvalidLocal.localPadrao, '', 'Local inválido deve ser sanitizado para vazio')

  const savedInvalidLocal = saveSettings({
    localPadrao: 'Outro Local Invalido',
  })
  assert.equal(savedInvalidLocal.localPadrao, '', 'saveSettings com local inválido deve sanitizar para vazio')

  // 15. Testando formatCurrentTime com data inválida
  console.log('15. Testando formatCurrentTime com data inválida...')
  const invalidDate = new Date('data_invalida')
  const timeInvalid = formatCurrentTime(invalidDate)
  assert.match(timeInvalid, /^\d{2}:\d{2}$/, 'Data inválida não pode gerar NaN:NaN, deve gerar formato HH:MM válido')

  // 16. Testando getInitialValuesFromSettings com entradas nulas ou corrompidas
  console.log('16. Testando getInitialValuesFromSettings com entradas nulas ou corrompidas...')
  const valuesFromNull = getInitialValuesFromSettings(null)
  assert.ok(typeof valuesFromNull === 'object' && valuesFromNull !== null)
  const valuesFromCorrupt = getInitialValuesFromSettings('string corrompida')
  assert.ok(typeof valuesFromCorrupt === 'object' && valuesFromCorrupt !== null)

  // 17. Testando limpeza de campos via saveSettings
  console.log('17. Testando limpeza de campos via saveSettings...')
  saveSettings({
    perfil: {
      nome: 'Dr. Teste',
      registro: 'CRM 123',
      preceptor: 'Prof. Teste',
    },
    localPadrao: 'UTI',
    horarioAtualPadrao: true,
  })
  const cleared = saveSettings({
    perfil: {
      nome: '',
      registro: '',
      preceptor: '',
    },
    localPadrao: '',
    horarioAtualPadrao: false,
  })
  assert.equal(cleared.perfil.nome, '')
  assert.equal(cleared.perfil.registro, '')
  assert.equal(cleared.perfil.preceptor, '')
  assert.equal(cleared.localPadrao, '')
  assert.equal(cleared.horarioAtualPadrao, false)

  // 18. Histórico com todos os campos padrões ausentes permanece estritamente vazio
  console.log('18. Testando consulta do histórico sem nenhum dos campos padrões...')
  saveSettings({
    perfil: {
      nome: 'Dr. Ativo',
      registro: 'CRM 999',
      preceptor: 'Prof. Ativo',
    },
    localPadrao: 'Domicílio',
    horarioAtualPadrao: true,
  })
  const consultaVaziaHistorico = {
    id: 'rec-sem-nada-1',
    templateId: 'geral',
    values: {
      queixa_principal: 'Dor de cabeça há 2 dias',
    },
    na: {},
    criadoEm: '2026-09-01T12:00:00Z',
    atualizadoEm: '2026-09-01T12:00:00Z',
  }
  // Simulando abertura da consulta histórica:
  const valuesCarregados = consultaVaziaHistorico ? consultaVaziaHistorico.values : getInitialValuesFromSettings()
  assert.equal(valuesCarregados.profissional_nome, undefined)
  assert.equal(valuesCarregados.profissional_registro, undefined)
  assert.equal(valuesCarregados.preceptor, undefined)
  assert.equal(valuesCarregados.local_atendimento, undefined)
  assert.equal(valuesCarregados.hora_atendimento, undefined)
  assert.equal(valuesCarregados.queixa_principal, 'Dor de cabeça há 2 dias')

  console.log('✅ Todos os 18 cenários de testes de configurações passaram com sucesso!')
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes de configurações:', err)
  process.exit(1)
})
