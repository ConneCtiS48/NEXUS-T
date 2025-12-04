import { useEffect, useState, useRef } from 'react'
import { useAdminUsers } from '../../hooks/useAdminUsers'
import { usersService } from '../../services/usersService'
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
  // Hook con lógica de datos
  const {
    users,
    selectedUser,
    userGroups,
    allRoles,
    allGroups,
    loading,
    error,
    fetchUsers,
    fetchUserDetails,
    createUser,
    updateUser,
    deleteUser,
    clearSelection,
    setError,
    updateUserRole,
    updateUserGroups,
  } = useAdminUsers()

  // Estados de UI
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Estados de modales
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Estados de formularios
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [editingData, setEditingData] = useState({})
  const initialEditingDataRef = useRef(null)
  const initialFormDataRef = useRef(JSON.stringify(INITIAL_FORM))
  const hasFormChanges = useRef(false)

  // Sincronizar error del hook con errorMessage de UI
  useEffect(() => {
    if (error) {
      setErrorMessage(error)
    }
  }, [error])

  // Cargar detalles cuando se selecciona un usuario
  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetails(selectedUserId)
    } else {
      clearSelection()
    }
  }, [selectedUserId, fetchUserDetails, clearSelection])

  const handleSelect = (id) => {
    const user = users.find((u) => u.id === id)
    if (user) {
      setSelectedUserId(user.user_id)
      setActiveTab('overview')
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }
      const currentDataStr = JSON.stringify(newData)
      hasFormChanges.current = currentDataStr !== initialFormDataRef.current
      return newData
    })
  }

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

  const handleOpenCreateModal = () => {
    setFormData(INITIAL_FORM)
    hasFormChanges.current = false
    initialFormDataRef.current = JSON.stringify(INITIAL_FORM)
    setShowCreateModal(true)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Crear usuario
      const result = await createUser(formData, formData.password)
      
      if (!result.success) {
        setErrorMessage(result.error?.message || 'No se pudo crear el usuario.')
        setSubmitting(false)
        return
      }

      const userId = result.data.user_id

      // Asignar rol si se especificó
      if (formData.role_id) {
        await updateUserRole(userId, null, formData.role_id)
      }

      // Asignar grupos si es docente
      const selectedRole = allRoles.find((r) => r.id === formData.role_id)
      if (selectedRole?.name?.toLowerCase() === 'docente') {
        if (formData.selectedGroups?.length > 0 || formData.tutorGroupId) {
          await updateUserGroups(userId, formData.selectedGroups || [], formData.tutorGroupId)
        }
      }

      setSuccessMessage('Usuario creado correctamente.')
      setFormData(INITIAL_FORM)
      hasFormChanges.current = false
      initialFormDataRef.current = JSON.stringify(INITIAL_FORM)
      setShowCreateModal(false)
      await fetchUsers()
    } catch (err) {
      console.error('Error al crear usuario:', err)
      setErrorMessage(err.message || 'No se pudo crear el usuario.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (id) => {
    const user = users.find((u) => u.id === id)
    if (!user) {
      setErrorMessage('Usuario no encontrado')
      return
    }
    
    setEditingId(id)
    
    // Inicializar con datos básicos
    const editData = {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      role_id: user.role_id || '',
      selectedGroups: [],
      tutorGroupId: '',
    }
    
    // Cargar grupos del usuario
    const userGroupsData = await usersService.fetchUserGroups(user.user_id)
    if (userGroupsData.data) {
      const docenteGroups = userGroupsData.data.filter((ug) => !ug.is_tutor)
      const tutorGroup = userGroupsData.data.find((ug) => ug.is_tutor)
      
      editData.selectedGroups = docenteGroups.map((ug) => ({
        groupId: String(ug.group?.id),
        shift: ug.group?.shift || 'M',
      }))
      
      if (tutorGroup) {
        editData.tutorGroupId = String(tutorGroup.group?.id)
      }
    }
    
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

      // Actualizar perfil
      const updateResult = await updateUser(id, editingData)
      if (!updateResult.success) {
        throw updateResult.error
      }

      // Actualizar rol si cambió
      if (editingData.role_id !== user.role_id) {
        await updateUserRole(user.user_id, user.role_id, editingData.role_id)
      }

      // Actualizar grupos si es docente
      const selectedRole = allRoles.find((r) => r.id === editingData.role_id)
      if (selectedRole?.name?.toLowerCase() === 'docente') {
        await updateUserGroups(user.user_id, editingData.selectedGroups || [], editingData.tutorGroupId)
      } else {
        // Si no es docente, limpiar asignaciones
        await updateUserGroups(user.user_id, [], '')
      }

      setSuccessMessage('Usuario actualizado correctamente.')
      setShowEditModal(false)
      setEditingId(null)
      setEditingData({})
      initialEditingDataRef.current = null
      await fetchUsers()
    } catch (err) {
      console.error('Error al actualizar usuario:', err)
      setErrorMessage(err.message || 'No se pudo actualizar el usuario.')
    } finally {
      setSubmitting(false)
    }
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

      const success = await deleteUser(user.user_id, id)
      
      if (success) {
        setSuccessMessage('Usuario eliminado correctamente.')
        if (selectedUserId === user.user_id) {
          setSelectedUserId(null)
        }
      } else {
        setErrorMessage(error || 'No se pudo eliminar el usuario.')
      }
    } catch (err) {
      console.error('Error al eliminar usuario:', err)
      setErrorMessage(err.message || 'No se pudo eliminar el usuario.')
    } finally {
      setSubmitting(false)
    }
  }

  // Funciones para importación CSV
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

    const results = {
      success: [],
      errors: [],
      skipped: [],
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const validationError = validateCsvRow(row, i + 1)
        if (validationError) {
          results.errors.push({
            row: i + 1,
            email: row.email || 'N/A',
            error: validationError,
          })
          continue
        }

        const userData = {
          email: row.email.trim(),
          first_name: row.first_name.trim(),
          last_name: row.last_name.trim(),
        }

        const result = await createUser(userData, row.password)

        if (!result.success) {
          if (result.error?.message?.includes('already')) {
            results.skipped.push({
              row: i + 1,
              email: row.email,
              reason: 'Usuario ya existe',
            })
          } else {
            results.errors.push({
              row: i + 1,
              email: row.email,
              error: result.error?.message || 'Error desconocido',
            })
          }
          continue
        }

        // Asignar rol si se especificó
        if (row.role && row.role.trim()) {
          const role = allRoles.find((r) => r.name.toLowerCase() === row.role.trim().toLowerCase())
          if (role) {
            await updateUserRole(result.data.user_id, null, role.id)
          }
        }

        results.success.push({
          row: i + 1,
          email: row.email,
        })
      } catch (err) {
        results.errors.push({
          row: i + 1,
          email: row.email || 'N/A',
          error: err.message || 'Error desconocido',
        })
      }
    }

    setSuccessMessage(`Importación completada: ${results.success.length} exitosos, ${results.errors.length} errores, ${results.skipped.length} omitidos`)
    
    if (results.success.length > 0) {
      await fetchUsers()
    }

    setSubmitting(false)
  }

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
                <span
                  key={idx}
                  className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded"
                >
                  {r.role_name}
                </span>
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
    { id: 'groups', label: 'Grupos', badge: userGroups.length > 0 ? userGroups.length : undefined },
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
                    onClick: (id) => handleEdit(id),
                  },
                  {
                    label: 'Eliminar',
                    icon: '🗑️',
                    variant: 'danger',
                    onClick: (id) => handleDelete(id),
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
              onSelect={(id) => handleSelect(id)}
              loading={submitting}
              maxHeight="500px"
              collapsible={true}
              title="Lista de Usuarios"
              itemKey="id"
            />
          )}
        </div>

        {/* Detalles del usuario seleccionado (debajo de la tabla) */}
        {selectedUserId && selectedUser ? (
          <DetailView
            selectedItem={selectedUser}
            title={`Detalles: ${selectedUser.first_name} ${selectedUser.last_name}`}
            tabs={userTabs}
            defaultTab={activeTab}
            collapsible={true}
            onCollapseChange={() => {}}
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
                              <div
                                key={idx}
                                className="p-2 bg-white dark:bg-gray-700 rounded"
                              >
                                <div className="font-medium text-sm text-gray-900 dark:text-white">
                                  {role.role_name}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Este usuario no tiene roles asignados.
                          </p>
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
                                  {allRoles.find(r => r.id === role.role_id)?.description || 'Sin descripción'}
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
                const allTeacherGroups = userGroups || []
                const tutorGroupsList = allTeacherGroups.filter(tg => tg.is_tutor === true)

                return (
                  <div className="space-y-4">
                    {/* Grupos como Docente */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Grupos como Docente ({allTeacherGroups.length})
                      </h3>
                      {allTeacherGroups.length > 0 ? (
                        <div className="space-y-2">
                          {allTeacherGroups.map((tg) => (
                            <div
                              key={tg.id}
                              className={`p-3 rounded-lg border ${
                                tg.is_tutor
                                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {tg.group?.nomenclature || 'Sin nombre'}
                              </p>
                              {tg.group && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {tg.group.grade}° {tg.group.specialty}
                                  {tg.group.section && ` • ${tg.group.section}`}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No hay grupos asignados.
                        </p>
                      )}
                    </div>

                    {/* Grupos como Tutor */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Grupos como Tutor ({tutorGroupsList.length})
                      </h3>
                      {tutorGroupsList.length > 0 ? (
                        <div className="space-y-2">
                          {tutorGroupsList.map((tg) => (
                            <div
                              key={tg.id}
                              className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800"
                            >
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
                ...allRoles.map((role) => ({ value: role.id, label: role.name })),
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
            const selectedRole = allRoles.find((r) => r.id === formData.role_id)
            const roleName = selectedRole?.name?.toLowerCase() || ''
            return roleName === 'docente' || roleName === 'tutor'
          })()) && (
            <div className="pt-4 border-t border-gray-200 dark:border-slate-700 space-y-4">
              {/* Solo mostrar grupos si es Docente */}
              {(() => {
                const selectedRole = allRoles.find((r) => r.id === formData.role_id)
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
                                          selectedGroups: [...currentGroups, { groupId: group.id, shift: group.shift || 'M' }],
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
        onClose={() => setShowImportModal(false)}
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
                  ...allRoles.map((role) => ({ value: role.id, label: role.name })),
                ]}
              />
            </FormField>

            {/* Sección de Grupos y Tutor - Solo visible para roles Docente o Tutor */}
            {editingData.role_id && (() => {
              const selectedRole = allRoles.find((r) => r.id === editingData.role_id)
              const roleName = selectedRole?.name?.toLowerCase() || ''
              return roleName === 'docente' || roleName === 'tutor'
            })() && (
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                {/* Solo mostrar grupos si es Docente */}
                {(() => {
                  const selectedRole = allRoles.find((r) => r.id === editingData.role_id)
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
                            const groupIdStr = String(group.id)
                            const isSelected = editingData.selectedGroups?.some((g) => String(g.groupId) === groupIdStr) || false
                            
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
                                          { groupId: groupIdStr, shift: group.shift || 'M' },
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
                onClick={handleCloseEditModal}
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
