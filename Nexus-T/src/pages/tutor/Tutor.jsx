import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import RoleNavigation from '../../components/RoleNavigation'
import DetailView from '../../components/data/DetailView'
import { groupsService } from '../../services/groupsService'
import Incidencias from '../docente/Incidencias'
import Justificantes from '../justificantes/Justificantes'

export default function Tutor() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('grupo')
  const [errorMessage, setErrorMessage] = useState(null)
  const [message, setMessage] = useState(null)
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Estados para el tab de grupo
  const [groupDetails, setGroupDetails] = useState(null)
  const [groupTeachers, setGroupTeachers] = useState([])
  const [groupTutor, setGroupTutor] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [groupSubjects, setGroupSubjects] = useState([])
  const [groupDetailsLoading, setGroupDetailsLoading] = useState(false)

  const tabs = [
    { id: 'grupo', label: 'Grupo', icon: '👥' },
    { id: 'justificantes', label: 'Justificantes', icon: '📄' },
    { id: 'incidencias', label: 'Incidencias', icon: '⚠️' },
  ]

  // Obtener el grupo del tutor usando teacher_groups
  useEffect(() => {
    if (!user) return

    const fetchTutorGroup = async () => {
      setLoading(true)
      setErrorMessage(null)

      try {
        // Obtener el grupo donde el usuario es tutor
        const { data: teacherGroup, error: tgError } = await supabase
          .from('teacher_groups')
          .select('group_id')
          .eq('teacher_id', user.id)
          .eq('is_tutor', true)
          .maybeSingle()

        if (tgError) {
          throw tgError
        }

        if (!teacherGroup) {
          setGroup(null)
          setLoading(false)
          return
        }

        // Obtener información del grupo
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('id, grade, specialty, section, nomenclature, shift')
          .eq('id', teacherGroup.group_id)
          .maybeSingle()

        if (groupError) {
          throw groupError
        }

        setGroup(groupData)
      } catch (error) {
        console.error('Error al cargar grupo del tutor:', error)
        let errorMsg = 'No pudimos obtener tu grupo asignado.'
        if (error.code === 'PGRST116') {
          errorMsg = 'Error de permisos. Verifica las políticas RLS en Supabase.'
        } else if (error.message) {
          errorMsg = `Error: ${error.message}`
        }
        setErrorMessage(errorMsg)
        setGroup(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTutorGroup()
  }, [user])

  // Cargar detalles del grupo cuando cambia el grupo o el tab
  useEffect(() => {
    if (!group || activeTab !== 'grupo') {
      return
    }

    fetchGroupDetails()
  }, [group?.id, activeTab])

  const fetchGroupDetails = async () => {
    if (!group?.id) return

    setGroupDetailsLoading(true)
    try {
      // Paso 1: Cargar información básica del grupo
      const groupResult = await groupsService.fetchById(group.id)
      if (groupResult.error) throw groupResult.error
      setGroupDetails(groupResult.data)

      // Paso 2: Cargar docentes del grupo
      const teachersResult = await groupsService.fetchTeachers(group.id)
      if (teachersResult.error) throw teachersResult.error

      // Paso 3: Obtener perfiles de docentes
      const teacherProfilesResult = await groupsService.fetchTeacherProfiles(teachersResult.data)
      if (teacherProfilesResult.error) throw teacherProfilesResult.error

      // Separar tutor de otros docentes
      const allTeachers = teacherProfilesResult.data || []
      const tutor = allTeachers.find((t) => t.is_tutor === true) || null
      const otherTeachers = allTeachers.filter((t) => t.is_tutor === false)

      setGroupTutor(tutor)
      setGroupTeachers(otherTeachers)

      // Paso 4: Cargar miembros del grupo
      const membersResult = await groupsService.fetchMembers(group.id)
      if (membersResult.error) throw membersResult.error

      // Paso 5: Obtener perfiles de estudiantes desde students
      const studentIds = membersResult.data.map(m => m.student_id)
      if (studentIds.length > 0) {
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, control_number, first_name, paternal_last_name, maternal_last_name, email, phone')
          .in('id', studentIds)

        if (studentsError) throw studentsError

        // Combinar con información de group_members
        const studentsMap = new Map(studentsData.map(s => [s.id, s]))
        const combined = membersResult.data.map(member => ({
          ...member,
          student: studentsMap.get(member.student_id) || null,
        }))

        setGroupMembers(combined)
      } else {
        setGroupMembers([])
      }

      // Paso 6: Obtener IDs de asignaturas
      const subjectIdsResult = await groupsService.fetchSubjectIds(group.id)
      if (subjectIdsResult.error) throw subjectIdsResult.error

      // Paso 7: Obtener información completa de asignaturas
      const subjectDetailsResult = await groupsService.fetchSubjectDetails(subjectIdsResult.data)
      if (subjectDetailsResult.error) throw subjectDetailsResult.error

      setGroupSubjects(subjectDetailsResult.data || [])
    } catch (err) {
      console.error('Error al cargar detalles del grupo:', err)
      if (setErrorMessage) {
        setErrorMessage('No se pudieron cargar los detalles del grupo.')
      }
    } finally {
      setGroupDetailsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <RoleNavigation currentRole="tutor" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <header className="flex flex-col gap-2">
          <p className="text-xs sm:text-sm uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">
            Sesión tutor
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Gestión de grupo y seguimiento
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            {user?.email ? `Sesión iniciada como ${user.email}` : 'Usuario no identificado'}
          </p>
        </header>

        {(message || errorMessage) && (
          <div
            className={`p-4 rounded-lg border ${
              errorMessage
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
            }`}
          >
            {errorMessage ?? message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Cargando información del grupo...</p>
        ) : group && (
          <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 sm:p-6 border border-blue-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  Grupo: {group.nomenclature}
                </h2>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                  {group.grade}° {group.specialty}
                  {group.section ? ` • Sección: ${group.section}` : ''}
                  {group.shift ? ` • Turno: ${group.shift === 'M' ? 'Matutino' : 'Vespertino'}` : ''}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Menú de Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-blue-100 dark:border-slate-800 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setErrorMessage(null)
                  setMessage(null)
                }}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {/* Tab: Grupo */}
            {activeTab === 'grupo' && (
              <div className="space-y-6">
                {!group ? (
                  <div className="text-center py-8">
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                      No tienes un grupo asignado como tutor. Contacta a Orientación Educativa.
                    </p>
                  </div>
                ) : groupDetailsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">Cargando información del grupo...</p>
                  </div>
                ) : !groupDetails ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No se encontró información del grupo.</p>
                  </div>
                ) : (
                      <DetailView
                        selectedItem={groupDetails}
                        title={`Detalles: ${groupDetails.nomenclature}`}
                        tabs={[
                          { id: 'overview', label: 'Detalles' },
                          { id: 'teachers', label: 'Docentes', badge: ((groupTutor ? 1 : 0) + groupTeachers.length) > 0 ? ((groupTutor ? 1 : 0) + groupTeachers.length) : undefined },
                          { id: 'students', label: 'Alumnos', badge: groupMembers.length > 0 ? groupMembers.length : undefined },
                          { id: 'subjects', label: 'Asignaturas', badge: groupSubjects.length > 0 ? groupSubjects.length : undefined },
                        ]}
                        defaultTab="overview"
                        collapsible={true}
                        onCollapseChange={() => {}}
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
                                      <div>
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sección:</span>
                                        <p className="text-sm text-gray-900 dark:text-white mt-1">
                                          {item.section || '-'}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Turno:</span>
                                        <p className="text-sm text-gray-900 dark:text-white mt-1">
                                          {item.shift ? (item.shift === 'M' ? 'Matutino' : item.shift === 'V' ? 'Vespertino' : item.shift) : '-'}
                                        </p>
                                      </div>
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
                                {groupTutor && (
                                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                    <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">
                                      Tutor del Grupo
                                    </h3>
                                    <div className="space-y-2">
                                      <div>
                                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Nombre:</span>
                                        <p className="text-sm text-blue-900 dark:text-blue-100 mt-1">
                                          {`${groupTutor.first_name || ''} ${groupTutor.last_name || ''}`.trim() || '-'}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Email:</span>
                                        <p className="text-sm text-blue-900 dark:text-blue-100 mt-1">
                                          {groupTutor.email || '-'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {groupTeachers.length > 0 && (
                                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                                      Otros Docentes ({groupTeachers.length})
                                    </h3>
                                    <div className="space-y-3">
                                      {groupTeachers.map((teacher) => (
                                        <div key={teacher.id} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {`${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || '-'}
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {teacher.email || '-'}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {!groupTutor && groupTeachers.length === 0 && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No hay docentes asignados a este grupo.
                                  </p>
                                )}
                              </div>
                            )
                          }

                          // Tab Alumnos
                          if (tab === 'students') {
                            return (
                              <div className="space-y-4">
                                {groupMembers.length === 0 ? (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No hay alumnos registrados en este grupo.
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {groupMembers.map((member) => (
                                      <div
                                        key={member.id}
                                        className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                              {member.student
                                                ? `${member.student.first_name || ''} ${member.student.paternal_last_name || ''} ${member.student.maternal_last_name || ''}`.trim()
                                                : 'Alumno no encontrado'}
                                            </p>
                                            <div className="mt-2 space-y-1">
                                              {member.student?.control_number && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                  No. Control: {member.student.control_number}
                                                </p>
                                              )}
                                              {member.student?.email && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                  Email: {member.student.email}
                                                </p>
                                              )}
                                              {member.student?.phone && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                  Teléfono: {member.student.phone}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          {member.is_group_leader && (
                                            <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                              Jefe de Grupo
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          }

                          // Tab Asignaturas
                          if (tab === 'subjects') {
                            return (
                              <div className="space-y-4">
                                {groupSubjects.length === 0 ? (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No hay asignaturas asignadas a este grupo.
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {groupSubjects.map((subject) => (
                                      <div
                                        key={subject.id}
                                        className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                                      >
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                          {subject.subject_name || '-'}
                                        </p>
                                        <div className="mt-2 space-y-1">
                                          {subject.teacher && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                              Docente: {`${subject.teacher.first_name || ''} ${subject.teacher.last_name || ''}`.trim() || '-'}
                                            </p>
                                          )}
                                          {subject.shift && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                              Turno: {subject.shift === 'M' ? 'Matutino' : 'Vespertino'}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          }

                          return null
                        }}
                      />
                    )}
                  </div>
                )}

            {/* Tab: Justificantes */}
            {activeTab === 'justificantes' && (
              <Justificantes setErrorMessage={setErrorMessage} readOnly={true} />
            )}

            {/* Tab: Incidencias */}
            {activeTab === 'incidencias' && (
              <Incidencias setErrorMessage={setErrorMessage} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
