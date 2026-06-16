// services/ExpenseService.ts
import ApiService from "./ApiService";
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  Expense,
  PaidByType,
} from "@/types/expense.types";

type ExpenseUpsertPayload = {
  title?: string;
  paidToName?: string;
  description?: string;
  amount: number;
  date?: string;
  paidById?: string;
  paidByType?: PaidByType;
};

class ExpenseService extends ApiService {
  constructor() {
    super("/expenses");
  }

  fetchAllExpenses(options?: any): Promise<{ success: boolean; data?: { data: Expense[] }; message?: string }> {
    return this.getData("/", options);
  }

  fetchExpenseById(id: string, options?: any): Promise<{ success: boolean; data?: { data: Expense }; message?: string }> {
    return this.getData(`/${id}`, options);
  }

  private normalizeExpensePayload(data: CreateExpenseDto | UpdateExpenseDto): ExpenseUpsertPayload {
    const paidToName = String(data.paidToName || data.title || "").trim();
    const description = String(data.description || "").trim();
    const paidById = String(data.paidById || "").trim();

    return {
      title: String(data.title || paidToName).trim() || paidToName,
      paidToName,
      description,
      amount: Number(data.amount || 0),
      date: data.date,
      paidById: paidById || undefined,
      paidByType: data.paidByType,
    };
  }

  addNewExpense(data: CreateExpenseDto, options?: any): Promise<{ success: boolean; data?: { data: Expense }; message?: string }> {
    return this.postData("/", this.normalizeExpensePayload(data), options);
  }

  updateExpense(id: string, data: UpdateExpenseDto, options?: any): Promise<{ success: boolean; data?: { data: Expense }; message?: string }> {
    return this.putData(`/${id}`, this.normalizeExpensePayload(data), options);
  }

  deleteExpense(id: string, options?: any): Promise<{ success: boolean; message?: string }> {
    return this.deleteData(`/${id}`, options);
  }
}

const expenseService = new ExpenseService();
export default expenseService;
