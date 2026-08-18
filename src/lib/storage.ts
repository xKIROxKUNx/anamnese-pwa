import type { NaFlags, Values } from '../types/anamnese'
import { str } from './calc'

/**
 * Armazenamento local das anamneses. Fica tudo no localStorage do próprio
 * aparelho — sem servidor, sem conta, sem envio de dados. Cada anamnese é uma
 * chave independente, para que salvar uma nunca reescreva as outras.
 */

const PREFIX = 'anamnese:v1:'

export interface StoredRecord {
  id: string
  templateId: string
  values: Values
  na: NaFlags
  criadoEm: string
  atualizadoEm: string
}

export function createRecordId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function keyOf(id: string): string {
  return `${PREFIX}${id}`
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

export function readRecord(id: string): StoredRecord | null {
  try {
    const raw = localStorage.getItem(keyOf(id))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    return { ...parsed, na: parsed.na ?? {} }
  } catch {
    return null
  }
}

/** Anamneses salvas, da mais recente para a mais antiga. */
export function listRecords(): StoredRecord[] {
  const records: StoredRecord[] = []
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key?.startsWith(PREFIX)) continue
      const record = readRecord(key.slice(PREFIX.length))
      if (record) records.push(record)
    }
  } catch {
    return []
  }
  return records.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
}

export type SaveResult = 'ok' | 'erro'

export function writeRecord(record: StoredRecord): SaveResult {
  try {
    localStorage.setItem(keyOf(record.id), JSON.stringify(record))
    return 'ok'
  } catch {
    // Armazenamento cheio ou bloqueado (navegação anônima, por exemplo).
    return 'erro'
  }
}

export function deleteRecord(id: string): void {
  try {
    localStorage.removeItem(keyOf(id))
  } catch {
    /* nada a fazer: o registro simplesmente continua onde está */
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
  return record.criadoEm.slice(0, 10)
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
  const dias = Math.floor((meiaNoite.getTime() - new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
  ).getTime()) / 86_400_000)

  if (dias === 0) return `hoje às ${hora}`
  if (dias === 1) return `ontem às ${hora}`
  return `${data.toLocaleDateString('pt-BR')} às ${hora}`
}
