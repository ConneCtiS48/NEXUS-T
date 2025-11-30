import { useState } from 'react'
import CollapsibleSection from '../layout/CollapsibleSection'

/**
 * Componente de detalles que se muestra debajo de la tabla
 * Solo visible cuando hay un item seleccionado
 * Soporta tabs y colapsable
 */
export default function DetailView({
  selectedItem,
  title = 'Detalles',
  tabs = [],
  defaultTab,
  collapsible = true,
  defaultCollapsed = false,
  onCollapseChange,
  emptyMessage = 'Selecciona un elemento para ver sus detalles',
  renderContent,
  className = '',
}) {
  const [activeTab, setActiveTab] = useState(defaultTab || (tabs.length > 0 ? tabs[0].id : null))
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const handleCollapseChange = (newCollapsed) => {
    setCollapsed(newCollapsed)
    onCollapseChange?.(newCollapsed)
  }

  // Si no hay item seleccionado, mostrar mensaje vacío
  if (!selectedItem) {
    return (
      <CollapsibleSection
        title={title}
        collapsed={collapsed}
        onToggle={handleCollapseChange}
        className={className}
      >
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      </CollapsibleSection>
    )
  }

  const activeTabData = tabs.find((tab) => tab.id === activeTab)
  const content = renderContent
    ? renderContent(selectedItem, activeTab)
    : activeTabData
    ? activeTabData.content
    : null

  return (
    <CollapsibleSection
      title={title}
      collapsed={collapsed}
      onToggle={handleCollapseChange}
      className={className}
    >
      {/* Tabs */}
      {tabs.length > 0 && (
        <div className="border-b border-gray-200 dark:border-slate-700 mb-4 -mx-4 px-4">
          <nav className="flex space-x-4" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                {tab.label}
                {tab.badge && (
                  <span className="ml-2 py-0.5 px-2 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Content */}
      <div className="space-y-4">
        {content || (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            No hay contenido disponible para este elemento.
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}

