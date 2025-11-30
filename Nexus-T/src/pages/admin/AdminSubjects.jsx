import PageHeader from '../../components/layout/PageHeader'
import Alert from '../../components/base/Alert'
import Section from '../../components/layout/Section'

export default function AdminSubjects() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <PageHeader
        title="Gestión de Asignaturas"
        description="Gestiona las asignaturas del sistema"
      />

      {/* Mensajes de éxito/error */}
      {/* TODO: Agregar estados para errorMessage y successMessage cuando se implemente funcionalidad */}

      {/* Sección de importación CSV */}
      {/* TODO: Agregar componente de importación CSV */}
      <Section title="Importar Asignaturas">
        {/* Componente de importación CSV irá aquí */}
      </Section>

      {/* Sección de creación manual */}
      {/* TODO: Agregar formulario de creación */}
      <Section title="Crear Nueva Asignatura">
        {/* Formulario de creación irá aquí */}
      </Section>

      {/* Lista de asignaturas y panel de detalles */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabla de asignaturas */}
        {/* TODO: Agregar SelectableTable para asignaturas */}
        <div className="lg:w-2/3">
          <Section title="Lista de Asignaturas">
            {/* SelectableTable irá aquí */}
          </Section>
        </div>

        {/* Panel de detalles */}
        {/* TODO: Agregar DetailPanel para asignaturas */}
        <div className="lg:w-1/3">
          <Section title="Detalles">
            {/* DetailPanel irá aquí */}
          </Section>
        </div>
      </div>
    </div>
  )
}

