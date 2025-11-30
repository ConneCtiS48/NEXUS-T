import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Componente de menú de subpáginas reutilizable (segunda barra horizontal)
 * @param {Array} items - Array de objetos {path, label, icon}
 * @param {string} basePath - Ruta base para determinar el item activo
 */
export default function SubPageMenu({ items = [], basePath = '' }) {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => {
    if (path === basePath) {
      return location.pathname === basePath
    }
    return location.pathname.startsWith(path)
  }

  if (!items || items.length === 0) return null

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto">
          {items.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                isActive(item.path)
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

