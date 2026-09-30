"use client";

import {
  IncidentSummary as SummaryType,
} from "@/types/incidents";


type Props = {
  summary: SummaryType | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
};


function MetricGroup({
  title,
  values,
}: {
  title: string;
  values: Record<string, number>;
}) {
  return (
    <div>
      <h3>{title}</h3>

      {Object.keys(values)
        .length === 0 ? (
        <p>Sin datos.</p>
      ) : (
        <ul>
          {Object.entries(values)
            .map(
              ([key, value]) => (
                <li key={key}>
                  {key}: {value}
                </li>
              )
            )}
        </ul>
      )}
    </div>
  );
}


export default function IncidentSummary({
  summary,
  loading,
  error,
  onRetry,
}: Props) {
  if (loading) {
    return (
      <section>
        <h2>Resumen</h2>
        <p>
          Cargando resumen...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <h2>Resumen</h2>

        <p>{error}</p>

        <button
          onClick={onRetry}
        >
          Reintentar resumen
        </button>
      </section>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <section>
      <h2>
        Resumen de incidencias
      </h2>

      <p>
        Total: {summary.total}
      </p>

      <MetricGroup
        title="Por estado"
        values={
          summary.by_status
        }
      />

      <MetricGroup
        title="Por categoría"
        values={
          summary.by_category
        }
      />

      <MetricGroup
        title="Por origen"
        values={
          summary.by_origin
        }
      />

      <MetricGroup
        title="Por sede"
        values={
          summary.by_branch
        }
      />
    </section>
  );
}