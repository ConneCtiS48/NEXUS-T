import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-8 text-center">
        <img 
          src="/src/assets/img/logo.jpeg" 
          alt="Nexus-T Logo" 
          className="mx-auto mb-6 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain" 
        />
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">
          Bienvenido a Nexus-T
        </h1>
        <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-gray-700 dark:text-gray-300 px-4">
          Enlace de Conexión y Seguimiento Tutorial
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4">
          <Link
            to="/signin"
            className="w-full sm:w-auto rounded-lg px-6 sm:px-8 py-3 text-sm sm:text-base font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-lg hover:shadow-xl"
          >
            Iniciar Sesión
          </Link>
          <Link
            to="/signup"
            className="w-full sm:w-auto rounded-lg px-6 sm:px-8 py-3 text-sm sm:text-base font-medium bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-lg hover:shadow-xl dark:bg-gray-800 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-gray-700"
          >
            Crear Cuenta
          </Link>
        </div>
      </div>
    </div>
  )
}

