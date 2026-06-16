export type EmployeeRole = "employee";

export interface Employee {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: EmployeeRole;
  address?: string;
  countryCode: string;
  diallingCode: string;
  dailySalary: number;
  joiningDate: string;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateEmployeeDto {
  name: string;
  phone: string;
  email: string;
  address?: string;
  countryCode: string;
  diallingCode: string;
  dailySalary: number;
  joiningDate: string;
}

export interface UpdateEmployeeDto {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  countryCode?: string;
  diallingCode?: string;
  dailySalary?: number;
  joiningDate?: string;
  isActive?: boolean;
}

export interface EmployeeQueryParams {
  limit?: number;
  cursor?: string | null;
  search?: string;
  isActive?: boolean | "all" | null;
}

export interface EmployeeListPayload {
  employees: Employee[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface EmployeeSalaryQueryParams {
  startDate?: string | null;
  endDate?: string | null;
}

export interface EmployeeSalary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  perDaySalary: number;
  totalSalary: number;
  advance: number;
  bonus: number;
  netSalary: number;
  paid: number;
  remaining: number;
  overpaid: number;
}
