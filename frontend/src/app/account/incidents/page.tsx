"use client";

import { useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import IncidentForm from "@/components/incidents/IncidentForm";

import IncidentList from "@/components/incidents/IncidentList";

import IncidentSummary from "@/components/incidents/IncidentSummary";

import {
  ApiError,
  changeIncidentStatus,
  getIncidents,
  getIncidentSummary,
} from "@/lib/incidentsApi";

import { useAuth } from "@/context/AuthContext";

import {
  Incident,
  IncidentFilters,
  IncidentStatus,
  IncidentSummary as SummaryType,
} from "@/types/incidents";

export default function IncidentsPage() {
  const router = useRouter();

  const { token, logout } = useAuth();

  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [filters, setFilters] = useState<IncidentFilters>({});

  const [listLoading, setListLoading] = useState(true);

  const [listError, setListError] = useState("");

  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [summary, setSummary] = useState<SummaryType | null>(null);

  const [summaryLoading, setSummaryLoading] = useState(true);

  const [summaryError, setSummaryError] = useState("");

  const handleUnauthorized = useCallback(() => {
    logout();
    router.push("/login");
  }, [logout, router]);

  const loadIncidents = useCallback(async () => {
    if (!token) {
      return;
    }

    setListLoading(true);
    setListError("");

    try {
      const data = await getIncidents(token, filters);

      setIncidents(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }

      setListError(
        error instanceof Error
          ? error.message
          : "No se pudieron " + "cargar las incidencias.",
      );
    } finally {
      setListLoading(false);
    }
  }, [token, filters, handleUnauthorized]);

  const loadSummary = useCallback(async () => {
    if (!token) {
      return;
    }

    setSummaryLoading(true);
    setSummaryError("");

    try {
      const data = await getIncidentSummary(token);

      setSummary(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }

      setSummaryError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar " + "el resumen.",
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [token, handleUnauthorized]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  async function handleCreated() {
    await Promise.all([loadIncidents(), loadSummary()]);
  }

  async function handleStatusChange(
    incident: Incident,
    newStatus: IncidentStatus,
  ) {
    if (!token) {
      return;
    }

    const previousStatus = incident.status;

    setUpdatingId(incident.id);

    setListError("");

    setIncidents((current) =>
      current.map((item) =>
        item.id === incident.id
          ? {
              ...item,
              status: newStatus,
            }
          : item,
      ),
    );

    try {
      const updated = await changeIncidentStatus(token, incident.id, newStatus);

      setIncidents((current) =>
        current.map((item) => (item.id === incident.id ? updated : item)),
      );

      await loadSummary();
    } catch (error) {
      setIncidents((current) =>
        current.map((item) =>
          item.id === incident.id
            ? {
                ...item,
                status: previousStatus,
              }
            : item,
        ),
      );

      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }

      setListError(
        error instanceof Error
          ? error.message
          : "No se pudo " + "actualizar el estado.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (!token) {
    return <p>Cargando sesión...</p>;
  }

  return (
    <main>
      <h1>Gestor de incidencias</h1>

      <p>
        Desde acá podemos registrar, consultar y seguir los problemas de la
        empresa.
      </p>

      <IncidentForm token={token} onCreated={handleCreated} />

      <hr />

      <IncidentSummary
        summary={summary}
        loading={summaryLoading}
        error={summaryError}
        onRetry={loadSummary}
      />

      <hr />

      <IncidentList
        incidents={incidents}
        filters={filters}
        loading={listLoading}
        error={listError}
        updatingId={updatingId}
        onFiltersChange={setFilters}
        onRetry={loadIncidents}
        onStatusChange={handleStatusChange}
      />
    </main>
  );
}
