import type { NaFlags, Values } from '../types/anamnese'
import { str } from './calc'

/**
 * Armazenamento local das anamneses. Fica tudo no IndexedDB do próprio
 * aparelho com persistência solicitada ao navegador (StorageManager.persist) —
 * sem servidor, sem conta, sem envio de dados. Cada anamnese é um
 * registro independente, para que salvar uma nunca reescreva as outras.
 * Conta com fallback transparente para o localStorage caso o IndexedDB
 * esteja desativado ou bloqueado.
 */

export const DB_NAME = 'anamnese-db'
export const DB_VERSION = 1
export const STORE_NAME = 'anamneses'
const LOCALSTORAGE_PREFIX = 'anamnese:v1:'

export interface StoredRecord {
  id: string
  templateId: string
  values: Values
  na: NaFlags
  criadoEm: string
  atualizadoEm: string
}

export type SaveResult = 'ok' | 'erro'

let persistRequestInFlight: Promise<boolean> | null = null
let persistAttempted = false

/**
 * Solicita ao navegador armazenamento persistente (StorageManager.persist).
 * Informa ao navegador para não descartar o IndexedDB sob pressão de espaço em disco.
 * Retorna true se a persistência foi concedida (ou já estava concedida).
 * Deduplica requisições concorrentes e evita re-solicitações repetidas na mesma sessão.
 */
export async function requestPersistentStorage(force = false): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false
  }

  if (persistRequestInFlight) {
    return persistRequestInFlight
  }

  if (persistAttempted && !force) {
    return isStoragePersisted()
  }

  persistRequestInFlight = (async () => {
    try {
      if (navigator.storage.persisted) {
        const isPersisted = await navigator.storage.persisted()
        if (isPersisted) return true
      }
      persistAttempted = true
      return await navigator.storage.persist()
    } catch (err) {
      console.warn('Não foi possível solicitar armazenamento persistente:', err)
      return false
    } finally {
      persistRequestInFlight = null
    }
  })()

  return persistRequestInFlight
}

/**
 * Verifica se o armazenamento já foi marcado como persistente pelo navegador.
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
    return false
  }
  try {
    return await navigator.storage.persisted()
  } catch {
    return false
  }
}

/**
 * Retorna a estimativa de cota e uso de armazenamento pelo navegador.
 */
export async function getStorageEstimate(): Promise<{ quota?: number; usage?: number }> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return {}
  }
  try {
    return await navigator.storage.estimate()
  } catch {
    return {}
  }
}

export function createRecordId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function keyOf(id: string): string {
  return `${LOCALSTORAGE_PREFIX}${id}`
}

function isRecord(value: unknown): value is StoredRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Partial<StoredRecord>
  return (
    typeof record.id === 'string' &&
    typeof record.templateId === 'string' &&
    typeof record.values === 'object' &&
    record.values !== null
  )
}

function sanitizeRecord(item: StoredRecord): StoredRecord {
  const agora = new Date().toISOString()
  return {
    id: item.id,
    templateId: item.templateId,
    values: typeof item.values === 'object' && item.values !== null ? item.values : {},
    na: typeof item.na === 'object' && item.na !== null ? item.na : {},
    criadoEm: typeof item.criadoEm === 'string' && item.criadoEm ? item.criadoEm : agora,
    atualizadoEm:
      typeof item.atualizadoEm === 'string' && item.atualizadoEm ? item.atualizadoEm : agora,
  }
}

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Migra de forma transparente os registros legados guardados no localStorage
 * para o IndexedDB na primeira inicialização.
 */
async function migrateFromLocalStorage(db: IDBDatabase): Promise<void> {
  if (typeof localStorage === 'undefined') return

  try {
    const keysToMigrate: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(LOCALSTORAGE_PREFIX)) {
        keysToMigrate.push(key)
      }
    }

    if (keysToMigrate.length === 0) {
      return
    }

    const recordsToMigrate: StoredRecord[] = []
    for (const key of keysToMigrate) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed: unknown = JSON.parse(raw)
          if (isRecord(parsed)) {
            recordsToMigrate.push(sanitizeRecord(parsed))
          }
        }
      } catch {
        // Ignora chaves corrompidas
      }
    }

    if (recordsToMigrate.length > 0) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        for (const record of recordsToMigrate) {
          store.put(record)
        }
        tx.oncomplete = () => {
          // Após salvar tudo com sucesso no IndexedDB, limpa o localStorage
          for (const key of keysToMigrate) {
            try {
              localStorage.removeItem(key)
            } catch {
              // Ignora falhas de remoção
            }
          }
          resolve()
        }
        tx.onerror = () => reject(tx.error ?? new Error('Falha na migração para o IndexedDB'))
        tx.onabort = () => reject(tx.error ?? new Error('Migração abortada'))
      })
    } else {
      // Remove chaves inválidas que não puderam ser convertidas
      for (const key of keysToMigrate) {
        try {
          localStorage.removeItem(key)
        } catch {
          // Ignora
        }
      }
    }
  } catch (err) {
    console.warn('Erro durante a migração do localStorage para o IndexedDB:', err)
  }
}

