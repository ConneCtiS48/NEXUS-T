import { useState, useEffect, useCallback } from 'react'
import { usersService } from '../services/usersService'

export function useAdminUsers() {
  // Estados de datos
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [userGroups, setUserGroups] = useState([])
  const [allRoles, setAllRoles] = useState([])
  const [allGroups, setAllGroups] = useState([])
  
  // Estados de control
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cargar todos los usuarios
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: err } = await usersService.fetchAllUsers()
      if (err) {
        setError('No se pudieron cargar los usuarios.')
        setUsers([])
      } else {
        setUsers(data || [])
      }
    } catch (err) {
      console.error('Error al cargar usuarios:', err)
      setError('No se pudieron cargar los usuarios.')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar detalles completos de un usuario
  const fetchUserDetails = useCallback(async (userId) => {
    setError(null)
    
    try {
      // Paso 1: Obtener usuario de la lista
      const user = users.find((u) => u.user_id === userId)
      if (user) {
        setSelectedUser(user)
      } else {
        // Si no está en la lista, fetch individual
        const userResult = await usersService.fetchUserById(userId)
        if (userResult.error) throw userResult.error
        setSelectedUser(userResult.data)
      }

      // Paso 2: Cargar grupos del usuario
      const groupsResult = await usersService.fetchUserGroups(userId)
      if (groupsResult.error) {
        console.warn('Error al cargar grupos del usuario:', groupsResult.error)
        setUserGroups([])
      } else {
        setUserGroups(groupsResult.data || [])
      }
    } catch (err) {
      console.error('Error al cargar detalles del usuario:', err)
      setError('No se pudieron cargar los detalles del usuario.')
    }
  }, [users])

  // Crear usuario
  const createUser = useCallback(async (userData, password) => {
    try {
      const { data, error: err } = await usersService.createUser(userData, password)
      if (err) {
        setError(err.message || 'No se pudo crear el usuario.')
        return { success: false, error: err }
      }
      
      return { success: true, data }
    } catch (err) {
      console.error('Error al crear usuario:', err)
      setError(err.message || 'No se pudo crear el usuario.')
      return { success: false, error: err }
    }
  }, [])

  // Actualizar usuario
  const updateUser = useCallback(async (profileId, userData) => {
    try {
      const { data, error: err } = await usersService.updateUserProfile(profileId, userData)
      if (err) {
        setError(err.message || 'No se pudo actualizar el usuario.')
        return { success: false, error: err }
      }
      
      return { success: true, data }
    } catch (err) {
      console.error('Error al actualizar usuario:', err)
      setError(err.message || 'No se pudo actualizar el usuario.')
      return { success: false, error: err }
    }
  }, [])

  // Eliminar usuario
  const deleteUser = useCallback(async (userId, profileId) => {
    try {
      const { error: err } = await usersService.deleteUser(userId, profileId)
      if (err) {
        setError(err.message || 'No se pudo eliminar el usuario.')
        return false
      }
      
      // Refrescar lista
      await fetchUsers()
      return true
    } catch (err) {
      console.error('Error al eliminar usuario:', err)
      setError(err.message || 'No se pudo eliminar el usuario.')
      return false
    }
  }, [fetchUsers])

  // Cargar todos los roles
  const fetchAllRoles = useCallback(async () => {
    try {
      const { data, error: err } = await usersService.fetchAllRoles()
      if (err) {
        setError(err.message || 'No se pudieron cargar los roles.')
        setAllRoles([])
      } else {
        setAllRoles(data || [])
      }
    } catch (err) {
      console.error('Error al cargar roles:', err)
      setError('No se pudieron cargar los roles.')
      setAllRoles([])
    }
  }, [])

  // Cargar todos los grupos
  const fetchAllGroups = useCallback(async () => {
    try {
      const { data, error: err } = await usersService.fetchAllGroups()
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

  // Actualizar rol del usuario
  const updateUserRole = useCallback(async (userId, oldRoleId, newRoleId) => {
    try {
      // Remover rol anterior si existe
      if (oldRoleId) {
        await usersService.removeUserRole(userId, oldRoleId)
      }

      // Asignar nuevo rol si existe
      if (newRoleId) {
        const { error: assignError } = await usersService.assignUserRole(userId, newRoleId)
        if (assignError) {
          return { success: false, error: assignError }
        }
      }

      return { success: true }
    } catch (err) {
      console.error('Error al actualizar rol del usuario:', err)
      setError(err.message || 'No se pudo actualizar el rol del usuario.')
      return { success: false, error: err }
    }
  }, [])

  // Actualizar grupos del usuario (como docente y/o tutor)
  const updateUserGroups = useCallback(async (userId, selectedGroups, tutorGroupId) => {
    try {
      // Eliminar todas las asignaciones como docente (is_tutor = false)
      await usersService.removeUserAsTeacher(userId)

      // Eliminar todas las asignaciones como tutor
      await usersService.removeUserAsTutor(userId)

      // Agregar grupos como docente
      if (selectedGroups && selectedGroups.length > 0) {
        for (const groupData of selectedGroups) {
          const groupIdNum = typeof groupData.groupId === 'string' ? groupData.groupId : groupData.groupId
          
          // Verificar si este grupo es también el grupo de tutor
          const isTutorOfThisGroup = String(groupIdNum) === String(tutorGroupId)
          
          if (!isTutorOfThisGroup) {
            await usersService.assignUserToGroup(userId, groupIdNum, false)
          }
        }
      }

      // Asignar como tutor si está seleccionado
      if (tutorGroupId) {
        await usersService.assignUserToGroup(userId, tutorGroupId, true)
      }

      return { success: true }
    } catch (err) {
      console.error('Error al actualizar grupos del usuario:', err)
      setError(err.message || 'No se pudieron actualizar los grupos del usuario.')
      return { success: false, error: err }
    }
  }, [])

  // Limpiar selección
  const clearSelection = useCallback(() => {
    setSelectedUser(null)
    setUserGroups([])
  }, [])

  // Cargar usuarios y roles al montar
  useEffect(() => {
    fetchUsers()
    fetchAllRoles()
    fetchAllGroups()
  }, [fetchUsers, fetchAllRoles, fetchAllGroups])

  return {
    // Estados de datos
    users,
    selectedUser,
    userGroups,
    allRoles,
    allGroups,
    loading,
    error,
    
    // Acciones CRUD básicas
    fetchUsers,
    fetchUserDetails,
    createUser,
    updateUser,
    deleteUser,
    clearSelection,
    setError,
    
    // Acciones de administración
    fetchAllRoles,
    fetchAllGroups,
    updateUserRole,
    updateUserGroups,
  }
}

