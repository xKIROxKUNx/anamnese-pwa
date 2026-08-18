import type { AnamneseTemplate, Field, FieldValue, NaFlags, Values } from '../types/anamnese'

/** Campos calculados não contam como preenchimento do usuário. */
export function isAnswerable(field: Field): boolean {
  return field.type !== 'computed'
}

export function hasValue(value: FieldValue | undefined): boolean {
  if (value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  return value.amount.trim() !== ''
}

/** Um item conta como respondido quando tem valor ou foi marcado "não se aplica". */
export function isAnswered(field: Field, values: Values, na: NaFlags): boolean {
  if (!isAnswerable(field)) return false
  if (na[field.id]) return true
  return hasValue(values[field.id])
}

export function countSection(fields: Field[], values: Values, na: NaFlags) {
  const answerable = fields.filter(isAnswerable)
  const answered = answerable.filter((field) => isAnswered(field, values, na))
  return { total: answerable.length, answered: answered.length }
}

export function countTemplate(template: AnamneseTemplate, values: Values, na: NaFlags) {
  let total = 0
  let answered = 0
  for (const block of template.blocks) {
    for (const section of block.sections) {
      const counts = countSection(section.fields, values, na)
      total += counts.total
      answered += counts.answered
    }
  }
  return { total, answered, percent: total === 0 ? 0 : Math.round((answered / total) * 100) }
}

/** Texto do valor de um campo, como aparece no documento impresso. */
export function formatValue(field: Field, values: Values, na: NaFlags): string {
  if (na[field.id]) return 'não se aplica'

  if (field.type === 'computed') return field.compute ? field.compute(values) : ''

  const value = values[field.id]
  if (value === undefined || !hasValue(value)) return ''

  if (typeof value === 'string') {
    const text = value.trim()
    if (field.type === 'date') return formatDate(text)
    if (field.type === 'scale') return `${text}/${field.max ?? 10}`
    return field.unit ? `${text} ${field.unit}` : text
  }

  if (Array.isArray(value)) return value.join(', ')

  return `há ${value.amount.trim()} ${value.unit}`
}

function formatDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const [y, m, d] = value.split('-')
  return `${d}/${m}/${y}`
}
