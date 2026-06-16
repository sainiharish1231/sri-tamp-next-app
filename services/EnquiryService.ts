import { EnquiryTypes } from "@/types/enquiry.types";
import ApiService from "./ApiService";

class EnquiryService extends ApiService {
  constructor() {
    super("/enquiry");
  }

  addNewEnquiry(data: EnquiryTypes, options?: any) {
    return this.postData("/", data, options);
  }

  fetchAllEnquiry(options?: any) {
    return this.getData("/", options);
  }

  getTotalEnquiryCount(options?: any) {
    return this.getData("/count", options);
  }

  fetchEnquiryById(id: string, options?: any) {
    return this.getData(`/${id}`, options);
  }

  updateEnquiryStatus(id: string, data: any, options?: any) {
    return this.putData(`/${id}`, data, options);
  }

  deleteEnquiry(id: string, options?: any) {
    return this.deleteData(`/${id}`, options);
  }
}

export default new EnquiryService();
