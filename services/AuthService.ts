import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiService from "./ApiService";

interface LoginResponse {
  token: any;
  user: any;
  data: {
    user: any;
    token: string;
  };
  message: string;
}

class AuthService extends ApiService {
  constructor() {
    super("/auth");
  }

  async login(phone: string, pin: string) {
    const res = await this.postData<any>("/login", {
      phone,
      pin,
    });

    const userWithToken = {
      ...res.data.user,
      token: res.data.token,
    };

    await AsyncStorage.setItem("auth_token", res.data.token);
    await AsyncStorage.setItem("user", JSON.stringify(userWithToken));

    return userWithToken;
  }

  async logout() {
    await AsyncStorage.multiRemove(["auth_token", "user"]);
  }

  async forgotPassword(data: { phone: string; email: string }) {
    return this.postData("/forgot-password", data);
  }
}

export default new AuthService();
