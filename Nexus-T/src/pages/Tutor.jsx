import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const INITIAL_INCIDENT_FORM = {
  studentId: '',
  incidentTypeId: '',
  situation: '',
  action: '',
  followUp: '',
}

const formatName = (profile) =>
  [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Sin nombre'

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Sin fecha'

export default function Tutor() {
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [incidentTypes, setIncidentTypes] = useState([])
  const [groupIncidents, setGroupIncidents] = useState([])
  const [teacherSubjects, setTeacherSubjects] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
  const [subjectIncidents, setSubjectIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [sectionLoading, setSectionLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [incidentForm, setIncidentForm] = useState(INITIAL_INCIDENT_FORM)
  const [incidentSubmitting, setIncidentSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('register') // 'register' | 'view' | 'reports'

  const selectedSubject = useMemo(
    () => teacherSubjects.find((subject) => subject.id === selectedSubjectId) ?? null,
    [teacherSubjects, selectedSubjectId]
  )

  const studentsOptions = useMemo(
    () =>
      groupMembers.map((member) => ({
        id: member.student?.id,
        label: formatName(member.student),
      })),
    [groupMembers]
  )

  // Estadísticas para reportes
  const reportStats = useMemo(() => {
    if (!groupIncidents.length) return null

    const byType = {}
    const byStudent = {}
    const byMonth = {}

    groupIncidents.forEach((incident) => {
      // Por tipo
      const typeName = incident.incident_types?.name || 'Sin tipo'
      byType[typeName] = (byType[typeName] || 0) + 1

      // Por estudiante
      const studentName = formatName(incident.student)
      byStudent[studentName] = (byStudent[studentName] || 0) + 1

      // Por mes
      const date = new Date(incident.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1
    })

    return {
      total: groupIncidents.length,
      byType: Object.entries(byType)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      byStudent: Object.entries(byStudent)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      byMonth: Object.entries(byMonth)
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => a.key.localeCompare(b.key)),
    }
  }, [groupIncidents])

  useEffect(() => {
    const fetchIncidentTypes = async () => {
      const { data, error } = await supabase
        .from('incident_types')
        .select('id, name, code, category')
        .order('name')

      if (!error) {
        setIncidentTypes(data ?? [])
      } else {
        console.error('No se pudieron cargar los tipos de incidente', error)
      }
    }

    fetchIncidentTypes()
  }, [])

  useEffect(() => {
    if (!user) {
      return
    }

    const fetchTutorGroup = async () => {
      setLoading(true)
      setErrorMessage(null)

      const { data, error } = await supabase
        .from('groups')
        .select('id, grade, specialty, section, nomenclature')
        .eq('tutor_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('❌ Error al cargar grupo del tutor:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        
        let errorMsg = 'No pudimos obtener tu grupo asignado.'
        if (error.code === 'PGRST116') {
          errorMsg = 'Error de permisos. Verifica las políticas RLS en Supabase.'
        } else if (error.message) {
          errorMsg = `Error: ${error.message}`
        }
        
        setErrorMessage(errorMsg)
        setGroup(null)
      } else {
        setGroup(data)
      }

      setLoading(false)
    }

    fetchTutorGroup()
  }, [user])

  useEffect(() => {
    if (!group) {
      setGroupMembers([])
      setGroupIncidents([])
      setTeacherSubjects([])
      return
    }

    const fetchGroupData = async () => {
      setSectionLoading(true)
      setErrorMessage(null)

      try {
        await Promise.all([
          fetchGroupMembers(group.id),
          fetchGroupIncidents(group.id),
          fetchTeacherSubjects(group.id),
        ])
      } catch (error) {
        console.error('Error al cargar datos del grupo', error)
        setErrorMessage('Ocurrió un error al cargar la información del grupo.')
      } finally {
        setSectionLoading(false)
      }
    }

    fetchGroupData()
  }, [group?.id])

  useEffect(() => {
    if (!selectedSubject) {
      setSubjectIncidents([])
      return
    }

    fetchSubjectIncidents(selectedSubject.id)
  }, [selectedSubject?.id])

  const fetchGroupMembers = async (groupId) => {
    if (!groupId) {
      setGroupMembers([])
      return
    }

    const { data, error } = await supabase
      .from('group_members')
      .select(
        `
          id,
          created_at,
          student:user_profiles!group_members_student_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `
      )
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error al obtener alumnos del grupo', error)
      throw error
    }

    setGroupMembers(data ?? [])
  }

  const fetchGroupIncidents = async (groupId) => {
    if (!groupId) {
      setGroupIncidents([])
      return
    }

    try {
      // Obtener todos los teacher_subjects del grupo
      const { data: subjects, error: subjectsError } = await supabase
        .from('teacher_subjects')
        .select('id')
        .eq('group_id', groupId)

      if (subjectsError) {
        throw subjectsError
      }

      if (!subjects || subjects.length === 0) {
        setGroupIncidents([])
        return
      }

      const subjectIds = subjects.map((s) => s.id)

      // Obtener todos los incidentes de esos teacher_subjects
      const { data, error } = await supabase
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
          student:user_profiles!incidents_student_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          teacher_subject:teacher_subjects (
            id,
            subject_name,
            shift,
            teacher:user_profiles!teacher_subjects_teacher_id_fkey1 (
              first_name,
              last_name,
              email
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
        .in('teacher_subject_id', subjectIds)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setGroupIncidents(data ?? [])
      } catch (error) {
        console.error('❌ Error al obtener incidentes del grupo:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        throw error
      }
  }

  const fetchTeacherSubjects = async (groupId) => {
    if (!groupId) {
      setTeacherSubjects([])
      return
    }

    const { data, error } = await supabase
      .from('teacher_subjects')
      .select(
        `
          id,
          subject_name,
          shift,
          teacher:user_profiles!teacher_subjects_teacher_id_fkey1 (
            first_name,
            last_name,
            email
          )
        `
      )
      .eq('group_id', groupId)
      .order('subject_name', { ascending: true })

    if (error) {
      console.error('Error al obtener materias del grupo', error)
      throw error
    }

    const normalized = (data ?? []).map((entry) => ({
      ...entry,
      teacher: Array.isArray(entry.teacher) ? entry.teacher[0] : entry.teacher,
    }))

    setTeacherSubjects(normalized)
    if (!selectedSubjectId && normalized.length > 0) {
      setSelectedSubjectId(normalized[0].id)
    }
  }

  const fetchSubjectIncidents = async (subjectId) => {
    if (!subjectId) {
      setSubjectIncidents([])
      return
    }

    const { data, error } = await supabase
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
          student:user_profiles!incidents_student_id_fkey (
            id,
            first_name,
            last_name,
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
      .eq('teacher_subject_id', subjectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al obtener incidentes de la materia', error)
      setSubjectIncidents([])
    } else {
      setSubjectIncidents(data ?? [])
    }
  }

  const handleIncidentChange = (event) => {
    const { name, value } = event.target
    setIncidentForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleIncidentSubmit = async (event) => {
    event.preventDefault()

    if (!selectedSubject) {
      setErrorMessage('Debes seleccionar una materia para registrar el incidente.')
      return
    }

    setIncidentSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const payload = {
      incident_type_id: incidentForm.incidentTypeId,
      student_id: incidentForm.studentId,
      teacher_subject_id: selectedSubject.id,
      situation: incidentForm.situation,
      action: incidentForm.action,
      follow_up: incidentForm.followUp,
    }

    const { error } = await supabase.from('incidents').insert(payload)

    if (error) {
      console.error('No se pudo registrar el incidente', error)
      setErrorMessage('No se pudo registrar el incidente. Intenta nuevamente.')
    } else {
      setSuccessMessage('Incidente registrado correctamente.')
      setIncidentForm(INITIAL_INCIDENT_FORM)
      await Promise.all([
        fetchGroupIncidents(group.id),
        fetchSubjectIncidents(selectedSubject.id),
      ])
    }

    setIncidentSubmitting(false)
  }

  const handleAddObservation = async (incidentId, comment) => {
    if (!user || !comment.trim()) return

    // Primero necesitamos obtener el user_profile_id del usuario actual
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      setErrorMessage('No se pudo obtener tu perfil. Intenta nuevamente.')
      return
    }

    const { error } = await supabase.from('incident_observations').insert({
      incident_id: incidentId,
      user_id: profile.id,
      comment: comment.trim(),
    })

    if (error) {
      console.error('Error al agregar observación', error)
      setErrorMessage('No se pudo agregar la observación.')
    } else {
      setSuccessMessage('Observación agregada correctamente.')
      await Promise.all([
        fetchGroupIncidents(group.id),
        selectedSubject && fetchSubjectIncidents(selectedSubject.id),
      ])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 py-10">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">
            Sesión tutor
          </p>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Gestión de grupo y seguimiento
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {user?.email ? `Sesión iniciada como ${user.email}` : 'Usuario no identificado'}
          </p>
        </header>

        {(errorMessage || successMessage) && (
          <div
            className={`p-4 rounded-lg border ${
              errorMessage
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
            }`}
          >
            {errorMessage ?? successMessage}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Cargando información del grupo...</p>
        ) : !group ? (
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
            <p className="text-gray-500 dark:text-gray-400">
              No tienes un grupo asignado como tutor. Contacta a Orientación Educativa.
            </p>
          </div>
        ) : (
          <>
            <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 border border-blue-100 dark:border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Grupo: {group.nomenclature}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    {group.grade}° {group.specialty}
                    {group.section ? ` • Sección: ${group.section}` : ''}
                  </p>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p>{groupMembers.length} alumnos</p>
                  <p>{groupIncidents.length} incidentes registrados</p>
                </div>
              </div>
            </section>

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
              <div className="border-b border-gray-200 dark:border-slate-700">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('register')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'register'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Registrar Incidente
                  </button>
                  <button
                    onClick={() => setActiveTab('view')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'view'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Ver Incidentes del Grupo
                  </button>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'reports'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Reportes y Estadísticas
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'register' && (
                  <div className="grid gap-6 lg:grid-cols-[1.2fr,1.8fr]">
                    <div className="space-y-6">
                      <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                          Alumnos del grupo ({groupMembers.length})
                        </h3>
                        {groupMembers.length === 0 ? (
                          <p className="text-gray-500 dark:text-gray-400">Sin alumnos registrados.</p>
                        ) : (
                          <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {groupMembers.map((member) => (
                              <li
                                key={member.id}
                                className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col"
                              >
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {formatName(member.student)}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {member.student?.email}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                          Registrar incidente
                        </h3>
                        {teacherSubjects.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No hay materias asignadas a este grupo. No puedes registrar incidentes hasta que
                            se asignen materias.
                          </p>
                        ) : (
                          <form className="space-y-4" onSubmit={handleIncidentSubmit}>
                            <select
                              name="studentId"
                              value={incidentForm.studentId}
                              onChange={handleIncidentChange}
                              required
                              className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                            >
                              <option value="">Selecciona un alumno</option>
                              {studentsOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>

                            <select
                              name="incidentTypeId"
                              value={incidentForm.incidentTypeId}
                              onChange={handleIncidentChange}
                              required
                              className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                            >
                              <option value="">Tipo de incidente</option>
                              {incidentTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                  {type.name}
                                </option>
                              ))}
                            </select>

                            <select
                              name="subjectId"
                              value={selectedSubjectId || ''}
                              onChange={(e) => setSelectedSubjectId(e.target.value)}
                              required
                              className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                            >
                              <option value="">Selecciona una materia</option>
                              {teacherSubjects.map((subject) => (
                                <option key={subject.id} value={subject.id}>
                                  {subject.subject_name} - {formatName(subject.teacher)}
                                </option>
                              ))}
                            </select>

                            <textarea
                              name="situation"
                              value={incidentForm.situation}
                              onChange={handleIncidentChange}
                              placeholder="Describe la situación observada"
                              required
                              className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                              rows="3"
                            />

                            <textarea
                              name="action"
                              value={incidentForm.action}
                              onChange={handleIncidentChange}
                              placeholder="Acción tomada"
                              required
                              className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                              rows="2"
                            />

                            <textarea
                              name="followUp"
                              value={incidentForm.followUp}
                              onChange={handleIncidentChange}
                              placeholder="Seguimiento sugerido"
                              className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                              rows="2"
                            />

                            <button
                              type="submit"
                              disabled={incidentSubmitting}
                              className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50"
                            >
                              {incidentSubmitting ? 'Guardando...' : 'Guardar incidente'}
                            </button>
                          </form>
                        )}
                      </div>
                    </div>

                    <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Incidentes recientes de la materia seleccionada ({subjectIncidents.length})
                      </h3>
                      {selectedSubject ? (
                        subjectIncidents.length === 0 ? (
                          <p className="text-gray-500 dark:text-gray-400">Sin registros.</p>
                        ) : (
                          <ul className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                            {subjectIncidents.map((incident) => (
                              <li
                                key={incident.id}
                                className="rounded-xl border border-gray-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900"
                              >
                                <div className="flex justify-between items-start gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                      {incident.incident_types?.name}
                                    </p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {formatName(incident.student)}
                                    </p>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(incident.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                  {incident.situation}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-200 mt-2">
                                  <span className="font-semibold">Acción:</span> {incident.action}
                                </p>
                                {incident.follow_up && (
                                  <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                                    <span className="font-semibold">Seguimiento:</span> {incident.follow_up}
                                  </p>
                                )}
                                {incident.observations?.length > 0 && (
                                  <div className="mt-3 border-t border-gray-100 dark:border-slate-800 pt-2 space-y-2">
                                    {incident.observations.map((observation) => (
                                      <div key={observation.id} className="text-sm text-gray-600 dark:text-gray-300">
                                        <p className="font-medium">
                                          {formatName(observation.user)}{' '}
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatDate(observation.created_at)}
                                          </span>
                                        </p>
                                        <p>{observation.comment}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">
                          Selecciona una materia para ver sus incidentes.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'view' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Todos los incidentes del grupo ({groupIncidents.length})
                    </h3>
                    {sectionLoading ? (
                      <p className="text-gray-500 dark:text-gray-400">Cargando incidentes...</p>
                    ) : groupIncidents.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400">
                        No hay incidentes registrados para este grupo.
                      </p>
                    ) : (
                      <ul className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                        {groupIncidents.map((incident) => (
                          <li
                            key={incident.id}
                            className="rounded-xl border border-gray-100 dark:border-slate-800 p-5 bg-gray-50/70 dark:bg-slate-900"
                          >
                            <div className="flex justify-between items-start gap-3 mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                    {incident.incident_types?.name}
                                  </p>
                                  {incident.incident_types?.category && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                      {incident.incident_types.category}
                                    </span>
                                  )}
                                </div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {formatName(incident.student)}
                                </p>
                                {incident.teacher_subject && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Materia: {incident.teacher_subject.subject_name} • Docente:{' '}
                                    {formatName(incident.teacher_subject.teacher)}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {formatDate(incident.created_at)}
                              </span>
                            </div>

                            <div className="space-y-2 mt-3">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                  Situación:
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-200">{incident.situation}</p>
                              </div>

                              {incident.action && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                    Acción tomada:
                                  </p>
                                  <p className="text-sm text-gray-700 dark:text-gray-200">{incident.action}</p>
                                </div>
                              )}

                              {incident.follow_up && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                    Seguimiento:
                                  </p>
                                  <p className="text-sm text-gray-700 dark:text-gray-200">{incident.follow_up}</p>
                                </div>
                              )}
                            </div>

                            {incident.observations && incident.observations.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                                  Observaciones ({incident.observations.length}):
                                </p>
                                <div className="space-y-2">
                                  {incident.observations.map((observation) => (
                                    <div
                                      key={observation.id}
                                      className="text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700"
                                    >
                                      <p className="font-medium mb-1">
                                        {formatName(observation.user)}{' '}
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                                          {formatDate(observation.created_at)}
                                        </span>
                                      </p>
                                      <p>{observation.comment}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {activeTab === 'reports' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Reportes y Estadísticas del Grupo
                    </h3>
                    {reportStats ? (
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Resumen General
                          </h4>
                          <div className="space-y-2">
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                              {reportStats.total}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Total de incidentes registrados
                            </p>
                          </div>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Incidentes por Tipo
                          </h4>
                          <ul className="space-y-2">
                            {reportStats.byType.map((item) => (
                              <li key={item.name} className="flex justify-between items-center">
                                <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {item.count}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Alumnos con más Incidentes
                          </h4>
                          <ul className="space-y-2">
                            {reportStats.byStudent.slice(0, 5).map((item) => (
                              <li key={item.name} className="flex justify-between items-center">
                                <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {item.count}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Incidentes por Mes
                          </h4>
                          <ul className="space-y-2">
                            {reportStats.byMonth.map((item) => (
                              <li key={item.key} className="flex justify-between items-center">
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {new Date(item.key + '-01').toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'long',
                                  })}
                                </span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {item.count}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">
                        No hay datos suficientes para generar reportes.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

