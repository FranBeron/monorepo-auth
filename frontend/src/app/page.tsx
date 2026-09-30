export default function Home() {
  return (
    <main>
      <h1>Auth Full Stack</h1>

      <ul>
        <li>
          <a href="/register">Crear cuenta</a>
        </li>

        <li>
          <a href="/login">Iniciar sesión</a>
        </li>

        <li>
          <a href="/account/profile">Mi perfil</a>
        </li>
        <li>
          <a href="/account/incidents">Gestor de incidencias</a>
        </li>
      </ul>
    </main>
  );
}
