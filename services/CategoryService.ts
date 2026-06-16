import ApiService from "./ApiService";

class CategoryService extends ApiService {
  constructor() {
    super("/category");
  }

  addNewCategory(data: any, options?: any) {
    return this.postData("/", data, options);
  }

  fetchAllCategory(options?: any) {
    return this.getData("/", options);
  }

  getTotalCategoryCount(options?: any) {
    return this.getData("/count", options);
  }

  fetchCategoryById(id: string, options?: any) {
    return this.getData(`/${id}`, options);
  }

  updateCategory(id: string, data: any, options?: any) {
    return this.putData(`/${id}`, data, options);
  }

  deleteCategory(id: string, options?: any) {
    return this.deleteData(`/${id}`, options);
  }
}

export default new CategoryService();
