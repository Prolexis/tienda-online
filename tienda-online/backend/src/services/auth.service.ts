// =============================================
// SERVICIO DE AUTENTICACIÓN
// =============================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/error.middleware';
import { RegisterDTO, LoginDTO } from '../types';

const SALT_ROUNDS = 12;

// ─── Helpers de tokens ────────────────────────────────────────
function generarAccessToken(payload: { id: number; email: string; roles: string[] }) {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  } as jwt.SignOptions);
}

function generarRefreshToken(payload: { id: number }) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
}

// ─── Registro de nuevo usuario ────────────────────────────────
export async function registrar(datos: RegisterDTO) {
  // Verificar si el email ya existe
  const existe = await prisma.usuario.findUnique({ where: { email: datos.email } });
  if (existe) throw new AppError('El email ya está registrado', 409);

  // Obtener rol CLIENTE por defecto
  const rolCliente = await prisma.rol.findUnique({ where: { nombre: 'CLIENTE' } });
  if (!rolCliente) throw new AppError('Configuración de roles incompleta', 500);

  // Hash de contraseña
  const passwordHash = await bcrypt.hash(datos.password, SALT_ROUNDS);

  // Crear usuario con transacción (usuario + cliente + rol)
  const usuario = await prisma.$transaction(async (tx) => {
    const nuevoUsuario = await tx.usuario.create({
      data: {
        email: datos.email,
        passwordHash,
        nombre: datos.nombre,
        apellido: datos.apellido,
        roles: { create: { rolId: rolCliente.id } },
      },
    });

    // Crear perfil de cliente
    await tx.cliente.create({ data: { usuarioId: nuevoUsuario.id } });

    return nuevoUsuario;
  });

  // Generar tokens
  const roles = ['CLIENTE'];
  const accessToken  = generarAccessToken({ id: usuario.id, email: usuario.email, roles });
  const refreshToken = generarRefreshToken({ id: usuario.id });

  // Guardar refresh token hasheado
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { refreshToken: await bcrypt.hash(refreshToken, 8) },
  });

  return {
    usuario: { id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email, roles },
    accessToken,
    refreshToken,
  };
}

// ─── Inicio de sesión ─────────────────────────────────────────
export async function login(datos: LoginDTO) {
  // Buscar usuario con sus roles
  const usuario = await prisma.usuario.findUnique({
    where: { email: datos.email },
    include: { roles: { include: { rol: true } } },
  });

  if (!usuario || !usuario.activo) {
    throw new AppError('Credenciales inválidas', 401);
  }

  // Verificar contraseña
  const passwordValida = await bcrypt.compare(datos.password, usuario.passwordHash);
  if (!passwordValida) throw new AppError('Credenciales inválidas', 401);

  const roles = usuario.roles.map((ur) => ur.rol.nombre);
  const accessToken  = generarAccessToken({ id: usuario.id, email: usuario.email, roles });
  const refreshToken = generarRefreshToken({ id: usuario.id });

  // Actualizar refresh token
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { refreshToken: await bcrypt.hash(refreshToken, 8) },
  });

  return {
    usuario: { id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email, roles },
    accessToken,
    refreshToken,
  };
}

// ─── Refrescar access token ───────────────────────────────────
export async function refrescarToken(refreshToken: string) {
  let payload: { id: number };
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: number };
  } catch {
    throw new AppError('Refresh token inválido o expirado', 401);
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.id },
    include: { roles: { include: { rol: true } } },
  });

  if (!usuario || !usuario.refreshToken) throw new AppError('Sesión inválida', 401);

  const tokenValido = await bcrypt.compare(refreshToken, usuario.refreshToken);
  if (!tokenValido) throw new AppError('Refresh token inválido', 401);

  const roles = usuario.roles.map((ur) => ur.rol.nombre);
  const nuevoAccessToken = generarAccessToken({ id: usuario.id, email: usuario.email, roles });

  return { accessToken: nuevoAccessToken };
}

// ─── Cerrar sesión ────────────────────────────────────────────
export async function logout(usuarioId: number) {
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { refreshToken: null },
  });
}
