export interface User {
  id: string;
  username: string;
}

export interface Mela {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  dailySalary: number;
  melaId: string;
  createdAt: string;
}

export interface FoodItem {
  id: string;
  name?: string;
  price?: number;
  melaId: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  status: "present" | "absent";
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  employeeId: string;
  melaId: string;
  date: string;
  createdAt: string;
}

export interface EmployeeSalary {
  id: string;
  employeeId: string;
  date: string;
  amount: number;
  createdAt: string;
}
