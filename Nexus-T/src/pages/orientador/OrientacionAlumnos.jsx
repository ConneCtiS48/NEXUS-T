import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import SimpleTable from '../../components/data/SimpleTable'
import DetailView from '../../components/data/DetailView'
import { studentsService } from '../../services/studentsService'
import Input from '../../components/forms/Input'

export default function OrientacionAlumnos({ setErrorMessage }) {
  // Estados para consulta de alumnos (solo lectura)
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentGroup, setStudentGroup] = useState(null)
  const [studentIncidents, setStudentIncidents] = useState([])
  const [studentJustifications, setStudentJustifications] = useState([])
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [filteredStudents, setFilteredStudents] = useState([])

  // Columnas para la tabla de estudiantes
  const studentTableColumns = [
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

  // Cargar estudiantes cuando se monta el componente
  useEffect(() => {
    fetchAllStudents()
  }, [])

  // Filtrar estudiantes cuando cambia la búsqueda
  useEffect(() => {
    if (!studentSearch.trim()) {
      setFilteredStudents(students)
      return
    }

    // Parsear búsqueda avanzada: "columna=valor, columna2=valor2"
    const filters = studentSearch.split(',').map(f => f.trim()).filter(f => f)
    const filtered = students.filter(student => {
      return filters.every(filter => {
        const [column, value] = filter.split('=').map(s => s.trim())
        if (!column || !value) return true // Si no es válido, ignorar

        const columnLower = column.toLowerCase()
        const valueLower = value.toLowerCase()

        // Mapeo de columnas
        if (columnLower === 'control_number' || columnLower === 'control' || columnLower === 'numero' || columnLower === 'número') {
          return (student.control_number || '').toLowerCase().includes(valueLower)
        }
        if (columnLower === 'nombre' || columnLower === 'name' || columnLower === 'first_name') {
          const fullName = `${student.first_name || ''} ${student.paternal_last_name || ''} ${student.maternal_last_name || ''}`.toLowerCase()
          return fullName.includes(valueLower)
        }
        if (columnLower === 'grupo' || columnLower === 'group') {
          // Buscar por grupo usando la información pre-cargada
          if (student.group) {
            const groupName = (student.group.nomenclature || '').toLowerCase()
            const groupInfo = `${student.group.grade}° ${student.group.specialty} ${student.group.section || ''}`.toLowerCase()
            return groupName.includes(valueLower) || groupInfo.includes(valueLower)
          }
          return false
        }
        if (columnLower === 'email') {
          return (student.email || '').toLowerCase().includes(valueLower)
        }
        
        // Búsqueda genérica en todos los campos
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

    setFilteredStudents(filtered)
  }, [studentSearch, students])

  // Cargar todos los estudiantes con sus grupos
  const fetchAllStudents = async () => {
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

  // Cargar detalles de un estudiante
  const fetchStudentDetails = async (studentId) => {
    setStudentDetailsLoading(true)
    try {
      // Paso 1: Cargar información básica del estudiante
      const studentResult = await studentsService.fetchById(studentId)
      if (studentResult.error) throw studentResult.error
      setSelectedStudent(studentResult.data)

      // Paso 2: Cargar grupo del estudiante
      const groupResult = await studentsService.fetchStudentGroup(studentId)
      if (groupResult.error) {
        console.warn('Error al cargar grupo del estudiante:', groupResult.error)
        setStudentGroup(null)
      } else {
        setStudentGroup(groupResult.data)
      }

      // Paso 3: Buscar perfil en user_profiles para obtener incidencias y justificantes
      // Buscar por nombre y email para encontrar el user_profile correspondiente
      const student = studentResult.data
      
      let userProfileId = null
      if (student.email) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', student.email)
          .maybeSingle()
        
        if (profile) {
          userProfileId = profile.id
        }
      }

      // Si no se encontró por email, buscar por nombre
      if (!userProfileId) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name')
          .ilike('first_name', `%${student.first_name}%`)
          .ilike('last_name', `%${student.paternal_last_name}%`)
          .limit(1)
        
        if (profiles && profiles.length > 0) {
          userProfileId = profiles[0].id
        }
      }

      // Paso 4: Cargar incidencias si se encontró userProfileId
      if (userProfileId) {
        const { data: incidentsData, error: incidentsError } = await supabase
          .from('incidents')
          .select(
            `
            id,
            situation,
            action,
            follow_up,
            created_at,
            incident_types (
              id,
              name,
              code,
              category
            ),
            teacher_subject:teacher_subjects (
              id,
              subject_name,
              shift,
              group:groups (
                id,
                nomenclature
              )
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
          .eq('student_id', userProfileId)
          .order('created_at', { ascending: false })

        if (incidentsError) {
          console.warn('Error al cargar incidencias:', incidentsError)
          setStudentIncidents([])
        } else {
          setStudentIncidents(incidentsData || [])
        }

        // Paso 5: Cargar justificantes
        const { data: justificationsData, error: justificationsError } = await supabase
          .from('justifications')
          .select(
            `
            id,
            reason,
            created_at,
            group:groups (
              id,
              nomenclature,
              grade,
              specialty,
              section
            )
          `
          )
          .eq('student_id', userProfileId)
          .order('created_at', { ascending: false })

        if (justificationsError) {
          console.warn('Error al cargar justificantes:', justificationsError)
          setStudentJustifications([])
        } else {
          setStudentJustifications(justificationsData || [])
        }
      } else {
        setStudentIncidents([])
        setStudentJustifications([])
      }
    } catch (err) {
      console.error('Error al cargar detalles del estudiante:', err)
      if (setErrorMessage) {
        setErrorMessage('No se pudieron cargar los detalles del estudiante.')
      }
    } finally {
      setStudentDetailsLoading(false)
    }
  }

  // Manejar selección de estudiante
  const handleSelectStudent = (id) => {
    const student = students.find((s) => s.id === id)
    if (student) {
      setSelectedStudentId(id)
      fetchStudentDetails(id)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-300px)] min-h-[600px]">
      {/* Header fijo */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              Alumnos ({filteredStudents.length})
            </h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              Consulta de alumnos del sistema
            </p>
          </div>
        </div>
      </div>

      {/* Campo de búsqueda avanzada - fijo */}
      <div className="flex-shrink-0 mb-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Búsqueda Avanzada
          </label>
          <Input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder='Ejemplo: control_number=12345, nombre=Juan, grupo=3A, email=correo@ejemplo.com'
            className="w-full"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Formato: columna=valor separado por comas. Columnas disponibles: control_number, nombre, grupo, email
          </p>
        </div>
      </div>

      {/* Contenedor con scroll para tabla y detalles */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {/* Tabla de alumnos */}
        {studentsLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Cargando alumnos...</p>
          </div>
        ) : (
          <SimpleTable
            columns={studentTableColumns}
            data={filteredStudents}
            selectedId={selectedStudentId}
            onSelect={handleSelectStudent}
            loading={false}
            maxHeight="400px"
            collapsible={true}
            title="Lista de Alumnos"
            itemKey="id"
          />
        )}

        {/* Detalles del alumno seleccionado */}
        {selectedStudentId && selectedStudent && (
        <DetailView
          selectedItem={selectedStudent}
          title={`Detalles: ${selectedStudent.first_name} ${selectedStudent.paternal_last_name}`}
          tabs={[
            { id: 'overview', label: 'Detalles' },
            { id: 'incidents', label: 'Incidencias', badge: studentIncidents.length > 0 ? studentIncidents.length : undefined },
            { id: 'justifications', label: 'Justificantes', badge: studentJustifications.length > 0 ? studentJustifications.length : undefined },
            { id: 'group', label: 'Grupo', badge: studentGroup ? 1 : undefined },
          ]}
          defaultTab="overview"
          collapsible={true}
          onCollapseChange={() => {}}
          renderContent={(item, tab) => {
            // Tab Detalles del Alumno
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
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Información de Contacto
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Contacto:</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {item.contact_name || '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Teléfono de Contacto:</span>
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
                </div>
              )
            }

            // Tab Incidencias
            if (tab === 'incidents') {
              return (
                <div className="space-y-2">
                  {studentDetailsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cargando incidencias...</p>
                  ) : studentIncidents.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No hay incidencias registradas para este alumno.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Tipo
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Situación
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Acción
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Fecha
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {studentIncidents.map((incident) => (
                            <tr key={incident.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                {incident.incident_types?.name || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                {incident.situation || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                {incident.action || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                {incident.created_at ? new Date(incident.created_at).toLocaleDateString('es-MX') : '-'}
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

            // Tab Justificantes
            if (tab === 'justifications') {
              return (
                <div className="space-y-2">
                  {studentDetailsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cargando justificantes...</p>
                  ) : studentJustifications.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No hay justificantes registrados para este alumno.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {studentJustifications.map((justification) => (
                        <div
                          key={justification.id}
                          className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                {justification.reason}
                              </p>
                              {justification.group && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Grupo: {justification.group.nomenclature}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {justification.created_at ? new Date(justification.created_at).toLocaleDateString('es-MX') : '-'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Fecha: {justification.created_at ? new Date(justification.created_at).toLocaleDateString('es-MX') : '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            // Tab Grupo
            if (tab === 'group') {
              return (
                <div className="space-y-2">
                  {studentDetailsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cargando grupo...</p>
                  ) : studentGroup && studentGroup.group ? (
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
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Grado:</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {studentGroup.group.grade}°
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Especialidad:</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {studentGroup.group.specialty}
                          </p>
                        </div>
                        {studentGroup.group.section && (
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sección:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {studentGroup.group.section}
                            </p>
                          </div>
                        )}
                        {studentGroup.is_group_leader && (
                          <div className="mt-3">
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

            return null
          }}
        />
        )}
      </div>
    </div>
  )
}
