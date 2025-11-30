import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RoleNavigation({ currentRole }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  // Menú según el rol
  const menuItems = {
    admin: [
      { path: '/admin', label: 'Panel de Administración', icon: '⚙️' },
    ],
    docente: [
      { path: '/docente', label: 'Mi Sesión Docente', icon: '📚' },
    ],
    tutor: [
      { path: '/tutor', label: 'Mi Sesión Tutor', icon: '👨‍🏫' },
    ],
    orientacion: [
      { path: '/orientacion', label: 'Orientación Educativa', icon: '🎓' },
    ],
  }

  const items = menuItems[currentRole] || []

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {items.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium focus:outline-none focus:ring-4 focus:ring-red-500/50"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </nav>
  )
}

