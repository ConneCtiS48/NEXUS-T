import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import SimpleTable from '../../components/data/SimpleTable'
import DetailView from '../../components/data/DetailView'
import Modal from '../../components/base/Modal'
import Input from '../../components/forms/Input'
import Select from '../../components/forms/Select'
import Textarea from '../../components/forms/Textarea'
import FormField from '../../components/forms/FormField'
import { studentsService } from '../../services/studentsService'
import Alert from '../../components/base/Alert'

const INITIAL_JUSTIFICATION_FORM = {
  studentId: '',
  groupId: '',
  reason: '',
}

export default function Justificantes({ setErrorMessage, readOnly = false }) {
  const { user } = useAuth()
  const [justifications, setJustifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedJustificationId, setSelectedJustificationId] = useState(null)
  const [selectedJustification, setSelectedJustification] = useState(null)
  
  // Estados para modal de crear/editar
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [justificationForm, setJustificationForm] = useState(INITIAL_JUSTIFICATION_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  
  // Estados para búsqueda de alumnos en modal
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [filteredStudents, setFilteredStudents] = useState([])
  const [selectedStudentForJustification, setSelectedStudentForJustification] = useState(null)
  const [groupFilter, setGroupFilter] = useState('')
  const [allGroups, setAllGroups] = useState([])

  // Columnas para la tabla de justificantes
  const justificationTableColumns = [
    {
      key: 'created_at',
      label: 'Fecha',
      render: (value) => value ? new Date(value).toLocaleDateString('es-MX') : '-',
    },
    {
      key: 'student',
      label: 'Estudiante',
      render: (value) => {
        if (!value) return '-'
        return `${value.first_name || ''} ${value.paternal_last_name || ''} ${value.maternal_last_name || ''}`.trim() || '-'
      },
    },
    {
      key: 'group',
      label: 'Grupo',
      render: (value) => {
        if (!value) return '-'
        return value.nomenclature || '-'
      },
    },
    {
      key: 'teacher',
      label: 'Tutor',
      render: (value) => {
        if (!value) return '-'
        return `${value.first_name || ''} ${value.last_name || ''}`.trim() || value.email || '-'
      },
    },
    {
      key: 'reason',
      label: 'Razón',
      render: (value) => value ? (value.length > 50 ? `${value.substring(0, 50)}...` : value) : '-',
    },
  ]

  // Cargar justificantes y datos relacionados
  useEffect(() => {
    fetchJustifications()
    fetchAllGroups()
  }, [])

  // Filtrar estudiantes cuando cambia la búsqueda
  useEffect(() => {
    let filtered = students

    // Filtro por grupo
    if (groupFilter) {
      filtered = filtered.filter(student => {
        if (!student.group) return false
        return student.group.id === groupFilter || 
               student.group.nomenclature?.toLowerCase().includes(groupFilter.toLowerCase())
      })
    }

    // Filtro por búsqueda de texto
    if (studentSearch.trim()) {
      const filters = studentSearch.split(',').map(f => f.trim()).filter(f => f)
      filtered = filtered.filter(student => {
        return filters.every(filter => {
          const [column, value] = filter.split('=').map(s => s.trim())
          if (!column || !value) return true

          const columnLower = column.toLowerCase()
          const valueLower = value.toLowerCase()

          if (columnLower === 'control_number' || columnLower === 'control' || columnLower === 'numero') {
            return (student.control_number || '').toLowerCase().includes(valueLower)
          }
          if (columnLower === 'nombre' || columnLower === 'name') {
            const fullName = `${student.first_name || ''} ${student.paternal_last_name || ''} ${student.maternal_last_name || ''}`.toLowerCase()
            return fullName.includes(valueLower)
          }
          if (columnLower === 'grupo' || columnLower === 'group') {
            if (student.group) {
              const groupName = (student.group.nomenclature || '').toLowerCase()
              return groupName.includes(valueLower)
            }
            return false
          }
          if (columnLower === 'email') {
            return (student.email || '').toLowerCase().includes(valueLower)
          }
          
          const searchableText = [
            student.control_number,
            student.first_name,
            student.paternal_last_name,
            student.maternal_last_name,
            student.email,
          ].filter(Boolean).join(' ').toLowerCase()
          
          return searchableText.includes(valueLower)
        })
      })
    }

    setFilteredStudents(filtered)
  }, [studentSearch, groupFilter, students])

  const fetchJustifications = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('justifications')
        .select(
          `
          id,
          reason,
          created_at,
          updated_at,
          student_id,
          group_id,
          teacher_id,
          student:students!justifications_student_id_fkey (
            id,
            first_name,
            paternal_last_name,
            maternal_last_name,
            control_number,
            email
          ),
          group:groups!justifications_group_id_fkey (
            id,
            nomenclature,
            grade,
            specialty,
            section,
            shift
          )
        `
        )
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error al cargar justificantes:', error)
        setJustifications([])
      } else {
        // Obtener los user_profiles de los teachers
        const justificationsWithTeachers = await Promise.all(
          (data || []).map(async (justification) => {
            if (justification.teacher_id) {
              const { data: teacherProfile } = await supabase
                .from('user_profiles')
                .select('id, first_name, last_name, email')
                .eq('user_id', justification.teacher_id)
                .maybeSingle()
              
              return {
                ...justification,
                teacher: teacherProfile || null,
              }
            }
            return {
              ...justification,
              teacher: null,
            }
          })
        )
        setJustifications(justificationsWithTeachers)
        // Debug: verificar que los datos del grupo incluyan shift y section
        if (justificationsWithTeachers.length > 0) {
          console.log('Primer justificante con grupo:', justificationsWithTeachers[0]?.group)
        }
      }
    } catch (error) {
      console.error('Error al cargar justificantes:', error)
      setJustifications([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAllGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, nomenclature, grade, specialty, section')
        .order('nomenclature')

      if (error) {
        console.error('Error al cargar grupos:', error)
        setAllGroups([])
      } else {
        setAllGroups(data || [])
      }
    } catch (error) {
      console.error('Error al cargar grupos:', error)
      setAllGroups([])
    }
  }

  const fetchTutorByGroup = async (groupId) => {
    try {
      const { data, error } = await supabase
        .from('teacher_groups')
        .select('teacher_id')
        .eq('group_id', groupId)
        .eq('is_tutor', true)
        .maybeSingle()

      if (error) {
        console.error('Error al obtener tutor del grupo:', error)
        return null
      }

      return data?.teacher_id || null
    } catch (error) {
      console.error('Error al obtener tutor del grupo:', error)
      return null
    }
  }

  const fetchStudentsForModal = async () => {
    setStudentsLoading(true)
    try {
      const { data, error } = await studentsService.fetchAll()
      if (error) {
        console.error('Error al cargar estudiantes:', error)
        setStudents([])
        setFilteredStudents([])
      } else {
        // Cargar grupos para cada estudiante
        const studentsWithData = await Promise.all(
          (data || []).map(async (student) => {
            const groupResult = await studentsService.fetchStudentGroup(student.id)
            
            return {
              ...student,
              group: groupResult.data?.group || null,
            }
          })
        )
        setStudents(studentsWithData)
        setFilteredStudents(studentsWithData)
      }
    } catch (error) {
      console.error('Error al cargar estudiantes:', error)
      setStudents([])
      setFilteredStudents([])
    } finally {
      setStudentsLoading(false)
    }
  }

  const handleSelectJustification = (id) => {
    const justification = justifications.find((j) => j.id === id)
    if (justification) {
      setSelectedJustificationId(id)
      setSelectedJustification(justification)
    }
  }

  const handleOpenCreateModal = () => {
    setJustificationForm(INITIAL_JUSTIFICATION_FORM)
    setSelectedStudentForJustification(null)
    setStudentSearch('')
    setGroupFilter('')
    setSuccessMessage(null)
    setErrorMessage(null)
    setShowCreateModal(true)
    fetchStudentsForModal()
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setJustificationForm(INITIAL_JUSTIFICATION_FORM)
    setSelectedStudentForJustification(null)
    setStudentSearch('')
    setGroupFilter('')
    setSuccessMessage(null)
  }

  const handleSelectStudentForJustification = (student) => {
    setSelectedStudentForJustification(student)
    setErrorMessage(null)
    
    setJustificationForm(prev => ({ 
      ...prev, 
      studentId: student.id,
      groupId: student.group?.id || '',
    }))
  }

  const handleCreateJustification = async (e) => {
    e.preventDefault()
    
    if (!justificationForm.studentId || !justificationForm.groupId || !justificationForm.reason.trim()) {
      setErrorMessage('Por favor completa todos los campos requeridos.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Obtener el teacher_id del tutor del grupo
      const teacherId = await fetchTutorByGroup(justificationForm.groupId)
      
      if (!teacherId) {
        setErrorMessage('No se encontró un tutor para el grupo seleccionado.')
        setSubmitting(false)
        return
      }

      const { data: newJustification, error: justificationError } = await supabase
        .from('justifications')
        .insert({
          student_id: justificationForm.studentId,
          group_id: justificationForm.groupId,
          teacher_id: teacherId,
          reason: justificationForm.reason.trim(),
        })
        .select()
        .single()

      if (justificationError) {
        throw justificationError
      }

      setSuccessMessage('Justificante creado correctamente.')
      await fetchJustifications()
      
      setTimeout(() => {
        handleCloseCreateModal()
      }, 1500)
    } catch (error) {
      console.error('Error al crear justificante:', error)
      const errorMessage = error?.message || error?.error_description || error?.code || 'Error desconocido'
      setErrorMessage(`No se pudo crear el justificante: ${errorMessage}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEditModal = () => {
    if (!selectedJustification) return
    
    setJustificationForm({
      studentId: selectedJustification.student_id,
      groupId: selectedJustification.group_id,
      reason: selectedJustification.reason || '',
    })
    setSuccessMessage(null)
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setJustificationForm(INITIAL_JUSTIFICATION_FORM)
    setSuccessMessage(null)
  }

  const handleUpdateJustification = async (e) => {
    e.preventDefault()
    
    if (!selectedJustificationId || !justificationForm.studentId || !justificationForm.groupId || !justificationForm.reason.trim()) {
      setErrorMessage('Por favor completa todos los campos requeridos.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Obtener el teacher_id del tutor del grupo
      const teacherId = await fetchTutorByGroup(justificationForm.groupId)
      
      if (!teacherId) {
        setErrorMessage('No se encontró un tutor para el grupo seleccionado.')
        setSubmitting(false)
        return
      }

      const { error: updateError } = await supabase
        .from('justifications')
        .update({
          student_id: justificationForm.studentId,
          group_id: justificationForm.groupId,
          teacher_id: teacherId,
          reason: justificationForm.reason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedJustificationId)

      if (updateError) {
        throw updateError
      }

      setSuccessMessage('Justificante actualizado correctamente.')
      await fetchJustifications()
      
      // Actualizar el justificante seleccionado
      if (selectedJustificationId) {
        const { data: refreshedJustification } = await supabase
          .from('justifications')
          .select(
            `
            id,
            reason,
            created_at,
            updated_at,
            student_id,
            group_id,
            teacher_id,
            student:students!justifications_student_id_fkey (
              id,
              first_name,
              paternal_last_name,
              maternal_last_name,
              control_number,
              email
            ),
            group:groups!justifications_group_id_fkey (
              id,
              nomenclature,
              grade,
              specialty,
              section,
              shift
            )
          `
          )
          .eq('id', selectedJustificationId)
          .single()
        
        if (refreshedJustification) {
          // Obtener el user_profile del teacher
          if (refreshedJustification.teacher_id) {
            const { data: teacherProfile } = await supabase
              .from('user_profiles')
              .select('id, first_name, last_name, email')
              .eq('user_id', refreshedJustification.teacher_id)
              .maybeSingle()
            
            setSelectedJustification({
              ...refreshedJustification,
              teacher: teacherProfile || null,
            })
          } else {
            setSelectedJustification({
              ...refreshedJustification,
              teacher: null,
            })
          }
        }
      }
      
      setTimeout(() => {
        handleCloseEditModal()
      }, 1500)
    } catch (error) {
      console.error('Error al actualizar justificante:', error)
      const errorMessage = error?.message || error?.error_description || error?.code || 'Error desconocido'
      setErrorMessage(`No se pudo actualizar el justificante: ${errorMessage}`)
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <div className="flex flex-col h-[calc(100vh-300px)] min-h-[600px]">
      {/* Header fijo */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              Justificantes ({justifications.length})
            </h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              Gestión de justificantes del sistema
            </p>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenEditModal}
                disabled={!selectedJustificationId || !selectedJustification}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                title={!selectedJustificationId || !selectedJustification ? 'Selecciona un justificante para editar' : ''}
              >
                Editar Justificante
              </button>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                Crear Nuevo Justificante
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contenedor con scroll */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {successMessage && <Alert type="success" message={successMessage} />}
        
        {/* Tabla de justificantes */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Cargando justificantes...</p>
          </div>
        ) : (
          <SimpleTable
            columns={justificationTableColumns}
            data={justifications}
            selectedId={selectedJustificationId}
            onSelect={handleSelectJustification}
            loading={false}
            maxHeight="400px"
            collapsible={true}
            title="Lista de Justificantes"
            itemKey="id"
          />
        )}

        {/* Detalles del justificante seleccionado */}
        {selectedJustificationId && selectedJustification && (
          <DetailView
            selectedItem={selectedJustification}
            title={`Justificante: ${selectedJustification.student?.first_name || ''} ${selectedJustification.student?.paternal_last_name || ''}`.trim() || 'Sin estudiante'}
            tabs={[
              { id: 'overview', label: 'Detalles' },
              { id: 'student', label: 'Estudiante' },
            ]}
            defaultTab="overview"
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
                          Información del Justificante
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Fecha de Creación:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.created_at ? new Date(item.created_at).toLocaleString('es-MX') : '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Última Actualización:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.updated_at ? new Date(item.updated_at).toLocaleString('es-MX') : '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Grupo:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.group?.nomenclature || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Especialidad:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.group?.specialty || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sección:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.group?.section || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Turno:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.group?.shift ? (item.group.shift === 'M' ? 'Matutino' : item.group.shift === 'V' ? 'Vespertino' : item.group.shift) : '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tutor:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.teacher ? `${item.teacher.first_name || ''} ${item.teacher.last_name || ''}`.trim() || item.teacher.email || '-' : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Razón
                        </h3>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {item.reason || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }

              // Tab Estudiante
              if (tab === 'student') {
                return (
                  <div className="space-y-4">
                    {item.student ? (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Información del Estudiante
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nombre:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {`${item.student.first_name || ''} ${item.student.paternal_last_name || ''} ${item.student.maternal_last_name || ''}`.trim() || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Número de Control:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.student.control_number || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Email:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.student.email || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No hay información del estudiante disponible.
                      </p>
                    )}
                  </div>
                )
              }

              return null
            }}
          />
        )}
      </div>

      {/* Modal para crear justificante */}
      {!readOnly && (
        <Modal
          isOpen={showCreateModal}
          onClose={handleCloseCreateModal}
          title="Crear Nuevo Justificante"
          size="xl"
        >
        <form onSubmit={handleCreateJustification} className="space-y-6">
          {successMessage && <Alert type="success" message={successMessage} />}
          
          {/* Búsqueda de alumnos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Buscar Estudiante
            </h3>
            
            {/* Filtro por grupo */}
            <FormField label="Filtrar por Grupo" htmlFor="group_filter">
              <Select
                id="group_filter"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todos los grupos' },
                  ...allGroups.map(g => ({
                    value: g.id,
                    label: g.nomenclature,
                  })),
                ]}
              />
            </FormField>

            {/* Búsqueda de texto */}
            <FormField label="Búsqueda" htmlFor="student_search_modal">
              <Input
                id="student_search_modal"
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder='Ejemplo: nombre=Juan, control_number=12345'
              />
            </FormField>

            {/* Lista de estudiantes */}
            <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg">
              {studentsLoading ? (
                <div className="p-4 text-center text-sm text-gray-500">Cargando...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No se encontraron alumnos</div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleSelectStudentForJustification(student)}
                      className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        selectedStudentForJustification?.id === student.id
                          ? 'bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-600'
                          : ''
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {`${student.first_name} ${student.paternal_last_name} ${student.maternal_last_name || ''}`.trim()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {student.control_number} {student.group && `• ${student.group.nomenclature}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedStudentForJustification && (
              <div className={`p-3 rounded-lg border ${
                justificationForm.studentId
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
              }`}>
                <p className={`text-sm font-medium ${
                  justificationForm.studentId
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {justificationForm.studentId
                    ? `✓ Estudiante seleccionado: ${selectedStudentForJustification.first_name} ${selectedStudentForJustification.paternal_last_name}`
                    : 'Error al seleccionar estudiante'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Formulario de justificante */}
          <div className="space-y-4 border-t border-gray-200 dark:border-slate-700 pt-4">
            <FormField label="Grupo *" htmlFor="group">
              <Select
                id="group"
                value={justificationForm.groupId}
                onChange={(e) => setJustificationForm(prev => ({ ...prev, groupId: e.target.value }))}
                options={[
                  { value: '', label: 'Selecciona un grupo' },
                  ...allGroups.map(g => ({
                    value: g.id,
                    label: g.nomenclature,
                  })),
                ]}
                required
              />
            </FormField>

            <FormField label="Razón *" htmlFor="reason">
              <Textarea
                id="reason"
                value={justificationForm.reason}
                onChange={(e) => setJustificationForm(prev => ({ ...prev, reason: e.target.value }))}
                rows={4}
                placeholder="Describe la razón del justificante..."
                required
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleCloseCreateModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !justificationForm.studentId || !justificationForm.groupId || !justificationForm.reason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !justificationForm.studentId 
                  ? 'Selecciona un estudiante' 
                  : !justificationForm.groupId 
                  ? 'Selecciona un grupo' 
                  : !justificationForm.reason.trim()
                  ? 'Ingresa una razón'
                  : ''
              }
            >
              {submitting ? 'Creando...' : 'Crear Justificante'}
            </button>
          </div>
        </form>
      </Modal>
      )}

      {/* Modal para editar justificante */}
      {!readOnly && (
        <Modal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          title="Editar Justificante"
          size="lg"
        >
        <form onSubmit={handleUpdateJustification} className="space-y-6">
          {successMessage && <Alert type="success" message={successMessage} />}
          
          <FormField label="Grupo *" htmlFor="edit_group">
            <Select
              id="edit_group"
              value={justificationForm.groupId}
              onChange={(e) => setJustificationForm(prev => ({ ...prev, groupId: e.target.value }))}
              options={[
                { value: '', label: 'Selecciona un grupo' },
                ...allGroups.map(g => ({
                  value: g.id,
                  label: g.nomenclature,
                })),
              ]}
              required
            />
          </FormField>

          <FormField label="Razón *" htmlFor="edit_reason">
            <Textarea
              id="edit_reason"
              value={justificationForm.reason}
              onChange={(e) => setJustificationForm(prev => ({ ...prev, reason: e.target.value }))}
              rows={4}
              required
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleCloseEditModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !justificationForm.groupId || !justificationForm.reason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Actualizando...' : 'Actualizar Justificante'}
            </button>
          </div>
        </form>
      </Modal>
      )}
    </div>
  )
}
