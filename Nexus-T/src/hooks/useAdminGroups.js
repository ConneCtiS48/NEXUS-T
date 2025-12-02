import { useState, useEffect, useCallback } from 'react'
import { groupsService } from '../services/groupsService'

export function useAdminGroups() {
  // Estados de datos
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupTeachers, setGroupTeachers] = useState([])
  const [groupTutor, setGroupTutor] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [groupSubjects, setGroupSubjects] = useState([])
  
  // Estados para administración (listas completas disponibles)
  const [allTeachers, setAllTeachers] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [allStudents, setAllStudents] = useState([])
  
  // Estados de control
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cargar todos los grupos
  const fetchGroups = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: err } = await groupsService.fetchAll()
      if (err) {
        setError('No se pudieron cargar los grupos.')
        setGroups([])
      } else {
        setGroups(data || [])
      }
    } catch (err) {
      console.error('Error al cargar grupos:', err)
      setError('No se pudieron cargar los grupos.')
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar detalles completos de un grupo
  const fetchGroupDetails = useCallback(async (groupId) => {
    setError(null)
    
    try {
      // Paso 1: Cargar información básica del grupo
      const groupResult = await groupsService.fetchById(groupId)
      if (groupResult.error) throw groupResult.error
      setSelectedGroup(groupResult.data)

      // Paso 2: Cargar docentes del grupo
      const teachersResult = await groupsService.fetchTeachers(groupId)
      if (teachersResult.error) throw teachersResult.error

      // Paso 3: Obtener perfiles de docentes
      const teacherProfilesResult = await groupsService.fetchTeacherProfiles(teachersResult.data)
      if (teacherProfilesResult.error) throw teacherProfilesResult.error

      // Separar tutor de otros docentes
      const allTeachers = teacherProfilesResult.data || []
      const tutor = allTeachers.find((t) => t.is_tutor === true) || null
      const otherTeachers = allTeachers.filter((t) => t.is_tutor === false)

      setGroupTutor(tutor)
      setGroupTeachers(otherTeachers)

      // Paso 4: Cargar miembros del grupo
      const membersResult = await groupsService.fetchMembers(groupId)
      if (membersResult.error) throw membersResult.error

      // Paso 5: Obtener perfiles de estudiantes
      const studentProfilesResult = await groupsService.fetchStudentProfiles(membersResult.data)
      if (studentProfilesResult.error) throw studentProfilesResult.error

      setGroupMembers(studentProfilesResult.data || [])

      // Paso 6: Obtener IDs de asignaturas
      const subjectIdsResult = await groupsService.fetchSubjectIds(groupId)
      if (subjectIdsResult.error) throw subjectIdsResult.error

      // Paso 7: Obtener información completa de asignaturas
      const subjectDetailsResult = await groupsService.fetchSubjectDetails(subjectIdsResult.data)
      if (subjectDetailsResult.error) throw subjectDetailsResult.error

      setGroupSubjects(subjectDetailsResult.data || [])
    } catch (err) {
      console.error('Error al cargar detalles del grupo:', err)
      setError('No se pudieron cargar los detalles del grupo.')
    }
  }, [])

  // Crear grupo
  const createGroup = useCallback(async (groupData) => {
    try {
      const { data, error: err } = await groupsService.createGroup(groupData)
      if (err) {
        setError(err.message || 'No se pudo crear el grupo.')
        return { success: false, error: err }
      }
      // Refrescar lista
      await fetchGroups()
      return { success: true, data }
    } catch (err) {
      console.error('Error al crear grupo:', err)
      setError(err.message || 'No se pudo crear el grupo.')
      return { success: false, error: err }
    }
  }, [fetchGroups])

  // Actualizar grupo
  const updateGroup = useCallback(async (groupId, groupData) => {
    try {
      const { data, error: err } = await groupsService.updateGroup(groupId, groupData)
      if (err) {
        setError(err.message || 'No se pudo actualizar el grupo.')
        return { success: false, error: err }
      }
      // Refrescar lista
      await fetchGroups()
      // Si es el grupo seleccionado, refrescar detalles
      if (selectedGroup && selectedGroup.id === groupId) {
        await fetchGroupDetails(groupId)
      }
      return { success: true, data }
    } catch (err) {
      console.error('Error al actualizar grupo:', err)
      setError(err.message || 'No se pudo actualizar el grupo.')
      return { success: false, error: err }
    }
  }, [fetchGroups, fetchGroupDetails, selectedGroup])

  // Eliminar grupo
  const deleteGroup = useCallback(async (groupId) => {
    try {
      const { error: err } = await groupsService.deleteGroup(groupId)
      if (err) {
        setError(err.message || 'No se pudo eliminar el grupo.')
        return false
      }
      // Refrescar lista
      await fetchGroups()
      return true
    } catch (err) {
      console.error('Error al eliminar grupo:', err)
      setError(err.message || 'No se pudo eliminar el grupo.')
      return false
    }
  }, [fetchGroups])

  // ========== Funciones para administración ==========

  // Cargar todos los docentes disponibles
  const fetchAllTeachers = useCallback(async () => {
    try {
      const { data, error: err } = await groupsService.fetchAllTeachers()
      if (err) {
        setError(err.message || 'No se pudieron cargar los docentes.')
        setAllTeachers([])
      } else {
        setAllTeachers(data || [])
      }
    } catch (err) {
      console.error('Error al cargar docentes:', err)
      setError('No se pudieron cargar los docentes.')
      setAllTeachers([])
    }
  }, [])

  // Cargar todas las asignaturas disponibles
  const fetchAllSubjects = useCallback(async () => {
    try {
      const { data, error: err } = await groupsService.fetchAllSubjects()
      if (err) {
        setError(err.message || 'No se pudieron cargar las asignaturas.')
        setAllSubjects([])
      } else {
        setAllSubjects(data || [])
      }
    } catch (err) {
      console.error('Error al cargar asignaturas:', err)
      setError('No se pudieron cargar las asignaturas.')
      setAllSubjects([])
    }
  }, [])

  // Cargar todos los estudiantes disponibles
  const fetchAllStudents = useCallback(async () => {
    try {
      const { data, error: err } = await groupsService.fetchAllStudents()
      if (err) {
        setError(err.message || 'No se pudieron cargar los estudiantes.')
        setAllStudents([])
      } else {
        setAllStudents(data || [])
      }
    } catch (err) {
      console.error('Error al cargar estudiantes:', err)
      setError('No se pudieron cargar los estudiantes.')
      setAllStudents([])
    }
  }, [])

  // Actualizar docentes del grupo
  const updateGroupTeachers = useCallback(async (groupId, teacherIds, tutorId) => {
    try {
      // Obtener docentes actuales del grupo
      const { data: currentTeachers, error: fetchError } = await groupsService.fetchTeachers(groupId)
      if (fetchError) throw fetchError

      const currentTeacherIds = new Set((currentTeachers || []).map((t) => t.teacher_id))
      const newTeacherIds = new Set(teacherIds)

      // Remover docentes que ya no están en la lista
      for (const teacher of currentTeachers || []) {
        if (!newTeacherIds.has(teacher.teacher_id)) {
          await groupsService.removeTeacherFromGroup(groupId, teacher.teacher_id)
        }
      }

      // Agregar nuevos docentes
      for (const teacherId of teacherIds) {
        if (!currentTeacherIds.has(teacherId)) {
          await groupsService.assignTeacherToGroup(groupId, teacherId, false)
        }
      }

      // Actualizar tutor
      if (tutorId) {
        await groupsService.updateTutor(groupId, tutorId)
      } else {
        // Si no hay tutor seleccionado, quitar todos los tutores
        await groupsService.updateTutor(groupId, null)
      }

      // Refrescar detalles del grupo
      await fetchGroupDetails(groupId)
      return { success: true }
    } catch (err) {
      console.error('Error al actualizar docentes del grupo:', err)
      setError(err.message || 'No se pudieron actualizar los docentes del grupo.')
      return { success: false, error: err }
    }
  }, [fetchGroupDetails])

  // Actualizar asignaturas del grupo
  const updateGroupSubjects = useCallback(async (groupId, subjectIds) => {
    try {
      // Obtener asignaturas actuales del grupo
      const { data: currentSubjectIds, error: fetchError } = await groupsService.fetchSubjectIds(groupId)
      if (fetchError) throw fetchError

      const currentIds = new Set(currentSubjectIds || [])
      const newIds = new Set(subjectIds)

      // Remover asignaturas que ya no están en la lista
      for (const subjectId of currentIds) {
        if (!newIds.has(subjectId)) {
          await groupsService.removeSubjectFromGroup(groupId, subjectId)
        }
      }

      // Agregar nuevas asignaturas
      for (const subjectId of subjectIds) {
        if (!currentIds.has(subjectId)) {
          await groupsService.assignSubjectToGroup(groupId, subjectId)
        }
      }

      // Refrescar detalles del grupo
      await fetchGroupDetails(groupId)
      return { success: true }
    } catch (err) {
      console.error('Error al actualizar asignaturas del grupo:', err)
      setError(err.message || 'No se pudieron actualizar las asignaturas del grupo.')
      return { success: false, error: err }
    }
  }, [fetchGroupDetails])

  // Actualizar alumnos del grupo
  const updateGroupStudents = useCallback(async (groupId, studentIds, groupLeaderId) => {
    try {
      // Obtener alumnos actuales del grupo
      const { data: currentMembers, error: fetchError } = await groupsService.fetchMembers(groupId)
      if (fetchError) throw fetchError

      const currentStudentIds = new Set((currentMembers || []).map((m) => m.student_id))
      const newStudentIds = new Set(studentIds)

      // Remover alumnos que ya no están en la lista
      for (const member of currentMembers || []) {
        if (!newStudentIds.has(member.student_id)) {
          await groupsService.removeStudentFromGroup(groupId, member.student_id)
        }
      }

      // Agregar nuevos alumnos
      for (const studentId of studentIds) {
        const isGroupLeader = studentId === groupLeaderId
        if (!currentStudentIds.has(studentId)) {
          await groupsService.assignStudentToGroup(groupId, studentId, isGroupLeader)
        } else {
          // Si ya existe, actualizar is_group_leader si es necesario
          const currentMember = currentMembers.find((m) => m.student_id === studentId)
          if (currentMember && currentMember.is_group_leader !== isGroupLeader) {
            await groupsService.updateGroupLeader(groupId, studentId, isGroupLeader)
          }
        }
      }

      // Actualizar jefe de grupo si está en la lista
      if (groupLeaderId && studentIds.includes(groupLeaderId)) {
        await groupsService.updateGroupLeader(groupId, groupLeaderId, true)
      }

      // Refrescar detalles del grupo
      await fetchGroupDetails(groupId)
      return { success: true }
    } catch (err) {
      console.error('Error al actualizar alumnos del grupo:', err)
      setError(err.message || 'No se pudieron actualizar los alumnos del grupo.')
      return { success: false, error: err }
    }
  }, [fetchGroupDetails])

  // Limpiar selección
  const clearSelection = useCallback(() => {
    setSelectedGroup(null)
    setGroupTutor(null)
    setGroupTeachers([])
    setGroupMembers([])
    setGroupSubjects([])
  }, [])

  // Cargar grupos al montar
  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  return {
    // Estados de datos
    groups,
    selectedGroup,
    groupTeachers,
    groupTutor,
    groupMembers,
    groupSubjects,
    allTeachers,
    allSubjects,
    allStudents,
    loading,
    error,
    
    // Acciones CRUD básicas
    fetchGroups,
    fetchGroupDetails,
    createGroup,
    updateGroup,
    deleteGroup,
    clearSelection,
    setError,
    
    // Acciones de administración
    fetchAllTeachers,
    fetchAllSubjects,
    fetchAllStudents,
    updateGroupTeachers,
    updateGroupSubjects,
    updateGroupStudents,
  }
}

