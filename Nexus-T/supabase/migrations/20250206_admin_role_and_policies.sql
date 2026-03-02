-- Migración: Configuración de rol admin y políticas RLS
-- Ejecutar en el SQL Editor de Supabase.
-- Este script configura el rol "admin" con permisos completos en todas las tablas del sistema.

-- ========== 1. CREAR FUNCIÓN HELPER PARA VERIFICAR ROL ADMIN ==========
-- Esta función verifica si el usuario actual tiene el rol "admin"

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    INNER JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Verifica si el usuario actual tiene el rol "admin"';

-- ========== 2. ASEGURAR QUE EL ROL ADMIN EXISTA ==========
-- Insertar el rol "admin" si no existe

INSERT INTO public.roles (name, description)
VALUES ('admin', 'Administrador del sistema con acceso completo')
ON CONFLICT (name) DO NOTHING;

-- ========== 3. HABILITAR RLS EN TODAS LAS TABLAS ==========
-- Asegurar que RLS esté habilitado en todas las tablas

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_group_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ========== 4. POLÍTICAS RLS PARA TABLA: groups ==========

-- Política: Admin puede hacer todo en groups
DROP POLICY IF EXISTS "Admin full access to groups" ON public.groups;
CREATE POLICY "Admin full access to groups"
  ON public.groups
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ========== 5. POLÍTICAS RLS PARA TABLA: students ==========

-- Política: Admin puede hacer todo en students
DROP POLICY IF EXISTS "Admin full access to students" ON public.students;
CREATE POLICY "Admin full access to students"
  ON public.students
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ========== 6. POLÍTICAS RLS PARA TABLA: group_members ==========

-- Política: Admin puede hacer todo en group_members
DROP POLICY IF EXISTS "Admin full access to group_members" ON public.group_members;
CREATE POLICY "Admin full access to group_members"
  ON public.group_members
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ========== 7. POLÍTICAS RLS PARA TABLA: subjects ==========

-- Política: Admin puede hacer todo en subjects
DROP POLICY IF EXISTS "Admin full access to subjects" ON public.subjects;
CREATE POLICY "Admin full access to subjects"
  ON public.subjects
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ========== 8. POLÍTICAS RLS PARA TABLA: teacher_groups ==========

-- Política: Admin puede hacer todo en teacher_groups
DROP POLICY IF EXISTS "Admin full access to teacher_groups" ON public.teacher_groups;
CREATE POLICY "Admin full access to teacher_groups"
  ON public.teacher_groups
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ========== 9. POLÍTICAS RLS PARA TABLA: teacher_group_subjects ==========

-- Política: Admin puede hacer todo en teacher_group_subjects
DROP POLICY IF EXISTS "Admin full access to teacher_group_subjects" ON public.teacher_group_subjects;
CREATE POLICY "Admin full access to teacher_group_subjects"
  ON public.teacher_group_subjects
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ========== 10. POLÍTICAS RLS PARA TABLA: incidents ==========

-- Política: Admin puede hacer todo en incidents
DROP POLICY IF EXISTS "Admin full access to incidents" ON public.incidents;
CREATE POLICY "Admin full access to incidents"
  ON public.incidents
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ========== 11. POLÍTICAS RLS PARA TABLA: incident_types ==========

-- Política: Admin puede hacer todo en incident_types
DROP POLICY IF EXISTS "Admin full access to incident_types" ON public.incident_types;
CREATE POLICY "Admin full access to incident_types"
  ON public.incident_types
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ========== 12. POLÍTICAS RLS PARA TABLA: incident_observations ==========

-- Política: Admin puede hacer todo en incident_observations
DROP POLICY IF EXISTS "Admin full access to incident_observations" ON public.incident_observations;
CREATE POLICY "Admin full access to incident_observations"
  ON public.incident_observations
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ========== 13. POLÍTICAS RLS PARA TABLA: justifications ==========

-- Política: Admin puede hacer todo en justifications
DROP POLICY IF EXISTS "Admin full access to justifications" ON public.justifications;
CREATE POLICY "Admin full access to justifications"
  ON public.justifications
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ========== 14. POLÍTICAS RLS PARA TABLA: roles ==========

-- Política: Admin puede hacer todo en roles
DROP POLICY IF EXISTS "Admin full access to roles" ON public.roles;
CREATE POLICY "Admin full access to roles"
  ON public.roles
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Política: Todos pueden leer roles (necesario para verificar roles)
DROP POLICY IF EXISTS "Anyone can read roles" ON public.roles;
CREATE POLICY "Anyone can read roles"
  ON public.roles
  FOR SELECT
  USING (true);

-- ========== 15. POLÍTICAS RLS PARA TABLA: user_roles ==========

-- Política: Admin puede hacer todo en user_roles
DROP POLICY IF EXISTS "Admin full access to user_roles" ON public.user_roles;
CREATE POLICY "Admin full access to user_roles"
  ON public.user_roles
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Política: Usuarios pueden leer sus propios roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- ========== 16. POLÍTICAS RLS PARA TABLA: user_profiles ==========

-- Política: Admin puede hacer todo en user_profiles
DROP POLICY IF EXISTS "Admin full access to user_profiles" ON public.user_profiles;
CREATE POLICY "Admin full access to user_profiles"
  ON public.user_profiles
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Política: Usuarios pueden leer su propio perfil
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuarios pueden actualizar su propio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ========== NOTAS IMPORTANTES ==========
-- 
-- 1. Para asignar el rol "admin" a un usuario específico, ejecuta:
-- 
--    INSERT INTO public.user_roles (user_id, role_id)
--    SELECT 
--      'TU_USER_ID_AQUI'::uuid,  -- Reemplaza con el UUID del usuario
--      id
--    FROM public.roles
--    WHERE name = 'admin'
--    ON CONFLICT DO NOTHING;
--
-- 2. Para encontrar el user_id de un usuario por email:
--
--    SELECT id FROM auth.users WHERE email = 'email@ejemplo.com';
--
-- 3. Para verificar que un usuario tiene el rol admin:
--
--    SELECT public.is_admin();  -- Retorna true si el usuario actual es admin
--
-- 4. Para ver todos los usuarios con rol admin:
--
--    SELECT 
--      u.email,
--      up.first_name,
--      up.last_name
--    FROM auth.users u
--    LEFT JOIN public.user_profiles up ON u.id = up.user_id
--    WHERE u.id IN (
--      SELECT ur.user_id
--      FROM public.user_roles ur
--      INNER JOIN public.roles r ON ur.role_id = r.id
--      WHERE r.name = 'admin'
--    );
