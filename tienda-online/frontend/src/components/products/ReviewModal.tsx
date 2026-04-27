// =============================================
// COMPONENTE: MODAL DE RESEÑAS
// =============================================

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

interface Resena {
  id: number
  puntuacion: number
  comentario: string
  createdAt: string
  usuario: { nombre: string; apellido: string }
}

interface ReviewModalProps {
  productoId: number
  nombreProducto: string
  onClose: () => void
}

export default function ReviewModal({ productoId, nombreProducto, onClose }: ReviewModalProps) {
  const [resenas, setResenas] = useState<Resena[]>([])
  const [cargando, setCargando] = useState(true)
  const [puntuacion, setPuntuacion] = useState(5)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { usuario } = useAuthStore()

  const cargarResenas = async () => {
    try {
      const { data } = await api.get(`/reviews/product/${productoId}`)
      setResenas(data.data)
    } catch {
      toast.error('Error al cargar reseñas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargarResenas() }, [productoId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario) { toast.error('Inicia sesión para calificar'); return }
    setEnviando(true)
    try {
      await api.post('/reviews', { productoId, puntuacion, comentario })
      toast.success('¡Reseña enviada con éxito!')
      setComentario('')
      cargarResenas()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al enviar reseña')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="bg-primary-600 px-6 py-4 flex items-center justify-between text-white">
          <h3 className="font-bold">Reseñas de {nombreProducto}</h3>
          <button onClick={onClose} className="hover:rotate-90 transition-transform">✕</button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Formulario de Reseña */}
          {usuario && (
            <form onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm font-bold text-gray-700 mb-3">Danos tu opinión</p>
              
              {/* Estrellas */}
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setPuntuacion(star)}
                    className={`text-2xl transition-transform hover:scale-110 ${star <= puntuacion ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Cuéntanos tu experiencia con el producto..."
                className="input-field text-sm mb-3 h-20 resize-none"
              />

              <button
                type="submit"
                disabled={enviando}
                className="btn-primary w-full text-sm py-2"
              >
                {enviando ? 'Enviando...' : 'Publicar Reseña'}
              </button>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                * Solo permitido si has comprado este producto.
              </p>
            </form>
          )}

          {/* Listado de Reseñas */}
          <div className="space-y-4">
            {cargando ? (
              <div className="text-center py-4">Cargando...</div>
            ) : resenas.length === 0 ? (
              <div className="text-center py-8 text-gray-500 italic">
                Aún no hay reseñas para este producto.
              </div>
            ) : (
              resenas.map((r) => (
                <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-gray-900">
                      {r.usuario.nombre} {r.usuario.apellido[0]}.
                    </p>
                    <span className="text-[10px] text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex text-yellow-400 text-xs mb-1">
                    {'★'.repeat(r.puntuacion)}{'☆'.repeat(5 - r.puntuacion)}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {r.comentario}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
