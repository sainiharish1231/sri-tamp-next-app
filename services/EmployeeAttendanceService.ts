import ApiService from "./ApiService";
import {
  BulkEmployeeAttendanceDto,
  ClearEmployeeAttendancesParams,
  EmployeeAttendanceBulkPayload,
  EmployeeAttendanceClearPayload,
  EmployeeAttendanceListPayload,
  EmployeeAttendanceQueryParams,
} from "@/types/employee-attendance.types";

class EmployeeAttendanceService extends ApiService {
  constructor() {
    super("/employee-attendances");
  }

  fetchAttendances(params?: EmployeeAttendanceQueryParams, options?: any) {
    return this.getData<EmployeeAttendanceListPayload>("/", {
      ...options,
      params: { ...(options?.params || {}), ...(params || {}) },
    });
  }

  saveAttendances(data: BulkEmployeeAttendanceDto, options?: any) {
    return this.postData<EmployeeAttendanceBulkPayload>("/", data, options);
  }

  clearAttendances(params?: ClearEmployeeAttendancesParams, options?: any) {
    return this.deleteData<EmployeeAttendanceClearPayload>("/", {
      ...options,
      params: { ...(options?.params || {}), ...(params || {}) },
    });
  }
}

export default new EmployeeAttendanceService();
