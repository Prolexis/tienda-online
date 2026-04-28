import puppeteer, { Browser } from 'puppeteer';
import PDFDocument from 'pdfkit';

/**
 * Convierte HTML simple a texto para el PDF alternativo.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Genera un PDF básico si Puppeteer falla.
 */
function generarPDFFallback(html: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text('Reporte de Gestión Estratégica', {
          align: 'center',
        });

      doc.moveDown();

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(`Generado: ${new Date().toLocaleString('es-PE')}`, {
          align: 'center',
        });

      doc.moveDown(2);

      doc
        .fontSize(10)
        .fillColor('#111827')
        .text(htmlToText(html), {
          align: 'left',
          lineGap: 4,
        });

      doc.moveDown(2);

      doc
        .fontSize(8)
        .fillColor('#6b7280')
        .text('PDF generado en modo alternativo por el servidor.', {
          align: 'center',
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Genera un PDF a partir de contenido HTML usando Puppeteer.
 * Si Puppeteer falla en Render, usa PDFKit como respaldo.
 */
export async function generarPDFPuppeteer(html: string): Promise<Buffer> {
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: puppeteer.executablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--no-zygote',
        '--font-render-hinting=none',
      ],
      timeout: 60000,
    });

    const page = await browser.newPage();

    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    await page.setViewport({
      width: 1240,
      height: 1754,
      deviceScaleFactor: 1,
    });

    page.on('console', (msg) => {
      console.log('PUPPETEER CONSOLE:', msg.text());
    });

    page.on('pageerror', (error) => {
      console.error('PUPPETEER PAGE ERROR:', error.message);
    });

    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await page.evaluate(() => {
      return new Promise((resolve) => setTimeout(resolve, 1000));
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    return Buffer.from(pdf);

  } catch (error) {
    console.error(
      'ERROR AL GENERAR PDF CON PUPPETEER. USANDO FALLBACK PDFKIT:',
      error
    );

    return await generarPDFFallback(html);

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Template base para reportes de gestión.
 * No depende de Tailwind CDN ni Chart.js CDN.
 */
export function getManagementReportTemplate(
  titulo: string,
  content: string,
  chartsScript: string = ''
): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      <style>
        @page {
          margin: 0;
          size: A4;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 40px;
          font-family: Arial, Helvetica, sans-serif;
          background: #ffffff;
          color: #111827;
          font-size: 14px;
        }

        h1, h2, h3, p {
          margin-top: 0;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 18px;
          margin-bottom: 30px;
        }

        .empresa {
          font-size: 28px;
          font-weight: 800;
          color: #111827;
          margin-bottom: 6px;
        }

        .subtitulo {
          color: #6b7280;
          font-size: 13px;
        }

        .titulo-reporte {
          font-size: 20px;
          font-weight: 800;
          color: #2563eb;
          text-align: right;
          margin-bottom: 6px;
        }

        .fecha {
          font-size: 11px;
          color: #9ca3af;
          text-align: right;
        }

        .summary-section {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 14px;
          padding: 24px;
          margin-bottom: 28px;
        }

        .summary-title {
          font-size: 18px;
          font-weight: 800;
          color: #1e40af;
          margin-bottom: 14px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: #ffffff;
          margin-top: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        th {
          background: #f3f4f6;
          color: #374151;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 10px;
          border-bottom: 1px solid #e5e7eb;
        }

        td {
          padding: 10px;
          font-size: 13px;
          border-bottom: 1px solid #e5e7eb;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: 800; }

        .text-blue-600 { color: #2563eb; }
        .text-green-600 { color: #16a34a; }
        .text-red-600 { color: #dc2626; }
        .text-gray-500 { color: #6b7280; }
        .text-gray-600 { color: #4b5563; }
        .text-gray-700 { color: #374151; }
        .text-gray-800 { color: #1f2937; }
        .text-gray-900 { color: #111827; }

        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

        .gap-4 { gap: 16px; }
        .gap-8 { gap: 32px; }

        .mb-2 { margin-bottom: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .mb-6 { margin-bottom: 24px; }
        .mb-8 { margin-bottom: 32px; }
        .mt-4 { margin-top: 16px; }

        .p-4 { padding: 16px; }
        .p-6 { padding: 24px; }

        .rounded-lg { border-radius: 10px; }
        .rounded-xl { border-radius: 14px; }

        .border { border: 1px solid #e5e7eb; }

        .bg-white { background: #ffffff; }
        .bg-blue-50 { background: #eff6ff; }
        .bg-green-50 { background: #f0fdf4; }
        .bg-red-50 { background: #fef2f2; }
        .bg-yellow-50 { background: #fefce8; }
        .bg-gray-50 { background: #f9fafb; }

        .text-center { text-align: center; }
        .text-sm { font-size: 13px; }
        .text-xs { font-size: 11px; }
        .text-lg { font-size: 18px; }
        .text-xl { font-size: 20px; }
        .text-3xl { font-size: 30px; }
        .text-4xl { font-size: 36px; }

        .uppercase { text-transform: uppercase; }

        .flex { display: flex; }
        .flex-1 { flex: 1; }
        .justify-between { justify-content: space-between; }
        .items-center { align-items: center; }

        .space-y-3 > * + * {
          margin-top: 12px;
        }

        .border-b {
          border-bottom: 1px solid #e5e7eb;
        }

        .pb-1 {
          padding-bottom: 4px;
        }

        #charts-area {
          margin-top: 26px;
        }

        .chart-fallback {
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          padding: 18px;
          background: #f8fafc;
          color: #475569;
          font-size: 13px;
          text-align: center;
          margin-top: 18px;
        }

        footer {
          position: fixed;
          bottom: 26px;
          left: 40px;
          right: 40px;
          text-align: center;
          color: #9ca3af;
          font-size: 10px;
          border-top: 1px solid #e5e7eb;
          padding-top: 10px;
          background: #ffffff;
        }
      </style>
    </head>

    <body>
      <div class="header">
        <div>
          <div class="empresa">
            ${process.env.EMPRESA_NOMBRE || 'Tienda Online'}
          </div>
          <div class="subtitulo">
            Reporte de Gestión Estratégica
          </div>
        </div>

        <div>
          <div class="titulo-reporte">
            ${titulo}
          </div>
          <div class="fecha">
            Generado: ${new Date().toLocaleString('es-PE')}
          </div>
        </div>
      </div>

      <section class="summary-section">
        <h2 class="summary-title">
          Resumen Ejecutivo
        </h2>

        ${content}
      </section>

      <div id="charts-area">
        <div class="chart-fallback">
          Reporte generado correctamente. Los datos analíticos se muestran en las tablas del resumen.
        </div>
      </div>

      <footer>
        Este es un documento confidencial para uso exclusivo de la gerencia.
      </footer>

      <script>
        window.Chart = window.Chart || function () {
          return {
            destroy: function () {},
            update: function () {}
          };
        };

        try {
          ${chartsScript}
        } catch (error) {
          console.error('Error al renderizar gráficos:', error);
        }
      </script>
    </body>
    </html>
  `;
}
