"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, PencilLine } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import EmployeeForm, { EmployeeFormData } from "@/components/EmployeeForm";
import EmployeeService from "@/services/EmployeeService";
import type { Employee } from "@/types/employee.types";
import { extractEntityPayload } from "@/utils/response";

export default function EditEmployeePage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchEmployee = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await EmployeeService.fetchEmployeeById(id);
      if (res.success) {
        setEmployee(extractEntityPayload<Employee>(res));
      } else {
        window.alert(res.message || "Failed to load employee");
      }
    } catch (error: any) {
      window.alert(String(error?.message || "Failed to load employee"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  const handleSubmit = async (data: EmployeeFormData) => {
    if (!id) return;
    try {
      setUpdating(true);
      const res = await EmployeeService.updateEmployee(id, data);
      if (res.success) {
        router.push(`/employees/${id}`);
        return;
      }
      window.alert(res.message || "Failed to update employee");
    } catch (error: any) {
      window.alert(String(error?.message || "Failed to update employee"));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="employee-page employee-form-page">
      <div className="employee-hero compact">
        <button className="employee-ghost-button" onClick={() => router.back()} type="button">
          <ArrowLeft size={20} />
        </button>
        <div className="employee-hero-title">
          <span className="employee-hero-icon">
            <PencilLine size={22} />
          </span>
          <div>
            <h2>Edit Employee</h2>
            <p>Update profile, salary and active status</p>
          </div>
        </div>
      </div>

      <div className="employee-panel">
        {loading ? (
          <div className="employee-state">
            <span className="employee-spinner" />
            <p>Loading employee...</p>
          </div>
        ) : employee ? (
          <EmployeeForm
            initialData={employee}
            onSubmit={handleSubmit}
            isLoading={updating}
            isEditing
            submitButtonText="Update Employee"
            onCancel={() => router.back()}
          />
        ) : (
          <div className="employee-state">
            <AlertCircle size={42} />
            <p>Employee not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
