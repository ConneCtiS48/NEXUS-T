import { supabase } from '../lib/supabase'

export const subjectsService = {
  /**
   * Obtener todas las asignaturas
   */
  async fetchAll() {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, subject_name, category_type, category_name')
      .order('subject_name')
    return { data, error }
  },

  /**
   * Obtener asignatura por ID
   */
  async fetchById(subjectId) {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, subject_name, category_type, category_name')
      .eq('id', subjectId)
      .single()
    return { data, error }
  },

  /**
   * Crear nueva asignatura
   */
  async createSubject(subjectData) {
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        subject_name: subjectData.subject_name,
        category_type: subjectData.category_type || null,
        category_name: subjectData.category_name || null,
      })
      .select('id, subject_name, category_type, category_name')
      .single()
    return { data, error }
  },

  /**
   * Actualizar asignatura
   */
  async updateSubject(subjectId, subjectData) {
    const { data, error } = await supabase
      .from('subjects')
      .update({
        subject_name: subjectData.subject_name,
        category_type: subjectData.category_type || null,
        category_name: subjectData.category_name || null,
      })
      .eq('id', subjectId)
      .select('id, subject_name, category_type, category_name')
      .single()
    return { data, error }
  },

  /**
   * Eliminar asignatura
   */
  async deleteSubject(subjectId) {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId)
    return { error }
  },

  /**
   * Obtener grupos donde está asignada la asignatura
   * Retorna información de teacher_group_subjects con datos de grupo y docente
   */
  async fetchSubjectGroups(subjectId) {
    // Query 1: Obtener asignaciones desde teacher_group_subjects
    const { data: assignments, error: assignError } = await supabase
      .from('teacher_group_subjects')
      .select('id, group_id, teacher_id, shift')
      .eq('subject_id', subjectId)

    if (assignError) {
      return { data: [], error: assignError }
    }

    if (!assignments || assignments.length === 0) {
      return { data: [], error: null }
    }

    // Query 2: Obtener información de grupos
    const groupIds = assignments.map((a) => a.group_id)
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, grade, specialty, section, nomenclature, shift')
      .in('id', groupIds)

    if (groupsError) {
      return { data: [], error: groupsError }
    }

    // Query 3: Obtener información de docentes
    const teacherIds = assignments.map((a) => a.teacher_id)
    const { data: teachers, error: teachersError } = await supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name, email')
      .in('user_id', teacherIds)

    if (teachersError) {
      return { data: [], error: teachersError }
    }

    // Combinar datos
    const groupsMap = new Map(groups.map((g) => [g.id, g]))
    const teachersMap = new Map(teachers.map((t) => [t.user_id, t]))

    const combined = assignments.map((assignment) => ({
      id: assignment.id,
      group: groupsMap.get(assignment.group_id) || null,
      teacher: teachersMap.get(assignment.teacher_id) || null,
      shift: assignment.shift,
    }))

    return { data: combined, error: null }
  },

  /**
   * Obtener todos los grupos disponibles
   */
  async fetchAllGroups() {
    const { data, error } = await supabase
      .from('groups')
      .select('id, grade, specialty, section, nomenclature, shift')
      .order('nomenclature')
    return { data: data || [], error }
  },

  /**
   * Obtener docentes de un grupo desde teacher_groups
   */
  async fetchGroupTeachers(groupId) {
    // Query 1: Obtener teacher_ids del grupo
    const { data: teacherGroups, error: tgError } = await supabase
      .from('teacher_groups')
      .select('teacher_id, is_tutor')
      .eq('group_id', groupId)

    if (tgError) {
      return { data: [], error: tgError }
    }

    if (!teacherGroups || teacherGroups.length === 0) {
      return { data: [], error: null }
    }

    const teacherIds = teacherGroups.map((tg) => tg.teacher_id)

    // Query 2: Obtener perfiles de docentes
    const { data: teachers, error: teachersError } = await supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name, email')
      .in('user_id', teacherIds)

    if (teachersError) {
      return { data: [], error: teachersError }
    }

    // Combinar con is_tutor
    const teachersMap = new Map(teacherGroups.map((tg) => [tg.teacher_id, tg.is_tutor]))
    const combined = teachers.map((t) => ({
      ...t,
      is_tutor: teachersMap.get(t.user_id) || false,
    }))

    return { data: combined, error: null }
  },

  /**
   * Asignar asignatura a grupo con docente
   */
  async assignSubjectToGroup(subjectId, groupId, teacherId, shift) {
    const { data, error } = await supabase
      .from('teacher_group_subjects')
      .insert({
        subject_id: subjectId,
        group_id: groupId,
        teacher_id: teacherId,
        shift: shift,
      })
      .select('id, subject_id, group_id, teacher_id, shift')
      .single()
    return { data, error }
  },

  /**
   * Remover asignatura de un grupo específico con docente específico
   */
  async removeSubjectFromGroup(assignmentId) {
    const { error } = await supabase
      .from('teacher_group_subjects')
      .delete()
      .eq('id', assignmentId)
    return { error }
  },

  /**
   * Actualizar docente de una asignación grupo-asignatura
   */
  async updateSubjectGroupTeacher(assignmentId, teacherId) {
    const { data, error } = await supabase
      .from('teacher_group_subjects')
      .update({ teacher_id: teacherId })
      .eq('id', assignmentId)
      .select('id, subject_id, group_id, teacher_id, shift')
      .single()
    return { data, error }
  },
}

