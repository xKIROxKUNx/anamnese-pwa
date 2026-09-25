import assert from 'node:assert/strict'

// Mocking localStorage
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

// Mocking IndexedDB
class MockIDBRequest {
  constructor() {
    this.result = undefined
    this.error = null
    this.onsuccess = null
    this.onerror = null
  }
}

class MockIDBOpenDBRequest extends MockIDBRequest {
  constructor() {
    super()
    this.onupgradeneeded = null
    this.onblocked = null
  }
}

class MockIDBTransaction {
  constructor(db, mode) {
    this.db = db
    this.mode = mode
    this.oncomplete = null
    this.onerror = null
    this.onabort = null
    this.error = null
    this._requests = []
    this._aborted = false
  }

  objectStore(name) {
    const store = this.db._stores.get(name)
    if (!store) throw new Error(`Store ${name} not found`)
    return new MockIDBObjectStoreProxy(store, this)
  }

  _scheduleComplete() {
    queueMicrotask(() => {
      if (this._aborted) return
      if (this.oncomplete) this.oncomplete({ target: this })
    })
  }

  abort() {
    this._aborted = true
    queueMicrotask(() => {
      if (this.onabort) this.onabort({ target: this })
    })
  }
}

class MockIDBObjectStoreProxy {
  constructor(store, tx) {
    this._store = store
    this._tx = tx
  }

  put(value) {
    const req = new MockIDBRequest()
    queueMicrotask(() => {
      try {
        const key = value.id
        this._store.data.set(key, structuredClone(value))
        req.result = key
        if (req.onsuccess) req.onsuccess({ target: req })
      } catch (err) {
        req.error = err
        if (req.onerror) req.onerror({ target: req })
        if (this._tx?.onerror) this._tx.onerror({ target: this._tx, error: err })
      }
    })
    if (this._tx) this._tx._scheduleComplete()
    return req
  }

  get(key) {
    const req = new MockIDBRequest()
    queueMicrotask(() => {
      try {
        const val = this._store.data.get(key)
        req.result = val ? structuredClone(val) : undefined
        if (req.onsuccess) req.onsuccess({ target: req })
      } catch (err) {
        req.error = err
        if (req.onerror) req.onerror({ target: req })
        if (this._tx?.onerror) this._tx.onerror({ target: this._tx, error: err })
      }
    })
    return req
  }

  getAll() {
    const req = new MockIDBRequest()
    queueMicrotask(() => {
      try {
        const vals = Array.from(this._store.data.values()).map((v) => structuredClone(v))
        req.result = vals
        if (req.onsuccess) req.onsuccess({ target: req })
      } catch (err) {
        req.error = err
        if (req.onerror) req.onerror({ target: req })
        if (this._tx?.onerror) this._tx.onerror({ target: this._tx, error: err })
      }
    })
    return req
  }

  delete(key) {
    const req = new MockIDBRequest()
    queueMicrotask(() => {
      try {
        this._store.data.delete(key)
        req.result = undefined
        if (req.onsuccess) req.onsuccess({ target: req })
      } catch (err) {
        req.error = err
        if (req.onerror) req.onerror({ target: req })
        if (this._tx?.onerror) this._tx.onerror({ target: this._tx, error: err })
      }
    })
    if (this._tx) this._tx._scheduleComplete()
    return req
  }

  clear() {
    const req = new MockIDBRequest()
    queueMicrotask(() => {
      try {
        this._store.data.clear()
        req.result = undefined
        if (req.onsuccess) req.onsuccess({ target: req })
      } catch (err) {
        req.error = err
        if (req.onerror) req.onerror({ target: req })
        if (this._tx?.onerror) this._tx.onerror({ target: this._tx, error: err })
      }
    })
    if (this._tx) this._tx._scheduleComplete()
    return req
  }

  createIndex() {}
}

class MockIDBDatabase {
  constructor(name, version) {
    this.name = name
    this.version = version
    this._stores = new Map()
    this.onversionchange = null
    this.onclose = null
    this.objectStoreNames = {
      contains: (s) => this._stores.has(s),
    }
  }

  createObjectStore(name, options) {
    const store = { name, options, data: new Map() }
    this._stores.set(name, store)
    return new MockIDBObjectStoreProxy(store, null)
  }

  transaction(storeNames, mode) {
    return new MockIDBTransaction(this, mode)
  }

  close() {
    if (this.onclose) this.onclose()
  }
}

