import apiClient from "@/services/apiClient";
import { AxiosRequestConfig } from "axios";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

class ApiService {
  protected baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  private normalizeResponse<T = any>(response: any): ApiResponse<T> {
    const payload =
      response &&
      typeof response === "object" &&
      "data" in response &&
      !("success" in response) &&
      ("status" in response || "headers" in response)
        ? response.data
        : response;

    if (payload && typeof payload === "object" && "success" in payload) {
      return {
        success: payload.success !== false,
        data: payload.data as T,
        message: payload.message,
      };
    }

    return { success: true, data: payload as T };
  }

  private getUrl(path?: string): string {
    if (!path) return this.baseUrl;
    return `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  }

  async getData<T = any>(
    path?: string,
    options?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await apiClient.get<T>(this.getUrl(path), options);
    return this.normalizeResponse<T>(response);
  }

  async postData<T = any>(
    path: string,
    data: any,
    options?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await apiClient.post<T>(this.getUrl(path), data, options);
    return this.normalizeResponse<T>(response);
  }

  async putData<T = any>(
    path: string,
    data: any,
    options?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await apiClient.put<T>(this.getUrl(path), data, options);
    return this.normalizeResponse<T>(response);
  }

  async patchData<T = any>(
    path: string,
    data: any,
    options?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await apiClient.patch<T>(this.getUrl(path), data, options);
    return this.normalizeResponse<T>(response);
  }

  async deleteData<T = any>(
    path: string,
    options?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await apiClient.delete<T>(this.getUrl(path), options);
    return this.normalizeResponse<T>(response);
  }
}

export default ApiService;
export type { ApiResponse };
