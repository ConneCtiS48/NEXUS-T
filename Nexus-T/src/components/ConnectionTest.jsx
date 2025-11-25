import { useState, useEffect, useCallback } from 'react'
import { supabase, testSupabaseConnection } from '../lib/supabase'

export default function ConnectionTest() {
  const [connectionStatus, setConnectionStatus] = useState('Verificando...')
  const [connectionDetails, setConnectionDetails] = useState(null)
  const [sessionInfo, setSessionInfo] = useState(null)
  const [tableTest, setTableTest] = useState(null)

  const checkConnection = useCallback(async () => {
    // Verificar variables de entorno
    const envUrl = import.meta.env.VITE_SUPABASE_URL
    const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

    const envStatus = {
      url: envUrl ? '✓ Configurado' : '✗ Faltante',
      key: envKey ? '✓ Configurado' : '✗ Faltante',
      urlValue: envUrl ? `${envUrl.substring(0, 20)}...` : 'No configurado',
      keyValue: envKey ? `${envKey.substring(0, 20)}...` : 'No configurado',
    }

    setConnectionDetails(envStatus)

    if (!envUrl || !envKey) {
      setConnectionStatus('❌ Error: Variables de entorno faltantes')
      return
    }

    // Probar conexión con Supabase
    try {
      const result = await testSupabaseConnection()
      if (result.success) {
        setConnectionStatus('✅ Conexión exitosa')
      } else {
        setConnectionStatus(`❌ Error de conexión: ${result.error?.message || 'Error desconocido'}`)
      }
    } catch (error) {
      setConnectionStatus(`❌ Error: ${error.message}`)
    }

    // Verificar sesión
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()
      if (error) {
        setSessionInfo({ error: error.message })
      } else {
        setSessionInfo({
          active: session ? 'Sí' : 'No',
          user: session?.user?.email || 'No hay usuario',
          userId: session?.user?.id || 'N/A',
        })
      }
    } catch (error) {
      setSessionInfo({ error: error.message })
    }

    // Probar acceso a tabla groups
    try {
      const { data, error } = await supabase.from('groups').select('*').limit(1)
      if (error) {
        setTableTest({
          success: false,
          error: error.message,
          code: error.code,
          hint: error.hint,
        })
      } else {
        setTableTest({
          success: true,
          count: data?.length || 0,
          message: 'Acceso a tabla groups exitoso',
        })
      }
    } catch (error) {
      setTableTest({
        success: false,
        error: error.message,
      })
    }
  }, [])

  useEffect(() => {
    // Llamar checkConnection de forma asíncrona para evitar cascading renders
    const timer = setTimeout(() => {
      checkConnection()
    }, 0)
    return () => clearTimeout(timer)
  }, [checkConnection])

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Diagnóstico de Conexión con Supabase
      </h2>

      <div className="space-y-6">
        {/* Estado de conexión */}
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Estado de Conexión:</h3>
          <p className="text-lg">{connectionStatus}</p>
        </div>

        {/* Variables de entorno */}
        {connectionDetails && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">
              Variables de Entorno:
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">VITE_SUPABASE_URL:</span>{' '}
                <span className={connectionDetails.url.includes('✓') ? 'text-green-600' : 'text-red-600'}>
                  {connectionDetails.url}
                </span>
                {connectionDetails.urlValue && (
                  <span className="text-gray-500 ml-2">({connectionDetails.urlValue})</span>
                )}
              </div>
              <div>
                <span className="font-medium">VITE_SUPABASE_PUBLISHABLE_KEY:</span>{' '}
                <span className={connectionDetails.key.includes('✓') ? 'text-green-600' : 'text-red-600'}>
                  {connectionDetails.key}
                </span>
                {connectionDetails.keyValue && (
                  <span className="text-gray-500 ml-2">({connectionDetails.keyValue})</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Información de sesión */}
        {sessionInfo && (
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Sesión de Usuario:</h3>
            {sessionInfo.error ? (
              <p className="text-red-600">Error: {sessionInfo.error}</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Sesión activa:</span> {sessionInfo.active}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {sessionInfo.user}
                </div>
                <div>
                  <span className="font-medium">User ID:</span> {sessionInfo.userId}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prueba de tabla */}
        {tableTest && (
          <div
            className={`p-4 rounded-lg ${
              tableTest.success
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
            }`}
          >
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">
              Prueba de Acceso a Tabla 'groups':
            </h3>
            {tableTest.success ? (
              <div className="text-sm space-y-1">
                <p className="text-green-600 dark:text-green-400">✅ {tableTest.message}</p>
                <p>Registros encontrados: {tableTest.count}</p>
              </div>
            ) : (
              <div className="text-sm space-y-1">
                <p className="text-red-600 dark:text-red-400">❌ Error: {tableTest.error}</p>
                {tableTest.code && <p>Código: {tableTest.code}</p>}
                {tableTest.hint && <p>Hint: {tableTest.hint}</p>}
              </div>
            )}
          </div>
        )}

        {/* Botón para volver a verificar */}
        <button
          onClick={checkConnection}
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-colors"
        >
          Verificar Conexión Nuevamente
        </button>
      </div>
    </div>
  )
}

