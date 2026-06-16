"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  IndianRupee,
  Mail,
  PencilLine,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import EmployeeAttendanceService from "@/services/EmployeeAttendanceService";
import EmployeeService from "@/services/EmployeeService";
import EmployeeTransactionService from "@/services/EmployeeTransactionService";
import type { EmployeeAttendance } from "@/types/employee-attendance.types";
import type {
  EmployeeTransaction,
  EmployeeTransactionType,
} from "@/types/employee-transaction.types";
import type { Employee, EmployeeSalary } from "@/types/employee.types";
import { formatDateValue } from "@/utils/date";
import { extractArrayPayload, extractEntityPayload } from "@/utils/response";
import { sortRecordsNewestFirst } from "@/utils/recordSorting";

type DetailTab = "salary" | "expense" | "attendance";

const todayInput = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

const formatCurrency = (value?: number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number(value || 0) % 1 === 0 ? 0 : 2,
  })}`;

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const inputClass =
  "h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60";

const panelClass =
  "rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 sm:p-6";

const transactionLabels: Record<EmployeeTransactionType, string> = {
  advance: "Advance",
  bonus: "Bonus",
  salary_paid: "Salary Paid",
};

const transactionToneClasses: Record<string, string> = {
  advance: "border-rose-100 bg-rose-50 text-rose-600",
  bonus: "border-emerald-100 bg-emerald-50 text-emerald-600",
  salary_paid: "border-sky-100 bg-sky-50 text-sky-600",
};

const metricToneClasses: Record<string, string> = {
  neutral: "border-slate-100 bg-slate-50 text-slate-900",
  green: "border-emerald-100 bg-emerald-50 text-emerald-700",
  red: "border-rose-100 bg-rose-50 text-rose-700",
  blue: "border-sky-100 bg-sky-50 text-sky-700",
  orange: "border-amber-100 bg-amber-50 text-amber-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
};

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [salary, setSalary] = useState<EmployeeSalary | null>(null);
  const [attendances, setAttendances] = useState<EmployeeAttendance[]>([]);
  const [transactions, setTransactions] = useState<EmployeeTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>("salary");
  const [loading, setLoading] = useState(true);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(todayInput());
  const [transactionDate, setTransactionDate] = useState(todayInput());
  const [transactionType, setTransactionType] = useState<EmployeeTransactionType>("advance");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const rangeParams = {
        startDate: startDate || null,
        endDate: endDate || null,
      };
      const [employeeRes, salaryRes, attendanceRes, transactionRes] = await Promise.all([
        EmployeeService.fetchEmployeeById(id),
        EmployeeService.fetchEmployeeSalary(id, rangeParams),
        EmployeeAttendanceService.fetchAttendances({
          employee_id: id,
          limit: 100,
          ...rangeParams,
        }),
        EmployeeTransactionService.fetchTransactions({
          employee_id: id,
          limit: 100,
          ...rangeParams,
        }),
      ]);

      if (employeeRes.success) setEmployee(extractEntityPayload<Employee>(employeeRes));
      if (salaryRes.success) setSalary(extractEntityPayload<EmployeeSalary>(salaryRes));
      setAttendances(
        sortRecordsNewestFirst(
          extractArrayPayload<EmployeeAttendance>(attendanceRes, ["attendances"]),
          ["date", "createdAt"],
        ),
      );
      setTransactions(
        sortRecordsNewestFirst(
          extractArrayPayload<EmployeeTransaction>(transactionRes, ["transactions"]),
          ["date", "createdAt"],
        ),
      );
    } catch (error) {
      console.log("[EmployeeDetail] Error:", error);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, [endDate, id, startDate]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const currentAttendance = useMemo(
    () => attendances.find((attendance) => attendance.employee_id === id && attendance.date === attendanceDate),
    [attendanceDate, attendances, id],
  );

  const markAttendance = async (present: boolean) => {
    if (!id) return;
    try {
      setSavingAttendance(true);
      const res = await EmployeeAttendanceService.saveAttendances({
        attendances: [
          {
            id: currentAttendance?.id,
            employee_id: id,
            date: attendanceDate,
            present,
          },
        ],
      });
      if (!res.success) {
        window.alert(res.message || "Failed to save attendance");
        return;
      }
      await fetchDetails();
    } catch (error: any) {
      window.alert(String(error?.message || "Failed to save attendance"));
    } finally {
      setSavingAttendance(false);
    }
  };

  const saveTransaction = async () => {
    const amount = Number(transactionAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("Amount must be greater than 0");
      return;
    }
    try {
      setSavingTransaction(true);
      const res = await EmployeeTransactionService.saveTransactions({
        transactions: [
          {
            employee_id: id,
            type: transactionType,
            amount,
            date: transactionDate,
            description: transactionDescription.trim(),
          },
        ],
      });
      if (!res.success) {
        window.alert(res.message || "Failed to save entry");
        return;
      }
      setTransactionAmount("");
      setTransactionDescription("");
      await fetchDetails();
    } catch (error: any) {
      window.alert(String(error?.message || "Failed to save entry"));
    } finally {
      setSavingTransaction(false);
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      setDeletingTransactionId(transactionId);
      const res = await EmployeeTransactionService.deleteTransaction(transactionId);
      if (!res.success) {
        window.alert(res.message || "Failed to delete entry");
        return;
      }
      await fetchDetails();
    } catch (error: any) {
      window.alert(String(error?.message || "Failed to delete entry"));
    } finally {
      setDeletingTransactionId("");
    }
  };

  const deleteEmployee = async () => {
    if (!id || !employee || !window.confirm(`Delete ${employee.name}?`)) return;
    try {
      setDeleting(true);
      const res = await EmployeeService.deleteEmployee(id);
      if (res.success) {
        router.push("/employees");
        return;
      }
      window.alert(res.message || "Failed to delete employee");
    } catch (error: any) {
      window.alert(String(error?.message || "Failed to delete employee"));
    } finally {
      setDeleting(false);
    }
  };

  const clearDateRange = () => {
    setStartDate("");
    setEndDate("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="animate-spin text-teal-600" size={28} />
          <p className="text-sm font-semibold">Loading employee...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 text-center">
        <div className="flex max-w-sm flex-col items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle size={30} />
          </span>
          <div>
            <h2 className="text-xl font-bold text-slate-950">Employee not found</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">The selected employee record is unavailable.</p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-teal-700 px-5 text-sm font-bold text-white transition hover:bg-teal-800"
            type="button"
            onClick={() => router.push("/employees")}
          >
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  const totalSalary = salary?.totalSalary || 0;
  const remainingSalary = salary?.remaining || 0;
  const hasDateFilter = Boolean(startDate || endDate);

  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
        <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-amber-700 p-5 text-white sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <button
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-white transition hover:bg-white/25"
                  onClick={() => router.back()}
                  type="button"
                  aria-label="Go back"
                >
                  <ArrowLeft size={21} />
                </button>
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl border border-white/20 bg-white/15 text-2xl font-bold">
                  {employee.name.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-bold">
                  <UserRound size={14} />
                  Employee profile
                </div>
                <h2 className="truncate text-3xl font-bold leading-tight text-white sm:text-4xl">
                  {employee.name}
                </h2>
                <p className="mt-2 text-base font-semibold text-teal-50">
                  {formatCurrency(employee.dailySalary)}/day · {salary?.totalDays ?? 0} days
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold text-white">
                    <Phone size={14} />
                    <span className="truncate">{employee.diallingCode} {employee.phone}</span>
                  </span>
                  <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold text-white">
                    <Mail size={14} />
                    <span className="truncate">{employee.email}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/16 px-5 text-sm font-bold text-white transition hover:bg-white/25"
                type="button"
                onClick={() => router.push(`/employees/edit/${id}`)}
              >
                <PencilLine size={18} />
                Edit
              </button>
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-50 px-5 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={deleteEmployee}
                disabled={deleting}
              >
                <Trash2 size={18} />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniMetric label="Present" value={salary?.presentDays ?? 0} tone="green" />
          <MiniMetric label="Absent" value={salary?.absentDays ?? 0} tone="red" />
          <MiniMetric label="Total Salary" value={formatCurrency(totalSalary)} tone="amber" />
          <MiniMetric label="Remaining" value={formatCurrency(remainingSalary)} tone={remainingSalary > 0 ? "orange" : "neutral"} />
        </div>
      </section>

      <section className={panelClass}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Date Range</p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">
              {hasDateFilter ? "Filtered records" : "All records"}
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Filter salary, expense and attendance by selected dates.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_180px_auto] sm:items-end">
            <DateField label="Start" value={startDate} onChange={setStartDate} />
            <DateField label="End" value={endDate} onChange={setEndDate} />
            {hasDateFilter ? (
              <button
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-teal-200 hover:text-teal-700"
                type="button"
                onClick={clearDateRange}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-2 rounded-3xl border border-slate-100 bg-white p-2 shadow-sm shadow-slate-200/60 sm:grid-cols-3">
        {[
          { key: "salary" as const, label: "Salary", icon: Wallet },
          { key: "expense" as const, label: "Expense", icon: CreditCard },
          { key: "attendance" as const, label: "Attendance", icon: CalendarDays },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              className={cn(
                "inline-flex h-14 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition",
                isActive
                  ? "bg-teal-700 text-white shadow-lg shadow-teal-100"
                  : "bg-white text-slate-500 hover:bg-slate-50 hover:text-teal-700",
              )}
              type="button"
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </section>

      {activeTab === "salary" ? <SalaryPanel salary={salary} hasDateFilter={hasDateFilter} /> : null}

      {activeTab === "expense" ? (
        <ExpensePanel
          transactionType={transactionType}
          transactionDate={transactionDate}
          transactionAmount={transactionAmount}
          transactionDescription={transactionDescription}
          transactions={transactions}
          savingTransaction={savingTransaction}
          deletingTransactionId={deletingTransactionId}
          onTypeChange={setTransactionType}
          onDateChange={setTransactionDate}
          onAmountChange={setTransactionAmount}
          onDescriptionChange={setTransactionDescription}
          onSave={saveTransaction}
          onDelete={deleteTransaction}
        />
      ) : null}

      {activeTab === "attendance" ? (
        <AttendancePanel
          attendanceDate={attendanceDate}
          attendances={attendances}
          currentAttendance={currentAttendance}
          savingAttendance={savingAttendance}
          onDateChange={setAttendanceDate}
          onMark={markAttendance}
        />
      ) : null}
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: keyof typeof metricToneClasses;
}) {
  return (
    <div className={cn("rounded-2xl border p-4", metricToneClasses[tone])}>
      <p className="text-xs font-bold uppercase opacity-75">{label}</p>
      <strong className="mt-2 block truncate text-xl font-bold">{value}</strong>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        className={inputClass}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SalaryPanel({
  salary,
  hasDateFilter,
}: {
  salary: EmployeeSalary | null;
  hasDateFilter: boolean;
}) {
  const safe = salary || {
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    perDaySalary: 0,
    totalSalary: 0,
    advance: 0,
    bonus: 0,
    netSalary: 0,
    paid: 0,
    remaining: 0,
    overpaid: 0,
  };
  const cards = [
    { label: "Per Day Salary", value: formatCurrency(safe.perDaySalary), tone: "green" },
    { label: "Total Days", value: safe.totalDays, tone: "neutral" },
    { label: "Present Days", value: safe.presentDays, tone: "green" },
    { label: "Absent Days", value: safe.absentDays, tone: "red" },
    { label: "Net Salary", value: formatCurrency(safe.netSalary), tone: "green" },
    { label: "Bonus", value: formatCurrency(safe.bonus), tone: "green" },
    { label: "Advance", value: formatCurrency(safe.advance), tone: "orange" },
    { label: "Paid", value: formatCurrency(safe.paid), tone: "blue" },
    { label: "Remaining", value: formatCurrency(safe.remaining), tone: safe.remaining > 0 ? "orange" : "neutral" },
    { label: "Overpaid", value: formatCurrency(safe.overpaid), tone: safe.overpaid > 0 ? "red" : "neutral" },
  ] as const;

  return (
    <section className={panelClass}>
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Salary Summary</p>
          <h3 className="mt-1 text-3xl font-bold text-slate-950">{formatCurrency(safe.totalSalary)}</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">Calculated from attendance and employee transactions.</p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-700">
          {hasDateFilter ? "Filtered" : "All Time"}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <MiniMetric
            key={card.label}
            label={card.label}
            value={card.value}
            tone={card.tone as keyof typeof metricToneClasses}
          />
        ))}
      </div>
    </section>
  );
}

function ExpensePanel({
  transactionType,
  transactionDate,
  transactionAmount,
  transactionDescription,
  transactions,
  savingTransaction,
  deletingTransactionId,
  onTypeChange,
  onDateChange,
  onAmountChange,
  onDescriptionChange,
  onSave,
  onDelete,
}: {
  transactionType: EmployeeTransactionType;
  transactionDate: string;
  transactionAmount: string;
  transactionDescription: string;
  transactions: EmployeeTransaction[];
  savingTransaction: boolean;
  deletingTransactionId: string;
  onTypeChange: (value: EmployeeTransactionType) => void;
  onDateChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className={panelClass}>
      <div className="mb-5">
        <p className="text-xs font-bold uppercase text-slate-500">Expense Entry</p>
        <h3 className="mt-1 text-2xl font-bold text-slate-950">Add Entry</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">Advance, bonus or salary payment</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">Type</span>
          <select
            className={inputClass}
            value={transactionType}
            onChange={(event) => onTypeChange(event.target.value as EmployeeTransactionType)}
          >
            <option value="advance">Advance</option>
            <option value="bonus">Bonus</option>
            <option value="salary_paid">Salary Paid</option>
          </select>
        </label>
        <DateField label="Date" value={transactionDate} onChange={onDateChange} />
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">Amount</span>
          <input
            className={inputClass}
            value={transactionAmount}
            onChange={(event) => onAmountChange(event.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            placeholder="0"
          />
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-bold text-slate-700">Description</span>
          <input
            className={inputClass}
            value={transactionDescription}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Description optional"
          />
        </label>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 text-sm font-bold text-white shadow-lg shadow-teal-100 transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 lg:max-w-sm"
          type="button"
          onClick={onSave}
          disabled={savingTransaction}
        >
          <Plus size={18} />
          {savingTransaction ? "Saving..." : "Add Entry"}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {transactions.length ? (
          transactions.map((transaction) => (
            <div
              className="grid grid-cols-[48px_minmax(0,1fr)_auto_44px] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
              key={transaction.id}
            >
              <span className={cn("grid h-12 w-12 place-items-center rounded-2xl border", transactionToneClasses[transaction.type])}>
                <IndianRupee size={20} />
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-base font-bold text-slate-950">
                  {transactionLabels[transaction.type] || transaction.type}
                </strong>
                <small className="block truncate text-sm font-semibold text-slate-500">
                  {formatDateValue(transaction.date)}
                  {transaction.description ? ` · ${transaction.description}` : ""}
                </small>
              </div>
              <b className="text-base font-bold text-slate-950">{formatCurrency(transaction.amount)}</b>
              <button
                className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() => onDelete(transaction.id)}
                disabled={deletingTransactionId === transaction.id}
                aria-label="Delete entry"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        ) : (
          <EmptyPanel icon={CreditCard} title="No expense records" copy="Add an entry using the form above." />
        )}
      </div>
    </section>
  );
}

function AttendancePanel({
  attendanceDate,
  attendances,
  currentAttendance,
  savingAttendance,
  onDateChange,
  onMark,
}: {
  attendanceDate: string;
  attendances: EmployeeAttendance[];
  currentAttendance?: EmployeeAttendance;
  savingAttendance: boolean;
  onDateChange: (value: string) => void;
  onMark: (present: boolean) => void;
}) {
  return (
    <section className={panelClass}>
      <div className="mb-5">
        <p className="text-xs font-bold uppercase text-slate-500">Attendance</p>
        <h3 className="mt-1 text-2xl font-bold text-slate-950">Mark Attendance</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          {currentAttendance ? "Update current selected date" : "Select date and status"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[220px_auto_auto] sm:items-end">
        <DateField label="Date" value={attendanceDate} onChange={onDateChange} />
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => onMark(true)}
          disabled={savingAttendance}
        >
          <CheckCircle2 size={19} />
          Present
        </button>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-50 px-5 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => onMark(false)}
          disabled={savingAttendance}
        >
          <XCircle size={19} />
          Absent
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {attendances.length ? (
          attendances.map((attendance) => (
            <div
              className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
              key={attendance.id}
            >
              <span
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-2xl border",
                  attendance.present
                    ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                    : "border-rose-100 bg-rose-50 text-rose-600",
                )}
              >
                {attendance.present ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-base font-bold text-slate-950">
                  {formatDateValue(attendance.date)}
                </strong>
                <small className="block text-sm font-semibold text-slate-500">
                  {attendance.present ? "Present" : "Absent"}
                </small>
              </div>
            </div>
          ))
        ) : (
          <EmptyPanel icon={CalendarDays} title="No attendance records" copy="Mark attendance using the controls above." />
        )}
      </div>
    </section>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  copy,
}: {
  icon: typeof CalendarDays;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-teal-100 bg-teal-50/50 p-6 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-teal-700 shadow-sm">
        <Icon size={28} />
      </span>
      <h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm font-medium text-slate-500">{copy}</p>
    </div>
  );
}
