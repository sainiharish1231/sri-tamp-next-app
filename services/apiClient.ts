import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/store/auth.store";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  "";

const API_URL = BASE_URL
  ? `${BASE_URL.replace(/\/$/, "")}/api/sanraj-metal-arts`
  : "/api/sanraj-metal-arts";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { Accept: "application/json" },
});

apiClient.interceptors.request.use(
  async (config) => {
    if (config.url?.includes("/auth/login")) return config;

    const { session } = useAuthStore.getState();
    if (session?.token) {
      config.headers.Authorization = `Bearer ${session.token}`;
    }

    const isFormData =
      config.data &&
      typeof config.data === "object" &&
      typeof (config.data as any).append === "function";

    if (isFormData) {
      delete config.headers["Content-Type"];
    } else {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  async (response) => {
    const { setSession } = useAuthStore.getState();
    const currentSession = useAuthStore.getState().session;
    const newToken = response.data?.data?.token || response.data?.token;

    if (newToken && currentSession) {
      await setSession({ ...currentSession, token: newToken });
    }
    return response.data;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // const { clearSession } = useAuthStore.getState();
      // await clearSession();
    }
    return Promise.reject(error.response?.data || { message: error.message });
  },
);

export default apiClient;
