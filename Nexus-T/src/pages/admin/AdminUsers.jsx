import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import SimpleTable from '../../components/data/SimpleTable'
import DetailView from '../../components/data/DetailView'
import ActionMenu from '../../components/data/ActionMenu'
import Modal from '../../components/base/Modal'
import Input from '../../components/forms/Input'
import Select from '../../components/forms/Select'
import FormField from '../../components/forms/FormField'
import FormRow from '../../components/forms/FormRow'
import PageHeader from '../../components/layout/PageHeader'
import Alert from '../../components/base/Alert'
import Section from '../../components/layout/Section'
import CsvImporter from '../../components/data/CsvImporter'

const INITIAL_FORM = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  role_id: '',
  selectedGroups: [], // Array de objetos {groupId, shift} para grupos seleccionados
  tutorGroupId: '', // ID del grupo donde es tutor
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)
  const [roleUsers, setRoleUsers] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editingData, setEditingData] = useState({})
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const initialEditingDataRef = useRef(null) // Para detectar cambios no guardados
  const initialFormDataRef = useRef(JSON.stringify(INITIAL_FORM))
  const hasFormChanges = useRef(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  // Estados para importación CSV
  const [importResults, setImportResults] = useState(null)
  // Estados para gestión de docentes/tutores
  const [teacherGroups, setTeacherGroups] = useState([])
  const [teacherGroupsFromTeacherGroups, setTeacherGroupsFromTeacherGroups] = useState([])
  const [tutorGroup, setTutorGroup] = useState(null)
  const [tutorGroups, setTutorGroups] = useState([]) // Todos los grupos donde es tutor
  const [allGroups, setAllGroups] = useState([])
  const [groupsWithTutors, setGroupsWithTutors] = useState(new Set()) // Set de group_ids que tienen tutor
  const [showTeacherManagement, setShowTeacherManagement] = useState(null)
  const [teacherForm, setTeacherForm] = useState({ groupId: '', subjectName: '', shift: 'matutino' })

  useEffect(() => {
    fetchUsers()
    fetchRoles()
    fetchAllGroups()
  }, [])

  // Función helper para obtener o crear un subject
  const getOrCreateSubjectId = async (subjectName = 'Materia por asignar') => {
    try {
      const { data: existing, error: findError } = await supabase
        .from('subjects')
        .select('id')
        .eq('subject_name', subjectName)
        .maybeSingle()

      if (findError && findError.code !== 'PGRST116') {
        console.error('Error al buscar subject:', findError)
      }

      if (existing) {
        return existing.id
      }

      const { data: newSubject, error: createError } = await supabase
        .from('subjects')
        .insert({
          subject_name: subjectName,
          category_type: 'General',
          category_name: 'General',
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Error al crear subject:', createError)
        throw createError
      }

      return newSubject.id
    } catch (error) {
      console.error('Error en getOrCreateSubjectId:', error)
      throw error
    }
  }

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetails(selectedUserId)
      setSelectedRoleId(null)
    }
  }, [selectedUserId])

  useEffect(() => {
    if (selectedRoleId) {
      fetchRoleDetails(selectedRoleId)
      setSelectedUserId(null)
    }
  }, [selectedRoleId])

  const fetchUsers = async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, user_id, first_name, last_name, email')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      const userIds = profiles.map((p) => p.user_id)
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role_id, roles(name)')
        .in('user_id', userIds)

      if (rolesError) throw rolesError

      const rolesMap = new Map()
      userRoles.forEach((ur) => {
        if (!rolesMap.has(ur.user_id)) {
          rolesMap.set(ur.user_id, [])
        }
        rolesMap.get(ur.user_id).push({
          role_id: ur.role_id,
          role_name: ur.roles?.name || 'Sin nombre',
        })
      })

      const usersWithRoles = profiles.map((profile) => ({
        id: profile.id,
        user_id: profile.user_id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        roles: rolesMap.get(profile.user_id) || [],
        role_id: rolesMap.get(profile.user_id)?.[0]?.role_id || '',
      }))

      setUsers(usersWithRoles)
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
      setErrorMessage('No se pudieron cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserDetails = async (userId) => {
    try {
      const user = users.find((u) => u.user_id === userId)
      if (user) {
        setSelectedUser(user)
      }
    } catch (error) {
      console.error('Error al cargar detalles del usuario:', error)
    }
  }

  const fetchRoleDetails = async (roleId) => {
    try {
      const role = roles.find((r) => r.id === roleId)
      if (role) {
        setSelectedRole(role)

        const { data: usersData, error: usersError } = await supabase
          .from('user_roles')
          .select(`
            user_id,
            user:user_profiles!user_roles_user_id_fkey(
              id,
              user_id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('role_id', roleId)

        if (usersError) throw usersError

        const usersMap = new Map()
        usersData?.forEach((item) => {
          if (item.user && !usersMap.has(item.user.user_id)) {
            usersMap.set(item.user.user_id, item.user)
          }
        })
        setRoleUsers(Array.from(usersMap.values()))
      }
    } catch (error) {
      console.error('Error al cargar detalles del rol:', error)
    }
  }

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description')
        .order('name')

      if (error) throw error
      setRoles(data || [])
    } catch (error) {
      console.error('Error al cargar roles:', error)
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }
      // Detectar cambios comparando con el estado inicial
      const currentDataStr = JSON.stringify(newData)
      hasFormChanges.current = currentDataStr !== initialFormDataRef.current
      return newData
    })
  }

  // Función para verificar cambios antes de cerrar modal
  const handleCloseCreateModal = (confirmClose) => {
    if (hasFormChanges.current) {
      if (window.confirm('¿Estás seguro de que deseas cancelar? Se perderán los cambios no guardados.')) {
        setFormData(INITIAL_FORM)
        hasFormChanges.current = false
        initialFormDataRef.current = JSON.stringify(INITIAL_FORM)
        confirmClose()
      }
    } else {
      confirmClose()
    }
  }

  const handleCloseImportModal = (confirmClose) => {
    // Para importar, verificar si hay resultados
    if (importResults) {
      if (window.confirm('¿Estás seguro de que deseas cerrar? Se perderán los resultados de la importación.')) {
        setImportResults(null)
        confirmClose()
      }
    } else {
      confirmClose()
    }
  }

  // Resetear cambios cuando se abre el modal de crear
  const handleOpenCreateModal = () => {
    setFormData(INITIAL_FORM)
    hasFormChanges.current = false
    initialFormDataRef.current = JSON.stringify(INITIAL_FORM)
    setShowCreateModal(true)
  }

  // Funciones para CSV import
  const validateCsvRow = (row, index) => {
    const errors = []
    if (!row.email || !row.email.trim()) {
      errors.push('Email es requerido')
    }
    if (!row.password || row.password.length < 6) {
      errors.push('Contraseña debe tener al menos 6 caracteres')
    }
    if (!row.first_name || !row.first_name.trim()) {
      errors.push('Nombre es requerido')
    }
    if (!row.last_name || !row.last_name.trim()) {
      errors.push('Apellido es requerido')
    }
    return errors.length === 0 ? null : errors.join(', ')
  }

  const handleCsvImport = async (rows) => {
    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    setImportResults(null)

    const results = {
      success: [],
      errors: [],
      skipped: [],
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Validar fila
        const validationError = validateCsvRow(row, i + 1)
        if (validationError) {
          results.errors.push({
            row: i + 1,
            email: row.email || 'N/A',
            error: validationError,
          })
          continue
        }

        // Verificar si el usuario ya existe
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id, user_id')
          .eq('email', row.email.trim())
          .maybeSingle()

        if (existingProfile) {
          results.skipped.push({
            row: i + 1,
            email: row.email,
            reason: 'Usuario ya existe',
          })
          continue
        }

        // Crear usuario
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: row.email.trim(),
          password: row.password,
        })

        if (authError) {
          if (authError.message.includes('already registered')) {
            results.skipped.push({
              row: i + 1,
              email: row.email,
              reason: 'Usuario ya existe en auth',
            })
          } else {
            results.errors.push({
              row: i + 1,
              email: row.email,
              error: authError.message,
            })
          }
          continue
        }

        if (!authData.user) {
          results.errors.push({
            row: i + 1,
            email: row.email,
            error: 'No se pudo crear el usuario en auth',
          })
          continue
        }

        // Crear perfil
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            first_name: row.first_name.trim(),
            last_name: row.last_name.trim(),
            email: row.email.trim(),
          })

        if (profileError) {
          results.errors.push({
            row: i + 1,
            email: row.email,
            error: profileError.message,
          })
          continue
        }

        // Asignar rol si se especificó
        if (row.role && row.role.trim()) {
          const role = roles.find((r) => r.name.toLowerCase() === row.role.trim().toLowerCase())
          if (role) {
            await supabase
              .from('user_roles')
              .insert({
                user_id: authData.user.id,
                role_id: role.id,
              })
          }
        }

        results.success.push({
          row: i + 1,
          email: row.email,
        })
      } catch (error) {
        results.errors.push({
          row: i + 1,
          email: row.email || 'N/A',
          error: error.message || 'Error desconocido',
        })
      }
    }

    setImportResults(results)
    setSuccessMessage(`Importación completada: ${results.success.length} exitosos, ${results.errors.length} errores, ${results.skipped.length} omitidos`)
    
    if (results.success.length > 0) {
      await fetchUsers()
    }

    setSubmitting(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id, user_id')
        .eq('email', formData.email)
        .maybeSingle()

      let userId

      if (existingProfile) {
        userId = existingProfile.user_id
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
          })
          .eq('id', existingProfile.id)

        if (updateError) throw updateError
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        })

        if (authError && authError.message.includes('already registered')) {
          const { data: profileCheck } = await supabase
            .from('user_profiles')
            .select('id, user_id')
            .eq('email', formData.email)
            .maybeSingle()

          if (profileCheck) {
            userId = profileCheck.user_id
          } else {
            throw new Error('El usuario ya existe en auth.users pero no se pudo obtener su ID.')
          }
        } else if (authError) {
          throw authError
        } else if (!authData.user) {
          throw new Error('No se pudo crear el usuario en auth.users')
        } else {
          userId = authData.user.id
        }

        if (userId) {
          const { data: newProfile, error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: userId,
              first_name: formData.first_name,
              last_name: formData.last_name,
              email: formData.email,
            })
            .select('id')
            .single()

          if (insertError && !insertError.message.includes('duplicate') && !insertError.message.includes('already exists')) {
            throw insertError
          }
        }
      }

      if (formData.role_id && userId) {
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .eq('role_id', formData.role_id)
          .maybeSingle()

        if (!existingRole) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role_id: formData.role_id,
            })

          if (roleError) throw roleError
        }
      }

      // Asignar grupos como docente si hay grupos seleccionados
      if (formData.selectedGroups && formData.selectedGroups.length > 0 && userId) {
        // Verificar si el usuario tiene rol de docente
        const docenteRole = roles.find((r) => r.name?.toLowerCase() === 'docente')
        if (docenteRole && formData.role_id === docenteRole.id) {
          // Por cada grupo seleccionado, crear una entrada en teacher_groups
          for (const groupData of formData.selectedGroups) {
            try {
              // Verificar si ya existe la relación (como docente o tutor)
              const { data: existing } = await supabase
                .from('teacher_groups')
                .select('id, is_tutor')
                .eq('teacher_id', userId)
                .eq('group_id', groupData.groupId)
                .maybeSingle()

              if (!existing) {
                // Insertar como docente (is_tutor = false)
                const { error: teacherError } = await supabase
                  .from('teacher_groups')
                  .insert({
                    teacher_id: userId,
                    group_id: groupData.groupId,
                    is_tutor: false,
                  })

                if (teacherError && !teacherError.message.includes('duplicate')) {
                  console.warn(`No se pudo asignar grupo ${groupData.groupId} como docente:`, teacherError)
                }
              } else if (existing.is_tutor) {
                // Si ya existe como tutor, mantener is_tutor=true (no cambiar)
                // El docente puede ser tutor del mismo grupo
              }
            } catch (error) {
              console.error(`Error al asignar grupo ${groupData.groupId}:`, error)
            }
          }
        }
      }

      // Asignar grupo como tutor si está seleccionado
      if (formData.tutorGroupId && userId) {
        try {
          // Verificar si ya existe la relación
          const { data: existing } = await supabase
            .from('teacher_groups')
            .select('id, is_tutor')
            .eq('teacher_id', userId)
            .eq('group_id', formData.tutorGroupId)
            .maybeSingle()

          if (existing) {
            // Si ya existe, actualizar is_tutor a true
            const { error: tutorError } = await supabase
              .from('teacher_groups')
              .update({ is_tutor: true })
              .eq('id', existing.id)

            if (tutorError) {
              console.warn('No se pudo asignar como tutor:', tutorError)
            }
          } else {
            // Si no existe, insertar con is_tutor = true
            const { error: tutorError } = await supabase
              .from('teacher_groups')
              .insert({
                teacher_id: userId,
                group_id: formData.tutorGroupId,
                is_tutor: true,
              })

            if (tutorError) {
              console.warn('No se pudo asignar como tutor:', tutorError)
            }
          }
        } catch (error) {
          console.error('Error al asignar como tutor:', error)
        }
      }

      setSuccessMessage('Usuario creado/actualizado correctamente.')
      setFormData(INITIAL_FORM)
      hasFormChanges.current = false
      initialFormDataRef.current = JSON.stringify(INITIAL_FORM)
      setShowCreateModal(false)
      await fetchUsers()
    } catch (error) {
      console.error('Error al crear usuario:', error)
      setErrorMessage(error.message || 'No se pudo crear/actualizar el usuario.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelect = async (id) => {
    const user = users.find((u) => u.id === id)
    if (user) {
      setSelectedUserId(user.user_id)
      setActiveTab('overview')
      
      // Cargar grupos del docente si tiene rol de docente
      const hasDocenteRole = user.roles?.some((r) => r.role_name?.toLowerCase() === 'docente')
      if (hasDocenteRole) {
        try {
          await Promise.all([
            fetchTeacherGroupsFromTeacherGroups(user.user_id), // Desde teacher_groups (sin materias)
            fetchTutorGroup(user.user_id),
            fetchTutorGroups(user.user_id), // Todos los grupos donde es tutor
          ])
        } catch (error) {
          console.error('Error al cargar grupos del docente:', error)
        }
      } else {
        // Limpiar estados si no es docente
        setTeacherGroups([])
        setTeacherGroupsFromTeacherGroups([])
        setTutorGroup(null)
        setTutorGroups([])
      }
    }
  }

  const handleEdit = async (id) => {
    const user = users.find((u) => u.id === id)
    if (!user) {
      setErrorMessage('Usuario no encontrado')
      return
    }
    
    setEditingId(id)
    
    // Inicializar con datos básicos del usuario
    const editData = {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      role_id: user.role_id || '',
      selectedGroups: [],
      tutorGroupId: '',
    }
    
    // Cargar grupos del docente desde teacher_groups (sin materias)
    const docenteRole = roles.find((r) => r.name?.toLowerCase() === 'docente')
    if (docenteRole && user.role_id === docenteRole.id) {
      const { data: teacherGroups } = await supabase
        .from('teacher_groups')
        .select('group_id')
        .eq('teacher_id', user.user_id)
        .eq('is_tutor', false)
      
      if (teacherGroups && teacherGroups.length > 0) {
        // Normalizar groupId a string para consistencia
        editData.selectedGroups = teacherGroups.map((tg) => ({
          groupId: String(tg.group_id), // Convertir a string
          shift: 'M',
        }))
      }
      
      // También cargar grupos desde teacher_group_subjects (con materias)
      const { data: teacherGroupSubjects } = await supabase
        .from('teacher_group_subjects')
        .select('group_id, shift')
        .eq('teacher_id', user.user_id)
      
      if (teacherGroupSubjects && teacherGroupSubjects.length > 0) {
        const existingGroupIds = new Set(editData.selectedGroups.map(g => g.groupId))
        teacherGroupSubjects.forEach((tgs) => {
          const groupIdStr = String(tgs.group_id)
          if (!existingGroupIds.has(groupIdStr)) {
            editData.selectedGroups.push({
              groupId: groupIdStr, // Convertir a string
              shift: tgs.shift || 'M',
            })
          }
        })
      }
    }
    
    // Cargar grupo de tutor
    const { data: tutorGroup } = await supabase
      .from('teacher_groups')
      .select('group_id')
      .eq('teacher_id', user.user_id)
      .eq('is_tutor', true)
      .maybeSingle()
    
    if (tutorGroup) {
      editData.tutorGroupId = String(tutorGroup.group_id) // Convertir a string
    }
    
    // Actualizar estado solo después de cargar todos los datos
    setEditingData(editData)
    initialEditingDataRef.current = JSON.stringify(editData)
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    const hasChanges = initialEditingDataRef.current !== JSON.stringify(editingData)
    if (hasChanges) {
      if (!confirm('¿Estás seguro de que deseas cerrar? Los cambios no guardados se perderán.')) {
        return
      }
    }
    setShowEditModal(false)
    setEditingId(null)
    setEditingData({})
    initialEditingDataRef.current = null
  }

  const handleEditFieldChange = (id, field, value) => {
    if (editingId === id) {
      setEditingData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleSave = async (id) => {
    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const user = users.find((u) => u.id === id)
      if (!user) throw new Error('Usuario no encontrado')

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          first_name: editingData.first_name,
          last_name: editingData.last_name,
          email: editingData.email,
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Actualizar rol si cambió
      if (editingData.role_id && editingData.role_id !== user.role_id) {
        if (user.role_id) {
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', user.user_id)
            .eq('role_id', user.role_id)
        }

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.user_id,
            role_id: editingData.role_id,
          })

        if (roleError) throw roleError
      }

      // Actualizar grupos como docente
      const docenteRole = roles.find((r) => r.name?.toLowerCase() === 'docente')
      if (docenteRole && editingData.role_id === docenteRole.id) {
        // Eliminar todas las asignaciones actuales de docente (solo donde is_tutor = false)
        await supabase
          .from('teacher_groups')
          .delete()
          .eq('teacher_id', user.user_id)
          .eq('is_tutor', false)

        // Agregar las nuevas asignaciones como docente
        if (editingData.selectedGroups && editingData.selectedGroups.length > 0) {
          for (const groupData of editingData.selectedGroups) {
            try {
              // Convertir groupId a número para Supabase
              const groupIdNum = typeof groupData.groupId === 'string' ? parseInt(groupData.groupId, 10) : groupData.groupId
              
              // Verificar si ya existe como tutor
              const { data: existing } = await supabase
                .from('teacher_groups')
                .select('id, is_tutor')
                .eq('teacher_id', user.user_id)
                .eq('group_id', groupIdNum)
                .maybeSingle()

              if (!existing) {
                // Insertar como docente
                const { error: teacherError } = await supabase
                  .from('teacher_groups')
                  .insert({
                    teacher_id: user.user_id,
                    group_id: groupIdNum,
                    is_tutor: false,
                  })

                if (teacherError && !teacherError.message.includes('duplicate')) {
                  console.warn(`No se pudo asignar grupo ${groupData.groupId}:`, teacherError)
                }
              }
              // Si ya existe como tutor, no hacer nada (mantener is_tutor = true)
            } catch (error) {
              console.error(`Error al asignar grupo ${groupData.groupId}:`, error)
            }
          }
        }
      } else {
        // Si no es docente, eliminar todas las asignaciones como docente (mantener tutor si existe)
        await supabase
          .from('teacher_groups')
          .delete()
          .eq('teacher_id', user.user_id)
          .eq('is_tutor', false)
      }

      // Actualizar grupo como tutor
      // Primero eliminar tutor de todos los grupos (poner is_tutor = false o eliminar)
      await supabase
        .from('teacher_groups')
        .delete()
        .eq('teacher_id', user.user_id)
        .eq('is_tutor', true)

      // Asignar nuevo grupo como tutor si está seleccionado
      if (editingData.tutorGroupId) {
        try {
          // Convertir tutorGroupId a número para Supabase
          const tutorGroupIdNum = typeof editingData.tutorGroupId === 'string' ? parseInt(editingData.tutorGroupId, 10) : editingData.tutorGroupId
          
          // Verificar si ya existe la relación
          const { data: existing } = await supabase
            .from('teacher_groups')
            .select('id, is_tutor')
            .eq('teacher_id', user.user_id)
            .eq('group_id', tutorGroupIdNum)
            .maybeSingle()

          if (existing) {
            // Si ya existe, actualizar is_tutor a true
            const { error: tutorError } = await supabase
              .from('teacher_groups')
              .update({ is_tutor: true })
              .eq('id', existing.id)

            if (tutorError) {
              console.warn('No se pudo asignar como tutor:', tutorError)
            }
          } else {
            // Si no existe, insertar con is_tutor = true
            const { error: tutorError } = await supabase
              .from('teacher_groups')
              .insert({
                teacher_id: user.user_id,
                group_id: tutorGroupIdNum,
                is_tutor: true,
              })

            if (tutorError) {
              console.warn('No se pudo asignar como tutor:', tutorError)
            }
          }
        } catch (error) {
          console.error('Error al asignar como tutor:', error)
        }
      }

      setSuccessMessage('Usuario actualizado correctamente.')
      setShowEditModal(false)
      setEditingId(null)
      setEditingData({})
      initialEditingDataRef.current = null
      await fetchUsers()
    } catch (error) {
      console.error('Error al actualizar usuario:', error)
      setErrorMessage(error.message || 'No se pudo actualizar el usuario.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    handleCloseEditModal()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const user = users.find((u) => u.id === id)
      if (!user) throw new Error('Usuario no encontrado')

      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.user_id)

      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccessMessage('Usuario eliminado correctamente.')
      if (selectedUserId === user.user_id) {
        setSelectedUserId(null)
      }
      await fetchUsers()
    } catch (error) {
      console.error('Error al eliminar usuario:', error)
      setErrorMessage(error.message || 'No se pudo eliminar el usuario.')
    } finally {
      setSubmitting(false)
    }
  }

  // Funciones para importación CSV (mantener todas las funciones existentes)
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter((line) => line.trim())
    if (lines.length < 2) {
      throw new Error('El CSV debe tener al menos una fila de encabezados y una fila de datos')
    }

    const parseCSVLine = (line) => {
      const result = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase())
    const requiredHeaders = ['email', 'password', 'first_name', 'last_name']
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

    if (missingHeaders.length > 0) {
      throw new Error(`Faltan columnas requeridas: ${missingHeaders.join(', ')}`)
    }

    const data = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]).map((v) => v.replace(/^"|"$/g, '').trim())
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      if (row.email) {
        data.push(row)
      }
    }

    return data
  }

  const validateCSVRow = (row, index) => {
    const errors = []

    if (!row.email || !row.email.includes('@')) {
      errors.push(`Fila ${index + 1}: Email inválido o vacío`)
    }

    if (!row.password || row.password.length < 6) {
      errors.push(`Fila ${index + 1}: La contraseña debe tener al menos 6 caracteres`)
    }

    if (!row.first_name || row.first_name.trim() === '') {
      errors.push(`Fila ${index + 1}: El nombre es requerido`)
    }

    if (!row.last_name || row.last_name.trim() === '') {
      errors.push(`Fila ${index + 1}: El apellido es requerido`)
    }

    return errors
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setErrorMessage('Por favor, selecciona un archivo CSV')
      return
    }

    setCsvFile(file)
    setErrorMessage(null)
    setImportResults(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const csvText = event.target.result
        const parsedData = parseCSV(csvText)
        
        const validationErrors = []
        parsedData.forEach((row, index) => {
          const errors = validateCSVRow(row, index)
          validationErrors.push(...errors)
        })

        if (validationErrors.length > 0) {
          setErrorMessage(`Errores de validación:\n${validationErrors.join('\n')}`)
          setCsvPreview([])
          setShowPreview(false)
          return
        }

        setCsvPreview(parsedData)
        setShowPreview(true)
      } catch (error) {
        setErrorMessage(`Error al parsear CSV: ${error.message}`)
        setCsvPreview([])
        setShowPreview(false)
      }
    }

    reader.onerror = () => {
      setErrorMessage('Error al leer el archivo')
    }

    reader.readAsText(file, 'UTF-8')
  }

  const importUsersFromCSV = async () => {
    if (!csvPreview || csvPreview.length === 0) {
      setErrorMessage('No hay datos para importar')
      return
    }

    setImporting(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    setImportResults({
      total: csvPreview.length,
      success: [],
      errors: [],
      skipped: [],
    })

    const results = {
      total: csvPreview.length,
      success: [],
      errors: [],
      skipped: [],
    }

    const batchSize = 10
    for (let i = 0; i < csvPreview.length; i += batchSize) {
      const batch = csvPreview.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (row, batchIndex) => {
          const globalIndex = i + batchIndex
          try {
            const { data: existingProfile } = await supabase
              .from('user_profiles')
              .select('id, user_id')
              .eq('email', row.email)
              .maybeSingle()

            if (existingProfile) {
              results.skipped.push({
                row: globalIndex + 2,
                email: row.email,
                reason: 'El usuario ya existe',
              })
              return
            }

            const { data: authData, error: authError } = await supabase.auth.signUp({
              email: row.email,
              password: row.password,
            })

            if (authError) {
              if (authError.message.includes('already registered')) {
                results.skipped.push({
                  row: globalIndex + 2,
                  email: row.email,
                  reason: 'El usuario ya existe en auth.users',
                })
                return
              }
              throw authError
            }

            if (!authData.user) {
              throw new Error('No se pudo crear el usuario en auth.users')
            }

            const userId = authData.user.id

            const { error: profileError } = await supabase
              .from('user_profiles')
              .insert({
                user_id: userId,
                first_name: row.first_name,
                last_name: row.last_name,
                email: row.email,
              })

            if (profileError && !profileError.message.includes('duplicate')) {
              throw profileError
            }

            if (row.role && row.role.trim() !== '') {
              const role = roles.find((r) => r.name.toLowerCase() === row.role.trim().toLowerCase())
              if (role) {
                const { error: roleError } = await supabase
                  .from('user_roles')
                  .insert({
                    user_id: userId,
                    role_id: role.id,
                  })

                if (roleError && !roleError.message.includes('duplicate')) {
                  console.warn(`No se pudo asignar rol a ${row.email}:`, roleError)
                }
              }
            }

            results.success.push({
              row: globalIndex + 2,
              email: row.email,
              name: `${row.first_name} ${row.last_name}`,
            })
          } catch (error) {
            results.errors.push({
              row: globalIndex + 2,
              email: row.email,
              error: error.message || 'Error desconocido',
            })
          }
        })
      )
    }

    setImportResults(results)
    setImporting(false)
    setCsvFile(null)
    setCsvPreview([])
    setShowPreview(false)

    if (results.success.length > 0) {
      setSuccessMessage(`Se importaron ${results.success.length} de ${results.total} usuarios correctamente.`)
      await fetchUsers()
    }
  }

  const downloadTemplate = () => {
    const headers = ['email', 'password', 'first_name', 'last_name', 'role']
    const exampleRow = ['usuario@ejemplo.com', 'password123', 'Juan', 'Pérez', 'docente']
    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'plantilla_usuarios.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Funciones para gestión de docentes/tutores
  const fetchAllGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, grade, specialty, section, nomenclature')
        .order('nomenclature')

      if (error) throw error
      setAllGroups(data || [])

      // Cargar grupos que tienen tutores asignados
      const { data: tutorsData, error: tutorsError } = await supabase
        .from('teacher_groups')
        .select('group_id')
        .eq('is_tutor', true)

      if (!tutorsError && tutorsData) {
        const tutorGroupIds = new Set(tutorsData.map((t) => t.group_id))
        setGroupsWithTutors(tutorGroupIds)
      }
    } catch (error) {
      console.error('Error al cargar grupos:', error)
    }
  }

  const fetchTeacherGroups = async (teacherUserId) => {
    try {
      const { data, error } = await supabase
        .from('teacher_group_subjects')
        .select(`
          id,
          shift,
          subject:subjects!teacher_group_subjects_subject_id_fkey (
            id,
            subject_name
          ),
          group:groups (
            id,
            grade,
            specialty,
            section,
            nomenclature
          )
        `)
        .eq('teacher_id', teacherUserId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      const normalized = (data || []).map((entry) => ({
        ...entry,
        subject_name: entry.subject?.subject_name || 'Materia por asignar',
        group: Array.isArray(entry.group) ? entry.group[0] : entry.group,
      }))
      
      setTeacherGroups(normalized)
    } catch (error) {
      console.error('Error al cargar grupos del docente:', error)
      setTeacherGroups([])
    }
  }

  const fetchTutorGroup = async (teacherUserId) => {
    try {
      const { data, error } = await supabase
        .from('teacher_groups')
        .select(`
          id,
          is_tutor,
          group:groups (
            id,
            grade,
            specialty,
            section,
            nomenclature
          )
        `)
        .eq('teacher_id', teacherUserId)
        .eq('is_tutor', true)
        .maybeSingle()

      if (error) throw error
      
      // Normalizar los datos para mantener compatibilidad con el código existente
      if (data && data.group) {
        const group = Array.isArray(data.group) ? data.group[0] : data.group
        setTutorGroup({
          id: group.id,
          grade: group.grade,
          specialty: group.specialty,
          section: group.section,
          nomenclature: group.nomenclature,
        })
      } else {
        setTutorGroup(null)
      }
    } catch (error) {
      console.error('Error al cargar grupo del tutor:', error)
      setTutorGroup(null)
    }
  }

  const fetchTutorGroups = async (teacherUserId) => {
    try {
      const { data, error } = await supabase
        .from('teacher_groups')
        .select(`
          id,
          group:groups (
            id,
            grade,
            specialty,
            section,
            nomenclature
          )
        `)
        .eq('teacher_id', teacherUserId)
        .eq('is_tutor', true)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      const normalized = (data || []).map((entry) => ({
        id: entry.id,
        group: Array.isArray(entry.group) ? entry.group[0] : entry.group,
      }))
      
      setTutorGroups(normalized)
      return normalized
    } catch (error) {
      console.error('Error al cargar grupos del tutor:', error)
      setTutorGroups([])
      return []
    }
  }

  const fetchTeacherGroupsFromTeacherGroups = async (teacherUserId) => {
    try {
      // Traer TODOS los grupos donde el docente está asignado (tanto is_tutor = false como true)
      // porque si es tutor, también es docente del grupo
      const { data, error } = await supabase
        .from('teacher_groups')
        .select(`
          id,
          is_tutor,
          group:groups (
            id,
            grade,
            specialty,
            section,
            nomenclature
          )
        `)
        .eq('teacher_id', teacherUserId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      const normalized = (data || []).map((entry) => ({
        id: entry.id,
        is_tutor: entry.is_tutor,
        group: Array.isArray(entry.group) ? entry.group[0] : entry.group,
        source: 'teacher_groups',
      }))
      
      setTeacherGroupsFromTeacherGroups(normalized)
      return normalized
    } catch (error) {
      console.error('Error al cargar grupos del docente desde teacher_groups:', error)
      setTeacherGroupsFromTeacherGroups([])
      return []
    }
  }

  const openTeacherManagement = async (user) => {
    const hasDocenteRole = user.roles?.some((r) => 
      r.role_name?.toLowerCase() === 'docente'
    )

    if (!hasDocenteRole) {
      setErrorMessage('Este usuario no tiene el rol de docente.')
      return
    }

    setShowTeacherManagement(user.user_id)
    await Promise.all([
      fetchAllGroups(),
      fetchTeacherGroups(user.user_id),
      fetchTutorGroup(user.user_id),
    ])
    setTeacherForm({ groupId: '', subjectName: '', shift: 'matutino' })
  }

  const closeTeacherManagement = () => {
    setShowTeacherManagement(null)
    setTeacherGroups([])
    setTutorGroup(null)
    setTeacherForm({ groupId: '', subjectName: '', shift: 'matutino' })
  }

  const handleAddTeacherGroup = async () => {
    if (!teacherForm.groupId || !teacherForm.subjectName) {
      setErrorMessage('Por favor, completa todos los campos requeridos.')
      return
    }

    if (!showTeacherManagement) return

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const subjectId = await getOrCreateSubjectId(teacherForm.subjectName)
      const { error } = await supabase
        .from('teacher_group_subjects')
        .insert({
          teacher_id: showTeacherManagement,
          group_id: teacherForm.groupId,
          subject_id: subjectId,
          shift: teacherForm.shift === 'matutino' ? 'M' : 'V',
        })

      if (error) throw error

      setSuccessMessage('Grupo asignado correctamente como docente.')
      setTeacherForm({ groupId: '', subjectName: '', shift: 'matutino' })
      await fetchTeacherGroups(showTeacherManagement)
    } catch (error) {
      console.error('Error al asignar grupo:', error)
      setErrorMessage(error.message || 'No se pudo asignar el grupo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveTeacherGroup = async (teacherGroupSubjectId) => {
    if (!confirm('¿Estás seguro de que deseas remover este grupo del docente?')) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const { error } = await supabase
        .from('teacher_group_subjects')
        .delete()
        .eq('id', teacherGroupSubjectId)

      if (error) throw error

      setSuccessMessage('Grupo removido correctamente.')
      await fetchTeacherGroups(showTeacherManagement)
    } catch (error) {
      console.error('Error al remover grupo:', error)
      setErrorMessage(error.message || 'No se pudo remover el grupo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssignTutor = async (groupId) => {
    if (!showTeacherManagement) return

    // Verificar si el grupo ya tiene un tutor asignado
    const { data: existingTutor } = await supabase
      .from('teacher_groups')
      .select(`
        id,
        teacher_id,
        group:groups!teacher_groups_group_id_fkey (
          id,
          nomenclature
        )
      `)
      .eq('group_id', groupId)
      .eq('is_tutor', true)
      .maybeSingle()

    if (existingTutor && existingTutor.teacher_id !== showTeacherManagement) {
      const group = Array.isArray(existingTutor.group) ? existingTutor.group[0] : existingTutor.group
      if (!confirm(`El grupo ${group?.nomenclature || groupId} ya tiene un tutor asignado. ¿Deseas reemplazarlo?`)) {
        return
      }
      // Eliminar el tutor anterior
      await supabase
        .from('teacher_groups')
        .delete()
        .eq('id', existingTutor.id)
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Verificar si ya existe la relación (como docente)
      const { data: existing } = await supabase
        .from('teacher_groups')
        .select('id, is_tutor')
        .eq('teacher_id', showTeacherManagement)
        .eq('group_id', groupId)
        .maybeSingle()

      if (existing) {
        // Si ya existe, actualizar is_tutor a true
        const { error } = await supabase
          .from('teacher_groups')
          .update({ is_tutor: true })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Si no existe, insertar con is_tutor = true
        const { error } = await supabase
          .from('teacher_groups')
          .insert({
            teacher_id: showTeacherManagement,
            group_id: groupId,
            is_tutor: true,
          })

        if (error) throw error
      }

      setSuccessMessage('Tutor asignado correctamente.')
      await fetchTutorGroup(showTeacherManagement)
      await fetchAllGroups()
    } catch (error) {
      console.error('Error al asignar tutor:', error)
      setErrorMessage(error.message || 'No se pudo asignar el tutor.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveTutor = async () => {
    if (!tutorGroup) return

    if (!confirm(`¿Estás seguro de que deseas remover a este docente como tutor del grupo ${tutorGroup.nomenclature}?`)) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      // Eliminar el registro de tutor (o actualizar is_tutor a false si también es docente)
      // Primero verificar si también es docente del mismo grupo
      const { data: existing } = await supabase
        .from('teacher_groups')
        .select('id, is_tutor')
        .eq('teacher_id', showTeacherManagement)
        .eq('group_id', tutorGroup.id)
        .eq('is_tutor', true)
        .maybeSingle()

      if (existing) {
        // Verificar si también está como docente (is_tutor = false)
        const { data: asDocente } = await supabase
          .from('teacher_groups')
          .select('id')
          .eq('teacher_id', showTeacherManagement)
          .eq('group_id', tutorGroup.id)
          .eq('is_tutor', false)
          .maybeSingle()

        if (asDocente) {
          // Si también es docente, solo eliminar el registro de tutor
          const { error } = await supabase
            .from('teacher_groups')
            .delete()
            .eq('id', existing.id)

          if (error) throw error
        } else {
          // Si no es docente, eliminar completamente el registro
          const { error } = await supabase
            .from('teacher_groups')
            .delete()
            .eq('id', existing.id)

          if (error) throw error
        }
      }

      setSuccessMessage('Tutor removido correctamente.')
      await fetchTutorGroup(showTeacherManagement)
      await fetchAllGroups()
    } catch (error) {
      console.error('Error al remover tutor:', error)
      setErrorMessage(error.message || 'No se pudo remover el tutor.')
    } finally {
      setSubmitting(false)
    }
  }

  const formFields = [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'correo@ejemplo.com',
      required: true,
    },
    {
      name: 'password',
      label: 'Contraseña',
      type: 'password',
      placeholder: 'Mínimo 6 caracteres',
      required: true,
    },
    {
      name: 'first_name',
      label: 'Nombre',
      type: 'text',
      placeholder: 'Nombre(s)',
      required: true,
    },
    {
      name: 'last_name',
      label: 'Apellidos',
      type: 'text',
      placeholder: 'Apellidos',
      required: true,
    },
    {
      name: 'role_id',
      label: 'Rol',
      type: 'select',
      placeholder: 'Seleccionar rol',
      required: false,
      options: roles.map((role) => ({
        value: role.id,
        label: role.name,
      })),
    },
  ]

  const tableColumns = [
    {
      key: 'first_name',
      label: 'Nombre',
      render: (value, row) => `${row.first_name || ''} ${row.last_name || ''}`.trim() || '-',
    },
    {
      key: 'email',
      label: 'Email',
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (value, row) => {
        if (row.roles && row.roles.length > 0) {
          return (
            <div className="flex flex-wrap gap-1">
              {row.roles.map((r, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedRoleId(r.role_id)
                  }}
                  className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  {r.role_name}
                </button>
              ))}
            </div>
          )
        }
        return <span className="text-gray-500 dark:text-gray-400">Sin rol</span>
      },
    },
  ]

  // Calcular grupos para el badge - usar todos los grupos donde el docente está registrado
  const groupsCount = teacherGroupsFromTeacherGroups?.length || 0
  const userTabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'roles', label: 'Roles', badge: selectedUser?.roles?.length || 0 },
    { id: 'groups', label: 'Grupos', badge: groupsCount > 0 ? groupsCount : undefined },
  ]

  const roleTabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'users', label: 'Usuarios', badge: roleUsers.length },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader
        title="Gestión de Usuarios"
        description="Crea, edita y elimina usuarios del sistema. Asigna roles a los usuarios."
      />

      {errorMessage && <Alert type="error" message={errorMessage} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* Panel principal: Lista y Detalles (Layout vertical) */}
      <div className="space-y-4">
        {/* Tabla de usuarios */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Usuarios ({users.length})
            </h2>
            <div className="flex items-center gap-2">
              <ActionMenu
                selectedId={selectedUserId ? users.find((u) => u.user_id === selectedUserId)?.id : null}
                actions={[
                  {
                    label: 'Editar',
                    icon: '✏️',
                    onClick: (id) => {
                      const user = users.find((u) => u.id === id)
                      if (user) handleEdit(user.id)
                    },
                  },
                  {
                    label: 'Eliminar',
                    icon: '🗑️',
                    variant: 'danger',
                    onClick: (id) => {
                      const user = users.find((u) => u.id === id)
                      if (user) handleDelete(user.id)
                    },
                  },
                ]}
                disabled={submitting}
              />
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                Crear Nuevo Usuario
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Importar Usuarios
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Cargando usuarios...</p>
            </div>
          ) : (
            <SimpleTable
              columns={tableColumns}
              data={users}
              selectedId={selectedUserId ? users.find((u) => u.user_id === selectedUserId)?.id : null}
              onSelect={(id) => {
                const user = users.find((u) => u.id === id)
                if (user) handleSelect(user.id)
              }}
              loading={submitting}
              maxHeight="500px"
              collapsible={true}
              title="Lista de Usuarios"
              itemKey="id"
            />
          )}
        </div>

        {/* Detalles del usuario o rol seleccionado (debajo de la tabla) */}
        {selectedUserId && selectedUser ? (
          <DetailView
            selectedItem={selectedUser}
            title={`Detalles: ${selectedUser.first_name} ${selectedUser.last_name}`}
            tabs={userTabs}
            defaultTab={activeTab}
            collapsible={true}
            onCollapseChange={(collapsed) => {}}
            renderContent={(item, tab) => {
              if (tab === 'overview') {
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Información del Usuario
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nombre:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.first_name} {item.last_name}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Email:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">{item.email}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">User ID:</span>
                            <p className="text-xs text-gray-900 dark:text-white font-mono mt-1 break-all">{item.user_id}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Roles Asignados ({item.roles?.length || 0})
                        </h3>
                        {item.roles && item.roles.length > 0 ? (
                          <div className="space-y-2">
                            {item.roles.map((role, idx) => (
                              <button
                                key={idx}
                                onClick={() => setSelectedRoleId(role.role_id)}
                                className="w-full text-left p-2 bg-white dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                              >
                                <div className="font-medium text-sm text-gray-900 dark:text-white">
                                  {role.role_name}
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Este usuario no tiene roles asignados.</p>
                        )}
                      </div>
                    </div>

                  </div>
                )
              }

              if (tab === 'roles') {
                return (
                  <div className="space-y-2">
                    {item.roles && item.roles.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Rol
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Descripción
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {item.roles.map((role, idx) => (
                              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {role.role_name}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {roles.find(r => r.id === role.role_id)?.description || 'Sin descripción'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Este usuario no tiene roles asignados.
                      </p>
                    )}
                  </div>
                )
              }

              if (tab === 'groups') {
                // Todos los grupos donde el docente está asignado (tanto is_tutor = false como true)
                // porque si es tutor, también es docente del grupo
                const allTeacherGroups = teacherGroupsFromTeacherGroups || []
                const totalTeacherGroups = allTeacherGroups.length
                
                // Solo los grupos donde is_tutor = true
                const tutorGroupsList = allTeacherGroups.filter(tg => tg.is_tutor === true)
                const totalTutorGroups = tutorGroupsList.length

                return (
                  <div className="space-y-4">
                    {/* Grupos como Docente - SIEMPRE mostrar el título */}
                    {/* Muestra TODOS los grupos (tanto is_tutor = false como true) */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Grupos como Docente ({totalTeacherGroups})
                      </h3>
                      {totalTeacherGroups > 0 ? (
                        <div className="space-y-2">
                          {allTeacherGroups.map((tg) => (
                            <div
                              key={tg.id}
                              className={`p-3 rounded-lg border ${
                                tg.is_tutor === true
                                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {tg.group?.nomenclature || 'Sin nombre'}
                                  </p>
                                  {tg.group && (
                                    <p className={`text-xs mt-1 ${
                                      tg.is_tutor === true
                                        ? 'text-gray-600 dark:text-gray-400'
                                        : 'text-gray-500 dark:text-gray-500'
                                    }`}>
                                      {tg.group.grade}° {tg.group.specialty}
                                      {tg.group.section && ` • ${tg.group.section}`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No hay grupos asignados.
                        </p>
                      )}
                    </div>

                    {/* Grupos como Tutor - SIEMPRE mostrar el título */}
                    {/* Solo muestra grupos donde is_tutor = true */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Grupos como Tutor ({totalTutorGroups})
                      </h3>
                      {totalTutorGroups > 0 ? (
                        <div className="space-y-2">
                          {tutorGroupsList.map((tg) => (
                            <div
                              key={tg.id}
                              className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {tg.group?.nomenclature || 'Sin nombre'}
                                  </p>
                                  {tg.group && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      {tg.group.grade}° {tg.group.specialty}
                                      {tg.group.section && ` • Sección: ${tg.group.section}`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No hay grupos asignados.
                        </p>
                      )}
                    </div>
                  </div>
                )
              }

              return null
            }}
          />
        ) : selectedRoleId && selectedRole ? (
          <DetailView
            selectedItem={selectedRole}
            title={selectedRole.name}
            tabs={roleTabs}
            defaultTab={activeTab}
            collapsible={true}
            onCollapseChange={(collapsed) => {}}
            renderContent={(item, tab) => {
              if (tab === 'overview') {
                return (
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Información del Rol
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nombre:</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">{item.name}</p>
                        </div>
                        {item.description && (
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Descripción:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">{item.description}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Usuarios con este Rol ({roleUsers.length})
                      </h3>
                      {roleUsers.length > 0 ? (
                        <div className="space-y-2">
                          {roleUsers.map((user) => (
                            <button
                              key={user.user_id}
                              onClick={() => setSelectedUserId(user.user_id)}
                              className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <div className="font-medium text-sm text-gray-900 dark:text-white">
                                {user.first_name} {user.last_name}
                              </div>
                              {user.email && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {user.email}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No hay usuarios con este rol.</p>
                      )}
                    </div>
                  </div>
                )
              }

              if (tab === 'users') {
                return (
                  <div className="space-y-2">
                    {roleUsers.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Nombre
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Email
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Acción
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {roleUsers.map((user) => (
                              <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {user.first_name} {user.last_name}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {user.email || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <button
                                    onClick={() => setSelectedUserId(user.user_id)}
                                    className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                  >
                                    Ver roles
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No hay usuarios con este rol.
                      </p>
                    )}
                  </div>
                )
              }

              return null
            }}
          />
        ) : null}
      </div>

      {/* Modales */}
      {/* Modal de Crear Usuario */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => handleCloseCreateModal(() => setShowCreateModal(false))}
        title="Crear Nuevo Usuario"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <FormRow columns={2}>
            <FormField label="Email" htmlFor="email" required>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                placeholder="correo@ejemplo.com"
                required
              />
            </FormField>
            <FormField label="Contraseña" htmlFor="password" required>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleFormChange}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </FormField>
          </FormRow>
          
          <FormRow columns={2}>
            <FormField label="Nombre" htmlFor="first_name" required>
              <Input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleFormChange}
                placeholder="Nombre(s)"
                required
              />
            </FormField>
            <FormField label="Apellidos" htmlFor="last_name" required>
              <Input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleFormChange}
                placeholder="Apellidos"
                required
              />
            </FormField>
          </FormRow>
          
          <FormField label="Rol" htmlFor="role_id">
            <Select
              name="role_id"
              value={formData.role_id}
              onChange={handleFormChange}
              options={[
                { value: '', label: 'Seleccionar rol...' },
                ...roles.map((role) => ({ value: role.id, label: role.name })),
              ]}
            />
          </FormField>
          
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Creando...' : 'Crear Usuario'}
            </button>
            <button
              type="button"
              onClick={() => handleCloseCreateModal(() => setShowCreateModal(false))}
              disabled={submitting}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
          
          {/* Sección de Grupos y Tutor - Solo visible para roles Docente o Tutor */}
          {(formData.role_id && (() => {
            const selectedRole = roles.find((r) => r.id === formData.role_id)
            const roleName = selectedRole?.name?.toLowerCase() || ''
            return roleName === 'docente' || roleName === 'tutor'
          })()) && (
            <div className="pt-4 border-t border-gray-200 dark:border-slate-700 space-y-4">
              {/* Solo mostrar grupos si es Docente */}
              {(() => {
                const selectedRole = roles.find((r) => r.id === formData.role_id)
                const roleName = selectedRole?.name?.toLowerCase() || ''
                return roleName === 'docente' && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Asignar Grupos como Docente
                    </h3>
                    <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg p-3 space-y-3">
                      {allGroups.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No hay grupos disponibles</p>
                      ) : (
                        allGroups.map((group) => {
                          const isSelected = formData.selectedGroups?.some((g) => String(g.groupId) === String(group.id)) || false
                          const selectedGroupData = formData.selectedGroups?.find((g) => String(g.groupId) === String(group.id))
                          
                          return (
                            <div
                              key={group.id}
                              className={`p-3 border rounded-lg ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                  : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                            >
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked
                                    setFormData((prev) => {
                                      const currentGroups = prev.selectedGroups || []
                                      if (isChecked) {
                                        return {
                                          ...prev,
                                          selectedGroups: [...currentGroups, { groupId: group.id, shift: 'M' }],
                                        }
                                      } else {
                                        return {
                                          ...prev,
                                          selectedGroups: currentGroups.filter((g) => String(g.groupId) !== String(group.id)),
                                        }
                                      }
                                    })
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                                  {group.nomenclature} - {group.grade}° {group.specialty}
                                  {group.section && ` • ${group.section}`}
                                </span>
                              </label>
                              
                              {isSelected && (
                                <div className="mt-2 ml-6">
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Turno:
                                  </label>
                                  <select
                                    value={selectedGroupData?.shift || 'M'}
                                    onChange={(e) => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        selectedGroups: (prev.selectedGroups || []).map((g) =>
                                          String(g.groupId) === String(group.id) ? { ...g, shift: e.target.value } : g
                                        ),
                                      }))
                                    }}
                                    className="w-full rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-gray-900 dark:text-white"
                                  >
                                    <option value="M">Matutino</option>
                                    <option value="V">Vespertino</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })()}

              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Asignar como Tutor de Grupo
                </h3>
                <select
                  value={String(formData.tutorGroupId || '')}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tutorGroupId: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Seleccionar grupo (opcional)</option>
                  {allGroups.map((group) => (
                    <option key={group.id} value={String(group.id)}>
                      {group.nomenclature} - {group.grade}° {group.specialty}
                      {group.section && ` • ${group.section}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Selecciona un grupo si este usuario será tutor de ese grupo
                </p>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Modal de Importar Usuarios */}
      <Modal
        isOpen={showImportModal}
        onClose={() => handleCloseImportModal(() => setShowImportModal(false))}
        title="Importar Usuarios desde CSV"
        size="lg"
      >
        <CsvImporter
          entityType="users"
          requiredHeaders={['email', 'password', 'first_name', 'last_name']}
          templateHeaders={['email', 'password', 'first_name', 'last_name', 'role']}
          templateFileName="plantilla_usuarios.csv"
          onImport={handleCsvImport}
          onValidate={validateCsvRow}
        />
      </Modal>

      {/* Modal de Editar Usuario */}
      {showEditModal && editingId && (
        <Modal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          title="Editar Usuario"
          size="lg"
        >
          <div className="space-y-4">
            <FormRow columns={3}>
              <FormField label="Nombre" htmlFor="edit_first_name" required>
                <Input
                  type="text"
                  name="edit_first_name"
                  value={editingData.first_name || ''}
                  onChange={(e) => handleEditFieldChange(editingId, 'first_name', e.target.value)}
                />
              </FormField>
              <FormField label="Apellidos" htmlFor="edit_last_name" required>
                <Input
                  type="text"
                  name="edit_last_name"
                  value={editingData.last_name || ''}
                  onChange={(e) => handleEditFieldChange(editingId, 'last_name', e.target.value)}
                />
              </FormField>
              <FormField label="Email" htmlFor="edit_email" required>
                <Input
                  type="email"
                  name="edit_email"
                  value={editingData.email || ''}
                  onChange={(e) => handleEditFieldChange(editingId, 'email', e.target.value)}
                />
              </FormField>
            </FormRow>
            
            <FormField label="Rol" htmlFor="edit_role_id">
              <Select
                name="edit_role_id"
                value={editingData.role_id || ''}
                onChange={(e) => handleEditFieldChange(editingId, 'role_id', e.target.value)}
                options={[
                  { value: '', label: 'Sin rol' },
                  ...roles.map((role) => ({ value: role.id, label: role.name })),
                ]}
              />
            </FormField>

            {/* Sección de Grupos y Tutor - Solo visible para roles Docente o Tutor */}
            {editingData.role_id && (() => {
              const selectedRole = roles.find((r) => r.id === editingData.role_id)
              const roleName = selectedRole?.name?.toLowerCase() || ''
              return roleName === 'docente' || roleName === 'tutor'
            })() && (
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                {/* Solo mostrar grupos si es Docente */}
                {(() => {
                  const selectedRole = roles.find((r) => r.id === editingData.role_id)
                  const roleName = selectedRole?.name?.toLowerCase() || ''
                  return roleName === 'docente' && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Grupos como Docente
                      </h4>
                      <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg p-3 space-y-3">
                        {allGroups.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No hay grupos disponibles</p>
                        ) : (
                          allGroups.map((group) => {
                            const groupIdStr = String(group.id) // Normalizar a string
                            const isSelected = editingData.selectedGroups?.some((g) => String(g.groupId) === groupIdStr) || false
                            const selectedGroupData = editingData.selectedGroups?.find((g) => String(g.groupId) === groupIdStr)
                            
                            return (
                              <div
                                key={group.id}
                                className={`p-3 border rounded-lg ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                    : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                              >
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const isChecked = e.target.checked
                                      const currentGroups = editingData.selectedGroups || []
                                      if (isChecked) {
                                        handleEditFieldChange(editingId, 'selectedGroups', [
                                          ...currentGroups,
                                          { groupId: groupIdStr, shift: 'M' }, // Convertir a string
                                        ])
                                      } else {
                                        handleEditFieldChange(editingId, 'selectedGroups', 
                                          currentGroups.filter((g) => String(g.groupId) !== groupIdStr)
                                        )
                                      }
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                                    {group.nomenclature} - {group.grade}° {group.specialty}
                                    {group.section && ` • ${group.section}`}
                                  </span>
                                </label>
                                
                                {isSelected && (
                                  <div className="mt-2 ml-6">
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                      Turno:
                                    </label>
                                    <select
                                      value={selectedGroupData?.shift || 'M'}
                                      onChange={(e) => {
                                        const updatedGroups = (editingData.selectedGroups || []).map((g) =>
                                          String(g.groupId) === groupIdStr ? { ...g, shift: e.target.value } : g
                                        )
                                        handleEditFieldChange(editingId, 'selectedGroups', updatedGroups)
                                      }}
                                      className="w-full rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-gray-900 dark:text-white"
                                    >
                                      <option value="M">Matutino</option>
                                      <option value="V">Vespertino</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })()}

                <div>
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Grupo como Tutor
                  </h4>
                  <select
                    value={editingData.tutorGroupId || ''}
                    onChange={(e) => handleEditFieldChange(editingId, 'tutorGroupId', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">Seleccionar grupo (opcional)</option>
                    {allGroups.map((group) => (
                      <option key={group.id} value={String(group.id)}>
                        {group.nomenclature} - {group.grade}° {group.specialty}
                        {group.section && ` • ${group.section}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={() => handleSave(editingId)}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
