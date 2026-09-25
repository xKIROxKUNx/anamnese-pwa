import { jsPDF } from 'jspdf'
import type { ClinicalDocument } from './document'
import { documentFileName } from './document'

/**
 * Monta o documento clínico em A4 e entrega o arquivo pronto para download.
 * O texto é desenhado como texto (não imagem): o PDF fica leve, pesquisável e
 * imprime bem. As fontes padrão do PDF cobrem toda a acentuação do português.
 */

const PAGE = { width: 210, height: 297 }
const MARGIN = { top: 18, right: 16, bottom: 22, left: 16 }
const FOOTER = { rule: PAGE.height - 15, text: PAGE.height - 11 }
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right

const PT_TO_MM = 0.352_777_8
const LINE_RATIO = 1.32

const SIZE = {
  title: 15,
  meta: 9.5,
  block: 11.5,
  section: 10.5,
  item: 10.5,
  footer: 8.5,
}

type Style = 'normal' | 'bold'

export function downloadAnamnesePdf(doc: ClinicalDocument): void {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  pdf.setFont('times', 'normal')
  pdf.setProperties({ title: doc.title, subject: `Anamnese — ${doc.paciente}` })

  let y = MARGIN.top

  const lineHeight = (size: number) => size * PT_TO_MM * LINE_RATIO

  const use = (size: number, style: Style) => {
    pdf.setFontSize(size)
    pdf.setFont('times', style)
  }

  const widthOf = (text: string, size: number, style: Style) => {
    use(size, style)
    return pdf.getTextWidth(text)
  }

  const newPage = () => {
    pdf.addPage()
    y = MARGIN.top
  }

  const ensure = (needed: number) => {
    if (y + needed > PAGE.height - MARGIN.bottom) newPage()
  }

  const rule = (thickness: number, gapBefore = 0, gapAfter = 0) => {
    y += gapBefore
    pdf.setLineWidth(thickness)
    pdf.setDrawColor(0)
    pdf.line(MARGIN.left, y, PAGE.width - MARGIN.right, y)
    y += gapAfter
  }

  /** Quebra o texto sabendo que a primeira linha divide espaço com o rótulo. */
  const wrap = (text: string, size: number, firstWidth: number, restWidth: number): string[] => {
    use(size, 'normal')
    const lines: string[] = []
    for (const paragraph of text.split('\n')) {
      const words = paragraph.split(/\s+/).filter(Boolean)
      if (words.length === 0) {
        lines.push('')
        continue
      }
      let current = ''
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word
        const limit = lines.length === 0 ? firstWidth : restWidth
        if (pdf.getTextWidth(candidate) <= limit || current === '') {
          current = candidate
        } else {
          lines.push(current)
          current = word
        }
      }
      lines.push(current)
    }
    return lines
  }

  const writeItem = (label: string, value: string) => {
    const labelText = `${label}: `
    const labelWidth = widthOf(labelText, SIZE.item, 'bold')
    const lines = wrap(value, SIZE.item, CONTENT_WIDTH - labelWidth, CONTENT_WIDTH)
    const step = lineHeight(SIZE.item)

    ensure(step * Math.min(lines.length, 2))

    lines.forEach((line, index) => {
      if (index > 0) ensure(step)
      if (index === 0) {
        use(SIZE.item, 'bold')
        pdf.text(labelText, MARGIN.left, y)
        use(SIZE.item, 'normal')
        pdf.text(line, MARGIN.left + labelWidth, y)
      } else {
        use(SIZE.item, 'normal')
        pdf.text(line, MARGIN.left, y)
      }
      y += step
    })
  }

  // ------------------------------------------------------------- cabeçalho
  use(SIZE.title, 'bold')
  pdf.text(doc.title.toUpperCase(), MARGIN.left, y + lineHeight(SIZE.title) * 0.75)
  y += lineHeight(SIZE.title) * 1.05

  const metaLine = (entries: Array<[string, string]>) => {
    let x = MARGIN.left
    for (const [label, value] of entries) {
      const labelText = `${label}: `
      use(SIZE.meta, 'bold')
      pdf.text(labelText, x, y)
      x += pdf.getTextWidth(labelText)
      use(SIZE.meta, 'normal')
      pdf.text(value, x, y)
      x += pdf.getTextWidth(value) + 8
    }
    y += lineHeight(SIZE.meta)
  }

  y += lineHeight(SIZE.meta) * 0.75
  metaLine([
    ['Paciente', doc.paciente],
    ['Atendimento', doc.atendimento],
  ])
  if (doc.profissional) metaLine([['Responsável', doc.profissional]])

  rule(0.5, 0.6, lineHeight(SIZE.item) * 0.9)

  // ----------------------------------------------------------------- corpo
  if (doc.isEmpty) {
    use(SIZE.item, 'normal')
    pdf.text(
      'Nenhum item preenchido nesta anamnese.',
      MARGIN.left,
      y + lineHeight(SIZE.item),
    )
    y += lineHeight(SIZE.item) * 2
  }

  for (const block of doc.blocks) {
    ensure(lineHeight(SIZE.block) * 3)
    y += lineHeight(SIZE.item) * 0.5
    use(SIZE.block, 'bold')
    pdf.text(block.title.toUpperCase(), MARGIN.left, y)
    y += lineHeight(SIZE.block) * 0.35
    rule(0.2, 0, lineHeight(SIZE.item) * 0.85)

    for (const section of block.sections) {
      ensure(lineHeight(SIZE.section) + lineHeight(SIZE.item) * 2)
      use(SIZE.section, 'bold')
      pdf.text(section.title, MARGIN.left, y)
      y += lineHeight(SIZE.section)

      for (const item of section.items) writeItem(item.label, item.value)

      y += lineHeight(SIZE.item) * 0.45
    }
  }

  // ------------------------------------------------- rodapé de cada página
  const pages = pdf.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page)
    pdf.setLineWidth(0.2)
    pdf.setDrawColor(0)
    pdf.line(MARGIN.left, FOOTER.rule, PAGE.width - MARGIN.right, FOOTER.rule)
    use(SIZE.footer, 'normal')
    pdf.text('Documento gerado no app Anamnese', MARGIN.left, FOOTER.text)
    if (pages > 1) {
      pdf.text(
        `${page}/${pages}`,
        PAGE.width - MARGIN.right,
        FOOTER.text,
        { align: 'right' },
      )
    }
  }

  pdf.save(`${documentFileName(doc)}.pdf`)
}
