# Configuración del Rol Admin

Este documento explica cómo configurar el rol "admin" y asignar permisos completos a un usuario administrador.

## Pasos para Configurar Admin

### 1. Ejecutar la Migración Principal

Ejecuta el archivo `migrations/20250206_admin_role_and_policies.sql` en el SQL Editor de Supabase.

Este script:
- ✅ Crea la función helper `is_admin()` para verificar si un usuario tiene rol admin
- ✅ Crea el rol "admin" en la tabla `roles` si no existe
- ✅ Habilita RLS en todas las tablas del sistema
- ✅ Crea políticas RLS que permiten acceso completo a usuarios con rol admin
- ✅ Mantiene políticas existentes para otros roles (docente, tutor, orientacion, etc.)

### 2. Asignar Rol Admin a un Usuario

Después de ejecutar la migración, asigna el rol admin a tu usuario:

#### Opción A: Por Email (Recomendado)

1. Abre el archivo `asignar_rol_admin.sql`
2. Descomenta la sección "OPCIÓN 1"
3. Reemplaza `'TU_EMAIL_AQUI@ejemplo.com'` con el email de tu cuenta
4. Ejecuta el script en el SQL Editor de Supabase

#### Opción B: Por User ID (UUID)

1. Primero encuentra el UUID de tu usuario ejecutando:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'tu-email@ejemplo.com';
   ```
2. Abre el archivo `asignar_rol_admin.sql`
3. Descomenta la sección "OPCIÓN 2"
4. Reemplaza `'TU_USER_ID_AQUI'` con el UUID obtenido
5. Ejecuta el script

### 3. Verificar la Configuración

Ejecuta esta consulta para verificar que tu usuario tiene el rol admin:

```sql
SELECT 
  u.email,
  up.first_name,
  up.last_name,
  r.name as role_name
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
INNER JOIN public.user_roles ur ON u.id = ur.user_id
INNER JOIN public.roles r ON ur.role_id = r.id
WHERE r.name = 'admin';
```

También puedes verificar desde la aplicación ejecutando:

```sql
SELECT public.is_admin();  -- Debe retornar true si estás autenticado como admin
```

## Permisos del Rol Admin

El rol admin tiene acceso completo (SELECT, INSERT, UPDATE, DELETE) a todas las tablas:

- ✅ `groups` - Gestión de grupos
- ✅ `students` - Gestión de estudiantes
- ✅ `group_members` - Gestión de miembros de grupos
- ✅ `subjects` - Gestión de asignaturas
- ✅ `teacher_groups` - Gestión de asignación docente-grupo
- ✅ `teacher_group_subjects` - Gestión de asignaturas por docente/grupo
- ✅ `incidents` - Gestión de incidentes
- ✅ `incident_types` - Gestión de tipos de incidentes
- ✅ `incident_observations` - Gestión de observaciones de incidentes
- ✅ `justifications` - Gestión de justificaciones
- ✅ `roles` - Gestión de roles
- ✅ `user_roles` - Gestión de asignación de roles a usuarios
- ✅ `user_profiles` - Gestión de perfiles de usuario

## Notas Importantes

1. **Seguridad**: Las políticas RLS se aplican automáticamente. Un usuario con rol admin puede hacer cualquier operación en todas las tablas.

2. **Función Helper**: La función `is_admin()` es segura y eficiente. Verifica el rol del usuario actual (`auth.uid()`) en cada consulta.

3. **Políticas Existentes**: Este script NO elimina políticas RLS existentes para otros roles. Las políticas de admin se agregan adicionalmente.

4. **Múltiples Roles**: Un usuario puede tener múltiples roles. Si tiene el rol "admin", tendrá acceso completo independientemente de otros roles.

5. **Primer Admin**: Si es la primera vez que configuras el sistema, asegúrate de crear un usuario en Supabase Auth primero, luego ejecuta la migración y finalmente asigna el rol admin.

## Solución de Problemas

### Error: "function is_admin() does not exist"
- Asegúrate de haber ejecutado la migración `20250206_admin_role_and_policies.sql` completa

### Error: "role admin does not exist"
- La migración debería crear el rol automáticamente. Si no existe, ejecuta:
  ```sql
  INSERT INTO public.roles (name, description)
  VALUES ('admin', 'Administrador del sistema con acceso completo')
  ON CONFLICT (name) DO NOTHING;
  ```

### No tengo permisos después de asignar el rol
- Verifica que el rol se asignó correctamente con la consulta de verificación
- Asegúrate de haber cerrado sesión y vuelto a iniciar sesión en la aplicación
- Verifica que las políticas RLS estén habilitadas en las tablas

### Ver todas las políticas RLS activas
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
