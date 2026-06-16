import ApiService from "./ApiService";

class OtpService extends ApiService {
  constructor() {
    super("/otp");
  }

  sendOtp(data: { mobile: string }, options?: any) {
    return this.postData("/send", data, options);
  }
}

const otpService = new OtpService();
export default otpService;
