// Gera os PNGs do manifesto a partir do favicon SVG: npm run icons
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(resolve(root, 'public/favicon.svg'))
const outDir = resolve(root, 'public/icons')
await mkdir(outDir, { recursive: true })

/** O ícone maskable precisa de margem: o sistema recorta as bordas. */
const maskable = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
     <rect width="64" height="64" fill="#2563eb"/>
     <g transform="translate(12.8 12.8) scale(0.6)">${source
       .toString()
       .replace(/^[\s\S]*?<svg[^>]*>/, '')
       .replace(/<\/svg>\s*$/, '')}</g>
   </svg>`,
)

const jobs = [
  { input: source, size: 192, name: 'icon-192.png' },
  { input: source, size: 512, name: 'icon-512.png' },
  { input: maskable, size: 512, name: 'icon-maskable-512.png' },
]

for (const job of jobs) {
  const png = await sharp(job.input, { density: 384 }).resize(job.size, job.size).png().toBuffer()
  await writeFile(resolve(outDir, job.name), png)
  console.log(`public/icons/${job.name} — ${job.size}×${job.size}`)
}
