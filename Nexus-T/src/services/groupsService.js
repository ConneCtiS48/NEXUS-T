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
   * Crear nuevo grupo
   */
  async createGroup(groupData) {
    const { data, error } = await supabase
      .from('groups')
      .insert({
        grade: groupData.grade,
        specialty: groupData.specialty,
        nomenclature: groupData.nomenclature,
        section: groupData.section || null,
      })
      .select('id, grade, specialty, section, nomenclature')
      .single()
    return { data, error }
  },

  /**
   * Actualizar grupo
   */
  async updateGroup(groupId, groupData) {
    const { data, error } = await supabase
      .from('groups')
      .update({
        grade: groupData.grade,
        specialty: groupData.specialty,
        nomenclature: groupData.nomenclature,
        section: groupData.section || null,
      })
      .eq('id', groupId)
      .select('id, grade, specialty, section, nomenclature')
      .single()
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

  // ========== Funciones para administración de docentes ==========

  /**
   * Obtener todos los usuarios con rol "docente" desde user_roles y user_profiles
   */
  async fetchAllTeachers() {
    // Primero obtener el ID del rol "docente"
    const { data: docenteRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'docente')
      .maybeSingle()

    if (roleError) {
      return { data: [], error: roleError }
    }

    if (!docenteRole) {
      return { data: [], error: null }
    }

    // Obtener todos los user_ids con rol docente
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role_id', docenteRole.id)

    if (userRolesError) {
      return { data: [], error: userRolesError }
    }

    if (!userRoles || userRoles.length === 0) {
      return { data: [], error: null }
    }

    const userIds = userRoles.map((ur) => ur.user_id)

    // Obtener perfiles de docentes
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, user_id, first_name, last_name, email')
      .in('user_id', userIds)
      .order('first_name')

    return { data: data || [], error }
  },

  /**
   * Asignar docente a grupo (INSERT/UPDATE en teacher_groups)
   */
  async assignTeacherToGroup(groupId, teacherId, isTutor = false) {
    // Verificar si ya existe la relación
    const { data: existing, error: checkError } = await supabase
      .from('teacher_groups')
      .select('id, is_tutor')
      .eq('group_id', groupId)
      .eq('teacher_id', teacherId)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      return { data: null, error: checkError }
    }

    if (existing) {
      // Actualizar si ya existe
      const { data, error } = await supabase
        .from('teacher_groups')
        .update({ is_tutor: isTutor })
        .eq('id', existing.id)
        .select('id, teacher_id, group_id, is_tutor')
        .single()
      return { data, error }
    } else {
      // Insertar si no existe
      const { data, error } = await supabase
        .from('teacher_groups')
        .insert({
          teacher_id: teacherId,
          group_id: groupId,
          is_tutor: isTutor,
        })
        .select('id, teacher_id, group_id, is_tutor')
        .single()
      return { data, error }
    }
  },

  /**
   * Remover docente de grupo (DELETE de teacher_groups)
   */
  async removeTeacherFromGroup(groupId, teacherId) {
    const { error } = await supabase
      .from('teacher_groups')
      .delete()
      .eq('group_id', groupId)
      .eq('teacher_id', teacherId)
    return { error }
  },

  /**
   * Actualizar tutor (poner is_tutor=true en nuevo, false en anterior)
   */
  async updateTutor(groupId, newTutorId) {
    // Primero, quitar is_tutor de todos los docentes del grupo
    const { error: updateAllError } = await supabase
      .from('teacher_groups')
      .update({ is_tutor: false })
      .eq('group_id', groupId)
      .eq('is_tutor', true)

    if (updateAllError) {
      return { error: updateAllError }
    }

    // Luego, asignar el nuevo tutor
    if (newTutorId) {
      return await this.assignTeacherToGroup(groupId, newTutorId, true)
    }

    return { data: null, error: null }
  },

  // ========== Funciones para administración de asignaturas ==========

  /**
   * Obtener todas las asignaturas desde subjects
   */
  async fetchAllSubjects() {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, subject_name, category_type, category_name')
      .order('subject_name')
    return { data: data || [], error }
  },

  /**
   * Asignar asignatura a grupo (INSERT en teacher_group_subjects)
   * Nota: Requiere teacher_id y shift. Si no se proporciona teacher_id, se usa el tutor del grupo.
   */
  async assignSubjectToGroup(groupId, subjectId, teacherId = null, shift = 'M') {
    // Si no se proporciona teacher_id, obtener el tutor del grupo
    let finalTeacherId = teacherId

    if (!finalTeacherId) {
      const { data: tutorData, error: tutorError } = await supabase
        .from('teacher_groups')
        .select('teacher_id')
        .eq('group_id', groupId)
        .eq('is_tutor', true)
        .maybeSingle()

      if (tutorError) {
        return { data: null, error: tutorError }
      }

      if (!tutorData) {
        return { data: null, error: { message: 'No hay tutor asignado al grupo. Se requiere un docente para asignar asignaturas.' } }
      }

      finalTeacherId = tutorData.teacher_id
    }

    // Verificar si ya existe la relación
    const { data: existing, error: checkError } = await supabase
      .from('teacher_group_subjects')
      .select('id')
      .eq('group_id', groupId)
      .eq('subject_id', subjectId)
      .eq('teacher_id', finalTeacherId)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      return { data: null, error: checkError }
    }

    if (existing) {
      // Ya existe, retornar sin error
      return { data: existing, error: null }
    }

    // Insertar nueva relación
    const { data, error } = await supabase
      .from('teacher_group_subjects')
      .insert({
        teacher_id: finalTeacherId,
        group_id: groupId,
        subject_id: subjectId,
        shift: shift, // 'M' o 'V'
      })
      .select('id, teacher_id, group_id, subject_id, shift')
      .single()

    return { data, error }
  },

  /**
   * Remover asignatura de grupo (DELETE de teacher_group_subjects)
   * Nota: Elimina todas las relaciones de la asignatura con el grupo
   */
  async removeSubjectFromGroup(groupId, subjectId) {
    const { error } = await supabase
      .from('teacher_group_subjects')
      .delete()
      .eq('group_id', groupId)
      .eq('subject_id', subjectId)
    return { error }
  },

  // ========== Funciones para administración de alumnos ==========

  /**
   * Obtener todos los estudiantes desde students
   */
  async fetchAllStudents() {
    const { data, error } = await supabase
      .from('students')
      .select('id, control_number, first_name, paternal_last_name, maternal_last_name, email')
      .order('control_number')
    return { data: data || [], error }
  },

  /**
   * Asignar alumno a grupo (INSERT en group_members)
   */
  async assignStudentToGroup(groupId, studentId, isGroupLeader = false) {
    // Verificar si ya existe la relación
    const { data: existing, error: checkError } = await supabase
      .from('group_members')
      .select('id, is_group_leader')
      .eq('group_id', groupId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      return { data: null, error: checkError }
    }

    if (existing) {
      // Actualizar si ya existe
      const { data, error } = await supabase
        .from('group_members')
        .update({ is_group_leader: isGroupLeader })
        .eq('id', existing.id)
        .select('id, group_id, student_id, is_group_leader')
        .single()
      return { data, error }
    } else {
      // Insertar si no existe
      const { data, error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          student_id: studentId,
          is_group_leader: isGroupLeader,
        })
        .select('id, group_id, student_id, is_group_leader')
        .single()
      return { data, error }
    }
  },

  /**
   * Remover alumno de grupo (DELETE de group_members)
   */
  async removeStudentFromGroup(groupId, studentId) {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('student_id', studentId)
    return { error }
  },

  /**
   * Actualizar jefe de grupo (UPDATE is_group_leader en group_members)
   */
  async updateGroupLeader(groupId, studentId, isGroupLeader) {
    // Si se está asignando como jefe, primero quitar is_group_leader de todos los demás
    if (isGroupLeader) {
      const { error: updateAllError } = await supabase
        .from('group_members')
        .update({ is_group_leader: false })
        .eq('group_id', groupId)
        .eq('is_group_leader', true)

      if (updateAllError) {
        return { error: updateAllError }
      }
    }

    // Actualizar el estado del alumno
    const { data, error } = await supabase
      .from('group_members')
      .update({ is_group_leader: isGroupLeader })
      .eq('group_id', groupId)
      .eq('student_id', studentId)
      .select('id, group_id, student_id, is_group_leader')
      .maybeSingle()

    return { data, error }
  },
}

