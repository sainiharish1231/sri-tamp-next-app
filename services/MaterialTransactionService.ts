import ApiService from "./ApiService";

class MaterialTransactionService extends ApiService {
  constructor() {
    super("/material-transactions");
  }

  fetchAllMaterialTransactions(options?: any): any {
    return this.getData("/", options);
  }

  fetchMaterialTransactionById(id: string, options?: any) {
    return this.getData(`/${id}`, options);
  }

  addNewMaterialTransaction(data: any, options?: any) {
    return this.postData("/", data, options);
  }

  updateMaterialTransaction(id: string, data: any, options?: any) {
    return this.putData(`/${id}`, data, options);
  }

  deleteMaterialTransaction(id: string, options?: any) {
    return this.deleteData(`/${id}`, options);
  }
}

export default new MaterialTransactionService();
