"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Switch,
} from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  partFormSchema,
  type PartFormValues,
} from "@/lib/validations/part";
import {
  createPart,
  updatePart,
  type PartNavContext,
} from "@/lib/server/part-actions";
import type { MultiSelectOption } from "@/components/ui/multi-select";

function TextField({
  name,
  label,
  required = false,
  placeholder,
  readOnly = false,
  help,
}: {
  name: keyof PartFormValues;
  label: string;
  required?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  help?: string;
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
          </FormLabel>
          <FormControl>
            <Input
              placeholder={placeholder}
              readOnly={readOnly}
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          </FormControl>
          {help ? <FormDescription>{help}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function NumberField({
  name,
  label,
  required = false,
  min,
  max,
  step = "0.01",
  help,
}: {
  name: keyof PartFormValues;
  label: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  help?: string;
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="decimal"
              min={min}
              max={max}
              step={step}
              value={field.value ?? ""}
              onChange={(event) => {
                const raw = event.target.value;
                field.onChange(raw === "" ? null : Number(raw));
              }}
            />
          </FormControl>
          {help ? <FormDescription>{help}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SelectField({
  name,
  label,
  required = false,
  options: optionValues,
  placeholder,
  help,
}: {
  name: keyof PartFormValues;
  label: string;
  required?: boolean;
  options: string[];
  placeholder?: string;
  help?: string;
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
          </FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {optionValues.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {help ? <FormDescription>{help}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SwitchField({
  name,
  label,
  help,
}: {
  name: keyof PartFormValues;
  label: string;
  help?: string;
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center space-x-3">
          <FormControl>
            <Switch
              checked={field.value === true}
              onCheckedChange={field.onChange}
            />
          </FormControl>
          <div className="space-y-1">
            <FormLabel className="cursor-pointer">{label}</FormLabel>
            {help ? <FormDescription>{help}</FormDescription> : null}
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="max-w-5xl">
      <CardHeader className="border-b border-border bg-muted/20 pb-5">
        <CardTitle className="font-semibold">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

export function PartForm({
  mode,
  context,
  partId,
  defaults,
  cancelHref,
  allModels,
  navigatedModelId,
}: {
  mode: "create" | "edit";
  context: PartNavContext;
  partId?: string;
  defaults: PartFormValues;
  cancelHref: string;
  allModels: MultiSelectOption[];
  navigatedModelId: string;
}) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<PartFormValues>({
    resolver: zodResolver(partFormSchema) as unknown as Resolver<PartFormValues>,
    defaultValues: defaults,
  });

  async function onSubmit(values: PartFormValues) {
    setIsPending(true);
    const result =
      mode === "create"
        ? await createPart(context, values, BigInt(navigatedModelId))
        : await updatePart(context, partId as string, values);

    if (result && !result.ok) {
      setIsPending(false);
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex max-w-5xl flex-col gap-6"
        noValidate
      >
        <Section title="Listing essentials">
          <TextField name="title" label="Title" required placeholder="e.g. Front Brake Rotor Set" />
          <SelectField
            name="category"
            label="Category"
            required
            options={[
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
            ]}
            placeholder="Select category"
            help="The part category."
          />
          <TextField name="brand" label="Part brand" required placeholder="e.g. Brembo, Denso, OEM" help="The part manufacturer/brand, not the vehicle brand." />
          <TextField name="partNumber" label="Part number" placeholder="Manufacturer part number" />
          <SelectField
            name="condition"
            label="Condition"
            required
            options={["new", "used", "refurbished"]}
            placeholder="Select condition"
          />
          <NumberField name="quantity" label="Quantity" required min={1} step="1" help="Available stock quantity." />
          <TextField name="status" label="Status" required placeholder="e.g. available, sold, reserved" help="Free text; the approved status value set is still pending." />
          <TextField name="tag" label="Tag" placeholder="e.g. as-is, negotiable, limited" />
        </Section>

        <Section title="Compatibility">
          <FormField
            name="compatibleModelIds"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>
                  Compatible vehicle models
                  <span className="text-destructive"> *</span>
                </FormLabel>
                <FormDescription>
                  The navigated model ({navigatedModelId}) is included automatically.
                  Select additional compatible models. At least one required.
                </FormDescription>
                <MultiSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={allModels}
                  placeholder="Select compatible vehicle models"
                  disabled={false}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </Section>

        <Section title="Pricing">
          <NumberField name="price" label="Price" required min={0} />
          <NumberField name="originalPrice" label="Original price" min={0} />
          <SwitchField name="freeShipping" label="Free shipping" help="Offer free shipping on this listing." />
        </Section>

        <Section title="Location">
          <TextField name="city" label="City" placeholder="e.g. Manila" />
          <TextField name="location" label="Location" placeholder="e.g. Pasig, NCR" />
        </Section>

        <Section title="Additional details">
          <TextField name="oemNumber" label="OEM number" placeholder="Original equipment manufacturer number" />
        </Section>

        <Card>
          <CardHeader className="border-b border-border bg-muted/20 pb-5">
            <CardTitle className="font-semibold">Notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Details about the part"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-border pt-6 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            render={<Link href={cancelHref} />}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
            {mode === "create" ? "Create listing" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
