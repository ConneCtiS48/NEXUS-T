import { useState, useEffect, useCallback } from 'react'
import { subjectsService } from '../services/subjectsService'

export function useAdminSubjects() {
  // Estados de datos
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [subjectGroups, setSubjectGroups] = useState([])
  const [allGroups, setAllGroups] = useState([])
  
  // Estados de control
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cargar todas las asignaturas
  const fetchSubjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: err } = await subjectsService.fetchAll()
      if (err) {
        setError('No se pudieron cargar las asignaturas.')
        setSubjects([])
      } else {
        setSubjects(data || [])
      }
    } catch (err) {
      console.error('Error al cargar asignaturas:', err)
      setError('No se pudieron cargar las asignaturas.')
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar detalles completos de una asignatura
  const fetchSubjectDetails = useCallback(async (subjectId) => {
    setError(null)
    
    try {
      // Paso 1: Cargar información básica de la asignatura
      const subjectResult = await subjectsService.fetchById(subjectId)
      if (subjectResult.error) throw subjectResult.error
      setSelectedSubject(subjectResult.data)

      // Paso 2: Cargar grupos donde está asignada
      const groupsResult = await subjectsService.fetchSubjectGroups(subjectId)
      if (groupsResult.error) {
        console.warn('Error al cargar grupos de la asignatura:', groupsResult.error)
        setSubjectGroups([])
      } else {
        setSubjectGroups(groupsResult.data || [])
      }
    } catch (err) {
      console.error('Error al cargar detalles de la asignatura:', err)
      setError('No se pudieron cargar los detalles de la asignatura.')
    }
  }, [])

  // Crear asignatura
  const createSubject = useCallback(async (subjectData) => {
    try {
      const { data, error: err } = await subjectsService.createSubject(subjectData)
      if (err) {
        setError(err.message || 'No se pudo crear la asignatura.')
        return { success: false, error: err }
      }
      // Refrescar lista
      await fetchSubjects()
      return { success: true, data }
    } catch (err) {
      console.error('Error al crear asignatura:', err)
      setError(err.message || 'No se pudo crear la asignatura.')
      return { success: false, error: err }
    }
  }, [fetchSubjects])

  // Actualizar asignatura
  const updateSubject = useCallback(async (subjectId, subjectData) => {
    try {
      const { data, error: err } = await subjectsService.updateSubject(subjectId, subjectData)
      if (err) {
        setError(err.message || 'No se pudo actualizar la asignatura.')
        return { success: false, error: err }
      }
      // Refrescar lista
      await fetchSubjects()
      // Si es la asignatura seleccionada, refrescar detalles
      if (selectedSubject && selectedSubject.id === subjectId) {
        await fetchSubjectDetails(subjectId)
      }
      return { success: true, data }
    } catch (err) {
      console.error('Error al actualizar asignatura:', err)
      setError(err.message || 'No se pudo actualizar la asignatura.')
      return { success: false, error: err }
    }
  }, [fetchSubjects, fetchSubjectDetails, selectedSubject])

  // Eliminar asignatura
  const deleteSubject = useCallback(async (subjectId) => {
    try {
      const { error: err } = await subjectsService.deleteSubject(subjectId)
      if (err) {
        setError(err.message || 'No se pudo eliminar la asignatura.')
        return false
      }
      // Refrescar lista
      await fetchSubjects()
      return true
    } catch (err) {
      console.error('Error al eliminar asignatura:', err)
      setError(err.message || 'No se pudo eliminar la asignatura.')
      return false
    }
  }, [fetchSubjects])

  // Cargar todos los grupos disponibles
  const fetchAllGroups = useCallback(async () => {
    try {
      const { data, error: err } = await subjectsService.fetchAllGroups()
      if (err) {
        setError(err.message || 'No se pudieron cargar los grupos.')
        setAllGroups([])
      } else {
        setAllGroups(data || [])
      }
    } catch (err) {
      console.error('Error al cargar grupos:', err)
      setError('No se pudieron cargar los grupos.')
      setAllGroups([])
    }
  }, [])

  // Actualizar grupos de la asignatura
  const updateSubjectGroups = useCallback(async (subjectId, groupAssignments) => {
    try {
      // groupAssignments es array de {groupId, teacherId, shift}
      
      // Obtener asignaciones actuales
      const currentGroups = await subjectsService.fetchSubjectGroups(subjectId)
      if (currentGroups.error) throw currentGroups.error

      const currentAssignments = currentGroups.data || []
      const currentMap = new Map(currentAssignments.map((a) => [a.group?.id, a]))

      // Procesar cada asignación
      for (const assignment of groupAssignments) {
        const current = currentMap.get(assignment.groupId)
        
        if (current) {
          // Si ya existe, verificar si cambió el docente
          if (current.teacher?.user_id !== assignment.teacherId) {
            await subjectsService.updateSubjectGroupTeacher(current.id, assignment.teacherId)
          }
          // Marcar como procesado
          currentMap.delete(assignment.groupId)
        } else {
          // Si no existe, crear nueva asignación
          await subjectsService.assignSubjectToGroup(
            subjectId,
            assignment.groupId,
            assignment.teacherId,
            assignment.shift
          )
        }
      }

      // Remover asignaciones que ya no están en la lista
      for (const [groupId, current] of currentMap) {
        await subjectsService.removeSubjectFromGroup(current.id)
      }

      // Refrescar detalles de la asignatura
      await fetchSubjectDetails(subjectId)
      return { success: true }
    } catch (err) {
      console.error('Error al actualizar grupos de la asignatura:', err)
      setError(err.message || 'No se pudieron actualizar los grupos.')
      return { success: false, error: err }
    }
  }, [fetchSubjectDetails])

  // Limpiar selección
  const clearSelection = useCallback(() => {
    setSelectedSubject(null)
    setSubjectGroups([])
  }, [])

  // Cargar asignaturas al montar
  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  return {
    // Estados de datos
    subjects,
    selectedSubject,
    subjectGroups,
    allGroups,
    loading,
    error,
    
    // Acciones CRUD básicas
    fetchSubjects,
    fetchSubjectDetails,
    createSubject,
    updateSubject,
    deleteSubject,
    clearSelection,
    setError,
    
    // Acciones de administración
    fetchAllGroups,
    updateSubjectGroups,
  }
}

