import { CreateUserPayload } from "@/types/user";
import ApiService from "./ApiService";

export type UserRole = "internal_user" | "user" | "party";

class UserService extends ApiService {
  constructor() {
    super("/users");
  }

  fetchAllUsers(options?: any) {
    return this.getData("/", options);
  }
  fetchAllUsersCount() {
    return this.getData("/count");
  }
  fetchUserById(id: string, options?: any) {
    return this.getData(`/${id}`, options);
  }

  fetchUserByPartyId(partyId: string, options?: any) {
    return this.getData(`/by-party/${partyId}`, options);
  }

  fetchUsersByRole(role: UserRole, options?: any) {
    return this.getData(`/?role=${role}`, options);
  }

  createUser(data: any, options?: any): any {
    return this.postData("/", data, options);
  }

  updateUser(id: string, data: any, options?: any): any {
    return this.putData(`/${id}`, data, options);
  }

  updateUserBalance(id: string, currentBalance: number, options?: any) {
    return this.putData(`/${id}/balance`, { currentBalance }, options);
  }

  deleteUser(id: string, options?: any): any {
    return this.deleteData(`/${id}`, options);
  }
}

export default new UserService();
