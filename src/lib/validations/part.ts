import { z } from "zod";
import { PART_CATEGORIES, PART_CONDITIONS } from "../part-values";

const toNull = (value: unknown): unknown => {
  if (
    value === "" ||
    value === null ||
    value === undefined ||
    (typeof value === "number" && Number.isNaN(value))
  ) {
    return null;
  }
  return value;
};

const requiredNumber = (options: {
  min: number;
  minMessage: string;
  int?: boolean;
  max?: number;
  maxMessage?: string;
}) => {
  let inner = z
    .coerce.number({ message: "Required" })
    .finite({ message: "Required" })
    .min(options.min, options.minMessage);
  if (options.int) inner = inner.int("Whole number required");
  if (options.max !== undefined) {
    inner = inner.max(options.max, options.maxMessage ?? "Value is too large");
  }
  return z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? NaN : value),
    inner,
  );
};

const optionalNumber = () =>
  z.preprocess(toNull, z.number().finite().nullable());

const optionalText = () =>
  z.preprocess((value) => {
    const normalized = toNull(value);
    if (typeof normalized === "string") {
      const trimmed = normalized.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return normalized;
  }, z.string().nullable());

export const partFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  category: z.enum(PART_CATEGORIES),
  brand: z.string().trim().min(1, "Part brand is required").max(100),
  partNumber: optionalText(),
  condition: z.enum(PART_CONDITIONS),
  quantity: requiredNumber({
    min: 1,
    minMessage: "Quantity must be at least 1",
    int: true,
  }),
  price: requiredNumber({
    min: 0.01,
    minMessage: "Price must be greater than zero",
    max: 1_000_000_000,
    maxMessage: "Price is too large",
  }),
  originalPrice: optionalNumber(),
  tag: optionalText(),
  freeShipping: z.boolean().default(false),
  city: optionalText(),
  location: optionalText(),
  status: z.string().trim().min(1, "Status is required").max(100),
  oemNumber: optionalText(),
  compatibleModelIds: z
    .array(z.bigint())
    .min(1, "Select at least one compatible vehicle model"),
});

export type PartFormSchema = typeof partFormSchema;
export type PartFormInput = z.input<typeof partFormSchema>;
export type PartFormData = z.output<typeof partFormSchema>;

export interface PartFormValues {
  title: string;
  category: (typeof PART_CATEGORIES)[number] | "";
  brand: string;
  partNumber: string | null;
  condition: (typeof PART_CONDITIONS)[number] | "";
  quantity: number | null;
  price: number | null;
  originalPrice: number | null;
  tag: string | null;
  freeShipping: boolean;
  city: string | null;
  location: string | null;
  status: string;
  oemNumber: string | null;
  compatibleModelIds: string[];
}

export function emptyPartFormValues(): PartFormValues {
  return {
    title: "",
    category: "",
    brand: "",
    partNumber: null,
    condition: "",
    quantity: 1,
    price: null,
    originalPrice: null,
    tag: null,
    freeShipping: false,
    city: null,
    location: null,
    status: "",
    oemNumber: null,
    compatibleModelIds: [],
  };
}