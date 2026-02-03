import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import SimpleTable from '../../components/data/SimpleTable'

const SHIFT_MAP = { M: 'Matutino', V: 'Vespertino' }

export default function Asignaturas({ setErrorMessage }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchAssignments = async () => {
      setLoading(true)
      setErrorMessage?.(null)

      try {
        const { data, error } = await supabase
          .from('teacher_group_subjects')
          .select(
            `
            id,
            shift,
            group_id,
            subject_id,
            subject:subjects!teacher_group_subjects_subject_id_fkey (
              id,
              subject_name
            ),
            group:groups!teacher_group_subjects_group_id_fkey (
              id,
              nomenclature,
              grade,
              specialty,
              section,
              shift
            )
            `
          )
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: true })

        if (error) throw error

        const normalized = (data || []).map((row) => ({
          id: row.id,
          shift: row.shift,
          group_id: row.group_id,
          subject_id: row.subject_id,
          subject_name: row.subject?.subject_name ?? 'Sin nombre',
          group: row.group,
          nomenclature: row.group?.nomenclature ?? '-',
        }))

        setAssignments(normalized)
      } catch (err) {
        console.error('Error al cargar asignaturas:', err)
        setErrorMessage?.('No se pudieron cargar tus asignaturas.')
        setAssignments([])
      } finally {
        setLoading(false)
      }
    }

    fetchAssignments()
  }, [user, setErrorMessage])

  const tableColumns = [
    { key: 'subject_name', label: 'Asignatura', render: (v) => v || '-' },
    { key: 'nomenclature', label: 'Grupo', render: (v) => v || '-' },
    {
      key: 'group',
      label: 'Grado / Especialidad',
      render: (_, row) => {
        const g = row.group
        if (!g) return '-'
        return `${g.grade || ''}° ${g.specialty || ''}`.trim() || '-'
      },
    },
    {
      key: 'shift',
      label: 'Turno',
      render: (v) => (v ? SHIFT_MAP[v] || v : '-'),
    },
  ]

  const handleSelect = (id) => {
    const row = assignments.find((a) => a.id === id)
    if (row) {
      navigate(`/docente/grupos?subjectId=${row.id}&groupId=${row.group_id}`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
          Mis Asignaturas ({assignments.length})
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Asignaturas y grupos donde impartes clase. Haz clic en una fila para ver el grupo.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Cargando asignaturas...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No tienes asignaturas asignadas.</p>
        </div>
      ) : (
        <SimpleTable
          columns={tableColumns}
          data={assignments}
          selectedId={null}
          onSelect={handleSelect}
          loading={false}
          maxHeight="500px"
          collapsible={false}
          title="Lista de Asignaturas"
          itemKey="id"
        />
      )}
    </div>
  )
}
