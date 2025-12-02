import { useEffect, useState } from 'react'
import { useAdminGroups } from '../../hooks/useAdminGroups'
import SimpleTable from '../../components/data/SimpleTable'
import DetailView from '../../components/data/DetailView'
import ActionMenu from '../../components/data/ActionMenu'
import Modal from '../../components/base/Modal'
import PageHeader from '../../components/layout/PageHeader'
import Alert from '../../components/base/Alert'
import CsvImporter from '../../components/data/CsvImporter'

export default function AdminGroups() {
  // Hook con lógica de datos
  const {
    groups,
    selectedGroup,
    groupTeachers,
    groupTutor,
    groupMembers,
    groupSubjects,
    loading,
    error,
    fetchGroupDetails,
    deleteGroup,
    clearSelection,
    setError,
  } = useAdminGroups()

  // Estados de UI
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [activeTab, setActiveTab] = useState('teachers')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Sincronizar error del hook con errorMessage de UI
  useEffect(() => {
    if (error) {
      setErrorMessage(error)
    }
  }, [error])

  // Cargar detalles cuando se selecciona un grupo
  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupDetails(selectedGroupId)
    } else {
      clearSelection()
    }
  }, [selectedGroupId, fetchGroupDetails, clearSelection])

  const handleSelect = (id) => {
    const group = groups.find((g) => g.id === id)
    if (group) {
      setSelectedGroupId(group.id)
      setActiveTab('overview')
    }
  }

  const handleEdit = (id) => {
    setEditingId(id)
    setShowEditModal(true)
  }

  const handleOpenCreateModal = () => {
    setShowCreateModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este grupo?')) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const success = await deleteGroup(id)
    
    if (success) {
      setSuccessMessage('Grupo eliminado correctamente.')
      if (selectedGroupId === id) {
        setSelectedGroupId(null)
      }
    } else {
      setErrorMessage(error || 'No se pudo eliminar el grupo.')
    }

    setSubmitting(false)
  }

  const tableColumns = [
    {
      key: 'nomenclature',
      label: 'Nomenclatura',
      render: (value) => value || '-',
    },
    {
      key: 'grade',
      label: 'Grado',
      render: (value) => value ? `${value}°` : '-',
    },
    {
      key: 'specialty',
      label: 'Especialidad',
    },
    {
      key: 'section',
      label: 'Sección',
    },
  ]

  // Calcular badges para tabs
  const teachersCount = (groupTutor ? 1 : 0) + groupTeachers.length
  const tabs = [
    { id: 'overview', label: 'Detalles' },
    { id: 'teachers', label: 'Docentes', badge: teachersCount > 0 ? teachersCount : undefined },
    { id: 'students', label: 'Alumnos', badge: groupMembers.length > 0 ? groupMembers.length : undefined },
    { id: 'subjects', label: 'Asignaturas', badge: groupSubjects.length > 0 ? groupSubjects.length : undefined },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader
        title="Gestión de Grupos"
        description="Administra grupos, sus miembros y asignaturas."
      />

      {errorMessage && <Alert type="error" message={errorMessage} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* Panel principal: Lista y Detalles (Layout vertical) */}
      <div className="space-y-4">
        {/* Tabla de grupos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Grupos ({groups.length})
            </h2>
            <div className="flex items-center gap-2">
              <ActionMenu
                selectedId={selectedGroupId}
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
                Crear Nuevo Grupo
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Importar Grupos
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Cargando grupos...</p>
            </div>
          ) : (
            <SimpleTable
              columns={tableColumns}
              data={groups}
              selectedId={selectedGroupId}
              onSelect={handleSelect}
              loading={submitting}
              maxHeight="500px"
              collapsible={true}
              title="Lista de Grupos"
              itemKey="id"
            />
          )}
        </div>

        {/* Detalles del grupo seleccionado (debajo de la tabla) */}
        {selectedGroupId && selectedGroup ? (
          <DetailView
            selectedItem={selectedGroup}
            title={`Detalles: ${selectedGroup.nomenclature}`}
            tabs={tabs}
            defaultTab={activeTab}
            collapsible={true}
            onCollapseChange={(collapsed) => {}}
            renderContent={(item, tab) => {
              // Tab Detalles del Grupo
              if (tab === 'overview') {
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Información del Grupo
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nomenclatura:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.nomenclature}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Grado:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.grade}°
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Especialidad:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.specialty}
                            </p>
                          </div>
                          {item.section && (
                            <div>
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sección:</span>
                              <p className="text-sm text-gray-900 dark:text-white mt-1">
                                {item.section}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              // Tab Docentes
              if (tab === 'teachers') {
                return (
                  <div className="space-y-4">
                    {/* Bloque Tutor */}
                    {groupTutor ? (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Tutor
                        </h3>
                        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {groupTutor.first_name} {groupTutor.last_name}
                          </div>
                          {groupTutor.email && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {groupTutor.email}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Tutor
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No hay tutor asignado a este grupo.
                        </p>
                      </div>
                    )}

                    {/* Bloque Docentes */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Docentes Asignados ({groupTeachers.length})
                      </h3>
                      {groupTeachers.length > 0 ? (
                        <div className="space-y-2">
                          {groupTeachers.map((teacher) => (
                            <div
                              key={teacher.id}
                              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                              <div className="font-medium text-sm text-gray-900 dark:text-white">
                                {teacher.first_name} {teacher.last_name}
                              </div>
                              {teacher.email && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {teacher.email}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No hay docentes asignados a este grupo.
                        </p>
                      )}
                    </div>
                  </div>
                )
              }

              // Tab Alumnos
              if (tab === 'students') {
                return (
                  <div className="space-y-2">
                    {groupMembers.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No hay alumnos en este grupo.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                No. Control
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Nombre
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Rol
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {groupMembers.map((member) => (
                              <tr key={member.id || member.group_member_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {member.control_number || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {member.first_name && member.paternal_last_name
                                    ? `${member.first_name} ${member.paternal_last_name} ${member.maternal_last_name || ''}`.trim()
                                    : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  {member.is_group_leader ? (
                                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                                      Jefe de Grupo
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 dark:text-gray-400">Alumno</span>
                                  )}
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

              // Tab Asignaturas
              if (tab === 'subjects') {
                return (
                  <div className="space-y-2">
                    {groupSubjects.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No hay asignaturas asignadas a este grupo.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Asignatura
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Categoría
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {groupSubjects.map((subject) => (
                              <tr key={subject.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {subject.subject_name || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {subject.category_type && subject.category_name
                                    ? `${subject.category_type} - ${subject.category_name}`
                                    : subject.category_type || subject.category_name || '-'}
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
      {/* Modal de Crear Grupo */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nuevo Grupo"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Formulario de creación de grupo (pendiente de implementar)
          </p>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Importar Grupos */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importar Grupos desde CSV"
        size="lg"
      >
        <CsvImporter
          entityType="groups"
          requiredHeaders={[]}
          templateHeaders={[]}
          templateFileName="plantilla_grupos.csv"
          onImport={(rows) => {
            console.log('Importar grupos:', rows)
            setShowImportModal(false)
          }}
          onValidate={(row, index) => {
            return null
          }}
        />
      </Modal>

      {/* Modal de Editar Grupo */}
      {showEditModal && editingId && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingId(null)
          }}
          title="Editar Grupo"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Formulario de edición de grupo (pendiente de implementar)
            </p>
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingId(null)
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-600"
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
