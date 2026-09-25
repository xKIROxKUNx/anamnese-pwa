import assert from 'node:assert/strict'
import { strToU8, zipSync } from 'fflate'
import {
  createBackupZip,
  extractBackupRecords,
  parseJsonBackup,
  parseHtmlBackup,
  escapeHtml,
  renderRecordHtml,
  renderIndexHtml,
} from '../src/lib/backup.ts'

console.log('🧪 Iniciando testes de backup, exportação e importação ZIP/JSON/HTML...')

// Mock de registros para teste
const mockRecords = [
  {
    id: 'test-rec-1',
    templateId: 'geral',
    values: {
      nome: 'João Silva',
      data_atendimento: '2026-09-24',
      queixa_principal: 'Dor de cabeça há 3 dias',
      hda: 'Início súbito, pulsátil, intensidade 7/10',
    },
    na: {},
    criadoEm: '2026-09-24T10:00:00.000Z',
    atualizadoEm: '2026-09-24T10:30:00.000Z',
  },
  {
    id: 'test-rec-2',
    templateId: 'crianca',
    values: {
      nome: 'Mariazinha Pereira',
      data_atendimento: '2026-09-23',
      idade: '4 anos',
      queixa_principal: 'Febre e tosse',
    },
    na: { dn_alergias: true },
    criadoEm: '2026-09-23T14:00:00.000Z',
    atualizadoEm: '2026-09-23T14:45:00.000Z',
  },
]

// 1. Testando escapeHtml com tipos variados e caracteres especiais
console.log('1. Testando escapeHtml contra injeção de HTML e tipos não-string...')
assert.equal(
  escapeHtml('<script>alert("xss")</script>'),
  '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
)
assert.equal(escapeHtml("João & Maria 'D'Or'"), 'João &amp; Maria &#039;D&#039;Or&#039;')
assert.equal(escapeHtml(null), '')
assert.equal(escapeHtml(undefined), '')
assert.equal(escapeHtml(42), '42')

// 2. Testando criação de ZIP e conferência dos arquivos internos
console.log('2. Testando criação do arquivo ZIP de backup...')
const zipBytes = createBackupZip(mockRecords)
assert(zipBytes instanceof Uint8Array, 'Deve retornar um Uint8Array')
assert(zipBytes.length > 500, 'Tamanho do ZIP deve ser expressivo')

// 3. Testando extração a partir do ZIP criado e preservação da ordem
console.log('3. Testando extração dos registros a partir do ZIP e ordem...')
const extracted = extractBackupRecords(zipBytes)
assert.equal(extracted.length, 2, 'Deve extrair exatamente os 2 registros')
assert.equal(extracted[0].id, 'test-rec-1', 'Primeiro registro deve manter a ordem do manifest')
assert.equal(extracted[1].id, 'test-rec-2', 'Segundo registro deve manter a ordem do manifest')

const r1 = extracted.find((r) => r.id === 'test-rec-1')
assert(r1, 'Registro 1 deve estar presente')
assert.equal(r1.templateId, 'geral')
assert.equal(r1.values.nome, 'João Silva')
assert.equal(r1.values.queixa_principal, 'Dor de cabeça há 3 dias')

const r2 = extracted.find((r) => r.id === 'test-rec-2')
assert(r2, 'Registro 2 deve estar presente')
assert.equal(r2.templateId, 'crianca')
assert.equal(r2.values.nome, 'Mariazinha Pereira')
assert.equal(r2.na.dn_alergias, true)

// 4. Testando renderização de HTML para prontuário e dados embutidos
console.log('4. Testando renderização do HTML individual e dados embutidos...')
const html1 = renderRecordHtml(mockRecords[0])
assert(html1.includes('João Silva'), 'HTML deve conter o nome do paciente')
assert(html1.includes('Dor de cabeça há 3 dias'), 'HTML deve conter a queixa')
assert(html1.includes('Pedro Lucas'), 'HTML deve conter crédito do autor')
assert(html1.includes('<!doctype html>'), 'HTML deve ser documento autônomo')
assert(html1.includes('id="anamnese-dados"'), 'HTML deve embutir script com dados JSON')

// Testando recuperação a partir do HTML via parseHtmlBackup
const parsedFromHtml = parseHtmlBackup(html1)
assert(parsedFromHtml, 'Deve conseguir extrair registro do HTML gerado')
assert.equal(parsedFromHtml.id, 'test-rec-1')
assert.equal(parsedFromHtml.values.nome, 'João Silva')

