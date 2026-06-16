// types/expense.types.ts
export const PAID_BY_TYPES = {
  PARTY: "party",
  USER: "user",
} as const;

export type PaidByType = (typeof PAID_BY_TYPES)[keyof typeof PAID_BY_TYPES];

export interface Expense {
  id: string;
  title?: string;
  paidToName?: string;
  description?: string;
  amount: number;
  date?: string;
  paidById?: string;
  paidByType?: PaidByType;
  paidByName?: string;
  paidByAccountId?: string;
  paidByAccountType?: PaidByType;
  paidByAccountName?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  createdByRole?: string;
  // Legacy response fields kept for older records and safe fallbacks.
  paidBy?: string;
  partyId?: string;
  partyName?: string;
  message?: string;
  expenseType?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  receiptImage?: string;
  status?: string;
}

export interface CreateExpenseDto {
  title?: string;
  paidToName: string;
  description: string;
  amount: number;
  date?: string;
  paidById: string;
  paidByType: PaidByType;
}

export type UpdateExpenseDto = Partial<CreateExpenseDto>;
