const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../primola_frontend/node_modules/playwright'));

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

(async () => {
  const mdPath = path.resolve('docs/manuale_uso/MANUALE_USO.md');
  const mdContent = fs.readFileSync(mdPath, 'utf8');

  // Convert markdown to rich HTML with internal anchors & base64 images
  const lines = mdContent.split('\n');
  let htmlLines = [];
  let inList = false;

  for (let line of lines) {
    // Headers
    const h1Match = line.match(/^# (.*$)/);
    const h2Match = line.match(/^## (.*$)/);
    const h3Match = line.match(/^### (.*$)/);

    if (h1Match) {
      if (inList) { htmlLines.push('</ul>'); inList = false; }
      const text = h1Match[1].trim();
      const id = slugify(text);
      htmlLines.push(`<h1 id="${id}">${text}</h1>`);
      continue;
    }
    if (h2Match) {
      if (inList) { htmlLines.push('</ul>'); inList = false; }
      const text = h2Match[1].trim();
      const id = slugify(text);
      htmlLines.push(`<h2 id="${id}">${text}</h2>`);
      continue;
    }
    if (h3Match) {
      if (inList) { htmlLines.push('</ul>'); inList = false; }
      const text = h3Match[1].trim();
      const id = slugify(text);
      htmlLines.push(`<h3 id="${id}">${text}</h3>`);
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---') {
      if (inList) { htmlLines.push('</ul>'); inList = false; }
      htmlLines.push('<hr class="divider">');
      continue;
    }

    // Images
    const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      if (inList) { htmlLines.push('</ul>'); inList = false; }
      const alt = imgMatch[1];
      const srcRel = imgMatch[2];
      const srcAbs = path.resolve('docs/manuale_uso', srcRel);
      if (fs.existsSync(srcAbs)) {
        const b64 = fs.readFileSync(srcAbs).toString('base64');
        const ext = path.extname(srcAbs).replace('.', '') || 'png';
        htmlLines.push(`
          <div class="figure-container">
            <img src="data:image/${ext};base64,${b64}" alt="${alt}" class="doc-screenshot" />
            <div class="figure-caption"><strong>Figura:</strong> ${alt}</div>
          </div>
        `);
      } else {
        htmlLines.push(`<p><em>[Immagine non trovata: ${srcRel}]</em></p>`);
      }
      continue;
    }

    // List items
    const listMatch = line.match(/^(\s*)[-*]\s+(.*$)/);
    const numListMatch = line.match(/^(\s*)\d+\.\s+(.*$)/);

    if (listMatch || numListMatch) {
      if (!inList) { htmlLines.push('<ul>'); inList = true; }
      const content = (listMatch ? listMatch[2] : numListMatch[2]);
      htmlLines.push(`<li>${formatInline(content)}</li>`);
      continue;
    } else {
      if (inList && line.trim() === '') {
        htmlLines.push('</ul>');
        inList = false;
      }
    }

    // Standard paragraphs
    if (line.trim() !== '') {
      htmlLines.push(`<p>${formatInline(line)}</p>`);
    }
  }

  if (inList) { htmlLines.push('</ul>'); }

  function formatInline(str) {
    // Links: [Text](#anchor)
    let res = str.replace(/\[(.*?)\]\(#(.*?)\)/g, (m, txt, link) => {
      return `<a href="#${slugify(link)}" class="doc-link">${txt}</a>`;
    });
    // File or external links: [Text](file://...)
    res = res.replace(/\[(.*?)\]\((.*?)\)/g, (m, txt, link) => {
      return `<a href="${link}" class="doc-link" target="_blank">${txt}</a>`;
    });
    // Bold
    res = res.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    res = res.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Code
    res = res.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    return res;
  }

  const finalHtml = `
  <!DOCTYPE html>
  <html lang="it">
  <head>
    <meta charset="utf-8">
    <title>Manuale Operativo - Piattaforma Primola</title>
    <style>
      @page {
        size: A4;
        margin: 20mm 15mm 20mm 15mm;
        @bottom-right {
          content: counter(page);
          font-size: 9pt;
          color: #64748b;
        }
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #1e293b;
        line-height: 1.6;
        font-size: 10.5pt;
        margin: 0;
        padding: 0;
      }
      h1 {
        font-size: 22pt;
        color: #0f172a;
        margin-top: 0;
        margin-bottom: 12pt;
        border-bottom: 3px solid #0284c7;
        padding-bottom: 8pt;
        page-break-after: avoid;
      }
      h2 {
        font-size: 15pt;
        color: #0369a1;
        margin-top: 24pt;
        margin-bottom: 8pt;
        border-bottom: 1.5px solid #e2e8f0;
        padding-bottom: 4pt;
        page-break-after: avoid;
      }
      h3 {
        font-size: 12pt;
        color: #334155;
        margin-top: 14pt;
        margin-bottom: 6pt;
        page-break-after: avoid;
      }
      p {
        margin: 6pt 0;
        text-align: justify;
      }
      ul, ol {
        margin: 6pt 0 10pt 0;
        padding-left: 20pt;
      }
      li {
        margin-bottom: 4pt;
      }
      .divider {
        border: none;
        border-top: 1px solid #cbd5e1;
        margin: 20pt 0;
      }
      .figure-container {
        margin: 14pt 0;
        text-align: center;
        page-break-inside: avoid;
      }
      .doc-screenshot {
        max-width: 100%;
        height: auto;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      .figure-caption {
        font-size: 9pt;
        color: #64748b;
        margin-top: 4pt;
        font-style: italic;
      }
      .inline-code {
        background-color: #f1f5f9;
        color: #0f172a;
        padding: 1pt 4pt;
        border-radius: 4px;
        font-family: 'SFMono-Regular', Consolas, Monaco, monospace;
        font-size: 9pt;
        border: 1px solid #e2e8f0;
      }
      .doc-link {
        color: #0284c7;
        text-decoration: none;
        font-weight: 600;
      }
      .doc-link:hover {
        text-decoration: underline;
      }
      /* Indice stile gradevole */
      ul:first-of-type li {
        margin-bottom: 3pt;
      }
    </style>
  </head>
  <body>
    ${htmlLines.join('\n')}
  </body>
  </html>
  `;

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage();
  await page.setContent(finalHtml, { waitUntil: 'networkidle' });
  
  await page.pdf({
    path: 'docs/manuale_uso/MANUALE_USO.pdf',
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size: 8pt; color: #94a3b8; width: 100%; text-align: right; padding-right: 15mm; font-family: -apple-system, sans-serif;">Piattaforma Primola - Manuale Operativo</div>`,
    footerTemplate: `<div style="font-size: 8pt; color: #94a3b8; width: 100%; text-align: center; font-family: -apple-system, sans-serif;">Pagina <span class="pageNumber"></span> di <span class="totalPages"></span></div>`
  });

  await browser.close();
  console.log('MANUALE_USO.pdf successfully compiled with embedded base64 images and working anchors!');
})();
