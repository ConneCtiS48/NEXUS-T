import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const MIN_PASSWORD_LENGTH = 6

export default function UpdatePassword() {
  const { user, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasValidSession, setHasValidSession] = useState(false)

  useEffect(() => {
    setHasValidSession(!!user)
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error: err } = await updatePassword(password)
    setLoading(false)

    if (err) {
      setError(err.message || 'No se pudo actualizar la contraseña.')
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/signin', { replace: true }), 2000)
    }
  }

  if (!hasValidSession && !window.location.hash && !window.location.search) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 text-center">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Enlace no válido o expirado
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Este enlace de restablecimiento no es válido o ha expirado. Solicita uno nuevo.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Solicitar nuevo enlace
          </Link>
          <p className="mt-6">
            <Link to="/signin" className="text-sm text-blue-600 dark:text-blue-400">
              Volver a Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Restablecer contraseña
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
          Ingresa tu nueva contraseña.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900 dark:text-red-200 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded dark:bg-green-900 dark:text-green-200 text-sm">
            Contraseña actualizada. Redirigiendo a Iniciar sesión...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Nueva contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
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
      </div>
    </div>
  )
}
