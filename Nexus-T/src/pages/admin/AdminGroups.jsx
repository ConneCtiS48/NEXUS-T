import { useEffect, useState } from 'react'
import { useAdminGroups } from '../../hooks/useAdminGroups'
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

export default function AdminGroups() {
  // Hook con lógica de datos
  const {
    groups,
    selectedGroup,
    groupTeachers,
    groupTutor,
    groupMembers,
    groupSubjects,
    allTeachers,
    allSubjects,
    allStudents,
    loading,
    error,
    fetchGroupDetails,
    createGroup,
    updateGroup,
    deleteGroup,
    clearSelection,
    setError,
    fetchAllTeachers,
    fetchAllSubjects,
    fetchAllStudents,
    updateGroupTeachers,
    updateGroupSubjects,
    updateGroupStudents,
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

  // Estados para formularios básicos
  const [formData, setFormData] = useState({
    grade: '',
    specialty: '',
    nomenclature: '',
    section: '',
  })
  const [editingData, setEditingData] = useState({
    grade: '',
    specialty: '',
    nomenclature: '',
    section: '',
  })

  // Estados para modales de administración
  const [showManageTeachersModal, setShowManageTeachersModal] = useState(false)
  const [showManageSubjectsModal, setShowManageSubjectsModal] = useState(false)
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false)
  const [teachersSearch, setTeachersSearch] = useState('')
  const [subjectsSearch, setSubjectsSearch] = useState('')
  const [studentsSearch, setStudentsSearch] = useState('')
  const [selectedTeachers, setSelectedTeachers] = useState([])
  const [selectedTutorId, setSelectedTutorId] = useState(null)
  const [subjectAssignments, setSubjectAssignments] = useState([]) // Array de {subjectId, teacherId}
  const [selectedStudents, setSelectedStudents] = useState([])
  const [selectedGroupLeaderId, setSelectedGroupLeaderId] = useState(null)

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
    const group = groups.find((g) => g.id === id)
    if (group) {
    setEditingId(id)
      setEditingData({
        grade: group.grade || '',
        specialty: group.specialty || '',
        nomenclature: group.nomenclature || '',
        section: group.section || '',
      })
    setShowEditModal(true)
    }
  }

  const handleOpenCreateModal = () => {
    setFormData({
      grade: '',
      specialty: '',
      nomenclature: '',
      section: '',
    })
    setShowCreateModal(true)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const result = await createGroup(formData)
      if (result.success) {
        setSuccessMessage('Grupo creado correctamente.')
        setShowCreateModal(false)
        setFormData({ grade: '', specialty: '', nomenclature: '', section: '' })
      } else {
        setErrorMessage(result.error?.message || 'No se pudo crear el grupo.')
      }
    } catch (err) {
      console.error('Error al crear grupo:', err)
      setErrorMessage('No se pudo crear el grupo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSave = async (id) => {
    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const result = await updateGroup(id, editingData)
      if (result.success) {
        setSuccessMessage('Grupo actualizado correctamente.')
        setShowEditModal(false)
        setEditingId(null)
        setEditingData({ grade: '', specialty: '', nomenclature: '', section: '' })
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

  // ========== Funciones para administración de docentes ==========

  const handleOpenManageTeachers = async () => {
    if (!selectedGroupId) return

    setShowManageTeachersModal(true)
    setTeachersSearch('')
    setSelectedTeachers([])
    setSelectedTutorId(null)

    // Cargar docentes disponibles
    await fetchAllTeachers()

    // Cargar docentes actuales del grupo
    const currentTeacherIds = [
      ...(groupTutor ? [groupTutor.user_id] : []),
      ...groupTeachers.map((t) => t.user_id),
    ]
    setSelectedTeachers(currentTeacherIds)
    if (groupTutor) {
      setSelectedTutorId(groupTutor.user_id)
    }
  }

  const handleCloseManageTeachers = () => {
    setShowManageTeachersModal(false)
    setTeachersSearch('')
    setSelectedTeachers([])
    setSelectedTutorId(null)
  }

  const handleToggleTeacher = (teacherId) => {
    setSelectedTeachers((prev) => {
      if (prev.includes(teacherId)) {
        // Si se deselecciona y era el tutor, quitar tutor
        if (selectedTutorId === teacherId) {
          setSelectedTutorId(null)
        }
        return prev.filter((id) => id !== teacherId)
      } else {
        return [...prev, teacherId]
      }
    })
  }

  const handleSetTutor = (teacherId) => {
    if (selectedTeachers.includes(teacherId)) {
      setSelectedTutorId(teacherId)
    }
  }

  const handleSaveTeachers = async () => {
    if (!selectedGroupId) return

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const result = await updateGroupTeachers(
        selectedGroupId,
        selectedTeachers,
        selectedTutorId
      )
      if (result.success) {
        setSuccessMessage('Docentes actualizados correctamente.')
        handleCloseManageTeachers()
      } else {
        setErrorMessage(result.error?.message || 'No se pudieron actualizar los docentes.')
      }
    } catch (err) {
      console.error('Error al actualizar docentes:', err)
      setErrorMessage('No se pudieron actualizar los docentes.')
    } finally {
      setSubmitting(false)
    }
  }

  // ========== Funciones para administración de asignaturas ==========

  const handleOpenManageSubjects = async () => {
    if (!selectedGroupId) return

    setShowManageSubjectsModal(true)
    setSubjectsSearch('')
    setSubjectAssignments([])

    // Cargar asignaturas disponibles
    await fetchAllSubjects()

    // Cargar asignaturas actuales del grupo con sus docentes
    // Por ahora asumimos que el docente es el tutor, pero esto se puede mejorar
    // consultando teacher_group_subjects para obtener el teacher_id real
    const currentAssignments = groupSubjects.map((s) => ({
      subjectId: s.id,
      teacherId: groupTutor?.user_id || '', // Usar tutor por defecto
    }))
    setSubjectAssignments(currentAssignments)
  }

  const handleCloseManageSubjects = () => {
    setShowManageSubjectsModal(false)
    setSubjectsSearch('')
    setSubjectAssignments([])
  }

  const handleToggleSubject = (subjectId) => {
    const exists = subjectAssignments.find((a) => a.subjectId === subjectId)
    if (exists) {
      // Remover
      setSubjectAssignments((prev) => prev.filter((a) => a.subjectId !== subjectId))
    } else {
      // Agregar con docente vacío
      setSubjectAssignments((prev) => [...prev, { subjectId, teacherId: '' }])
    }
  }

  const handleChangeSubjectTeacher = (subjectId, teacherId) => {
    setSubjectAssignments((prev) =>
      prev.map((a) => (a.subjectId === subjectId ? { ...a, teacherId } : a))
    )
  }

  const handleSaveSubjects = async () => {
    if (!selectedGroupId) return

    // Validar que todas las asignaturas tengan docente
    const missingTeacher = subjectAssignments.find((a) => !a.teacherId)
    if (missingTeacher) {
      setErrorMessage('Todas las asignaturas deben tener un docente asignado.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Obtener shift del grupo seleccionado
      const groupShift = selectedGroup?.shift || 'M'
      
      const result = await updateGroupSubjects(selectedGroupId, subjectAssignments, groupShift)
      if (result.success) {
        setSuccessMessage('Asignaturas actualizadas correctamente.')
        handleCloseManageSubjects()
      } else {
        setErrorMessage(result.error?.message || 'No se pudieron actualizar las asignaturas.')
      }
    } catch (err) {
      console.error('Error al actualizar asignaturas:', err)
      setErrorMessage('No se pudieron actualizar las asignaturas.')
    } finally {
      setSubmitting(false)
    }
  }

  // ========== Funciones para administración de alumnos ==========

  const handleOpenManageStudents = async () => {
    if (!selectedGroupId) return

    setShowManageStudentsModal(true)
    setStudentsSearch('')
    setSelectedStudents([])
    setSelectedGroupLeaderId(null)

    // Cargar estudiantes disponibles
    await fetchAllStudents()

    // Cargar estudiantes actuales del grupo (usar student_id, no id del registro)
    const currentStudentIds = groupMembers.map((m) => m.id) // m.id es el student_id desde fetchStudentProfiles
    setSelectedStudents(currentStudentIds)
    const leader = groupMembers.find((m) => m.is_group_leader)
    if (leader) {
      setSelectedGroupLeaderId(leader.id) // leader.id es el student_id
    }
  }

  const handleCloseManageStudents = () => {
    setShowManageStudentsModal(false)
    setStudentsSearch('')
    setSelectedStudents([])
    setSelectedGroupLeaderId(null)
  }

  const handleToggleStudent = (studentId) => {
    setSelectedStudents((prev) => {
      if (prev.includes(studentId)) {
        // Si se deselecciona y era el jefe, quitar jefe
        if (selectedGroupLeaderId === studentId) {
          setSelectedGroupLeaderId(null)
        }
        return prev.filter((id) => id !== studentId)
      } else {
        return [...prev, studentId]
      }
    })
  }

  const handleSetGroupLeader = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedGroupLeaderId(studentId)
    }
  }

  const handleSaveStudents = async () => {
    if (!selectedGroupId) return

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const result = await updateGroupStudents(
        selectedGroupId,
        selectedStudents,
        selectedGroupLeaderId
      )
      if (result.success) {
        setSuccessMessage('Alumnos actualizados correctamente.')
        handleCloseManageStudents()
      } else {
        setErrorMessage(result.error?.message || 'No se pudieron actualizar los alumnos.')
      }
    } catch (err) {
      console.error('Error al actualizar alumnos:', err)
      setErrorMessage('No se pudieron actualizar los alumnos.')
    } finally {
      setSubmitting(false)
    }
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
                    label: 'Administrar Docentes',
                    icon: '👨‍🏫',
                    onClick: () => handleOpenManageTeachers(),
                  },
                  {
                    label: 'Administrar Asignaturas',
                    icon: '📚',
                    onClick: () => handleOpenManageSubjects(),
                  },
                  {
                    label: 'Administrar Alumnos',
                    icon: '👥',
                    onClick: () => handleOpenManageStudents(),
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
        <form onSubmit={handleCreate} className="space-y-4">
          <FormRow columns={2}>
            <FormField label="Grado" htmlFor="grade" required>
              <Input
                type="text"
                name="grade"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                placeholder="Ej: 3"
                required
              />
            </FormField>
            <FormField label="Especialidad" htmlFor="specialty" required>
              <Input
                type="text"
                name="specialty"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                placeholder="Ej: Informática"
                required
              />
            </FormField>
          </FormRow>
          <FormRow columns={2}>
            <FormField label="Nomenclatura" htmlFor="nomenclature" required>
              <Input
                type="text"
                name="nomenclature"
                value={formData.nomenclature}
                onChange={(e) => setFormData({ ...formData, nomenclature: e.target.value })}
                placeholder="Ej: 3A-INFO"
                required
              />
            </FormField>
            <FormField label="Sección" htmlFor="section">
              <Input
                type="text"
                name="section"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                placeholder="Ej: A"
              />
            </FormField>
          </FormRow>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Creando...' : 'Crear Grupo'}
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
            <FormRow columns={2}>
              <FormField label="Grado" htmlFor="edit_grade" required>
                <Input
                  type="text"
                  name="edit_grade"
                  value={editingData.grade}
                  onChange={(e) => setEditingData({ ...editingData, grade: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Especialidad" htmlFor="edit_specialty" required>
                <Input
                  type="text"
                  name="edit_specialty"
                  value={editingData.specialty}
                  onChange={(e) => setEditingData({ ...editingData, specialty: e.target.value })}
                  required
                />
              </FormField>
            </FormRow>
            <FormRow columns={2}>
              <FormField label="Nomenclatura" htmlFor="edit_nomenclature" required>
                <Input
                  type="text"
                  name="edit_nomenclature"
                  value={editingData.nomenclature}
                  onChange={(e) => setEditingData({ ...editingData, nomenclature: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Sección" htmlFor="edit_section">
                <Input
                  type="text"
                  name="edit_section"
                  value={editingData.section}
                  onChange={(e) => setEditingData({ ...editingData, section: e.target.value })}
                />
              </FormField>
            </FormRow>
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={() => handleSave(editingId)}
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

      {/* Modal de Administrar Docentes */}
      <Modal
        isOpen={showManageTeachersModal}
        onClose={handleCloseManageTeachers}
        title="Administrar Docentes"
        size="lg"
      >
        <div className="space-y-4">
          {/* Búsqueda */}
          <FormField label="Buscar Docente" htmlFor="teachers_search">
            <Input
              type="text"
              name="teachers_search"
              value={teachersSearch}
              onChange={(e) => setTeachersSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
            />
          </FormField>

          {/* Lista de docentes */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
            {allTeachers
              .filter((teacher) => {
                if (!teachersSearch) return true
                const search = teachersSearch.toLowerCase()
                const name = `${teacher.first_name} ${teacher.last_name}`.toLowerCase()
                const email = (teacher.email || '').toLowerCase()
                return name.includes(search) || email.includes(search)
              })
              .map((teacher) => {
                const isSelected = selectedTeachers.includes(teacher.user_id)
                const isTutor = selectedTutorId === teacher.user_id

                return (
                  <div
                    key={teacher.user_id}
                    className={`p-3 border rounded-lg ${
                      isSelected
                        ? isTutor
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                          : 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                        : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleTeacher(teacher.user_id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900 dark:text-white">
                          {teacher.first_name} {teacher.last_name}
                        </div>
                        {teacher.email && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {teacher.email}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="tutor"
                            checked={isTutor}
                            onChange={() => handleSetTutor(teacher.user_id)}
                            className="text-green-600 focus:ring-green-500"
                          />
                          <span className="text-xs font-medium text-green-700 dark:text-green-400">
                            Tutor
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                )
              })}
            {allTeachers.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No hay docentes disponibles.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSaveTeachers}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={handleCloseManageTeachers}
              disabled={submitting}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Administrar Asignaturas */}
      <Modal
        isOpen={showManageSubjectsModal}
        onClose={handleCloseManageSubjects}
        title="Administrar Asignaturas"
        size="lg"
      >
        <div className="space-y-4">
          {/* Búsqueda */}
          <FormField label="Buscar Asignatura" htmlFor="subjects_search">
            <Input
              type="text"
              name="subjects_search"
              value={subjectsSearch}
              onChange={(e) => setSubjectsSearch(e.target.value)}
              placeholder="Buscar por nombre..."
            />
          </FormField>

          {/* Lista de asignaturas */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
            {allSubjects
              .filter((subject) => {
                if (!subjectsSearch) return true
                const search = subjectsSearch.toLowerCase()
                const name = (subject.subject_name || '').toLowerCase()
                return name.includes(search)
              })
              .map((subject) => {
                const assignment = subjectAssignments.find((a) => a.subjectId === subject.id)
                const isSelected = !!assignment

                // Obtener lista de docentes del grupo (tutor + otros docentes)
                const groupTeachersList = [
                  ...(groupTutor ? [{ user_id: groupTutor.user_id, name: `${groupTutor.first_name} ${groupTutor.last_name} (Tutor)` }] : []),
                  ...groupTeachers.map((t) => ({ user_id: t.user_id, name: `${t.first_name} ${t.last_name}` })),
                ]

                return (
                  <div
                    key={subject.id}
                    className={`border rounded-lg p-4 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                        : 'border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSubject(subject.id)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900 dark:text-white">
                          {subject.subject_name || '-'}
                        </div>
                        {(subject.category_type || subject.category_name) && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {subject.category_type && subject.category_name
                              ? `${subject.category_type} - ${subject.category_name}`
                              : subject.category_type || subject.category_name}
                          </div>
                        )}

                        {/* Select de docente (solo si está seleccionada) */}
                        {isSelected && (
                          <div className="mt-3">
                            <FormField label="Docente que impartirá esta asignatura" htmlFor={`teacher_${subject.id}`}>
                              <Select
                                name={`teacher_${subject.id}`}
                                value={assignment?.teacherId || ''}
                                onChange={(e) => handleChangeSubjectTeacher(subject.id, e.target.value)}
                                options={[
                                  { value: '', label: 'Seleccionar docente...' },
                                  ...groupTeachersList.map((teacher) => ({
                                    value: teacher.user_id,
                                    label: teacher.name,
                                  })),
                                ]}
                              />
                            </FormField>
                            {groupTeachersList.length === 0 && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                ⚠️ Este grupo no tiene docentes asignados
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                )
              })}
            {allSubjects.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No hay asignaturas disponibles.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSaveSubjects}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={handleCloseManageSubjects}
              disabled={submitting}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Administrar Alumnos */}
      <Modal
        isOpen={showManageStudentsModal}
        onClose={handleCloseManageStudents}
        title="Administrar Alumnos"
        size="lg"
      >
        <div className="space-y-4">
          {/* Búsqueda */}
          <FormField label="Buscar Alumno" htmlFor="students_search">
            <Input
              type="text"
              name="students_search"
              value={studentsSearch}
              onChange={(e) => setStudentsSearch(e.target.value)}
              placeholder="Buscar por nombre o número de control..."
            />
          </FormField>

          {/* Lista de alumnos */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
            {allStudents
              .filter((student) => {
                if (!studentsSearch) return true
                const search = studentsSearch.toLowerCase()
                const name = `${student.first_name} ${student.paternal_last_name} ${student.maternal_last_name || ''}`.toLowerCase()
                const control = (student.control_number || '').toLowerCase()
                return name.includes(search) || control.includes(search)
              })
              .map((student) => {
                const isSelected = selectedStudents.includes(student.id)
                const isGroupLeader = selectedGroupLeaderId === student.id

                return (
                  <div
                    key={student.id}
                    className={`p-3 border rounded-lg ${
                      isSelected
                        ? isGroupLeader
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                          : 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                        : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleStudent(student.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900 dark:text-white">
                          {student.first_name} {student.paternal_last_name} {student.maternal_last_name || ''}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          No. Control: {student.control_number || '-'}
                        </div>
                      </div>
                      {isSelected && (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="group_leader"
                            checked={isGroupLeader}
                            onChange={() => handleSetGroupLeader(student.id)}
                            className="text-green-600 focus:ring-green-500"
                          />
                          <span className="text-xs font-medium text-green-700 dark:text-green-400">
                            Jefe
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                )
              })}
            {allStudents.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No hay alumnos disponibles.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSaveStudents}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={handleCloseManageStudents}
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
