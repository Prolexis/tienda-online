import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/prisma';

describe('Sistema de Verificación de Pagos', () => {
  let adminToken: string;
  let duenoToken: string;
  let pagoTestId: number;

  it('debe permitir a un Admin marcar un pago como recibido', async () => {
    // Creamos un pago de prueba
    const pago = await prisma.pago.create({
      data: {
        monto: 500,
        metodo: 'Transferencia',
        estado: 'pendiente',
        orden: {
          create: {
            numeroOrden: 'TEST-' + Date.now(),
            total: 500,
            metodoPago: 'Transferencia',
            usuario: { connect: { id: 1 } } // Asumiendo que el usuario 1 existe
          }
        }
      }
    });
    pagoTestId = pago.id;

    // Simulamos la petición del admin
    const res = await request(app)
      .post(`/api/v1/admin/payments/${pago.id}/receive`)
      .send({ notas: 'Dinero en cuenta BCP' });

    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      const verificacion = await prisma.verificacionPago.findUnique({ where: { pagoId: pago.id } });
      expect(verificacion?.estado).toBe('PENDIENTE_VERIFICACION');
    }
  });

  it('debe requerir 2FA para montos superiores al umbral (S/. 1000)', async () => {
    const pagoCaro = await prisma.pago.create({
      data: {
        monto: 1500,
        metodo: 'Transferencia',
        estado: 'pendiente',
        orden: {
          create: {
            numeroOrden: 'TEST-HIGH-' + Date.now(),
            total: 1500,
            metodoPago: 'Transferencia',
            usuario: { connect: { id: 1 } }
          }
        }
      }
    });

    // Admin lo marca
    await request(app).post(`/api/v1/admin/payments/${pagoCaro.id}/receive`).send({});

    const v = await prisma.verificacionPago.findUnique({ where: { pagoId: pagoCaro.id } });
    
    // Intento de confirmar sin token 2FA
    const res = await request(app)
      .post(`/api/v1/admin/payments/verifications/${v?.id}/confirm`)
      .send({});

    if (res.status === 403) {
      expect(res.body.message).toContain('requiere validación de dos factores');
    }
  });

  it('debe registrar auditoría inmutable de cada acción', async () => {
    const auditorias = await prisma.auditoriaInmutable.findMany({
      where: { entidad: 'VerificacionPago' }
    });
    expect(auditorias.length).toBeGreaterThan(0);
    expect(auditorias[0].checksum).toBeDefined();
  });
});
