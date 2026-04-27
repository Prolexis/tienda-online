import * as productService from '../services/product.service';
import { prisma } from '../config/prisma';

jest.mock('../config/prisma', () => ({
  prisma: {
    marca: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

describe('Product Service - Marcas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('crearMarca debería crear una marca si no existe duplicado', async () => {
    (prisma.marca.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.marca.create as jest.Mock).mockResolvedValue({ id: 1, nombre: 'Nike', slug: 'nike' });

    const result = await productService.crearMarca({ nombre: 'Nike', descripcion: 'Just do it' });

    expect(result.nombre).toBe('Nike');
    expect(prisma.marca.create).toHaveBeenCalled();
  });

  test('crearMarca debería lanzar error si la marca ya existe', async () => {
    (prisma.marca.findFirst as jest.Mock).mockResolvedValue({ id: 1, nombre: 'Nike' });

    await expect(productService.crearMarca({ nombre: 'Nike' }))
      .rejects.toThrow('Ya existe una marca con ese nombre');
  });

  test('eliminarMarca debería lanzar error si tiene productos asociados', async () => {
    (prisma.marca.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      _count: { productos: 5 }
    });

    await expect(productService.eliminarMarca(1))
      .rejects.toThrow('No se puede eliminar la marca porque tiene 5 productos asociados');
  });
});
