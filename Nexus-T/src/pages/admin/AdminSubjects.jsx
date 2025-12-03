import { useState } from 'react'
import SimpleTable from '../../components/data/SimpleTable'
import DetailView from '../../components/data/DetailView'
import ActionMenu from '../../components/data/ActionMenu'
import PageHeader from '../../components/layout/PageHeader'
import Alert from '../../components/base/Alert'

export default function AdminSubjects() {
  // Estados de UI
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Datos mock temporales (vacío por ahora)
  const subjects = []
  const loading = false

  const handleSelect = (id) => {
    setSelectedSubjectId(id)
    setActiveTab('overview')
  }

  const tableColumns = [
    {
      key: 'subject_name',
      label: 'Asignatura',
      render: (value) => value || '-',
    },
    {
      key: 'category_type',
      label: 'Tipo',
      render: (value) => value || '-',
    },
    {
      key: 'category_name',
      label: 'Categoría',
      render: (value) => value || '-',
    },
  ]

  // Tabs para el panel de detalles
  const tabs = [
    { id: 'overview', label: 'Detalles' },
    { id: 'groups', label: 'Grupos' },
    { id: 'teachers', label: 'Docentes' },
  ]

  // Obtener asignatura seleccionada de los datos mock
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader
        title="Gestión de Asignaturas"
        description="Administra las asignaturas del sistema."
      />

      {errorMessage && <Alert type="error" message={errorMessage} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* Panel principal: Lista y Detalles (Layout vertical) */}
      <div className="space-y-4">
        {/* Tabla de asignaturas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Asignaturas ({subjects.length})
            </h2>
            <div className="flex items-center gap-2">
              <ActionMenu
                selectedId={selectedSubjectId}
                actions={[
                  {
                    label: 'Editar',
                    icon: '✏️',
                    onClick: () => {
                      // Pendiente de implementar
                      setErrorMessage('Funcionalidad pendiente de implementar')
                    },
                  },
                  {
                    label: 'Eliminar',
                    icon: '🗑️',
                    variant: 'danger',
                    onClick: () => {
                      // Pendiente de implementar
                      setErrorMessage('Funcionalidad pendiente de implementar')
                    },
                  },
                ]}
                disabled={false}
              />
              <button
                onClick={() => {
                  // Pendiente de implementar
                  setErrorMessage('Funcionalidad pendiente de implementar')
                }}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                Crear Nueva Asignatura
              </button>
              <button
                onClick={() => {
                  // Pendiente de implementar
                  setErrorMessage('Funcionalidad pendiente de implementar')
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Importar Asignaturas
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Cargando asignaturas...</p>
            </div>
          ) : (
            <SimpleTable
              columns={tableColumns}
              data={subjects}
              selectedId={selectedSubjectId}
              onSelect={handleSelect}
              loading={loading}
              maxHeight="500px"
              collapsible={true}
              title="Lista de Asignaturas"
              itemKey="id"
              emptyMessage="No hay asignaturas registradas. La funcionalidad CRUD se implementará próximamente."
            />
          )}
        </div>

        {/* Detalles de la asignatura seleccionada (debajo de la tabla) */}
        {selectedSubjectId && selectedSubject ? (
          <DetailView
            selectedItem={selectedSubject}
            title={`Detalles: ${selectedSubject.subject_name}`}
            tabs={tabs}
            defaultTab={activeTab}
            collapsible={true}
            onCollapseChange={() => {}}
            renderContent={(item, tab) => {
              // Tab Detalles
              if (tab === 'overview') {
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Información de la Asignatura
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nombre:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.subject_name || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.category_type || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Categoría:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.category_name || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              // Tab Grupos
              if (tab === 'groups') {
                return (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Grupos asignados a esta asignatura (pendiente de implementar).
                    </p>
                  </div>
                )
              }

              // Tab Docentes
              if (tab === 'teachers') {
                return (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Docentes que imparten esta asignatura (pendiente de implementar).
                    </p>
                  </div>
                )
              }

              return null
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
