import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const SHIFT_MAP = {
  M: 'Matutino',
  V: 'Vespertino',
}

export default function DocenteDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    if (!user) {
      return
    }

    const fetchSubjects = async () => {
      setLoading(true)
      setErrorMessage(null)

      const { data, error } = await supabase
        .from('teacher_group_subjects')
        .select(
          `
            id,
            shift,
            subject:subjects!teacher_group_subjects_subject_id_fkey (
              id,
              subject_name
            ),
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
          subject_name: entry.subject?.subject_name || 'Sin nombre',
        }))
        setSubjects(normalized)
      }

      setLoading(false)
    }

    fetchSubjects()
  }, [user])

  const handleSelectGroup = (subjectId, groupId) => {
    navigate(`/docente/grupos?subjectId=${subjectId}&groupId=${groupId}`)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <header className="flex flex-col gap-2 mb-6">
        <p className="text-xs sm:text-sm uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">
          Sesión docente
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          Mis Materias y Grupos
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
          {user?.email ? `Sesión iniciada como ${user.email}` : 'Usuario no identificado'}
        </p>
      </header>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
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

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Cargando materias...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No encontramos materias asignadas a tu perfil.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                onClick={() => handleSelectGroup(subject.id, subject.group?.id)}
                className="text-left rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-600 p-4 transition focus:outline-none focus:ring-4 focus:ring-blue-500/50"
              >
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {subject.group?.nomenclature ?? 'Sin grupo'}
                </p>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                  {subject.subject_name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
    </div>
  )
}

