import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import SimpleTable from '../../components/data/SimpleTable'
import DetailView from '../../components/data/DetailView'
import ActionMenu from '../../components/data/ActionMenu'
import Modal from '../../components/base/Modal'
import Input from '../../components/forms/Input'
import FormField from '../../components/forms/FormField'
import FormRow from '../../components/forms/FormRow'
import PageHeader from '../../components/layout/PageHeader'
import Alert from '../../components/base/Alert'

export default function AdminRoles() {
  // Estados de datos
  const [roles, setRoles] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)
  const [roleUsers, setRoleUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Estados para modales
  const [showEditModal, setShowEditModal] = useState(false)
  const [showManageUsersModal, setShowManageUsersModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingData, setEditingData] = useState({ name: '', description: '' })
  const [usersSearch, setUsersSearch] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])

  useEffect(() => {
    fetchRoles()
  }, [])

  useEffect(() => {
    if (selectedRoleId) {
      fetchRoleDetails(selectedRoleId)
    } else {
      setSelectedRole(null)
      setRoleUsers([])
    }
  }, [selectedRoleId])

  const fetchRoles = async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description')
        .order('name')

      if (error) throw error
      setRoles(data || [])
    } catch (error) {
      console.error('Error al cargar roles:', error)
      setErrorMessage('No se pudieron cargar los roles.')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoleDetails = async (roleId) => {
    try {
      // Obtener información del rol
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id, name, description')
        .eq('id', roleId)
        .single()

      if (roleError) throw roleError
      setSelectedRole(roleData)

      // Query 1: Obtener user_ids con este rol
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role_id', roleId)

      if (userRolesError) throw userRolesError

      // Si no hay usuarios asignados, retornar vacío
      if (!userRolesData || userRolesData.length === 0) {
        setRoleUsers([])
        return
      }

      const userIds = userRolesData.map((ur) => ur.user_id)

      // Query 2: Obtener perfiles de usuarios
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, user_id, first_name, last_name, email')
        .in('user_id', userIds)

      if (usersError) throw usersError

      setRoleUsers(usersData || [])
    } catch (error) {
      console.error('Error al cargar detalles del rol:', error)
      setErrorMessage('No se pudieron cargar los detalles del rol.')
    }
  }

  const handleSelect = (id) => {
    setSelectedRoleId(id)
    setActiveTab('overview')
  }

  const handleEdit = (id) => {
    const role = roles.find((r) => r.id === id)
    if (role) {
      setEditingId(id)
      setEditingData({
        name: role.name || '',
        description: role.description || '',
      })
      setShowEditModal(true)
    }
  }

  const handleSave = async () => {
    if (!editingId) return

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const { error } = await supabase
        .from('roles')
        .update({
          name: editingData.name,
          description: editingData.description,
        })
        .eq('id', editingId)

      if (error) throw error

      setSuccessMessage('Rol actualizado correctamente.')
      setShowEditModal(false)
      setEditingId(null)
      setEditingData({ name: '', description: '' })
      await fetchRoles()
      
      // Si es el rol seleccionado, actualizar detalles
      if (selectedRoleId === editingId) {
        await fetchRoleDetails(editingId)
      }
    } catch (error) {
      console.error('Error al actualizar rol:', error)
      setErrorMessage(error.message || 'No se pudo actualizar el rol.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este rol?')) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccessMessage('Rol eliminado correctamente.')
      if (selectedRoleId === id) {
        setSelectedRoleId(null)
      }
      await fetchRoles()
    } catch (error) {
      console.error('Error al eliminar rol:', error)
      setErrorMessage(error.message || 'No se pudo eliminar el rol.')
    } finally {
      setSubmitting(false)
    }
  }

  // ========== Funciones para administración de usuarios ==========

  const handleOpenManageUsers = async () => {
    if (!selectedRoleId) return

    setShowManageUsersModal(true)
    setUsersSearch('')
    setSelectedUsers([])

    // Cargar todos los usuarios
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, user_id, first_name, last_name, email')
        .order('first_name')

      if (error) throw error
      setAllUsers(data || [])

      // Marcar usuarios ya asignados
      const assignedUserIds = roleUsers.map((u) => u.user_id)
      setSelectedUsers(assignedUserIds)
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
      setErrorMessage('No se pudieron cargar los usuarios.')
    }
  }

  const handleCloseManageUsers = () => {
    setShowManageUsersModal(false)
    setUsersSearch('')
    setSelectedUsers([])
    setAllUsers([])
  }

  const handleToggleUser = (userId) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId)
      } else {
        return [...prev, userId]
      }
    })
  }

  const handleSaveUsers = async () => {
    if (!selectedRoleId) return

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Obtener usuarios actuales
      const { data: currentAssignments, error: fetchError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role_id', selectedRoleId)

      if (fetchError) throw fetchError

      const currentUserIds = new Set((currentAssignments || []).map((a) => a.user_id))
      const newUserIds = new Set(selectedUsers)

      // Remover asignaciones eliminadas
      for (const userId of currentUserIds) {
        if (!newUserIds.has(userId)) {
          const { error } = await supabase
            .from('user_roles')
            .delete()
            .eq('role_id', selectedRoleId)
            .eq('user_id', userId)

          if (error) throw error
        }
      }

      // Agregar nuevas asignaciones
      for (const userId of selectedUsers) {
        if (!currentUserIds.has(userId)) {
          const { error } = await supabase
            .from('user_roles')
            .insert({
              role_id: selectedRoleId,
              user_id: userId,
            })

          if (error) throw error
        }
      }

      setSuccessMessage('Usuarios actualizados correctamente.')
      handleCloseManageUsers()
      await fetchRoleDetails(selectedRoleId)
    } catch (error) {
      console.error('Error al actualizar usuarios:', error)
      setErrorMessage(error.message || 'No se pudieron actualizar los usuarios.')
    } finally {
      setSubmitting(false)
    }
  }

  const tableColumns = [
    {
      key: 'name',
      label: 'Nombre',
    },
    {
      key: 'description',
      label: 'Descripción',
      render: (value) => value || '-',
    },
  ]

  const tabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'users', label: 'Usuarios', badge: roleUsers.length > 0 ? roleUsers.length : undefined },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader
        title="Gestión de Roles"
        description="Administra roles y sus asignaciones a usuarios."
      />

      {errorMessage && <Alert type="error" message={errorMessage} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* Panel principal: Lista y Detalles (Layout vertical) */}
      <div className="space-y-4">
        {/* Tabla de roles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Roles ({roles.length})
            </h2>
            <div className="flex items-center gap-2">
              <ActionMenu
                selectedId={selectedRoleId}
                actions={[
                  {
                    label: 'Editar',
                    icon: '✏️',
                    onClick: (id) => handleEdit(id),
                  },
                  {
                    label: 'Administrar Usuarios',
                    icon: '👥',
                    onClick: () => handleOpenManageUsers(),
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
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Cargando roles...</p>
            </div>
          ) : (
            <SimpleTable
              columns={tableColumns}
              data={roles}
              selectedId={selectedRoleId}
              onSelect={handleSelect}
              loading={submitting}
              maxHeight="500px"
              collapsible={true}
              title="Lista de Roles"
              itemKey="id"
            />
          )}
        </div>

        {/* Detalles del rol seleccionado (debajo de la tabla) */}
        {selectedRoleId && selectedRole ? (
          <DetailView
            selectedItem={selectedRole}
            title={`Detalles: ${selectedRole.name}`}
            tabs={tabs}
            defaultTab={activeTab}
            collapsible={true}
            onCollapseChange={() => {}}
            renderContent={(item, tab) => {
              // Tab Resumen
              if (tab === 'overview') {
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Información del Rol
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nombre:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.name}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Descripción:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.description || '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Usuarios con este Rol ({roleUsers.length})
                        </h3>
                        {roleUsers.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {roleUsers.slice(0, 5).map((user) => (
                              <div
                                key={user.user_id}
                                className="p-2 bg-white dark:bg-gray-700 rounded text-sm"
                              >
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {user.first_name} {user.last_name}
                                </div>
                                {user.email && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {user.email}
                                  </div>
                                )}
                              </div>
                            ))}
                            {roleUsers.length > 5 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Y {roleUsers.length - 5} más...
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No hay usuarios con este rol.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }

              // Tab Usuarios
              if (tab === 'users') {
                return (
                  <div className="space-y-2">
                    {roleUsers.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No hay usuarios con este rol.
                      </p>
                    ) : (
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
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              }

              return null
            }}
          />
        ) : null}
      </div>

      {/* Modal de Editar Rol */}
      {showEditModal && editingId && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingId(null)
          }}
          title="Editar Rol"
          size="lg"
        >
          <div className="space-y-4">
            <FormRow columns={1}>
              <FormField label="Nombre" htmlFor="edit_name" required>
                <Input
                  type="text"
                  name="edit_name"
                  value={editingData.name}
                  onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                  required
                />
              </FormField>
            </FormRow>
            <FormRow columns={1}>
              <FormField label="Descripción" htmlFor="edit_description">
                <Input
                  type="text"
                  name="edit_description"
                  value={editingData.description}
                  onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                />
              </FormField>
            </FormRow>
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={handleSave}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingId(null)
                }}
                disabled={submitting}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Administrar Usuarios */}
      <Modal
        isOpen={showManageUsersModal}
        onClose={handleCloseManageUsers}
        title="Administrar Usuarios"
        size="lg"
      >
        <div className="space-y-4">
          {/* Búsqueda */}
          <FormField label="Buscar Usuario" htmlFor="users_search">
            <Input
              type="text"
              name="users_search"
              value={usersSearch}
              onChange={(e) => setUsersSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
            />
          </FormField>

          {/* Lista de usuarios */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
            {allUsers
              .filter((user) => {
                if (!usersSearch) return true
                const search = usersSearch.toLowerCase()
                const name = `${user.first_name} ${user.last_name}`.toLowerCase()
                const email = (user.email || '').toLowerCase()
                return name.includes(search) || email.includes(search)
              })
              .map((user) => {
                const isSelected = selectedUsers.includes(user.user_id)

                return (
                  <div
                    key={user.user_id}
                    className={`p-3 border rounded-lg ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                        : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleUser(user.user_id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900 dark:text-white">
                          {user.first_name} {user.last_name}
                        </div>
                        {user.email && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {user.email}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                )
              })}
            {allUsers.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No hay usuarios disponibles.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSaveUsers}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={handleCloseManageUsers}
              disabled={submitting}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
