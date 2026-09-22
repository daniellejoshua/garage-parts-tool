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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  carFormSchema,
  type CarFormValues,
} from "@/lib/validations/car";
import {
  createCar,
  updateCar,
  type CarNavContext,
} from "@/lib/server/car-actions";

function TextField({
  name,
  label,
  required = false,
  placeholder,
  readOnly = false,
  help,
}: {
  name: keyof CarFormValues;
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
  name: keyof CarFormValues;
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

function DateTimeField({
  name,
  label,
  help,
}: {
  name: keyof CarFormValues;
  label: string;
  help?: string;
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="datetime-local"
              value={field.value ?? ""}
              onChange={(event) => field.onChange(event.target.value || null)}
            />
          </FormControl>
          {help ? <FormDescription>{help}</FormDescription> : null}
          <FormMessage />
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

export function CarForm({
  mode,
  context,
  carId,
  defaults,
  cancelHref,
}: {
  mode: "create" | "edit";
  context: CarNavContext;
  carId?: string;
  defaults: CarFormValues;
  cancelHref: string;
}) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<CarFormValues>({
    resolver: zodResolver(carFormSchema) as unknown as Resolver<CarFormValues>,
    defaultValues: defaults,
  });

  async function onSubmit(values: CarFormValues) {
    setIsPending(true);
    const result =
      mode === "create"
        ? await createCar(context, values)
        : await updateCar(context, carId as string, values);

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
          <TextField
            name="sellerId"
            label="Seller id"
            required
            help="Internal numeric id of the seller."
          />
          <TextField name="title" label="Title" required placeholder="e.g. 2020 Toyota Vios 1.3 E" />
          <TextField
            name="brand"
            label="Vehicle brand"
            required
            readOnly
            help="Taken from the catalog route you navigated from."
          />
          <TextField
            name="model"
            label="Vehicle model"
            required
            readOnly
            help="Taken from the catalog route you navigated from."
          />
          <TextField
            name="status"
            label="Status"
            required
            placeholder="e.g. available, sold, reserved"
            help="Free text; the approved status value set is still pending."
          />
          <TextField name="condition" label="Condition" placeholder="e.g. used" />
          <TextField name="tag" label="Tag" placeholder="e.g. as-is, negotiable" />
        </Section>

        <Section title="Vehicle details">
          <NumberField name="year" label="Year" required min={1900} max={2100} step="1" />
          <NumberField name="mileageKm" label="Mileage (km)" required min={0} step="1" />
          <TextField name="bodyStyle" label="Body style" placeholder="e.g. sedan" />
          <TextField name="fuelType" label="Fuel type" placeholder="e.g. gasoline, diesel" />
          <TextField name="transmission" label="Transmission" placeholder="e.g. automatic" />
          <TextField name="color" label="Color" placeholder="e.g. pearl white" />
          <TextField name="vin" label="VIN" placeholder="Optional vehicle identification number" />
        </Section>

        <Section title="Pricing and inspection">
          <NumberField name="price" label="Price" required min={0} />
          <NumberField name="originalPrice" label="Original price" min={0} />
          <NumberField name="rating" label="Rating" min={0} max={10} step="0.1" />
          <NumberField name="inspectionScore" label="Inspection score" min={0} step="1" />
        </Section>

        <Section title="Location and dates">
          <TextField name="city" label="City" placeholder="e.g. Manila" />
          <TextField name="location" label="Location" placeholder="e.g. Pasig, NCR" />
          <DateTimeField name="publishedAt" label="Published at" />
          <DateTimeField name="soldAt" label="Sold at" />
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
                      placeholder="Details about the vehicle"
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
