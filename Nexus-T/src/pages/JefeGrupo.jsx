import { alumnos } from "../data/alumnos"

export default function JefeGrupo() {
  const misAlumnos = alumnos.filter(a => a.grupo === "3A");

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
        Jefe del Grupo 3A
      </h2>
      <h3 className="text-xl font-semibold mb-6 text-gray-700 dark:text-gray-300">
        Alumnos de mi grupo
      </h3>
      <ul className="space-y-2">
        {misAlumnos.map(a => (
          <li 
            key={a.id}
            className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white shadow-sm hover:shadow-md transition-shadow"
          >
            {a.nombre}
          </li>
        ))}
      </ul>
    </div>
  );
}