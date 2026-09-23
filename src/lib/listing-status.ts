export const LISTING_STATUSES = [
  "available",
  "sold",
  "pending inspection",
  "rejected",
] as const;

export type ListingStatus = (typeof LISTING_STATUSES)[number];

const STATUS_CLASS_NAMES: Record<string, string> = {
  available: "bg-status-available text-status-available-foreground",
  active: "bg-status-available text-status-available-foreground",
  published: "bg-status-available text-status-available-foreground",
  ready: "bg-status-available text-status-available-foreground",
  "pending inspection": "bg-status-pending text-status-pending-foreground",
  pending: "bg-status-pending text-status-pending-foreground",
  reserved: "bg-status-pending text-status-pending-foreground",
  "on hold": "bg-status-pending text-status-pending-foreground",
  sold: "bg-status-sold text-status-sold-foreground",
  "sold out": "bg-status-sold text-status-sold-foreground",
  rejected: "bg-status-rejected text-status-rejected-foreground",
  declined: "bg-status-rejected text-status-rejected-foreground",
};

export function listingStatusClassName(
  status: string | null | undefined,
): string {
  const key = status?.trim().toLowerCase() ?? "";
  return STATUS_CLASS_NAMES[key] ?? "bg-secondary text-secondary-foreground";
}