class MockIDBFactory {
  constructor() {
    this.databases = new Map()
  }

  open(name, version = 1) {
    const req = new MockIDBOpenDBRequest()
    queueMicrotask(() => {
      let db = this.databases.get(name)
      const isNew = !db
      if (!db) {
        db = new MockIDBDatabase(name, version)
        this.databases.set(name, db)
      }
      req.result = db
      if (isNew && req.onupgradeneeded) {
        req.onupgradeneeded({ target: req })
      }
      if (req.onsuccess) {
        req.onsuccess({ target: req })
      }
    })
    return req
  }
}

// Setup globals before importing storage
const mockLocalStorage = new MockLocalStorage()
let mockIndexedDB = new MockIDBFactory()

let persistCallCount = 0
let persistReturnValue = true
let persistedReturnValue = false

const mockNavigator = {
  storage: {
    persisted: async () => persistedReturnValue,
    persist: async () => {
      persistCallCount += 1
      persistedReturnValue = persistReturnValue
      return persistReturnValue
    },
    estimate: async () => ({ quota: 100_000_000, usage: 1_000 }),
  },
}

globalThis.localStorage = mockLocalStorage
globalThis.indexedDB = mockIndexedDB
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: mockNavigator,
    configurable: true,
    writable: true,
  })
} catch {
  globalThis.navigator.storage = mockNavigator.storage
}
globalThis.window = globalThis

