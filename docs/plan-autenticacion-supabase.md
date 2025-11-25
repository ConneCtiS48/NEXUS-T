# Plan: Autenticación con Supabase y Sistema de Vistas

## Estado Actual
- No hay sistema de routing instalado
- App.jsx carga directamente Home sin verificar sesión
- No hay integración con Supabase
- No hay archivos de configuración de entorno (.env)
- .gitignore no incluye .env

## Objetivos
1. Crear sistema de autenticación con Supabase
2. Implementar vistas: Landing, SignUp, SignIn, Home (protegida)
3. Configurar variables de entorno
4. Implementar routing y protección de rutas

## Pasos de Implementación

### 1. Instalar Dependencias
- Instalar `@supabase/supabase-js` para el cliente de Supabase
- Instalar `react-router-dom` para el sistema de routing
- Verificar que las dependencias se instalen correctamente

### 2. Configurar Variables de Entorno
- Crear archivo `.env` en la raíz del proyecto (no se subirá al repo)
- Crear archivo `.env.example` con las variables necesarias como referencia
- Actualizar `.gitignore` para incluir `.env`
- Configurar Vite para leer variables de entorno (usar `import.meta.env`)

### 3. Configurar Cliente de Supabase
- Crear `src/lib/supabase.js` o `src/config/supabase.js` para inicializar el cliente
- Usar variables de entorno para URL y **publishable key** de Supabase
- Usar `createClient` de `@supabase/supabase-js` con la publishable key (formato `sb_publishable_...`)
- El cliente manejará automáticamente el header `apikey` para las nuevas API keys
- Exportar el cliente para uso en toda la aplicación
- **Importante**: Usar la publishable key (no la secret key) ya que es para frontend público

### 4. Crear Contexto de Autenticación
- Crear `src/contexts/AuthContext.jsx` para manejar el estado de autenticación
- Implementar funciones: signIn, signUp, signOut, getSession
- Proporcionar el contexto a toda la aplicación
- Manejar el estado de carga inicial de la sesión

### 5. Crear Componentes de Vistas
- **Landing.jsx**: Página inicial cuando no hay sesión (con enlaces a SignIn/SignUp)
- **SignIn.jsx**: Formulario de inicio de sesión con email/password
- **SignUp.jsx**: Formulario de registro con validación
- **Home.jsx**: Actualizar para que solo se muestre con sesión activa

### 6. Implementar Routing
- Configurar React Router en `App.jsx`
- Crear rutas protegidas y públicas
- Implementar componente `ProtectedRoute` para proteger Home
- Configurar redirecciones según el estado de autenticación

### 7. Actualizar App.jsx
- Envolver la aplicación con AuthContext.Provider
- Configurar BrowserRouter
- Implementar lógica de routing condicional basada en autenticación

### 8. Mejorar UX
- Agregar manejo de errores en formularios
- Agregar estados de carga
- Agregar mensajes de éxito/error
- Implementar redirecciones después de login/signup

## Archivos a Crear
- `Nexus-T/.env` (no se sube al repo)
- `Nexus-T/.env.example`
- `Nexus-T/src/lib/supabase.js` o `src/config/supabase.js`
- `Nexus-T/src/contexts/AuthContext.jsx`
- `Nexus-T/src/pages/Landing.jsx`
- `Nexus-T/src/pages/SignIn.jsx`
- `Nexus-T/src/pages/SignUp.jsx`
- `Nexus-T/src/components/ProtectedRoute.jsx` (opcional, puede ir en utils o contexts)

## Archivos a Modificar
- `Nexus-T/package.json` (agregar dependencias)
- `Nexus-T/.gitignore` (agregar .env)
- `Nexus-T/vite.config.js` (configurar variables de entorno si es necesario)
- `Nexus-T/src/App.jsx` (implementar routing y contexto)
- `Nexus-T/src/main.jsx` (posiblemente envolver con providers)
- `Nexus-T/src/pages/Home.jsx` (agregar lógica de sesión si es necesario)

## Variables de Entorno Necesarias
- `VITE_SUPABASE_URL`: URL del proyecto de Supabase (ej: `https://xxxxx.supabase.co`)
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Clave publicable de Supabase (formato `sb_publishable_...`)
  - **Nota**: Esta es la clave para uso en frontend público, segura para exponer en el cliente
  - Se encuentra en el dashboard de Supabase > Settings > API > Publishable key
  - **NO usar la secret key** (`sb_secret_...`) en el frontend, solo en backend

## Consideraciones Adicionales
- Manejar errores de red y conexión
- Implementar persistencia de sesión (Supabase lo maneja automáticamente)
- Considerar agregar un componente de loading durante la verificación inicial de sesión
- Validar formularios antes de enviar a Supabase
- Considerar agregar recuperación de contraseña en el futuro
- **Seguridad**: Aunque la publishable key se expone en el cliente, el acceso a datos está protegido por Row Level Security (RLS) en Supabase
- La publishable key reemplaza a la antigua `anon` key JWT, pero funciona de manera similar para autenticación de usuarios

