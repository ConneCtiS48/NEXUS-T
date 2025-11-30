import { useState } from 'react'
import CollapsibleSection from '../layout/CollapsibleSection'

/**
 * Componente de tabla simple con selección por radio button (estilo AWS Console)
 * Solo muestra datos, sin botones de acción dentro de la tabla
 * Soporta altura fija con scroll y colapsable
 */
export default function SimpleTable({
  columns,
  data,
  selectedId,
  onSelect,
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  itemKey = 'id', // Key para identificar cada item
  className = '',
  maxHeight = '400px', // Altura máxima con scroll
  collapsible = false, // Permite colapsar/desplegar
  defaultCollapsed = false, // Estado inicial colapsado
  title, // Título cuando es colapsable
  onCollapseChange, // Callback cuando cambia estado de colapso
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const handleRowClick = (item) => {
    if (onSelect && !loading) {
      onSelect(item[itemKey])
    }
  }

  const handleRadioChange = (item, event) => {
    event.stopPropagation()
    if (onSelect && !loading) {
      onSelect(item[itemKey])
    }
  }

  const handleCollapseChange = (newCollapsed) => {
    setCollapsed(newCollapsed)
    onCollapseChange?.(newCollapsed)
  }

  const tableContent = (
    <div className="overflow-x-auto" style={{ maxHeight: collapsible ? 'none' : maxHeight, overflowY: collapsible ? 'visible' : 'auto' }}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 w-12"></th>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Cargando...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const isSelected = selectedId === row[itemKey]

              return (
                <tr
                  key={row[itemKey]}
                  onClick={() => handleRowClick(row)}
                  className={`
                    cursor-pointer transition-colors
                    ${isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-600 dark:border-blue-400'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {/* Radio button column */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="radio"
                      name="table-selection"
                      checked={isSelected}
                      onChange={(e) => handleRadioChange(row, e)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      aria-label={`Seleccionar ${row[itemKey]}`}
                    />
                  </td>

                  {/* Data columns */}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                    >
                      {col.render ? col.render(row[col.key], row) : (row[col.key] || '-')}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )

  // Si es colapsable, envolver en CollapsibleSection
  if (collapsible && title) {
    return (
      <CollapsibleSection
        title={title}
        collapsed={collapsed}
        onToggle={handleCollapseChange}
        className={className}
      >
        <div style={{ maxHeight, overflowY: 'auto' }}>
          {tableContent}
        </div>
      </CollapsibleSection>
    )
  }

  // Si no es colapsable, retornar tabla normal con scroll
  return (
    <div className={className}>
      {tableContent}
    </div>
  )
}
