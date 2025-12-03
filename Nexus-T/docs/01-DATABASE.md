# Base de Datos y Acceso a Datos

## Stack de Base de Datos

- **Supabase** (PostgreSQL)
- **Cliente**: `@supabase/supabase-js`
- **Autenticación**: Supabase Auth

## Estructura de la Base de Datos

### Tablas Principales

#### Usuarios y Roles
- `auth.users` - Usuarios autenticados (Supabase Auth)
- `user_profiles` - Perfiles de usuarios con información personal
- `roles` - Roles del sistema (admin, docente, tutor, orientacion)
- `user_roles` - Relación usuarios-roles (muchos a muchos)

#### Grupos y Estudiantes
- `groups` - Grupos escolares (grado, especialidad, nomenclatura, sección)
- `students` - Estudiantes (NO tienen acceso al sistema, solo registros)
- `group_members` - Relación grupos-estudiantes (incluye `is_group_leader`)

#### Docentes y Asignaturas
- `subjects` - Asignaturas del sistema
- `teacher_groups` - Relación docentes-grupos (incluye `is_tutor`)
- `teacher_group_subjects` - Asignaturas asignadas a docentes en grupos específicos (requiere `teacher_id`, `group_id`, `subject_id`, `shift`)

#### Incidentes
- `incident_types` - Tipos de incidentes
- `incidents` - Registro de incidentes
- `incident_observations` - Observaciones sobre incidentes
- `justifications` - Justificaciones de alumnos

## Configuración de Supabase

### Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_anon_key_aqui
```

**Importante:**
- NO usar comillas
- NO subir a Git (ya está en `.gitignore`)
- Reiniciar servidor después de crear/editar

### Cliente de Supabase

Ubicación: `src/lib/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

## Patrón de Acceso a Datos

### 1. Services (Capa de Datos)

**Ubicación:** `src/services/`

**Patrón:**
```javascript
export const entityService = {
  // Retorna siempre { data, error }
  async fetchAll() {
    const { data, error } = await supabase
      .from('tabla')
      .select('*')
      .order('campo')
    return { data, error }
  },

  async create(entityData) {
    const { data, error } = await supabase
      .from('tabla')
      .insert(entityData)
      .select()
      .single()
    return { data, error }
  },

  async update(id, entityData) {
    const { data, error } = await supabase
      .from('tabla')
      .update(entityData)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async delete(id) {
    const { error } = await supabase
      .from('tabla')
      .delete()
      .eq('id', id)
    return { error }
  },
}
```

**Ejemplo:** `src/services/groupsService.js`

### 2. Hooks (Lógica de Negocio)

**Ubicación:** `src/hooks/`

**Patrón:**
```javascript
export function useAdminEntity() {
  // Estados de datos
  const [entities, setEntities] = useState([])
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cargar datos
  const fetchEntities = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: err } = await entityService.fetchAll()
      if (err) {
        setError('No se pudieron cargar...')
        setEntities([])
      } else {
        setEntities(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Error...')
    } finally {
      setLoading(false)
    }
  }, [])

  // CRUD operations
  const createEntity = useCallback(async (data) => {
    try {
      const result = await entityService.create(data)
      if (result.error) {
        return { success: false, error: result.error }
      }
      await fetchEntities()
      return { success: true, data: result.data }
    } catch (err) {
      return { success: false, error: err }
    }
  }, [fetchEntities])

  return {
    entities,
    selectedEntity,
    loading,
    error,
    fetchEntities,
    createEntity,
    // ... más funciones
  }
}
```

**Ejemplo:** `src/hooks/useAdminGroups.js`

### 3. Componentes (UI)

**Ubicación:** `src/pages/`

```javascript
export default function AdminEntity() {
  // Hook con lógica de datos
  const {
    entities,
    loading,
    error,
    createEntity,
  } = useAdminEntity()

  // Estados locales de UI
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const handleCreate = async (formData) => {
    setSubmitting(true)
    const result = await createEntity(formData)
    
    if (result.success) {
      setSuccessMessage('Creado correctamente')
    } else {
      setErrorMessage(result.error?.message)
    }
    setSubmitting(false)
  }

  // ... render
}
```

## Relaciones Importantes

### Docentes y Grupos

1. **teacher_groups**: Relación básica docente-grupo
   - `is_tutor`: indica si es tutor del grupo
   - Un grupo puede tener múltiples docentes
   - Solo un docente puede ser tutor (`is_tutor = true`)

2. **teacher_group_subjects**: Asignaturas que imparte un docente en un grupo
   - Requiere: `teacher_id`, `group_id`, `subject_id`, `shift`
   - `shift`: 'M' (Matutino) o 'V' (Vespertino)

### Estudiantes y Grupos

1. **students**: Tabla de estudiantes (NO user_profiles)
   - No tienen acceso al sistema
   - Solo registros con datos personales

2. **group_members**: Relación estudiantes-grupos
   - `is_group_leader`: indica si es jefe de grupo
   - Solo un estudiante puede ser jefe por grupo

## RLS (Row Level Security)

Supabase usa políticas RLS para controlar acceso a datos.

**Ver:** `docs/SUPABASE_SETUP.md` para configuración de políticas.

## Buenas Prácticas

1. **Siempre usar services** para acceso a Supabase
2. **Manejar errores** en cada llamada
3. **Retornar `{ data, error }`** desde services
4. **Usar hooks** para lógica de negocio reutilizable
5. **Estados de loading y error** en componentes
6. **Validar datos** antes de enviar a Supabase
7. **Usar transacciones** cuando sea necesario (múltiples operaciones relacionadas)

## Ejemplo Completo

Ver implementación en:
- Service: `src/services/groupsService.js`
- Hook: `src/hooks/useAdminGroups.js`
- UI: `src/pages/admin/AdminGroups.jsx`

