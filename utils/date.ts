import { format } from "date-fns";

export const parseDateValue = (value?: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();

  const seconds = value?._seconds ?? value?.seconds;
  if (typeof seconds === "number" && Number.isFinite(seconds)) {
    const nanoseconds = Number(value?._nanoseconds ?? value?.nanoseconds ?? 0);
    return new Date(seconds * 1000 + nanoseconds / 1000000);
  }

  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }

  return null;
};

export const formatDateValue = (
  value?: any,
  pattern = "dd MMM yyyy",
  fallback = "—",
) => {
  const date = parseDateValue(value);
  if (!date || Number.isNaN(date.getTime())) return fallback;
  return format(date, pattern);
};
