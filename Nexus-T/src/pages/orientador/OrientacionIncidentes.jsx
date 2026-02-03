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

const INITIAL_INCIDENT_FORM = {
  studentId: '',
  incidentTypeId: '',
  situation: '',
  action: '',
  follow_up: '',
  observation: '',
}

export default function OrientacionIncidentes({ setErrorMessage }) {
  const { user } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [incidentsLoading, setIncidentsLoading] = useState(false)
  const [selectedIncidentId, setSelectedIncidentId] = useState(null)
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [incidentTypes, setIncidentTypes] = useState([])
  
  // Estados para modal de crear/editar
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddObservationModal, setShowAddObservationModal] = useState(false)
  const [incidentForm, setIncidentForm] = useState(INITIAL_INCIDENT_FORM)
  const [observationText, setObservationText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  
  // Estados para búsqueda de alumnos en modal
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [filteredStudents, setFilteredStudents] = useState([])
  const [selectedStudentForIncident, setSelectedStudentForIncident] = useState(null)
  const [groupFilter, setGroupFilter] = useState('')
  const [allGroups, setAllGroups] = useState([])

  // Columnas para la tabla de incidentes
  const incidentTableColumns = [
    {
      key: 'created_at',
      label: 'Fecha',
      render: (value) => value ? new Date(value).toLocaleDateString('es-MX') : '-',
    },
    {
      key: 'incident_types',
      label: 'Tipo',
      render: (value) => value?.name || '-',
    },
    {
      key: 'student',
      label: 'Alumno',
      render: (value) => {
        if (!value) return '-'
        return `${value.first_name || ''} ${value.paternal_last_name || ''} ${value.maternal_last_name || ''}`.trim() || '-'
      },
    },
    {
      key: 'student',
      label: 'No. Control',
      render: (value) => value?.control_number ?? '-',
    },
    {
      key: 'situation',
      label: 'Situación',
      render: (value) => value ? (value.length > 50 ? `${value.substring(0, 50)}...` : value) : '-',
    },
  ]

  // Cargar incidentes y tipos al montar
  useEffect(() => {
    fetchAllIncidents()
    fetchIncidentTypes()
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

  // Cargar todos los incidentes
  const fetchAllIncidents = async () => {
    setIncidentsLoading(true)
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select(
          `
          id,
          situation,
          action,
          follow_up,
          created_at,
          updated_at,
          incident_type_id,
          student_id,
          incident_types (
            id,
            name,
            code,
            category
          ),
          student:students!incidents_student_id_fkey (
            id,
            first_name,
            paternal_last_name,
            maternal_last_name,
            control_number,
            email
          ),
          observations:incident_observations (
            id,
            comment,
            created_at,
            user:user_profiles!incident_observations_user_id_fkey (
              first_name,
              last_name,
              email
            )
          )
        `
        )
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error al cargar incidentes:', error)
        setIncidents([])
      } else {
        setIncidents(data || [])
      }
    } catch (error) {
      console.error('Error al cargar incidentes:', error)
      setIncidents([])
    } finally {
      setIncidentsLoading(false)
    }
  }

  // Cargar tipos de incidentes
  const fetchIncidentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('incident_types')
        .select('id, name, code, category')
        .order('name')

      if (error) {
        console.error('Error al cargar tipos de incidentes:', error)
        setIncidentTypes([])
      } else {
        setIncidentTypes(data || [])
      }
    } catch (error) {
      console.error('Error al cargar tipos de incidentes:', error)
      setIncidentTypes([])
    }
  }

  // Cargar todos los grupos
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

  // Cargar estudiantes para el modal
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
        const studentsWithGroups = await Promise.all(
          (data || []).map(async (student) => {
            const groupResult = await studentsService.fetchStudentGroup(student.id)
            return {
              ...student,
              group: groupResult.data?.group || null,
            }
          })
        )
        setStudents(studentsWithGroups)
        setFilteredStudents(studentsWithGroups)
      }
    } catch (error) {
      console.error('Error al cargar estudiantes:', error)
      setStudents([])
      setFilteredStudents([])
    } finally {
      setStudentsLoading(false)
    }
  }

  // Manejar selección de incidente
  const handleSelectIncident = (id) => {
    const incident = incidents.find((i) => i.id === id)
    if (incident) {
      setSelectedIncidentId(id)
      setSelectedIncident(incident)
    }
  }

  // Abrir modal de crear
  const handleOpenCreateModal = () => {
    setIncidentForm(INITIAL_INCIDENT_FORM)
    setSelectedStudentForIncident(null)
    setStudentSearch('')
    setGroupFilter('')
    setSuccessMessage(null)
    setErrorMessage(null)
    setShowCreateModal(true)
    fetchStudentsForModal()
  }

  // Cerrar modal de crear
  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setIncidentForm(INITIAL_INCIDENT_FORM)
    setSelectedStudentForIncident(null)
    setStudentSearch('')
    setGroupFilter('')
    setSuccessMessage(null)
  }

  // Seleccionar estudiante en modal
  const handleSelectStudentForIncident = (student) => {
    setSelectedStudentForIncident(student)
    setErrorMessage(null)
    setIncidentForm(prev => ({ ...prev, studentId: student.id }))
  }

  // Crear incidente
  const handleCreateIncident = async (e) => {
    e.preventDefault()
    
    if (!incidentForm.studentId || !incidentForm.incidentTypeId) {
      setErrorMessage('Por favor completa todos los campos requeridos.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Obtener group_id del alumno para el incidente
      let groupId = null
      let teacherIdTutor = null
      const { data: memberRow } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('student_id', incidentForm.studentId)
        .limit(1)
        .maybeSingle()
      if (memberRow?.group_id) {
        groupId = memberRow.group_id
        const { data: tutorRow } = await supabase
          .from('teacher_groups')
          .select('teacher_id')
          .eq('group_id', groupId)
          .eq('is_tutor', true)
          .maybeSingle()
        if (tutorRow?.teacher_id) teacherIdTutor = tutorRow.teacher_id
      }

      // Crear el incidente (created_by, group_id y teacher_id para consultas y visibilidad)
      const { data: newIncident, error: incidentError } = await supabase
        .from('incidents')
        .insert({
          incident_type_id: incidentForm.incidentTypeId,
          student_id: incidentForm.studentId,
          situation: incidentForm.situation || null,
          action: incidentForm.action || null,
          follow_up: incidentForm.follow_up || null,
          created_by: user?.id ?? null,
          teacher_id: teacherIdTutor ?? null,
          group_id: groupId ?? null,
        })
        .select()
        .single()

      if (incidentError) {
        throw incidentError
      }

      // Si hay observación, crearla
      let observationError = null
      if (incidentForm.observation && incidentForm.observation.trim() && user) {
        try {
          // Obtener user_profile_id del usuario actual
          const { data: currentUserProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()

          if (profileError) {
            console.error('Error al obtener perfil de usuario:', profileError)
            observationError = `Error al obtener perfil de usuario: ${profileError.message}`
          } else if (!currentUserProfile) {
            console.error('No se encontró el perfil de usuario para:', user.id)
            observationError = 'No se encontró tu perfil de usuario. Contacta al administrador.'
          } else {
            // Insertar la observación
            const { error: insertObservationError } = await supabase
              .from('incident_observations')
              .insert({
                incident_id: newIncident.id,
                user_id: currentUserProfile.id,
                comment: incidentForm.observation.trim(),
              })

            if (insertObservationError) {
              console.error('Error al crear observación:', insertObservationError)
              observationError = `Error al crear observación: ${insertObservationError.message}`
            }
          }
        } catch (obsError) {
          console.error('Error inesperado al crear observación:', obsError)
          observationError = `Error inesperado al crear observación: ${obsError.message || 'Error desconocido'}`
        }
      }

      if (observationError) {
        setSuccessMessage('Incidente creado correctamente, pero hubo un error al crear la observación.')
        setErrorMessage(observationError)
      } else {
        setSuccessMessage('Incidente creado correctamente.')
      }
      await fetchAllIncidents()
      
      // Actualizar el incidente seleccionado si existe
      if (selectedIncidentId && newIncident) {
        const updatedIncident = incidents.find((i) => i.id === selectedIncidentId) || newIncident
        // Recargar el incidente completo con observaciones
        const { data: refreshedIncident } = await supabase
          .from('incidents')
          .select(
            `
            id,
            situation,
            action,
            follow_up,
            created_at,
            updated_at,
            incident_type_id,
            student_id,
            incident_types (
              id,
              name,
              code,
              category
            ),
            student:students!incidents_student_id_fkey (
              id,
              first_name,
              paternal_last_name,
              maternal_last_name,
              control_number,
              email
            ),
            observations:incident_observations (
              id,
              comment,
              created_at,
              user:user_profiles!incident_observations_user_id_fkey (
                first_name,
                last_name,
                email
              )
            )
          `
          )
          .eq('id', selectedIncidentId)
          .single()
        
        if (refreshedIncident) {
          setSelectedIncident(refreshedIncident)
        }
      }
      
      setTimeout(() => {
        handleCloseCreateModal()
      }, 1500)
    } catch (error) {
      console.error('Error al crear incidente:', error)
      const errorMessage = error?.message || error?.error_description || error?.code || 'Error desconocido'
      setErrorMessage(`No se pudo crear el incidente: ${errorMessage}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Abrir modal de editar
  const handleOpenEditModal = () => {
    if (!selectedIncident) return
    
    setIncidentForm({
      studentId: selectedIncident.student_id,
      incidentTypeId: selectedIncident.incident_type_id,
      situation: selectedIncident.situation || '',
      action: selectedIncident.action || '',
      follow_up: selectedIncident.follow_up || '',
      observation: '', // Ya no se usa, pero se mantiene para compatibilidad
    })
    setSuccessMessage(null)
    setShowEditModal(true)
  }

  // Cerrar modal de editar
  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setIncidentForm(INITIAL_INCIDENT_FORM)
    setSuccessMessage(null)
  }

  // Abrir modal de agregar observación
  const handleOpenAddObservationModal = () => {
    setObservationText('')
    setSuccessMessage(null)
    setErrorMessage(null)
    setShowAddObservationModal(true)
  }

  // Cerrar modal de agregar observación
  const handleCloseAddObservationModal = () => {
    setShowAddObservationModal(false)
    setObservationText('')
    setSuccessMessage(null)
  }

  // Agregar observación a un incidente
  const handleAddObservation = async (e) => {
    e.preventDefault()
    
    if (!selectedIncidentId || !observationText.trim()) {
      setErrorMessage('Por favor ingresa una observación.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Obtener user_profile_id del usuario actual
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profileError) {
        throw new Error(`Error al obtener perfil de usuario: ${profileError.message}`)
      }

      if (!currentUserProfile) {
        throw new Error('No se encontró tu perfil de usuario. Contacta al administrador.')
      }

      // Insertar la observación
      const { error: insertError } = await supabase
        .from('incident_observations')
        .insert({
          incident_id: selectedIncidentId,
          user_id: currentUserProfile.id,
          comment: observationText.trim(),
        })

      if (insertError) {
        throw insertError
      }

      setSuccessMessage('Observación agregada correctamente.')
      
      // Recargar el incidente seleccionado con las observaciones actualizadas
      if (selectedIncidentId) {
        const { data: refreshedIncident } = await supabase
          .from('incidents')
          .select(
            `
            id,
            situation,
            action,
            follow_up,
            created_at,
            updated_at,
            incident_type_id,
            student_id,
            incident_types (
              id,
              name,
              code,
              category
            ),
            student:students!incidents_student_id_fkey (
              id,
              first_name,
              paternal_last_name,
              maternal_last_name,
              control_number,
              email
            ),
            observations:incident_observations (
              id,
              comment,
              created_at,
              user:user_profiles!incident_observations_user_id_fkey (
                first_name,
                last_name,
                email
              )
            )
          `
          )
          .eq('id', selectedIncidentId)
          .single()
        
        if (refreshedIncident) {
          setSelectedIncident(refreshedIncident)
        }
      }

      await fetchAllIncidents()
      
      setTimeout(() => {
        handleCloseAddObservationModal()
      }, 1500)
    } catch (error) {
      console.error('Error al agregar observación:', error)
      const errorMessage = error?.message || error?.error_description || error?.code || 'Error desconocido'
      setErrorMessage(`No se pudo agregar la observación: ${errorMessage}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Actualizar incidente
  const handleUpdateIncident = async (e) => {
    e.preventDefault()
    
    if (!selectedIncidentId || !incidentForm.incidentTypeId) {
      setErrorMessage('Por favor completa todos los campos requeridos.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const studentId = selectedIncident?.student_id ?? incidentForm.studentId
      let groupId = null
      let teacherIdTutor = null
      if (studentId) {
        const { data: memberRow } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('student_id', studentId)
          .limit(1)
          .maybeSingle()
        if (memberRow?.group_id) {
          groupId = memberRow.group_id
          const { data: tutorRow } = await supabase
            .from('teacher_groups')
            .select('teacher_id')
            .eq('group_id', groupId)
            .eq('is_tutor', true)
            .maybeSingle()
          if (tutorRow?.teacher_id) teacherIdTutor = tutorRow.teacher_id
        }
      }

      const updatePayload = {
        incident_type_id: incidentForm.incidentTypeId,
        situation: incidentForm.situation || null,
        action: incidentForm.action || null,
        follow_up: incidentForm.follow_up || null,
        updated_at: new Date().toISOString(),
      }
      if (groupId != null) updatePayload.group_id = groupId
      if (teacherIdTutor != null) updatePayload.teacher_id = teacherIdTutor

      const { error: updateError } = await supabase
        .from('incidents')
        .update(updatePayload)
        .eq('id', selectedIncidentId)

      if (updateError) {
        throw updateError
      }

      setSuccessMessage('Incidente actualizado correctamente.')
      await fetchAllIncidents()
      
      // Actualizar el incidente seleccionado con las observaciones más recientes
      if (selectedIncidentId) {
        const { data: refreshedIncident } = await supabase
          .from('incidents')
          .select(
            `
            id,
            situation,
            action,
            follow_up,
            created_at,
            updated_at,
            incident_type_id,
            student_id,
            incident_types (
              id,
              name,
              code,
              category
            ),
            student:students!incidents_student_id_fkey (
              id,
              first_name,
              paternal_last_name,
              maternal_last_name,
              control_number,
              email
            ),
            observations:incident_observations (
              id,
              comment,
              created_at,
              user:user_profiles!incident_observations_user_id_fkey (
                first_name,
                last_name,
                email
              )
            )
          `
          )
          .eq('id', selectedIncidentId)
          .single()
        
        if (refreshedIncident) {
          setSelectedIncident(refreshedIncident)
        }
      }
      
      setTimeout(() => {
        handleCloseEditModal()
      }, 1500)
    } catch (error) {
      console.error('Error al actualizar incidente:', error)
      const errorMessage = error?.message || error?.error_description || error?.code || 'Error desconocido'
      setErrorMessage(`No se pudo actualizar el incidente: ${errorMessage}`)
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
              Incidentes ({incidents.length})
            </h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              Gestión de incidentes del sistema
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenEditModal}
              disabled={!selectedIncidentId || !selectedIncident}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
              title={!selectedIncidentId || !selectedIncident ? 'Selecciona un incidente para editar' : ''}
            >
              Editar Incidente
            </button>
            <button
              onClick={handleOpenAddObservationModal}
              disabled={!selectedIncidentId || !selectedIncident}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-600"
              title={!selectedIncidentId || !selectedIncident ? 'Selecciona un incidente para agregar observación' : ''}
            >
              Agregar Observación
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
            >
              Crear Nuevo Incidente
            </button>
          </div>
        </div>
      </div>

      {/* Contenedor con scroll */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {successMessage && <Alert type="success" message={successMessage} />}
        
        {/* Tabla de incidentes */}
        {incidentsLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Cargando incidentes...</p>
          </div>
        ) : (
          <SimpleTable
            columns={incidentTableColumns}
            data={incidents}
            selectedId={selectedIncidentId}
            onSelect={handleSelectIncident}
            loading={false}
            maxHeight="400px"
            collapsible={true}
            title="Lista de Incidentes"
            itemKey="id"
          />
        )}

        {/* Detalles del incidente seleccionado */}
        {selectedIncidentId && selectedIncident && (
          <DetailView
            selectedItem={selectedIncident}
            title={`Incidente: ${selectedIncident.incident_types?.name || 'Sin tipo'}`}
            tabs={[
              { id: 'overview', label: 'Detalles' },
              { id: 'student', label: 'Alumno' },
              { id: 'observations', label: 'Observaciones', badge: selectedIncident.observations?.length > 0 ? selectedIncident.observations.length : undefined },
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
                          Información del Incidente
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.incident_types?.name || '-'} {item.incident_types?.code && `(${item.incident_types.code})`}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Categoría:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.incident_types?.category || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Fecha:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.created_at ? new Date(item.created_at).toLocaleString('es-MX') : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Detalles
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Situación:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.situation || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Acción:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.action || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Seguimiento:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.follow_up || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              // Tab Alumno
              if (tab === 'student') {
                return (
                  <div className="space-y-4">
                    {item.student ? (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Información del Alumno
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
                        No hay información del alumno disponible.
                      </p>
                    )}
                  </div>
                )
              }

              // Tab Observaciones
              if (tab === 'observations') {
                return (
                  <div className="space-y-4">
                    {item.observations && item.observations.length > 0 ? (
                      <div className="space-y-3">
                        {item.observations.map((observation) => (
                          <div
                            key={observation.id}
                            className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {observation.user 
                                    ? (() => {
                                        const firstName = observation.user.first_name || ''
                                        const lastName = observation.user.last_name || ''
                                        const email = observation.user.email || ''
                                        const name = `${firstName} ${lastName}`.trim()
                                        return name || email || 'Usuario desconocido'
                                      })()
                                    : 'Usuario desconocido'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {observation.created_at ? new Date(observation.created_at).toLocaleString('es-MX') : '-'}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                              {observation.comment}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No hay observaciones registradas para este incidente.
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

      {/* Modal para crear incidente */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        title="Crear Nuevo Incidente"
        size="xl"
      >
        <form onSubmit={handleCreateIncident} className="space-y-6">
          {successMessage && <Alert type="success" message={successMessage} />}
          
          {/* Búsqueda de alumnos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Buscar Alumno
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
                      onClick={() => handleSelectStudentForIncident(student)}
                      className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        selectedStudentForIncident?.id === student.id
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

            {selectedStudentForIncident && (
              <div className={`p-3 rounded-lg border ${
                incidentForm.studentId
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
              }`}>
                <p className={`text-sm font-medium ${
                  incidentForm.studentId
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {incidentForm.studentId
                    ? `✓ Alumno seleccionado: ${selectedStudentForIncident.first_name} ${selectedStudentForIncident.paternal_last_name}`
                    : 'Error al seleccionar el alumno'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Formulario de incidente */}
          <div className="space-y-4 border-t border-gray-200 dark:border-slate-700 pt-4">
            <FormField label="Tipo de Incidente *" htmlFor="incident_type">
              <Select
                id="incident_type"
                value={incidentForm.incidentTypeId}
                onChange={(e) => setIncidentForm(prev => ({ ...prev, incidentTypeId: e.target.value }))}
                options={[
                  { value: '', label: 'Selecciona un tipo' },
                  ...incidentTypes.map(type => ({
                    value: type.id,
                    label: `${type.name} ${type.code ? `(${type.code})` : ''}`,
                  })),
                ]}
                required
              />
            </FormField>

            <FormField label="Situación" htmlFor="situation">
              <Textarea
                id="situation"
                value={incidentForm.situation}
                onChange={(e) => setIncidentForm(prev => ({ ...prev, situation: e.target.value }))}
                rows={3}
                placeholder="Describe la situación..."
              />
            </FormField>

            <FormField label="Acción" htmlFor="action">
              <Textarea
                id="action"
                value={incidentForm.action}
                onChange={(e) => setIncidentForm(prev => ({ ...prev, action: e.target.value }))}
                rows={3}
                placeholder="Describe la acción tomada..."
              />
            </FormField>

            <FormField label="Seguimiento" htmlFor="follow_up">
              <Textarea
                id="follow_up"
                value={incidentForm.follow_up}
                onChange={(e) => setIncidentForm(prev => ({ ...prev, follow_up: e.target.value }))}
                rows={3}
                placeholder="Describe el seguimiento..."
              />
            </FormField>

            <FormField label="Observación (opcional)" htmlFor="observation">
              <Textarea
                id="observation"
                value={incidentForm.observation}
                onChange={(e) => setIncidentForm(prev => ({ ...prev, observation: e.target.value }))}
                rows={2}
                placeholder="Agrega una observación inicial..."
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
              disabled={submitting || !incidentForm.studentId || !incidentForm.incidentTypeId}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !incidentForm.studentId 
                  ? 'Selecciona un alumno' 
                  : !incidentForm.incidentTypeId 
                  ? 'Selecciona un tipo de incidente' 
                  : ''
              }
            >
              {submitting ? 'Creando...' : 'Crear Incidente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal para editar incidente */}
      <Modal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        title="Editar Incidente"
        size="lg"
      >
        <form onSubmit={handleUpdateIncident} className="space-y-6">
          {successMessage && <Alert type="success" message={successMessage} />}
          
          <FormField label="Tipo de Incidente *" htmlFor="edit_incident_type">
            <Select
              id="edit_incident_type"
              value={incidentForm.incidentTypeId}
              onChange={(e) => setIncidentForm(prev => ({ ...prev, incidentTypeId: e.target.value }))}
              options={[
                { value: '', label: 'Selecciona un tipo' },
                ...incidentTypes.map(type => ({
                  value: type.id,
                  label: `${type.name} ${type.code ? `(${type.code})` : ''}`,
                })),
              ]}
              required
            />
          </FormField>

          <FormField label="Situación" htmlFor="edit_situation">
            <Textarea
              id="edit_situation"
              value={incidentForm.situation}
              onChange={(e) => setIncidentForm(prev => ({ ...prev, situation: e.target.value }))}
              rows={3}
            />
          </FormField>

          <FormField label="Acción" htmlFor="edit_action">
            <Textarea
              id="edit_action"
              value={incidentForm.action}
              onChange={(e) => setIncidentForm(prev => ({ ...prev, action: e.target.value }))}
              rows={3}
            />
          </FormField>

          <FormField label="Seguimiento" htmlFor="edit_follow_up">
            <Textarea
              id="edit_follow_up"
              value={incidentForm.follow_up}
              onChange={(e) => setIncidentForm(prev => ({ ...prev, follow_up: e.target.value }))}
              rows={3}
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
              disabled={submitting || !incidentForm.incidentTypeId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Actualizando...' : 'Actualizar Incidente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal para agregar observación */}
      <Modal
        isOpen={showAddObservationModal}
        onClose={handleCloseAddObservationModal}
        title="Agregar Observación"
        size="md"
      >
        <form onSubmit={handleAddObservation} className="space-y-6">
          {successMessage && <Alert type="success" message={successMessage} />}
          
          <FormField label="Observación *" htmlFor="observation_text">
            <Textarea
              id="observation_text"
              value={observationText}
              onChange={(e) => setObservationText(e.target.value)}
              rows={4}
              placeholder="Escribe tu observación sobre este incidente..."
              required
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleCloseAddObservationModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !observationText.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Agregando...' : 'Agregar Observación'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}