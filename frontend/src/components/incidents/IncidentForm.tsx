"use client";

import { FormEvent, useState } from "react";

import { createIncident, ApiError } from "@/lib/incidentsApi";

import {
  INCIDENT_BRANCHES,
  INCIDENT_CATEGORIES,
  INCIDENT_ORIGINS,
} from "@/lib/incidentOptions";

import { IncidentCreate, IncidentOrigin } from "@/types/incidents";

type Props = {
  token: string;
  onCreated: () => void;
};

const initialForm: IncidentCreate = {
  title: "",
  description: "",
  category: "pagos",
  status: "open",
  origin: "customer",
  branch: "central",
};

export default function IncidentForm({ token, onCreated }: Props) {
  const [form, setForm] = useState<IncidentCreate>(initialForm);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  function setField(field: keyof IncidentCreate, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};

    if (!form.title.trim()) {
      nextErrors.title = "El título es obligatorio.";
    }

    if (!form.description.trim()) {
      nextErrors.description = "La descripción es obligatoria.";
    }

    if (!form.category) {
      nextErrors.category = "Seleccioná una categoría.";
    }

    if (!form.origin) {
      nextErrors.origin = "Seleccioná un origen.";
    }

    if (!form.branch) {
      nextErrors.branch = "Seleccioná una sede.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await createIncident(token, form);

      setForm(initialForm);

      setErrors({});

      setMessage("Incidencia registrada correctamente.");

      onCreated();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.field) {
          setErrors((current) => ({
            ...current,
            [error.field!]: error.message,
          }));
        } else {
          setMessage(error.message);
        }
      } else {
        setMessage("No se pudo conectar con el servidor.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Nueva incidencia</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Título</label>

          <input
            value={form.title}
            onChange={(event) => setField("title", event.target.value)}
            disabled={loading}
          />

          {errors.title && <p>{errors.title}</p>}
        </div>

        <div>
          <label>Descripción</label>

          <textarea
            value={form.description}
            onChange={(event) => setField("description", event.target.value)}
            disabled={loading}
          />

          {errors.description && <p>{errors.description}</p>}
        </div>

        <div>
          <label>Categoría</label>

          <select
            value={form.category}
            onChange={(event) => setField("category", event.target.value)}
            disabled={loading}
          >
            {INCIDENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {errors.category && <p>{errors.category}</p>}
        </div>

        <div>
          <label>Origen</label>

          <select
            value={form.origin}
            onChange={(event) => setField("origin", event.target.value)}
            disabled={loading}
          >
            {INCIDENT_ORIGINS.map((origin) => (
              <option key={origin} value={origin}>
                {origin}
              </option>
            ))}
          </select>

          {errors.origin && <p>{errors.origin}</p>}
        </div>

        <div>
          <label>Sede</label>

          <select
            value={form.branch}
            onChange={(event) => setField("branch", event.target.value)}
            disabled={loading}
            style={{
              border:
                form.origin === "branch"
                  ? "3px solid orange"
                  : "1px solid gray",
            }}
          >
            {INCIDENT_BRANCHES.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>

          {form.origin === "branch" && (
            <p>Indicá desde qué sede se reporta el problema.</p>
          )}

          {errors.branch && <p>{errors.branch}</p>}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Crear incidencia"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </section>
  );
}
