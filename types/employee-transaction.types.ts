export type EmployeeTransactionType = "advance" | "bonus" | "salary_paid";

export interface EmployeeTransaction {
  id: string;
  employee_id: string;
  type: EmployeeTransactionType;
  amount: number;
  date: string;
  created_by: string;
  description?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EmployeeTransactionInput {
  id?: string;
  employee_id: string;
  type: EmployeeTransactionType;
  amount: number;
  date: string;
  description?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface UpdateEmployeeTransactionDto {
  employee_id?: string;
  type?: EmployeeTransactionType;
  amount?: number;
  date?: string;
  description?: string | null;
}

export interface BulkEmployeeTransactionDto {
  transactions: EmployeeTransactionInput[];
}

export interface EmployeeTransactionQueryParams {
  limit?: number;
  cursor?: string | null;
  employee_id?: string | null;
  type?: EmployeeTransactionType | null;
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export type CountEmployeeTransactionsParams = Omit<
  EmployeeTransactionQueryParams,
  "limit" | "cursor"
>;

export type ClearEmployeeTransactionsParams = CountEmployeeTransactionsParams;

export interface EmployeeTransactionListPayload {
  transactions: EmployeeTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface EmployeeTransactionBulkPayload {
  transactions: EmployeeTransaction[];
  upsertedCount: number;
}

export interface EmployeeTransactionClearPayload {
  deletedCount: number;
}
