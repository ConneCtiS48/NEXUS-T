# Grupos

## ✅ COMPLETADO

~~Al administrar asignaturas es necesario seleccionar el docente que corresponde a ese grupo, ya que la tabla de teacher_group_subjects requiere del teacher_id.~~

**Implementado en:**
- `src/pages/admin/AdminGroups.jsx` - Modal de administrar asignaturas ahora incluye select de docente
- `src/hooks/useAdminGroups.js` - `updateGroupSubjects` acepta `subjectAssignments` con `teacherId`
- Por cada asignatura seleccionada se puede elegir el docente del grupo que la impartirá
- Validación: todas las asignaturas deben tener docente asignado
- El `shift` se toma automáticamente del grupo

**Fecha de completado:** Diciembre 2025
