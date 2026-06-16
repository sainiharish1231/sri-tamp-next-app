import { Material } from "@/types/product";
import ApiService from "./ApiService";

class MaterialService extends ApiService {
  constructor() {
    super("/materials");
  }
  fetchAllMaterial(options?: any) {
    return this.getData("/", options);
  }

  fetchMaterialById(id: string, options?: any) {
    return this.getData(`/${id}`, options);
  }

  getTotalMaterialCount(options?: any) {
    return this.getData("/count", options);
  }

  addNewMaterial(data: Material, options?: any) {
    return this.postData("/", data, options);
  }

  updateMaterial(id: string, data: Material, options?: any) {
    return this.putData(`/${id}`, data, options);
  }

  deleteMaterial(id: string, options?: any) {
    return this.deleteData(`/${id}`, options);
  }
}

export default new MaterialService();
