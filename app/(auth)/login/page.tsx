"use client";

import { colors } from "@/colors";
import { useLanguage } from "@/hooks/use-language";
import AuthService from "@/services/AuthService";
import { useAuthStore } from "@/store/auth.store";
import { Eye, EyeOff, ArrowRight, Check, ChevronDown, AlertCircle, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import Toast from "@/utils/Toast";
import { Country } from "@/types/country.types";
import CountriesService from "@/services/CountriesService";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { setSession, isAuthenticated } = useAuthStore();
  
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);

  const defaultCountry: Country = {
    id: "in",
    name: "India",
    code: "IN",
    dialling_code: "+91",
    flag: "🇮🇳",
    isoCode: "356",
  };

  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPhoneError, setForgotPhoneError] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCountries(countries);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = countries.filter(
        (country) =>
          country.name.toLowerCase().includes(query) ||
          country.dialling_code.includes(query) ||
          country?.code?.toLowerCase().includes(query),
      );
      setFilteredCountries(filtered);
    }
  }, [searchQuery, countries]);

  const fetchCountries = async () => {
    try {
      setCountriesLoading(true);
      const response: any = await CountriesService.fetchAllCategory();
      if (response.success && response.data) {
        const countriesData = response.data || [];
        setCountries(countriesData);
        const india = countriesData.find(
          (c: Country) =>
            c.id === "in" ||
            c.code === "IN" ||
            c.name.toLowerCase() === "india",
        );
        if (india) setSelectedCountry(india);
      }
    } catch (err) {
      console.log("[v0] Error fetching countries:", err);
    } finally {
      setCountriesLoading(false);
    }
  };

  const validatePhone = useCallback((): boolean => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setPhoneError(t("phone_required") || "Phone number is required");
      return false;
    }
    if (!/^[0-9]{10}$/.test(trimmedPhone)) {
      setPhoneError(t("invalid_phone") || "Enter valid 10-digit phone number");
      return false;
    }
    setPhoneError("");
    return true;
  }, [phone, t]);

  const validatePin = useCallback((): boolean => {
    const trimmedPin = pin.trim();
    if (!trimmedPin) {
      setLoginError(t("pin_required") || "PIN is required");
      return false;
    }
    if (!/^[0-9]{6}$/.test(trimmedPin)) {
      setLoginError(t("invalid_pin") || "Enter valid 6-digit PIN");
      return false;
    }
    setLoginError("");
    return true;
  }, [pin, t]);

  const validateForgotPhone = useCallback((): boolean => {
    const trimmedPhone = forgotPhone.trim();
    if (!trimmedPhone) {
      setForgotPhoneError(t("mobile_required"));
      return false;
    }
    if (!/^[0-9]{10}$/.test(trimmedPhone)) {
      setForgotPhoneError(t("invalid_mobile"));
      return false;
    }
    setForgotPhoneError("");
    return true;
  }, [forgotPhone, t]);

  const validateForgotEmail = useCallback((): boolean => {
    const trimmedEmail = forgotEmail.trim();
    if (!trimmedEmail) {
      setForgotEmailError(t("email_required"));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setForgotEmailError(t("invalid_email"));
      return false;
    }
    setForgotEmailError("");
    return true;
  }, [forgotEmail, t]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhone() || !validatePin()) {
      Toast.error(t("validation_error"), {
        description: t("please_fix_errors"),
      });
      return;
    }

    setLoading(true);
    try {
      const fullPhoneNumber = `${selectedCountry.dialling_code}${phone}`;
      const userWithToken = await AuthService.login(fullPhoneNumber, pin);
      const { token, ...user } = userWithToken;
      await setSession({ token, user });

      Toast.success(
        t("login_success") || "Login Successful!",
        { description: t("welcome") || "Welcome back!" }
      );

      setTimeout(() => {
        router.replace("/(tabs)");
      }, 1000);
    } catch (err: any) {
      console.log("[v0] Login failed:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        t("login_failed") ||
        "Login failed";
      setLoginError(errorMsg);
      Toast.error(t("login_failed"), { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isPhoneValid = validateForgotPhone();
    const isEmailValid = validateForgotEmail();

    if (!isPhoneValid || !isEmailValid) {
      Toast.error(t("validation_error"), {
        description: t("please_fix_errors"),
      });
      return;
    }

    setForgotLoading(true);
    try {
      const fullPhoneNumber = `${selectedCountry.dialling_code}${forgotPhone.trim()}`;
      const response: any = await AuthService.forgotPassword({
        phone: fullPhoneNumber,
        email: forgotEmail.trim().toLowerCase(),
      });

      Toast.success(
        t("reset_request_sent"),
        {
          description:
            response?.data?.message ||
            response?.message ||
            t("check_email_instructions"),
        }
      );
      
      setShowForgotModal(false);
      setForgotPhone("");
      setForgotEmail("");
      setForgotPhoneError("");
      setForgotEmailError("");
    } catch (err: any) {
      console.log("[v0] Forgot password failed:", err);
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        t("forgot_password_failed");
      Toast.error(t("request_failed"), { description: errorMsg });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t("welcome")}</h1>
          <p className="text-blue-100">{t("continue_to_account")}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8 mb-4">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Phone Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t("phone_number")}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCountryModal(true)}
                  className={`flex items-center gap-2 px-3 py-3 border rounded-lg transition ${
                    phoneError
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 bg-gray-50 hover:border-gray-400"
                  }`}
                >
                  <span>{selectedCountry.flag}</span>
                  <span className="text-sm font-medium text-gray-700">{selectedCountry.dialling_code}</span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError("");
                    }}
                    onBlur={validatePhone}
                    placeholder={t("enter_phone")}
                    maxLength={10}
                    className={`w-full px-4 py-3 border rounded-lg transition focus:outline-none focus:ring-2 ${
                      phoneError
                        ? "border-red-500 focus:ring-red-500 bg-red-50"
                        : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                    }`}
                  />
                </div>
              </div>
              {phoneError && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  <span>{phoneError}</span>
                </div>
              )}
            </div>

            {/* PIN Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t("pin")}
              </label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    if (loginError) setLoginError("");
                  }}
                  placeholder={t("enter_pin")}
                  maxLength={6}
                  className={`w-full px-4 py-3 border rounded-lg transition focus:outline-none focus:ring-2 ${
                    loginError
                      ? "border-red-500 focus:ring-red-500 bg-red-50"
                      : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {loginError && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  <span>{loginError}</span>
                </div>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {t("forgot_password")}
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <LogIn size={20} />
                  {t("sign_in")}
                </>
              )}
            </button>

            {/* Register Link */}
            <p className="text-center text-sm text-gray-600">
              {t("dont_have_account")}{" "}
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                {t("sign_up")}
              </button>
            </p>
          </form>
        </div>
      </div>

      {/* Country Modal */}
      {showCountryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="w-full max-w-md bg-white rounded-t-2xl p-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">{t("select_country")}</h2>
              <button
                onClick={() => setShowCountryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <input
              type="text"
              placeholder={t("search_country")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="space-y-2">
              {filteredCountries.map((country) => (
                <button
                  key={country.id}
                  onClick={() => {
                    setSelectedCountry(country);
                    setShowCountryModal(false);
                    setSearchQuery("");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition text-left"
                >
                  <span className="text-2xl">{country.flag}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{country.name}</p>
                    <p className="text-sm text-gray-600">{country.dialling_code}</p>
                  </div>
                  {selectedCountry.code === country.code && (
                    <Check size={20} className="text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{t("reset_password")}</h2>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("phone_number")}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCountryModal(true)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400"
                  >
                    <span>{selectedCountry.flag}</span>
                    <span className="text-sm text-gray-700">{selectedCountry.dialling_code}</span>
                  </button>
                  <input
                    type="tel"
                    value={forgotPhone}
                    onChange={(e) => {
                      setForgotPhone(e.target.value);
                      if (forgotPhoneError) setForgotPhoneError("");
                    }}
                    onBlur={validateForgotPhone}
                    placeholder={t("enter_phone")}
                    maxLength={10}
                    className={`flex-1 px-3 py-2 border rounded-lg transition focus:outline-none focus:ring-2 ${
                      forgotPhoneError
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  />
                </div>
                {forgotPhoneError && (
                  <p className="text-red-600 text-sm mt-1">{forgotPhoneError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("email")}
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    if (forgotEmailError) setForgotEmailError("");
                  }}
                  onBlur={validateForgotEmail}
                  placeholder={t("enter_email")}
                  className={`w-full px-3 py-2 border rounded-lg transition focus:outline-none focus:ring-2 ${
                    forgotEmailError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {forgotEmailError && (
                  <p className="text-red-600 text-sm mt-1">{forgotEmailError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {forgotLoading ? `${t("sending")}...` : t("send_reset_link")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
