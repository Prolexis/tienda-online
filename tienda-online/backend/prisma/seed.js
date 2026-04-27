// =============================================
// SEED INICIAL - Roles, permisos y usuario admin
// =============================================

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function crearRol(nombre, descripcion) {
  return prisma.rol.upsert({
    where: { nombre },
    update: {
      descripcion,
      activo: true,
    },
    create: {
      nombre,
      descripcion,
      activo: true,
    },
  })
}

async function crearPermiso(modulo, accion) {
  return prisma.permiso.upsert({
    where: {
      modulo_accion: {
        modulo,
        accion,
      },
    },
    update: {},
    create: {
      modulo,
      accion,
    },
  })
}

async function asignarPermiso(rolId, permisoId) {
  return prisma.rolPermiso.upsert({
    where: {
      rolId_permisoId: {
        rolId,
        permisoId,
      },
    },
    update: {},
    create: {
      rolId,
      permisoId,
    },
  })
}

async function asignarRol(usuarioId, rolId) {
  return prisma.usuarioRol.upsert({
    where: {
      usuarioId_rolId: {
        usuarioId,
        rolId,
      },
    },
    update: {},
    create: {
      usuarioId,
      rolId,
    },
  })
}

async function main() {
  console.log('🌱 Iniciando seed...')

  // 1. Crear roles en MAYÚSCULA, como los espera el frontend y probablemente el backend
  const rolAdmin = await crearRol('ADMIN', 'Administrador del sistema')
  const rolCliente = await crearRol('CLIENTE', 'Cliente de la tienda')
  const rolGerenteVentas = await crearRol('GERENTE_VENTAS', 'Gerente de ventas')
  const rolGerenteInventario = await crearRol('GERENTE_INVENTARIO', 'Gerente de inventario')
  const rolVendedor = await crearRol('VENDEDOR', 'Vendedor')
  const rolDueno = await crearRol('DUEÑO', 'Dueño del negocio')

  console.log('✅ Roles creados/verificados')

  // 2. Crear permisos amplios para administración
  const permisos = [
    ['admin', 'acceder'],
    ['dashboard', 'leer'],

    ['usuarios', 'leer'],
    ['usuarios', 'crear'],
    ['usuarios', 'actualizar'],
    ['usuarios', 'eliminar'],

    ['productos', 'leer'],
    ['productos', 'crear'],
    ['productos', 'actualizar'],
    ['productos', 'eliminar'],

    ['categorias', 'leer'],
    ['categorias', 'crear'],
    ['categorias', 'actualizar'],
    ['categorias', 'eliminar'],

    ['marcas', 'leer'],
    ['marcas', 'crear'],
    ['marcas', 'actualizar'],
    ['marcas', 'eliminar'],

    ['ordenes', 'leer'],
    ['ordenes', 'actualizar'],

    ['inventario', 'leer'],
    ['inventario', 'actualizar'],

    ['reportes', 'leer'],

    ['notificaciones', 'leer'],
    ['notificaciones', 'actualizar'],

    ['cupones', 'leer'],
    ['cupones', 'crear'],
    ['cupones', 'actualizar'],
    ['cupones', 'eliminar'],

    ['pagos', 'leer'],
    ['pagos', 'verificar'],

    ['configuracion', 'leer'],
    ['configuracion', 'actualizar'],
  ]

  const permisosCreados = []

  for (const [modulo, accion] of permisos) {
    const permiso = await crearPermiso(modulo, accion)
    permisosCreados.push(permiso)
  }

  // 3. ADMIN y DUEÑO reciben todos los permisos
  for (const permiso of permisosCreados) {
    await asignarPermiso(rolAdmin.id, permiso.id)
    await asignarPermiso(rolDueno.id, permiso.id)
  }

  // 4. Otros roles reciben permisos básicos
  for (const permiso of permisosCreados) {
    if (['productos', 'ordenes', 'reportes', 'cupones', 'notificaciones'].includes(permiso.modulo)) {
      await asignarPermiso(rolGerenteVentas.id, permiso.id)
    }

    if (['productos', 'inventario', 'reportes', 'notificaciones'].includes(permiso.modulo)) {
      await asignarPermiso(rolGerenteInventario.id, permiso.id)
    }

    if (['productos', 'ordenes', 'notificaciones'].includes(permiso.modulo)) {
      await asignarPermiso(rolVendedor.id, permiso.id)
    }
  }

  console.log('✅ Permisos creados/verificados')

  // 5. Crear usuario administrador
  const passwordHash = await bcrypt.hash('admin123', 10)

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@tienda.com' },
    update: {
      passwordHash,
      nombre: 'Administrador',
      apellido: 'Sistema',
      activo: true,
      emailVerificado: true,
    },
    create: {
      email: 'admin@tienda.com',
      passwordHash,
      nombre: 'Administrador',
      apellido: 'Sistema',
      activo: true,
      emailVerificado: true,
    },
  })

  // 6. Asignar roles fuertes al admin
  await asignarRol(admin.id, rolAdmin.id)
  await asignarRol(admin.id, rolDueno.id)

  console.log('✅ Usuario administrador creado/verificado')
  console.log('📧 Email: admin@tienda.com')
  console.log('🔑 Password: admin123')
  console.log('🎉 Seed completado correctamente')
}

main()
  .catch((error) => {
    console.error('❌ Error ejecutando seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
