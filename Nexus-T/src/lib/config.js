// Configuración de la aplicación
export const config = {
  // Permitir registro de nuevos usuarios
  // En POC, normalmente será false ya que los usuarios se crean directamente en la DB
  allowSignUp: import.meta.env.VITE_ALLOW_SIGNUP === 'true',
}





