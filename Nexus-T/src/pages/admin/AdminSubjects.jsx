import { useEffect, useState } from 'react'
import { useAdminSubjects } from '../../hooks/useAdminSubjects'
import { subjectsService } from '../../services/subjectsService'
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
  subject_name: '',
  category_type: '',
  category_name: '',
}

export default function AdminSubjects() {
  // Hook con lógica de datos
  const {
    subjects,
    selectedSubject,
    subjectGroups,
    allGroups,
    loading,
    error,
    fetchSubjectDetails,
    createSubject,
    updateSubject,
    deleteSubject,
    clearSelection,
    setError,
    fetchAllGroups,
    updateSubjectGroups,
  } = useAdminSubjects()

  // Estados de UI
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
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

  // Estados para modal de administrar grupos
  const [showManageGroupsModal, setShowManageGroupsModal] = useState(false)
  const [groupAssignments, setGroupAssignments] = useState([]) // Array de {groupId, teacherId, shift}
  const [groupTeachersMap, setGroupTeachersMap] = useState(new Map()) // Map de groupId -> [teachers]

  // Sincronizar error del hook con errorMessage de UI
  useEffect(() => {
    if (error) {
      setErrorMessage(error)
    }
  }, [error])

  // Cargar detalles cuando se selecciona una asignatura
  useEffect(() => {
    if (selectedSubjectId) {
      fetchSubjectDetails(selectedSubjectId)
    } else {
      clearSelection()
    }
  }, [selectedSubjectId, fetchSubjectDetails, clearSelection])

  const handleSelect = (id) => {
    setSelectedSubjectId(id)
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
      const result = await createSubject(formData)
      if (result.success) {
        setSuccessMessage('Asignatura creada correctamente.')
        setShowCreateModal(false)
        setFormData(INITIAL_FORM)
      } else {
        setErrorMessage(result.error?.message || 'No se pudo crear la asignatura.')
      }
    } catch (err) {
      console.error('Error al crear asignatura:', err)
      setErrorMessage('No se pudo crear la asignatura.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (id) => {
    const subject = subjects.find((s) => s.id === id)
    if (subject) {
      setEditingId(id)
      setEditingData({
        subject_name: subject.subject_name || '',
        category_type: subject.category_type || '',
        category_name: subject.category_name || '',
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
      const result = await updateSubject(editingId, editingData)
      if (result.success) {
        setSuccessMessage('Asignatura actualizada correctamente.')
        setShowEditModal(false)
        setEditingId(null)
        setEditingData(INITIAL_FORM)
      } else {
        setErrorMessage(result.error?.message || 'No se pudo actualizar la asignatura.')
      }
    } catch (err) {
      console.error('Error al actualizar asignatura:', err)
      setErrorMessage('No se pudo actualizar la asignatura.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta asignatura?')) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const success = await deleteSubject(id)
    
    if (success) {
      setSuccessMessage('Asignatura eliminada correctamente.')
      if (selectedSubjectId === id) {
        setSelectedSubjectId(null)
      }
    } else {
      setErrorMessage(error || 'No se pudo eliminar la asignatura.')
    }

    setSubmitting(false)
  }

  // ========== Funciones para administración de grupos ==========

  const handleOpenManageGroups = async () => {
    if (!selectedSubjectId) return

    setShowManageGroupsModal(true)
    setGroupAssignments([])
    setGroupTeachersMap(new Map())

    // Cargar grupos disponibles
    await fetchAllGroups()

    // Cargar asignaciones actuales
    const currentAssignments = subjectGroups.map((sg) => ({
      groupId: sg.group?.id,
      teacherId: sg.teacher?.user_id,
      shift: sg.shift,
    })).filter((a) => a.groupId && a.teacherId)

    setGroupAssignments(currentAssignments)

    // Cargar docentes de los grupos que ya tienen asignación
    for (const assignment of currentAssignments) {
      await loadGroupTeachers(assignment.groupId)
    }
  }

  const loadGroupTeachers = async (groupId) => {
    try {
      const { data, error: err } = await subjectsService.fetchGroupTeachers(groupId)
      if (err) {
        console.error('Error al cargar docentes del grupo:', err)
        return
      }

      setGroupTeachersMap((prev) => {
        const newMap = new Map(prev)
        newMap.set(groupId, data || [])
        return newMap
      })
    } catch (err) {
      console.error('Error al cargar docentes:', err)
    }
  }

  const handleCloseManageGroups = () => {
    setShowManageGroupsModal(false)
    setGroupAssignments([])
    setGroupTeachersMap(new Map())
  }

  const handleToggleGroup = async (group) => {
    const exists = groupAssignments.find((a) => a.groupId === group.id)
    
    if (exists) {
      // Remover grupo
      setGroupAssignments((prev) => prev.filter((a) => a.groupId !== group.id))
    } else {
      // Agregar grupo
      setGroupAssignments((prev) => [
        ...prev,
        {
          groupId: group.id,
          teacherId: '',
          shift: group.shift || 'M', // Tomar shift del grupo
        },
      ])
      // Cargar docentes de este grupo
      await loadGroupTeachers(group.id)
    }
  }

  const handleChangeTeacher = (groupId, teacherId) => {
    setGroupAssignments((prev) =>
      prev.map((a) =>
        a.groupId === groupId ? { ...a, teacherId } : a
      )
    )
  }

  const handleSaveGroups = async () => {
    if (!selectedSubjectId) return

    // Validar que todos los grupos tengan docente seleccionado
    const missingTeacher = groupAssignments.find((a) => !a.teacherId)
    if (missingTeacher) {
      setErrorMessage('Todos los grupos deben tener un docente asignado.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const result = await updateSubjectGroups(selectedSubjectId, groupAssignments)
      if (result.success) {
        setSuccessMessage('Grupos actualizados correctamente.')
        handleCloseManageGroups()
      } else {
        setErrorMessage(result.error?.message || 'No se pudieron actualizar los grupos.')
      }
    } catch (err) {
      console.error('Error al actualizar grupos:', err)
      setErrorMessage('No se pudieron actualizar los grupos.')
    } finally {
      setSubmitting(false)
    }
  }

  const tableColumns = [
    {
      key: 'subject_name',
      label: 'Asignatura',
      render: (value) => value || '-',
    },
    {
      key: 'category_type',
      label: 'Tipo',
      render: (value) => value || '-',
    },
    {
      key: 'category_name',
      label: 'Categoría',
      render: (value) => value || '-',
    },
  ]

  // Tabs para el panel de detalles
  const tabs = [
    { id: 'overview', label: 'Detalles' },
    { id: 'groups', label: 'Grupos', badge: subjectGroups.length > 0 ? subjectGroups.length : undefined },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader
        title="Gestión de Asignaturas"
        description="Administra las asignaturas del sistema."
      />

      {errorMessage && <Alert type="error" message={errorMessage} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* Panel principal: Lista y Detalles (Layout vertical) */}
      <div className="space-y-4">
        {/* Tabla de asignaturas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Asignaturas ({subjects.length})
            </h2>
            <div className="flex items-center gap-2">
              <ActionMenu
                selectedId={selectedSubjectId}
                actions={[
                  {
                    label: 'Editar',
                    icon: '✏️',
                    onClick: (id) => handleEdit(id),
                  },
                  {
                    label: 'Administrar Grupos',
                    icon: '👨‍👩‍👧‍👦',
                    onClick: () => handleOpenManageGroups(),
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
                Crear Nueva Asignatura
              </button>
              <button
                disabled={true}
                className="px-4 py-2 bg-gray-400 text-white text-sm font-medium rounded-lg cursor-not-allowed opacity-50"
                title="Funcionalidad deshabilitada"
              >
                Importar Asignaturas
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Cargando asignaturas...</p>
            </div>
          ) : (
            <SimpleTable
              columns={tableColumns}
              data={subjects}
              selectedId={selectedSubjectId}
              onSelect={handleSelect}
              loading={submitting}
              maxHeight="500px"
              collapsible={true}
              title="Lista de Asignaturas"
              itemKey="id"
            />
          )}
        </div>

        {/* Detalles de la asignatura seleccionada (debajo de la tabla) */}
        {selectedSubjectId && selectedSubject ? (
          <DetailView
            selectedItem={selectedSubject}
            title={`Detalles: ${selectedSubject.subject_name}`}
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
                          Información de la Asignatura
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nombre:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.subject_name || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.category_type || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Categoría:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.category_name || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              // Tab Grupos
              if (tab === 'groups') {
                return (
                  <div className="space-y-2">
                    {subjectGroups.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Esta asignatura no está asignada a ningún grupo.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Grupo
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Docente
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Turno
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {subjectGroups.map((sg) => (
                              <tr key={sg.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {sg.group?.nomenclature || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {sg.teacher ? `${sg.teacher.first_name} ${sg.teacher.last_name}` : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {sg.shift === 'M' ? 'Matutino' : sg.shift === 'V' ? 'Vespertino' : '-'}
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

      {/* Modales */}
      {/* Modal de Crear Asignatura */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nueva Asignatura"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <FormRow columns={1}>
            <FormField label="Nombre de la Asignatura" htmlFor="subject_name" required>
              <Input
                type="text"
                name="subject_name"
                value={formData.subject_name}
                onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                placeholder="Ej: Matemáticas"
                required
              />
            </FormField>
          </FormRow>
          <FormRow columns={2}>
            <FormField label="Tipo" htmlFor="category_type">
              <Input
                type="text"
                name="category_type"
                value={formData.category_type}
                onChange={(e) => setFormData({ ...formData, category_type: e.target.value })}
                placeholder="Ej: Básica"
              />
            </FormField>
            <FormField label="Categoría" htmlFor="category_name">
              <Input
                type="text"
                name="category_name"
                value={formData.category_name}
                onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                placeholder="Ej: Ciencias"
              />
            </FormField>
          </FormRow>
          
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Creando...' : 'Crear Asignatura'}
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

      {/* Modal de Editar Asignatura */}
      {showEditModal && editingId && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingId(null)
          }}
          title="Editar Asignatura"
          size="lg"
        >
          <div className="space-y-4">
            <FormRow columns={1}>
              <FormField label="Nombre de la Asignatura" htmlFor="edit_subject_name" required>
                <Input
                  type="text"
                  name="edit_subject_name"
                  value={editingData.subject_name}
                  onChange={(e) => setEditingData({ ...editingData, subject_name: e.target.value })}
                  required
                />
              </FormField>
            </FormRow>
            <FormRow columns={2}>
              <FormField label="Tipo" htmlFor="edit_category_type">
                <Input
                  type="text"
                  name="edit_category_type"
                  value={editingData.category_type}
                  onChange={(e) => setEditingData({ ...editingData, category_type: e.target.value })}
                />
              </FormField>
              <FormField label="Categoría" htmlFor="edit_category_name">
                <Input
                  type="text"
                  name="edit_category_name"
                  value={editingData.category_name}
                  onChange={(e) => setEditingData({ ...editingData, category_name: e.target.value })}
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

      {/* Modal de Administrar Grupos */}
      <Modal
        isOpen={showManageGroupsModal}
        onClose={handleCloseManageGroups}
        title="Administrar Grupos"
        size="xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Selecciona los grupos donde se impartirá esta asignatura y el docente responsable en cada grupo.
          </p>

          {/* Lista de grupos */}
          <div className="max-h-[600px] overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg p-3 space-y-3">
            {allGroups.map((group) => {
              const assignment = groupAssignments.find((a) => a.groupId === group.id)
              const isSelected = !!assignment
              const groupTeachers = groupTeachersMap.get(group.id) || []

              return (
                <div
                  key={group.id}
                  className={`border rounded-lg p-4 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-gray-200 dark:border-slate-700'
                  }`}
                >
                  {/* Checkbox para seleccionar grupo */}
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleGroup(group)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {group.nomenclature} - {group.grade}° {group.specialty}
                        {group.section && ` (${group.section})`}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Turno: {group.shift === 'M' ? 'Matutino' : group.shift === 'V' ? 'Vespertino' : 'No definido'}
                      </div>
                    </div>
                  </label>

                  {/* Select de docente (solo si está seleccionado) */}
                  {isSelected && (
                    <div className="mt-3 ml-7">
                      <FormField label="Docente" htmlFor={`teacher_${group.id}`}>
                        <Select
                          name={`teacher_${group.id}`}
                          value={assignment?.teacherId || ''}
                          onChange={(e) => handleChangeTeacher(group.id, e.target.value)}
                          options={[
                            { value: '', label: 'Seleccionar docente...' },
                            ...groupTeachers.map((teacher) => ({
                              value: teacher.user_id,
                              label: `${teacher.first_name} ${teacher.last_name}${teacher.is_tutor ? ' (Tutor)' : ''}`,
                            })),
                          ]}
                        />
                      </FormField>
                      {groupTeachers.length === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          ⚠️ Este grupo no tiene docentes asignados
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {allGroups.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No hay grupos disponibles.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSaveGroups}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={handleCloseManageGroups}
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
