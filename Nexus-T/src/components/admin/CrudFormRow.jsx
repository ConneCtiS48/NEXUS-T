import Input from '../forms/Input'
import Select from '../forms/Select'

/**
 * Componente reutilizable para formulario de creación (arriba de tabla)
 * Se ve como una fila de tabla pero con inputs/selects
 * Ahora usa los componentes forms genéricos
 */
export default function CrudFormRow({
  fields,
  formData,
  onChange,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = 'Crear',
}) {
  return (
    <tr className="bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-800">
      {fields.map((field) => (
        <td key={field.name} className="px-4 py-3">
          {field.type === 'select' ? (
            <Select
              name={field.name}
              value={formData[field.name] || ''}
              onChange={onChange}
              options={field.options || []}
              placeholder={field.placeholder || 'Seleccionar...'}
              required={field.required}
              className="text-sm"
            />
          ) : (
            <Input
              type={field.type || 'text'}
              name={field.name}
              value={formData[field.name] || ''}
              onChange={onChange}
              placeholder={field.placeholder}
              required={field.required}
              className="text-sm"
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
