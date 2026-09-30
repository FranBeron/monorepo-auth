"use client";

import { FormEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const [sent, setSent] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || sent) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      setSent(true);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Recuperar contraseña</h1>

      {sent ? (
        <p>Si esa dirección está registrada, recibirás un enlace en breve.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label>Email</label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={loading}
          />

          <button disabled={loading}>
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>
      )}

      {error && <p>{error}</p>}

      <p>
        <a href="/login">Volver al login</a>
      </p>
    </main>
  );
}
