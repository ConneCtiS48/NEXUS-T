import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Home() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let isMounted = true

    const detectAndRedirect = async () => {
      try {
        if (!isMounted) return
        
        setLoading(true)
        setError(null)
        
        // Obtener los roles del usuario desde la base de datos
        const { data: userRoles, error: userRolesError } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', user.id)

        if (!isMounted) return

        if (userRolesError) {
          console.error('Error al obtener roles:', userRolesError)
          setError('Error al verificar tus roles. Por favor, contacta al administrador.')
          setLoading(false)
          return
        }

        if (!userRoles || userRoles.length === 0) {
          setError('No tienes roles asignados. Por favor, contacta a Orientación Educativa para asignarte un rol.')
          setLoading(false)
          return
        }

        // Obtener los nombres de los roles
        const roleIds = userRoles.map((ur) => ur.role_id)
        const { data: roles, error: rolesError } = await supabase
          .from('roles')
          .select('name')
          .in('id', roleIds)

        if (!isMounted) return

        if (rolesError) {
          console.error('Error al obtener nombres de roles:', rolesError)
          setError('Error al verificar tus roles. Por favor, contacta al administrador.')
          setLoading(false)
          return
        }

        const roleNames = (roles || []).map((r) => r.name).filter(Boolean)

        // Prioridad de redirección según roles
        // 1. Admin (más privilegiado)
        if (roleNames.includes('admin')) {
          navigate('/admin', { replace: true })
          return
        }

        // 2. Orientación
        if (roleNames.includes('orientador')) {
          navigate('/orientacion', { replace: true })
          return
        }

        // 3. Tutor
        if (roleNames.includes('tutor')) {
          navigate('/tutor', { replace: true })
          return
        }

        // 4. Docente
        if (roleNames.includes('docente')) {
          navigate('/docente', { replace: true })
          return
        }

        // 5. Jefe de Grupo
        if (roleNames.includes('jefe_grupo')) {
          navigate('/jefe-grupo', { replace: true })
          return
        }

        // 5. Si no tiene ningún rol específico reconocido, mostrar error
        if (isMounted) {
          setError(`No se pudo determinar tu rol. Roles encontrados: ${roleNames.join(', ')}. Por favor, contacta a Orientación Educativa.`)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error al detectar rol:', err)
        if (isMounted) {
          setError('Ocurrió un error al verificar tu rol. Por favor, intenta nuevamente.')
          setLoading(false)
        }
      }
    }

    detectAndRedirect()

    return () => {
      isMounted = false
    }
  }, [user, navigate])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  // Mostrar loading mientras se detecta el rol
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400">Detectando tu rol...</p>
        </div>
      </div>
    )
  }

  // Mostrar error si hay problema
  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 text-center">
          <div className="mb-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <svg
                className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Problema con tu Rol
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleSignOut}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-4 focus:ring-red-500/50"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    )
  }

  return null
}