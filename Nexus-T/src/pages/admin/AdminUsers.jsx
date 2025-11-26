import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import CrudFormRow from '../../components/admin/CrudFormRow'
import CrudTable from '../../components/admin/CrudTable'

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
  const [editingId, setEditingId] = useState(null)
  const [editingData, setEditingData] = useState({})
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

  // Cargar usuarios con sus roles
  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      // Obtener todos los perfiles de usuario
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, user_id, first_name, last_name, email')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Obtener roles asignados para cada usuario
      const userIds = profiles.map((p) => p.user_id)
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role_id, roles(name)')
        .in('user_id', userIds)

      if (rolesError) throw rolesError

      // Crear mapa de roles por usuario
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

      // Combinar perfiles con roles
      const usersWithRoles = profiles.map((profile) => ({
        id: profile.id,
        user_id: profile.user_id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        roles: rolesMap.get(profile.user_id) || [],
        role_id: rolesMap.get(profile.user_id)?.[0]?.role_id || '', // Primer rol para mostrar en tabla
      }))

      setUsers(usersWithRoles)
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
      setErrorMessage('No se pudieron cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
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
      // Verificar si el email ya existe en user_profiles
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id, user_id')
        .eq('email', formData.email)
        .maybeSingle()

      let userId

      if (existingProfile) {
        // Si el perfil ya existe, usar el user_id existente
        userId = existingProfile.user_id
        
        // Actualizar perfil existente
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
        // Crear nuevo usuario en auth.users primero
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        })

        // Si el error es que el usuario ya existe, buscar el perfil
        if (authError && authError.message.includes('already registered')) {
          // El usuario ya existe en auth.users, pero no tiene perfil
          // Necesitamos obtener el user_id de alguna manera
          // Intentamos buscar en user_profiles de nuevo (por si se creó entre tanto)
          const { data: profileCheck } = await supabase
            .from('user_profiles')
            .select('id, user_id')
            .eq('email', formData.email)
            .maybeSingle()

          if (profileCheck) {
            userId = profileCheck.user_id
          } else {
            throw new Error('El usuario ya existe en auth.users pero no se pudo obtener su ID. Por favor, contacta al administrador.')
          }
        } else if (authError) {
          throw authError
        } else if (!authData.user) {
          throw new Error('No se pudo crear el usuario en auth.users')
        } else {
          userId = authData.user.id
        }

        // Crear nuevo perfil solo si no existe
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

          // Si el error es que ya existe (por trigger), no es crítico
          if (insertError && !insertError.message.includes('duplicate') && !insertError.message.includes('already exists')) {
            throw insertError
          }
        }
      }

      // Asignar rol si se seleccionó uno
      if (formData.role_id && userId) {
        // Verificar si ya tiene ese rol
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

      // Actualizar perfil
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
        // Eliminar rol anterior si existía
        if (user.role_id) {
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', user.user_id)
            .eq('role_id', user.role_id)
        }

        // Asignar nuevo rol
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

      // Eliminar roles primero
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.user_id)

      // Eliminar perfil
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccessMessage('Usuario eliminado correctamente.')
      await fetchUsers()
    } catch (error) {
      console.error('Error al eliminar usuario:', error)
      setErrorMessage(error.message || 'No se pudo eliminar el usuario.')
    } finally {
      setSubmitting(false)
    }
  }

  // Funciones para importación CSV
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter((line) => line.trim())
    if (lines.length < 2) {
      throw new Error('El CSV debe tener al menos una fila de encabezados y una fila de datos')
    }

    // Función simple para parsear CSV (maneja comillas básicas)
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
      // Solo agregar filas que tengan al menos email
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
        
        // Validar todas las filas
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

    // Procesar usuarios en batch (10 a la vez)
    const batchSize = 10
    for (let i = 0; i < csvPreview.length; i += batchSize) {
      const batch = csvPreview.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (row, batchIndex) => {
          const globalIndex = i + batchIndex
          try {
            // Verificar si el email ya existe
            const { data: existingProfile } = await supabase
              .from('user_profiles')
              .select('id, user_id')
              .eq('email', row.email)
              .maybeSingle()

            if (existingProfile) {
              results.skipped.push({
                row: globalIndex + 2, // +2 porque la fila 1 es el header
                email: row.email,
                reason: 'El usuario ya existe',
              })
              return
            }

            // Crear usuario en auth.users
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

            // Crear perfil
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

            // Asignar rol si se especificó
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
      key: 'user_id',
      label: 'User ID',
      type: 'text',
      editable: false, // user_id no se puede editar (es de auth.users)
    },
    {
      key: 'first_name',
      label: 'Nombre',
      type: 'text',
    },
    {
      key: 'last_name',
      label: 'Apellidos',
      type: 'text',
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email',
    },
    {
      key: 'role_id',
      label: 'Rol',
      type: 'select',
      options: roles.map((role) => ({
        value: role.id,
        label: role.name,
      })),
      render: (value, row) => {
        if (row.roles && row.roles.length > 0) {
          return row.roles.map((r) => r.role_name).join(', ')
        }
        return 'Sin rol'
      },
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Gestión de Usuarios
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
          Crea, edita y elimina usuarios del sistema. Asigna roles a los usuarios.
        </p>
      </header>

      {(errorMessage || successMessage) && (
        <div
          className={`p-4 rounded-lg border ${
            errorMessage
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
          }`}
        >
          {errorMessage ?? successMessage}
        </div>
      )}

      {/* Sección de importación CSV */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Importar Usuarios desde CSV
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Importa múltiples usuarios desde un archivo CSV. El archivo debe tener las columnas: email, password, first_name, last_name, role (opcional).
          </p>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
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

          {/* Preview de datos */}
          {showPreview && csvPreview.length > 0 && (
            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Vista previa: {csvPreview.length} usuario(s) encontrado(s)
                </h3>
                <button
                  onClick={importUsersFromCSV}
                  disabled={importing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Reporte de resultados */}
          {importResults && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Resultados de la importación
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
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

      <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
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

      <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Usuarios Registrados ({users.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Cargando usuarios...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No hay usuarios registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <CrudTable
              columns={tableColumns}
              data={users.map((user) => ({
                ...user,
                ...(editingId === user.id ? editingData : {}),
              }))}
              onEdit={handleEdit}
              onFieldChange={handleEditFieldChange}
              onSave={handleSave}
              onCancel={handleCancel}
              onDelete={handleDelete}
              editingId={editingId}
              loading={submitting}
            />
          </div>
        )}
      </section>
    </div>
  )
}

