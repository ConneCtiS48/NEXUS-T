-- Script para asignar el rol "admin" a un usuario específico
-- Ejecutar en el SQL Editor de Supabase después de ejecutar la migración 20250206_admin_role_and_policies.sql
--
-- INSTRUCCIONES:
-- 1. Reemplaza 'TU_EMAIL_AQUI@ejemplo.com' con el email del usuario al que quieres dar rol admin
-- 2. O reemplaza 'TU_USER_ID_AQUI' con el UUID del usuario directamente
-- 3. Ejecuta este script

-- ========== OPCIÓN 1: Asignar rol admin por EMAIL ==========
-- Descomenta y modifica la siguiente sección:

/*
INSERT INTO public.user_roles (user_id, role_id)
SELECT 
  u.id,
  r.id
FROM auth.users u
CROSS JOIN public.roles r
WHERE u.email = 'TU_EMAIL_AQUI@ejemplo.com'  -- ⚠️ CAMBIA ESTE EMAIL
  AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
*/

-- ========== OPCIÓN 2: Asignar rol admin por USER_ID (UUID) ==========
-- Descomenta y modifica la siguiente sección:

/*
INSERT INTO public.user_roles (user_id, role_id)
SELECT 
  'TU_USER_ID_AQUI'::uuid,  -- ⚠️ CAMBIA ESTE UUID
  id
FROM public.roles
WHERE name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
*/

-- ========== VERIFICAR QUE SE ASIGNÓ CORRECTAMENTE ==========
-- Ejecuta esta consulta para verificar que el usuario tiene el rol admin:

/*
SELECT 
  u.email,
  u.id as user_id,
  up.first_name,
  up.last_name,
  r.name as role_name
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
INNER JOIN public.user_roles ur ON u.id = ur.user_id
INNER JOIN public.roles r ON ur.role_id = r.id
WHERE r.name = 'admin'
ORDER BY u.email;
*/

-- ========== ENCONTRAR EL USER_ID DE UN USUARIO POR EMAIL ==========
-- Si necesitas encontrar el UUID de un usuario:

/*
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'TU_EMAIL_AQUI@ejemplo.com';  -- ⚠️ CAMBIA ESTE EMAIL
*/
