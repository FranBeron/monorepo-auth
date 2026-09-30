"use client";

import {
  ALLOWED_TRANSITIONS,
  INCIDENT_BRANCHES,
  INCIDENT_CATEGORIES,
  INCIDENT_ORIGINS,
  INCIDENT_STATUSES,
} from "@/lib/incidentOptions";

import { Incident, IncidentFilters, IncidentStatus } from "@/types/incidents";

type Props = {
  incidents: Incident[];
  filters: IncidentFilters;
  loading: boolean;
  error: string;
  updatingId: number | null;

  onFiltersChange: (filters: IncidentFilters) => void;

  onRetry: () => void;

  onStatusChange: (incident: Incident, status: IncidentStatus) => void;
};

export default function IncidentList({
  incidents,
  filters,
  loading,
  error,
  updatingId,
  onFiltersChange,
  onRetry,
  onStatusChange,
}: Props) {
  return (
    <section>
      <h2>Incidencias</h2>

      <h3>Filtros</h3>

      <div>
        <label>Estado</label>

        <select
          value={filters.status ?? ""}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              status: event.target.value,
            })
          }
        >
          <option value="">Todos</option>

          {INCIDENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Origen</label>

        <select
          value={filters.origin ?? ""}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              origin: event.target.value,
            })
          }
        >
          <option value="">Todos</option>

          {INCIDENT_ORIGINS.map((origin) => (
            <option key={origin} value={origin}>
              {origin}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Sede</label>

        <select
          value={filters.branch ?? ""}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              branch: event.target.value,
            })
          }
        >
          <option value="">Todas</option>

          {INCIDENT_BRANCHES.map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Categoría</label>

        <select
          value={filters.category ?? ""}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              category: event.target.value,
            })
          }
        >
          <option value="">Todas</option>

          {INCIDENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Cargando incidencias...</p>}

      {!loading && error && (
        <div>
          <p>{error}</p>

          <button onClick={onRetry}>Reintentar</button>
        </div>
      )}

      {!loading && !error && incidents.length === 0 && (
        <p>No hay incidencias para los filtros seleccionados.</p>
      )}

      {!loading &&
        !error &&
        incidents.map((incident) => {
          const transitions = ALLOWED_TRANSITIONS[incident.status];

          return (
            <article
              key={incident.id}
              style={{
                border: "1px solid #999",
                padding: "12px",
                margin: "12px 0",
              }}
            >
              <h3>{incident.title}</h3>

              <p>{incident.description}</p>

              <p>Categoría: {incident.category}</p>

              <p>Estado: {incident.status}</p>

              <p>Origen: {incident.origin}</p>

              <p>Sede: {incident.branch}</p>

              <p>
                Reportado por usuario:{" "}
                {incident.reported_by_user_id ?? "histórico"}
              </p>

              {transitions.length > 0 ? (
                <div>
                  <label>Cambiar estado</label>

                  <select
                    value=""
                    disabled={updatingId === incident.id}
                    onChange={(event) => {
                      if (!event.target.value) {
                        return;
                      }

                      onStatusChange(
                        incident,
                        event.target.value as IncidentStatus,
                      );
                    }}
                  >
                    <option value="">Seleccionar</option>

                    {transitions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  {updatingId === incident.id && <span> Guardando...</span>}
                </div>
              ) : (
                <p>Estado final.</p>
              )}
            </article>
          );
        })}
    </section>
  );
}
