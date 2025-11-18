import { alumnos } from "../data/alumnos"

export default function JefeGrupo() {
  const misAlumnos = alumnos.filter(a => a.grupo === "3A");

  return (
    <div>
      <h2>Jefe del Grupo 3A</h2>
      <h3>Alumnos de mi grupo</h3>
      <ul>
        {misAlumnos.map(a => (
          <li key={a.id}>{a.nombre}</li>
        ))}
      </ul>
    </div>
  );
}