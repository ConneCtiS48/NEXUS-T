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
  }, [])

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

        <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 sm:p-6 border border-blue-100 dark:border-slate-800 space-y-6">
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
              No existen grupos registrados. Utiliza el formulario para dar de alta uno nuevo.
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
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Crear nuevo grupo
            </h3>
            <form className="space-y-4" onSubmit={handleGroupSubmit}>
              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  name="grade"
                  value={groupForm.grade}
                  onChange={handleInputChange(setGroupForm)}
                  placeholder="Grado (ej. 3)"
                  required
                  className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                />
                <input
                  name="specialty"
                  value={groupForm.specialty}
                  onChange={handleInputChange(setGroupForm)}
                  placeholder="Especialidad (ej. Informática)"
                  required
                  className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  name="section"
                  value={groupForm.section}
                  onChange={handleInputChange(setGroupForm)}
                  placeholder="Sección (opcional)"
                  className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                />
                <input
                  name="nomenclature"
                  value={groupForm.nomenclature}
                  onChange={handleInputChange(setGroupForm)}
                  placeholder="Nombre corto (ej. 3A-INFO)"
                  required
                  className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Crear grupo'}
              </button>
            </form>
          </div>

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
                className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
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
                className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
              />
              <select
                name="groupId"
                value={studentForm.groupId}
                onChange={handleInputChange(setStudentForm)}
                className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
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
        </section>

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
                className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
              />
              <input
                name="subjectName"
                value={teacherForm.subjectName}
                onChange={handleInputChange(setTeacherForm)}
                placeholder="Nombre de la materia"
                required
                className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
              />
              <select
                name="shift"
                value={teacherForm.shift}
                onChange={handleInputChange(setTeacherForm)}
                className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
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
                className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
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
                className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
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
                className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white"
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
    </div>
  )
}

