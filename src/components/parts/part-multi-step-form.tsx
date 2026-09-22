"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CircleDollarSignIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  SaveIcon,
  WrenchIcon,
} from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
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
import type { MultiSelectOption } from "@/components/ui/multi-select";
import { CompatibilitySelector } from "@/components/parts/compatibility-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropZone } from "@/components/ui/drop-zone";
import { ImageGallery } from "@/components/media/image-gallery";
import {
  StagedImagePicker,
  uploadStagedImages,
  type StagedImage,
} from "@/components/media/staged-image-picker";
import { PartListingCard } from "@/components/parts/part-listing-card";
import {
  createPart,
  updatePart,
  type PartNavContext,
} from "@/lib/server/part-actions";
import type { MediaRow } from "@/lib/server/media-queries";
import { PART_CATEGORIES, PART_CONDITIONS } from "@/lib/part-values";
import { partEditPath, partListingsPath } from "@/lib/part-routes";
import { partFormSchema, type PartFormValues } from "@/lib/validations/part";

type StepId = 1 | 2 | 3 | 4;

interface PartMultiStepFormProps {
  mode: "create" | "edit";
  context: PartNavContext;
  partId?: string;
  defaults: PartFormValues;
  cancelHref: string;
  allModels: MultiSelectOption[];
  navigatedModelId: string;
  vehicleLabel: string;
  initialMedia?: MediaRow[];
}

const partClientSchema = partFormSchema.extend({
  compatibleModelIds: z.array(z.string()).min(1, "Select at least one compatible vehicle model"),
});

const STEPS: Array<{
  id: StepId;
  title: string;
  description: string;
  cardDescription: string;
  icon: typeof FileTextIcon;
}> = [
  {
    id: 1,
    title: "Basic information",
    description: "Main details",
    cardDescription: "Start with the main details of your part listing.",
    icon: FileTextIcon,
  },
  {
    id: 2,
    title: "Compatibility",
    description: "Fitment details",
    cardDescription: "Record condition, identifiers, and compatible vehicle models.",
    icon: WrenchIcon,
  },
  {
    id: 3,
    title: "Pricing & inventory",
    description: "Stock and location",
    cardDescription: "Set pricing, available quantity, shipping, and location.",
    icon: CircleDollarSignIcon,
  },
  {
    id: 4,
    title: "Media & review",
    description: "Photos and final review",
    cardDescription: "Review the listing preview and manage part photos.",
    icon: ImageIcon,
  },
];

