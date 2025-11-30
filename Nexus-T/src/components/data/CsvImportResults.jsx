/**
 * Componente para mostrar resultados de importación CSV
 */
export default function CsvImportResults({
  results = { success: [], errors: [], skipped: [] },
  onClose,
  className = '',
}) {
  const { success = [], errors = [], skipped = [] } = results

  return (
    <div className={`mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Resultados de la importación
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{success.length}</div>
          <div className="text-xs text-green-700 dark:text-green-300">Exitosos</div>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{errors.length}</div>
          <div className="text-xs text-red-700 dark:text-red-300">Errores</div>
        </div>
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{skipped.length}</div>
          <div className="text-xs text-yellow-700 dark:text-yellow-300">Omitidos</div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">Errores:</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {errors.map((error, index) => (
              <div key={index} className="text-xs text-red-600 dark:text-red-400">
                {typeof error === 'string' ? error : `Fila ${error.row || index + 1}: ${error.error || error.message || 'Error desconocido'}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {skipped.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-2">Omitidos:</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {skipped.map((skip, index) => (
              <div key={index} className="text-xs text-yellow-600 dark:text-yellow-400">
                {typeof skip === 'string' ? skip : `Fila ${skip.row || index + 1}: ${skip.reason || skip.message || 'Omitido'}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

