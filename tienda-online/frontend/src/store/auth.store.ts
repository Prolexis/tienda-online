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
  login:    (email: string, password: string) => Promise<void>
  register: (datos: { nombre: string; apellido: string; email: string; password: string }) => Promise<void>
  logout:   () => void
  esAdmin:  () => boolean
  esCliente: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  usuario: (() => {
    // Rehidratar usuario del localStorage al iniciar
    try {
      const saved = localStorage.getItem('usuario')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })(),
  cargando: false,

  login: async (email, password) => {
    set({ cargando: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      const { usuario, accessToken, refreshToken } = data.data
      localStorage.setItem('accessToken',  accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('usuario',      JSON.stringify(usuario))
      set({ usuario, cargando: false })
    } catch (err) {
      set({ cargando: false })
      throw err
    }
  },

  register: async (datos) => {
    set({ cargando: true })
    try {
      const { data } = await api.post('/auth/register', datos)
      const { usuario, accessToken, refreshToken } = data.data
      localStorage.setItem('accessToken',  accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('usuario',      JSON.stringify(usuario))
      set({ usuario, cargando: false })
    } catch (err) {
      set({ cargando: false })
      throw err
    }
  },

  logout: () => {
    api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('usuario')
    set({ usuario: null })
  },

  esAdmin:   () => get().usuario?.roles.includes('ADMIN') ?? false,
  esCliente: () => get().usuario?.roles.includes('CLIENTE') ?? false,
}))
