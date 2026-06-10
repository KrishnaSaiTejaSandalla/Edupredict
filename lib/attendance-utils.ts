export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type AttendanceRatio = {
  present: number;
  total: number;
};

export function calculateAttendancePercentage({ present, total }: AttendanceRatio) {
  if (!total) return 0;
  return Math.round((present / total) * 100);
}

export function normalizeAttendanceStatus(status: string): AttendanceStatus {
  if (status === "present" || status === "late" || status === "excused") {
    return status;
  }

  return "absent";
}

export function formatDateKey(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

export function formatMonthKey(value: string | Date | null | undefined) {
  if (!value) return "";
  const monthString = typeof value === "string" ? `${value}-01` : value;
  const date = new Date(monthString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return monthFormatter.format(date);
} 

export function getMonthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 0);

  return { start, end };
}
