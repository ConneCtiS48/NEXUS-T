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

