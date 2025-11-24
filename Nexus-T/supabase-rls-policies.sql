-- ============================================
-- POLÍTICAS RLS PARA NEXUS-T
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- para configurar las políticas de seguridad necesarias
-- ============================================

-- Habilitar RLS en todas las tablas necesarias
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA TABLA: groups
-- ============================================

-- Permitir a usuarios autenticados ver todos los grupos
CREATE POLICY "Allow authenticated users to view groups"
ON public.groups
FOR SELECT
TO authenticated
USING (true);

-- Permitir a usuarios autenticados crear grupos (para Orientación Educativa)
CREATE POLICY "Allow authenticated users to insert groups"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir a usuarios autenticados actualizar grupos
CREATE POLICY "Allow authenticated users to update groups"
ON public.groups
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- POLÍTICAS PARA TABLA: user_profiles
-- ============================================

-- Permitir a usuarios autenticados ver perfiles
CREATE POLICY "Allow authenticated users to view user_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);

-- Permitir a usuarios autenticados crear/actualizar perfiles
CREATE POLICY "Allow authenticated users to manage user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Permitir a usuarios ver su propio perfil
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS PARA TABLA: group_members
-- ============================================

-- Permitir a usuarios autenticados ver miembros de grupos
CREATE POLICY "Allow authenticated users to view group_members"
ON public.group_members
FOR SELECT
TO authenticated
USING (true);

-- Permitir a usuarios autenticados agregar miembros a grupos
CREATE POLICY "Allow authenticated users to insert group_members"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir a usuarios autenticados actualizar miembros
CREATE POLICY "Allow authenticated users to update group_members"
ON public.group_members
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- POLÍTICAS PARA TABLA: teacher_subjects
-- ============================================

-- Permitir a usuarios autenticados ver materias de docentes
CREATE POLICY "Allow authenticated users to view teacher_subjects"
ON public.teacher_subjects
FOR SELECT
TO authenticated
USING (true);

-- Permitir a usuarios autenticados crear materias
CREATE POLICY "Allow authenticated users to insert teacher_subjects"
ON public.teacher_subjects
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir a usuarios autenticados actualizar materias
CREATE POLICY "Allow authenticated users to update teacher_subjects"
ON public.teacher_subjects
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Permitir a docentes ver solo sus propias materias
CREATE POLICY "Teachers can view own subjects"
ON public.teacher_subjects
FOR SELECT
TO authenticated
USING (auth.uid() = teacher_id);

-- ============================================
-- POLÍTICAS PARA TABLA: incidents
-- ============================================

-- Permitir a usuarios autenticados ver incidentes
CREATE POLICY "Allow authenticated users to view incidents"
ON public.incidents
FOR SELECT
TO authenticated
USING (true);

-- Permitir a usuarios autenticados crear incidentes
CREATE POLICY "Allow authenticated users to insert incidents"
ON public.incidents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir a usuarios autenticados actualizar incidentes
CREATE POLICY "Allow authenticated users to update incidents"
ON public.incidents
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- POLÍTICAS PARA TABLA: incident_observations
-- ============================================

-- Permitir a usuarios autenticados ver observaciones
CREATE POLICY "Allow authenticated users to view incident_observations"
ON public.incident_observations
FOR SELECT
TO authenticated
USING (true);

-- Permitir a usuarios autenticados crear observaciones
CREATE POLICY "Allow authenticated users to insert incident_observations"
ON public.incident_observations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir a usuarios autenticados actualizar observaciones
CREATE POLICY "Allow authenticated users to update incident_observations"
ON public.incident_observations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- POLÍTICAS PARA TABLA: incident_types
-- ============================================

-- Permitir a usuarios autenticados ver tipos de incidentes
CREATE POLICY "Allow authenticated users to view incident_types"
ON public.incident_types
FOR SELECT
TO authenticated
USING (true);

-- Permitir a usuarios autenticados crear tipos de incidentes (solo Orientación)
CREATE POLICY "Allow authenticated users to insert incident_types"
ON public.incident_types
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- POLÍTICAS PARA TABLA: justifications
-- ============================================

-- Permitir a usuarios autenticados ver justificantes
CREATE POLICY "Allow authenticated users to view justifications"
ON public.justifications
FOR SELECT
TO authenticated
USING (true);

-- Permitir a usuarios autenticados crear justificantes
CREATE POLICY "Allow authenticated users to insert justifications"
ON public.justifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir a usuarios autenticados actualizar justificantes
CREATE POLICY "Allow authenticated users to update justifications"
ON public.justifications
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- POLÍTICAS PARA TABLA: roles
-- ============================================

-- Permitir a usuarios autenticados ver roles
CREATE POLICY "Allow authenticated users to view roles"
ON public.roles
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- POLÍTICAS PARA TABLA: user_roles
-- ============================================

-- Permitir a usuarios autenticados ver roles de usuarios
CREATE POLICY "Allow authenticated users to view user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Permitir a usuarios autenticados asignar roles
CREATE POLICY "Allow authenticated users to insert user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Estas políticas permiten acceso amplio a usuarios autenticados
-- 2. Para producción, considera restringir más según roles específicos
-- 3. Puedes crear políticas más granulares usando funciones personalizadas
-- 4. Revisa y ajusta según las necesidades de seguridad de tu institución
-- ============================================

