import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import SelectableTable from '../../components/admin/SelectableTable'
import DetailPanel from '../../components/admin/DetailPanel'

export default function AdminRoles() {
  const [roles, setRoles] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)
  const [roleUsers, setRoleUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userRoles, setUserRoles] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

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

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetails(selectedUserId)
    } else {
      setSelectedUser(null)
      setUserRoles([])
    }
  }, [selectedUserId])

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

      // Obtener usuarios con este rol
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

      // Normalizar datos (puede haber duplicados si un usuario tiene múltiples roles)
      const usersMap = new Map()
      usersData?.forEach((item) => {
        if (item.user && !usersMap.has(item.user.user_id)) {
          usersMap.set(item.user.user_id, item.user)
        }
      })
      setRoleUsers(Array.from(usersMap.values()))
    } catch (error) {
      console.error('Error al cargar detalles del rol:', error)
      setErrorMessage('No se pudieron cargar los detalles del rol.')
    }
  }

  const fetchUserDetails = async (userId) => {
    try {
      // Obtener información del usuario
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('id, user_id, first_name, last_name, email')
        .eq('user_id', userId)
        .single()

      if (userError) throw userError
      setSelectedUser(userData)

      // Obtener roles del usuario
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          role:roles!user_roles_role_id_fkey(
            id,
            name,
            description
          )
        `)
        .eq('user_id', userId)

      if (rolesError) throw rolesError

      const rolesList = rolesData?.map((item) => item.role).filter(Boolean) || []
      setUserRoles(rolesList)
    } catch (error) {
      console.error('Error al cargar detalles del usuario:', error)
      setErrorMessage('No se pudieron cargar los detalles del usuario.')
    }
  }

  const handleSelectRole = (roleId) => {
    setSelectedRoleId(roleId)
    setSelectedUserId(null) // Limpiar selección de usuario
    setActiveTab('overview')
  }

  const handleSelectUser = (userId) => {
    setSelectedUserId(userId)
    setSelectedRoleId(null) // Limpiar selección de rol
    setActiveTab('overview')
  }

  const handleEdit = (id) => {
    // TODO: Implementar edición de rol
    console.log('Editar rol:', id)
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

  const roleTableColumns = [
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

  const userTableColumns = [
    {
      key: 'first_name',
      label: 'Nombre',
      render: (value, row) => `${row.first_name || ''} ${row.last_name || ''}`.trim() || '-',
    },
    {
      key: 'email',
      label: 'Email',
    },
  ]

  const roleTabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'users', label: 'Usuarios', badge: roleUsers.length },
  ]

  const userTabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'roles', label: 'Roles', badge: userRoles.length },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Gestión de Roles
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2">
          Administra roles y sus asignaciones a usuarios.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo: Lista de roles */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Roles ({roles.length})
            </h2>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Cargando roles...</p>
              </div>
            ) : (
              <SelectableTable
                columns={roleTableColumns}
                data={roles}
                selectedId={selectedRoleId}
                onSelect={handleSelectRole}
                onEdit={handleEdit}
                onDelete={handleDelete}
                loading={submitting}
              />
            )}
          </div>
        </div>

        {/* Panel derecho: Detalles del rol o usuario seleccionado */}
        <div>
          {selectedRoleId ? (
            <DetailPanel
              title={selectedRole ? selectedRole.name : null}
              breadcrumb={
                selectedRole
                  ? [
                      { label: 'Roles', onClick: () => setSelectedRoleId(null) },
                      { label: selectedRole.name },
                    ]
                  : null
              }
              tabs={selectedRole ? roleTabs : null}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              emptyMessage="Selecciona un rol para ver sus detalles"
            >
              {selectedRole && (
                <>
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Información del Rol
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Nombre:
                            </span>{' '}
                            <span className="text-sm text-gray-900 dark:text-white">
                              {selectedRole.name}
                            </span>
                          </div>
                          {selectedRole.description && (
                            <div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Descripción:
                              </span>{' '}
                              <span className="text-sm text-gray-900 dark:text-white">
                                {selectedRole.description}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                          Usuarios con este Rol ({roleUsers.length})
                        </h3>
                        {roleUsers.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No hay usuarios con este rol.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {roleUsers.map((user) => (
                              <button
                                key={user.user_id}
                                onClick={() => handleSelectUser(user.user_id)}
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
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'users' && (
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
                                      onClick={() => handleSelectUser(user.user_id)}
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
                      )}
                    </div>
                  )}
                </>
              )}
            </DetailPanel>
          ) : selectedUserId ? (
            <DetailPanel
              title={selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : null}
              breadcrumb={
                selectedUser
                  ? [
                      { label: 'Roles', onClick: () => setSelectedUserId(null) },
                      { label: `${selectedUser.first_name} ${selectedUser.last_name}` },
                    ]
                  : null
              }
              tabs={selectedUser ? userTabs : null}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              emptyMessage="Selecciona un usuario para ver sus roles"
            >
              {selectedUser && (
                <>
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Información del Usuario
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Nombre:
                            </span>{' '}
                            <span className="text-sm text-gray-900 dark:text-white">
                              {selectedUser.first_name} {selectedUser.last_name}
                            </span>
                          </div>
                          {selectedUser.email && (
                            <div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Email:
                              </span>{' '}
                              <span className="text-sm text-gray-900 dark:text-white">
                                {selectedUser.email}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                          Roles Asignados ({userRoles.length})
                        </h3>
                        {userRoles.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Este usuario no tiene roles asignados.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {userRoles.map((role) => (
                              <button
                                key={role.id}
                                onClick={() => handleSelectRole(role.id)}
                                className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <div className="font-medium text-sm text-gray-900 dark:text-white">
                                  {role.name}
                                </div>
                                {role.description && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {role.description}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'roles' && (
                    <div className="space-y-2">
                      {userRoles.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Este usuario no tiene roles asignados.
                        </p>
                      ) : (
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
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                  Acción
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                              {userRoles.map((role) => (
                                <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                    {role.name}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                    {role.description || '-'}
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    <button
                                      onClick={() => handleSelectRole(role.id)}
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
                      )}
                    </div>
                  )}
                </>
              )}
            </DetailPanel>
          ) : (
            <DetailPanel emptyMessage="Selecciona un rol o usuario para ver sus detalles" />
          )}
        </div>
      </div>
    </div>
  )
}