function TextField({
  name,
  label,
  placeholder,
  required,
  description,
  className,
}: {
  name: keyof PartFormValues;
  label: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
  className?: string;
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="flex min-h-5 items-center">
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
          </FormLabel>
          <FormControl>
            <Input
              value={typeof field.value === "string" ? field.value : ""}
              onChange={field.onChange}
              placeholder={placeholder}
            />
          </FormControl>
          {description ? <FormDescription className="text-xs">{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function NumberField({
  name,
  label,
  required,
  min,
  step = "0.01",
  placeholder,
}: {
  name: keyof PartFormValues;
  label: string;
  required?: boolean;
  min?: number;
  step?: string;
  placeholder?: string;
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex min-h-5 items-center">
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              min={min}
              step={step}
              placeholder={placeholder}
              value={typeof field.value === "number" ? field.value : ""}
              onChange={(event) => field.onChange(event.target.value === "" ? null : Number(event.target.value))}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SelectField({
  name,
  label,
  options,
}: {
  name: "category" | "condition";
  label: string;
  options: readonly string[];
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex min-h-5 items-center">{label}<span className="text-destructive"> *</span></FormLabel>
          <Select value={field.value || null} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function FormStep({
  step,
  mode,
  partId,
  context,
  allModels,
  vehicleLabel,
  initialMedia,
  stagedImages,
  onStagedImagesChange,
}: {
  step: StepId;
  mode: "create" | "edit";
  partId?: string;
  context: PartNavContext;
  allModels: MultiSelectOption[];
  vehicleLabel: string;
  initialMedia: MediaRow[];
  stagedImages: StagedImage[];
  onStagedImagesChange: (images: StagedImage[]) => void;
}) {
  const router = useRouter();

  if (step === 1) {
    return (
      <div className="grid items-start gap-5 sm:grid-cols-2 sm:[&>*]:min-w-0">
        <TextField name="title" label="Title" required placeholder="e.g. Front Brake Rotor Set" />
        <SelectField name="category" label="Category" options={PART_CATEGORIES} />
        <TextField name="brand" label="Part brand" required placeholder="e.g. Brembo, Denso, OEM" description="The part manufacturer, not the vehicle brand." />
        <TextField name="partNumber" label="Part number" placeholder="Manufacturer part number" />
        <TextField name="status" label="Status" required placeholder="e.g. available, sold, reserved" description="Free text; no approved status set is defined." />
        <TextField name="tag" label="Tag" placeholder="e.g. limited, negotiable" />
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="grid items-start gap-5 sm:grid-cols-2 sm:[&>*]:min-w-0">
        <SelectField name="condition" label="Condition" options={PART_CONDITIONS} />
        <TextField name="oemNumber" label="OEM number" placeholder="Original equipment manufacturer number" />
        <FormField
          name="compatibleModelIds"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Compatible vehicle models <span className="text-destructive">*</span></FormLabel>
              <FormDescription className="text-xs">
                {vehicleLabel} is included. Select any additional verified compatible models.
              </FormDescription>
              <CompatibilitySelector
                value={field.value}
                onChange={field.onChange}
                allModels={allModels}
                vehicleLabel={vehicleLabel}
                disabled={false}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="grid items-start gap-5 sm:grid-cols-2 sm:[&>*]:min-w-0">
        <NumberField name="quantity" label="Quantity" required min={1} step="1" placeholder="1" />
        <NumberField name="price" label="Price" required min={0.01} placeholder="150" />
        <NumberField name="originalPrice" label="Original price" min={0} placeholder="180" />
        <FormField
          name="freeShipping"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex min-h-5 items-center">Free shipping</FormLabel>
              <FormControl>
                <div className="flex h-10 items-center justify-between rounded-lg border border-border bg-muted/20 px-3">
                  <span className="text-sm text-muted-foreground">Offer free shipping</span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </div>
              </FormControl>
              <FormDescription className="text-xs">Applied to this listing when enabled.</FormDescription>
            </FormItem>
          )}
        />
        <TextField name="city" label="City" placeholder="e.g. Manila" />
        <TextField name="location" label="Location" placeholder="e.g. Pasig, NCR" />
      </div>
    );
  }

  return mode === "edit" && partId ? (
    <div className="space-y-4">
      <ImageGallery
        key={initialMedia.map((item) => item.id).join("-")}
        parentType="part"
        parentId={partId}
        brandSlug={context.brandSlug}
        modelSlug={context.modelSlug}
        initialMedia={initialMedia}
        editable
        onUpdate={() => router.refresh()}
      />
      <DropZone
        parentType="part"
        parentId={partId}
        brandSlug={context.brandSlug}
        modelSlug={context.modelSlug}
        currentCount={initialMedia.length}
        maxCount={20}
        onUploadComplete={() => router.refresh()}
      />
    </div>
  ) : (
    <StagedImagePicker
      images={stagedImages}
      onChange={onStagedImagesChange}
    />
  );
}

export function PartMultiStepForm({
  mode,
  context,
  partId,
  defaults,
  cancelHref,
  allModels,
  navigatedModelId,
  vehicleLabel,
  initialMedia = [],
}: PartMultiStepFormProps) {
  const initialValues = {
    ...defaults,
    compatibleModelIds: defaults.compatibleModelIds.length > 0
      ? defaults.compatibleModelIds
      : [navigatedModelId],
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const router = useRouter();
  const form = useForm<PartFormValues>({
    resolver: zodResolver(partClientSchema) as unknown as Resolver<PartFormValues>,
    defaultValues: initialValues,
  });
  const values = useWatch({ control: form.control }) as PartFormValues;

  async function onSubmit(input: PartFormValues) {
    setIsSubmitting(true);
    const actionInput = {
      ...input,
      compatibleModelIds: input.compatibleModelIds.map((id) => BigInt(id)),
    };
    const result = mode === "create"
      ? await createPart(context, actionInput, BigInt(navigatedModelId))
      : await updatePart(context, partId as string, actionInput);

    if (!result.ok) {
      setIsSubmitting(false);
      toast.error(result.error);
      return;
    }

    if (mode === "create" && result.id) {
      try {
        await uploadStagedImages({
          files: stagedImages.map((image) => image.file),
          parentType: "part",
          parentId: result.id,
          brandSlug: context.brandSlug,
          modelSlug: context.modelSlug,
        });
        router.push(partListingsPath(context.brandSlug, context.modelSlug));
      } catch (error) {
        toast.error(
          `The listing was created, but an image upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        router.push(partEditPath(context.brandSlug, context.modelSlug, result.id));
      }
      router.refresh();
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.78fr)_minmax(300px,1fr)]">
          <Card className="min-w-0 shadow-sm">
            <CardContent className="p-0">
              {STEPS.map((section, index) => {
                const SectionIcon = section.icon;

                return (
                  <section
                    key={section.id}
                    className={cn("space-y-6 p-5 sm:p-6", index > 0 && "border-t border-border")}
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <SectionIcon className="size-5" />
                      </span>
                      <div>
                        <CardTitle className="text-lg font-semibold">{section.title}</CardTitle>
                        <CardDescription className="mt-1">{section.cardDescription}</CardDescription>
                      </div>
                    </div>
                    <FormStep
                      step={section.id}
                      mode={mode}
                      partId={partId}
                      context={context}
                      allModels={allModels}
                      vehicleLabel={vehicleLabel}
                      initialMedia={initialMedia}
                      stagedImages={stagedImages}
                      onStagedImagesChange={setStagedImages}
                    />
                  </section>
                );
              })}
              <div className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <Button type="button" variant="outline" render={<Link href={cancelHref} />}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
                  {mode === "create" ? "Create listing" : "Save changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <PartListingCard values={values} vehicleLabel={vehicleLabel} media={initialMedia} stagedImages={stagedImages} preview />
          </aside>
        </div>
      </form>
    </Form>
  );
}
