import { useState, useEffect, useRef } from 'react'

/**
 * Componente base reutilizable para secciones colapsables
 * Soporta modo controlado y no controlado
 */
export default function CollapsibleSection({
  title,
  children,
  collapsed: controlledCollapsed,
  onToggle,
  defaultCollapsed = false,
  className = '',
  headerActions,
  showIcon = true,
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed)
  const contentRef = useRef(null)
  const [maxHeight, setMaxHeight] = useState(null)

  // Determinar si es controlado o no controlado
  const isControlled = controlledCollapsed !== undefined
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed

  // Calcular altura máxima del contenido
  useEffect(() => {
    if (contentRef.current) {
      if (collapsed) {
        setMaxHeight('0px')
      } else {
        setMaxHeight(`${contentRef.current.scrollHeight}px`)
      }
    }
  }, [collapsed, children])

  const handleToggle = () => {
    if (isControlled) {
      onToggle?.(!collapsed)
    } else {
      setInternalCollapsed(!internalCollapsed)
      onToggle?.(!internalCollapsed)
    }
  }

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <button
          onClick={handleToggle}
          className="flex items-center gap-2 flex-1 text-left hover:bg-gray-50 dark:hover:bg-gray-800 -mx-4 -my-3 px-4 py-3 transition-colors"
          aria-expanded={!collapsed}
          aria-controls={`collapsible-content-${title}`}
        >
          {showIcon && (
            <svg
              className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${collapsed ? '' : 'rotate-90'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </button>
        {headerActions && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {headerActions}
          </div>
        )}
      </div>

      {/* Content con animación */}
      <div
        id={`collapsible-content-${title}`}
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: maxHeight || (collapsed ? '0px' : 'none') }}
      >
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

