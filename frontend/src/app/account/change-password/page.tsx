"use client";

import { FormEvent, useState } from "react";

import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ChangePasswordPage() {
  const router = useRouter();

  const { token, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");

      return;
    }

    const response = await fetch(`${API_URL}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        current_password: currentPassword,

        new_password: newPassword,
      }),
    });

    if (response.status === 401) {
      logout();

      router.push("/login");

      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => null);

      setError(data?.detail ?? "No se pudo cambiar la contraseña.");

      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setMessage("Contraseña actualizada.");
  }

  return (
    <main>
      <h1>Cambiar contraseña</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Contraseña actual</label>

          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </div>

        <div>
          <label>Nueva contraseña</label>

          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>

        <div>
          <label>Confirmar nueva contraseña</label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>

        <button>Cambiar contraseña</button>
      </form>

      {error && <p>{error}</p>}

      {message && <p>{message}</p>}

      <p>
        <a href="/account/profile">Volver al perfil</a>
      </p>
    </main>
  );
}
