# Guía de Configuración de Supabase para Nexus-T

Esta guía te ayudará a conectar correctamente tu aplicación con Supabase y resolver problemas comunes.

## 📋 Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Configurar Variables de Entorno](#configurar-variables-de-entorno)
3. [Configurar Políticas RLS](#configurar-políticas-rls)
4. [Verificar Datos](#verificar-datos)
5. [Solución de Problemas](#solución-de-problemas)

---

## 🔧 Configuración Inicial

### Paso 1: Obtener Credenciales de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Settings** → **API**
3. Copia los siguientes valores:
   - **Project URL** (ejemplo: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (la clave pública, no la service_role key)

---

## 🔐 Configurar Variables de Entorno

### Paso 2: Crear archivo `.env`

1. En la raíz de tu proyecto, crea un archivo llamado `.env`
2. Agrega las siguientes variables:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ⚠️ Importante:

- **NO** uses comillas alrededor de los valores
- **NO** dejes espacios alrededor del signo `=`
- **NO** incluyas el archivo `.env` en Git (ya está en `.gitignore`)
- **SÍ** reinicia el servidor de desarrollo después de crear/editar `.env`

### Verificar que funciona:

1. Reinicia el servidor: `npm run dev`
2. Abre la consola del navegador (F12)
3. Deberías ver que la aplicación se carga sin errores de configuración

---

## 🛡️ Configurar Políticas RLS

### Paso 3: Ejecutar Políticas SQL

Las políticas RLS (Row Level Security) controlan quién puede ver y modificar datos.

1. En Supabase Dashboard, ve a **SQL Editor**
2. Abre el archivo `supabase-rls-policies.sql` que está en la raíz del proyecto
3. Copia todo el contenido del archivo
4. Pégalo en el SQL Editor de Supabase
5. Haz clic en **Run** para ejecutar todas las políticas

### ¿Qué hacen estas políticas?

- **Permiten a usuarios autenticados** ver y crear grupos, incidentes, etc.
- **Protegen los datos** permitiendo solo operaciones autorizadas
- **Son necesarias** para que la aplicación funcione correctamente

### Verificar que las políticas están activas:

1. En Supabase Dashboard, ve a **Authentication** → **Policies**
2. Selecciona la tabla `groups`
3. Deberías ver las políticas creadas

---

## 📊 Verificar Datos

### Paso 4: Crear Datos de Prueba

Si no tienes datos en tu base de datos, puedes crear algunos grupos de prueba:

1. Ve a **Table Editor** en Supabase Dashboard
2. Selecciona la tabla `groups`
3. Haz clic en **Insert row**
4. Crea un grupo de ejemplo:

```json
{
  "grade": "3",
  "specialty": "Informática",
  "section": "A",
  "nomenclature": "3A-INFO"
}
```

### Verificar que los datos se muestran:

1. Inicia sesión en tu aplicación
2. Ve a la página de **Orientación Educativa**
3. Deberías ver el grupo que creaste

---

## 🔍 Solución de Problemas

### Problema: "Missing Supabase environment variables"

**Solución:**
- Verifica que el archivo `.env` existe en la raíz del proyecto
- Verifica que las variables están escritas correctamente (sin comillas, sin espacios)
- Reinicia el servidor de desarrollo

### Problema: "Error de permisos" o "PGRST116"

**Solución:**
- Ejecuta el archivo `supabase-rls-policies.sql` en el SQL Editor de Supabase
- Verifica que RLS está habilitado en las tablas
- Asegúrate de estar autenticado en la aplicación

### Problema: "No aparecen los grupos"

**Solución:**
1. Verifica que existen datos en la tabla `groups`:
   - Ve a **Table Editor** → `groups`
   - Deberías ver al menos un registro

2. Verifica las políticas RLS:
   - Ve a **Authentication** → **Policies** → `groups`
   - Debería haber una política que permita SELECT a usuarios autenticados

3. Verifica la autenticación:
   - Abre la consola del navegador (F12)
   - Ejecuta: `localStorage.getItem('sb-...-auth-token')`
   - Deberías ver un token si estás autenticado

4. Revisa los errores en la consola:
   - Abre **Console** en las herramientas de desarrollador
   - Busca errores que empiecen con "❌"
   - Estos errores te darán más información sobre el problema

### Problema: "La tabla no existe" o "42P01"

**Solución:**
- Verifica que todas las tablas del esquema están creadas en Supabase
- Revisa el esquema SQL que proporcionaste al inicio
- Asegúrate de que los nombres de las tablas coinciden exactamente

### Problema: "Error de conexión"

**Solución:**
1. Verifica que la URL de Supabase es correcta
2. Verifica que la clave pública es la correcta (anon key, no service_role)
3. Verifica tu conexión a internet
4. Revisa si hay errores en la pestaña **Network** de las herramientas de desarrollador

---

## 🧪 Probar la Conexión

### Desde la Consola del Navegador:

Abre la consola (F12) y ejecuta:

```javascript
// Verificar configuración
console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Key:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? '✓ Configurado' : '✗ Faltante')

// Probar conexión
import { supabase } from './src/lib/supabase'
const { data, error } = await supabase.from('groups').select('*').limit(5)
console.log('Datos:', data)
console.log('Error:', error)
```

### Verificar Autenticación:

```javascript
const { data: { session } } = await supabase.auth.getSession()
console.log('Sesión activa:', session ? 'Sí' : 'No')
console.log('Usuario:', session?.user?.email)
```

---

## 📝 Checklist Final

Antes de considerar que todo está configurado, verifica:

- [ ] Archivo `.env` creado en la raíz del proyecto
- [ ] Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` configuradas
- [ ] Servidor de desarrollo reiniciado después de crear `.env`
- [ ] Políticas RLS ejecutadas en Supabase
- [ ] Al menos un grupo creado en la tabla `groups`
- [ ] Usuario autenticado en la aplicación
- [ ] Sin errores en la consola del navegador
- [ ] Los grupos se muestran en la página de Orientación Educativa

---

## 🆘 ¿Necesitas Más Ayuda?

Si después de seguir esta guía aún tienes problemas:

1. **Revisa la consola del navegador** - Los errores ahora son más descriptivos
2. **Revisa la pestaña Network** - Verifica las peticiones a Supabase
3. **Verifica el estado de Supabase** - Asegúrate de que tu proyecto esté activo
4. **Comparte los errores específicos** - Los mensajes de error mejorados te darán más información

---

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de RLS de Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [Documentación de Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)

