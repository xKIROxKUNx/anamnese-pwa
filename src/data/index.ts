import type { AnamneseTemplate } from '../types/anamnese'
import { geral } from './templates/geral'
import { crianca } from './templates/crianca'
import { gestante } from './templates/gestante'
import { idoso } from './templates/idoso'

export const templates: AnamneseTemplate[] = [geral, crianca, gestante, idoso]

export function getTemplate(id: string): AnamneseTemplate | undefined {
  return templates.find((template) => template.id === id)
}
