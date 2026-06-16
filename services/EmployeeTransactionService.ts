import ApiService from "./ApiService";
import {
  BulkEmployeeTransactionDto,
  ClearEmployeeTransactionsParams,
  CountEmployeeTransactionsParams,
  EmployeeTransaction,
  EmployeeTransactionBulkPayload,
  EmployeeTransactionClearPayload,
  EmployeeTransactionListPayload,
  EmployeeTransactionQueryParams,
  UpdateEmployeeTransactionDto,
} from "@/types/employee-transaction.types";

class EmployeeTransactionService extends ApiService {
  constructor() {
    super("/employee-transactions");
  }

  fetchTransactions(params?: EmployeeTransactionQueryParams, options?: any) {
    return this.getData<EmployeeTransactionListPayload>("/", {
      ...options,
      params: { ...(options?.params || {}), ...(params || {}) },
    });
  }

  fetchTransactionCount(params?: CountEmployeeTransactionsParams, options?: any) {
    return this.getData<{ count: number }>("/count", {
      ...options,
      params: { ...(options?.params || {}), ...(params || {}) },
    });
  }

  saveTransactions(data: BulkEmployeeTransactionDto, options?: any) {
    return this.postData<EmployeeTransactionBulkPayload>("/", data, options);
  }

  updateTransaction(
    id: string,
    data: UpdateEmployeeTransactionDto,
    options?: any,
  ) {
    return this.putData<EmployeeTransaction>(`/${id}`, data, options);
  }

  deleteTransaction(id: string, options?: any) {
    return this.deleteData(`/${id}`, options);
  }

  clearTransactions(params?: ClearEmployeeTransactionsParams, options?: any) {
    return this.deleteData<EmployeeTransactionClearPayload>("/", {
      ...options,
      params: { ...(options?.params || {}), ...(params || {}) },
    });
  }
}

export default new EmployeeTransactionService();
