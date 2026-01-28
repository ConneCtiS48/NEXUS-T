import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import SimpleTable from '../../components/data/SimpleTable'
import DetailView from '../../components/data/DetailView'
import PageHeader from '../../components/layout/PageHeader'

const SHIFT_MAP = {
  M: 'Matutino',
  V: 'Vespertino',
}

const formatName = (profile) => {
  if (!profile) return 'Sin nombre'
  if (profile.first_name && profile.paternal_last_name) {
    return `${profile.first_name} ${profile.paternal_last_name} ${profile.maternal_last_name || ''}`.trim()
  }
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`.trim()
  }
  return profile.first_name || profile.email || 'Sin nombre'
}

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Sin fecha'

export default function DocenteDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [tutorGroup, setTutorGroup] = useState(null)
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  
  // Estados para datos de grupos seleccionados
  const [groupMembers, setGroupMembers] = useState([])
  const [groupJustifications, setGroupJustifications] = useState([])
  const [tutorGroupMembers, setTutorGroupMembers] = useState([])
  const [tutorGroupJustifications, setTutorGroupJustifications] = useState([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Cargar grupos asignados al docente
  useEffect(() => {
    if (!user) return

    const fetchGroups = async () => {
      setLoading(true)
      setErrorMessage(null)

      try {
        // Obtener grupos asignados desde teacher_groups (donde NO es tutor)
        const { data: teacherGroupsData, error: tgError } = await supabase
          .from('teacher_groups')
          .select(
            `
              id,
              group_id,
              group:groups (
                id,
                grade,
                specialty,
                section,
                nomenclature
              )
            `
          )
          .eq('teacher_id', user.id)
          .eq('is_tutor', false)
          .order('created_at', { ascending: true })

        if (tgError) throw tgError

        // Obtener asignaturas desde teacher_group_subjects para cada grupo
        const groupIds = teacherGroupsData?.map(tg => tg.group_id) || []
        
        let groupsMap = new Map()
        
        // Inicializar grupos desde teacher_groups
        if (teacherGroupsData) {
          teacherGroupsData.forEach((tg) => {
            const groupId = tg.group_id
            const group = Array.isArray(tg.group) ? tg.group[0] : tg.group
            if (group) {
              groupsMap.set(groupId, {
                id: groupId,
                group: group,
                subjects: [],
              })
            }
          })
        }

        // Obtener asignaturas para estos grupos
        if (groupIds.length > 0) {
          const { data: assignments, error: assignError } = await supabase
            .from('teacher_group_subjects')
            .select(
              `
                id,
                shift,
                group_id,
                subject:subjects!teacher_group_subjects_subject_id_fkey (
                  id,
                  subject_name
                )
              `
            )
            .eq('teacher_id', user.id)
            .in('group_id', groupIds)
            .order('created_at', { ascending: true })

          if (assignError) {
            console.warn('Error al cargar asignaturas:', assignError)
            // Continuar sin asignaturas si hay error
          } else if (assignments) {
            // Agregar asignaturas a los grupos correspondientes
            assignments.forEach((assignment) => {
              const groupId = assignment.group_id
              const groupData = groupsMap.get(groupId)
              if (groupData && assignment.subject) {
                groupData.subjects.push({
                  id: assignment.id,
                  subject_name: assignment.subject.subject_name || 'Sin nombre',
                  shift: assignment.shift,
                })
              }
            })
          }
        }

        const groupsList = Array.from(groupsMap.values())
        setGroups(groupsList)

        // Obtener grupo donde es tutor
        const { data: tutorGroupData, error: tutorError } = await supabase
          .from('teacher_groups')
          .select(
            `
              group_id,
              group:groups (
                id,
                grade,
                specialty,
                section,
                nomenclature
              )
            `
          )
          .eq('teacher_id', user.id)
          .eq('is_tutor', true)
          .maybeSingle()

        if (tutorError) {
          console.warn('Error al cargar grupo tutorado:', tutorError)
          setTutorGroup(null)
        } else {
          if (tutorGroupData) {
            const tutorGroup = Array.isArray(tutorGroupData.group) 
              ? tutorGroupData.group[0] 
              : tutorGroupData.group
            setTutorGroup(tutorGroup)
          } else {
            setTutorGroup(null)
          }
        }
      } catch (error) {
        console.error('❌ Error al cargar grupos del docente:', error)
        setErrorMessage('No se pudieron cargar tus grupos asignados.')
        setGroups([])
        setTutorGroup(null)
      } finally {
        setLoading(false)
      }
    }

    fetchGroups()
  }, [user])

  // Cargar detalles cuando se selecciona un grupo
  useEffect(() => {
    if (!selectedGroupId || !user) return

    const fetchGroupDetails = async () => {
      setLoadingDetails(true)
      try {
        await Promise.all([
          fetchGroupMembers(selectedGroupId),
          fetchGroupJustifications(selectedGroupId),
        ])
      } catch (error) {
        console.error('Error al cargar detalles del grupo:', error)
      } finally {
        setLoadingDetails(false)
      }
    }

    fetchGroupDetails()
  }, [selectedGroupId, user])

  // Cargar detalles del grupo tutorado
  useEffect(() => {
    if (!tutorGroup?.id || !user) return

    const fetchTutorGroupDetails = async () => {
      try {
        await Promise.all([
          fetchTutorGroupMembers(tutorGroup.id),
          fetchTutorGroupJustifications(tutorGroup.id),
        ])
      } catch (error) {
        console.error('Error al cargar detalles del grupo tutor:', error)
      }
    }

    fetchTutorGroupDetails()
  }, [tutorGroup?.id, user])

  const fetchGroupMembers = async (groupId) => {
    const { data, error } = await supabase
      .from('group_members')
      .select(
        `
          id,
          is_group_leader,
          student:students!group_members_student_id_fkey (
            id,
            control_number,
            first_name,
            paternal_last_name,
            maternal_last_name,
            email
          )
        `
      )
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error al obtener miembros del grupo:', error)
      setGroupMembers([])
    } else {
      setGroupMembers(data || [])
    }
  }

  const fetchGroupJustifications = async (groupId) => {
    if (!user) return

    const { data, error } = await supabase
      .from('justifications')
      .select(
        `
          id,
          reason,
          created_at,
          student:students!justifications_student_id_fkey (
            id,
            control_number,
            first_name,
            paternal_last_name,
            maternal_last_name
          ),
          group:groups!justifications_group_id_fkey (
            id,
            nomenclature
          )
        `
      )
      .eq('group_id', groupId)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al obtener justificantes:', error)
      setGroupJustifications([])
    } else {
      setGroupJustifications(data || [])
    }
  }

  const fetchTutorGroupMembers = async (groupId) => {
    const { data, error } = await supabase
      .from('group_members')
      .select(
        `
          id,
          is_group_leader,
          student:students!group_members_student_id_fkey (
            id,
            control_number,
            first_name,
            paternal_last_name,
            maternal_last_name,
            email
          )
        `
      )
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error al obtener miembros del grupo tutor:', error)
      setTutorGroupMembers([])
    } else {
      setTutorGroupMembers(data || [])
    }
  }

  const fetchTutorGroupJustifications = async (groupId) => {
    if (!user) return

    const { data, error } = await supabase
      .from('justifications')
      .select(
        `
          id,
          reason,
          created_at,
          student:students!justifications_student_id_fkey (
            id,
            control_number,
            first_name,
            paternal_last_name,
            maternal_last_name
          ),
          group:groups!justifications_group_id_fkey (
            id,
            nomenclature
          ),
          teacher:user_profiles!justifications_teacher_id_fkey (
            user_id,
            first_name,
            last_name
          )
        `
      )
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al obtener justificantes del grupo tutor:', error)
      setTutorGroupJustifications([])
    } else {
      setTutorGroupJustifications(data || [])
    }
  }

  const handleSelect = (id) => {
    setSelectedGroupId(id)
    setActiveTab('overview')
  }

  const handleSelectGroup = (subjectId, groupId) => {
    navigate(`/docente/grupos?subjectId=${subjectId}&groupId=${groupId}`)
  }

  const tableColumns = [
    {
      key: 'nomenclature',
      label: 'Grupo',
      render: (value, row) => row.group?.nomenclature || '-',
    },
    {
      key: 'grade',
      label: 'Grado',
      render: (value, row) => row.group?.grade ? `${row.group.grade}°` : '-',
    },
    {
      key: 'specialty',
      label: 'Especialidad',
      render: (value, row) => row.group?.specialty || '-',
    },
    {
      key: 'subjects',
      label: 'Asignaturas',
      render: (value, row) => {
        if (!row.subjects || row.subjects.length === 0) return '-'
        return row.subjects.map((s) => s.subject_name).join(', ')
      },
    },
  ]

  const selectedGroup = groups.find((g) => g.id === selectedGroupId)

  // Tabs para grupos asignados
  const groupTabs = [
    { id: 'overview', label: 'Información' },
    { id: 'students', label: 'Alumnos', badge: groupMembers.length > 0 ? groupMembers.length : undefined },
    { id: 'justifications', label: 'Justificantes', badge: groupJustifications.length > 0 ? groupJustifications.length : undefined },
  ]

  // Tabs para grupo tutorado
  const tutorTabs = [
    { id: 'overview', label: 'Información' },
    { id: 'students', label: 'Alumnos', badge: tutorGroupMembers.length > 0 ? tutorGroupMembers.length : undefined },
    { id: 'justifications', label: 'Justificantes', badge: tutorGroupJustifications.length > 0 ? tutorGroupJustifications.length : undefined },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader
        title="Mis Grupos Asignados"
        description="Visualiza y gestiona tus grupos asignados como docente."
      />

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="space-y-6">
        {/* Tabla de grupos asignados */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Grupos Asignados ({groups.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Cargando grupos...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No tienes grupos asignados.
              </p>
            </div>
          ) : (
            <SimpleTable
              columns={tableColumns}
              data={groups}
              selectedId={selectedGroupId}
              onSelect={handleSelect}
              loading={loadingDetails}
              maxHeight="500px"
              collapsible={true}
              title="Lista de Grupos"
              itemKey="id"
            />
          )}
        </div>

        {/* Detalles del grupo seleccionado */}
        {selectedGroupId && selectedGroup && (
          <DetailView
            selectedItem={selectedGroup}
            title={`Detalles: ${selectedGroup.group?.nomenclature || 'Grupo'}`}
            tabs={groupTabs}
            defaultTab={activeTab}
            collapsible={true}
            onCollapseChange={() => {}}
            renderContent={(item, tab) => {
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
                              {item.group?.nomenclature || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Grado:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.group?.grade ? `${item.group.grade}°` : '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Especialidad:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.group?.specialty || '-'}
                            </p>
                          </div>
                          {item.group?.section && (
                            <div>
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sección:</span>
                              <p className="text-sm text-gray-900 dark:text-white mt-1">
                                {item.group.section}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Asignaturas Impartidas
                        </h3>
                        <div className="space-y-2">
                          {item.subjects && item.subjects.length > 0 ? (
                            item.subjects.map((subject, idx) => (
                              <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-700">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {subject.subject_name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Turno: {SHIFT_MAP[subject.shift] || subject.shift}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              No hay asignaturas asignadas.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

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
                              <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {member.student?.control_number || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {formatName(member.student)}
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

              if (tab === 'justifications') {
                return (
                  <div className="space-y-2">
                    {groupJustifications.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No hay justificantes registrados para este grupo.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {groupJustifications.map((justification) => (
                          <div
                            key={justification.id}
                            className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-slate-700"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {formatName(justification.student)}
                                </p>
                                {justification.student?.control_number && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    No. Control: {justification.student.control_number}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(justification.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                              {justification.reason}
                            </p>
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

        {/* Grupo Tutorado */}
        {tutorGroup && (
          <DetailView
            selectedItem={tutorGroup}
            title={`Grupo Tutorado: ${tutorGroup.nomenclature || 'Grupo'}`}
            tabs={tutorTabs}
            defaultTab="overview"
            collapsible={true}
            onCollapseChange={() => {}}
            renderContent={(item, tab) => {
              if (tab === 'overview') {
                return (
                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">👨‍🏫</span>
                        <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                          Eres el tutor de este grupo
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nomenclatura:</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {item.nomenclature || '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Grado:</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {item.grade ? `${item.grade}°` : '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Especialidad:</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {item.specialty || '-'}
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
                )
              }

              if (tab === 'students') {
                return (
                  <div className="space-y-2">
                    {tutorGroupMembers.length === 0 ? (
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
                                Email
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Rol
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {tutorGroupMembers.map((member) => (
                              <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {member.student?.control_number || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {formatName(member.student)}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {member.student?.email || '-'}
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

              if (tab === 'justifications') {
                return (
                  <div className="space-y-2">
                    {tutorGroupJustifications.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No hay justificantes registrados para este grupo.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {tutorGroupJustifications.map((justification) => (
                          <div
                            key={justification.id}
                            className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-slate-700"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {formatName(justification.student)}
                                </p>
                                {justification.student?.control_number && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    No. Control: {justification.student.control_number}
                                  </p>
                                )}
                                {justification.teacher && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Docente: {formatName(justification.teacher)}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(justification.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                              {justification.reason}
                            </p>
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
    </div>
  )
}
