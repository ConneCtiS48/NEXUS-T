/**
 * Componente reutilizable para tabla CRUD editable
 */
export default function CrudTable({ 
  columns, 
  data, 
  onEdit, 
  onFieldChange,
  onSave, 
  onCancel, 
  onDelete,
  editingId,
  loading = false
}) {
  const handleFieldChange = (id, field, value) => {
    if (onFieldChange) {
      onFieldChange(id, field, value)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((row) => {
            const isEditing = editingId === row.id
            return (
              <tr
                key={row.id}
                className={isEditing ? 'bg-blue-50 dark:bg-blue-950/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
              >
                {columns.map((col) => {
                  const isEditable = col.editable !== false && isEditing
                  return (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {isEditable ? (
                        col.type === 'select' ? (
                          <select
                            value={row[col.key] || ''}
                            onChange={(e) => handleFieldChange(row.id, col.key, e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Seleccionar...</option>
                            {col.options?.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={col.type || 'text'}
                            value={row[col.key] || ''}
                            onChange={(e) => handleFieldChange(row.id, col.key, e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          />
                        )
                      ) : (
                        <span className={col.editable === false && isEditing ? 'text-gray-500 dark:text-gray-400 italic' : ''}>
                          {col.render ? col.render(row[col.key], row) : (row[col.key] || '-')}
                        </span>
                      )}
                    </td>
                  )
                })}
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSave(row.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {loading ? '...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => onCancel()}
                        disabled={loading}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(row.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Editar
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row.id)}
                          className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

