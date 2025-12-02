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
    loading,
    error,
    
    // Acciones
    fetchGroups,
    fetchGroupDetails,
    deleteGroup,
    clearSelection,
    setError,
  }
}

