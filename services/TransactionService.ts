import ApiService from "./ApiService";

class TransactionService extends ApiService {
  constructor() {
    super("/transactions");
  }

  fetchAllTransaction(options?: any) {
    return this.getData("/", options);
  }

  fetchTransactionById(id: string, options?: any) {
    return this.getData(`/${id}`, options);
  }

  addNewTransaction(data: any, options?: any) {
    return this.postData("/", data, options);
  }

  updateTransaction(id: string, data: any, options?: any) {
    return this.putData(`/${id}`, data, options);
  }

  deleteTransaction(id: string, options?: any) {
    return this.deleteData(`/${id}`, options);
  }
}
const transactionService = new TransactionService();

export default transactionService;
