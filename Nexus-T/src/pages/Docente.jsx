import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Justificantes from './docente/Justificantes'
import Incidencias from './docente/Incidencias'

export default function Docente() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('justificantes')
  const [errorMessage, setErrorMessage] = useState(null)
  const [message, setMessage] = useState(null)

  const tabs = [
    { id: 'justificantes', label: 'Justificantes', icon: '📄' },
    { id: 'incidencias', label: 'Incidencias', icon: '⚠️' },
  ]

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <header className="flex flex-col gap-2">
         
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Gestión de grupos y seguimiento
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            {user?.email ? `Sesión iniciada como ${user.email}` : 'Usuario no identificado'}
          </p>
        </header>

        {(message || errorMessage) && (
          <div
            className={`p-4 rounded-lg border ${
              errorMessage
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
            }`}
          >
            {errorMessage ?? message}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-blue-100 dark:border-slate-800 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setErrorMessage(null)
                  setMessage(null)
                }}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'justificantes' && <Justificantes setErrorMessage={setErrorMessage} />}
            {activeTab === 'incidencias' && <Incidencias setErrorMessage={setErrorMessage} />}
          </div>
        </div>
      </div>
    </div>
  )
}
