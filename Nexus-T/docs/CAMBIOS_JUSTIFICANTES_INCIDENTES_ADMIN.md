# Cambios por nuevos campos (justifications / incidents) – Admin y resto de la app

## Resumen de campos nuevos

| Tabla           | Campos nuevos   | Uso |
|-----------------|-----------------|-----|
| **justifications** | `created_by` | Quién creó el justificante (docente u orientador). |
| **incidents**      | `created_by`, `teacher_id`, `group_id` | Creador, tutor del grupo, y grupo del alumno para consultas directas. |

---

## 1. Admin

### AdminDashboard
- **Consultas actuales:** Solo hace `select('id', { count })` y filtros por `created_at` e `incident_type_id` en la tabla `incidents`. No usa `justifications`.
- **Cambios necesarios:** **Ninguno.** Las consultas siguen siendo válidas con las columnas nuevas (las columnas adicionales no afectan los counts).
- **Opcional (futuro):** Si se quieren estadísticas por grupo o por creador, se podrían añadir consultas que incluyan `group_id` o `created_by`.

### Resto de páginas admin (AdminStudents, AdminGroups, AdminUsers, AdminRoles, AdminSubjects)
- **Crear/editar justificantes o incidentes:** No existe en el admin; no hay CRUD de justificantes ni de incidentes en ninguna página admin.
- **Cambios necesarios:** **Ninguno** por los nuevos campos.
- **Si en el futuro se agrega CRUD en admin:**
  - Al **crear** un justificante: rellenar `created_by` con el usuario que hace la acción (ej. `user.id`).
  - Al **crear** un incidente: rellenar `created_by`, `teacher_id` (tutor del grupo del alumno) y `group_id` (grupo del alumno), igual que en OrientacionIncidentes/DocenteGrupo.

---

## 2. Crear registros (ya implementado)

| Dónde | Justificantes | Incidentes |
|-------|----------------|------------|
| **justificantes/Justificantes.jsx** (orientación) | `created_by: user.id` | — |
| **orientador/OrientacionIncidentes.jsx** | — | `created_by`, `teacher_id`, `group_id` (desde group_members + teacher_groups) |
| **DocenteGrupo.jsx** | — | `created_by`, `teacher_id`, `group_id` |

No hay creación de justificantes ni incidentes en el admin.

---

## 3. Actualizar registros

### Justificantes (Justificantes.jsx)
- El **update** solo modifica `student_id`, `group_id`, `teacher_id`, `reason`, `updated_at`. No toca `created_by` (auditoría).
- **Cambios necesarios:** **Ninguno.**

### Incidentes (OrientacionIncidentes.jsx)
- El **update** actualmente no envía `group_id` ni `teacher_id`. Si en la UI no se cambia el alumno, los valores en BD no se borran (el UPDATE solo setea los campos que envías).
- **Recomendación:** Al actualizar un incidente, recalcular y enviar `group_id` y `teacher_id` a partir del `student_id` del registro, para mantener coherencia (por ejemplo si se cambió el alumno en BD manualmente o en una futura UI). Implementado en este cambio.

---

## 4. Consultas que leen justificantes o incidentes

| Archivo | Qué hace | Cambios |
|---------|----------|---------|
| **AdminDashboard.jsx** | Counts y agregados de `incidents` | Ninguno. |
| **orientador/OrientacionAlumnos.jsx** | Carga incidentes y justificantes por alumno (`student_id`). Incidents usa relación `teacher_subject`. | Opcional: si la BD tiene `group_id` en incidents, se puede usar `group:groups(...)` en lugar de `teacher_subject` para alinear con el nuevo esquema. Justificantes ya usa `group:groups`. |
| **docente/Incidencias.jsx** | Filtra por `student_id` y `(created_by \|\| teacher_id)` | Ya alineado. |
| **docente/Justificantes** (wrapper + Justificantes.jsx) | Filtra por `studentIdsFilter`; consulta trae `student`, `group` | Ya alineado. |
| **justificantes/Justificantes.jsx** | Select con `student`, `group`; ya incluye `control_number` en student | Ninguno. |
| **orientador/OrientacionIncidentes.jsx** | Select completo de incidents con student, types, observations | Ninguno obligatorio; opcional incluir `group_id`, `created_by`, `teacher_id` en el select si se quieren mostrar. |
| **DocenteGrupo.jsx** (justificantes por grupo) | Select justifications por `group_id` | Ninguno. |

---

## 5. Resumen de acciones realizadas en código

1. **OrientacionIncidentes – update de incidente:** Al guardar cambios en un incidente existente, se calculan de nuevo `group_id` y `teacher_id` a partir del `student_id` del registro y se envían en el `update`, para que queden sincronizados con las tablas de referencia (`group_members`, `teacher_groups`).

Ningún otro cambio de código fue necesario en admin ni en el resto de la app para los nuevos campos; el admin no crea ni edita justificantes ni incidentes.
