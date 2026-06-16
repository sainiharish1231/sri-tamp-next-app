"use client";


import {
  CalendarDays,
  ChevronRight,
  IndianRupee,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import EmployeeForm, { EmployeeFormData } from "@/components/EmployeeForm";
import EmployeeService from "@/services/EmployeeService";
import type { Employee } from "@/types/employee.types";
import { formatDateValue } from "@/utils/date";
import { extractArrayPayload, extractCountPayload } from "@/utils/response";
import { sortRecordsNewestFirst } from "@/utils/recordSorting";

type EmployeeTab = "active" | "inactive" | "all";

const EMPLOYEE_DATE_KEYS = ["createdAt", "updatedAt", "joiningDate"] as const;

const formatCurrency = (value?: number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number(value || 0) % 1 === 0 ? 0 : 2,
  })}`;

const getInitials = (name?: string) => {
  const parts = String(name || "E")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0));

  return (parts.join("") || "E").toUpperCase();
};

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<EmployeeTab>("active");
  const [addModalOpen, setAddModalOpen] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, totalRes, activeRes, inactiveRes] = await Promise.all([
        EmployeeService.fetchAllEmployees({ limit: 100, isActive: "all" }),
        EmployeeService.fetchAllEmployeesCount({ isActive: "all" }),
        EmployeeService.fetchAllEmployeesCount({ isActive: true }),
        EmployeeService.fetchAllEmployeesCount({ isActive: false }),
      ]);

      const data = sortRecordsNewestFirst(
        extractArrayPayload<Employee>(listRes, ["employees"]),
        EMPLOYEE_DATE_KEYS,
      );
      setEmployees(data);
      setCounts({
        total: extractCountPayload(totalRes) || data.length,
        active: extractCountPayload(activeRes) || data.filter((employee) => employee.isActive).length,
        inactive:
          extractCountPayload(inactiveRes) || data.filter((employee) => !employee.isActive).length,
      });
    } catch (error) {
      console.log("[Employees] Error:", error);
      setEmployees([]);
      setCounts({ total: 0, active: 0, inactive: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  }, [fetchEmployees]);

  const tabEmployees = useMemo(() => {
    if (activeTab === "all") return employees;
    const active = activeTab === "active";
    return employees.filter((employee) => Boolean(employee.isActive) === active);
  }, [activeTab, employees]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tabEmployees;

    return tabEmployees.filter((employee) =>
      [
        employee.name,
        employee.phone,
        employee.email,
        employee.address,
        employee.countryCode,
        employee.diallingCode,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [search, tabEmployees]);

  const monthlySalary = useMemo(
    () =>
      employees
        .filter((employee) => employee.isActive)
        .reduce((sum, employee) => sum + Number(employee.dailySalary || 0) * 30, 0),
    [employees],
  );

  const tabs: { key: EmployeeTab; label: string; count: number }[] = [
    { key: "active", label: "Active", count: counts.active },
    { key: "inactive", label: "Inactive", count: counts.inactive },
    { key: "all", label: "All", count: counts.total || employees.length },
  ];

  const handleSubmitEmployee = async (data: EmployeeFormData) => {
    try {
      setAdding(true);
      const { isActive, ...payload } = data;
      const res = await EmployeeService.createEmployee(payload);
      if (res.success) {
        setAddModalOpen(false);
        await fetchEmployees();
        return;
      }
      window.alert(res.message || "Failed to add employee");
    } catch (error: any) {
      window.alert(String(error?.message || "Failed to add employee"));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="employee-page">
      <section className="employee-hero employee-hero-management">
        <div>
          <p className="employee-kicker">Employee Management</p>
          <h2>Employees</h2>
          <p>Attendance, salary and staff accounts in one place.</p>
        </div>
        <div className="employee-hero-actions">
          <button
            className="employee-refresh-button"
            type="button"
            onClick={onRefresh}
            disabled={refreshing || loading}
            aria-label="Refresh employees"
          >
            <RefreshCw size={18} className={refreshing ? "employee-spin" : ""} />
          </button>
          <button
            className="employee-hero-add-button"
            type="button"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus size={18} />
            <span>Add</span>
          </button>
        </div>
      </section>

      <section className="employee-stat-row employee-stat-row-four">
        <div className="employee-stat-card">
          <span>Total Employees</span>
          <strong>{counts.total || employees.length}</strong>
        </div>
        <div className="employee-stat-card">
          <span>Active</span>
          <strong>{counts.active}</strong>
        </div>
        <div className="employee-stat-card">
          <span>Inactive</span>
          <strong>{counts.inactive}</strong>
        </div>
        <div className="employee-stat-card salary">
          <span>Monthly Run</span>
          <strong>{formatCurrency(monthlySalary)}</strong>
        </div>
      </section>

      <section className="employee-toolbar">
        <div className="employee-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee..."
          />
          {search ? (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              <X size={16} />
            </button>
          ) : null}
        </div>

        <div className="employee-tab-row">
          {tabs.map((tab) => (
            <button
              className={`employee-tab-pill ${activeTab === tab.key ? "is-active" : ""}`}
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.label}</span>
              <b>{tab.count}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="employee-list employee-list-grid">
        {loading && !refreshing ? (
          <EmployeeSkeleton />
        ) : filteredEmployees.length ? (
          filteredEmployees.map((employee) => (
            <button
              className="employee-card employee-card-rich"
              key={employee.id}
              type="button"
              onClick={() => router.push(`/employees/${employee.id}`)}
            >
              <span className="employee-card-top">
                <span className="employee-avatar">{getInitials(employee.name)}</span>
                <span className="employee-card-body">
                  <span className="employee-card-title">{employee.name}</span>
                  <span className="employee-card-subtitle">{employee.email}</span>
                </span>
                <span className={`employee-status-badge ${employee.isActive ? "active" : "inactive"}`}>
                  {employee.isActive ? "Active" : "Inactive"}
                </span>
              </span>

              <span className="employee-card-meta">
                <span>
                  <Phone size={14} />
                  {employee.diallingCode} {employee.phone}
                </span>
                <span>
                  <Mail size={14} />
                  {employee.email}
                </span>
              </span>

              <span className="employee-card-info-grid">
                <span className="employee-info-chip">
                  <CalendarDays size={15} />
                  <span>
                    <small>Joined</small>
                    <b>{formatDateValue(employee.joiningDate)}</b>
                  </span>
                </span>
                <span className="employee-info-chip salary">
                  <IndianRupee size={15} />
                  <span>
                    <small>Daily Salary</small>
                    <b>{formatCurrency(employee.dailySalary)}</b>
                  </span>
                </span>
              </span>

              <span className="employee-card-footer">
                <span>Open profile</span>
                <ChevronRight size={18} />
              </span>
            </button>
          ))
        ) : (
          <div className="employee-empty">
            <Users size={42} />
            <h3>{search ? "No employees found" : "No employees yet"}</h3>
            <p>
              {search
                ? "Try another name, phone or email."
                : "Add staff accounts to start tracking attendance and salary."}
            </p>
          </div>
        )}
      </section>

      <button
        className="employee-fab"
        type="button"
        onClick={() => setAddModalOpen(true)}
        aria-label="Add employee"
      >
        <Plus size={24} />
      </button>

      {addModalOpen ? (
        <div
          className="employee-modal-backdrop"
          role="presentation"
          onMouseDown={() => !adding && setAddModalOpen(false)}
        >
          <div
            className="employee-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="employee-modal-handle" />
            <div className="employee-modal-head">
              <span className="employee-modal-icon">
                <UserPlus size={24} />
              </span>
              <h3>Add New Employee</h3>
              <p>Enter staff details, contact and daily salary.</p>
            </div>
            <EmployeeForm
              onSubmit={handleSubmitEmployee}
              isLoading={adding}
              submitButtonText="Add Employee"
              onCancel={() => setAddModalOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmployeeSkeleton() {
  return (
    <div className="employee-skeleton-list employee-skeleton-grid">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="employee-skeleton-card" key={index}>
          <span />
          <div>
            <i />
            <b />
          </div>
        </div>
      ))}
    </div>
  );
}
