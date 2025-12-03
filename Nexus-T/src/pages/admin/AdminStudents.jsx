import { useState } from 'react'
import SimpleTable from '../../components/data/SimpleTable'
import DetailView from '../../components/data/DetailView'
import ActionMenu from '../../components/data/ActionMenu'
import PageHeader from '../../components/layout/PageHeader'
import Alert from '../../components/base/Alert'

export default function AdminStudents() {
  // Estados de UI
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Datos mock temporales (vacío por ahora)
  const students = []
  const loading = false

  const handleSelect = (id) => {
    setSelectedStudentId(id)
    setActiveTab('overview')
  }

  const tableColumns = [
    {
      key: 'control_number',
      label: 'No. Control',
      render: (value) => value || '-',
    },
    {
      key: 'first_name',
      label: 'Nombre',
      render: (value, row) => {
        const fullName = `${row.first_name || ''} ${row.paternal_last_name || ''} ${row.maternal_last_name || ''}`.trim()
        return fullName || '-'
      },
    },
    {
      key: 'email',
      label: 'Email',
      render: (value) => value || '-',
    },
    {
      key: 'phone',
      label: 'Teléfono',
      render: (value) => value || '-',
    },
  ]

  // Tabs para el panel de detalles
  const tabs = [
    { id: 'overview', label: 'Detalles' },
    { id: 'group', label: 'Grupo' },
    { id: 'contact', label: 'Contacto' },
  ]

  // Obtener estudiante seleccionado de los datos mock
  const selectedStudent = students.find((s) => s.id === selectedStudentId)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader
        title="Gestión de Alumnos"
        description="Administra los estudiantes del sistema."
      />

      {errorMessage && <Alert type="error" message={errorMessage} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* Panel principal: Lista y Detalles (Layout vertical) */}
      <div className="space-y-4">
        {/* Tabla de alumnos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Alumnos ({students.length})
            </h2>
            <div className="flex items-center gap-2">
              <ActionMenu
                selectedId={selectedStudentId}
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
                Crear Nuevo Alumno
              </button>
              <button
                onClick={() => {
                  // Pendiente de implementar
                  setErrorMessage('Funcionalidad pendiente de implementar')
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Importar Alumnos
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Cargando alumnos...</p>
            </div>
          ) : (
            <SimpleTable
              columns={tableColumns}
              data={students}
              selectedId={selectedStudentId}
              onSelect={handleSelect}
              loading={loading}
              maxHeight="500px"
              collapsible={true}
              title="Lista de Alumnos"
              itemKey="id"
              emptyMessage="No hay alumnos registrados. La funcionalidad CRUD se implementará próximamente."
            />
          )}
        </div>

        {/* Detalles del alumno seleccionado (debajo de la tabla) */}
        {selectedStudentId && selectedStudent ? (
          <DetailView
            selectedItem={selectedStudent}
            title={`Detalles: ${selectedStudent.first_name} ${selectedStudent.paternal_last_name}`}
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
                          Información Personal
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Número de Control:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.control_number || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nombre Completo:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {`${item.first_name || ''} ${item.paternal_last_name || ''} ${item.maternal_last_name || ''}`.trim() || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Email:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.email || '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Teléfono:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1">
                              {item.phone || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              // Tab Grupo
              if (tab === 'group') {
                return (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Información del grupo pendiente de implementar.
                    </p>
                  </div>
                )
              }

              // Tab Contacto
              if (tab === 'contact') {
                return (
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Información de Contacto de Emergencia
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Nombre:</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {item.contact_name || '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Teléfono:</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {item.contact_phone || '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo de Contacto:</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {item.contact_type || '-'}
                          </p>
                        </div>
                      </div>
                    </div>
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

