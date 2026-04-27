import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/prisma';
import * as productService from '../services/product.service';

// Mock del middleware de autenticación
jest.mock('../middleware/auth.middleware', () => ({
  autenticar: (req: any, res: any, next: any) => {
    req.usuario = { id: 1, email: 'admin@test.com' };
    next();
  },
  requireRole: (...roles: string[]) => (req: any, res: any, next: any) => {
    const userRoles = req.headers['x-test-roles']?.split(',') || ['ADMIN'];
    if (roles.some(r => userRoles.includes(r))) {
      next();
    } else {
      res.status(403).json({ success: false, message: 'No tienes permiso' });
    }
  }
}));

// Mock de los servicios para no depender de la DB real en esta prueba de integración de rutas
jest.mock('../services/product.service');

describe('Brand Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/admin/brands', () => {
    test('ADMIN debería poder listar todas las marcas', async () => {
      (productService.listarMarcas as jest.Mock).mockResolvedValue([{ id: 1, nombre: 'Marca 1' }]);

      const response = await request(app)
        .get('/api/v1/admin/brands')
        .set('x-test-roles', 'ADMIN');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(productService.listarMarcas).toHaveBeenCalledWith(false);
    });

    test('VENDEDOR no debería poder acceder a marcas administrativas', async () => {
      const response = await request(app)
        .get('/api/v1/admin/brands')
        .set('x-test-roles', 'VENDEDOR');

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/admin/brands', () => {
    test('ADMIN debería poder crear una marca', async () => {
      (productService.crearMarca as jest.Mock).mockResolvedValue({ id: 1, nombre: 'Nueva' });

      const response = await request(app)
        .post('/api/v1/admin/brands')
        .set('x-test-roles', 'ADMIN')
        .send({ nombre: 'Nueva', descripcion: 'Desc' });

      expect(response.status).toBe(201);
      expect(response.body.data.nombre).toBe('Nueva');
    });

    test('GERENTE_INVENTARIO debería poder crear una marca', async () => {
      (productService.crearMarca as jest.Mock).mockResolvedValue({ id: 1, nombre: 'Nueva' });

      const response = await request(app)
        .post('/api/v1/admin/brands')
        .set('x-test-roles', 'GERENTE_INVENTARIO')
        .send({ nombre: 'Nueva', descripcion: 'Desc' });

      expect(response.status).toBe(201);
    });
  });
});
