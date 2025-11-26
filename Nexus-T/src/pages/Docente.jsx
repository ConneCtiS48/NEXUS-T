import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import RoleNavigation from '../components/RoleNavigation'

const INITIAL_INCIDENT_FORM = {
  studentId: '',
  incidentTypeId: '',
  situation: '',
  action: '',
  followUp: '',
}

const SHIFT_MAP = {
  M: 'Matutino',
  V: 'Vespertino',
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

export default function Docente() {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [allStudents, setAllStudents] = useState([])
  const [incidentTypes, setIncidentTypes] = useState([])
  const [incidents, setIncidents] = useState([])
  const [tutorProfile, setTutorProfile] = useState(null)
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [sectionLoading, setSectionLoading] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [incidentForm, setIncidentForm] = useState(INITIAL_INCIDENT_FORM)
  const [incidentSubmitting, setIncidentSubmitting] = useState(false)

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId) ?? null,
    [subjects, selectedSubjectId]
  )

  const studentsOptions = useMemo(
    () => {
      // Si hay grupo seleccionado, usar alumnos del grupo, sino usar todos los estudiantes
      const students = selectedSubject && groupMembers.length > 0 
        ? groupMembers.map((member) => ({
            id: member.student?.id,
            label: formatName(member.student),
          }))
        : allStudents.map((student) => ({
            id: student.id,
            label: formatName(student),
          }))
      return students.filter(s => s.id) // Filtrar valores nulos
    },
    [groupMembers, allStudents, selectedSubject]
  )

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

  // Cargar todos los estudiantes disponibles para el formulario de incidentes
  useEffect(() => {
    const fetchAllStudents = async () => {
      setStudentsLoading(true)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .order('first_name')

      if (!error && data) {
        setAllStudents(data ?? [])
      } else {
        console.error('Error al cargar estudiantes', error)
      }
      setStudentsLoading(false)
    }

    fetchAllStudents()
  }, [])

  // Cargar todos los incidentes del docente (no solo los de un grupo)
  useEffect(() => {
    if (!user) return

    const fetchAllIncidents = async () => {
      // Obtener todos los teacher_subjects del docente
      const { data: teacherSubjects, error: subjectsError } = await supabase
        .from('teacher_subjects')
        .select('id')
        .eq('teacher_id', user.id)

      if (subjectsError) {
        console.error('Error al obtener materias del docente', subjectsError)
        return
      }

      if (!teacherSubjects || teacherSubjects.length === 0) {
        setIncidents([])
        return
      }

      const subjectIds = teacherSubjects.map((s) => s.id)

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
            shift
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

      if (!error) {
        setIncidents(data ?? [])
      } else {
        console.error('Error al obtener incidentes', error)
      }
    }

    fetchAllIncidents()
  }, [user])

  useEffect(() => {
    if (!user) {
      return
    }

    const fetchSubjects = async () => {
      setSubjectsLoading(true)
      setErrorMessage(null)

      const { data, error } = await supabase
        .from('teacher_subjects')
        .select(
          `
            id,
            subject_name,
            shift,
            group:groups (
              id,
              grade,
              specialty,
              section,
              nomenclature,
              tutor_id
            )
          `
        )
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ Error al cargar materias del docente:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        
        let errorMsg = 'No pudimos obtener tus materias asignadas.'
        if (error.code === 'PGRST116') {
          errorMsg = 'Error de permisos. Verifica las políticas RLS en Supabase.'
        } else if (error.message) {
          errorMsg = `Error: ${error.message}`
        }
        
        setErrorMessage(errorMsg)
        setSubjects([])
      } else {
        const normalized = (data ?? []).map((entry) => ({
          ...entry,
          group: Array.isArray(entry.group) ? entry.group[0] : entry.group,
        }))
        setSubjects(normalized)
        if (!selectedSubjectId && normalized.length > 0) {
          setSelectedSubjectId(normalized[0].id)
        }
      }

      setSubjectsLoading(false)
    }

    fetchSubjects()
  }, [user])

  useEffect(() => {
    if (!selectedSubject) {
      setGroupMembers([])
      setIncidents([])
      setTutorProfile(null)
      return
    }

    const fetchSectionData = async () => {
      setSectionLoading(true)
      setErrorMessage(null)
      try {
        await Promise.all([
          fetchGroupMembers(selectedSubject.group?.id),
          fetchIncidents(selectedSubject.id),
          fetchTutorProfile(selectedSubject.group?.tutor_id),
        ])
      } catch (error) {
        console.error('Error al preparar la sesión del docente', error)
        setErrorMessage('Ocurrió un error al cargar la información del grupo.')
      } finally {
        setSectionLoading(false)
      }
    }

    fetchSectionData()
  }, [
    selectedSubject?.id,
    selectedSubject?.group?.id,
    selectedSubject?.group?.tutor_id,
  ])

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
      console.error('❌ Error al obtener alumnos del grupo:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw error
    }

    setGroupMembers(data ?? [])
  }

  const fetchIncidents = async (subjectId) => {
    if (!subjectId) {
      setIncidents([])
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
      console.error('❌ Error al obtener incidentes:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw error
    }

    setIncidents(data ?? [])
  }

  const fetchTutorProfile = async (tutorUserId) => {
    if (!tutorUserId) {
      setTutorProfile(null)
      return
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, email')
      .eq('user_id', tutorUserId)
      .maybeSingle()

    if (error) {
      console.error('No se pudo obtener la información del tutor', error)
      throw error
    }

    setTutorProfile(data)
  }

  const handleIncidentChange = (event) => {
    const { name, value } = event.target
    setIncidentForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleIncidentSubmit = async (event) => {
    event.preventDefault()

    if (!incidentForm.studentId || !incidentForm.incidentTypeId) {
      setErrorMessage('Por favor completa todos los campos requeridos.')
      return
    }

    setIncidentSubmitting(true)
    setErrorMessage(null)

    const payload = {
      incident_type_id: incidentForm.incidentTypeId,
      student_id: incidentForm.studentId,
      teacher_subject_id: selectedSubject?.id || null, // Opcional si no hay grupo
      situation: incidentForm.situation,
      action: incidentForm.action,
      follow_up: incidentForm.followUp,
    }

    const { error } = await supabase.from('incidents').insert(payload)

    if (error) {
      console.error('No se pudo registrar el incidente', error)
      setErrorMessage('No se pudo registrar el incidente. Intenta nuevamente.')
    } else {
      setIncidentForm(INITIAL_INCIDENT_FORM)
      // Recargar incidentes
      if (selectedSubject) {
        await fetchIncidents(selectedSubject.id)
      } else {
        // Recargar todos los incidentes del docente
        const { data: teacherSubjects } = await supabase
          .from('teacher_subjects')
          .select('id')
          .eq('teacher_id', user.id)
        
        if (teacherSubjects && teacherSubjects.length > 0) {
          const subjectIds = teacherSubjects.map((s) => s.id)
          const { data } = await supabase
            .from('incidents')
            .select(`
              id,
              situation,
              action,
              follow_up,
              created_at,
              incident_types (id, name, code, category),
              student:user_profiles!incidents_student_id_fkey (id, first_name, last_name, email),
              teacher_subject:teacher_subjects (id, subject_name, shift),
              observations:incident_observations (id, comment, created_at, user:user_profiles!incident_observations_user_id_fkey (first_name, last_name, email))
            `)
            .in('teacher_subject_id', subjectIds)
            .order('created_at', { ascending: false })
          setIncidents(data ?? [])
        }
      }
    }

    setIncidentSubmitting(false)
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <RoleNavigation currentRole="docente" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <header className="flex flex-col gap-2">
          <p className="text-xs sm:text-sm uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">
            Sesión docente
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Gestión de grupos y reportes
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            {user?.email ? `Sesión iniciada como ${user.email}` : 'Usuario no identificado'}
          </p>
        </header>

        {errorMessage && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 sm:p-6 border border-blue-100 dark:border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                Materias y grupos asignados
              </h2>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                Selecciona un curso para ver a tus alumnos y gestionar los incidentes registrados.
              </p>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {subjects.length} materias activas
            </span>
          </div>

          {subjectsLoading ? (
            <p className="text-gray-500 dark:text-gray-400">Cargando materias...</p>
          ) : subjects.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              No encontramos materias asignadas a tu perfil.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => setSelectedSubjectId(subject.id)}
                  className={`text-left rounded-xl border p-4 transition focus:outline-none focus:ring-4 ${
                    subject.id === selectedSubjectId
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-lg'
                      : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300'
                  }`}
                >
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {subject.group?.nomenclature ?? 'Sin grupo'}
                  </p>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {subject.subject_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Turno {SHIFT_MAP[subject.shift] ?? subject.shift}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {subject.group?.grade}° {subject.group?.specialty}{' '}
                    {subject.group?.section ? `• ${subject.group.section}` : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Sección de información del grupo (solo si hay grupo seleccionado) */}
        {selectedSubject && (
          <section className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Información del grupo
                </h3>
                {selectedSubject.group ? (
                  <dl className="grid sm:grid-cols-2 gap-4 text-gray-700 dark:text-gray-200">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Grupo</dt>
                      <dd className="text-lg font-medium">
                        {selectedSubject.group.nomenclature} ({selectedSubject.group.grade}°{' '}
                        {selectedSubject.group.specialty})
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Sección</dt>
                      <dd className="text-lg font-medium">
                        {selectedSubject.group.section ?? 'Sin sección'}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    Esta materia aún no tiene un grupo asignado.
                  </p>
                )}
              </div>

              <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Tutor del grupo
                </h3>
                {tutorProfile ? (
                  <div className="space-y-1 text-gray-700 dark:text-gray-200">
                    <p className="text-lg font-medium">{formatName(tutorProfile)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{tutorProfile.email}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    No hay tutor asignado o no se encontró su perfil.
                  </p>
                )}
              </div>
            </div>

            {sectionLoading ? (
              <p className="text-gray-500 dark:text-gray-400">Preparando la información...</p>
            ) : (
              <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Alumnos del grupo ({groupMembers.length})
                </h3>
                {groupMembers.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">Sin alumnos registrados.</p>
                ) : (
                  <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {groupMembers.map((member) => (
                      <li
                        key={member.id}
                        className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900 flex flex-col"
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
            )}
          </section>
        )}

        {/* Sección de registro de incidentes - SIEMPRE VISIBLE */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr,1.8fr]">
          <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Registrar incidente
            </h3>
            {studentsLoading ? (
              <p className="text-gray-500 dark:text-gray-400">Cargando estudiantes...</p>
            ) : (
              <form className="space-y-4" onSubmit={handleIncidentSubmit}>
                <select
                  name="studentId"
                  value={incidentForm.studentId}
                  onChange={handleIncidentChange}
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
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
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                >
                  <option value="">Tipo de incidente</option>
                  {incidentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>

                <textarea
                  name="situation"
                  value={incidentForm.situation}
                  onChange={handleIncidentChange}
                  placeholder="Describe la situación observada"
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                  rows="3"
                />

                <textarea
                  name="action"
                  value={incidentForm.action}
                  onChange={handleIncidentChange}
                  placeholder="Acción tomada"
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                  rows="2"
                />

                <textarea
                  name="followUp"
                  value={incidentForm.followUp}
                  onChange={handleIncidentChange}
                  placeholder="Seguimiento sugerido"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
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

          <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Incidentes registrados ({incidents.length})
            </h3>
            {incidents.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Sin registros.</p>
            ) : (
              <ul className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                {incidents.map((incident) => (
                  <li
                    key={incident.id}
                    className="rounded-xl border border-gray-100 dark:border-slate-800 p-4 bg-gray-50/70 dark:bg-slate-900"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {incident.incident_types?.name}
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatName(incident.student)}
                        </p>
                        {incident.teacher_subject && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {incident.teacher_subject.subject_name}
                          </p>
                        )}
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
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

