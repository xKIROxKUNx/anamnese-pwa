import type { AnamneseTemplate, NaFlags, Values } from '../types/anamnese'
import { formatValue } from './values'
import { str } from './calc'

export interface DocItem {
  label: string
  value: string
  /** Textos longos viram parágrafo próprio no documento. */
  block: boolean
}

export interface DocSection {
  title: string
  items: DocItem[]
}

export interface DocBlock {
  key: string
  title: string
  sections: DocSection[]
}

export interface ClinicalDocument {
  title: string
  paciente: string
  atendimento: string
  profissional: string
  blocks: DocBlock[]
  isEmpty: boolean
}

const LONG_VALUE = 90

export function buildDocument(
  template: AnamneseTemplate,
  values: Values,
  na: NaFlags,
): ClinicalDocument {
  const blocks: DocBlock[] = []

  for (const block of template.blocks) {
    const sections: DocSection[] = []

    for (const section of block.sections) {
      const items: DocItem[] = []
      for (const field of section.fields) {
        const value = formatValue(field, values, na)
        if (!value) continue
        items.push({
          label: field.label,
          value,
          block: field.type === 'textarea' || value.includes('\n') || value.length > LONG_VALUE,
        })
      }
      if (items.length > 0) sections.push({ title: section.title, items })
    }

    if (sections.length > 0) {
      blocks.push({ key: block.key, title: `${block.key} — ${block.title}`, sections })
    }
  }

  return {
    title: template.title,
    paciente: str(values, 'nome') || 'Paciente não identificado',
    atendimento: atendimento(values),
    profissional: profissional(values),
    blocks,
    isEmpty: blocks.length === 0,
  }
}

function atendimento(values: Values): string {
  const data = str(values, 'data_atendimento')
  const hora = str(values, 'hora_atendimento')
  const dataTexto = data ? data.split('-').reverse().join('/') : hoje()
  return hora ? `${dataTexto} às ${hora}` : dataTexto
}

function hoje(): string {
  return new Date().toLocaleDateString('pt-BR')
}

function profissional(values: Values): string {
  const nome = str(values, 'profissional_nome')
  const registro = str(values, 'profissional_registro')
  if (nome && registro) return `${nome} — ${registro}`
  return nome || registro
}

/** Nome sugerido ao salvar o PDF: o navegador usa o título do documento. */
export function documentFileName(doc: ClinicalDocument): string {
  const slug = doc.paciente
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  const data = new Date().toISOString().slice(0, 10)
  return `anamnese-${slug || 'paciente'}-${data}`
}
