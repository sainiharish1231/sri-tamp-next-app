export type UserRole = "admin" | "internal_user" | "user" | "party";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  balance: number;
  currentBalance?: number;
  email?: string;
  countryCode?: string;
  diallingCode?: string;
  isActive?: boolean;
  pin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  balance?: number;
  currentBalance?: number;
  email?: string;
  countryCode?: string;
  diallingCode?: string;
  isActive?: boolean;
  pin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserData {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  balance: number;
  currentBalance?: number;
  email?: string;
  countryCode?: string;
  diallingCode?: string;
  isActive?: boolean;
  pin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserForm {
  name: string;
  phone: string;
  balance: number;
  role: UserRole;
}

export interface CreateUserPayload {
  name: string;
  phone: string;
  pin?: string;
  balance?: number;
  role?: string;
  email?: string;
  countryId?: string;
  countryCode?: string;
  diallingCode?: string;
  isActive?: boolean;
}
