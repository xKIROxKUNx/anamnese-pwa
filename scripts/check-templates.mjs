// Verificação de sanidade dos roteiros: ids duplicados dentro do mesmo template
// fariam dois itens compartilharem o mesmo valor e aparecerem repetidos no PDF.
import { templates } from '../src/data/index.ts'

let problems = 0

for (const template of templates) {
  const seen = new Map()
  let fields = 0
  for (const block of template.blocks) {
    for (const section of block.sections) {
      for (const field of section.fields) {
        fields += 1
        const where = `${block.key} › ${section.title}`
        if (seen.has(field.id)) {
          problems += 1
          console.error(`[${template.id}] id repetido "${field.id}": ${seen.get(field.id)} e ${where}`)
        } else {
          seen.set(field.id, where)
        }
      }
    }
  }
  const sections = template.blocks.reduce((n, b) => n + b.sections.length, 0)
  console.log(`${template.id}: ${template.blocks.length} blocos, ${sections} seções, ${fields} campos`)
}

if (problems > 0) {
  console.error(`\n${problems} problema(s) encontrado(s).`)
  process.exit(1)
}
console.log('\nSem ids duplicados.')
