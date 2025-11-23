import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto p-8 text-center">
        <h1 className="text-6xl font-bold mb-6 text-gray-900 dark:text-white">
          Bienvenido a Nexus-T
        </h1>
        <p className="text-xl mb-4 text-gray-700 dark:text-gray-300">
          Plataforma de Tutorías y Gestión Educativa
        </p>
        <p className="text-lg mb-12 text-gray-600 dark:text-gray-400">
          Gestiona tutorías, seguimiento de alumnos y comunicación educativa
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/signin"
            className="rounded-lg px-8 py-3 text-base font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-lg hover:shadow-xl"
          >
            Iniciar Sesión
          </Link>
          <Link
            to="/signup"
            className="rounded-lg px-8 py-3 text-base font-medium bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-lg hover:shadow-xl dark:bg-gray-800 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-gray-700"
          >
            Crear Cuenta
          </Link>
        </div>
      </div>
    </div>
  )
}