async function runTests() {
  console.log('🧪 Iniciando testes de armazenamento (IndexedDB + Storage persist)...')

  // Import dynamic
  const storage = await import('../src/lib/storage.ts')

  // Test 1: Storage Persist & Concurrent Deduplication
  console.log('1. Testando persistência com navigator.storage.persist() e deduplicação...')
  persistedReturnValue = false
  persistCallCount = 0

  // Chamar duas vezes concorrentemente deve disparar apenas 1 chamada de persist()
  const [granted1, granted2] = await Promise.all([
    storage.requestPersistentStorage(),
    storage.requestPersistentStorage(),
  ])
  assert.equal(granted1, true, 'Deve conceder persistência na primeira chamada')
  assert.equal(granted2, true, 'Deve conceder persistência na chamada concorrente')
  assert.equal(persistCallCount, 1, 'Chamadas concorrentes devem ser deduplicadas em 1 única requisição')

  // Quando já persistido
  persistCallCount = 0
  const alreadyGranted = await storage.requestPersistentStorage()
  assert.equal(alreadyGranted, true, 'Deve retornar true imediatamente se já persistido')
  assert.equal(persistCallCount, 0, 'Não deve chamar persist() novamente se já persistido')

  const isPersisted = await storage.isStoragePersisted()
  assert.equal(isPersisted, true, 'isStoragePersisted deve retornar true')

  const estimate = await storage.getStorageEstimate()
  assert.equal(estimate.quota, 100_000_000, 'estimate.quota deve retornar valor correto')

  // Test 2: Transparent Migration from localStorage to IndexedDB
  console.log('2. Testando migração transparente do localStorage para IndexedDB...')
  storage.closeDB()
  mockIndexedDB.databases.clear()
  mockLocalStorage.clear()

  // Pre-fill localStorage with legacy records
  const legacyRecord1 = {
    id: 'leg-1',
    templateId: 'geral',
    values: { nome: 'Paciente Antigo 1', idade: '45' },
    na: {},
    criadoEm: '2026-08-01T10:00:00.000Z',
    atualizadoEm: '2026-08-01T10:30:00.000Z',
  }
  const legacyRecord2 = {
    id: 'leg-2',
    templateId: 'idoso',
    values: { nome: 'Dona Maria', data_atendimento: '2026-08-02' },
    na: { alergias: true },
    criadoEm: '2026-08-02T14:00:00.000Z',
    atualizadoEm: '2026-08-02T15:00:00.000Z',
  }
  mockLocalStorage.setItem('anamnese:v1:leg-1', JSON.stringify(legacyRecord1))
  mockLocalStorage.setItem('anamnese:v1:leg-2', JSON.stringify(legacyRecord2))
  mockLocalStorage.setItem('unrelated_key', 'should_stay')

  const migratedList = await storage.listRecords()
  assert.equal(migratedList.length, 2, 'Deve ter migrado 2 registros')
  assert.equal(migratedList[0].id, 'leg-2', 'O mais recente deve vir primeiro')
  assert.equal(migratedList[1].id, 'leg-1')

  // Check localStorage cleanup
  assert.equal(mockLocalStorage.getItem('anamnese:v1:leg-1'), null, 'Chave leg-1 deve ter sido removida do localStorage')
  assert.equal(mockLocalStorage.getItem('anamnese:v1:leg-2'), null, 'Chave leg-2 deve ter sido removida do localStorage')
  assert.equal(mockLocalStorage.getItem('unrelated_key'), 'should_stay', 'Chave não relacionada deve permanecer')

  // Test 3: writeRecord, readRecord, update in IndexedDB
  console.log('3. Testando escrita e leitura no IndexedDB...')
  const newRecord = {
    id: 'rec-test-1',
    templateId: 'crianca',
    values: { nome: 'Pedrinho', peso: '12kg' },
    na: {},
    criadoEm: '2026-09-24T18:00:00.000Z',
    atualizadoEm: '2026-09-24T19:00:00.000Z',
  }
  const writeRes = await storage.writeRecord(newRecord)
  assert.equal(writeRes, 'ok', 'writeRecord deve retornar "ok"')

  const readRes = await storage.readRecord('rec-test-1')
  assert.deepEqual(readRes, newRecord, 'Registro lido deve ser idêntico ao gravado')

  // Update existing record
  const updatedRecord = {
    ...newRecord,
    values: { ...newRecord.values, peso: '12.5kg' },
    atualizadoEm: '2026-09-24T20:00:00.000Z',
  }
  await storage.writeRecord(updatedRecord)
  const readUpdated = await storage.readRecord('rec-test-1')
  assert.equal(readUpdated?.values.peso, '12.5kg')
  assert.equal(readUpdated?.atualizadoEm, '2026-09-24T20:00:00.000Z')

  // Test 4: listRecords ordering
  console.log('4. Testando ordenação de listRecords()...')
  const allRecords = await storage.listRecords()
  assert.equal(allRecords.length, 3, 'Deve conter 3 registros')
  assert.equal(allRecords[0].id, 'rec-test-1')
  assert.equal(allRecords[1].id, 'leg-2')
  assert.equal(allRecords[2].id, 'leg-1')

  // Test 5: deleteRecord
  console.log('5. Testando exclusão no IndexedDB...')
  const deleted = await storage.deleteRecord('leg-1')
  assert.equal(deleted, true, 'deleteRecord deve retornar true')
  const afterDelete = await storage.listRecords()
  assert.equal(afterDelete.length, 2)
  assert.equal(await storage.readRecord('leg-1'), null)

  // Test 6: Formatter utilities
  console.log('6. Testando formatadores e utilitários...')
  assert.equal(storage.pacienteDoRegistro(newRecord), 'Pedrinho')
  assert.equal(storage.pacienteDoRegistro({ ...newRecord, values: {} }), 'Sem nome')
  assert.equal(storage.dataDoRegistro(legacyRecord2), '2026-08-02')
  assert.equal(storage.dataDoRegistro(newRecord), '2026-09-24')
  assert.equal(storage.formatarData('2026-09-24'), '24/09/2026')

  // Test 7: clearAllRecords
  console.log('7. Testando clearAllRecords()...')
  await storage.clearAllRecords()
  const emptyList = await storage.listRecords()
  assert.equal(emptyList.length, 0, 'Após clearAllRecords deve estar vazio')

  // Test 8: Non-existent record
  assert.equal(await storage.readRecord('non-existent'), null)

  // Test 9: createRecordId uniqueness
  const id1 = storage.createRecordId()
  const id2 = storage.createRecordId()
  assert.notEqual(id1, id2, 'IDs gerados devem ser únicos')

  // Test 10: Fallback to localStorage on readRecord when not in IDB
  console.log('10. Testando fallback de leitura do localStorage quando não está no IDB...')
  const fallbackRecord = {
    id: 'fb-1',
    templateId: 'geral',
    values: { nome: 'Fallback Paciente' },
    na: {},
    criadoEm: '2026-09-24T12:00:00.000Z',
    atualizadoEm: '2026-09-24T12:30:00.000Z',
  }
  mockLocalStorage.setItem('anamnese:v1:fb-1', JSON.stringify(fallbackRecord))
  const recovered = await storage.readRecord('fb-1')
  assert.notEqual(recovered, null, 'Deve recuperar do localStorage via fallback')
  assert.equal(recovered?.values.nome, 'Fallback Paciente')

  // Test 11: Corrupted data sanitization
  console.log('11. Testando sanitização e resiliência contra dados corrompidos...')
  const db = await storage.getDB()
  const tx = db.transaction('anamneses', 'readwrite')
  // Registro sem criadoEm / atualizadoEm
  tx.objectStore('anamneses').put({
    id: 'corrupt-1',
    templateId: 'geral',
    values: { nome: 'Sem Datas' },
  })
  // Registro inválido (sem templateId nem values)
  tx.objectStore('anamneses').put({ id: 'corrupt-2', not_a_record: true })
  await new Promise((res) => {
    tx.oncomplete = res
  })

  const corruptRead = await storage.readRecord('corrupt-1')
  assert.ok(corruptRead, 'Registro recuperável deve ser lido com sanitização')
  assert.ok(typeof corruptRead.criadoEm === 'string', 'criadoEm deve ter sido sanitizado')
  assert.ok(typeof corruptRead.atualizadoEm === 'string', 'atualizadoEm deve ter sido sanitizado')
  assert.equal(storage.dataDoRegistro(corruptRead).length, 10, 'dataDoRegistro não deve estourar erro')

  const badRead = await storage.readRecord('corrupt-2')
  assert.equal(badRead, null, 'Registro com formato inválido deve retornar null')

  const listWithBad = await storage.listRecords()
  assert.ok(listWithBad.every((r) => r.id && r.templateId && r.values), 'listRecords deve filtrar inválidos')

  // Test 12: descreverAtualizacao date edge cases
  console.log('12. Testando descreverAtualizacao com casos limites...')
  assert.equal(storage.descreverAtualizacao('invalid-date'), '')
  const agoraIso = new Date().toISOString()
  assert.ok(storage.descreverAtualizacao(agoraIso).startsWith('hoje às'))
  const ontem = new Date(Date.now() - 86_400_000).toISOString()
  assert.ok(storage.descreverAtualizacao(ontem).startsWith('ontem às'))

  // Test 13: Storage persist failure handling
  console.log('13. Testando tratamento de falhas em requestPersistentStorage...')
  mockNavigator.storage.persisted = async () => {
    throw new Error('Persisted error')
  }
  mockNavigator.storage.persist = async () => {
    throw new Error('Persist error')
  }
  const failGranted = await storage.requestPersistentStorage(true)
  assert.equal(failGranted, false, 'Deve retornar false sem estourar exceção')

  // Test 14: Complete fallback to localStorage when IndexedDB is blocked / unavailable
  console.log('14. Testando fallback completo para localStorage quando IndexedDB falha...')
  storage.closeDB()
  globalThis.indexedDB = undefined // Simula navegador com IndexedDB desativado ou privado restrito
  mockLocalStorage.clear()

  const lsRecord = {
    id: 'ls-fallback-1',
    templateId: 'idoso',
    values: { nome: 'Fallback Total' },
    na: {},
    criadoEm: '2026-09-24T20:00:00.000Z',
    atualizadoEm: '2026-09-24T20:10:00.000Z',
  }

  // Escrita com fallback
  const fallbackWrite = await storage.writeRecord(lsRecord)
  assert.equal(fallbackWrite, 'ok', 'writeRecord deve salvar no localStorage quando IDB indisponível')
  assert.ok(mockLocalStorage.getItem('anamnese:v1:ls-fallback-1'), 'Deve ter gravado a chave no localStorage')

  // Leitura com fallback
  const fallbackRead = await storage.readRecord('ls-fallback-1')
  assert.equal(fallbackRead?.values.nome, 'Fallback Total', 'readRecord deve ler do localStorage')

  // Listagem com fallback
  const fallbackList = await storage.listRecords()
  assert.equal(fallbackList.length, 1, 'listRecords deve listar do localStorage')
  assert.equal(fallbackList[0].id, 'ls-fallback-1')

  // Exclusão com fallback
  const fallbackDelete = await storage.deleteRecord('ls-fallback-1')
  assert.equal(fallbackDelete, true, 'deleteRecord deve excluir do localStorage')
  assert.equal(mockLocalStorage.getItem('anamnese:v1:ls-fallback-1'), null)

  console.log('✅ Todos os 14 cenários de testes passaram com sucesso!')
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes:', err)
  process.exit(1)
})
