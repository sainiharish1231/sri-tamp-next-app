import ApiService from "./ApiService";
import {
  CreateEmployeeDto,
  Employee,
  EmployeeListPayload,
  EmployeeQueryParams,
  EmployeeSalary,
  EmployeeSalaryQueryParams,
  UpdateEmployeeDto,
} from "@/types/employee.types";

class EmployeeService extends ApiService {
  constructor() {
    super("/employees");
  }

  fetchAllEmployees(params?: EmployeeQueryParams, options?: any) {
    return this.getData<EmployeeListPayload>("/", {
      ...options,
      params: { ...(options?.params || {}), ...(params || {}) },
    });
  }

  fetchAllEmployeesCount(params?: Pick<EmployeeQueryParams, "search" | "isActive">, options?: any) {
    return this.getData<{ count: number }>("/count", {
      ...options,
      params: { ...(options?.params || {}), ...(params || {}) },
    });
  }

  fetchEmployeeById(id: string, options?: any) {
    return this.getData<Employee>(`/${id}`, options);
  }

  fetchEmployeeSalary(
    id: string,
    params?: EmployeeSalaryQueryParams,
    options?: any,
  ) {
    return this.getData<EmployeeSalary>(`/${id}/salary`, {
      ...options,
      params: { ...(options?.params || {}), ...(params || {}) },
    });
  }

  createEmployee(data: CreateEmployeeDto, options?: any) {
    return this.postData<Employee>("/", data, options);
  }

  updateEmployee(id: string, data: UpdateEmployeeDto, options?: any) {
    return this.putData<Employee>(`/${id}`, data, options);
  }

  deleteEmployee(id: string, options?: any) {
    return this.deleteData(`/${id}`, options);
  }
}

export default new EmployeeService();
