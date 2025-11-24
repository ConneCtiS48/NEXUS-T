import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const goToDocente = () => {
    navigate('/docente')
  }

  const goToJefeGrupo = () => {
    navigate('/jefe-grupo')
  }

  const goToOrientacion = () => {
    navigate('/orientacion')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header con información del usuario */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Bienvenido a la Plataforma de Tutorías
            </h1>
            {user && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Sesión iniciada como: <span className="font-semibold">{user.email}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-4 focus:ring-red-500/50"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Contenido principal */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white text-center">
            Seleccione su rol para continuar:
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={goToDocente}
              className="rounded-lg border border-transparent px-6 py-3 text-base font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-md hover:shadow-lg"
            >
              Docente
            </button>
            <button className="rounded-lg border border-transparent px-6 py-3 text-base font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-md hover:shadow-lg">
              Tutor
            </button>
            <button
              onClick={goToJefeGrupo}
              className="rounded-lg border border-transparent px-6 py-3 text-base font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-md hover:shadow-lg"
            >
              Jefe de Grupo
            </button>
            <button
              onClick={goToOrientacion}
              className="rounded-lg border border-transparent px-6 py-3 text-base font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-md hover:shadow-lg"
            >
              Orientación Educativa
            </button>
            <button className="rounded-lg border border-transparent px-6 py-3 text-base font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-md hover:shadow-lg">
              Padre de Familia
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}