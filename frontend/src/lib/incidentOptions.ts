export const INCIDENT_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "discarded",
] as const;

export const INCIDENT_ORIGINS = ["customer", "branch", "internal"] as const;

export const INCIDENT_CATEGORIES = [
  "pagos",
  "sistema",
  "pedidos",
  "atencion_cliente",
  "infraestructura",
] as const;

export const INCIDENT_BRANCHES = [
  "central",
  "sucursal_norte",
  "sucursal_centro",
  "sucursal_sur",
] as const;

export const ALLOWED_TRANSITIONS = {
  open: ["in_progress", "discarded"],
  in_progress: ["resolved", "discarded"],
  resolved: [],
  discarded: [],
} as const;
