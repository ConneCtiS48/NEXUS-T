# Schema de Base de Datos - Supabase

Este archivo documenta todas las tablas del sistema, sus relaciones y las políticas RLS (Row Level Security) aplicadas.

## Tablas Existentes

### 1. roles
**Descripción:** Tabla que almacena los diferentes roles del sistema.

**Columnas:**
- `id` (UUID, PK)
- `name` (TEXT, UNIQUE) - Valores permitidos: 'docente', 'tutor', 'orientador', 'jefe_grupo'
- `description` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Relaciones:**
- One-to-Many con `user_roles`

**Policies RLS:**
- Lectura: Público (todos pueden leer)
- Escritura/Modificación: Solo usuarios con rol 'orientador'

---

### 2. user_roles
**Descripción:** Relación many-to-many entre usuarios (auth.users) y roles.

**Columnas:**
- `id` (UUID, PK)
- `user_id` (UUID, FK -> auth.users) - ON DELETE CASCADE
- `role_id` (UUID, FK -> roles) - ON DELETE CASCADE
- `created_at` (TIMESTAMPTZ)
- Constraint UNIQUE(user_id, role_id)

**Relaciones:**
- Many-to-One con `auth.users`
- Many-to-One con `roles`

**Policies RLS:**
- Lectura: Usuarios pueden ver sus propios roles. Orientadores pueden ver todos.
- Escritura/Modificación: Solo usuarios con rol 'orientador'

---

### 3. user_profiles
**Descripción:** Información adicional de los usuarios del sistema. El tipo de usuario se determina por los roles asignados en `user_roles`.

**Columnas:**
- `id` (UUID, PK)
- `user_id` (UUID, FK -> auth.users, UNIQUE) - ON DELETE CASCADE
- `first_name` (TEXT)
- `last_name` (TEXT)
- `email` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Relaciones:**
- One-to-One con `auth.users`

**Policies RLS:**
- Lectura: Usuarios pueden ver su propio perfil. Orientadores pueden ver todos. Docentes/Tutores pueden ver perfiles de usuarios que no tienen roles de docente/tutor/orientador (principalmente alumnos y jefes de grupo).
- Escritura: Usuarios pueden actualizar su propio perfil. Orientadores pueden modificar todos.

---

## Tablas Futuras

> Usa esta sección para documentar nuevas tablas que vayas agregando al sistema.

### [Nombre de la tabla]
**Descripción:** [Descripción breve]

**Columnas:**
- `columna1` (tipo) - [descripción]
- `columna2` (tipo, FK -> tabla_relacionada) - [descripción]
- ...

**Relaciones:**
- [Tipo de relación] con [tabla relacionada] - [descripción de la relación]
- ...

**Policies RLS:**
- Lectura: [Descripción de quién puede leer]
- Escritura: [Descripción de quién puede escribir]
- Modificación: [Descripción de quién puede modificar]
- Eliminación: [Descripción de quién puede eliminar]

---

## Funciones Auxiliares

### get_user_roles(user_uuid UUID)
Retorna todos los roles de un usuario específico.

**Retorna:** TABLE(role_name TEXT)

---

### user_has_role(user_uuid UUID, role_name TEXT)
Verifica si un usuario tiene un rol específico.

**Retorna:** BOOLEAN

---

## Triggers

### handle_new_user()
Se ejecuta automáticamente cuando se crea un nuevo usuario en `auth.users`. Crea automáticamente un perfil en `user_profiles` con el email del usuario.

---

### handle_updated_at()
Trigger genérico para actualizar automáticamente el campo `updated_at` cuando se modifica un registro.

**Aplicado en:**
- `roles`
- `user_profiles`

---

## Notas Generales

- Todas las tablas tienen RLS habilitado
- Los roles se asignan mediante la tabla `user_roles` (un usuario puede tener múltiples roles)
- El tipo de usuario se determina consultando los roles asignados, no hay campo `tipo_usuario` en `user_profiles`
- Un Docente puede ser también Tutor
- El rol 'orientador' tiene permisos de administrador completo
- El rol 'jefe_grupo' es para alumnos que fungen como jefes de grupo

---

## Cambios Pendientes

> Lista aquí los cambios o mejoras planeadas para el schema:

- [ ] [Descripción del cambio pendiente]

