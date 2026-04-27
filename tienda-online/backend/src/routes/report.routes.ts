// =============================================
// RUTAS DE REPORTES - Generación PDF con PDFKit
// =============================================

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { prisma } from '../config/prisma';
import { autenticar, requireRole } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { generarPDFPuppeteer, getManagementReportTemplate } from '../utils/puppeteer.helper';

export const reportRoutes = Router();
reportRoutes.use(autenticar);

// ─── Helper: encabezado ───────────────────────────────────────
function encabezado(doc: InstanceType<typeof PDFDocument>, titulo: string) {
  const empresa = process.env.EMPRESA_NOMBRE || 'Tienda Online';

  // Barra superior azul
  doc.rect(0, 0, 595, 80).fillColor('#1e40af').fill();

  // Nombre empresa
  doc.fontSize(22).fillColor('white').font('Helvetica-Bold')
    .text(empresa, 50, 20, { width: 300 });

  // Título reporte
  doc.fontSize(11).fillColor('#bfdbfe')
    .text(titulo, 50, 48, { width: 300 });

  // Fecha
  doc.fontSize(9).fillColor('#bfdbfe')
    .text(`Generado: ${new Date().toLocaleString('es-PE')}`, 350, 48, { width: 200, align: 'right' });

  doc.moveDown(4);
  doc.font('Helvetica').fillColor('#111827');
}

// ─── Helper: fila de tabla ────────────────────────────────────
function filaTabla(
  doc: InstanceType<typeof PDFDocument>,
  cols: number[],
  valores: string[],
  alto: number,
  fondo: string,
  colorTexto: string,
  fontSize: number
) {
  const y = doc.y;
  doc.rect(50, y, 495, alto).fillColor(fondo).fill();
  doc.fillColor(colorTexto).fontSize(fontSize).font('Helvetica');
  valores.forEach((val, i) => {
    const ancho = (cols[i + 1] || 545) - cols[i] - 4;
    doc.text(val, cols[i] + 2, y + 4, { width: ancho, lineBreak: false });
  });
  doc.y = y + alto;
}

// ─── Helper: encabezado tabla ─────────────────────────────────
function encabezadoTabla(
  doc: InstanceType<typeof PDFDocument>,
  cols: number[],
  headers: string[]
) {
  const y = doc.y;
  doc.rect(50, y, 495, 22).fillColor('#1e40af').fill();
  doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
  headers.forEach((h, i) => {
    const ancho = (cols[i + 1] || 545) - cols[i] - 4;
    doc.text(h, cols[i] + 2, y + 7, { width: ancho, lineBreak: false });
  });
  doc.y = y + 22;
  doc.font('Helvetica');
}

// ─── Helper: pie de página ────────────────────────────────────
function piePagina(doc: InstanceType<typeof PDFDocument>, total: string) {
  doc.moveDown(1.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
  doc.moveDown(0.5);
  if (total) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e40af')
      .text(total, { align: 'right' });
  }
  doc.moveDown(2);
  doc.rect(0, 790, 595, 52).fillColor('#1e40af').fill();
  doc.fontSize(8).fillColor('white').font('Helvetica')
    .text('Documento generado automáticamente — TiendaOnline', 50, 800, { align: 'center', width: 495 });
}

// ─── FACTURA DE ORDEN ─────────────────────────────────────────
reportRoutes.get('/invoice/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const orden = await prisma.orden.findUnique({
      where: { id },
      include: {
        usuario: { select: { nombre: true, apellido: true, email: true, telefono: true } },
        direccion: true,
        items: true,
      }
    });

    if (!orden) return res.status(404).json({ success: false, message: 'Orden no encontrada' });

    // Verificar permisos
    const rolesUsuario = req.usuario!.roles;
    const esAdmin = rolesUsuario.some(r => ['ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'].includes(r));
    if (!esAdmin && orden.usuarioId !== req.usuario!.id) {
      return res.status(403).json({ success: false, message: 'Sin acceso a esta factura' });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `factura-${orden.numeroOrden}.pdf`;

    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Encabezado
    doc.rect(0, 0, 595, 120).fillColor('#f8fafc').fill();
    doc.fillColor('#1e40af').fontSize(24).font('Helvetica-Bold').text('FACTURA ELECTRÓNICA', 50, 40);
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(`Nº ${orden.numeroOrden}`, 50, 70);
    doc.text(`Fecha: ${new Date(orden.createdAt).toLocaleDateString('es-PE')}`, 50, 85);

    // Datos de la empresa (Fiscal)
    doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('Tienda Online S.A.C.', 350, 40, { align: 'right' });
    doc.fontSize(9).font('Helvetica').text('RUC: 20123456789', 350, 55, { align: 'right' });
    doc.text('Av. Las Flores 123, Lima, Perú', 350, 68, { align: 'right' });
    doc.text('contacto@tiendaonline.com', 350, 81, { align: 'right' });

    doc.moveDown(4);

    // Información del Cliente
    const startY = doc.y;
    doc.fillColor('#1e40af').fontSize(10).font('Helvetica-Bold').text('FACTURAR A:', 50, startY);
    doc.fillColor('#111827').fontSize(11).text(`${orden.usuario.nombre} ${orden.usuario.apellido}`, 50, startY + 15);
    doc.fontSize(9).font('Helvetica').text(orden.usuario.email, 50, startY + 30);
    if (orden.usuario.telefono) doc.text(orden.usuario.telefono, 50, startY + 42);

    // Dirección de Envío
    if (orden.direccion) {
      doc.fillColor('#1e40af').fontSize(10).font('Helvetica-Bold').text('DIRECCIÓN DE ENVÍO:', 300, startY);
      doc.fillColor('#111827').fontSize(9).font('Helvetica').text(orden.direccion.direccion, 300, startY + 15, { width: 245 });
      doc.text(`${orden.direccion.ciudad}, ${orden.direccion.departamento}`, 300, startY + 27);
    }

    doc.moveDown(5);

    // Tabla de Items
    const tableTop = doc.y;
    const cols = [50, 300, 370, 450, 545];
    const headers = ['Producto', 'Cant.', 'Precio', 'Subtotal'];

    doc.rect(50, tableTop, 495, 20).fillColor('#1e40af').fill();
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.text(h, cols[i] + 5, tableTop + 6);
    });

    let currentY = tableTop + 20;
    doc.font('Helvetica').fillColor('#111827').fontSize(9);

    orden.items.forEach((item, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(50, currentY, 495, 20).fillColor(bg).fill();
      doc.fillColor('#111827');
      
      doc.text(item.nombreProducto, cols[0] + 5, currentY + 6, { width: 240, lineBreak: false });
      doc.text(item.cantidad.toString(), cols[1] + 5, currentY + 6);
      doc.text(`S/. ${Number(item.precioUnitario).toFixed(2)}`, cols[2] + 5, currentY + 6);
      doc.text(`S/. ${Number(item.subtotal).toFixed(2)}`, cols[3] + 5, currentY + 6);
      
      currentY += 20;
    });

    // Totales
    doc.moveDown(2);
    const summaryY = doc.y;
    const rightColX = 400;

    doc.fontSize(10).font('Helvetica');
    doc.text('Subtotal:', rightColX, summaryY);
    doc.text(`S/. ${Number(orden.subtotal).toFixed(2)}`, 500, summaryY, { align: 'right' });

    doc.text('IGV (18%):', rightColX, summaryY + 15);
    doc.text(`S/. ${Number(orden.impuesto).toFixed(2)}`, 500, summaryY + 15, { align: 'right' });

    if (Number(orden.descuento) > 0) {
      doc.fillColor('red').text('Descuento:', rightColX, summaryY + 30);
      doc.text(`- S/. ${Number(orden.descuento).toFixed(2)}`, 500, summaryY + 30, { align: 'right' });
    }

    doc.text('Envío:', rightColX, summaryY + 45);
    doc.text(`S/. ${Number(orden.costoEnvio).toFixed(2)}`, 500, summaryY + 45, { align: 'right' });

    doc.moveTo(400, summaryY + 60).lineTo(545, summaryY + 60).strokeColor('#e5e7eb').stroke();

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af');
    doc.text('TOTAL:', rightColX, summaryY + 70);
    doc.text(`S/. ${Number(orden.total).toFixed(2)}`, 500, summaryY + 70, { align: 'right' });

    // Pie de página
    doc.fontSize(8).font('Helvetica').fillColor('#64748b');
    doc.text('Gracias por su compra. Esta es una representación impresa de un comprobante electrónico.', 50, 750, { align: 'center', width: 495 });
    doc.text('Tienda Online S.A.C. - RUC 20123456789', 50, 762, { align: 'center', width: 495 });

    doc.end();

  } catch (err) { next(err); }
});

