import { PartyTypeData } from "@/types/party";
import ApiService from "./ApiService";

class PartyTypesService extends ApiService {
  constructor() {
    super("/party-types");
  }

  async fetchAllPartyTypes(options?: any) {
    return await this.getData("/", options);
  }
  async fetchAllPartyTypesCount(options?: any) {
    return await this.getData("/count", options);
  }
  async createPartyType(data: PartyTypeData, options?: any) {
    if (!data?.name) {
      throw new Error("Party type name is required");
    }

    const res = await this.postData("/", data, options);
    return res;
  }
  async updatePartyType(id: string, data: PartyTypeData, options?: any) {
    const res = await this.putData(`/${id}`, data, options);
    return res;
  }

  async deletePartyType(id: string) {
    if (!id) throw new Error("Party type ID is required");
    return this.deleteData(`/${id}`);
  }
}

export default new PartyTypesService();
