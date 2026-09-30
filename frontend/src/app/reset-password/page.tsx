"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";


export default function ResetPasswordPage() {
  const router =
    useRouter();

  const [token, setToken] =
    useState("");

  const [
    tokenLoaded,
    setTokenLoaded,
  ] = useState(false);

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);


  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    setToken(
      params.get("token") ?? ""
    );

    setTokenLoaded(true);
  }, []);


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!token) {
      setError(
        "El enlace no contiene un token."
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "Las contraseñas no coinciden."
      );

      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            token,
            new_password:
              newPassword,
          }),
        }
      );


      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => null);

        setError(
          data?.detail ??
            "Token inválido o expirado."
        );

        return;
      }


      router.push(
        "/login?reset=success"
      );

    } catch {
      setError(
        "No se pudo conectar con el servidor."
      );

    } finally {
      setLoading(false);
    }
  }


  if (!tokenLoaded) {
    return (
      <p>
        Cargando...
      </p>
    );
  }


  if (!token) {
    return (
      <main>
        <h1>
          Restablecer contraseña
        </h1>

        <p>
          El enlace es inválido.
        </p>

        <a href="/forgot-password">
          Pedir otro enlace
        </a>
      </main>
    );
  }


  return (
    <main>
      <h1>
        Restablecer contraseña
      </h1>

      <form
        onSubmit={handleSubmit}
      >
        <div>
          <label>
            Nueva contraseña
          </label>

          <input
            type="password"
            value={newPassword}
            onChange={(event) =>
              setNewPassword(
                event.target.value
              )
            }
            minLength={8}
            required
          />
        </div>

        <div>
          <label>
            Confirmar contraseña
          </label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(
                event.target.value
              )
            }
            minLength={8}
            required
          />
        </div>

        <button
          disabled={loading}
        >
          {loading
            ? "Guardando..."
            : "Cambiar contraseña"}
        </button>
      </form>

      {error && (
        <>
          <p>{error}</p>

          <a href="/forgot-password">
            Solicitar otro enlace
          </a>
        </>
      )}
    </main>
  );
}