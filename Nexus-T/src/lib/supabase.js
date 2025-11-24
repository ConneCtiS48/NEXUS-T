import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error de configuración de Supabase:')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Configurado' : '✗ Faltante')
  console.error('VITE_SUPABASE_PUBLISHABLE_KEY:', supabaseKey ? '✓ Configurado' : '✗ Faltante')
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Función de utilidad para logging de errores
export const logSupabaseError = (operation, error) => {
  console.error(`❌ Error en ${operation}:`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  })
}

// Función de utilidad para verificar conexión
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('groups').select('count').limit(1)
    if (error) {
      logSupabaseError('test connection', error)
      return { success: false, error }
    }
    return { success: true, data }
  } catch (err) {
    console.error('Error al probar conexión:', err)
    return { success: false, error: err }
  }
}

