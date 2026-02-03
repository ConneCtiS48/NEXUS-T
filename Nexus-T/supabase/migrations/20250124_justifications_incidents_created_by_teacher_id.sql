-- Migración: justifications (created_by); incidents (created_by, teacher_id, group_id)
-- Ejecutar en el SQL Editor de Supabase.

-- ========== TABLA justifications ==========
-- Ya tiene group_id. Se agrega created_by para saber quién creó el justificante (docente u orientador).
ALTER TABLE public.justifications
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.justifications.created_by IS 'Usuario que creó el justificante (docente u orientador). teacher_id es el tutor del grupo.';

CREATE INDEX IF NOT EXISTS idx_justifications_created_by ON public.justifications(created_by);
CREATE INDEX IF NOT EXISTS idx_justifications_group_id ON public.justifications(group_id);

-- ========== TABLA incidents ==========
-- Se agregan created_by, teacher_id y group_id para consultas directas por grupo y visibilidad docente/tutor.
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id);

COMMENT ON COLUMN public.incidents.created_by IS 'Usuario que creó el incidente (ej. docente u orientador).';
COMMENT ON COLUMN public.incidents.teacher_id IS 'Tutor del grupo del alumno; permite que el tutor vea el incidente.';
COMMENT ON COLUMN public.incidents.group_id IS 'Grupo del alumno; permite filtrar incidentes por grupo.';

CREATE INDEX IF NOT EXISTS idx_incidents_created_by ON public.incidents(created_by);
CREATE INDEX IF NOT EXISTS idx_incidents_teacher_id ON public.incidents(teacher_id);
CREATE INDEX IF NOT EXISTS idx_incidents_group_id ON public.incidents(group_id);
