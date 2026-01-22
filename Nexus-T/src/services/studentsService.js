import { supabase } from '../lib/supabase'

export const studentsService = {
  /**
   * Obtener todos los estudiantes
   */
  async fetchAll() {
    const { data, error } = await supabase
      .from('students')
      .select('id, control_number, first_name, paternal_last_name, maternal_last_name, email, phone, contact_name, contact_phone, contact_type')
      .order('control_number')
    return { data, error }
  },

  /**
   * Obtener estudiante por ID
   */
  async fetchById(studentId) {
    const { data, error } = await supabase
      .from('students')
      .select('id, control_number, first_name, paternal_last_name, maternal_last_name, email, phone, contact_name, contact_phone, contact_type')
      .eq('id', studentId)
      .single()
    return { data, error }
  },

  /**
   * Crear nuevo estudiante
   */
  async createStudent(studentData) {
    const { data, error } = await supabase
      .from('students')
      .insert({
        control_number: studentData.control_number,
        first_name: studentData.first_name,
        paternal_last_name: studentData.paternal_last_name,
        maternal_last_name: studentData.maternal_last_name || null,
        email: studentData.email || null,
        phone: studentData.phone || null,
        contact_name: studentData.contact_name || null,
        contact_phone: studentData.contact_phone || null,
        contact_type: studentData.contact_type || null,
      })
      .select('id, control_number, first_name, paternal_last_name, maternal_last_name, email, phone, contact_name, contact_phone, contact_type')
      .single()
    return { data, error }
  },

  /**
   * Actualizar estudiante
   */
  async updateStudent(studentId, studentData) {
    const { data, error } = await supabase
      .from('students')
      .update({
        control_number: studentData.control_number,
        first_name: studentData.first_name,
        paternal_last_name: studentData.paternal_last_name,
        maternal_last_name: studentData.maternal_last_name || null,
        email: studentData.email || null,
        phone: studentData.phone || null,
        contact_name: studentData.contact_name || null,
        contact_phone: studentData.contact_phone || null,
        contact_type: studentData.contact_type || null,
      })
      .eq('id', studentId)
      .select('id, control_number, first_name, paternal_last_name, maternal_last_name, email, phone, contact_name, contact_phone, contact_type')
      .single()
    return { data, error }
  },

  /**
   * Eliminar estudiante
   */
  async deleteStudent(studentId) {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)
    return { error }
  },

  /**
   * Obtener grupo del estudiante desde group_members
   */
  async fetchStudentGroup(studentId) {
    const { data, error } = await supabase
      .from('group_members')
      .select('id, group_id, is_group_leader')
      .eq('student_id', studentId)
      .maybeSingle()

    if (error) {
      return { data: null, error }
    }

    if (!data) {
      return { data: null, error: null }
    }

    // Obtener información del grupo
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('id, grade, specialty, section, nomenclature')
      .eq('id', data.group_id)
      .single()

    if (groupError) {
      return { data: null, error: groupError }
    }

    return {
      data: {
        ...data,
        group: groupData,
      },
      error: null,
    }
  },

  /**
   * Obtener todos los grupos disponibles
   */
  async fetchAllGroups() {
    const { data, error } = await supabase
      .from('groups')
      .select('id, grade, specialty, section, nomenclature')
      .order('nomenclature')
    return { data: data || [], error }
  },

  /**
   * Asignar estudiante a grupo (o actualizar grupo)
   */
  async assignStudentToGroup(studentId, groupId, isGroupLeader = false) {
    // Primero, verificar si ya está en algún grupo
    const { data: existing, error: checkError } = await supabase
      .from('group_members')
      .select('id, group_id')
      .eq('student_id', studentId)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      return { data: null, error: checkError }
    }

    if (existing) {
      // Si ya está en un grupo, actualizar
      // Si el grupo es el mismo, solo actualizar is_group_leader
      if (existing.group_id === groupId) {
        const { data, error } = await supabase
          .from('group_members')
          .update({
            is_group_leader: isGroupLeader,
          })
          .eq('id', existing.id)
          .select('id, group_id, student_id, is_group_leader')
          .maybeSingle()
        return { data, error }
      } else {
        // Si cambia de grupo, actualizar grupo y is_group_leader
        const { data, error } = await supabase
          .from('group_members')
          .update({
            group_id: groupId,
            is_group_leader: isGroupLeader,
          })
          .eq('id', existing.id)
          .select('id, group_id, student_id, is_group_leader')
          .maybeSingle()
        
        // Si no hay datos pero tampoco hay error, puede ser un problema de permisos
        if (!data && !error) {
          return { 
            data: null, 
            error: { 
              message: 'No se pudo actualizar el grupo del estudiante. Verifica que tengas permisos para modificarlo.',
              code: 'UPDATE_FAILED'
            } 
          }
        }
        
        return { data, error }
      }
    } else {
      // Si no está en ningún grupo, insertar
      const { data, error } = await supabase
        .from('group_members')
        .insert({
          student_id: studentId,
          group_id: groupId,
          is_group_leader: isGroupLeader,
        })
        .select('id, group_id, student_id, is_group_leader')
        .maybeSingle()
      
      // Si no hay datos pero tampoco hay error, puede ser un problema de permisos
      if (!data && !error) {
        return { 
          data: null, 
          error: { 
            message: 'No se pudo asignar el estudiante al grupo. Verifica que tengas permisos para realizar esta acción.',
            code: 'INSERT_FAILED'
          } 
        }
      }
      
      return { data, error }
    }
  },

  /**
   * Remover estudiante de grupo
   */
  async removeStudentFromGroup(studentId) {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('student_id', studentId)
    return { error }
  },
}

