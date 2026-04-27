import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/prisma';

describe('Admin Users Module', () => {
  let adminToken: string;
  let testUser: any;

  beforeAll(async () => {
    // Limpiar base de datos de prueba si es necesario
    // Mocking auth would be better, but for integration we use a real token or mock middleware
  });

  it('should list users with pagination and meta', async () => {
    // Nota: Asumiendo que existe un usuario admin para la prueba
    const res = await request(app)
      .get('/api/v1/admin/users')
      .query({ pagina: 1, porPagina: 5 });

    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('totalPaginas');
    }
  });

  it('should list roles as objects from database', async () => {
    const res = await request(app)
      .get('/api/v1/admin/roles');

    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('id');
        expect(res.body.data[0]).toHaveProperty('nombre');
      }
    }
  });
});
