export const PART_CATEGORIES = [
  "engine",
  "transmission",
  "suspension",
  "brakes",
  "exhaust",
  "electrical",
  "tires_wheels",
  "wheels",
  "body_exterior",
  "interior",
  "fluids_lubricants",
  "accessories",
  "other",
] as const;

export const PART_CONDITIONS = ["new", "used", "refurbished"] as const;

export type PartCategory = (typeof PART_CATEGORIES)[number];
export type PartCondition = (typeof PART_CONDITIONS)[number];