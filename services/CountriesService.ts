import ApiService from "./ApiService";

class CountriesService extends ApiService {
  constructor() {
    super("/countries");
  }

  fetchAllCategory(options?: any) {
    return this.getData("/", options);
  }
}

export default new CountriesService();
