import ApiService, { ApiResponse } from "./ApiService";

interface Product {
  id: string;
  name: string;
  designCode: string;
  categoryTypeId: string;
  stock: number;
  images: string[];
}

class ProductService extends ApiService {
  constructor() {
    super(`/products`);
  }

  async addProduct(formData: FormData): Promise<ApiResponse<Product>> {
    return this.postData("", formData);
  }

  async updateProduct(
    id: string,
    formData: FormData,
  ): Promise<ApiResponse<Product>> {
    return this.putData(id, formData);
  }

  async fetchProductById(id: string): Promise<ApiResponse<Product>> {
    return this.getData(id);
  }

  async fetchAllProducts(options?: any) {
    return await this.getData("/", options);
  }
  async fetchAllProductsCount() {
    return this.getData("/count");
  }
  async deleteProduct(id: string): Promise<ApiResponse<any>> {
    return this.deleteData(id);
  }
}

export default new ProductService();
