/** Valor bruto de um campo, tal como guardado no estado do formulário. */
export type FieldValue =
  | string
  | string[]
  | { amount: string; unit: string }

/** Estado completo de um formulário: id do campo -> valor. */
export type Values = Record<string, FieldValue | undefined>

/** Campos marcados como "não se aplica". */
export type NaFlags = Record<string, boolean>

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'select'
  | 'radio'
  | 'chips'
  | 'duration'
  | 'scale'
  | 'computed'

export interface Field {
  id: string
  label: string
  type: FieldType
  /** Opções para select / radio / chips. */
  options?: string[]
  /** Unidade exibida à direita de campos numéricos (cm, kg, bpm...). */
  unit?: string
  placeholder?: string
  /** Texto de apoio abaixo do campo — dicas semiológicas, valores de referência. */
  help?: string
  /** Renderiza a caixa "não se aplica", que desabilita o campo. */
  naToggle?: boolean
  /** Largura em colunas do grid (1 = estreito, 3 = linha inteira). */
  span?: 1 | 2 | 3
  /** Só para type 'computed': deriva o valor dos demais campos. */
  compute?: (values: Values) => string
  /** Unidades disponíveis em campos 'duration'. */
  units?: string[]
  min?: number
  max?: number
  step?: number
  rows?: number
}

export interface Section {
  id: string
  title: string
  /** Frase curta que aparece sob o título da seção. */
  hint?: string
  fields: Field[]
}

export type SoapKey = 'S' | 'O' | 'A' | 'P'

export interface SoapBlock {
  key: SoapKey
  title: string
  subtitle: string
  sections: Section[]
}

export interface AnamneseTemplate {
  id: string
  title: string
  subtitle: string
  /** Frase de apresentação exibida no card da tela inicial. */
  description: string
  /** Emoji usado como marca visual do roteiro. */
  icon: string
  /** Cor de destaque (hsl) usada no tema da tela do roteiro. */
  accent: string
  accentSoft: string
  blocks: SoapBlock[]
}

export const SOAP_LABELS: Record<SoapKey, string> = {
  S: 'Subjetivo',
  O: 'Objetivo',
  A: 'Avaliação',
  P: 'Plano',
}
