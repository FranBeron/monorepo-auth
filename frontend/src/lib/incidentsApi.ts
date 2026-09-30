import {
  Incident,
  IncidentCreate,
  IncidentFilters,
  IncidentStatus,
  IncidentSummary,
} from "@/types/incidents";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  field?: string;

  constructor(message: string, status: number, field?: string) {
    super(message);

    this.status = status;
    this.field = field;
  }
}

async function readApiError(response: Response): Promise<ApiError> {
  const data = await response.json().catch(() => null);

  const detail = data?.detail ?? data;

  const message = detail?.message ?? detail?.detail ?? "Ocurrió un error.";

  const field = detail?.field;

  return new ApiError(message, response.status, field);
}

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getIncidents(
  token: string,
  filters: IncidentFilters = {},
): Promise<Incident[]> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();

  const url = query
    ? `${API_URL}/api/incidents?${query}`
    : `${API_URL}/api/incidents`;

  const response = await fetch(url, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw await readApiError(response);
  }

  return response.json();
}

export async function createIncident(
  token: string,
  payload: IncidentCreate,
): Promise<Incident> {
  const response = await fetch(`${API_URL}/api/incidents`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await readApiError(response);
  }

  return response.json();
}

export async function changeIncidentStatus(
  token: string,
  incidentId: number,
  status: IncidentStatus,
): Promise<Incident> {
  const response = await fetch(
    `${API_URL}/api/incidents/` + `${incidentId}/status`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({
        status,
      }),
    },
  );

  if (!response.ok) {
    throw await readApiError(response);
  }

  return response.json();
}

export async function getIncidentSummary(
  token: string,
): Promise<IncidentSummary> {
  const response = await fetch(`${API_URL}/api/incidents/summary`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw await readApiError(response);
  }

  return response.json();
}
