import type { Values } from '../types/anamnese'

export interface UserProfile {
  nome: string
  registro: string
  preceptor: string
}

export interface AppSettings {
  perfil: UserProfile
  localPadrao: string
  horarioAtualPadrao: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  perfil: {
    nome: '',
    registro: '',
    preceptor: '',
  },
  localPadrao: '',
  horarioAtualPadrao: false,
}

export const SETTINGS_STORAGE_KEY = 'anamnese:settings:v1'

export const LOCAIS_ATENDIMENTO = [
  'Unidade básica de saúde',
  'Ambulatório',
  'Pronto atendimento',
  'Enfermaria',
  'UTI',
  'Domicílio',
  'Teleconsulta',
] as const

let memorySettings: AppSettings = {
  perfil: { ...DEFAULT_SETTINGS.perfil },
  localPadrao: DEFAULT_SETTINGS.localPadrao,
  horarioAtualPadrao: DEFAULT_SETTINGS.horarioAtualPadrao,
}

export function isLocalAtendimentoValido(local: unknown): local is (typeof LOCAIS_ATENDIMENTO)[number] {
  return typeof local === 'string' && (LOCAIS_ATENDIMENTO as readonly string[]).includes(local)
}

export function sanitizeSettings(data: unknown): AppSettings {
  if (!data || typeof data !== 'object') {
    return {
      perfil: { ...DEFAULT_SETTINGS.perfil },
      localPadrao: DEFAULT_SETTINGS.localPadrao,
      horarioAtualPadrao: DEFAULT_SETTINGS.horarioAtualPadrao,
    }
  }

  const obj = data as Record<string, unknown>
  const perfilRaw =
    obj.perfil && typeof obj.perfil === 'object'
      ? (obj.perfil as Record<string, unknown>)
      : {}

  const localBruto = typeof obj.localPadrao === 'string' ? obj.localPadrao.trim() : ''
  const localPadrao = isLocalAtendimentoValido(localBruto) ? localBruto : ''

  return {
    perfil: {
      nome: typeof perfilRaw.nome === 'string' ? perfilRaw.nome : '',
      registro: typeof perfilRaw.registro === 'string' ? perfilRaw.registro : '',
      preceptor: typeof perfilRaw.preceptor === 'string' ? perfilRaw.preceptor : '',
    },
    localPadrao,
    horarioAtualPadrao: Boolean(obj.horarioAtualPadrao),
  }
}

export function getSettings(): AppSettings {
  if (typeof localStorage === 'undefined') {
    return {
      perfil: { ...memorySettings.perfil },
      localPadrao: memorySettings.localPadrao,
      horarioAtualPadrao: memorySettings.horarioAtualPadrao,
    }
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) {
      memorySettings = {
        perfil: { ...DEFAULT_SETTINGS.perfil },
        localPadrao: DEFAULT_SETTINGS.localPadrao,
        horarioAtualPadrao: DEFAULT_SETTINGS.horarioAtualPadrao,
      }
      return {
        perfil: { ...DEFAULT_SETTINGS.perfil },
        localPadrao: DEFAULT_SETTINGS.localPadrao,
        horarioAtualPadrao: DEFAULT_SETTINGS.horarioAtualPadrao,
      }
    }
    const parsed: unknown = JSON.parse(raw)
    const sanitized = sanitizeSettings(parsed)
    memorySettings = sanitized
    return sanitized
  } catch (err) {
    console.warn('Erro ao carregar configurações do localStorage:', err)
    return {
      perfil: { ...DEFAULT_SETTINGS.perfil },
      localPadrao: DEFAULT_SETTINGS.localPadrao,
      horarioAtualPadrao: DEFAULT_SETTINGS.horarioAtualPadrao,
    }
  }
}

export function saveSettings(novosDados: Partial<AppSettings>): AppSettings {
  const atual = getSettings()
  const perfilAtualizado: UserProfile = {
    nome:
      novosDados.perfil && typeof novosDados.perfil.nome === 'string'
        ? novosDados.perfil.nome
        : atual.perfil.nome,
    registro:
      novosDados.perfil && typeof novosDados.perfil.registro === 'string'
        ? novosDados.perfil.registro
        : atual.perfil.registro,
    preceptor:
      novosDados.perfil && typeof novosDados.perfil.preceptor === 'string'
        ? novosDados.perfil.preceptor
        : atual.perfil.preceptor,
  }

  let localPadraoAtualizado = atual.localPadrao
  if (typeof novosDados.localPadrao === 'string') {
    const localTrim = novosDados.localPadrao.trim()
    localPadraoAtualizado = isLocalAtendimentoValido(localTrim) ? localTrim : ''
  }

  const atualizado: AppSettings = {
    perfil: perfilAtualizado,
    localPadrao: localPadraoAtualizado,
    horarioAtualPadrao:
      typeof novosDados.horarioAtualPadrao === 'boolean'
        ? novosDados.horarioAtualPadrao
        : atual.horarioAtualPadrao,
  }

  memorySettings = atualizado

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(atualizado))
    } catch (err) {
      console.warn('Erro ao gravar configurações no localStorage:', err)
    }
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent('anamnese-settings-updated', { detail: atualizado }),
      )
    } catch {
      // Ignora erro em ambientes sem suporte
    }
  }

  return atualizado
}

export function formatCurrentTime(data: Date = new Date()): string {
  const d = data instanceof Date && !Number.isNaN(data.getTime()) ? data : new Date()
  const horas = String(d.getHours()).padStart(2, '0')
  const minutos = String(d.getMinutes()).padStart(2, '0')
  return `${horas}:${minutos}`
}

/**
 * Gera os valores iniciais para uma NOVA consulta a partir das configurações salvas.
 * Se uma consulta for aberta pelo histórico, esta função NÃO deve ser usada para
 * evitar sobrescrever os dados preenchidos.
 */
export function getInitialValuesFromSettings(
  settingsInput?: unknown,
  dataReferencia: Date = new Date(),
): Values {
  const settings: AppSettings =
    settingsInput && typeof settingsInput === 'object'
      ? sanitizeSettings(settingsInput)
      : getSettings()

  const valores: Values = {}

  if (settings.perfil.nome.trim()) {
    valores['profissional_nome'] = settings.perfil.nome.trim()
  }
  if (settings.perfil.registro.trim()) {
    valores['profissional_registro'] = settings.perfil.registro.trim()
  }
  if (settings.perfil.preceptor.trim()) {
    valores['preceptor'] = settings.perfil.preceptor.trim()
  }
  if (settings.localPadrao.trim() && isLocalAtendimentoValido(settings.localPadrao.trim())) {
    valores['local_atendimento'] = settings.localPadrao.trim()
  }
  if (settings.horarioAtualPadrao) {
    valores['hora_atendimento'] = formatCurrentTime(dataReferencia)
  }

  return valores
}
