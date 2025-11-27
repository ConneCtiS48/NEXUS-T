import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGroups: 0,
    totalIncidents: 0,
    totalRoles: 0,
  })
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setErrorMessage(null)

      try {
        // Obtener estadísticas generales
        const [usersResult, groupsResult, incidentsResult, rolesResult] = await Promise.all([
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
          supabase.from('groups').select('id', { count: 'exact', head: true }),
          supabase.from('incidents').select('id', { count: 'exact', head: true }),
          supabase.from('roles').select('id', { count: 'exact', head: true }),
        ])

        setStats({
          totalUsers: usersResult.count || 0,
          totalGroups: groupsResult.count || 0,
          totalIncidents: incidentsResult.count || 0,
          totalRoles: rolesResult.count || 0,
        })
      } catch (error) {
        console.error('Error al cargar estadísticas:', error)
        setErrorMessage('No se pudieron cargar las estadísticas del sistema.')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs sm:text-sm uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">
          Panel de Administración
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          Gestión del Sistema
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
          {user?.email ? `Sesión iniciada como ${user.email}` : 'Usuario no identificado'}
        </p>
      </header>

      {errorMessage && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      <section className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-400">
              Usuarios
            </h3>
            <span className="text-2xl">👥</span>
          </div>
          {loading ? (
            <p className="text-gray-400">Cargando...</p>
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalUsers}
            </p>
          )}
        </div>

        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-400">
              Grupos
            </h3>
            <span className="text-2xl">🏫</span>
          </div>
          {loading ? (
            <p className="text-gray-400">Cargando...</p>
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalGroups}
            </p>
          )}
        </div>

        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-400">
              Incidentes
            </h3>
            <span className="text-2xl">📋</span>
          </div>
          {loading ? (
            <p className="text-gray-400">Cargando...</p>
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalIncidents}
            </p>
          )}
        </div>

        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-400">
              Roles
            </h3>
            <span className="text-2xl">🔐</span>
          </div>
          {loading ? (
            <p className="text-gray-400">Cargando...</p>
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalRoles}
            </p>
          )}
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 sm:p-6 border border-blue-100 dark:border-slate-800">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Información del Sistema
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Acceso Administrativo
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Como administrador, tienes acceso completo al sistema. Puedes gestionar usuarios, grupos, 
              roles y todas las funcionalidades del sistema.
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Funcionalidades Disponibles
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>Gestión completa de usuarios y perfiles</li>
              <li>Administración de grupos y asignaciones</li>
              <li>Visualización de estadísticas del sistema</li>
              <li>Acceso a todas las funcionalidades de Orientación Educativa</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}


