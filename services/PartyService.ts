import { Party } from "@/types/party";
import ApiService from "./ApiService";
import { extractArrayPayload, extractEntityPayload } from "@/utils/response";

export interface PartyDropdownItem {
  id: string;
  name: string;
  mobile?: string;
  partyType?: string;
}

class PartyService extends ApiService {
  constructor() {
    super("/parties");
  }

  fetchAllPartyCount(options?: any): any {
    return this.getData("/count", options);
  }

  fetchPartiesDropdown(options?: any): any {
    console.log(options, "jj");
    return this.getData<any[]>("/dropdown", options);
  }

  fetchAllParty(options?: any): any {
    return this.getData("/", options);
  }

  fetchAllInActiveParties(options?: any): any {
    return this.getData("?isActive=false", options);
  }

  fetchPartyById(id: string, options?: any) {
    return this.getData(`/${id}`, options);
  }

  fetchPartyBankDetails(id: string, options?: any) {
    return this.getData(`/${id}/bank-details`, options);
  }

  async fetchPartyWithBankDetails(id: string, options?: any) {
    const partyResponse = await this.fetchPartyById(id, options);
    const party = this.extractParty<any>(partyResponse) || {};

    try {
      const bankResponse = await this.fetchPartyBankDetails(id, options);
      const bankDetails =
        bankResponse?.data?.success === false
          ? {}
          : this.extractParty<any>(bankResponse) || {};
      return {
        ...partyResponse,
        data: {
          ...party,
          ...bankDetails,
          bankDetails,
        },
      };
    } catch {
      return partyResponse;
    }
  }

  addNewParty(data: any, options?: any) {
    return this.postData("/", data, options);
  }

  updateParty(id: string, data: any, options?: any) {
    return this.putData(`/${id}`, data, options);
  }

  deleteParty(id: string, options?: any) {
    return this.deleteData(`/${id}`, options);
  }

  extractPartyList<T = Party | PartyDropdownItem>(response: any): T[] {
    return extractArrayPayload<T>(response, ["parties"]);
  }

  extractParty<T = Party>(response: any): T | null {
    return extractEntityPayload<T>(response);
  }
}

export default new PartyService();
