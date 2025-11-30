export default function AdminSubjects() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Gestión de Asignaturas
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2">
          Gestiona las asignaturas del sistema
        </p>
      </header>

      {/* Mensajes de éxito/error */}
      {/* TODO: Agregar componente de mensajes */}

      {/* Sección de importación CSV */}
      {/* TODO: Agregar componente de importación CSV */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 sm:p-6 border border-blue-100 dark:border-slate-800">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Importar Asignaturas
        </h2>
        {/* Componente de importación CSV irá aquí */}
      </section>

      {/* Sección de creación manual */}
      {/* TODO: Agregar formulario de creación */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 sm:p-6 border border-blue-100 dark:border-slate-800">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Crear Nueva Asignatura
        </h2>
        {/* Formulario de creación irá aquí */}
      </section>

      {/* Lista de asignaturas y panel de detalles */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabla de asignaturas */}
        {/* TODO: Agregar SelectableTable para asignaturas */}
        <div className="lg:w-2/3">
          <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 sm:p-6 border border-blue-100 dark:border-slate-800">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Lista de Asignaturas
            </h2>
            {/* SelectableTable irá aquí */}
          </section>
        </div>

        {/* Panel de detalles */}
        {/* TODO: Agregar DetailPanel para asignaturas */}
        <div className="lg:w-1/3">
          <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 sm:p-6 border border-blue-100 dark:border-slate-800">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Detalles
            </h2>
            {/* DetailPanel irá aquí */}
          </section>
        </div>
      </div>
    </div>
  )
}

