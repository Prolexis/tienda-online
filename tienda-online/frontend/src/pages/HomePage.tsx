// =============================================
// PÁGINA: HOME / LANDING
// =============================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useCartStore } from '../store/cart.store'
import { useAuthStore } from '../store/auth.store'
import toast from 'react-hot-toast'

interface Producto {
  id: number; nombre: string; precioVenta: number; precioOferta: number | null
  imagen: string | null; stock: number; categoria: { nombre: string }
}

export default function HomePage() {
  const [destacados, setDestacados] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Array<{ id: number; nombre: string; _count: { productos: number } }>>([])
  const { agregarItem } = useCartStore()
  const { usuario }     = useAuthStore()

  useEffect(() => {
    api.get('/products', { params: { destacados: true, porPagina: 4 } })
      .then(({ data }) => setDestacados(data.productos))
    api.get('/products/categories')
      .then(({ data }) => setCategorias(data.data.slice(0, 6)))
  }, [])

  const handleAgregar = async (id: number) => {
    if (!usuario) { toast.error('Inicia sesión para agregar al carrito'); return }
    await agregarItem(id, 1)
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary-700 via-primary-600 to-blue-500 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              Tu tienda online<br/>
              <span className="text-yellow-300">a un clic</span>
            </h1>
            <p className="text-primary-100 text-lg mb-8 max-w-md">
              Descubre miles de productos con los mejores precios. Entrega rápida y segura a todo el Perú.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/products" className="bg-white text-primary-700 font-bold px-6 py-3 rounded-xl hover:bg-primary-50 transition-colors">
                Ver productos
              </Link>
              {!usuario && (
                <Link to="/register" className="border-2 border-white text-white font-bold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors">
                  Crear cuenta gratis
                </Link>
              )}
            </div>
          </div>
          <div className="flex-1 text-center text-[120px] leading-none select-none hidden md:block">
            🛍️
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icono: '🚚', titulo: 'Envío gratis', desc: 'En tu primera compra' },
            { icono: '🔒', titulo: 'Pago seguro',  desc: 'Transacciones protegidas' },
            { icono: '↩️', titulo: 'Devoluciones', desc: '30 días sin preguntas' },
            { icono: '💬', titulo: 'Soporte 24/7', desc: 'Siempre disponibles' },
          ].map(({ icono, titulo, desc }) => (
            <div key={titulo} className="flex items-center gap-3">
              <span className="text-3xl">{icono}</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{titulo}</p>
                <p className="text-gray-500 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categorías */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Explora por categoría</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categorias.map((cat, i) => {
            const iconos = ['📱','👕','🏠','⚽','📚','🎮']
            return (
              <Link key={cat.id} to={`/products?categoriaId=${cat.id}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center hover:border-primary-300 hover:shadow-md transition-all group">
                <div className="text-4xl mb-2">{iconos[i % iconos.length]}</div>
                <p className="text-sm font-semibold text-gray-800 group-hover:text-primary-600 transition-colors">{cat.nombre}</p>
                <p className="text-xs text-gray-400 mt-0.5">{cat._count.productos} productos</p>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Productos destacados */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">⭐ Productos destacados</h2>
          <Link to="/products" className="text-primary-600 hover:text-primary-700 font-medium text-sm">Ver todos →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {destacados.map((prod) => (
            <div key={prod.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-48 bg-gray-100 overflow-hidden">
                <img src={prod.imagen || 'https://via.placeholder.com/400x300'} alt={prod.nombre}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"/>
              </div>
              <div className="p-4">
                <span className="text-xs text-primary-600 font-medium">{prod.categoria.nombre}</span>
                <h3 className="font-semibold text-gray-900 mt-1 text-sm line-clamp-2">{prod.nombre}</h3>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <span className="text-lg font-bold text-primary-700">
                      S/. {Number(prod.precioOferta ?? prod.precioVenta).toFixed(2)}
                    </span>
                    {prod.precioOferta && (
                      <span className="ml-2 text-xs text-gray-400 line-through">
                        S/. {Number(prod.precioVenta).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleAgregar(prod.id)} disabled={prod.stock === 0}
                  className="btn-primary w-full mt-3 text-sm py-2">
                  🛒 Agregar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}