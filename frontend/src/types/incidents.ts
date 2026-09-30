export type IncidentStatus = "open" | "in_progress" | "resolved" | "discarded";

export type IncidentOrigin = "customer" | "branch" | "internal";

export type Incident = {
  id: number;
  title: string;
  description: string;
  category: string;
  status: IncidentStatus;
  origin: IncidentOrigin;
  branch: string;
  reported_by_user_id: number | null;
  legacy_id: string | null;
  created_at: string;
  updated_at: string;
};

export type IncidentCreate = {
  title: string;
  description: string;
  category: string;
  status: IncidentStatus;
  origin: IncidentOrigin;
  branch: string;
};

export type IncidentFilters = {
  status?: string;
  origin?: string;
  branch?: string;
  category?: string;
};

export type IncidentSummary = {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_origin: Record<string, number>;
  by_branch: Record<string, number>;
};
