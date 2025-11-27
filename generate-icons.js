import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, 'public')

const svgContent = readFileSync(join(publicDir, 'favicon.svg'), 'utf8')

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 }
]

async function generateIcons() {
  for (const { name, size } of sizes) {
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(join(publicDir, name))
    console.log(`Generated ${name}`)
  }
}

generateIcons().catch(console.error)
