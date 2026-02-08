import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { config } from '../lib/config'

function parseHashParams() {
  const hash = window.location.hash?.slice(1) || ''
  const params = Object.fromEntries(new URLSearchParams(hash))
  return params
}

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)
  const [linkExpiredFromHash, setLinkExpiredFromHash] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const params = parseHashParams()
    const code = params.error_code || ''
    const desc = (params.error_description || '').toLowerCase()
    const isExpiredOrInvalid =
      code === 'otp_expired' ||
      desc.includes('expired') ||
      desc.includes('invalid')
    if (params.error && isExpiredOrInvalid) {
      setLinkExpiredFromHash(true)
      window.history.replaceState(null, '', location.pathname + location.search)
    }
  }, [location.pathname, location.search])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setEmailNotConfirmed(false)
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      const msg = error.message || ''
      const isEmailNotConfirmed =
        msg.toLowerCase().includes('confirm') || msg.toLowerCase().includes('verified')
      if (isEmailNotConfirmed) {
        setError(
          'Tu correo no está confirmado. Revisa tu bandeja o solicita un nuevo correo de confirmación.'
        )
        setEmailNotConfirmed(true)
      } else {
        setError(msg)
      }
      setLoading(false)
    } else {
      navigate('/home')
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Iniciar Sesión
        </h2>

        {linkExpiredFromHash && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-400 text-amber-800 rounded dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-200 text-sm">
            <p>El enlace de confirmación ha expirado o no es válido. Puedes solicitar un nuevo correo.</p>
            <p className="mt-2">
              <Link
                to="/resend-confirmation"
                className="text-blue-600 hover:text-blue-700 font-medium underline dark:text-blue-400"
              >
                Reenviar correo de confirmación
              </Link>
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900 dark:text-red-200 text-sm">
            <p>{error}</p>
            {emailNotConfirmed && (
              <p className="mt-2">
                <Link
                  to="/resend-confirmation"
                  state={{ email }}
                  className="text-blue-600 hover:text-blue-700 font-medium underline dark:text-blue-400"
                >
                  Reenviar correo de confirmación
                </Link>
              </p>
            )}
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

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <p className="text-center text-sm">
            <Link
              to="/forgot-password"
              className="text-blue-600 hover:text-blue-700 font-medium dark:text-blue-400"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {config.allowSignUp && (
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            ¿No tienes una cuenta?{' '}
            <Link
              to="/signup"
              className="text-blue-600 hover:text-blue-700 font-medium dark:text-blue-400"
            >
              Regístrate aquí
            </Link>
          </p>
        )}

        <p className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
          ¿No recibiste el correo de confirmación?{' '}
          <Link
            to="/resend-confirmation"
            state={email ? { email } : undefined}
            className="text-blue-600 hover:text-blue-700 font-medium dark:text-blue-400"
          >
            Reenviar correo
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

