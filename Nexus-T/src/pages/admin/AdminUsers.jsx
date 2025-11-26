import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import CrudFormRow from '../../components/admin/CrudFormRow'
import SelectableTable from '../../components/admin/SelectableTable'
import DetailPanel from '../../components/admin/DetailPanel'

const INITIAL_FORM = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  role_id: '',
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
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  // Estados para importación CSV
  const [csvFile, setCsvFile] = useState(null)
  const [csvPreview, setCsvPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  // Estados para gestión de docentes/tutores
  const [teacherGroups, setTeacherGroups] = useState([])
  const [tutorGroup, setTutorGroup] = useState(null)
  const [allGroups, setAllGroups] = useState([])
  const [showTeacherManagement, setShowTeacherManagement] = useState(null)
  const [teacherForm, setTeacherForm] = useState({ groupId: '', subjectName: '', shift: 'matutino' })

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

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
    setFormData((prev) => ({ ...prev, [name]: value }))
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

      setSuccessMessage('Usuario creado/actualizado correctamente.')
      setFormData(INITIAL_FORM)
      await fetchUsers()
    } catch (error) {
      console.error('Error al crear usuario:', error)
      setErrorMessage(error.message || 'No se pudo crear/actualizar el usuario.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelect = (id) => {
    const user = users.find((u) => u.id === id)
    if (user) {
      setSelectedUserId(user.user_id)
      setActiveTab('overview')
    }
  }

  const handleEdit = (id) => {
    const user = users.find((u) => u.id === id)
    if (user) {
      setEditingId(id)
      setEditingData({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role_id: user.role_id || '',
      })
    }
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

      setSuccessMessage('Usuario actualizado correctamente.')
      setEditingId(null)
      setEditingData({})
      await fetchUsers()
    } catch (error) {
      console.error('Error al actualizar usuario:', error)
      setErrorMessage(error.message || 'No se pudo actualizar el usuario.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingData({})
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
        .select('id, grade, specialty, section, nomenclature, tutor_id')
        .order('nomenclature')

      if (error) throw error
      setAllGroups(data || [])
    } catch (error) {
      console.error('Error al cargar grupos:', error)
    }
  }

  const fetchTeacherGroups = async (teacherUserId) => {
    try {
      const { data, error } = await supabase
        .from('teacher_subjects')
        .select(`
          id,
          subject_name,
          shift,
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
        .from('groups')
        .select('id, grade, specialty, section, nomenclature')
        .eq('tutor_id', teacherUserId)
        .maybeSingle()

      if (error) throw error
      setTutorGroup(data)
    } catch (error) {
      console.error('Error al cargar grupo del tutor:', error)
      setTutorGroup(null)
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
      const { error } = await supabase
        .from('teacher_subjects')
        .insert({
          teacher_id: showTeacherManagement,
          group_id: teacherForm.groupId,
          subject_name: teacherForm.subjectName,
          shift: teacherForm.shift,
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

  const handleRemoveTeacherGroup = async (teacherSubjectId) => {
    if (!confirm('¿Estás seguro de que deseas remover este grupo del docente?')) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const { error } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('id', teacherSubjectId)

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

    const { data: existingGroup } = await supabase
      .from('groups')
      .select('tutor_id, nomenclature')
      .eq('id', groupId)
      .single()

    if (existingGroup?.tutor_id && existingGroup.tutor_id !== showTeacherManagement) {
      if (!confirm(`El grupo ${existingGroup.nomenclature} ya tiene un tutor asignado. ¿Deseas reemplazarlo?`)) {
        return
      }
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const { error } = await supabase
        .from('groups')
        .update({ tutor_id: showTeacherManagement })
        .eq('id', groupId)

      if (error) throw error

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
      const { error } = await supabase
        .from('groups')
        .update({ tutor_id: null })
        .eq('id', tutorGroup.id)

      if (error) throw error

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

  const userTabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'roles', label: 'Roles', badge: selectedUser?.roles?.length || 0 },
  ]

  const roleTabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'users', label: 'Usuarios', badge: roleUsers.length },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Gestión de Usuarios
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2">
          Crea, edita y elimina usuarios del sistema. Asigna roles a los usuarios.
        </p>
      </header>

      {(errorMessage || successMessage) && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            errorMessage
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
          }`}
        >
          {errorMessage ?? successMessage}
        </div>
      )}

      {/* Sección de importación CSV y creación */}
      <div className="mb-6 space-y-4">
        {/* Importación CSV */}
        <section className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Importar Usuarios desde CSV
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={importing}
                />
                <div className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {csvFile ? `Archivo seleccionado: ${csvFile.name}` : 'Seleccionar archivo CSV'}
                </div>
              </label>
              <button
                onClick={downloadTemplate}
                className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium whitespace-nowrap"
              >
                📥 Descargar plantilla
              </button>
            </div>

            {showPreview && csvPreview.length > 0 && (
              <div className="mt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Vista previa: {csvPreview.length} usuario(s)
                  </h3>
                  <button
                    onClick={importUsersFromCSV}
                    disabled={importing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {importing ? 'Importando...' : 'Confirmar importación'}
                  </button>
                </div>
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nombre</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Apellido</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rol</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {csvPreview.slice(0, 10).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{row.email}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{row.first_name}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{row.last_name}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{row.role || 'Sin rol'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvPreview.length > 10 && (
                    <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                      Mostrando 10 de {csvPreview.length} usuarios
                    </div>
                  )}
                </div>
              </div>
            )}

            {importResults && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Resultados de la importación
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{importResults.success.length}</div>
                    <div className="text-xs text-green-700 dark:text-green-300">Exitosos</div>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{importResults.errors.length}</div>
                    <div className="text-xs text-red-700 dark:text-red-300">Errores</div>
                  </div>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{importResults.skipped.length}</div>
                    <div className="text-xs text-yellow-700 dark:text-yellow-300">Omitidos</div>
                  </div>
                </div>
                {importResults.errors.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">Errores:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {importResults.errors.map((error, index) => (
                        <div key={index} className="text-xs text-red-600 dark:text-red-400">
                          Fila {error.row} ({error.email}): {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {importResults.skipped.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-2">Omitidos:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {importResults.skipped.map((skip, index) => (
                        <div key={index} className="text-xs text-yellow-600 dark:text-yellow-400">
                          Fila {skip.row} ({skip.email}): {skip.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Crear Nuevo Usuario */}
        <section className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Crear Nuevo Usuario
            </h2>
          </div>
          <form onSubmit={handleCreate}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {formFields.map((field) => (
                    <th
                      key={field.name}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {field.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                <CrudFormRow
                  fields={formFields}
                  formData={formData}
                  onChange={handleFormChange}
                  onSubmit={handleCreate}
                  loading={submitting}
                  submitLabel="Crear"
                />
              </tbody>
            </table>
          </form>
        </section>
      </div>

      {/* Panel principal: Lista y Detalles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo: Lista de usuarios */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Usuarios ({users.length})
            </h2>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Cargando usuarios...</p>
              </div>
            ) : (
              <SelectableTable
                columns={tableColumns}
                data={users}
                selectedId={selectedUserId ? users.find((u) => u.user_id === selectedUserId)?.id : null}
                onSelect={handleSelect}
                onEdit={handleEdit}
                onDelete={handleDelete}
                loading={submitting}
              />
            )}
          </div>
        </div>

        {/* Panel derecho: Detalles del usuario o rol seleccionado */}
        <div>
          {selectedUserId && selectedUser ? (
            <DetailPanel
              title={`${selectedUser.first_name} ${selectedUser.last_name}`}
              breadcrumb={[
                { label: 'Usuarios', onClick: () => setSelectedUserId(null) },
                { label: `${selectedUser.first_name} ${selectedUser.last_name}` },
              ]}
              tabs={userTabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            >
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Información del Usuario
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre:</span>{' '}
                        <span className="text-sm text-gray-900 dark:text-white">
                          {selectedUser.first_name} {selectedUser.last_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email:</span>{' '}
                        <span className="text-sm text-gray-900 dark:text-white">{selectedUser.email}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">User ID:</span>{' '}
                        <span className="text-sm text-gray-900 dark:text-white font-mono text-xs">{selectedUser.user_id}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Roles Asignados ({selectedUser.roles?.length || 0})
                    </h3>
                    {selectedUser.roles && selectedUser.roles.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUser.roles.map((role, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedRoleId(role.role_id)}
                            className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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

                  {selectedUser.roles?.some((r) => r.role_name?.toLowerCase() === 'docente') && (
                    <div>
                      <button
                        onClick={() => openTeacherManagement(selectedUser)}
                        className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition-colors"
                      >
                        Gestionar Grupos del Docente
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'roles' && (
                <div className="space-y-2">
                  {selectedUser.roles && selectedUser.roles.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Rol
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Acción
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {selectedUser.roles.map((role, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                {role.role_name}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                <button
                                  onClick={() => setSelectedRoleId(role.role_id)}
                                  className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                >
                                  Ver usuarios
                                </button>
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
              )}
            </DetailPanel>
          ) : selectedRoleId && selectedRole ? (
            <DetailPanel
              title={selectedRole.name}
              breadcrumb={[
                { label: 'Usuarios', onClick: () => setSelectedRoleId(null) },
                { label: selectedRole.name },
              ]}
              tabs={roleTabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            >
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Información del Rol
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre:</span>{' '}
                        <span className="text-sm text-gray-900 dark:text-white">{selectedRole.name}</span>
                      </div>
                      {selectedRole.description && (
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Descripción:</span>{' '}
                          <span className="text-sm text-gray-900 dark:text-white">{selectedRole.description}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
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
              )}

              {activeTab === 'users' && (
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">No hay usuarios con este rol.</p>
                  )}
                </div>
              )}
            </DetailPanel>
          ) : (
            <DetailPanel emptyMessage="Selecciona un usuario o haz click en un rol para ver sus detalles" />
          )}
        </div>
      </div>

      {/* Modal de gestión de grupos para docentes */}
      {showTeacherManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Gestión de Grupos - Docente
                </h2>
                <button
                  onClick={closeTeacherManagement}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Grupos donde es Docente ({teacherGroups.length})
                </h3>
                {teacherGroups.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No tiene grupos asignados como docente.</p>
                ) : (
                  <div className="space-y-2">
                    {teacherGroups.map((tg) => (
                      <div
                        key={tg.id}
                        className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {tg.group?.nomenclature || 'Grupo desconocido'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {tg.subject_name} - {tg.shift}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveTeacherGroup(tg.id)}
                          disabled={submitting}
                          className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Agregar Grupo como Docente
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      value={teacherForm.groupId}
                      onChange={(e) => setTeacherForm({ ...teacherForm, groupId: e.target.value })}
                      className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="">Seleccionar grupo</option>
                      {allGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.nomenclature}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Nombre de la materia"
                      value={teacherForm.subjectName}
                      onChange={(e) => setTeacherForm({ ...teacherForm, subjectName: e.target.value })}
                      className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                    <select
                      value={teacherForm.shift}
                      onChange={(e) => setTeacherForm({ ...teacherForm, shift: e.target.value })}
                      className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="matutino">Matutino</option>
                      <option value="vespertino">Vespertino</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddTeacherGroup}
                    disabled={submitting}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Agregar Grupo
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Grupo como Tutor
                </h3>
                {tutorGroup ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {tutorGroup.nomenclature}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {tutorGroup.grade}° {tutorGroup.specialty}
                          {tutorGroup.section && ` • Sección: ${tutorGroup.section}`}
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveTutor}
                        disabled={submitting}
                        className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Remover como Tutor
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      No está asignado como tutor de ningún grupo.
                    </p>
                    <select
                      value={teacherForm.groupId}
                      onChange={(e) => {
                        const groupId = e.target.value
                        if (groupId) {
                          handleAssignTutor(groupId)
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="">Seleccionar grupo para asignar como tutor</option>
                      {allGroups
                        .filter((g) => !g.tutor_id || g.tutor_id === showTeacherManagement)
                        .map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.nomenclature}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
