import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import RoleNavigation from '../../components/RoleNavigation'

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const adminMenuItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/users', label: 'Usuarios', icon: '👥' },
  ]

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <RoleNavigation currentRole="admin" />
      
      {/* Menú de subpáginas del Admin */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto">
            {adminMenuItems.map((item) => (
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

      {/* Contenido de las subpáginas */}
      <Outlet />
    </div>
  )
}

