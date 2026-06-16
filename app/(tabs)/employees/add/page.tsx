"use client";

import { ArrowLeft, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import EmployeeForm, { EmployeeFormData } from "@/components/EmployeeForm";
import EmployeeService from "@/services/EmployeeService";

export default function AddEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: EmployeeFormData) => {
    try {
      setLoading(true);
      const { isActive, ...payload } = data;
      const res = await EmployeeService.createEmployee(payload);
      if (res.success) {
        router.push("/employees");
        return;
      }
      window.alert(res.message || "Failed to add employee");
    } catch (error: any) {
      window.alert(String(error?.message || "Failed to add employee"));
    } finally {
      setLoading(false);
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
            <UserPlus size={22} />
          </span>
          <div>
            <h2>Add Employee</h2>
            <p>Create staff account with salary details</p>
          </div>
        </div>
      </div>

      <div className="employee-panel">
        <EmployeeForm
          onSubmit={handleSubmit}
          isLoading={loading}
          submitButtonText="Add Employee"
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