/**
 * Abre e inicializa a conexão com o IndexedDB.
 */
export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  // Solicita persistência de forma não bloqueante ao inicializar
  requestPersistentStorage().catch(() => {})

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB não é suportado neste ambiente.'))
      return
    }

    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch (err) {
      reject(err)
      return
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('atualizadoEm', 'atualizadoEm', { unique: false })
        store.createIndex('templateId', 'templateId', { unique: false })
      }
    }

    request.onsuccess = async () => {
      const db = request.result
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      db.onclose = () => {
        dbPromise = null
      }

      try {
        await migrateFromLocalStorage(db)
      } catch (err) {
        console.warn('Falha na migração do localStorage:', err)
      }

      resolve(db)
    }

    request.onerror = () => {
      reject(request.error ?? new Error('Falha ao abrir IndexedDB.'))
    }

    request.onblocked = () => {
      console.warn('Abertura do IndexedDB bloqueada por outra conexão ativa.')
    }
  })

  // Se a abertura falhar, limpa dbPromise para permitir nova tentativa futura
  dbPromise.catch(() => {
    dbPromise = null
  })

  return dbPromise
}

/**
 * Fecha a conexão ativa com o IndexedDB (útil para testes ou limpeza).
 */
export function closeDB(): void {
  if (dbPromise) {
    dbPromise.then((db) => db.close()).catch(() => {})
    dbPromise = null
  }
  persistAttempted = false
}

export async function readRecord(id: string): Promise<StoredRecord | null> {
  try {
    const db = await getDB()
    const record = await new Promise<StoredRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => {
        const result = request.result
        if (!result || !isRecord(result)) {
          resolve(null)
          return
        }
        resolve(sanitizeRecord(result))
      }

      request.onerror = () => reject(request.error ?? new Error(`Falha ao ler registro ${id}`))
      tx.onerror = () => reject(tx.error ?? new Error(`Erro na transação ao ler ${id}`))
    })

    if (record) return record
  } catch (err) {
    console.warn(`Erro ao ler registro ${id} do IndexedDB, tentando fallback:`, err)
  }

  // Fallback de contingência caso o registro ainda exista no localStorage
  // ou caso o IndexedDB esteja inacessível
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(keyOf(id))
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (isRecord(parsed)) {
          const rec = sanitizeRecord(parsed)
          // Tenta salvar de volta no IndexedDB em segundo plano se possível
          getDB()
            .then((db) => {
              const tx = db.transaction(STORE_NAME, 'readwrite')
              tx.objectStore(STORE_NAME).put(rec)
            })
            .catch(() => {})
          return rec
        }
      }
    } catch {
      // Ignora falhas de leitura do localStorage
    }
  }

  return null
}

