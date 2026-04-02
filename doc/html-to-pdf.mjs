import puppeteer from 'puppeteer';
import { readdir } from 'fs/promises';
import { resolve, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function convertHtmlToPdf() {
  const docDir = __dirname;
  const files = await readdir(docDir);
  const htmlFiles = files.filter(f => f.startsWith('moragora') && f.endsWith('.html'));

  if (htmlFiles.length === 0) {
    console.log('변환할 HTML 파일이 없습니다.');
    return;
  }

  console.log(`${htmlFiles.length}개 HTML 파일을 PDF로 변환합니다...\n`);

  const browser = await puppeteer.launch({ headless: true });

  for (const file of htmlFiles) {
    const htmlPath = resolve(docDir, file);
    const pdfName = basename(file, extname(file)) + '.pdf';
    const pdfPath = resolve(docDir, pdfName);

    console.log(`  [변환중] ${file} → ${pdfName}`);

    const page = await browser.newPage();
    await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Expand all collapsed sections for full PDF
    await page.evaluate(() => {
      document.querySelectorAll('.hidden').forEach(el => el.classList.remove('hidden'));
      document.querySelectorAll('.collapsed').forEach(el => el.classList.remove('collapsed'));
    });

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      displayHeaderFooter: false,
    });

    await page.close();
    console.log(`  [완료]   ${pdfName}`);
  }

  await browser.close();
  console.log(`\n모든 PDF 변환 완료! (${htmlFiles.length}개)`);
}

convertHtmlToPdf().catch(console.error);
