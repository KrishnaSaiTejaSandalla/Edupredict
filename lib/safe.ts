export const safeString = (v: unknown) =>
  typeof v === "string" ? v : "";

export const safeName = (v: unknown) =>
  typeof v === "string" && v.trim() ? v : "Unknown";