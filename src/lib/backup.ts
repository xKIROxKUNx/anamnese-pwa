import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { getTemplate } from '../data'
import { buildDocument } from './document'
import {
  createRecordId,
  dataDoRegistro,
  formatarData,
  listRecords,
  pacienteDoRegistro,
  writeRecord,
  type StoredRecord,
} from './storage'
import type { NaFlags, Values } from '../types/anamnese'

export interface ExportRecordItem {
  id: string
  templateId: string
  paciente: string
  data: string
  criadoEm: string
  atualizadoEm: string
  arquivoJson: string
  arquivoHtml: string
  values?: Values
  na?: NaFlags
}

export interface ExportOrganization {
  versao: string
  app: string
  exportadoEm: string
  autor: string
  total: number
  registros: ExportRecordItem[]
}

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Extrai um registro StoredRecord embutido em um documento HTML de anamnese.
 */
export function parseHtmlBackup(htmlText: string): StoredRecord | null {
  try {
    const scriptMatch =
      htmlText.match(/<script[^>]*id=["']anamnese-dados["'][^>]*>([\s\S]*?)<\/script>/i) ??
      htmlText.match(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i)

    if (scriptMatch && scriptMatch[1]) {
      const parsed = JSON.parse(scriptMatch[1].trim())
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.id === 'string' &&
        typeof parsed.values === 'object' &&
        parsed.values !== null
      ) {
        return parsed as StoredRecord
      }
    }

    const idMatch = htmlText.match(/<meta[^>]*name=["']anamnese-id["'][^>]*content=["']([^"']*)["']/i)
    const templateMatch = htmlText.match(
      /<meta[^>]*name=["']anamnese-template["'][^>]*content=["']([^"']*)["']/i,
    )
    const criadoMatch = htmlText.match(
      /<meta[^>]*name=["']anamnese-criado-em["'][^>]*content=["']([^"']*)["']/i,
    )
    const atualizadoMatch = htmlText.match(
      /<meta[^>]*name=["']anamnese-atualizado-em["'][^>]*content=["']([^"']*)["']/i,
    )

    if (idMatch && templateMatch) {
      return {
        id: idMatch[1],
        templateId: templateMatch[1],
        values: {},
        na: {},
        criadoEm: criadoMatch ? criadoMatch[1] : new Date().toISOString(),
        atualizadoEm: atualizadoMatch ? atualizadoMatch[1] : new Date().toISOString(),
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Renderiza um documento HTML completo e autônomo para uma anamnese específica,
 * incorporando metadados e os dados estruturados para possibilitar reimportação direta.
 */
export function renderRecordHtml(record: StoredRecord): string {
  const template = getTemplate(record.templateId)
  const doc = template ? buildDocument(template, record.values, record.na) : null
  const paciente = pacienteDoRegistro(record)
  const data = formatarData(dataDoRegistro(record))
  const tituloTemplate = template?.title ?? 'Anamnese'

  let bodyContent = ''
  if (doc && !doc.isEmpty) {
    bodyContent = doc.blocks
      .map((block) => {
        const sectionsHtml = block.sections
          .map((sec) => {
            const itemsHtml = sec.items
              .map((item) => {
                if (item.block) {
                  return `
            <div class="item item--block">
              <div class="item-label">${escapeHtml(item.label)}</div>
              <div class="item-value item-value--multiline">${escapeHtml(item.value)}</div>
            </div>`
                }
                return `
            <div class="item">
              <span class="item-label">${escapeHtml(item.label)}:</span>
              <span class="item-value">${escapeHtml(item.value)}</span>
            </div>`
              })
              .join('')

            return `
          <section class="section">
            <h3 class="section-title">${escapeHtml(sec.title)}</h3>
            <div class="section-items">${itemsHtml}</div>
          </section>`
          })
          .join('')

        return `
        <article class="block">
          <h2 class="block-title">${escapeHtml(block.title)}</h2>
          ${sectionsHtml}
        </article>`
      })
      .join('')
  } else if (record.values && Object.keys(record.values).length > 0) {
    // Fallback caso o template não seja encontrado mas haja dados clínicos preenchidos
    const itemsHtml = Object.entries(record.values)
      .filter(([, val]) => val && String(val).trim())
      .map(
        ([key, val]) => `
      <div class="item">
        <span class="item-label">${escapeHtml(key)}:</span>
        <span class="item-value">${escapeHtml(val)}</span>
      </div>`,
      )
      .join('')

    bodyContent = `
      <article class="block">
        <h2 class="block-title">Dados Clínicos</h2>
        <div class="section-items">${itemsHtml}</div>
      </article>`
  } else {
    bodyContent = '<p class="empty-notice">Nenhum dado clínico preenchido neste registro.</p>'
  }

  // Previne que tags de fechamento de script no JSON quebrem o parser HTML
  const jsonSeguro = JSON.stringify(record).replace(/<\//g, '<\\/')

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="anamnese-id" content="${escapeHtml(record.id)}" />
  <meta name="anamnese-template" content="${escapeHtml(record.templateId)}" />
  <meta name="anamnese-criado-em" content="${escapeHtml(record.criadoEm)}" />
  <meta name="anamnese-atualizado-em" content="${escapeHtml(record.atualizadoEm)}" />
  <title>Anamnese — ${escapeHtml(paciente)}</title>
  <style>
    :root {
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      --bg: #ffffff;
      --ink: #0f172a;
      --ink-muted: #64748b;
      --line: #e2e8f0;
      --accent: #2563eb;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f172a;
        --ink: #f8fafc;
        --ink-muted: #94a3b8;
        --line: #334155;
        --accent: #3b82f6;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--ink);
      line-height: 1.6;
      margin: 0;
      padding: 32px 20px;
    }
    .container { max-width: 820px; margin: 0 auto; }
    .header { border-bottom: 2px solid var(--accent); padding-bottom: 20px; margin-bottom: 28px; }
    .header h1 { margin: 0 0 6px; font-size: 1.8rem; color: var(--accent); }
    .header .meta { font-size: 0.95rem; color: var(--ink-muted); display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px; }
    .block { margin-top: 28px; background: rgba(0,0,0,0.015); border: 1px solid var(--line); border-radius: 12px; padding: 20px; }
    .block-title { margin-top: 0; font-size: 1.25rem; color: var(--accent); border-bottom: 1px solid var(--line); padding-bottom: 8px; }
    .section { margin-top: 18px; }
    .section-title { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-muted); margin: 0 0 10px; font-weight: 700; }
    .section-items { display: grid; gap: 8px; }
    .item { font-size: 0.95rem; }
    .item-label { font-weight: 600; color: var(--ink); }
    .item-value { color: var(--ink); }
    .item-value--multiline { white-space: pre-wrap; margin-top: 4px; padding: 10px; background: rgba(0,0,0,0.03); border-radius: 8px; }
    .empty-notice { color: var(--ink-muted); font-style: italic; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 0.82rem; color: var(--ink-muted); text-align: center; }
    @media print {
      body { padding: 0; background: #fff; color: #000; }
      .block { border: 1px solid #ccc; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>${escapeHtml(tituloTemplate)}</h1>
      <div class="meta">
        <span><strong>Paciente:</strong> ${escapeHtml(paciente)}</span>
        <span><strong>Data:</strong> ${escapeHtml(data)}</span>
        <span><strong>ID:</strong> ${escapeHtml(record.id)}</span>
      </div>
    </header>
    <main>
      ${bodyContent}
    </main>
    <footer class="footer">
      Anamnese SOAP · Exportado em ${escapeHtml(new Date().toLocaleDateString('pt-BR'))} · App criado e distribuido por Pedro Lucas
    </footer>
  </div>
  <script type="application/json" id="anamnese-dados">
${jsonSeguro}
  </script>
</body>
</html>`
}

/**
 * Renderiza o índice geral (index.html) dentro do pacote ZIP para navegação visual offline.
 */
export function renderIndexHtml(manifest: ExportOrganization): string {
  const itensHtml = manifest.registros
    .map(
      (r) => `
    <li class="card">
      <div class="card-info">
        <h3>${escapeHtml(r.paciente)}</h3>
        <p class="card-meta">Data: ${escapeHtml(formatarData(r.data))} · Roteiro: ${escapeHtml(r.templateId)}</p>
      </div>
      <div class="card-actions">
        <a class="btn" href="${escapeHtml(r.arquivoHtml)}" target="_blank" rel="noopener">Visualizar HTML</a>
        <a class="btn btn-secondary" href="${escapeHtml(r.arquivoJson)}" target="_blank" rel="noopener">JSON</a>
      </div>
    </li>`,
    )
    .join('')

  let dataExportacao = ''
  try {
    const d = new Date(manifest.exportadoEm)
    dataExportacao = isNaN(d.getTime()) ? manifest.exportadoEm : d.toLocaleString('pt-BR')
  } catch {
    dataExportacao = manifest.exportadoEm
  }

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Histórico de Anamneses — Exportação</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.5; color: #1e293b; }
    h1 { color: #2563eb; margin-bottom: 4px; }
    .summary { color: #64748b; margin-bottom: 24px; font-size: 0.95rem; }
    .list { list-style: none; padding: 0; display: grid; gap: 12px; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; background: #fff; }
    .card-info h3 { margin: 0 0 4px; font-size: 1.1rem; }
    .card-meta { margin: 0; color: #64748b; font-size: 0.88rem; }
    .card-actions { display: flex; gap: 8px; }
    .btn { display: inline-block; padding: 8px 14px; background: #2563eb; color: #fff; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 600; }
    .btn-secondary { background: #f1f5f9; color: #334155; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 0.85rem; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <h1>Histórico de Anamneses</h1>
  <p class="summary">Total de ${manifest.total} anamnese(s) exportada(s) em ${escapeHtml(
    dataExportacao,
  )}.</p>
  <ul class="list">
    ${itensHtml || '<li class="card">Nenhuma anamnese exportada.</li>'}
  </ul>
  <footer class="footer">
    Anamnese SOAP · App criado e distribuido por Pedro Lucas
  </footer>
</body>
</html>`
}

/**
 * Cria os bytes de um arquivo ZIP contendo cada histórico em JSON e HTML,
 * junto ao JSON de organização e um index.html de navegação offline.
 */
export function createBackupZip(records: StoredRecord[]): Uint8Array {
  const manifest: ExportOrganization = {
    versao: '1.0',
    app: 'Anamnese SOAP',
    exportadoEm: new Date().toISOString(),
    autor: 'Pedro Lucas',
    total: records.length,
    registros: records.map((r) => ({
      id: r.id,
      templateId: r.templateId,
      paciente: pacienteDoRegistro(r),
      data: dataDoRegistro(r),
      criadoEm: r.criadoEm,
      atualizadoEm: r.atualizadoEm,
      arquivoJson: `anamneses/${r.id}.json`,
      arquivoHtml: `anamneses/${r.id}.html`,
      values: r.values,
      na: r.na,
    })),
  }

  const zipEntries: Record<string, Uint8Array> = {
    'organizacao.json': strToU8(JSON.stringify(manifest, null, 2)),
    'index.html': strToU8(renderIndexHtml(manifest)),
  }

  for (const record of records) {
    zipEntries[`anamneses/${record.id}.json`] = strToU8(JSON.stringify(record, null, 2))
    zipEntries[`anamneses/${record.id}.html`] = strToU8(renderRecordHtml(record))
  }

  return zipSync(zipEntries)
}

/**
 * Extrai registros de anamnese a partir dos bytes de um arquivo ZIP,
 * priorizando o JSON de organização e organizando os atendimentos de acordo com ele.
 * Suporta subdiretórios, ignora arquivos de sistema do macOS e extrai dados tanto de .json quanto de .html.
 */
export function extractBackupRecords(zipBuffer: Uint8Array): StoredRecord[] {
  const unzipped = unzipSync(zipBuffer)
  const recordsMap = new Map<string, StoredRecord>()

  // Normaliza caminhos no ZIP para barras comuns '/', ignora arquivos de sistema (como __MACOSX ou .DS_Store)
  const normalizedFiles: Record<string, Uint8Array> = {}
  for (const [key, val] of Object.entries(unzipped)) {
    const norm = key.replace(/\\/g, '/').replace(/^\/+/, '')
    if (norm.includes('__MACOSX/') || norm.split('/').some((part) => part.startsWith('._'))) {
      continue
    }
    normalizedFiles[norm] = val
  }

  // 1. Procurar arquivo de organização (organizacao.json, manifest.json ou index.json)
  let orgJson: any = null
  let orgBaseDir = ''

  const orgCandidates = Object.keys(normalizedFiles).filter((f) => {
    const base = f.split('/').pop()?.toLowerCase()
    return base === 'organizacao.json' || base === 'manifest.json' || base === 'index.json'
  })

  orgCandidates.sort((a, b) => {
    const priority = (name: string) => {
      if (name.endsWith('organizacao.json')) return 1
      if (name.endsWith('manifest.json')) return 2
      return 3
    }
    return priority(a) - priority(b)
  })

  for (const candidate of orgCandidates) {
    try {
      const parsed = JSON.parse(strFromU8(normalizedFiles[candidate]))
      if (parsed && typeof parsed === 'object' && (parsed.registros || parsed.anamneses)) {
        orgJson = parsed
        const lastSlash = candidate.lastIndexOf('/')
        orgBaseDir = lastSlash !== -1 ? candidate.slice(0, lastSlash + 1) : ''
        break
      }
    } catch {
      // continua tentando o próximo candidato
    }
  }

  const orderedIds: string[] = []

  // Se tem arquivo de organização, segue as referências indicadas e organiza os registros
  if (orgJson && (Array.isArray(orgJson.registros) || Array.isArray(orgJson.anamneses))) {
    const list = orgJson.registros || orgJson.anamneses
    for (const item of list) {
      if (!item || typeof item !== 'object') continue

      const itemId = (item.id && String(item.id).trim()) || ''
      let recordFound: StoredRecord | null = null

      // Se o item do manifest já tem o payload de valores completo
      if (typeof item.values === 'object' && item.values !== null) {
        recordFound = {
          id: itemId || createRecordId(),
          templateId: item.templateId || 'geral',
          values: item.values,
          na: typeof item.na === 'object' && item.na !== null ? item.na : {},
          criadoEm: item.criadoEm || item.atualizadoEm || new Date().toISOString(),
          atualizadoEm: item.atualizadoEm || item.criadoEm || new Date().toISOString(),
        }
      }

      // Procura em arquivos associados (JSON e HTML) se ainda não encontrou ou para ler o arquivo do disco
      const pathsToTry = [
        item.arquivoJson,
        item.arquivo,
        itemId ? `anamneses/${itemId}.json` : null,
        itemId ? `${itemId}.json` : null,
        item.arquivoHtml,
        itemId ? `anamneses/${itemId}.html` : null,
        itemId ? `${itemId}.html` : null,
      ].filter(Boolean) as string[]

      for (const p of pathsToTry) {
        const cleanP = p.replace(/\\/g, '/').replace(/^\/+/, '')
        const possibleKeys = [orgBaseDir + cleanP, cleanP, cleanP.split('/').pop()!]

        let fileData: Uint8Array | undefined
        for (const k of possibleKeys) {
          if (normalizedFiles[k]) {
            fileData = normalizedFiles[k]
            break
          }
        }

        if (fileData) {
          const text = strFromU8(fileData)
          if (cleanP.endsWith('.json') || !cleanP.includes('.')) {
            try {
              const parsed = JSON.parse(text)
              if (parsed && typeof parsed === 'object') {
                const finalId = parsed.id || itemId || createRecordId()
                const finalTemplate = parsed.templateId || item.templateId || 'geral'
                const finalValues =
                  (typeof parsed.values === 'object' && parsed.values) ||
                  (typeof item.values === 'object' && item.values) ||
                  {}
                const finalNa =
                  (typeof parsed.na === 'object' && parsed.na) ||
                  (typeof item.na === 'object' && item.na) ||
                  {}

                recordFound = {
                  id: finalId,
                  templateId: finalTemplate,
                  values: finalValues,
                  na: finalNa,
                  criadoEm: parsed.criadoEm || item.criadoEm || new Date().toISOString(),
                  atualizadoEm: parsed.atualizadoEm || item.atualizadoEm || new Date().toISOString(),
                }
                break
              }
            } catch {
              // continua tentando outros caminhos
            }
          } else if (cleanP.endsWith('.html') || cleanP.endsWith('.htm')) {
            const fromHtml = parseHtmlBackup(text)
            if (fromHtml) {
              recordFound = {
                ...fromHtml,
                id: fromHtml.id || itemId || createRecordId(),
                templateId: fromHtml.templateId || item.templateId || 'geral',
              }
              break
            }
          }
        }
      }

      if (recordFound && recordFound.id) {
        recordsMap.set(recordFound.id, recordFound)
        orderedIds.push(recordFound.id)
      }
    }
  }

  // 2. Escaneamento geral de quaisquer outros arquivos (.json e .html) no zip não processados
  for (const [filename, content] of Object.entries(normalizedFiles)) {
    const base = filename.split('/').pop()?.toLowerCase() ?? ''
    if (
      base === 'organizacao.json' ||
      base === 'manifest.json' ||
      base === 'index.json' ||
      base === 'index.html'
    ) {
      continue
    }

    if (filename.endsWith('.json')) {
      try {
        const parsed = JSON.parse(strFromU8(content))
        if (parsed && typeof parsed === 'object') {
          if (parsed.id && parsed.values && typeof parsed.values === 'object') {
            if (!recordsMap.has(parsed.id)) {
              recordsMap.set(parsed.id, parsed as StoredRecord)
            }
          } else if (Array.isArray(parsed)) {
            for (const sub of parsed) {
              if (
                sub &&
                typeof sub === 'object' &&
                sub.id &&
                sub.values &&
                typeof sub.values === 'object'
              ) {
                if (!recordsMap.has(sub.id)) {
                  recordsMap.set(sub.id, sub as StoredRecord)
                }
              }
            }
          }
        }
      } catch {
        // Ignora
      }
    } else if (filename.endsWith('.html') || filename.endsWith('.htm')) {
      const fromHtml = parseHtmlBackup(strFromU8(content))
      if (fromHtml && !recordsMap.has(fromHtml.id)) {
        recordsMap.set(fromHtml.id, fromHtml)
      }
    }
  }

  // Retorna organizados de acordo com o json de organização primeiro, depois os residuais
  const result: StoredRecord[] = []
  for (const id of orderedIds) {
    const rec = recordsMap.get(id)
    if (rec) {
      result.push(rec)
      recordsMap.delete(id)
    }
  }
  for (const rec of recordsMap.values()) {
    result.push(rec)
  }

  return result
}

/**
 * Lê backup a partir de texto JSON simples (único registro, lista ou formato manifest).
 */
export function parseJsonBackup(text: string): StoredRecord[] {
  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object') return []

    // Caso 1: Array de registros
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) =>
          item &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.values === 'object' &&
          item.values !== null,
      )
    }

    // Caso 2: Registro único
    if (parsed.id && parsed.values && typeof parsed.values === 'object') {
      return [parsed as StoredRecord]
    }

    // Caso 3: Arquivo de manifesto / organização (organizacao.json)
    const list = parsed.registros || parsed.anamneses
    if (Array.isArray(list)) {
      const valid = list.filter(
        (item) =>
          item &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.values === 'object' &&
          item.values !== null,
      )
      if (valid.length > 0) return valid
    }

    return []
  } catch {
    return []
  }
}

/**
 * Realiza o download do arquivo ZIP contendo todo o histórico no navegador.
 */
export async function exportHistoryZip(): Promise<{ count: number; filename: string }> {
  const records = await listRecords()
  if (records.length === 0) {
    throw new Error('Nenhuma anamnese encontrada no histórico para exportar.')
  }

  const zipBytes = createBackupZip(records)
  const dataHoje = new Date().toISOString().slice(0, 10)
  const filename = `anamnese-historico-${dataHoje}.zip`

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([zipBytes as unknown as BlobPart], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return { count: records.length, filename }
}

/**
 * Importa histórico a partir de arquivo ZIP, JSON ou HTML enviado pelo usuário.
 */
export async function importHistoryFile(file: File): Promise<{
  imported: number
  totalFound: number
  message: string
}> {
  let records: StoredRecord[] = []

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // Identificação robusta de arquivo ZIP: checa extensão, mimeType e assinatura mágica (PK..)
  const isZip =
    file.name.toLowerCase().endsWith('.zip') ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b)

  if (isZip) {
    records = extractBackupRecords(bytes)
    if (records.length === 0) {
      throw new Error('Nenhum registro válido de anamnese foi encontrado no arquivo ZIP.')
    }
  } else {
    const text = new TextDecoder('utf-8').decode(bytes)
    records = parseJsonBackup(text)

    // Se não for JSON direto, tenta recuperar anamnese a partir de documento HTML exportado
    if (records.length === 0) {
      const fromHtml = parseHtmlBackup(text)
      if (fromHtml) {
        records = [fromHtml]
      }
    }

    if (records.length === 0) {
      throw new Error('Nenhum registro válido de anamnese foi encontrado no arquivo selecionado.')
    }
  }

  let count = 0
  for (const record of records) {
    const res = await writeRecord(record)
    if (res === 'ok') {
      count += 1
    }
  }

  if (count === 0) {
    throw new Error('Não foi possível gravar os registros no armazenamento local do aplicativo.')
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('anamnese-storage-updated'))
  }

  return {
    imported: count,
    totalFound: records.length,
    message: `${count} anamnese${count === 1 ? '' : 's'} importada${count === 1 ? '' : 's'} com sucesso!`,
  }
}
