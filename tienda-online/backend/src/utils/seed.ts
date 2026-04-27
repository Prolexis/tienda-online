// =============================================
// SEED - Datos iniciales de la base de datos
// =============================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // ─── Roles ────────────────────────────────────────────────
  const roles = ['ADMIN', 'CLIENTE', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR'];
  for (const nombre of roles) {
    await prisma.rol.upsert({
      where: { nombre },
      update: {},
      create: { nombre, descripcion: `Rol ${nombre}` },
    });
  }
  console.log('✅ Roles creados');

  // ─── Usuario Admin ────────────────────────────────────────
  const rolAdmin = await prisma.rol.findUnique({ where: { nombre: 'ADMIN' } });
  const passwordHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@tienda.com' },
    update: {},
    create: {
      email: 'admin@tienda.com',
      passwordHash,
      nombre:   'Administrador',
      apellido: 'Principal',
      emailVerificado: true,
      roles: { create: { rolId: rolAdmin!.id } },
    },
  });
  console.log('✅ Usuario admin creado: admin@tienda.com / admin123');

  // ─── Usuario Cliente de prueba ────────────────────────────
  const rolCliente = await prisma.rol.findUnique({ where: { nombre: 'CLIENTE' } });
  const clienteHash = await bcrypt.hash('cliente123', 12);

  const cliente = await prisma.usuario.upsert({
    where: { email: 'cliente@tienda.com' },
    update: {},
    create: {
      email: 'cliente@tienda.com',
      passwordHash: clienteHash,
      nombre:   'María',
      apellido: 'García',
      emailVerificado: true,
      roles: { create: { rolId: rolCliente!.id } },
    },
  });

  await prisma.cliente.upsert({
    where: { usuarioId: cliente.id },
    update: {},
    create: { usuarioId: cliente.id },
  });

  await prisma.direccion.create({
    data: {
      clienteId:   1,
      alias:       'Casa',
      nombre:      'María',
      apellido:    'García',
      direccion:   'Av. Javier Prado 1234, Miraflores',
      ciudad:      'Lima',
      departamento: 'Lima',
      codigoPostal: '15048',
      telefono:    '999888777',
      esPrincipal: true,
    },
  }).catch(() => {}); // Ignorar si ya existe

  console.log('✅ Usuario cliente creado: cliente@tienda.com / cliente123');

  // ─── Usuario Vendedor de prueba ────────────────────────────
  const rolVendedor = await prisma.rol.findUnique({ where: { nombre: 'VENDEDOR' } });
  const vendedorHash = await bcrypt.hash('vendedor123', 12);

  await prisma.usuario.upsert({
    where: { email: 'vendedor@tienda.com' },
    update: {},
    create: {
      email: 'vendedor@tienda.com',
      passwordHash: vendedorHash,
      nombre:   'Jorge',
      apellido: 'Vendedor',
      emailVerificado: true,
      roles: { create: { rolId: rolVendedor!.id } },
    },
  });
  console.log('✅ Usuario vendedor creado: vendedor@tienda.com / vendedor123');

  // ─── Categorías ───────────────────────────────────────────
  const categorias = [
    { nombre: 'Electrónica',    slug: 'electronica' },
    { nombre: 'Ropa y Moda',    slug: 'ropa-moda' },
    { nombre: 'Hogar',          slug: 'hogar' },
    { nombre: 'Deportes',       slug: 'deportes' },
    { nombre: 'Libros',         slug: 'libros' },
    { nombre: 'Juguetes',       slug: 'juguetes' },
  ];

  for (const cat of categorias) {
    await prisma.categoria.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Categorías creadas');

  // ─── Productos ────────────────────────────────────────────
  const catElec  = await prisma.categoria.findUnique({ where: { slug: 'electronica' } });
  const catRopa  = await prisma.categoria.findUnique({ where: { slug: 'ropa-moda' } });
  const catHogar = await prisma.categoria.findUnique({ where: { slug: 'hogar' } });
  const catDep   = await prisma.categoria.findUnique({ where: { slug: 'deportes' } });
  const catLib   = await prisma.categoria.findUnique({ where: { slug: 'libros' } });
  const catJug   = await prisma.categoria.findUnique({ where: { slug: 'juguetes' } });

  const productos = [
    // Electrónica
    { sku: 'ELEC-001', nombre: 'Audífonos Bluetooth Premium', categoriaId: catElec!.id, precioVenta: 299.90, precioCompra: 120.00, stock: 50, destacado: true, imagen: 'https://via.placeholder.com/400x400/3b82f6/ffffff?text=Audifonos', descripcion: 'Audífonos inalámbricos con cancelación de ruido, 30 horas de batería y sonido de alta fidelidad.' },
    { sku: 'ELEC-002', nombre: 'Smartwatch Fitness Pro', categoriaId: catElec!.id, precioVenta: 599.90, precioOferta: 499.90, precioCompra: 250.00, stock: 30, destacado: true, imagen: 'https://via.placeholder.com/400x400/6366f1/ffffff?text=Smartwatch', descripcion: 'Reloj inteligente con monitor de salud, GPS y resistencia al agua.' },
    { sku: 'ELEC-003', nombre: 'Cámara Web 4K Ultra HD', categoriaId: catElec!.id, precioVenta: 449.90, precioCompra: 180.00, stock: 25, imagen: 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Camara+Web', descripcion: 'Cámara web para videoconferencias y streaming con calidad 4K.' },
    { sku: 'ELEC-004', nombre: 'Teclado Mecánico RGB', categoriaId: catElec!.id, precioVenta: 389.90, precioCompra: 150.00, stock: 40, imagen: 'https://via.placeholder.com/400x400/ec4899/ffffff?text=Teclado', descripcion: 'Teclado mecánico con retroiluminación RGB y switches blue.' },
    { sku: 'ELEC-005', nombre: 'Mouse Inalámbrico Ergonómico', categoriaId: catElec!.id, precioVenta: 149.90, precioCompra: 60.00, stock: 60, imagen: 'https://via.placeholder.com/400x400/14b8a6/ffffff?text=Mouse', descripcion: 'Mouse inalámbrico diseño ergonómico para largas jornadas de trabajo.' },
    // Ropa
    { sku: 'ROPA-001', nombre: 'Polo Deportivo Running Dry-Fit', categoriaId: catRopa!.id, precioVenta: 89.90, precioCompra: 35.00, stock: 100, destacado: true, imagen: 'https://via.placeholder.com/400x400/22c55e/ffffff?text=Polo+Running', descripcion: 'Polo de tela Dry-Fit ideal para correr y actividades al aire libre.' },
    { sku: 'ROPA-002', nombre: 'Jeans Slim Fit Premium', categoriaId: catRopa!.id, precioVenta: 199.90, precioOferta: 159.90, precioCompra: 75.00, stock: 80, imagen: 'https://via.placeholder.com/400x400/0ea5e9/ffffff?text=Jeans', descripcion: 'Jeans de corte slim con tela de alta calidad y durabilidad.' },
    { sku: 'ROPA-003', nombre: 'Zapatillas Urbanas Clásicas', categoriaId: catRopa!.id, precioVenta: 349.90, precioCompra: 130.00, stock: 45, imagen: 'https://via.placeholder.com/400x400/f59e0b/ffffff?text=Zapatillas', descripcion: 'Zapatillas urbanas con diseño clásico y suela acolchada.' },
    // Hogar
    { sku: 'HOGAR-001', nombre: 'Cafetera Espresso Automática', categoriaId: catHogar!.id, precioVenta: 899.90, precioCompra: 380.00, stock: 20, destacado: true, imagen: 'https://via.placeholder.com/400x400/d97706/ffffff?text=Cafetera', descripcion: 'Cafetera automática con molinillo integrado y vaporizador de leche.' },
    { sku: 'HOGAR-002', nombre: 'Set de Sartenes Antiadherente', categoriaId: catHogar!.id, precioVenta: 279.90, precioOferta: 229.90, precioCompra: 100.00, stock: 35, imagen: 'https://via.placeholder.com/400x400/ef4444/ffffff?text=Sartenes', descripcion: 'Set de 3 sartenes con recubrimiento antiadherente de doble capa.' },
    { sku: 'HOGAR-003', nombre: 'Lámpara LED de Escritorio', categoriaId: catHogar!.id, precioVenta: 129.90, precioCompra: 50.00, stock: 55, imagen: 'https://via.placeholder.com/400x400/a3e635/000000?text=Lampara+LED', descripcion: 'Lámpara LED de escritorio con ajuste de temperatura e intensidad.' },
    // Deportes
    { sku: 'DEP-001', nombre: 'Bicicleta Estática Pro', categoriaId: catDep!.id, precioVenta: 1499.90, precioCompra: 650.00, stock: 10, imagen: 'https://via.placeholder.com/400x400/7c3aed/ffffff?text=Bicicleta', descripcion: 'Bicicleta estática con monitor de frecuencia cardíaca y 16 niveles de resistencia.' },
    { sku: 'DEP-002', nombre: 'Set de Mancuernas Ajustables', categoriaId: catDep!.id, precioVenta: 499.90, precioOferta: 399.90, precioCompra: 180.00, stock: 25, imagen: 'https://via.placeholder.com/400x400/0891b2/ffffff?text=Mancuernas', descripcion: 'Set de mancuernas ajustables de 2 a 32 kg con sistema de bloqueo.' },
    { sku: 'DEP-003', nombre: 'Esterilla de Yoga Premium', categoriaId: catDep!.id, precioVenta: 149.90, precioCompra: 55.00, stock: 70, imagen: 'https://via.placeholder.com/400x400/059669/ffffff?text=Esterilla+Yoga', descripcion: 'Esterilla antideslizante de 6mm con correa de transporte.' },
    // Libros
    { sku: 'LIB-001', nombre: 'Arquitectura de Software Moderna', categoriaId: catLib!.id, precioVenta: 89.90, precioCompra: 30.00, stock: 40, imagen: 'https://via.placeholder.com/400x400/1d4ed8/ffffff?text=Libro+SW', descripcion: 'Guía completa sobre patrones de diseño, microservicios y arquitecturas modernas.' },
    { sku: 'LIB-002', nombre: 'Python para Data Science', categoriaId: catLib!.id, precioVenta: 79.90, precioCompra: 28.00, stock: 50, imagen: 'https://via.placeholder.com/400x400/065f46/ffffff?text=Python+DS', descripcion: 'Aprende análisis de datos, machine learning y visualización con Python.' },
    // Juguetes
    { sku: 'JUG-001', nombre: 'LEGO Arquitectura Ciudad', categoriaId: catJug!.id, precioVenta: 349.90, precioOferta: 299.90, precioCompra: 130.00, stock: 30, destacado: true, imagen: 'https://via.placeholder.com/400x400/fbbf24/000000?text=LEGO', descripcion: 'Set de construcción LEGO con 650 piezas para crear una ciudad.' },
    { sku: 'JUG-002', nombre: 'Control Remoto Helicoptero RC', categoriaId: catJug!.id, precioVenta: 199.90, precioCompra: 75.00, stock: 20, imagen: 'https://via.placeholder.com/400x400/f97316/ffffff?text=Helicoptero+RC', descripcion: 'Helicóptero de control remoto con giroscopio 6 ejes y hasta 15 min de vuelo.' },
    { sku: 'JUG-003', nombre: 'Juego de Mesa Estrategia', categoriaId: catJug!.id, precioVenta: 129.90, precioCompra: 48.00, stock: 35, imagen: 'https://via.placeholder.com/400x400/be185d/ffffff?text=Juego+Mesa', descripcion: 'Juego de mesa de estrategia para 2-6 jugadores. Edición en español.' },
    { sku: 'JUG-004', nombre: 'Dron Plegable con Cámara HD', categoriaId: catElec!.id, precioVenta: 799.90, precioCompra: 320.00, stock: 15, imagen: 'https://via.placeholder.com/400x400/7e22ce/ffffff?text=Dron', descripcion: 'Dron plegable con cámara HD 1080p, autonomía de 20 minutos y control WiFi.' },
  ];

  for (const prod of productos) {
    await prisma.producto.upsert({
      where: { sku: prod.sku },
      update: {},
      create: prod,
    });
  }
  console.log(`✅ ${productos.length} productos creados`);

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('─────────────────────────────────────');
  console.log('Admin:    admin@tienda.com    / admin123');
  console.log('Vendedor: vendedor@tienda.com / vendedor123');
  console.log('Cliente:  cliente@tienda.com  / cliente123');
  console.log('─────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
