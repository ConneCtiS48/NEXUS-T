# Queries para ejecutar en Supabase (SQL Editor)

Ejecuta **todo el bloque** en el orden indicado.

---

## 1. Tabla `justifications`

La tabla ya tiene `group_id`. Solo se agrega `created_by` y el índice por `group_id` si quieres optimizar consultas por grupo.

```sql
-- Justifications: created_by + índices
ALTER TABLE public.justifications
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.justifications.created_by IS 'Usuario que creó el justificante (docente u orientador). teacher_id es el tutor del grupo.';

CREATE INDEX IF NOT EXISTS idx_justifications_created_by ON public.justifications(created_by);
CREATE INDEX IF NOT EXISTS idx_justifications_group_id ON public.justifications(group_id);
```

---

## 2. Tabla `incidents`

Se agregan `created_by`, `teacher_id` y `group_id` para consultas directas por grupo y para que el docente/tutor vea los incidentes correctos.

```sql
-- Incidents: created_by, teacher_id, group_id + índices
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
```

---

## Uso en consultas

- **Justificantes por grupo:** `WHERE group_id = $groupId` y luego traer alumno con `student_id`.
- **Incidentes por grupo:** `WHERE group_id = $groupId` (y opcionalmente `created_by = $userId OR teacher_id = $userId` para docente) y luego traer alumno con `student_id`.

Ambas tablas quedan con `group_id` para filtrar por grupo y `student_id` para obtener los datos del alumno.
