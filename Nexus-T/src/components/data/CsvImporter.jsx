import { useState } from 'react'
import CsvPreview from './CsvPreview'
import CsvImportResults from './CsvImportResults'

/**
 * Componente genérico para importar datos desde CSV
 */
export default function CsvImporter({
  entityType,
  requiredHeaders = [],
  onImport,
  onValidate,
  templateHeaders = [],
  templateFileName = 'plantilla.csv',
  maxPreviewRows = 10,
  className = '',
}) {
  const [csvFile, setCsvFile] = useState(null)
  const [csvPreview, setCsvPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState(null)

  // Parser genérico de CSV
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter((line) => line.trim())
    if (lines.length < 2) {
      throw new Error('El CSV debe tener al menos una fila de encabezados y una fila de datos')
    }

    const parseCSVLine = (line) => {
      const result = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase())
    
    // Validar headers requeridos
    if (requiredHeaders.length > 0) {
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h.toLowerCase()))
      if (missingHeaders.length > 0) {
        throw new Error(`Faltan columnas requeridas: ${missingHeaders.join(', ')}`)
      }
    }

    const data = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]).map((v) => v.replace(/^"|"$/g, '').trim())
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      // Solo agregar filas que tengan al menos un campo con valor
      if (Object.values(row).some((v) => v.trim() !== '')) {
        data.push(row)
      }
    }

    return data
  }

  // Validación genérica
  const validateRow = (row, index) => {
    const errors = []

    // Validación de headers requeridos
    requiredHeaders.forEach((header) => {
      const headerLower = header.toLowerCase()
      if (!row[headerLower] || row[headerLower].trim() === '') {
        errors.push(`Fila ${index + 1}: ${header} es requerido`)
      }
    })

    // Validación personalizada
    if (onValidate) {
      const customError = onValidate(row, index)
      if (customError) {
        errors.push(customError)
      }
    }

    return errors
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('Por favor, selecciona un archivo CSV')
      return
    }

    setCsvFile(file)
    setError(null)
    setImportResults(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const csvText = event.target.result
        const parsedData = parseCSV(csvText)

        const validationErrors = []
        parsedData.forEach((row, index) => {
          const errors = validateRow(row, index)
          validationErrors.push(...errors)
        })

        if (validationErrors.length > 0) {
          setError(`Errores de validación:\n${validationErrors.slice(0, 5).join('\n')}${validationErrors.length > 5 ? `\n... y ${validationErrors.length - 5} más` : ''}`)
          setCsvPreview([])
          setShowPreview(false)
        } else {
          setCsvPreview(parsedData)
          setShowPreview(true)
        }
      } catch (err) {
        setError(err.message || 'Error al procesar el archivo CSV')
        setCsvPreview([])
        setShowPreview(false)
      }
    }

    reader.onerror = () => {
      setError('Error al leer el archivo')
      setCsvPreview([])
      setShowPreview(false)
    }

    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!csvPreview || csvPreview.length === 0) return

    setImporting(true)
    setError(null)

    try {
      const results = await onImport(csvPreview)
      setImportResults(results)
      setShowPreview(false)
      
      // Limpiar archivo después de importación exitosa
      if (results.success && results.success.length > 0) {
        setCsvFile(null)
        setCsvPreview([])
      }
    } catch (err) {
      setError(err.message || 'Error al importar los datos')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    if (templateHeaders.length === 0) {
      setError('No hay plantilla disponible para esta entidad')
      return
    }

    const csvContent = [templateHeaders.join(','), templateHeaders.map(() => 'ejemplo').join(',')].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', templateFileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <label className="flex-1 min-w-[200px] cursor-pointer">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            disabled={importing}
          />
          <div className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {csvFile ? `Archivo seleccionado: ${csvFile.name}` : 'Seleccionar archivo CSV'}
          </div>
        </label>
        {templateHeaders.length > 0 && (
          <button
            onClick={downloadTemplate}
            className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium whitespace-nowrap"
          >
            📥 Descargar plantilla
          </button>
        )}
      </div>

      {showPreview && csvPreview.length > 0 && (
        <CsvPreview
          data={csvPreview}
          headers={requiredHeaders.length > 0 ? requiredHeaders : Object.keys(csvPreview[0] || {})}
          maxRows={maxPreviewRows}
          onConfirm={handleImport}
          loading={importing}
        />
      )}

      {importResults && (
        <CsvImportResults results={importResults} onClose={() => setImportResults(null)} />
      )}
    </div>
  )
}

