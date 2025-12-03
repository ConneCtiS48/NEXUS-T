import { useState, useEffect, useCallback } from 'react'
import { studentsService } from '../services/studentsService'

export function useAdminStudents() {
  // Estados de datos
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentGroup, setStudentGroup] = useState(null)
  const [allGroups, setAllGroups] = useState([])
  
  // Estados de control
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cargar todos los estudiantes
  const fetchStudents = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: err } = await studentsService.fetchAll()
      if (err) {
        setError('No se pudieron cargar los estudiantes.')
        setStudents([])
      } else {
        setStudents(data || [])
      }
    } catch (err) {
      console.error('Error al cargar estudiantes:', err)
      setError('No se pudieron cargar los estudiantes.')
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar detalles completos de un estudiante
  const fetchStudentDetails = useCallback(async (studentId) => {
    setError(null)
    
    try {
      // Paso 1: Cargar información básica del estudiante
      const studentResult = await studentsService.fetchById(studentId)
      if (studentResult.error) throw studentResult.error
      setSelectedStudent(studentResult.data)

      // Paso 2: Cargar grupo del estudiante
      const groupResult = await studentsService.fetchStudentGroup(studentId)
      if (groupResult.error) {
        console.warn('Error al cargar grupo del estudiante:', groupResult.error)
        setStudentGroup(null)
      } else {
        setStudentGroup(groupResult.data)
      }
    } catch (err) {
      console.error('Error al cargar detalles del estudiante:', err)
      setError('No se pudieron cargar los detalles del estudiante.')
    }
  }, [])

  // Crear estudiante
  const createStudent = useCallback(async (studentData) => {
    try {
      const { data, error: err } = await studentsService.createStudent(studentData)
      if (err) {
        setError(err.message || 'No se pudo crear el estudiante.')
        return { success: false, error: err }
      }
      // Refrescar lista
      await fetchStudents()
      return { success: true, data }
    } catch (err) {
      console.error('Error al crear estudiante:', err)
      setError(err.message || 'No se pudo crear el estudiante.')
      return { success: false, error: err }
    }
  }, [fetchStudents])

  // Actualizar estudiante
  const updateStudent = useCallback(async (studentId, studentData) => {
    try {
      const { data, error: err } = await studentsService.updateStudent(studentId, studentData)
      if (err) {
        setError(err.message || 'No se pudo actualizar el estudiante.')
        return { success: false, error: err }
      }
      // Refrescar lista
      await fetchStudents()
      // Si es el estudiante seleccionado, refrescar detalles
      if (selectedStudent && selectedStudent.id === studentId) {
        await fetchStudentDetails(studentId)
      }
      return { success: true, data }
    } catch (err) {
      console.error('Error al actualizar estudiante:', err)
      setError(err.message || 'No se pudo actualizar el estudiante.')
      return { success: false, error: err }
    }
  }, [fetchStudents, fetchStudentDetails, selectedStudent])

  // Eliminar estudiante
  const deleteStudent = useCallback(async (studentId) => {
    try {
      const { error: err } = await studentsService.deleteStudent(studentId)
      if (err) {
        setError(err.message || 'No se pudo eliminar el estudiante.')
        return false
      }
      // Refrescar lista
      await fetchStudents()
      return true
    } catch (err) {
      console.error('Error al eliminar estudiante:', err)
      setError(err.message || 'No se pudo eliminar el estudiante.')
      return false
    }
  }, [fetchStudents])

  // Cargar todos los grupos disponibles
  const fetchAllGroups = useCallback(async () => {
    try {
      const { data, error: err } = await studentsService.fetchAllGroups()
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

  // Actualizar grupo del estudiante
  const updateStudentGroup = useCallback(async (studentId, groupId, isGroupLeader) => {
    try {
      if (!groupId) {
        // Si no hay grupo, remover del grupo actual
        const { error: err } = await studentsService.removeStudentFromGroup(studentId)
        if (err) {
          setError(err.message || 'No se pudo remover el estudiante del grupo.')
          return { success: false, error: err }
        }
      } else {
        // Asignar a grupo
        const { error: err } = await studentsService.assignStudentToGroup(studentId, groupId, isGroupLeader)
        if (err) {
          setError(err.message || 'No se pudo asignar el estudiante al grupo.')
          return { success: false, error: err }
        }
      }

      // Refrescar detalles del estudiante
      await fetchStudentDetails(studentId)
      return { success: true }
    } catch (err) {
      console.error('Error al actualizar grupo del estudiante:', err)
      setError(err.message || 'No se pudo actualizar el grupo del estudiante.')
      return { success: false, error: err }
    }
  }, [fetchStudentDetails])

  // Limpiar selección
  const clearSelection = useCallback(() => {
    setSelectedStudent(null)
    setStudentGroup(null)
  }, [])

  // Cargar estudiantes al montar
  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  return {
    // Estados de datos
    students,
    selectedStudent,
    studentGroup,
    allGroups,
    loading,
    error,
    
    // Acciones CRUD básicas
    fetchStudents,
    fetchStudentDetails,
    createStudent,
    updateStudent,
    deleteStudent,
    clearSelection,
    setError,
    
    // Acciones de administración
    fetchAllGroups,
    updateStudentGroup,
  }
}

