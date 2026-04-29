// =============================================
// UTILIDAD FRONTEND: NORMALIZAR URL DE IMÁGENES
// =============================================

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '')

export function getImageUrl(path?: string | null): string {
  if (!path || path.trim() === '') {
    return 'https://placehold.co/500x500/e5e7eb/64748b?text=Sin+imagen'
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  if (path.startsWith('/uploads')) {
    return `${API_URL}${path}`
  }

  if (path.startsWith('uploads')) {
    return `${API_URL}/${path}`
  }

  return path
}
