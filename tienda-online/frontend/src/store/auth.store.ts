// =============================================
// STORE DE AUTENTICACIÓN - Zustand
// =============================================

import { create } from 'zustand'
import api from '../services/api'

interface Usuario {
  id: number
  nombre: string
  apellido: string
  email: string
  roles: string[]
}

interface AuthState {
  usuario: Usuario | null
  cargando: boolean
  login: (email: string, password: string) => Promise<void>
  register: (datos: {
    nombre: string
    apellido: string
    email: string
    password: string
  }) => Promise<void>
  logout: () => void
  esAdmin: () => boolean
  esCliente: () => boolean
}

// ─── Extraer datos de cualquier forma de respuesta ────────────
function normalizarAuthResponse(responseData: any) {
  const payload = responseData?.data || responseData

  const usuario =
    payload?.usuario ||
    payload?.user ||
    payload?.cliente ||
    null

  const accessToken =
    payload?.accessToken ||
    payload?.token ||
    payload?.jwt ||
    null

  const refreshToken =
    payload?.refreshToken ||
    payload?.refresh ||
    null

  return {
    usuario,
    accessToken,
    refreshToken,
  }
}

// ─── Guardar sesión ───────────────────────────────────────────
function guardarSesion(usuario: Usuario, accessToken: string, refreshToken?: string | null) {
  localStorage.setItem('usuario', JSON.stringify(usuario))
  localStorage.setItem('accessToken', accessToken)

  // También guardamos token por compatibilidad con otros archivos
  localStorage.setItem('token', accessToken)

  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken)
  }
}

// ─── Limpiar sesión ───────────────────────────────────────────
function limpiarSesion() {
  localStorage.removeItem('usuario')
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('token')
  localStorage.removeItem('authToken')
}

export const useAuthStore = create<AuthState>((set, get) => ({
  usuario: (() => {
    try {
      const saved = localStorage.getItem('usuario')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })(),

  cargando: false,

  login: async (email, password) => {
    set({ cargando: true })

    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
      })

      const { usuario, accessToken, refreshToken } = normalizarAuthResponse(data)

      if (!usuario || !accessToken) {
        console.error('Respuesta de login inesperada:', data)
        throw new Error('El backend no devolvió usuario o token de acceso.')
      }

      guardarSesion(usuario, accessToken, refreshToken)

      set({
        usuario,
        cargando: false,
      })
    } catch (err) {
      set({ cargando: false })
      throw err
    }
  },

  register: async (datos) => {
    set({ cargando: true })

    try {
      const { data } = await api.post('/auth/register', datos)

      const { usuario, accessToken, refreshToken } = normalizarAuthResponse(data)

      if (!usuario || !accessToken) {
        console.error('Respuesta de registro inesperada:', data)
        throw new Error('El backend no devolvió usuario o token de acceso.')
      }

      guardarSesion(usuario, accessToken, refreshToken)

      set({
        usuario,
        cargando: false,
      })
    } catch (err) {
      set({ cargando: false })
      throw err
    }
  },

  logout: () => {
    api.post('/auth/logout').catch(() => {})

    limpiarSesion()

    set({
      usuario: null,
    })
  },

  esAdmin: () => {
    const roles = get().usuario?.roles || []
    return roles.includes('ADMIN')
  },

  esCliente: () => {
    const roles = get().usuario?.roles || []
    return roles.includes('CLIENTE')
  },
}))
