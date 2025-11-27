/**
 * Componente reutilizable para formulario de creación (arriba de tabla)
 * Se ve como una fila de tabla pero con inputs/selects
 */
export default function CrudFormRow({ 
  fields, 
  formData, 
  onChange, 
  onSubmit, 
  onCancel,
  loading = false,
  submitLabel = 'Crear'
}) {
  return (
    <tr className="bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-800">
      {fields.map((field) => (
        <td key={field.name} className="px-4 py-3">
          {field.type === 'select' ? (
            <select
              name={field.name}
              value={formData[field.name] || ''}
              onChange={onChange}
              required={field.required}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{field.placeholder || 'Seleccionar...'}</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type || 'text'}
              name={field.name}
              value={formData[field.name] || ''}
              onChange={onChange}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}
        </td>
      ))}
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Guardando...' : submitLabel}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-500/50 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}


