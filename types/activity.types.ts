export const ACTIVITY_ACTIONS = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  BULK_CREATE: "bulk_create",
  CLEAR: "clear",
  STATUS_UPDATE: "status_update",
  CANCEL: "cancel",
} as const;

export const ACTIVITY_MODULES = {
  EXPENSE: "expense",
  TRANSACTION: "transaction",
  ORDER: "order",
  MATERIAL_TRANSACTION: "material_transaction",
  FINANCIAL_TRANSACTION: "financial_transaction",
  PRODUCT: "product",
  EMPLOYEE_TRANSACTION: "employee_transaction",
  EMPLOYEE_ATTENDANCE: "employee_attendance",
  PARTY: "party",
  USER: "user",
} as const;

export type ActivityAction =
  (typeof ACTIVITY_ACTIONS)[keyof typeof ACTIVITY_ACTIONS];

export type ActivityModule =
  (typeof ACTIVITY_MODULES)[keyof typeof ACTIVITY_MODULES];

export interface ActivityLog {
  id: string;
  module: ActivityModule;
  action: ActivityAction;
  entityId?: string | null;
  entityName?: string | null;
  description?: string;
  status?: "success" | "failed";
  amount?: number | null;
  actorId?: string | null;
  actorRole?: string | null;
  actorPartyId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
}