/** Anamneses salvas, da mais recente para a mais antiga. */
export async function listRecords(): Promise<StoredRecord[]> {
  const recordsMap = new Map<string, StoredRecord>()
  let idbSuccess = false

  try {
    const db = await getDB()
    const records = await new Promise<StoredRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const list = (request.result ?? []) as unknown[]
        const validRecords: StoredRecord[] = []
        for (const item of list) {
          if (isRecord(item)) {
            validRecords.push(sanitizeRecord(item))
          }
        }
        resolve(validRecords)
      }

      request.onerror = () => reject(request.error ?? new Error('Falha ao listar registros'))
      tx.onerror = () => reject(tx.error ?? new Error('Erro na transação ao listar registros'))
    })

    for (const rec of records) {
      recordsMap.set(rec.id, rec)
    }
    idbSuccess = true
  } catch (err) {
    console.warn('Erro ao listar registros do IndexedDB, recorrendo ao fallback:', err)
  }

  // Se IndexedDB falhou, ou para verificar registros residuais no localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)
        if (!key?.startsWith(LOCALSTORAGE_PREFIX)) continue
        const raw = localStorage.getItem(key)
        if (!raw) continue
        try {
          const parsed: unknown = JSON.parse(raw)
          if (isRecord(parsed) && !recordsMap.has(parsed.id)) {
            const sanitized = sanitizeRecord(parsed)
            recordsMap.set(sanitized.id, sanitized)
            if (idbSuccess) {
              // Tenta sincronizar para o IndexedDB se o banco está operacional
              getDB()
                .then((db) => {
                  const tx = db.transaction(STORE_NAME, 'readwrite')
                  tx.objectStore(STORE_NAME).put(sanitized)
                })
                .catch(() => {})
            }
          }
        } catch {
          // Ignora item inválido
        }
      }
    } catch {
      // Ignora falhas de leitura do localStorage
    }
  }

  const allRecords = Array.from(recordsMap.values())
  return allRecords.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
}

export async function writeRecord(record: StoredRecord): Promise<SaveResult> {
  const sanitized = sanitizeRecord(record)
  try {
    const db = await getDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(sanitized)

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Falha na gravação do registro'))
      tx.onabort = () => reject(tx.error ?? new Error('Transação de gravação abortada'))
    })
    return 'ok'
  } catch (err) {
    console.warn('Erro ao gravar registro no IndexedDB, tentando fallback para localStorage:', err)
    // Fallback de contingência caso o IndexedDB falhe (armazenamento cheio/bloqueado)
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(keyOf(sanitized.id), JSON.stringify(sanitized))
        return 'ok'
      } catch (lsErr) {
        console.error('Falha também no fallback do localStorage:', lsErr)
      }
    }
    return 'erro'
  }
}

export async function deleteRecord(id: string): Promise<boolean> {
  let idbDeleted = false
  try {
    const db = await getDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.delete(id)

      tx.oncomplete = () => {
        idbDeleted = true
        resolve()
      }
      tx.onerror = () => reject(tx.error ?? new Error(`Falha ao excluir registro ${id}`))
      tx.onabort = () => reject(tx.error ?? new Error(`Exclusão do registro ${id} abortada`))
    })
  } catch (err) {
    console.warn(`Erro ao deletar registro ${id} do IndexedDB:`, err)
  }

  let lsDeleted = false
  // Remove também qualquer chave legada/fallback residual do localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(keyOf(id))
      lsDeleted = true
    } catch {
      // Ignora falhas de remoção
    }
  }

  return idbDeleted || lsDeleted
}

export async function clearAllRecords(): Promise<void> {
  try {
    const db = await getDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.clear()

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Falha ao limpar armazenamento'))
      tx.onabort = () => reject(tx.error ?? new Error('Limpeza de armazenamento abortada'))
    })
  } catch (err) {
    console.error('Erro ao limpar banco de dados:', err)
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const keysToRemove: string[] = []
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)
        if (key?.startsWith(LOCALSTORAGE_PREFIX)) {
          keysToRemove.push(key)
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key)
      }
    } catch {
      // Ignora falhas de remoção
    }
  }
}

/** Nome do paciente, ou um marcador enquanto ele não foi preenchido. */
export function pacienteDoRegistro(record: StoredRecord): string {
  return str(record.values, 'nome') || 'Sem nome'
}

/** Data do atendimento informada no formulário; senão, a da criação. */
export function dataDoRegistro(record: StoredRecord): string {
  const informada = str(record.values, 'data_atendimento')
  if (/^\d{4}-\d{2}-\d{2}$/.test(informada)) return informada
  return (record.criadoEm || record.atualizadoEm || new Date().toISOString()).slice(0, 10)
}

export function formatarData(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

/** "hoje às 10:32", "ontem às 22:04" ou a data completa. */
export function descreverAtualizacao(iso: string): string {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ''
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const hoje = new Date()
  const meiaNoite = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const dias = Math.floor(
    (meiaNoite.getTime() -
      new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime()) /
      86_400_000,
  )

  if (dias === 0) return `hoje às ${hora}`
  if (dias === 1) return `ontem às ${hora}`
  return `${data.toLocaleDateString('pt-BR')} às ${hora}`
}