// 5. Testando renderIndexHtml
console.log('5. Testando renderIndexHtml com metadados e data inválida...')
const manifestMock = {
  versao: '1.0',
  app: 'Anamnese SOAP',
  exportadoEm: 'data-invalida',
  autor: 'Pedro Lucas',
  total: 2,
  registros: [
    {
      id: 'test-rec-1',
      templateId: 'geral',
      paciente: 'João Silva',
      data: '2026-09-24',
      criadoEm: '2026-09-24T10:00:00.000Z',
      atualizadoEm: '2026-09-24T10:30:00.000Z',
      arquivoJson: 'anamneses/test-rec-1.json',
      arquivoHtml: 'anamneses/test-rec-1.html',
    },
  ],
}
const indexHtml = renderIndexHtml(manifestMock)
assert(indexHtml.includes('João Silva'))
assert(indexHtml.includes('Visualizar HTML'))
assert(indexHtml.includes('Pedro Lucas'))
assert(!indexHtml.includes('Invalid Date'), 'Não deve exibir Invalid Date na tela')

// 6. Testando parseJsonBackup com múltiplos formatos (incluindo organizacao.json direto)
console.log('6. Testando parseJsonBackup (JSON único, lista e manifesto)...')
// Registro único
const parsedSingle = parseJsonBackup(JSON.stringify(mockRecords[0]))
assert.equal(parsedSingle.length, 1)
assert.equal(parsedSingle[0].id, 'test-rec-1')

// Lista de registros
const parsedList = parseJsonBackup(JSON.stringify(mockRecords))
assert.equal(parsedList.length, 2)

// Formato objeto com array 'registros' e valores completos
const parsedObj = parseJsonBackup(JSON.stringify({ registros: mockRecords }))
assert.equal(parsedObj.length, 2)

// JSON inválido ou corrompido
assert.deepEqual(parseJsonBackup('{ invalid json'), [])
assert.deepEqual(parseJsonBackup('null'), [])
assert.deepEqual(parseJsonBackup('123'), [])
assert.deepEqual(parseJsonBackup('{}'), [])

// 7. Testando resiliência da extração de ZIP em subpasta (ex: compactado no Mac/Windows)
console.log('7. Testando extração de ZIP com subdiretórios...')
const nestedZip = zipSync({
  'meu-backup/organizacao.json': strToU8(
    JSON.stringify({
      registros: [
        {
          id: 'test-rec-1',
          arquivoJson: 'anamneses/test-rec-1.json',
        },
      ],
    }),
  ),
  'meu-backup/anamneses/test-rec-1.json': strToU8(JSON.stringify(mockRecords[0])),
  '__MACOSX/._test-rec-1.json': strToU8('binary apple double junk'),
})
const extractedNested = extractBackupRecords(nestedZip)
assert.equal(extractedNested.length, 1, 'Deve extrair o registro mesmo com pasta aninhada')
assert.equal(extractedNested[0].id, 'test-rec-1')
assert.equal(extractedNested[0].values.nome, 'João Silva')

// 8. Testando extração de ZIP contendo APENAS arquivos HTML e organizacao.json (sem .json)
console.log('8. Testando ZIP contendo apenas arquivos HTML com organizacao.json...')
const htmlOnlyZip = zipSync({
  'organizacao.json': strToU8(
    JSON.stringify({
      registros: [
        {
          id: 'test-rec-2',
          templateId: 'crianca',
          arquivoHtml: 'anamneses/test-rec-2.html',
        },
      ],
    }),
  ),
  'anamneses/test-rec-2.html': strToU8(renderRecordHtml(mockRecords[1])),
})
const extractedHtmlOnly = extractBackupRecords(htmlOnlyZip)
assert.equal(extractedHtmlOnly.length, 1, 'Deve extrair o registro do arquivo HTML')
assert.equal(extractedHtmlOnly[0].id, 'test-rec-2')
assert.equal(extractedHtmlOnly[0].values.nome, 'Mariazinha Pereira')

// 9. Testando ZIP sem organizacao.json com arquivos JSON avulsos
console.log('9. Testando ZIP sem organizacao.json...')
const rawZip = zipSync({
  'outro_nome.json': strToU8(JSON.stringify(mockRecords[0])),
  'subpasta/outro_2.json': strToU8(JSON.stringify(mockRecords[1])),
  'invalido.json': strToU8('not a json'),
  'texto.txt': strToU8('apenas texto'),
})
const extractedRaw = extractBackupRecords(rawZip)
assert.equal(extractedRaw.length, 2, 'Deve encontrar os 2 registros mesmo sem organizacao.json')

// 10. Testando ZIP vazio
console.log('10. Testando ZIP vazio...')
const emptyZip = zipSync({
  'info.txt': strToU8('nada aqui'),
})
const extractedEmpty = extractBackupRecords(emptyZip)
assert.equal(extractedEmpty.length, 0, 'Deve retornar array vazio')

console.log('✅ Todos os testes de backup, exportação e importação passaram com sucesso!')
