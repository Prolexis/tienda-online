import puppeteer from 'puppeteer';

/**
 * Genera un PDF a partir de contenido HTML usando Puppeteer.
 * Permite diseños corporativos complejos y gráficos.
 */
export async function generarPDFPuppeteer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Establecer contenido y esperar a que se carguen los recursos (como scripts de gráficos)
    await page.setContent(html, { waitUntil: 'networkidle0' });

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
  } finally {
    await browser.close();
  }
}

/**
 * Template base para reportes de gestión
 */
export function getManagementReportTemplate(titulo: string, content: string, chartsScript: string = '') {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        @page { margin: 0; }
        body { font-family: 'Inter', sans-serif; }
        .chart-container { position: relative; height: 300px; width: 100%; }
      </style>
    </head>
    <body class="bg-white p-10">
      <div class="flex justify-between items-center border-b-2 border-blue-600 pb-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">${process.env.EMPRESA_NOMBRE || 'Tienda Online'}</h1>
          <p class="text-gray-500 text-sm">Reporte de Gestión Estratégica</p>
        </div>
        <div class="text-right">
          <p class="font-bold text-blue-600 text-xl">${titulo}</p>
          <p class="text-gray-400 text-xs">Generado: ${new Date().toLocaleString('es-PE')}</p>
        </div>
      </div>

      <div class="summary-section mb-10 bg-blue-50 p-6 rounded-xl border border-blue-100">
        <h2 class="text-lg font-bold text-blue-800 mb-2">Resumen Ejecutivo</h2>
        ${content}
      </div>

      <div id="charts-area" class="grid grid-cols-1 gap-8">
        <!-- Gráficos se renderizan aquí -->
      </div>

      <footer class="fixed bottom-10 left-10 right-10 text-center text-gray-400 text-xs border-t pt-4">
        Este es un documento confidencial para uso exclusivo de la gerencia.
      </footer>

      <script>
        ${chartsScript}
      </script>
    </body>
    </html>
  `;
}
