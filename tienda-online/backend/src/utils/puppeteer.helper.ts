import puppeteer, { Browser } from 'puppeteer';

/**
 * Genera un PDF a partir de contenido HTML usando Puppeteer.
 * Compatible con Render / producción.
 */
export async function generarPDFPuppeteer(html: string): Promise<Buffer> {
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process'
      ],
      timeout: 60000
    });

    const page = await browser.newPage();

    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    await page.setViewport({
      width: 1240,
      height: 1754,
      deviceScaleFactor: 1
    });

    // Captura errores internos del navegador para verlos en los logs de Render
    page.on('console', (msg) => {
      console.log('PUPPETEER CONSOLE:', msg.text());
    });

    page.on('pageerror', (error) => {
      console.error('PUPPETEER PAGE ERROR:', error);
    });

    // Cargar HTML
    await page.setContent(html, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Espera para que Tailwind y Chart.js terminen de renderizar
    await page.evaluate(() => {
      return new Promise((resolve) => setTimeout(resolve, 1500));
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    return Buffer.from(pdf);

  } catch (error) {
    console.error('ERROR AL GENERAR PDF CON PUPPETEER:', error);
    throw error;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Template base para reportes de gestión
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

      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

      <style>
        @page {
          margin: 0;
        }

        * {
          box-sizing: border-box;
        }

        body {
          font-family: Arial, Helvetica, sans-serif;
          background: #ffffff;
          color: #111827;
          padding: 40px;
        }

        .chart-container {
          position: relative;
          height: 300px;
          width: 100%;
        }

        table {
          border-collapse: collapse;
          width: 100%;
        }

        th, td {
          border-bottom: 1px solid #e5e7eb;
        }

        footer {
          position: fixed;
          bottom: 30px;
          left: 40px;
          right: 40px;
          text-align: center;
          color: #9ca3af;
          font-size: 11px;
          border-top: 1px solid #e5e7eb;
          padding-top: 10px;
        }
      </style>
    </head>

    <body>
      <div class="flex justify-between items-center border-b-2 border-blue-600 pb-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">
            ${process.env.EMPRESA_NOMBRE || 'Tienda Online'}
          </h1>
          <p class="text-gray-500 text-sm">
            Reporte de Gestión Estratégica
          </p>
        </div>

        <div class="text-right">
          <p class="font-bold text-blue-600 text-xl">
            ${titulo}
          </p>
          <p class="text-gray-400 text-xs">
            Generado: ${new Date().toLocaleString('es-PE')}
          </p>
        </div>
      </div>

      <div class="summary-section mb-10 bg-blue-50 p-6 rounded-xl border border-blue-100">
        <h2 class="text-lg font-bold text-blue-800 mb-2">
          Resumen Ejecutivo
        </h2>

        ${content}
      </div>

      <div id="charts-area" class="grid grid-cols-1 gap-8">
        <!-- Gráficos se renderizan aquí -->
      </div>

      <footer>
        Este es un documento confidencial para uso exclusivo de la gerencia.
      </footer>

      <script>
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
