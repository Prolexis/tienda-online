// =============================================
// SEED INICIAL - Roles y usuario administrador
// =============================================

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // 1. Crear roles básicos
  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: 'admin' },
    update: {
      descripcion: 'Administrador del sistema',
      activo: true,
    },
    create: {
      nombre: 'admin',
      descripcion: 'Administrador del sistema',
      activo: true,
    },
  })

  const rolCliente = await prisma.rol.upsert({
    where: { nombre: 'cliente' },
    update: {
      descripcion: 'Cliente de la tienda',
      activo: true,
    },
    create: {
      nombre: 'cliente',
      descripcion: 'Cliente de la tienda',
      activo: true,
    },
  })

  console.log('✅ Roles creados/verificados:', rolAdmin.nombre, rolCliente.nombre)

  // 2. Crear permisos básicos
  const permisos = [
    { modulo: 'usuarios', accion: 'leer' },
    { modulo: 'usuarios', accion: 'crear' },
    { modulo: 'usuarios', accion: 'actualizar' },
    { modulo: 'usuarios', accion: 'eliminar' },
    { modulo: 'productos', accion: 'leer' },
    { modulo: 'productos', accion: 'crear' },
    { modulo: 'productos', accion: 'actualizar' },
    { modulo: 'productos', accion: 'eliminar' },
    { modulo: 'ordenes', accion: 'leer' },
    { modulo: 'ordenes', accion: 'actualizar' },
    { modulo: 'reportes', accion: 'leer' },
    { modulo: 'admin', accion: 'acceder' },
  ]

  for (const permiso of permisos) {
    const permisoCreado = await prisma.permiso.upsert({
      where: {
        modulo_accion: {
          modulo: permiso.modulo,
          accion: permiso.accion,
        },
      },
      update: {},
      create: permiso,
    })

    await prisma.rolPermiso.upsert({
      where: {
        rolId_permisoId: {
          rolId: rolAdmin.id,
          permisoId: permisoCreado.id,
        },
      },
      update: {},
      create: {
        rolId: rolAdmin.id,
        permisoId: permisoCreado.id,
      },
    })
  }

  console.log('✅ Permisos básicos creados/verificados')

  // 3. Crear usuario administrador
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

  // 4. Asignar rol admin al usuario administrador
  await prisma.usuarioRol.upsert({
    where: {
      usuarioId_rolId: {
        usuarioId: admin.id,
        rolId: rolAdmin.id,
      },
    },
    update: {},
    create: {
      usuarioId: admin.id,
      rolId: rolAdmin.id,
    },
  })

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
