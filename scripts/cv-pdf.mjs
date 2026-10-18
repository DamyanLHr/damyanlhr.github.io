// The CV as a PDF: julia's CV page printed through its print stylesheet (ink
// on paper, no stage, no chrome) and written to public/cv.pdf, which the CV
// page and the footer link. Run by hand after the CV changes:
//
//   npm run build && npm run cv-pdf
//
// Look at the file before committing it.
import { join } from 'node:path'
import { preview } from 'vite'
import { chromium } from 'playwright'

const server = await preview({ preview: { port: 4180, strictPort: true } })
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
  await page.goto('http://localhost:4180/cv?theme=julia&cpufractal')
  await page.waitForSelector('.j-page h1')
  await page.waitForTimeout(800)
  await page.pdf({
    path: join(process.cwd(), 'public', 'cv.pdf'),
    format: 'A4',
    margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' },
    printBackground: false,
  })
  console.log('cv-pdf: public/cv.pdf')
} finally {
  await browser.close()
  server.httpServer.close()
}
