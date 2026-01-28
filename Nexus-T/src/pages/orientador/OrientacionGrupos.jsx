import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import SimpleTable from '../../components/data/SimpleTable'
import DetailView from '../../components/data/DetailView'
import { groupsService } from '../../services/groupsService'

export default function OrientacionGrupos({ setErrorMessage }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Estados para consulta de grupos (solo lectura)
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupTeachers, setGroupTeachers] = useState([])
  const [groupTutor, setGroupTutor] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [groupSubjects, setGroupSubjects] = useState([])
  const [groupDetailsLoading, setGroupDetailsLoading] = useState(false)

  // Columnas para la tabla de grupos
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

  // Cargar grupos al montar el componente
  useEffect(() => {
    fetchGroups()
  }, [])

  // Función para cargar grupos
  const fetchGroups = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, grade, specialty, section, nomenclature, shift')
        .order('nomenclature', { ascending: true })

      if (error) {
        console.error('Error al cargar grupos:', error)
        setGroups([])
      } else {
        // Obtener tutores de los grupos
        const { data: tutorData, error: tutorError } = await supabase
          .from('teacher_groups')
          .select('group_id, teacher_id, is_tutor')
          .eq('is_tutor', true)

        if (!tutorError && tutorData && tutorData.length > 0) {
          const tutorMap = new Map()
          tutorData.forEach((tutor) => {
            if (!tutorMap.has(tutor.group_id)) {
              tutorMap.set(tutor.group_id, [])
            }
            tutorMap.get(tutor.group_id).push(tutor.teacher_id)
          })

          // Obtener perfiles de tutores
          const tutorIds = Array.from(new Set(tutorData.map((t) => t.teacher_id)))
          const { data: tutorProfiles } = await supabase
            .from('user_profiles')
            .select('id, first_name, last_name, email, user_id')
            .in('user_id', tutorIds)

          const groupTutorMap = new Map()
          if (tutorProfiles) {
            tutorProfiles.forEach((profile) => {
              const groupId = tutorData.find((t) => t.teacher_id === profile.user_id)?.group_id
              if (groupId) {
                groupTutorMap.set(groupId, profile)
              }
            })
          }

          // Combinar grupos con sus tutores
          setGroups(
            (data ?? []).map((group) => ({
              ...group,
              tutor: groupTutorMap.get(group.id) || null,
            }))
          )
        } else {
          setGroups(data ?? [])
        }
      }
    } catch (error) {
      console.error('Error al cargar grupos:', error)
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  // Función para cargar detalles de un grupo (solo lectura)
  const fetchGroupDetails = async (groupId) => {
    setGroupDetailsLoading(true)
    try {
      // Paso 1: Cargar información básica del grupo
      const groupResult = await groupsService.fetchById(groupId)
      if (groupResult.error) throw groupResult.error
      setSelectedGroup(groupResult.data)

      // Paso 2: Cargar docentes del grupo
      const teachersResult = await groupsService.fetchTeachers(groupId)
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
      const membersResult = await groupsService.fetchMembers(groupId)
      if (membersResult.error) throw membersResult.error

      // Paso 5: Obtener perfiles de estudiantes
      const studentProfilesResult = await groupsService.fetchStudentProfiles(membersResult.data)
      if (studentProfilesResult.error) throw studentProfilesResult.error

      setGroupMembers(studentProfilesResult.data || [])

      // Paso 6: Obtener IDs de asignaturas
      const subjectIdsResult = await groupsService.fetchSubjectIds(groupId)
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

  // Manejar selección de grupo
  const handleSelectGroup = (id) => {
    const group = groups.find((g) => g.id === id)
    if (group) {
      setSelectedGroupId(id)
      fetchGroupDetails(id)
    }
  }

  // Limpiar selección de grupo
  const clearGroupSelection = () => {
    setSelectedGroupId(null)
    setSelectedGroup(null)
    setGroupTeachers([])
    setGroupTutor(null)
    setGroupMembers([])
    setGroupSubjects([])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Grupos ({groups.length})
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Consulta de grupos de la institución
          </p>
        </div>
      </div>

      {/* Tabla de grupos */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Cargando grupos...</p>
        </div>
      ) : (
        <SimpleTable
          columns={tableColumns}
          data={groups}
          selectedId={selectedGroupId}
          onSelect={handleSelectGroup}
          loading={false}
          maxHeight="500px"
          collapsible={true}
          title="Lista de Grupos"
          itemKey="id"
        />
      )}

      {/* Detalles del grupo seleccionado */}
      {selectedGroupId && selectedGroup && (
        <DetailView
          selectedItem={selectedGroup}
          title={`Detalles: ${selectedGroup.nomenclature}`}
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
                        {item.section && (
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sección:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.section}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Turno:</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {item.shift === 'M' ? 'Matutino' : item.shift === 'V' ? 'Vespertino' : item.shift || '-'}
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
      )}
    </div>
  )
}
