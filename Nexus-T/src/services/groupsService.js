import { supabase } from '../lib/supabase'

export const groupsService = {
  /**
   * Obtener todos los grupos
   * Solo consulta la tabla groups (sin tutor_id)
   */
  async fetchAll() {
    const { data, error } = await supabase
      .from('groups')
      .select('id, grade, specialty, section, nomenclature')
      .order('nomenclature')
    return { data, error }
  },

  /**
   * Obtener grupo por ID
   */
  async fetchById(groupId) {
    const { data, error } = await supabase
      .from('groups')
      .select('id, grade, specialty, section, nomenclature')
      .eq('id', groupId)
      .single()
    return { data, error }
  },

  /**
   * Obtener docentes asignados al grupo desde teacher_groups
   * Retorna array con { id, teacher_id, is_tutor }
   */
  async fetchTeachers(groupId) {
    const { data, error } = await supabase
      .from('teacher_groups')
      .select('id, teacher_id, is_tutor')
      .eq('group_id', groupId)
    return { data, error }
  },

  /**
   * Obtener perfiles de docentes desde user_profiles
   * Combina con datos de teacher_groups para incluir is_tutor
   */
  async fetchTeacherProfiles(teacherGroupsData) {
    if (!teacherGroupsData || teacherGroupsData.length === 0) {
      return { data: [], error: null }
    }

    const teacherIds = teacherGroupsData.map((tg) => tg.teacher_id)
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, user_id, first_name, last_name, email')
      .in('user_id', teacherIds)

    if (error) {
      return { data: [], error }
    }

    // Combinar datos de user_profiles con is_tutor de teacher_groups
    const teachersMap = new Map()
    teacherGroupsData.forEach((tg) => {
      teachersMap.set(tg.teacher_id, { is_tutor: tg.is_tutor, teacher_group_id: tg.id })
    })

    const combined = (data || []).map((profile) => {
      const teacherGroup = teachersMap.get(profile.user_id)
      return {
        ...profile,
        is_tutor: teacherGroup?.is_tutor || false,
        teacher_group_id: teacherGroup?.teacher_group_id,
      }
    })

    return { data: combined, error: null }
  },

  /**
   * Obtener miembros del grupo desde group_members
   * Retorna array con { id, is_group_leader, student_id }
   */
  async fetchMembers(groupId) {
    const { data, error } = await supabase
      .from('group_members')
      .select('id, is_group_leader, student_id')
      .eq('group_id', groupId)
      .order('is_group_leader', { ascending: false })
    return { data, error }
  },

  /**
   * Obtener perfiles de estudiantes desde students
   * Combina con datos de group_members para incluir is_group_leader
   */
  async fetchStudentProfiles(groupMembersData) {
    if (!groupMembersData || groupMembersData.length === 0) {
      return { data: [], error: null }
    }

    const studentIds = groupMembersData.map((gm) => gm.student_id)
    
    const { data, error } = await supabase
      .from('students')
      .select('id, control_number, first_name, paternal_last_name, maternal_last_name, email')
      .in('id', studentIds)

    if (error) {
      return { data: [], error }
    }

    // Combinar datos de students con is_group_leader de group_members
    const membersMap = new Map()
    groupMembersData.forEach((gm) => {
      membersMap.set(gm.student_id, { is_group_leader: gm.is_group_leader, group_member_id: gm.id })
    })

    const combined = (data || []).map((student) => {
      const member = membersMap.get(student.id)
      return {
        ...student,
        is_group_leader: member?.is_group_leader || false,
        group_member_id: member?.group_member_id,
      }
    })

    return { data: combined, error: null }
  },

  /**
   * Obtener IDs únicos de asignaturas desde teacher_group_subjects
   * Retorna array de subject_id únicos
   */
  async fetchSubjectIds(groupId) {
    const { data, error } = await supabase
      .from('teacher_group_subjects')
      .select('subject_id')
      .eq('group_id', groupId)

    if (error) {
      return { data: [], error }
    }

    // Obtener subject_ids únicos
    const uniqueSubjectIds = [...new Set((data || []).map((item) => item.subject_id))]
    return { data: uniqueSubjectIds, error: null }
  },

  /**
   * Obtener información completa de asignaturas desde subjects
   */
  async fetchSubjectDetails(subjectIds) {
    if (!subjectIds || subjectIds.length === 0) {
      return { data: [], error: null }
    }

    const { data, error } = await supabase
      .from('subjects')
      .select('id, subject_name, category_type, category_name')
      .in('id', subjectIds)
      .order('subject_name')

    return { data, error }
  },

  /**
   * Eliminar grupo
   */
  async deleteGroup(groupId) {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)
    return { error }
  },
}

