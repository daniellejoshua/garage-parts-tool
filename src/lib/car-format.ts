const numberFormatter = new Intl.NumberFormat("en-US");

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatPrice(value: number): string {
  return numberFormatter.format(value);
}

export function formatWhole(value: number): string {
  return numberFormatter.format(value);
}

export function formatDateTime(value: Date | null | undefined): string {
  if (!value) return "—";
  return dateTimeFormatter.format(value);
}

export function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}