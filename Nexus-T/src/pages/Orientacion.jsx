import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import RoleNavigation from '../components/RoleNavigation'

const SHIFT_OPTIONS = [
  { value: 'M', label: 'Matutino' },
  { value: 'V', label: 'Vespertino' },
]

const INITIAL_GROUP_FORM = {
  grade: '',
  specialty: '',
  section: '',
  nomenclature: '',
}

const INITIAL_STUDENT_FORM = {
  userId: '',
  firstName: '',
  lastName: '',
  email: '',
  groupId: '',
}

const INITIAL_TEACHER_FORM = {
  teacherUserId: '',
  subjectName: '',
  groupId: '',
  shift: 'M',
}

const INITIAL_TUTOR_FORM = {
  groupId: '',
  tutorUserId: '',
}

const formatName = (profile) =>
  [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Sin nombre'

export default function Orientacion() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [groupForm, setGroupForm] = useState(INITIAL_GROUP_FORM)
  const [studentForm, setStudentForm] = useState(INITIAL_STUDENT_FORM)
  const [teacherForm, setTeacherForm] = useState(INITIAL_TEACHER_FORM)
  const [tutorForm, setTutorForm] = useState(INITIAL_TUTOR_FORM)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  
  // Estados para incidentes
  const [incidents, setIncidents] = useState([])
  const [incidentsLoading, setIncidentsLoading] = useState(false)
  
  // Estados para búsqueda de estatus
  const [controlNumberSearch, setControlNumberSearch] = useState('')
  const [studentStatus, setStudentStatus] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)
  
  // Estados para justificantes
  const [justificationForm, setJustificationForm] = useState({
    controlNumber: '',
    groupId: '',
    grade: '',
    section: '',
    specialty: '',
    shift: 'M',
    reason: '',
    startDate: '',
    endDate: '',
    description: '',
  })
  const [justificationSubmitting, setJustificationSubmitting] = useState(false)
  const [justifications, setJustifications] = useState([])
  const [justificationsLoading, setJustificationsLoading] = useState(false)
  
  // Estado para el menú/tabs
  const [activeTab, setActiveTab] = useState('grupos')
  //const [justifications, setJustifications] = useState([])
  //const [justificationsLoading, setJustificationsLoading] = useState(false)
  
  // Estado para el menú/tabs
  //const [activeTab, setActiveTab] = useState('grupos')

  const groupOptions = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        label: `${group.nomenclature} • ${group.grade}° ${group.specialty}`,
      })),
    [groups]
  )

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true)
      setErrorMessage(null)

      const { data, error } = await supabase
        .from('groups')
        .select('id, grade, specialty, section, nomenclature, tutor_id')
        .order('nomenclature', { ascending: true })

      if (error) {
        console.error('❌ Error al cargar los grupos:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        
        // Mensajes de error más descriptivos
        let errorMsg = 'No pudimos obtener los grupos de la institución.'
        if (error.code === 'PGRST116') {
          errorMsg = 'Error de permisos. Verifica las políticas RLS en Supabase.'
        } else if (error.code === '42P01') {
          errorMsg = 'La tabla "groups" no existe. Verifica el esquema de la base de datos.'
        } else if (error.message) {
          errorMsg = `Error: ${error.message}`
        }
        
        setErrorMessage(errorMsg)
        setGroups([])
      } else {
        // Obtener perfiles de tutores por separado
        const tutorIds = [...new Set((data ?? []).map((g) => g.tutor_id).filter(Boolean))]
        const tutorsMap = new Map()

        if (tutorIds.length > 0) {
          const { data: tutors, error: tutorsError } = await supabase
            .from('user_profiles')
            .select('user_id, first_name, last_name, email')
            .in('user_id', tutorIds)

          if (!tutorsError && tutors) {
            tutors.forEach((tutor) => {
              tutorsMap.set(tutor.user_id, tutor)
            })
          }
        }

        // Combinar grupos con sus tutores
        setGroups(
          (data ?? []).map((group) => ({
            ...group,
            tutor: group.tutor_id ? tutorsMap.get(group.tutor_id) || null : null,
          }))
        )
      }

      setLoading(false)
    }

    fetchGroups()
    fetchAllIncidents()
    fetchAllJustifications()
  }, [])

  // Cargar todos los justificantes
  const fetchAllJustifications = async () => {
    setJustificationsLoading(true)
    try {
      const { data, error } = await supabase
        .from('justifications')
        .select(
          `
          id,
          reason,
          start_date,
          end_date,
          description,
          created_at,
          student:user_profiles!justifications_student_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          created_by_user:user_profiles!justifications_created_by_fkey (
            first_name,
            last_name,
            email
          )
        `
        )
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error al cargar justificantes', error)
        setJustifications([])
      } else {
        setJustifications(data ?? [])
      }
    } catch (error) {
      console.error('Error al cargar justificantes', error)
      setJustifications([])
    } finally {
      setJustificationsLoading(false)
    }
  }

  // Cargar todos los incidentes reportados
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
            group:groups (
              id,
              nomenclature
            ),
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
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error al cargar incidentes', error)
        setIncidents([])
      } else {
        setIncidents(data ?? [])
      }
    } catch (error) {
      console.error('Error al cargar incidentes', error)
      setIncidents([])
    } finally {
      setIncidentsLoading(false)
    }
  }

  // Buscar estatus del alumno por número de control
  const handleSearchStatus = async () => {
    if (!controlNumberSearch.trim()) {
      setErrorMessage('Por favor ingresa un número de control')
      return
    }

    setStatusLoading(true)
    setErrorMessage(null)
    setStudentStatus(null)

    try {
      // Buscar el estudiante por número de control
      // Asumiendo que el número de control está en user_profiles o en una tabla students
      // Primero intentamos buscar en user_profiles por email o algún campo relacionado
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, user_id')
        .or(`email.ilike.%${controlNumberSearch}%,first_name.ilike.%${controlNumberSearch}%,last_name.ilike.%${controlNumberSearch}%`)
        .limit(10)

      if (profileError) {
        throw profileError
      }

      if (!profiles || profiles.length === 0) {
        setErrorMessage('No se encontró ningún alumno con ese número de control')
        setStatusLoading(false)
        return
      }

      // Si hay múltiples resultados, tomar el primero o buscar más específicamente
      const studentProfile = profiles[0]

      // Obtener los grupos del estudiante
      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select(
          `
          id,
          group:groups (
            id,
            nomenclature,
            grade,
            specialty,
            section
          )
        `
        )
        .eq('student_id', studentProfile.id)

      // Obtener los incidentes del estudiante
      const { data: studentIncidents, error: incidentsError } = await supabase
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
            subject_name
          )
        `
        )
        .eq('student_id', studentProfile.id)
        .order('created_at', { ascending: false })

      // Obtener justificantes del estudiante
      const { data: justifications, error: justError } = await supabase
        .from('justifications')
        .select('*')
        .eq('student_id', studentProfile.id)
        .order('created_at', { ascending: false })

      setStudentStatus({
        profile: studentProfile,
        groups: groupMembers || [],
        incidents: studentIncidents || [],
        justifications: justifications || [],
      })
    } catch (error) {
      console.error('Error al buscar estatus del alumno', error)
      setErrorMessage('Error al buscar el estatus del alumno. Intenta nuevamente.')
    } finally {
      setStatusLoading(false)
    }
  }

  // Generar justificante
  const handleGenerateJustification = async (event) => {
    event.preventDefault()

    if (!justificationForm.controlNumber.trim()) {
      setErrorMessage('Por favor ingresa un número de control')
      return
    }

    if (!justificationForm.groupId) {
      setErrorMessage('Por favor selecciona un grupo')
      return
    }

    setJustificationSubmitting(true)
    setErrorMessage(null)
    setMessage(null)

    try {
      // Buscar el estudiante por número de control
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, user_id')
        .or(`email.ilike.%${justificationForm.controlNumber}%,first_name.ilike.%${justificationForm.controlNumber}%,last_name.ilike.%${justificationForm.controlNumber}%`)
        .limit(1)
        .maybeSingle()

      if (profileError || !profiles) {
        throw new Error('No se encontró el estudiante con ese número de control')
      }

      const payload = {
        student_id: profiles.id,
        group_id: justificationForm.groupId || null,
        grade: justificationForm.grade || null,
        section: justificationForm.section || null,
        specialty: justificationForm.specialty || null,
        shift: justificationForm.shift,
        reason: justificationForm.reason,
        start_date: justificationForm.startDate,
        end_date: justificationForm.endDate,
        description: justificationForm.description,
        created_by: user.id,
      }

      const { error } = await supabase.from('justifications').insert(payload)

      if (error) {
        throw error
      }

      setMessage('Justificante generado correctamente.')
      setJustificationForm({
        controlNumber: '',
        groupId: '',
        grade: '',
        section: '',
        specialty: '',
        shift: 'M',
        reason: '',
        startDate: '',
        endDate: '',
        description: '',
      })
      await fetchAllJustifications()
      await fetchAllJustifications()
    } catch (error) {
      console.error('Error al generar justificante', error)
      setErrorMessage('No se pudo generar el justificante. Verifica los datos e intenta nuevamente.')
    } finally {
      setJustificationSubmitting(false)
    }
  }

  const refreshGroups = async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('id, grade, specialty, section, nomenclature, tutor_id')
      .order('nomenclature', { ascending: true })

    if (!error && data) {
      // Obtener perfiles de tutores por separado
      const tutorIds = [...new Set(data.map((g) => g.tutor_id).filter(Boolean))]
      const tutorsMap = new Map()

      if (tutorIds.length > 0) {
        const { data: tutors } = await supabase
          .from('user_profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', tutorIds)

        if (tutors) {
          tutors.forEach((tutor) => {
            tutorsMap.set(tutor.user_id, tutor)
          })
        }
      }

      setGroups(
        data.map((group) => ({
          ...group,
          tutor: group.tutor_id ? tutorsMap.get(group.tutor_id) || null : null,
        }))
      )
    }
  }

  const handleInputChange = (setter) => (event) => {
    const { name, value } = event.target
    setter((prev) => ({ ...prev, [name]: value }))
  }

  const handleGroupSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    setErrorMessage(null)

    const payload = {
      grade: groupForm.grade,
      specialty: groupForm.specialty,
      section: groupForm.section || null,
      nomenclature: groupForm.nomenclature,
    }

    const { error } = await supabase.from('groups').insert(payload)

    if (error) {
      console.error('❌ Error al crear grupo:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      
      let errorMsg = 'No se pudo crear el grupo. Verifica la información e intenta de nuevo.'
      if (error.code === '23505') {
        errorMsg = 'Ya existe un grupo con esa nomenclatura. Usa un nombre diferente.'
      } else if (error.message) {
        errorMsg = `Error: ${error.message}`
      }
      
      setErrorMessage(errorMsg)
    } else {
      setMessage('Grupo creado correctamente.')
      setGroupForm(INITIAL_GROUP_FORM)
      await refreshGroups()
    }

    setSubmitting(false)
  }

  const ensureUserProfile = async ({ userId, firstName, lastName, email }) => {
    const { data: existing, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError) {
      throw fetchError
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          email,
        })
        .eq('id', existing.id)

      if (updateError) {
        throw updateError
      }

      return existing.id
    }

    const { data: inserted, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        email,
      })
      .select('id')
      .single()

    if (insertError) {
      throw insertError
    }

    return inserted.id
  }

  const handleStudentSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    setErrorMessage(null)

    try {
      const profileId = await ensureUserProfile({
        userId: studentForm.userId,
        firstName: studentForm.firstName,
        lastName: studentForm.lastName,
        email: studentForm.email,
      })

      if (studentForm.groupId) {
        const { data: existingMembership } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', studentForm.groupId)
          .eq('student_id', profileId)
          .maybeSingle()

        if (!existingMembership) {
          const { error: membershipError } = await supabase
            .from('group_members')
            .insert({
              group_id: studentForm.groupId,
              student_id: profileId,
            })

          if (membershipError) {
            throw membershipError
          }
        }
      }

      setMessage('Alumno registrado correctamente.')
      setStudentForm(INITIAL_STUDENT_FORM)
    } catch (error) {
      console.error('Error al registrar alumno', error)
      setErrorMessage('No se pudo registrar al alumno. Verifica los datos proporcionados.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTeacherSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    setErrorMessage(null)

    const payload = {
      teacher_id: teacherForm.teacherUserId,
      group_id: teacherForm.groupId,
      subject_name: teacherForm.subjectName,
      shift: teacherForm.shift,
    }

    const { error } = await supabase.from('teacher_subjects').insert(payload)

    if (error) {
      console.error('Error al registrar docente', error)
      setErrorMessage('No se pudo registrar al docente. Revisa el ID del usuario y el grupo.')
    } else {
      setMessage('Docente/Tutor académico registrado correctamente.')
      setTeacherForm(INITIAL_TEACHER_FORM)
    }

    setSubmitting(false)
  }

  const handleTutorSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    setErrorMessage(null)

    const { error } = await supabase
      .from('groups')
      .update({ tutor_id: tutorForm.tutorUserId })
      .eq('id', tutorForm.groupId)

    if (error) {
      console.error('Error al asignar tutor', error)
      setErrorMessage('No se pudo asignar el tutor. Verifica el ID del usuario.')
    } else {
      setMessage('Tutor asignado correctamente.')
      setTutorForm(INITIAL_TUTOR_FORM)
      await refreshGroups()
    }

    setSubmitting(false)
  }

  const tabs = [
    { id: 'grupos', label: 'Grupos', icon: '👥' },
    { id: 'asignacion', label: 'Asignación/Registro', icon: '📝' },
    { id: 'incidentes', label: 'Incidentes', icon: '⚠️' },
    { id: 'buscar', label: 'Buscar Alumnos', icon: '🔍' },
    { id: 'justificante', label: 'Generar Justificante', icon: '📄' },
    { id: 'lista-justificantes', label: 'Lista de Justificantes', icon: '📋' },
  ]

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <RoleNavigation currentRole="orientacion" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <header className="flex flex-col gap-2">
          <p className="text-xs sm:text-sm uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">
            Orientación educativa
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Administración de grupos y usuarios
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

        {/* Menú de Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-blue-100 dark:border-slate-800 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {/* Tab: Grupos */}
            {activeTab === 'grupos' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                      Grupos de la institución
                    </h2>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                      Consulta rápida de la lista de grupos activos y sus tutores asignados.
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {groups.length} {groups.length === 1 ? 'grupo' : 'grupos'}
                  </span>
                </div>

                {loading ? (
                  <p className="text-gray-500 dark:text-gray-400">Cargando grupos...</p>
                ) : groups.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">
                    No existen grupos registrados.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className="rounded-xl border border-gray-200 dark:border-slate-800 p-4 bg-gray-50/70 dark:bg-slate-900"
                      >
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {group.nomenclature}
                        </p>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {group.grade}° {group.specialty}
                        </h3>
                        {group.section && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Sección: {group.section}</p>
                        )}
                        <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                          <p className="font-semibold">Tutor asignado:</p>
                          {group.tutor ? (
                            <>
                              <p>{formatName(group.tutor)}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{group.tutor.email}</p>
                            </>
                          ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Sin tutor asignado</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Asignación/Registro */}
            {activeTab === 'asignacion' && (
              <div className="space-y-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  Asignación y Registro
                </h2>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                  Registra y asigna alumnos, docentes y tutores a grupos.
                </p>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Registrar alumno y asignarlo a un grupo
                    </h3>
                    <form className="space-y-4" onSubmit={handleStudentSubmit}>
                      <input
                        name="userId"
                        value={studentForm.userId}
                        onChange={handleInputChange(setStudentForm)}
                        placeholder="ID del usuario en Supabase (auth.users)"
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                      />
                      <div className="grid sm:grid-cols-2 gap-4">
                        <input
                          name="firstName"
                          value={studentForm.firstName}
                          onChange={handleInputChange(setStudentForm)}
                          placeholder="Nombre(s)"
                          required
                          className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                        />
                        <input
                          name="lastName"
                          value={studentForm.lastName}
                          onChange={handleInputChange(setStudentForm)}
                          placeholder="Apellidos"
                          required
                          className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                        />
                      </div>
                      <input
                        name="email"
                        type="email"
                        value={studentForm.email}
                        onChange={handleInputChange(setStudentForm)}
                        placeholder="Correo institucional"
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                      />
                      <select
                        name="groupId"
                        value={studentForm.groupId}
                        onChange={handleInputChange(setStudentForm)}
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                      >
                        <option value="">Asignar a un grupo (opcional)</option>
                        {groupOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 disabled:opacity-50"
                      >
                        {submitting ? 'Guardando...' : 'Registrar alumno'}
                      </button>
                    </form>
                  </div>
                </div>

                <section className="grid gap-6 lg:grid-cols-2">
                  <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Registrar docente o tutor académico
                    </h3>
                    <form className="space-y-4" onSubmit={handleTeacherSubmit}>
                      <input
                        name="teacherUserId"
                        value={teacherForm.teacherUserId}
                        onChange={handleInputChange(setTeacherForm)}
                        placeholder="ID del usuario (docente) en Supabase"
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                      />
                      <input
                        name="subjectName"
                        value={teacherForm.subjectName}
                        onChange={handleInputChange(setTeacherForm)}
                        placeholder="Nombre de la materia"
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                      />
                      <select
                        name="shift"
                        value={teacherForm.shift}
                        onChange={handleInputChange(setTeacherForm)}
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                        required
                      >
                        {SHIFT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        name="groupId"
                        value={teacherForm.groupId}
                        onChange={handleInputChange(setTeacherForm)}
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                      >
                        <option value="">Selecciona un grupo</option>
                        {groupOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 disabled:opacity-50"
                      >
                        {submitting ? 'Guardando...' : 'Registrar docente / materia'}
                      </button>
                    </form>
                  </div>

                  <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Asignar tutor de grupo
                    </h3>
                    <form className="space-y-4" onSubmit={handleTutorSubmit}>
                      <select
                        name="groupId"
                        value={tutorForm.groupId}
                        onChange={handleInputChange(setTutorForm)}
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                      >
                        <option value="">Selecciona un grupo</option>
                        {groupOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        name="tutorUserId"
                        value={tutorForm.tutorUserId}
                        onChange={handleInputChange(setTutorForm)}
                        placeholder="ID del usuario que fungirá como tutor"
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-500/50 disabled:opacity-50"
                      >
                        {submitting ? 'Guardando...' : 'Asignar tutor'}
                      </button>
                    </form>
                  </div>
                </section>
              </div>
            )}

            {/* Tab: Incidentes */}
            {activeTab === 'incidentes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                      Incidentes Reportados
                    </h2>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                      Lista de todos los incidentes registrados en el sistema.
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {incidents.length} incidentes
                  </span>
                </div>

                {incidentsLoading ? (
                  <p className="text-gray-500 dark:text-gray-400">Cargando incidentes...</p>
                ) : incidents.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No hay incidentes registrados.</p>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {incidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="rounded-xl border border-gray-100 dark:border-slate-800 p-4 bg-gray-50/70 dark:bg-slate-900"
                      >
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <div>
                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                              {incident.incident_types?.name}
                            </p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatName(incident.student)}
                            </p>
                            {incident.teacher_subject && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {incident.teacher_subject.subject_name} - {incident.teacher_subject.group?.nomenclature}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(incident.created_at).toLocaleDateString('es-MX')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{incident.situation}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                          <span className="font-semibold">Acción:</span> {incident.action}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Buscar Alumnos */}
            {activeTab === 'buscar' && (
              <div className="space-y-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  Buscar Estatus del Alumno
                </h2>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                  Ingresa el número de control del alumno para ver su estatus, grupos, incidentes y justificantes.
                </p>

                <div className="flex gap-4">
                  <input
                    type="text"
                    value={controlNumberSearch}
                    onChange={(e) => setControlNumberSearch(e.target.value)}
                    placeholder="Número de control o nombre del alumno"
                    className="flex-1 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleSearchStatus}
                    disabled={statusLoading}
                    className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50"
                  >
                    {statusLoading ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>

                {studentStatus && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Información del Alumno
                      </h3>
                      <p className="text-gray-700 dark:text-gray-200">
                        {formatName(studentStatus.profile)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {studentStatus.profile.email}
                      </p>
                    </div>

                    {studentStatus.groups.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Grupos:</h4>
                        <ul className="space-y-2">
                          {studentStatus.groups.map((member) => (
                            <li key={member.id} className="text-sm text-gray-700 dark:text-gray-200">
                              {member.group?.nomenclature} - {member.group?.grade}° {member.group?.specialty}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {studentStatus.incidents.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Incidentes ({studentStatus.incidents.length}):
                        </h4>
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                          {studentStatus.incidents.map((incident) => (
                            <li key={incident.id} className="text-sm text-gray-700 dark:text-gray-200 p-2 bg-gray-50 dark:bg-slate-800 rounded">
                              <span className="font-medium">{incident.incident_types?.name}</span> - {incident.situation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {studentStatus.justifications.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Justificantes ({studentStatus.justifications.length}):
                        </h4>
                        <ul className="space-y-2">
                          {studentStatus.justifications.map((just) => (
                            <li key={just.id} className="text-sm text-gray-700 dark:text-gray-200 p-2 bg-gray-50 dark:bg-slate-800 rounded">
                              {just.reason} - {just.start_date} a {just.end_date}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {studentStatus.groups.length === 0 && 
                     studentStatus.incidents.length === 0 && 
                     studentStatus.justifications.length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400">
                        No se encontró información adicional para este alumno.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Generar Justificante */}
            {activeTab === 'justificante' && (
              <div className="space-y-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  Generar Justificante
                </h2>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                  Genera un justificante para un alumno ingresando su número de control.
                </p>

                <form className="space-y-4" onSubmit={handleGenerateJustification}>
                  <input
                    type="text"
                    value={justificationForm.controlNumber}
                    onChange={(e) =>
                      setJustificationForm((prev) => ({ ...prev, controlNumber: e.target.value }))
                    }
                    placeholder="Número de control del alumno"
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                  />

                  <select
                    name="groupId"
                    value={justificationForm.groupId}
                    onChange={(e) => {
                      const selectedGroupId = e.target.value
                      const selectedGroup = groups.find((g) => g.id === selectedGroupId)
                      setJustificationForm((prev) => ({
                        ...prev,
                        groupId: selectedGroupId,
                        grade: selectedGroup?.grade || '',
                        section: selectedGroup?.section || '',
                        specialty: selectedGroup?.specialty || '',
                      }))
                    }}
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecciona un grupo</option>
                    {groupOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Grado
                      </label>
                      <input
                        type="text"
                        value={justificationForm.grade}
                        readOnly
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sección
                      </label>
                      <input
                        type="text"
                        value={justificationForm.section || 'Sin sección'}
                        readOnly
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Especialidad
                      </label>
                      <input
                        type="text"
                        value={justificationForm.specialty}
                        readOnly
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Turno
                      </label>
                      <select
                        name="shift"
                        value={justificationForm.shift}
                        onChange={(e) =>
                          setJustificationForm((prev) => ({ ...prev, shift: e.target.value }))
                        }
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                      >
                        {SHIFT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={justificationForm.reason}
                    onChange={(e) =>
                      setJustificationForm((prev) => ({ ...prev, reason: e.target.value }))
                    }
                    placeholder="Motivo del justificante"
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                  />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <input
                      type="date"
                      value={justificationForm.startDate}
                      onChange={(e) =>
                        setJustificationForm((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                      placeholder="Fecha de inicio"
                      required
                      className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                    />
                    <input
                      type="date"
                      value={justificationForm.endDate}
                      onChange={(e) =>
                        setJustificationForm((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                      placeholder="Fecha de fin"
                      required
                      className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                    />
                  </div>

                  <textarea
                    value={justificationForm.description}
                    onChange={(e) =>
                      setJustificationForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Descripción adicional (opcional)"
                    rows="3"
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                  />

                  <button
                    type="submit"
                    disabled={justificationSubmitting}
                    className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 disabled:opacity-50"
                  >
                    {justificationSubmitting ? 'Generando...' : 'Generar Justificante'}
                  </button>
                </form>
              </div>
            )}

            {/* Tab: Lista de Justificantes */}
            {activeTab === 'lista-justificantes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                      Lista de Justificantes
                    </h2>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                      Todos los justificantes generados en el sistema.
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {justifications.length} justificantes
                  </span>
                </div>

                {justificationsLoading ? (
                  <p className="text-gray-500 dark:text-gray-400">Cargando justificantes...</p>
                ) : justifications.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No hay justificantes registrados.</p>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {justifications.map((justification) => (
                      <div
                        key={justification.id}
                        className="rounded-xl border border-gray-100 dark:border-slate-800 p-4 bg-gray-50/70 dark:bg-slate-900"
                      >
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatName(justification.student)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {justification.student?.email}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(justification.created_at).toLocaleDateString('es-MX')}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                          {justification.reason}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Del {new Date(justification.start_date).toLocaleDateString('es-MX')} al{' '}
                          {new Date(justification.end_date).toLocaleDateString('es-MX')}
                        </p>
                        {justification.description && (
                          <p className="text-sm text-gray-700 dark:text-gray-200 mt-2">
                            {justification.description}
                          </p>
                        )}
                        {justification.created_by_user && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Generado por: {formatName(justification.created_by_user)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

