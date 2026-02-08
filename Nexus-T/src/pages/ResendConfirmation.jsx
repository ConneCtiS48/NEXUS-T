import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ResendConfirmation() {
  const location = useLocation()
  const emailFromState = location.state?.email ?? ''
  const [email, setEmail] = useState(emailFromState)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { resendConfirmationEmail } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    const { error: err } = await resendConfirmationEmail(email)

    setLoading(false)
    if (err) {
      setError(err.message || 'No se pudo reenviar el correo. Intenta más tarde.')
    } else {
      setSuccess(true)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Reenviar correo de confirmación
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
          Ingresa tu correo y te enviaremos de nuevo el email de verificación.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900 dark:text-red-200 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded dark:bg-green-900 dark:text-green-200 text-sm">
            Si existe una cuenta con ese correo, recibirás un nuevo email de confirmación. Revisa tu bandeja de entrada.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="tu@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Enviando...' : 'Reenviar correo de confirmación'}
          </button>
        </form>

        <p className="mt-6 text-center">
          <Link
            to="/signin"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium dark:text-blue-400"
          >
            Volver a Iniciar sesión
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  )
}
