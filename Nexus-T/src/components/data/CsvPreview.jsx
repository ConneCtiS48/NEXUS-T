/**
 * Componente para mostrar vista previa de datos CSV
 */
export default function CsvPreview({
  data = [],
  headers = [],
  maxRows = 10,
  onConfirm,
  loading = false,
  className = '',
}) {
  if (!data || data.length === 0) return null

  const displayData = data.slice(0, maxRows)
  const displayHeaders = headers.length > 0 ? headers : Object.keys(data[0] || {})

  return (
    <div className={`mt-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Vista previa: {data.length} registro(s)
        </h3>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Importando...' : 'Confirmar importación'}
        </button>
      </div>
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {displayHeaders.map((header) => (
                <th
                  key={header}
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
            {displayData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {displayHeaders.map((header) => (
                  <td
                    key={header}
                    className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  >
                    {row[header.toLowerCase()] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > maxRows && (
          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
            Mostrando {maxRows} de {data.length} registros
          </div>
        )}
      </div>
    </div>
  )
}

