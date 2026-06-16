export interface EmployeeAttendance {
  id: string;
  employee_id: string;
  marked_by: string;
  date: string;
  present: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EmployeeAttendanceInput {
  id?: string;
  employee_id: string;
  date: string;
  present: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface BulkEmployeeAttendanceDto {
  attendances: EmployeeAttendanceInput[];
}

export interface EmployeeAttendanceQueryParams {
  limit?: number;
  cursor?: string | null;
  employee_id?: string | null;
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export type ClearEmployeeAttendancesParams = Pick<
  EmployeeAttendanceQueryParams,
  "employee_id" | "date" | "startDate" | "endDate"
>;

export interface EmployeeAttendanceListPayload {
  attendances: EmployeeAttendance[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface EmployeeAttendanceBulkPayload {
  attendances: EmployeeAttendance[];
  upsertedCount: number;
}

export interface EmployeeAttendanceClearPayload {
  deletedCount: number;
}