// ─── REPORTE DE ÓRDENES ───────────────────────────────────────
reportRoutes.get('/orders',
  requireRole('ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { estado, inicio, fin, cliente, numeroOrden } = z.object({
        estado:      z.string().optional(),
        inicio:      z.string().optional(),
        fin:         z.string().optional(),
        cliente:     z.string().optional(),
        numeroOrden: z.string().optional(),
      }).parse(req.query);

      const where: any = {};
      if (estado) where.estado = estado;
      if (numeroOrden) where.numeroOrden = { contains: numeroOrden };
      if (inicio || fin) {
        where.createdAt = {};
        if (inicio) where.createdAt.gte = new Date(inicio);
        if (fin)    where.createdAt.lte = new Date(fin);
      }
      if (cliente) {
        where.usuario = {
          OR: [
            { nombre:   { contains: cliente, mode: 'insensitive' } },
            { apellido: { contains: cliente, mode: 'insensitive' } },
            { email:    { contains: cliente, mode: 'insensitive' } },
          ],
        };
      }

      const ordenes = await prisma.orden.findMany({
        where,
        include: {
          usuario: { select: { nombre: true, apellido: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-ordenes.pdf"');
      doc.pipe(res);

      encabezado(doc, 'Reporte de Órdenes');

      // Info resumen
      doc.x = 50;
      let periodoStr = 'Todos';
      if (inicio && fin) periodoStr = `${inicio} al ${fin}`;
      else if (inicio) periodoStr = `Desde ${inicio}`;
      else if (fin) periodoStr = `Hasta ${fin}`;

      doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
        .text(`Total de órdenes: ${ordenes.length}     Período: ${periodoStr}`, 50, doc.y);
      doc.moveDown(0.8);

      const cols = [50, 170, 295, 380, 455, 545];
      const headers = ['N° Orden', 'Cliente', 'Estado', 'Total (S/.)', 'Fecha'];

      encabezadoTabla(doc, cols, headers);

      const ESTADO_COLORES: Record<string, string> = {
        ENTREGADA: '#065f46', PAGADA: '#1e40af', EN_PROCESO: '#5b21b6',
        ENVIADA: '#0369a1', CANCELADA: '#991b1b', DEVUELTA: '#374151',
        PENDIENTE_PAGO: '#92400e',
      };

      ordenes.forEach((orden, idx) => {
        if (doc.y > 740) {
          doc.addPage();
          doc.y = 20;
          encabezadoTabla(doc, cols, headers);
        }
        const fondo = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
        const colorEstado = ESTADO_COLORES[orden.estado] || '#374151';
        filaTabla(doc, cols, [
          orden.numeroOrden,
          `${orden.usuario.nombre} ${orden.usuario.apellido}`,
          orden.estado.replace('_', ' '),
          `S/. ${Number(orden.total).toFixed(2)}`,
          new Date(orden.createdAt).toLocaleDateString('es-PE'),
        ], 20, fondo, '#374151', 8);

        // Color del estado
        const estadoX = cols[2] + 2;
        const estadoY = doc.y - 16;
        doc.fillColor(colorEstado).fontSize(8)
          .text(orden.estado.replace('_', ' '), estadoX, estadoY, { width: cols[3] - cols[2] - 4, lineBreak: false });

        // Línea separadora
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
      });

      const totalGeneral = ordenes.reduce((s, o) => s + Number(o.total), 0);
      piePagina(doc, `Total general: S/. ${totalGeneral.toFixed(2)}`);

      doc.end();
    } catch (err) { next(err); }
  }
);

/**
 * Exportar órdenes a Excel
 */
reportRoutes.get('/orders/excel',
  requireRole('ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { estado, inicio, fin, cliente, numeroOrden } = z.object({
        estado:      z.string().optional(),
        inicio:      z.string().optional(),
        fin:         z.string().optional(),
        cliente:     z.string().optional(),
        numeroOrden: z.string().optional(),
      }).parse(req.query);

      const where: any = {};
      if (estado) where.estado = estado;
      if (numeroOrden) where.numeroOrden = { contains: numeroOrden };
      if (inicio || fin) {
        where.createdAt = {};
        if (inicio) where.createdAt.gte = new Date(inicio);
        if (fin)    where.createdAt.lte = new Date(fin);
      }
      if (cliente) {
        where.usuario = {
          OR: [
            { nombre:   { contains: cliente, mode: 'insensitive' } },
            { apellido: { contains: cliente, mode: 'insensitive' } },
            { email:    { contains: cliente, mode: 'insensitive' } },
          ],
        };
      }

      const ordenes = await prisma.orden.findMany({
        where,
        include: {
          usuario: { select: { nombre: true, apellido: true, email: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Órdenes');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'N° Orden', key: 'numeroOrden', width: 20 },
        { header: 'Fecha', key: 'fecha', width: 20 },
        { header: 'Cliente', key: 'cliente', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Método Pago', key: 'metodoPago', width: 20 },
        { header: 'Subtotal', key: 'subtotal', width: 15 },
        { header: 'Impuesto', key: 'impuesto', width: 15 },
        { header: 'Envío', key: 'costoEnvio', width: 15 },
        { header: 'Descuento', key: 'descuento', width: 15 },
        { header: 'Total', key: 'total', width: 15 },
      ];

      ordenes.forEach(o => {
        worksheet.addRow({
          id: o.id,
          numeroOrden: o.numeroOrden,
          fecha: new Date(o.createdAt).toLocaleString('es-PE'),
          cliente: `${o.usuario.nombre} ${o.usuario.apellido}`,
          email: o.usuario.email,
          estado: o.estado,
          metodoPago: o.metodoPago,
          subtotal: Number(o.subtotal),
          impuesto: Number(o.impuesto),
          costoEnvio: Number(o.costoEnvio),
          descuento: Number(o.descuento),
          total: Number(o.total),
        });
      });

      // Estilo para el encabezado
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-ordenes.xlsx"');

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) { next(err); }
  }
);

// ─── REPORTE DE INVENTARIO ────────────────────────────────────
reportRoutes.get('/inventory',
  requireRole('ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR'),
  async (_req, res, next) => {
    try {
      const productos = await prisma.producto.findMany({
        where: { activo: true },
        include: { 
          categoria: { select: { nombre: true } },
          marca:     { select: { nombre: true } },
        },
        orderBy: [{ categoria: { nombre: 'asc' } }, { nombre: 'asc' }],
      });

      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-inventario.pdf"');
      doc.pipe(res);

      encabezado(doc, 'Reporte de Inventario Valorizado');

      doc.x = 50;
      doc.fontSize(9).fillColor('#6b7280')
        .text(`Total de productos activos: ${productos.length}`, 50, doc.y);
      doc.moveDown(0.8);

      const cols = [50, 100, 210, 280, 350, 390, 430, 480, 550];
      const headers = ['SKU', 'Producto', 'Marca', 'Categoría', 'Stock', 'Mín.', 'P. Venta', 'Valor'];

      encabezadoTabla(doc, cols, headers);

      let valorTotal = 0;
      let bajoStock = 0;

      productos.forEach((p, idx) => {
        if (doc.y > 740) {
          doc.addPage();
          doc.y = 20;
          encabezadoTabla(doc, cols, headers);
        }
        const valor = p.stock * Number(p.precioVenta);
        valorTotal += valor;
        const esBajoStock = p.stock <= p.stockMinimo;
        if (esBajoStock) bajoStock++;
        const fondo = esBajoStock ? '#fef2f2' : idx % 2 === 0 ? '#f8fafc' : '#ffffff';
        const colorTexto = esBajoStock ? '#dc2626' : '#374151';

        filaTabla(doc, cols, [
          p.sku,
          p.nombre.length > 20 ? p.nombre.slice(0, 20) + '…' : p.nombre,
          p.marca?.nombre || '-',
          p.categoria.nombre,
          p.stock.toString(),
          p.stockMinimo.toString(),
          `S/. ${Number(p.precioVenta).toFixed(2)}`,
          `S/. ${valor.toFixed(2)}`,
        ], 20, fondo, colorTexto, 7.5);

        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
      });

      // Resumen
      doc.moveDown(1);
      doc.fontSize(9).fillColor('#6b7280')
        .text(`⚠️ Productos con bajo stock: ${bajoStock}`, 50, doc.y);
      doc.moveDown(0.3);

      piePagina(doc, `Valor total inventario: S/. ${valorTotal.toFixed(2)}`);
      doc.end();
    } catch (err) { next(err); }
  }
);

/**
 * Exportar inventario a Excel
 */
reportRoutes.get('/inventory/excel',
  requireRole('ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR'),
  async (_req, res, next) => {
    try {
      const productos = await prisma.producto.findMany({
        where: { activo: true },
        include: {
          categoria: { select: { nombre: true } },
          marca:     { select: { nombre: true } },
        },
        orderBy: [{ categoria: { nombre: 'asc' } }, { nombre: 'asc' }],
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inventario');

      worksheet.columns = [
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Producto', key: 'nombre', width: 40 },
        { header: 'Marca', key: 'marca', width: 20 },
        { header: 'Categoría', key: 'categoria', width: 20 },
        { header: 'Stock Actual', key: 'stock', width: 15 },
        { header: 'Stock Mínimo', key: 'stockMinimo', width: 15 },
        { header: 'Precio Venta', key: 'precioVenta', width: 15 },
        { header: 'Valor Inventario', key: 'valor', width: 20 },
        { header: 'Estado', key: 'estado', width: 15 },
      ];

      productos.forEach(p => {
        const valor = p.stock * Number(p.precioVenta);
        let estado = 'Normal';
        if (p.stock === 0) estado = 'Sin Stock';
        else if (p.stock <= p.stockMinimo) estado = 'Bajo Stock';

        worksheet.addRow({
          sku: p.sku,
          nombre: p.nombre,
          marca: p.marca?.nombre || '-',
          categoria: p.categoria.nombre,
          stock: p.stock,
          stockMinimo: p.stockMinimo,
          precioVenta: Number(p.precioVenta),
          valor: valor,
          estado: estado,
        });
      });

      // Estilo para el encabezado
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Formato de moneda para columnas de precio y valor
      worksheet.getColumn('precioVenta').numFmt = '"S/." #,##0.00';
      worksheet.getColumn('valor').numFmt = '"S/." #,##0.00';

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-inventario.xlsx"');

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) { next(err); }
  }
);

// ─── FACTURA INDIVIDUAL ───────────────────────────────────────
reportRoutes.get('/invoice/:ordenId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ordenId = parseInt(req.params.ordenId);
    const orden = await prisma.orden.findUnique({
      where: { id: ordenId },
      include: {
        items: true,
        usuario: { select: { nombre: true, apellido: true, email: true } },
        direccion: true,
      },
    });

    if (!orden) { res.status(404).json({ success: false, message: 'Orden no encontrada' }); return; }

    const esAdmin = req.usuario!.roles.some((r) => ['ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'].includes(r));
    if (!esAdmin && orden.usuarioId !== req.usuario!.id) {
      res.status(403).json({ success: false, message: 'No tienes acceso a esta factura' });
      return;
    }

    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${orden.numeroOrden}.pdf"`);
    doc.pipe(res);

    // ── Encabezado azul ──────────────────────────────────────
    doc.rect(0, 0, 595, 100).fillColor('#1e40af').fill();

    const empresa = process.env.EMPRESA_NOMBRE || 'Tienda Online';
    doc.fontSize(24).fillColor('white').font('Helvetica-Bold')
      .text(empresa, 50, 18, { width: 280 });
    doc.fontSize(9).fillColor('#bfdbfe').font('Helvetica')
      .text(process.env.EMPRESA_DIRECCION || 'Lima, Perú', 50, 48);
    doc.text(`RUC: ${process.env.EMPRESA_RUC || '12345678901'}`, 50, 60);
    doc.text(process.env.EMPRESA_EMAIL || 'contacto@tienda.com', 50, 72);

    // FACTURA título derecha
    doc.fontSize(28).fillColor('white').font('Helvetica-Bold')
      .text('FACTURA', 350, 18, { width: 200, align: 'right' });
    doc.fontSize(10).fillColor('#bfdbfe').font('Helvetica')
      .text(`N°: ${orden.numeroOrden}`, 350, 58, { width: 195, align: 'right' });
    doc.text(`Fecha: ${new Date(orden.createdAt).toLocaleDateString('es-PE')}`, 350, 72, { width: 195, align: 'right' });

    doc.y = 115;

    // ── Info cliente y estado ────────────────────────────────
    // Caja cliente
    doc.rect(50, doc.y, 280, 70).fillColor('#f8fafc').stroke('#e2e8f0');
    doc.fontSize(8).fillColor('#6b7280').font('Helvetica-Bold')
      .text('CLIENTE', 62, doc.y + 8);
    doc.fontSize(12).fillColor('#111827').font('Helvetica-Bold')
      .text(`${orden.usuario.nombre} ${orden.usuario.apellido}`, 62, doc.y + 20);
    doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
      .text(orden.usuario.email, 62, doc.y + 36);
    if (orden.direccion) {
      doc.text(orden.direccion.direccion, 62, doc.y + 48);
    }

    // Caja estado
    const estadoY = doc.y;
    doc.rect(345, estadoY, 200, 70).fillColor('#f8fafc').stroke('#e2e8f0');
    doc.fontSize(8).fillColor('#6b7280').font('Helvetica-Bold')
      .text('ESTADO', 357, estadoY + 8);

    const ESTADO_COLOR: Record<string, string> = {
      ENTREGADA: '#065f46', PAGADA: '#1e40af', EN_PROCESO: '#5b21b6',
      ENVIADA: '#0369a1', CANCELADA: '#991b1b', PENDIENTE_PAGO: '#92400e',
    };
    const colorEstado = ESTADO_COLOR[orden.estado] || '#374151';
    doc.fontSize(13).fillColor(colorEstado).font('Helvetica-Bold')
      .text(orden.estado.replace('_', ' '), 357, estadoY + 22, { width: 180 });
    doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
      .text(`Pago: ${orden.metodoPago.replace('_', ' ')}`, 357, estadoY + 44);

    doc.y = estadoY + 82;

    // ── Tabla de productos ───────────────────────────────────
    const cols = [50, 240, 330, 390, 450, 545];
    const headers = ['Producto', 'Precio Unit.', 'Cant.', 'Subtotal', ''];

    encabezadoTabla(doc, cols, headers);

    orden.items.forEach((item, idx) => {
      if (doc.y > 720) { doc.addPage(); doc.y = 20; encabezadoTabla(doc, cols, headers); }
      const fondo = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      filaTabla(doc, cols, [
        item.nombreProducto.length > 32 ? item.nombreProducto.slice(0, 32) + '…' : item.nombreProducto,
        `S/. ${Number(item.precioUnitario).toFixed(2)}`,
        item.cantidad.toString(),
        `S/. ${Number(item.subtotal).toFixed(2)}`,
        '',
      ], 22, fondo, '#374151', 9);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
    });

    // ── Totales ──────────────────────────────────────────────
    doc.moveDown(1);
    doc.moveTo(350, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.moveDown(0.5);

    const totalesY = doc.y;
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280')
      .text('Subtotal:', 350, totalesY, { width: 100 })
      .text(`S/. ${Number(orden.subtotal).toFixed(2)}`, 460, totalesY, { width: 85, align: 'right' });

    doc.text('IGV (18%):', 350, totalesY + 18, { width: 100 })
      .text(`S/. ${Number(orden.impuesto).toFixed(2)}`, 460, totalesY + 18, { width: 85, align: 'right' });

    if (Number(orden.descuento) > 0) {
      doc.fillColor('#dc2626')
        .text('Descuento:', 350, totalesY + 36, { width: 100 })
        .text(`-S/. ${Number(orden.descuento).toFixed(2)}`, 460, totalesY + 36, { width: 85, align: 'right' });
    }

    doc.moveDown(0.5);
    doc.rect(345, doc.y, 200, 30).fillColor('#1e40af').fill();
    doc.fontSize(13).fillColor('white').font('Helvetica-Bold')
      .text('TOTAL:', 355, doc.y + 8, { width: 90 })
      .text(`S/. ${Number(orden.total).toFixed(2)}`, 355, doc.y - 22, { width: 185, align: 'right' });

    doc.y = doc.y + 18;

    // ── Pie de página ────────────────────────────────────────
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
      .text('¡Gracias por su compra! Este documento es su comprobante de pago.', 50, doc.y, { align: 'center', width: 495 });

    doc.moveDown(3);
    doc.rect(0, 790, 595, 52).fillColor('#1e40af').fill();
    doc.fontSize(8).fillColor('white')
      .text(`${empresa} — ${process.env.EMPRESA_EMAIL || ''}  |  ${process.env.EMPRESA_TELEFONO || ''}`, 50, 808, { align: 'center', width: 495 });

    doc.end();
  } catch (err) { next(err); }
});

// ─── REPORTE DE BAJO STOCK (JSON para Dashboard) ──────────────
reportRoutes.get('/low-stock',
  requireRole('ADMIN', 'GERENTE_INVENTARIO', 'GERENTE_VENTAS'),
  async (_req, res, next) => {
    try {
      const productos = await prisma.producto.findMany({
        where: {
          activo: true,
          stock: { lte: prisma.producto.fields.stockMinimo }
        },
        include: {
          movimientos: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true }
          }
        },
        orderBy: { stock: 'asc' }
      });

      const data = productos.map(p => ({
        id: p.id,
        nombre: p.nombre,
        sku: p.sku,
        stock: p.stock,
        stockMinimo: p.stockMinimo,
        ultimaSalida: p.movimientos[0]?.createdAt || p.updatedAt,
        esCritico: p.stock === 0
      }));

      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// ─── REPORTE DE MOVIMIENTOS DE INVENTARIO ─────────────────────
reportRoutes.get('/inventory-movements',
  requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  async (req, res, next) => {
    try {
      const { inicio, fin } = z.object({
        inicio: z.string().optional(),
        fin: z.string().optional(),
      }).parse(req.query);

      const dateWhere: any = {};
      if (inicio) dateWhere.gte = new Date(inicio);
      if (fin)    dateWhere.lte = new Date(fin);

      const movimientos = await prisma.movimientoInventario.findMany({
        where: Object.keys(dateWhere).length > 0 ? { createdAt: dateWhere } : {},
        include: {
          producto: { select: { nombre: true, sku: true } },
          usuario:  { select: { nombre: true, apellido: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="movimientos-inventario.pdf"');
      doc.pipe(res);

      encabezado(doc, 'Reporte de Movimientos de Inventario');

      doc.x = 50;
      doc.fontSize(9).fillColor('#6b7280')
        .text(`Total de movimientos: ${movimientos.length}`, 50, doc.y);
      doc.moveDown(0.8);

      const cols = [50, 130, 240, 310, 380, 460, 545];
      const headers = ['Fecha', 'Producto', 'Tipo', 'Cant.', 'Usuario', 'Motivo'];

      encabezadoTabla(doc, cols, headers);

      movimientos.forEach((m, idx) => {
        if (doc.y > 740) { doc.addPage(); doc.y = 20; encabezadoTabla(doc, cols, headers); }
        const fondo = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
        const colorTipo = m.tipo === 'ENTRADA' ? '#065f46' : '#991b1b';
        
        filaTabla(doc, cols, [
          new Date(m.createdAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
          m.producto.nombre.length > 18 ? m.producto.nombre.slice(0, 18) + '…' : m.producto.nombre,
          m.tipo,
          m.cantidad.toString(),
          `${m.usuario.nombre} ${m.usuario.apellido[0]}.`,
          m.motivo || '-',
        ], 20, fondo, '#374151', 7.5);

        // Resaltar tipo
        doc.fillColor(colorTipo).fontSize(7.5).font('Helvetica-Bold')
          .text(m.tipo, cols[2] + 2, doc.y - 16);
      });

      piePagina(doc, '');
      doc.end();
  } catch (err) { next(err); }
});

// =============================================
// REPORTES DE GESTIÓN (Puppeteer)
// =============================================

// ─── REPORTE DE RENTABILIDAD POR PRODUCTO ──────────────────────
reportRoutes.get('/management/profitability',
  requireRole('ADMIN', 'GERENTE_VENTAS'),
  async (_req, res, next) => {
    try {
      const productos = await prisma.producto.findMany({
        where: { activo: true, itemsOrden: { some: {} } },
        include: {
          itemsOrden: true,
          categoria: { select: { nombre: true } }
        }
      });

      const dataRentabilidad = productos.map(p => {
        const costo = Number(p.precioCompra || 0);
        const venta = Number(p.precioVenta);
        const margen = venta - costo;
        const porcentaje = costo > 0 ? (margen / costo) * 100 : 100;
        const totalVendido = p.itemsOrden.reduce((acc, item) => acc + Number(item.subtotal), 0);
        const gananciaTotal = p.itemsOrden.reduce((acc, item) => acc + (Number(item.precioUnitario) - costo) * item.cantidad, 0);

        return {
          nombre: p.nombre,
          categoria: p.categoria.nombre,
          margen: margen.toFixed(2),
          porcentaje: porcentaje.toFixed(1),
          gananciaTotal: gananciaTotal.toFixed(2),
          totalVendido: totalVendido.toFixed(2)
        };
      }).sort((a, b) => Number(b.gananciaTotal) - Number(a.gananciaTotal)).slice(0, 15);

      const content = `
        <p class="text-sm text-gray-700">Este reporte analiza los 15 productos con mayor ganancia total neta. El margen bruto promedio de estos productos es del 
        <strong>${(dataRentabilidad.reduce((acc, curr) => acc + Number(curr.porcentaje), 0) / dataRentabilidad.length).toFixed(1)}%</strong>.</p>
        <div class="mt-4 overflow-hidden rounded-lg border border-gray-200">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Producto</th>
                <th class="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Ventas</th>
                <th class="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Margen %</th>
                <th class="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Ganancia Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${dataRentabilidad.map(d => `
                <tr>
                  <td class="px-4 py-2 text-sm text-gray-900">${d.nombre}</td>
                  <td class="px-4 py-2 text-sm text-right text-gray-600">S/. ${d.totalVendido}</td>
                  <td class="px-4 py-2 text-sm text-right text-green-600 font-bold">${d.porcentaje}%</td>
                  <td class="px-4 py-2 text-sm text-right text-blue-600 font-bold">S/. ${d.gananciaTotal}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      const chartsScript = `
        const ctx = document.createElement('canvas');
        document.getElementById('charts-area').appendChild(ctx);
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(dataRentabilidad.map(d => d.nombre.slice(0, 15)))},
            datasets: [{
              label: 'Ganancia Total (S/.)',
              data: ${JSON.stringify(dataRentabilidad.map(d => d.gananciaTotal))},
              backgroundColor: '#3b82f6'
            }]
          },
          options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Top 15 Productos por Ganancia Neta' } }
          }
        });
      `;

      const html = getManagementReportTemplate('Rentabilidad por Producto', content, chartsScript);
      const pdf = await generarPDFPuppeteer(html);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-rentabilidad.pdf"');
      res.send(pdf);
    } catch (err) { next(err); }
});

// ─── REPORTE DE CLIENTES (VIP, Recurrentes, Nuevos) ───────────
reportRoutes.get('/management/customers',
  requireRole('ADMIN', 'GERENTE_VENTAS'),
  async (_req, res, next) => {
    try {
      const clientes = await prisma.cliente.findMany({
        include: { usuario: { select: { nombre: true, apellido: true } } }
      });

      const stats = {
        vip: clientes.filter(c => Number(c.totalGastado) > 5000 || c.cantidadOrdenes > 10).length,
        recurrentes: clientes.filter(c => c.cantidadOrdenes >= 2 && c.cantidadOrdenes <= 10).length,
        nuevos: clientes.filter(c => c.cantidadOrdenes <= 1).length,
        inactivos: clientes.filter(c => c.cantidadOrdenes === 0).length,
      };

      const topClientes = [...clientes]
        .sort((a, b) => Number(b.totalGastado) - Number(a.totalGastado))
        .slice(0, 5);

      const content = `
        <div class="grid grid-cols-4 gap-4 mb-8">
          <div class="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-100">
            <p class="text-xs text-yellow-600 font-bold uppercase">Clientes VIP</p>
            <p class="text-3xl font-bold text-yellow-700">${stats.vip}</p>
          </div>
          <div class="text-center p-4 bg-green-50 rounded-lg border border-green-100">
            <p class="text-xs text-green-600 font-bold uppercase">Recurrentes</p>
            <p class="text-3xl font-bold text-green-700">${stats.recurrentes}</p>
          </div>
          <div class="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p class="text-xs text-blue-600 font-bold uppercase">Nuevos</p>
            <p class="text-3xl font-bold text-blue-700">${stats.nuevos}</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p class="text-xs text-gray-600 font-bold uppercase">Inactivos</p>
            <p class="text-3xl font-bold text-gray-700">${stats.inactivos}</p>
          </div>
        </div>
        <h3 class="text-lg font-bold text-gray-800 mb-4">Top 5 Clientes por Valor</h3>
        <table class="min-w-full bg-white rounded-lg overflow-hidden border">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-bold text-gray-500">Cliente</th>
              <th class="px-4 py-2 text-right text-xs font-bold text-gray-500">Ordenes</th>
              <th class="px-4 py-2 text-right text-xs font-bold text-gray-500">Total Gastado</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            ${topClientes.map(c => `
              <tr>
                <td class="px-4 py-2 text-sm">${c.usuario.nombre} ${c.usuario.apellido}</td>
                <td class="px-4 py-2 text-sm text-right">${c.cantidadOrdenes}</td>
                <td class="px-4 py-2 text-sm text-right font-bold text-blue-600">S/. ${Number(c.totalGastado).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      const chartsScript = `
        const ctx = document.createElement('canvas');
        document.getElementById('charts-area').appendChild(ctx);
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['VIP', 'Recurrentes', 'Nuevos', 'Inactivos'],
            datasets: [{
              label: 'Cantidad de Clientes',
              data: [${stats.vip}, ${stats.recurrentes}, ${stats.nuevos}, ${stats.inactivos}],
              backgroundColor: ['#eab308', '#22c55e', '#3b82f6', '#94a3b8']
            }]
          },
          options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Segmentación de Cartera de Clientes' } }
          }
        });
      `;

      const html = getManagementReportTemplate('Análisis de Clientes', content, chartsScript);
      const pdf = await generarPDFPuppeteer(html);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-clientes.pdf"');
      res.send(pdf);
    } catch (err) { next(err); }
});

// ─── REPORTE DE ROTACIÓN DE INVENTARIO ─────────────────────────
reportRoutes.get('/management/inventory-turnover',
  requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  async (_req, res, next) => {
    try {
      const categorias = await prisma.categoria.findMany({
        include: {
          productos: {
            include: { itemsOrden: true }
          }
        }
      });

      const dataRotacion = categorias.map(c => {
        const stockActual = c.productos.reduce((acc, p) => acc + p.stock, 0);
        const unidadesVendidas = c.productos.reduce((acc, p) => {
          return acc + p.itemsOrden.reduce((accI, item) => accI + item.cantidad, 0);
        }, 0);
        
        // Ratio de rotación simple: unidades vendidas / stock actual (si stock > 0)
        const ratio = stockActual > 0 ? (unidadesVendidas / stockActual) : unidadesVendidas;

        return {
          nombre: c.nombre,
          stock: stockActual,
          vendidas: unidadesVendidas,
          ratio: ratio.toFixed(2)
        };
      }).filter(c => c.stock > 0 || c.vendidas > 0).sort((a, b) => Number(b.ratio) - Number(a.ratio));

      const content = `
        <p class="text-sm text-gray-700 mb-6">Este reporte muestra el índice de rotación por categoría (Unidades vendidas vs Stock actual). Un ratio mayor indica una salida más rápida del inventario.</p>
        <div class="grid grid-cols-1 gap-4">
          ${dataRotacion.map(d => `
            <div class="flex items-center justify-between p-4 bg-white border rounded-lg">
              <div>
                <p class="font-bold text-gray-800">${d.nombre}</p>
                <p class="text-xs text-gray-500">Stock: ${d.stock} | Vendidas: ${d.vendidas}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-400 uppercase font-bold">Ratio de Rotación</p>
                <p class="text-xl font-bold text-blue-600">${d.ratio}</p>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      const chartsScript = `
        const ctx = document.createElement('canvas');
        document.getElementById('charts-area').appendChild(ctx);
        new Chart(ctx, {
          type: 'radar',
          data: {
            labels: ${JSON.stringify(dataRotacion.map(d => d.nombre))},
            datasets: [{
              label: 'Índice de Rotación',
              data: ${JSON.stringify(dataRotacion.map(d => d.ratio))},
              fill: true,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: 'rgb(59, 130, 246)',
            }]
          },
          options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Mapa de Rotación por Categoría' } }
          }
        });
      `;

      const html = getManagementReportTemplate('Rotación de Inventario', content, chartsScript);
      const pdf = await generarPDFPuppeteer(html);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-rotacion.pdf"');
      res.send(pdf);
    } catch (err) { next(err); }
});

// ─── REPORTE DE INGRESOS VS COSTOS ─────────────────────────────
reportRoutes.get('/management/income-vs-cost',
  requireRole('ADMIN', 'GERENTE_VENTAS'),
  async (_req, res, next) => {
    try {
      const ordenes = await prisma.orden.findMany({
        where: { estado: { in: ['PAGADA', 'ENVIADA', 'ENTREGADA'] } },
        include: { items: { include: { producto: { select: { precioCompra: true } } } } }
      });

      // Agrupar por mes (últimos 6 meses)
      const meses: Record<string, { ingresos: number, costos: number }> = {};
      const ahora = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const key = d.toLocaleString('es-PE', { month: 'short', year: 'numeric' });
        meses[key] = { ingresos: 0, costos: 0 };
      }

      ordenes.forEach(o => {
        const key = new Date(o.createdAt).toLocaleString('es-PE', { month: 'short', year: 'numeric' });
        if (meses[key]) {
          meses[key].ingresos += Number(o.total);
          o.items.forEach(item => {
            meses[key].costos += (Number(item.producto.precioCompra || 0) * item.cantidad);
          });
        }
      });

      const labels = Object.keys(meses);
      const ingresos = labels.map(l => meses[l].ingresos);
      const costos = labels.map(l => meses[l].costos);
      const ganancias = labels.map(l => meses[l].ingresos - meses[l].costos);

      const totalIngresos = ingresos.reduce((a, b) => a + b, 0);
      const totalCostos = costos.reduce((a, b) => a + b, 0);

      const content = `
        <div class="flex gap-8 mb-8">
          <div class="flex-1 bg-green-50 p-6 rounded-xl border border-green-100 text-center">
            <p class="text-sm text-green-600 font-bold uppercase">Ingresos Totales (6m)</p>
            <p class="text-3xl font-bold text-green-700">S/. ${totalIngresos.toFixed(2)}</p>
          </div>
          <div class="flex-1 bg-red-50 p-6 rounded-xl border border-red-100 text-center">
            <p class="text-sm text-red-600 font-bold uppercase">Costos Totales (6m)</p>
            <p class="text-3xl font-bold text-red-700">S/. ${totalCostos.toFixed(2)}</p>
          </div>
          <div class="flex-1 bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
            <p class="text-sm text-blue-600 font-bold uppercase">Utilidad Bruta (6m)</p>
            <p class="text-3xl font-bold text-blue-700">S/. ${(totalIngresos - totalCostos).toFixed(2)}</p>
          </div>
        </div>
      `;

      const chartsScript = `
        const ctx = document.createElement('canvas');
        document.getElementById('charts-area').appendChild(ctx);
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(labels)},
            datasets: [
              { label: 'Ingresos', data: ${JSON.stringify(ingresos)}, borderColor: '#22c55e', backgroundColor: 'transparent', tension: 0.3 },
              { label: 'Costos', data: ${JSON.stringify(costos)}, borderColor: '#ef4444', backgroundColor: 'transparent', tension: 0.3 },
              { label: 'Ganancia', data: ${JSON.stringify(ganancias)}, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.3 }
            ]
          },
          options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Evolución Mensual: Ingresos vs Costos' } }
          }
        });
      `;

      const html = getManagementReportTemplate('Ingresos vs Costos', content, chartsScript);
      const pdf = await generarPDFPuppeteer(html);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-financiero.pdf"');
      res.send(pdf);
    } catch (err) { next(err); }
});

// ─── REPORTE DE VENTAS POR CATEGORÍA ───────────────────────────
reportRoutes.get('/management/sales-by-category',
  requireRole('ADMIN', 'GERENTE_VENTAS'),
  async (_req, res, next) => {
    try {
      const categorias = await prisma.categoria.findMany({
        include: {
          productos: {
            include: { itemsOrden: { include: { orden: true } } }
          }
        }
      });

      const ahora = new Date();
      const meses = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        meses.push(d.toLocaleString('es-PE', { month: 'short' }));
      }

      const dataVentas = categorias.map(c => {
        const ventasPorMes = [0, 0, 0]; // Últimos 3 meses
        
        c.productos.forEach(p => {
          p.itemsOrden.forEach(item => {
            const fecha = new Date(item.orden.createdAt);
            for (let i = 0; i < 3; i++) {
              const d = new Date(ahora.getFullYear(), ahora.getMonth() - (2 - i), 1);
              if (fecha.getMonth() === d.getMonth() && fecha.getFullYear() === d.getFullYear()) {
                ventasPorMes[i] += Number(item.subtotal);
              }
            }
          });
        });

        return { 
          nombre: c.nombre, 
          ventas: ventasPorMes,
          total: ventasPorMes.reduce((a, b) => a + b, 0)
        };
      }).sort((a, b) => b.total - a.total).slice(0, 5);

      const content = `
        <div class="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-8">
          <h3 class="text-blue-800 font-bold mb-2">Análisis de Tendencias</h3>
          <p class="text-sm text-blue-700">Este gráfico compara el desempeño de las top 5 categorías en los últimos 3 meses (${meses.join(', ')}). 
          Permite identificar estacionalidades y crecimiento por línea de producto.</p>
        </div>
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b">
              <th class="text-left py-2">Categoría</th>
              ${meses.map(m => `<th class="text-right py-2">${m}</th>`).join('')}
              <th class="text-right py-2">Total Trimestre</th>
            </tr>
          </thead>
          <tbody>
            ${dataVentas.map(d => `
              <tr class="border-b">
                <td class="py-2 font-medium">${d.nombre}</td>
                ${d.ventas.map(v => `<td class="text-right py-2">S/. ${v.toFixed(2)}</td>`).join('')}
                <td class="text-right py-2 font-bold text-blue-600">S/. ${d.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      const chartsScript = `
        const ctx = document.createElement('canvas');
        document.getElementById('charts-area').appendChild(ctx);
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(meses)},
            datasets: ${JSON.stringify(dataVentas.map((d, i) => ({
              label: d.nombre,
              data: d.ventas,
              backgroundColor: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'][i]
            })))}
          },
          options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Comparativa Mensual Top 5 Categorías' } },
            scales: { y: { beginAtZero: true } }
          }
        });
      `;

      const html = getManagementReportTemplate('Ventas por Categoría (Comparativa)', content, chartsScript);
      const pdf = await generarPDFPuppeteer(html);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-ventas-categoria.pdf"');
      res.send(pdf);
    } catch (err) { next(err); }
});

// ─── REPORTE DE COMPORTAMIENTO DE CARRITOS ─────────────────────
reportRoutes.get('/management/cart-behavior',
  requireRole('ADMIN', 'GERENTE_VENTAS'),
  async (_req, res, next) => {
    try {
      const [totalCarritos, carritosActivos, totalOrdenes, statsOrdenes] = await Promise.all([
        prisma.carrito.count(),
        prisma.carrito.count({ where: { activo: true } }),
        prisma.orden.count(),
        prisma.orden.aggregate({
          _avg: { total: true },
          _sum: { total: true }
        })
      ]);

      const tasaConversion = totalCarritos > 0 ? (totalOrdenes / totalCarritos) * 100 : 0;
      const tasaAbandono = 100 - tasaConversion;

      const content = `
        <div class="grid grid-cols-2 gap-8">
          <div>
            <h3 class="text-md font-bold text-gray-800 mb-4">Métricas de Conversión</h3>
            <ul class="space-y-3">
              <li class="flex justify-between border-b pb-1">
                <span class="text-gray-600">Tasa de Conversión:</span>
                <span class="font-bold text-green-600">${tasaConversion.toFixed(1)}%</span>
              </li>
              <li class="flex justify-between border-b pb-1">
                <span class="text-gray-600">Tasa de Abandono:</span>
                <span class="font-bold text-red-600">${tasaAbandono.toFixed(1)}%</span>
              </li>
              <li class="flex justify-between border-b pb-1">
                <span class="text-gray-600">Ticket Promedio:</span>
                <span class="font-bold text-blue-600">S/. ${Number(statsOrdenes._avg.total || 0).toFixed(2)}</span>
              </li>
            </ul>
          </div>
          <div class="bg-white p-4 rounded-xl border border-gray-100">
            <p class="text-sm text-gray-500 mb-2">Total de Carritos Creados</p>
            <p class="text-4xl font-bold text-gray-900">${totalCarritos}</p>
            <p class="text-xs text-gray-400 mt-2">Ordenes finalizadas: ${totalOrdenes}</p>
          </div>
        </div>
      `;

      const chartsScript = `
        const ctx = document.createElement('canvas');
        document.getElementById('charts-area').appendChild(ctx);
        new Chart(ctx, {
          type: 'pie',
          data: {
            labels: ['Convertidos (Ordenes)', 'Abandonados'],
            datasets: [{
              data: [${totalOrdenes}, ${totalCarritos - totalOrdenes}],
              backgroundColor: ['#10b981', '#ef4444']
            }]
          },
          options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Embudo de Conversión de Carritos' } }
          }
        });
      `;

      const html = getManagementReportTemplate('Comportamiento de Carritos', content, chartsScript);
      const pdf = await generarPDFPuppeteer(html);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-carritos.pdf"');
      res.send(pdf);
    } catch (err) { next(err); }
});

// ─── REPORTE DE PAGOS RECIBIDOS ────────────────────────────────
reportRoutes.get('/payments',
  requireRole('ADMIN', 'GERENTE_VENTAS'),
  async (req, res, next) => {
    try {
      const { inicio, fin } = z.object({
        inicio: z.string().optional(),
        fin: z.string().optional(),
      }).parse(req.query);

      const dateWhere: any = { estado: { in: ['PAGADA', 'ENVIADA', 'ENTREGADA'] } };
      if (inicio || fin) {
        dateWhere.createdAt = {};
        if (inicio) dateWhere.createdAt.gte = new Date(inicio);
        if (fin)    dateWhere.createdAt.lte = new Date(fin);
      }

      const ordenes = await prisma.orden.findMany({
        where: dateWhere,
        include: { usuario: { select: { nombre: true, apellido: true } } },
        orderBy: { createdAt: 'desc' },
      });

      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="pagos-recibidos.pdf"');
      doc.pipe(res);

      encabezado(doc, 'Detalle de Pagos Recibidos');

      const cols = [50, 150, 260, 360, 450, 545];
      const headers = ['N° Orden', 'Fecha', 'Cliente', 'Método', 'Monto (S/.)'];

      encabezadoTabla(doc, cols, headers);

      let totalPagos = 0;
      ordenes.forEach((o, idx) => {
        if (doc.y > 740) { doc.addPage(); doc.y = 20; encabezadoTabla(doc, cols, headers); }
        totalPagos += Number(o.total);
        const fondo = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
        filaTabla(doc, cols, [
          o.numeroOrden,
          new Date(o.createdAt).toLocaleDateString('es-PE'),
          `${o.usuario.nombre} ${o.usuario.apellido}`,
          o.metodoPago.replace('_', ' '),
          `S/. ${Number(o.total).toFixed(2)}`,
        ], 20, fondo, '#374151', 8);
      });

      piePagina(doc, `Total Recaudado: S/. ${totalPagos.toFixed(2)}`);
      doc.end();
    } catch (err) { next(err); }
});

// ─── REPORTE DE BAJO STOCK / AGOTADOS ────────────────────────
reportRoutes.get('/low-stock',
  requireRole('ADMIN', 'GERENTE_INVENTARIO', 'VENDEDOR'),
  async (_req, res, next) => {
    try {
      const productos = await prisma.producto.findMany({
        where: {
          OR: [
            { stock: 0 },
            { stock: { lte: prisma.producto.fields.stockMinimo } }
          ],
          activo: true
        },
        include: { categoria: { select: { nombre: true } } },
        orderBy: { stock: 'asc' },
      });

      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="productos-bajo-stock.pdf"');
      doc.pipe(res);

      encabezado(doc, 'Reporte de Productos con Stock Bajo o Agotado');

      doc.x = 50;
      doc.fontSize(9).fillColor('#6b7280')
        .text(`Total de productos en alerta: ${productos.length}`, 50, doc.y);
      doc.moveDown(0.8);

      const cols = [50, 120, 280, 360, 420, 480, 545];
      const headers = ['SKU', 'Producto', 'Categoría', 'Stock Act.', 'Stock Mín.', 'Estado'];

      encabezadoTabla(doc, cols, headers);

      productos.forEach((p, idx) => {
        if (doc.y > 740) { doc.addPage(); doc.y = 20; encabezadoTabla(doc, cols, headers); }
        const fondo = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
        const esAgotado = p.stock === 0;
        const colorEstado = esAgotado ? '#991b1b' : '#92400e';
        const textoEstado = esAgotado ? 'AGOTADO' : 'BAJO STOCK';

        filaTabla(doc, cols, [
          p.sku,
          p.nombre.length > 25 ? p.nombre.slice(0, 25) + '…' : p.nombre,
          p.categoria.nombre,
          p.stock.toString(),
          p.stockMinimo.toString(),
          textoEstado,
        ], 20, fondo, '#374151', 8);

        // Resaltar estado
        doc.fillColor(colorEstado).fontSize(8).font('Helvetica-Bold')
          .text(textoEstado, cols[5] + 2, doc.y - 16);
      });

      piePagina(doc, '');
      doc.end();
    } catch (err) { next(err); }
});

// ─── REPORTE DE DEVOLUCIONES ──────────────────────────────────
reportRoutes.get('/returns',
  requireRole('ADMIN', 'GERENTE_VENTAS'),
  async (req, res, next) => {
    try {
      const { inicio, fin } = z.object({
        inicio: z.string().optional(),
        fin: z.string().optional(),
      }).parse(req.query);

      const dateWhere: any = { estadoNuevo: 'DEVUELTA' };
      if (inicio || fin) {
        dateWhere.createdAt = {};
        if (inicio) dateWhere.createdAt.gte = new Date(inicio);
        if (fin)    dateWhere.createdAt.lte = new Date(fin);
      }

      const devoluciones = await prisma.historialEstadoOrden.findMany({
        where: dateWhere,
        include: {
          orden: {
            include: {
              usuario: { select: { nombre: true, apellido: true } },
              pagos: { take: 1, orderBy: { createdAt: 'desc' } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-devoluciones.pdf"');
      doc.pipe(res);

      encabezado(doc, 'Listado de Devoluciones y Reembolsos');

      const cols = [50, 130, 220, 310, 430, 545];
      const headers = ['Fecha', 'N° Orden', 'Cliente', 'Motivo', 'Monto (S/.)'];

      encabezadoTabla(doc, cols, headers);

      let totalReembolsado = 0;
      devoluciones.forEach((d, idx) => {
        if (doc.y > 740) { doc.addPage(); doc.y = 20; encabezadoTabla(doc, cols, headers); }
        
        // Extraer motivo del comentario: "DEVOLUCIÓN — Motivo: [MOTIVO]. [COMENTARIO]"
        let motivo = d.comentario || '-';
        if (motivo.includes('Motivo: ')) {
          motivo = motivo.split('Motivo: ')[1].split('.')[0];
        }

        const monto = Number(d.orden.total);
        totalReembolsado += monto;
        const fondo = idx % 2 === 0 ? '#f8fafc' : '#ffffff';

        filaTabla(doc, cols, [
          new Date(d.createdAt).toLocaleDateString('es-PE'),
          d.orden.numeroOrden,
          `${d.orden.usuario.nombre} ${d.orden.usuario.apellido}`,
          motivo.length > 25 ? motivo.slice(0, 25) + '…' : motivo,
          `S/. ${monto.toFixed(2)}`,
        ], 20, fondo, '#374151', 8);
      });

      piePagina(doc, `Total en Devoluciones: S/. ${totalReembolsado.toFixed(2)}`);
      doc.end();
    } catch (err) { next(err); }
});

// ─── COMPROBANTE SIMPLIFICADO ─────────────────────────────────
reportRoutes.get('/receipt/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const orden = await prisma.orden.findUnique({
      where: { id },
      include: {
        usuario: { select: { nombre: true, apellido: true } },
        items: true,
      }
    });

    if (!orden) return res.status(404).json({ success: false, message: 'Orden no encontrada' });

    // Verificar permisos
    const esAdmin = req.usuario!.roles.some(r => ['ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'].includes(r));
    if (!esAdmin && orden.usuarioId !== req.usuario!.id) {
      return res.status(403).json({ success: false, message: 'Sin acceso' });
    }

    const doc = new PDFDocument({ margin: 20, size: [226, 600] }); // Tamaño ticket (80mm aprox)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${orden.numeroOrden}.pdf"`);
    doc.pipe(res);

    // Encabezado Ticket
    doc.fontSize(12).font('Helvetica-Bold').text(process.env.EMPRESA_NOMBRE || 'TIENDA ONLINE', { align: 'center' });
    doc.fontSize(8).font('Helvetica').text(`RUC: ${process.env.EMPRESA_RUC || '12345678901'}`, { align: 'center' });
    doc.text(process.env.EMPRESA_DIRECCION || 'Lima, Perú', { align: 'center' });
    doc.moveDown();

    doc.text(`TICKET: ${orden.numeroOrden}`, { align: 'left' });
    doc.text(`FECHA: ${new Date(orden.createdAt).toLocaleString('es-PE')}`, { align: 'left' });
    doc.text(`CLIENTE: ${orden.usuario.nombre} ${orden.usuario.apellido}`, { align: 'left' });
    doc.text('------------------------------------------', { align: 'center' });

    // Items
    doc.font('Helvetica-Bold');
    doc.text('CANT  PRODUCTO          TOTAL', { align: 'left' });
    doc.font('Helvetica');

    orden.items.forEach(item => {
      const nombre = item.nombreProducto.slice(0, 18).padEnd(18, ' ');
      const cant = item.cantidad.toString().padStart(2, '0');
      const total = `S/.${Number(item.subtotal).toFixed(2)}`.padStart(10, ' ');
      doc.text(`${cant}    ${nombre} ${total}`);
    });

    doc.text('------------------------------------------', { align: 'center' });
    doc.font('Helvetica-Bold');
    doc.text(`TOTAL:          S/. ${Number(orden.total).toFixed(2)}`, { align: 'right' });
    doc.moveDown();
    doc.font('Helvetica').fontSize(7).text('¡GRACIAS POR SU PREFERENCIA!', { align: 'center' });
    doc.text('Comprobante simplificado sin valor legal.', { align: 'center' });

    doc.end();
  } catch (err) { next(err); }
});
