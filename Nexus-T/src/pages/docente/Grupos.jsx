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

export default function Grupos() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [tutorGroup, setTutorGroup] = useState(null)
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [groupJustifications, setGroupJustifications] = useState([])
  const [tutorGroupMembers, setTutorGroupMembers] = useState([])
  const [tutorGroupJustifications, setTutorGroupJustifications] = useState([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchGroups = async () => {
      setLoading(true)
      setErrorMessage(null)
      try {
        // 1. Referencia directa: grupos del docente desde teacher_groups
        const { data: teacherGroupsData, error: tgError } = await supabase
          .from('teacher_groups')
          .select('group_id, is_tutor, group:groups (id, grade, specialty, section, nomenclature)')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: true })
        if (tgError) throw tgError

        const groupsMap = new Map()
        let tutorGroupRes = null
        ;(teacherGroupsData || []).forEach((row) => {
          const groupId = row.group_id
          const group = Array.isArray(row.group) ? row.group[0] : row.group
          if (!group) return
          if (!groupsMap.has(groupId)) {
            groupsMap.set(groupId, { id: groupId, group, subjects: [] })
          }
          if (row.is_tutor === true) {
            tutorGroupRes = group
          }
        })
        setTutorGroup(tutorGroupRes)

        const groupIds = [...groupsMap.keys()]
        if (groupIds.length > 0) {
          // 2. Asignaturas por grupo desde teacher_group_subjects
          const { data: assignments, error: assignError } = await supabase
            .from('teacher_group_subjects')
            .select('id, shift, group_id, subject:subjects!teacher_group_subjects_subject_id_fkey (id, subject_name)')
            .eq('teacher_id', user.id)
            .in('group_id', groupIds)
            .order('created_at', { ascending: true })
          if (!assignError && assignments) {
            assignments.forEach((a) => {
              const entry = groupsMap.get(a.group_id)
              if (entry) {
                const subject = Array.isArray(a.subject) ? a.subject[0] : a.subject
                if (subject) {
                  entry.subjects.push({
                    id: a.id,
                    subject_name: subject.subject_name || 'Sin nombre',
                    shift: a.shift,
                  })
                }
              }
            })
          }
        }
        setGroups(Array.from(groupsMap.values()))
      } catch (error) {
        console.error('Error al cargar grupos del docente:', error)
        setErrorMessage('No se pudieron cargar tus grupos asignados.')
        setGroups([])
        setTutorGroup(null)
      } finally {
        setLoading(false)
      }
    }
    fetchGroups()
  }, [user])

  useEffect(() => {
    if (!selectedGroupId || !user) return
    setLoadingDetails(true)
    Promise.all([
      (async () => {
        const { data, error } = await supabase
          .from('group_members')
          .select('id, is_group_leader, student:students!group_members_student_id_fkey (id, control_number, first_name, paternal_last_name, maternal_last_name, email)')
          .eq('group_id', selectedGroupId)
          .order('created_at', { ascending: true })
        if (error) setGroupMembers([])
        else setGroupMembers(data || [])
      })(),
      (async () => {
        const { data, error } = await supabase
          .from('justifications')
          .select('id, reason, created_at, student:students!justifications_student_id_fkey (id, control_number, first_name, paternal_last_name, maternal_last_name), group:groups!justifications_group_id_fkey (id, nomenclature)')
          .eq('group_id', selectedGroupId)
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false })
        if (error) setGroupJustifications([])
        else setGroupJustifications(data || [])
      })(),
    ]).finally(() => setLoadingDetails(false))
  }, [selectedGroupId, user])

  useEffect(() => {
    if (!tutorGroup?.id || !user) return
    const load = async () => {
      const [membersRes, justRes] = await Promise.all([
        supabase.from('group_members').select('id, is_group_leader, student:students!group_members_student_id_fkey (id, control_number, first_name, paternal_last_name, maternal_last_name, email)').eq('group_id', tutorGroup.id).order('created_at', { ascending: true }),
        supabase.from('justifications').select('id, reason, created_at, student:students!justifications_student_id_fkey (id, control_number, first_name, paternal_last_name, maternal_last_name), group:groups!justifications_group_id_fkey (id, nomenclature), teacher:user_profiles!justifications_teacher_id_fkey (user_id, first_name, last_name)').eq('group_id', tutorGroup.id).order('created_at', { ascending: false }),
      ])
      setTutorGroupMembers(membersRes.data || [])
      setTutorGroupJustifications(justRes.data || [])
    }
    load()
  }, [tutorGroup?.id, user])

  const handleSelect = (id) => {
    setSelectedGroupId(id)
    setActiveTab('overview')
  }

  const handleSelectGroup = (subjectId, groupId) => {
    navigate(`/docente/grupos?subjectId=${subjectId}&groupId=${groupId}`)
  }

  const tableColumns = [
    { key: 'nomenclature', label: 'Grupo', render: (_, row) => row.group?.nomenclature || '-' },
    { key: 'grade', label: 'Grado', render: (_, row) => row.group?.grade ? `${row.group.grade}°` : '-' },
    { key: 'specialty', label: 'Especialidad', render: (_, row) => row.group?.specialty || '-' },
    { key: 'subjects', label: 'Asignaturas', render: (_, row) => (row.subjects?.length ? row.subjects.map((s) => s.subject_name).join(', ') : '-') },
  ]

  const selectedGroup = groups.find((g) => g.id === selectedGroupId)
  const groupTabs = [
    { id: 'overview', label: 'Información' },
    { id: 'students', label: 'Alumnos', badge: groupMembers.length || undefined },
    { id: 'justifications', label: 'Justificantes', badge: groupJustifications.length || undefined },
  ]
  const tutorTabs = [
    { id: 'overview', label: 'Información' },
    { id: 'students', label: 'Alumnos', badge: tutorGroupMembers.length || undefined },
    { id: 'justifications', label: 'Justificantes', badge: tutorGroupJustifications.length || undefined },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader title="Mis Grupos Asignados" description="Visualiza y gestiona tus grupos asignados como docente." />
      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {errorMessage}
        </div>
      )}
      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Grupos Asignados ({groups.length})</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Cargando grupos...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No tienes grupos asignados.</div>
          ) : (
            <SimpleTable columns={tableColumns} data={groups} selectedId={selectedGroupId} onSelect={handleSelect} loading={loadingDetails} maxHeight="500px" collapsible title="Lista de Grupos" itemKey="id" />
          )}
        </div>
        {selectedGroupId && selectedGroup && (
          <DetailView
            selectedItem={selectedGroup}
            title={`Detalles: ${selectedGroup.group?.nomenclature || 'Grupo'}`}
            tabs={groupTabs}
            defaultTab={activeTab}
            collapsible
            onCollapseChange={() => {}}
            renderContent={(item, tab) => {
              if (tab === 'overview') {
                return (
                  <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Información del Grupo</h3>
                      <div className="space-y-2">
                        <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nomenclatura:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.group?.nomenclature || '-'}</p></div>
                        <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Grado:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.group?.grade ? `${item.group.grade}°` : '-'}</p></div>
                        <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Especialidad:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.group?.specialty || '-'}</p></div>
                        {item.group?.section && <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sección:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.group.section}</p></div>}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Asignaturas Impartidas</h3>
                      {item.subjects?.length ? item.subjects.map((subject, idx) => (
                        <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-700 mb-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{subject.subject_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Turno: {SHIFT_MAP[subject.shift] || subject.shift}</p>
                        </div>
                      )) : <p className="text-sm text-gray-500 dark:text-gray-400">No hay asignaturas asignadas.</p>}
                    </div>
                  </div>
                )
              }
              if (tab === 'students') {
                return groupMembers.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No hay alumnos en este grupo.</p> : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">No. Control</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nombre</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rol</th></tr></thead>
                      <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {groupMembers.map((member) => (
                          <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{member.student?.control_number || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{formatName(member.student)}</td>
                            <td className="px-4 py-2 text-sm">{member.is_group_leader ? <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">Jefe de Grupo</span> : <span className="text-gray-500 dark:text-gray-400">Alumno</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
              if (tab === 'justifications') {
                return groupJustifications.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No hay justificantes registrados para este grupo.</p> : (
                  <div className="space-y-3">
                    {groupJustifications.map((j) => (
                      <div key={j.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                          <div><p className="text-sm font-medium text-gray-900 dark:text-white">{formatName(j.student)}</p>{j.student?.control_number && <p className="text-xs text-gray-500 dark:text-gray-400">No. Control: {j.student.control_number}</p>}</div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(j.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{j.reason}</p>
                      </div>
                    ))}
                  </div>
                )
              }
              return null
            }}
          />
        )}
        {tutorGroup && (
          <DetailView
            selectedItem={tutorGroup}
            title={`Grupo Tutorado: ${tutorGroup.nomenclature || 'Grupo'}`}
            tabs={tutorTabs}
            defaultTab="overview"
            collapsible
            onCollapseChange={() => {}}
            renderContent={(item, tab) => {
              if (tab === 'overview') {
                return (
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2"><span className="text-lg">👨‍🏫</span><h3 className="text-sm font-medium text-green-800 dark:text-green-300">Eres el tutor de este grupo</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nomenclatura:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.nomenclature || '-'}</p></div>
                      <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Grado:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.grade ? `${item.grade}°` : '-'}</p></div>
                      <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Especialidad:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.specialty || '-'}</p></div>
                      {item.section && <div><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sección:</span><p className="text-sm text-gray-900 dark:text-white mt-1">{item.section}</p></div>}
                    </div>
                  </div>
                )
              }
              if (tab === 'students') {
                return tutorGroupMembers.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No hay alumnos en este grupo.</p> : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">No. Control</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nombre</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rol</th></tr></thead>
                      <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {tutorGroupMembers.map((member) => (
                          <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{member.student?.control_number || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{formatName(member.student)}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{member.student?.email || '-'}</td>
                            <td className="px-4 py-2 text-sm">{member.is_group_leader ? <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">Jefe de Grupo</span> : <span className="text-gray-500 dark:text-gray-400">Alumno</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
              if (tab === 'justifications') {
                return tutorGroupJustifications.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No hay justificantes registrados para este grupo.</p> : (
                  <div className="space-y-3">
                    {tutorGroupJustifications.map((j) => (
                      <div key={j.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                          <div><p className="text-sm font-medium text-gray-900 dark:text-white">{formatName(j.student)}</p>{j.student?.control_number && <p className="text-xs text-gray-500 dark:text-gray-400">No. Control: {j.student.control_number}</p>}{j.teacher && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Docente: {formatName(j.teacher)}</p>}</div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(j.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{j.reason}</p>
                      </div>
                    ))}
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
