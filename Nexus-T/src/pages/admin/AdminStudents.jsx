import { useEffect, useState } from 'react'
import { useAdminStudents } from '../../hooks/useAdminStudents'
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

const INITIAL_FORM = {
  control_number: '',
  first_name: '',
  paternal_last_name: '',
  maternal_last_name: '',
  email: '',
  phone: '',
  contact_name: '',
  contact_phone: '',
  contact_type: '',
}

export default function AdminStudents() {
  // Hook con lógica de datos
  const {
    students,
    selectedStudent,
    studentGroup,
    allGroups,
    loading,
    error,
    fetchStudentDetails,
    createStudent,
    updateStudent,
    deleteStudent,
    clearSelection,
    setError,
    fetchAllGroups,
    updateStudentGroup,
  } = useAdminStudents()

  // Estados de UI
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Estados para formularios
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [editingData, setEditingData] = useState(INITIAL_FORM)

  // Estados para modal de administrar grupo
  const [showManageGroupModal, setShowManageGroupModal] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [isGroupLeader, setIsGroupLeader] = useState(false)

  // Sincronizar error del hook con errorMessage de UI
  useEffect(() => {
    if (error) {
      setErrorMessage(error)
    }
  }, [error])

  // Cargar detalles cuando se selecciona un estudiante
  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentDetails(selectedStudentId)
    } else {
      clearSelection()
    }
  }, [selectedStudentId, fetchStudentDetails, clearSelection])

  const handleSelect = (id) => {
    setSelectedStudentId(id)
    setActiveTab('overview')
  }

  const handleOpenCreateModal = () => {
    setFormData(INITIAL_FORM)
    setShowCreateModal(true)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const result = await createStudent(formData)
      if (result.success) {
        setSuccessMessage('Alumno creado correctamente.')
        setShowCreateModal(false)
        setFormData(INITIAL_FORM)
      } else {
        setErrorMessage(result.error?.message || 'No se pudo crear el alumno.')
      }
    } catch (err) {
      console.error('Error al crear alumno:', err)
      setErrorMessage('No se pudo crear el alumno.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (id) => {
    const student = students.find((s) => s.id === id)
    if (student) {
      setEditingId(id)
      setEditingData({
        control_number: student.control_number || '',
        first_name: student.first_name || '',
        paternal_last_name: student.paternal_last_name || '',
        maternal_last_name: student.maternal_last_name || '',
        email: student.email || '',
        phone: student.phone || '',
        contact_name: student.contact_name || '',
        contact_phone: student.contact_phone || '',
        contact_type: student.contact_type || '',
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
      const result = await updateStudent(editingId, editingData)
      if (result.success) {
        setSuccessMessage('Alumno actualizado correctamente.')
        setShowEditModal(false)
        setEditingId(null)
        setEditingData(INITIAL_FORM)
      } else {
        setErrorMessage(result.error?.message || 'No se pudo actualizar el alumno.')
      }
    } catch (err) {
      console.error('Error al actualizar alumno:', err)
      setErrorMessage('No se pudo actualizar el alumno.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este alumno?')) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const success = await deleteStudent(id)
    
    if (success) {
      setSuccessMessage('Alumno eliminado correctamente.')
      if (selectedStudentId === id) {
        setSelectedStudentId(null)
      }
    } else {
      setErrorMessage(error || 'No se pudo eliminar el alumno.')
    }

    setSubmitting(false)
  }

  // ========== Funciones para administración de grupo ==========

  const handleOpenManageGroup = async () => {
    if (!selectedStudentId) return

    setShowManageGroupModal(true)
    setSelectedGroupId('')
    setIsGroupLeader(false)

    // Cargar grupos disponibles
    await fetchAllGroups()

    // Cargar grupo actual del estudiante
    if (studentGroup) {
      setSelectedGroupId(studentGroup.group_id || '')
      setIsGroupLeader(studentGroup.is_group_leader || false)
    }
  }

  const handleCloseManageGroup = () => {
    setShowManageGroupModal(false)
    setSelectedGroupId('')
    setIsGroupLeader(false)
  }

  const handleSaveGroup = async () => {
    if (!selectedStudentId) return

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const result = await updateStudentGroup(
        selectedStudentId,
        selectedGroupId,
        isGroupLeader
      )
      if (result.success) {
        setSuccessMessage('Grupo actualizado correctamente.')
        handleCloseManageGroup()
      } else {
        setErrorMessage(result.error?.message || 'No se pudo actualizar el grupo.')
      }
    } catch (err) {
      console.error('Error al actualizar grupo:', err)
      setErrorMessage('No se pudo actualizar el grupo.')
    } finally {
      setSubmitting(false)
    }
  }

  const tableColumns = [
    {
      key: 'control_number',
      label: 'No. Control',
      render: (value) => value || '-',
    },
    {
      key: 'first_name',
      label: 'Nombre',
      render: (value, row) => {
        const fullName = `${row.first_name || ''} ${row.paternal_last_name || ''} ${row.maternal_last_name || ''}`.trim()
        return fullName || '-'
      },
    },
    {
      key: 'email',
      label: 'Email',
      render: (value) => value || '-',
    },
    {
      key: 'phone',
      label: 'Teléfono',
      render: (value) => value || '-',
    },
  ]

  // Tabs para el panel de detalles
  const tabs = [
    { id: 'overview', label: 'Detalles' },
    { id: 'group', label: 'Grupo', badge: studentGroup ? 1 : undefined },
    { id: 'contact', label: 'Contacto' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader
        title="Gestión de Alumnos"
        description="Administra los estudiantes del sistema."
      />

      {errorMessage && <Alert type="error" message={errorMessage} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* Panel principal: Lista y Detalles (Layout vertical) */}
      <div className="space-y-4">
        {/* Tabla de alumnos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Alumnos ({students.length})
            </h2>
            <div className="flex items-center gap-2">
              <ActionMenu
                selectedId={selectedStudentId}
                actions={[
                  {
                    label: 'Editar',
                    icon: '✏️',
                    onClick: (id) => handleEdit(id),
                  },
                  {
                    label: 'Administrar Grupo',
                    icon: '👨‍👩‍👧‍👦',
                    onClick: () => handleOpenManageGroup(),
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
                Crear Nuevo Alumno
              </button>
              <button
                disabled={true}
                className="px-4 py-2 bg-gray-400 text-white text-sm font-medium rounded-lg cursor-not-allowed opacity-50"
                title="Funcionalidad deshabilitada"
              >
                Importar Alumnos
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Cargando alumnos...</p>
            </div>
          ) : (
            <SimpleTable
              columns={tableColumns}
              data={students}
              selectedId={selectedStudentId}
              onSelect={handleSelect}
              loading={submitting}
              maxHeight="500px"
              collapsible={true}
              title="Lista de Alumnos"
              itemKey="id"
            />
          )}
        </div>

        {/* Detalles del alumno seleccionado (debajo de la tabla) */}
        {selectedStudentId && selectedStudent ? (
          <DetailView
            selectedItem={selectedStudent}
            title={`Detalles: ${selectedStudent.first_name} ${selectedStudent.paternal_last_name}`}
            tabs={tabs}
            defaultTab={activeTab}
            collapsible={true}
            onCollapseChange={() => {}}
            renderContent={(item, tab) => {
              // Tab Detalles
              if (tab === 'overview') {
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Información Personal
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Número de Control:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.control_number || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nombre Completo:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {`${item.first_name || ''} ${item.paternal_last_name || ''} ${item.maternal_last_name || ''}`.trim() || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Email:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.email || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Teléfono:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.phone || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              // Tab Grupo
              if (tab === 'group') {
                return (
                  <div className="space-y-2">
                    {studentGroup && studentGroup.group ? (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Grupo Asignado
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nomenclatura:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {studentGroup.group.nomenclature}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Grado y Especialidad:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {studentGroup.group.grade}° {studentGroup.group.specialty}
                              {studentGroup.group.section && ` - Sección ${studentGroup.group.section}`}
                            </p>
                          </div>
                          {studentGroup.is_group_leader && (
                            <div>
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                                Jefe de Grupo
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Este alumno no está asignado a ningún grupo.
                      </p>
                    )}
                  </div>
                )
              }

              // Tab Contacto
              if (tab === 'contact') {
                return (
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Información de Contacto de Emergencia
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nombre:</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {item.contact_name || '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Teléfono:</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {item.contact_phone || '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo de Contacto:</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {item.contact_type || '-'}
                          </p>
                        </div>
                      </div>
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
      {/* Modal de Crear Alumno */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nuevo Alumno"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <FormRow columns={2}>
            <FormField label="Número de Control" htmlFor="control_number" required>
              <Input
                type="text"
                name="control_number"
                value={formData.control_number}
                onChange={(e) => setFormData({ ...formData, control_number: e.target.value })}
                placeholder="Ej: 20240001"
                required
              />
            </FormField>
            <FormField label="Email" htmlFor="email">
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="alumno@ejemplo.com"
              />
            </FormField>
          </FormRow>
          
          <FormRow columns={3}>
            <FormField label="Nombre" htmlFor="first_name" required>
              <Input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Nombre(s)"
                required
              />
            </FormField>
            <FormField label="Apellido Paterno" htmlFor="paternal_last_name" required>
              <Input
                type="text"
                name="paternal_last_name"
                value={formData.paternal_last_name}
                onChange={(e) => setFormData({ ...formData, paternal_last_name: e.target.value })}
                placeholder="Apellido paterno"
                required
              />
            </FormField>
            <FormField label="Apellido Materno" htmlFor="maternal_last_name">
              <Input
                type="text"
                name="maternal_last_name"
                value={formData.maternal_last_name}
                onChange={(e) => setFormData({ ...formData, maternal_last_name: e.target.value })}
                placeholder="Apellido materno"
              />
            </FormField>
          </FormRow>

          <FormRow columns={2}>
            <FormField label="Teléfono del Alumno" htmlFor="phone">
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ej: 1234567890"
              />
            </FormField>
            <FormField label="Tipo de Contacto" htmlFor="contact_type">
              <Select
                name="contact_type"
                value={formData.contact_type}
                onChange={(e) => setFormData({ ...formData, contact_type: e.target.value })}
                options={[
                  { value: '', label: 'Seleccionar...' },
                  { value: 'Padre', label: 'Padre' },
                  { value: 'Madre', label: 'Madre' },
                  { value: 'Tutor', label: 'Tutor' },
                  { value: 'Otro', label: 'Otro' },
                ]}
              />
            </FormField>
          </FormRow>

          <FormRow columns={2}>
            <FormField label="Nombre del Contacto" htmlFor="contact_name">
              <Input
                type="text"
                name="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Nombre completo"
              />
            </FormField>
            <FormField label="Teléfono del Contacto" htmlFor="contact_phone">
              <Input
                type="tel"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="Ej: 1234567890"
              />
            </FormField>
          </FormRow>
          
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Creando...' : 'Crear Alumno'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              disabled={submitting}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Editar Alumno */}
      {showEditModal && editingId && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingId(null)
          }}
          title="Editar Alumno"
          size="lg"
        >
          <div className="space-y-4">
            <FormRow columns={2}>
              <FormField label="Número de Control" htmlFor="edit_control_number" required>
                <Input
                  type="text"
                  name="edit_control_number"
                  value={editingData.control_number}
                  onChange={(e) => setEditingData({ ...editingData, control_number: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Email" htmlFor="edit_email">
                <Input
                  type="email"
                  name="edit_email"
                  value={editingData.email}
                  onChange={(e) => setEditingData({ ...editingData, email: e.target.value })}
                />
              </FormField>
            </FormRow>
            
            <FormRow columns={3}>
              <FormField label="Nombre" htmlFor="edit_first_name" required>
                <Input
                  type="text"
                  name="edit_first_name"
                  value={editingData.first_name}
                  onChange={(e) => setEditingData({ ...editingData, first_name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Apellido Paterno" htmlFor="edit_paternal_last_name" required>
                <Input
                  type="text"
                  name="edit_paternal_last_name"
                  value={editingData.paternal_last_name}
                  onChange={(e) => setEditingData({ ...editingData, paternal_last_name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Apellido Materno" htmlFor="edit_maternal_last_name">
                <Input
                  type="text"
                  name="edit_maternal_last_name"
                  value={editingData.maternal_last_name}
                  onChange={(e) => setEditingData({ ...editingData, maternal_last_name: e.target.value })}
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField label="Teléfono del Alumno" htmlFor="edit_phone">
                <Input
                  type="tel"
                  name="edit_phone"
                  value={editingData.phone}
                  onChange={(e) => setEditingData({ ...editingData, phone: e.target.value })}
                />
              </FormField>
              <FormField label="Tipo de Contacto" htmlFor="edit_contact_type">
                <Select
                  name="edit_contact_type"
                  value={editingData.contact_type}
                  onChange={(e) => setEditingData({ ...editingData, contact_type: e.target.value })}
                  options={[
                    { value: '', label: 'Seleccionar...' },
                    { value: 'Padre', label: 'Padre' },
                    { value: 'Madre', label: 'Madre' },
                    { value: 'Tutor', label: 'Tutor' },
                    { value: 'Otro', label: 'Otro' },
                  ]}
                />
              </FormField>
            </FormRow>

            <FormRow columns={2}>
              <FormField label="Nombre del Contacto" htmlFor="edit_contact_name">
                <Input
                  type="text"
                  name="edit_contact_name"
                  value={editingData.contact_name}
                  onChange={(e) => setEditingData({ ...editingData, contact_name: e.target.value })}
                />
              </FormField>
              <FormField label="Teléfono del Contacto" htmlFor="edit_contact_phone">
                <Input
                  type="tel"
                  name="edit_contact_phone"
                  value={editingData.contact_phone}
                  onChange={(e) => setEditingData({ ...editingData, contact_phone: e.target.value })}
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

      {/* Modal de Administrar Grupo */}
      <Modal
        isOpen={showManageGroupModal}
        onClose={handleCloseManageGroup}
        title="Administrar Grupo del Alumno"
        size="md"
      >
        <div className="space-y-4">
          <FormField label="Grupo" htmlFor="group_select">
            <Select
              name="group_select"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              options={[
                { value: '', label: 'Sin grupo' },
                ...allGroups.map((group) => ({
                  value: group.id,
                  label: `${group.nomenclature} - ${group.grade}° ${group.specialty}${group.section ? ` (${group.section})` : ''}`,
                })),
              ]}
            />
          </FormField>

          {selectedGroupId && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_group_leader"
                checked={isGroupLeader}
                onChange={(e) => setIsGroupLeader(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_group_leader" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                Jefe de Grupo
              </label>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSaveGroup}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={handleCloseManageGroup}
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
