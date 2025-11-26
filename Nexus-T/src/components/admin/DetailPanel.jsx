/**
 * Panel de detalles reutilizable estilo AWS IAM
 * Muestra información detallada de la entidad seleccionada
 */
export default function DetailPanel({
  title,
  breadcrumb,
  tabs,
  activeTab,
  onTabChange,
  children,
  emptyMessage = "Selecciona un elemento para ver sus detalles",
}) {
  if (!title && !breadcrumb) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
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
          <p className="mt-4 text-sm">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800">
      {/* Header con breadcrumb */}
      {(breadcrumb || title) && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          {breadcrumb && (
            <nav className="flex mb-2" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm">
                {breadcrumb.map((item, index) => (
                  <li key={index} className="flex items-center">
                    {index > 0 && (
                      <svg
                        className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {item.onClick ? (
                      <button
                        onClick={item.onClick}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {item.label}
                      </button>
                    ) : (
                      <span className={index === breadcrumb.length - 1 ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500 dark:text-gray-400'}>
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          {title && (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          )}
        </div>
      )}

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="border-b border-gray-200 dark:border-slate-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange && onTabChange(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
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
      <div className="p-6">{children}</div>
    </div>
  )
}

