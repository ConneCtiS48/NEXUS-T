import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import SelectableTable from '../../components/admin/SelectableTable'
import DetailPanel from '../../components/admin/DetailPanel'

export default function AdminGroups() {
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [groupSubjects, setGroupSubjects] = useState([])
  const [groupTeachers, setGroupTeachers] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    fetchGroups()
  }, [])

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupDetails(selectedGroupId)
    } else {
      setSelectedGroup(null)
      setGroupMembers([])
      setGroupSubjects([])
      setGroupTeachers([])
    }
  }, [selectedGroupId])

  const fetchGroups = async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, grade, specialty, section, nomenclature, tutor_id')
        .order('nomenclature')

      if (error) throw error
      setGroups(data || [])
    } catch (error) {
      console.error('Error al cargar grupos:', error)
      setErrorMessage('No se pudieron cargar los grupos.')
    } finally {
      setLoading(false)
    }
  }

  const fetchGroupDetails = async (groupId) => {
    try {
      // Obtener información del grupo
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('id, grade, specialty, section, nomenclature, tutor_id, tutor:user_profiles!groups_tutor_id_fkey(id, first_name, last_name, email)')
        .eq('id', groupId)
        .single()

      if (groupError) throw groupError
      setSelectedGroup(groupData)

      // Obtener miembros del grupo (students)
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select(`
          id,
          is_group_leader,
          student:students!group_members_student_id_fkey(
            id,
            control_number,
            first_name,
            paternal_last_name,
            maternal_last_name,
            email
          )
        `)
        .eq('group_id', groupId)
        .order('is_group_leader', { ascending: false })

      if (membersError) throw membersError
      setGroupMembers(membersData || [])

      // Obtener asignaturas del grupo (teacher_group_subjects)
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('teacher_group_subjects')
        .select(`
          id,
          shift,
          subject:subjects!teacher_group_subjects_subject_id_fkey(
            id,
            subject_name,
            category_type,
            category_name
          ),
          teacher:user_profiles!teacher_group_subjects_teacher_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('group_id', groupId)

      if (subjectsError) throw subjectsError
      setGroupSubjects(subjectsData || [])

      // Extraer docentes únicos
      const teachersMap = new Map()
      subjectsData?.forEach((item) => {
        if (item.teacher) {
          const teacherId = item.teacher.id
          if (!teachersMap.has(teacherId)) {
            teachersMap.set(teacherId, {
              ...item.teacher,
              subjects: [],
            })
          }
          if (item.subject) {
            teachersMap.get(teacherId).subjects.push({
              name: item.subject.subject_name,
              shift: item.shift,
            })
          }
        }
      })
      setGroupTeachers(Array.from(teachersMap.values()))
    } catch (error) {
      console.error('Error al cargar detalles del grupo:', error)
      setErrorMessage('No se pudieron cargar los detalles del grupo.')
    }
  }

  const handleSelect = (groupId) => {
    setSelectedGroupId(groupId)
    setActiveTab('overview')
  }

  const handleEdit = (id) => {
    // TODO: Implementar edición de grupo
    console.log('Editar grupo:', id)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este grupo?')) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccessMessage('Grupo eliminado correctamente.')
      if (selectedGroupId === id) {
        setSelectedGroupId(null)
      }
      await fetchGroups()
    } catch (error) {
      console.error('Error al eliminar grupo:', error)
      setErrorMessage(error.message || 'No se pudo eliminar el grupo.')
    } finally {
      setSubmitting(false)
    }
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

  const tabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'members', label: 'Miembros', badge: groupMembers.length },
    { id: 'subjects', label: 'Asignaturas', badge: groupSubjects.length },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Gestión de Grupos
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2">
          Administra grupos, sus miembros y asignaturas.
        </p>
      </header>

      {(errorMessage || successMessage) && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            errorMessage
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
          }`}
        >
          {errorMessage ?? successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo: Lista de grupos */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Grupos ({groups.length})
            </h2>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Cargando grupos...</p>
              </div>
            ) : (
              <SelectableTable
                columns={tableColumns}
                data={groups}
                selectedId={selectedGroupId}
                onSelect={handleSelect}
                onEdit={handleEdit}
                onDelete={handleDelete}
                loading={submitting}
              />
            )}
          </div>
        </div>

        {/* Panel derecho: Detalles del grupo seleccionado */}
        <div>
          <DetailPanel
            title={selectedGroup ? selectedGroup.nomenclature : null}
            breadcrumb={
              selectedGroup
                ? [
                    { label: 'Grupos', onClick: () => setSelectedGroupId(null) },
                    { label: selectedGroup.nomenclature },
                  ]
                : null
            }
            tabs={selectedGroup ? tabs : null}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            emptyMessage="Selecciona un grupo para ver sus detalles"
          >
            {selectedGroup && (
              <>
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Información del Grupo
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Nomenclatura:
                          </span>{' '}
                          <span className="text-sm text-gray-900 dark:text-white">
                            {selectedGroup.nomenclature}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Grado:
                          </span>{' '}
                          <span className="text-sm text-gray-900 dark:text-white">
                            {selectedGroup.grade}°
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Especialidad:
                          </span>{' '}
                          <span className="text-sm text-gray-900 dark:text-white">
                            {selectedGroup.specialty}
                          </span>
                        </div>
                        {selectedGroup.section && (
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Sección:
                            </span>{' '}
                            <span className="text-sm text-gray-900 dark:text-white">
                              {selectedGroup.section}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedGroup.tutor && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Tutor
                        </h3>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {selectedGroup.tutor.first_name} {selectedGroup.tutor.last_name}
                          {selectedGroup.tutor.email && (
                            <span className="text-gray-500 dark:text-gray-400 ml-2">
                              ({selectedGroup.tutor.email})
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {groupTeachers.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                          Docentes Asignados ({groupTeachers.length})
                        </h3>
                        <div className="space-y-2">
                          {groupTeachers.map((teacher) => (
                            <div
                              key={teacher.id}
                              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            >
                              <div className="font-medium text-sm text-gray-900 dark:text-white">
                                {teacher.first_name} {teacher.last_name}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {teacher.subjects.map((s) => s.name).join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'members' && (
                  <div className="space-y-2">
                    {groupMembers.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No hay miembros en este grupo.
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
                                  {member.student
                                    ? `${member.student.first_name} ${member.student.paternal_last_name} ${member.student.maternal_last_name || ''}`.trim()
                                    : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  {member.is_group_leader ? (
                                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                                      Jefe de Grupo
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 dark:text-gray-400">Miembro</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'subjects' && (
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
                                Docente
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Turno
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {groupSubjects.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {item.subject?.subject_name || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {item.teacher
                                    ? `${item.teacher.first_name} ${item.teacher.last_name}`
                                    : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {item.shift === 'M' ? 'Matutino' : item.shift === 'V' ? 'Vespertino' : item.shift}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </DetailPanel>
        </div>
      </div>
    </div>
  )
}





