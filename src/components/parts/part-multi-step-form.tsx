"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeftIcon,
  CircleDollarSignIcon,
  ExternalLinkIcon,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { CompatibilitySelector } from "@/components/parts/compatibility-selector";
import type { VehicleBrandSummary, SelectedModelRef } from "@/lib/server/catalog-queries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LISTING_STATUSES } from "@/lib/listing-status";
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
  backHref: string;
  viewHref?: string;
  allBrands: VehicleBrandSummary[];
  initialSelected: SelectedModelRef[];
  navigatedModelId: string;
  vehicleLabel: string;
  initialMedia?: MediaRow[];
  initialStep?: StepId;
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

const STEP_FIELDS: Record<StepId, Array<keyof PartFormValues>> = {
  1: ["title", "category", "brand", "partNumber", "status", "tag"],
  2: ["condition", "oemNumber", "compatibleModelIds"],
  3: ["quantity", "price", "originalPrice", "freeShipping", "city", "location"],
  4: [],
};

function FormTabs({ activeStep, onStepChange }: {
  activeStep: StepId;
  onStepChange: (step: StepId) => void;
}) {
  return (
    <nav aria-label="Listing form sections" className="overflow-x-auto rounded-lg border border-border bg-card">
      <div className="grid min-w-[620px] grid-cols-4">
      {STEPS.map((step) => {
        const active = step.id === activeStep;
        const StepIcon = step.icon;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepChange(step.id)}
            className={cn(
              "flex h-11 min-w-0 items-center justify-center gap-1.5 border-b-2 px-2.5 text-[11px] font-medium transition-colors",
              active
                ? "border-primary bg-primary/5 text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <StepIcon className={cn("size-3.5", active && "text-primary")} />
            <span className="truncate">{step.title}</span>
          </button>
        );
      })}
      </div>
    </nav>
  );
}

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
        <FormItem className={cn("gap-1.5", className)}>
          <FormLabel className="flex min-h-4 items-center text-xs">
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
          </FormLabel>
          <FormControl>
            <Input
              value={typeof field.value === "string" ? field.value : ""}
              onChange={field.onChange}
              placeholder={placeholder}
              className="h-9 rounded-md text-xs"
            />
          </FormControl>
          {description ? <FormDescription className="text-[11px]">{description}</FormDescription> : null}
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
        <FormItem className="gap-1.5">
          <FormLabel className="flex min-h-4 items-center text-xs">
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="decimal"
              min={min}
              step={step}
              placeholder={placeholder}
              className="h-9 rounded-md text-xs"
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
  name: "category" | "condition" | "status";
  label: string;
  options: readonly string[];
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className="gap-1.5">
          <FormLabel className="flex min-h-4 items-center text-xs">{label}<span className="text-destructive"> *</span></FormLabel>
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

function MediaReviewSection({
  mode,
  partId,
  context,
  initialMedia,
  stagedImages,
  onStagedImagesChange,
}: {
  mode: "create" | "edit";
  partId?: string;
  context: PartNavContext;
  initialMedia: MediaRow[];
  stagedImages: StagedImage[];
  onStagedImagesChange: (images: StagedImage[]) => void;
}) {
  const router = useRouter();

  return mode === "edit" && partId ? (
    <div className="space-y-3">
      <ImageGallery
        key={initialMedia.map((item) => item.id).join("-")}
        parentType="part"
        parentId={partId}
        brandSlug={context.brandSlug}
        modelSlug={context.modelSlug}
        initialMedia={initialMedia}
        editable
        compact
        onUpdate={() => router.refresh()}
      />
      <DropZone
        parentType="part"
        parentId={partId}
        brandSlug={context.brandSlug}
        modelSlug={context.modelSlug}
        currentCount={initialMedia.length}
        maxCount={20}
        compact
        onUploadComplete={() => router.refresh()}
      />
    </div>
  ) : (
    <StagedImagePicker images={stagedImages} onChange={onStagedImagesChange} compact />
  );
}

function FormStep({
  step,
  mode,
  partId,
  context,
  allBrands,
  initialSelected,
  navigatedModelId,
  vehicleLabel,
  initialMedia,
  stagedImages,
  onStagedImagesChange,
}: {
  step: StepId;
  mode: "create" | "edit";
  partId?: string;
  context: PartNavContext;
  allBrands: VehicleBrandSummary[];
  initialSelected: SelectedModelRef[];
  navigatedModelId: string;
  vehicleLabel: string;
  initialMedia: MediaRow[];
  stagedImages: StagedImage[];
  onStagedImagesChange: (images: StagedImage[]) => void;
}) {
  if (step === 1) {
    return (
      <div className="grid items-start gap-x-4 gap-y-3 sm:grid-cols-2 sm:[&>*]:min-w-0">
        <TextField name="title" label="Title" required placeholder="e.g. Front Brake Rotor Set" />
        <SelectField name="category" label="Category" options={PART_CATEGORIES} />
        <TextField name="brand" label="Part brand" required placeholder="e.g. Brembo, Denso, OEM" description="The part manufacturer, not the vehicle brand." />
        <TextField name="partNumber" label="Part number" placeholder="Manufacturer part number" />
        <SelectField name="status" label="Status" options={LISTING_STATUSES} />
        <TextField name="tag" label="Tag" placeholder="e.g. limited, negotiable" />
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="grid items-start gap-x-4 gap-y-3 sm:grid-cols-2 sm:[&>*]:min-w-0">
        <SelectField name="condition" label="Condition" options={PART_CONDITIONS} />
        <TextField name="oemNumber" label="OEM number" placeholder="Original equipment manufacturer number" />
        <FormField
          name="compatibleModelIds"
          render={({ field }) => (
            <FormItem className="gap-1.5 sm:col-span-2">
              <FormLabel className="flex min-h-4 items-center text-xs">Compatible vehicle models <span className="text-destructive"> *</span></FormLabel>
              <FormDescription className="text-[11px]">
                {vehicleLabel} is included. Select any additional verified compatible models.
              </FormDescription>
              <CompatibilitySelector
                value={field.value}
                onChange={field.onChange}
                allBrands={allBrands}
                initialSelected={initialSelected}
                navigatedModelId={navigatedModelId}
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
      <div className="grid items-start gap-x-4 gap-y-3 sm:grid-cols-2 sm:[&>*]:min-w-0">
        <NumberField name="quantity" label="Quantity" required min={1} step="1" placeholder="1" />
        <NumberField name="price" label="Price" required min={0.01} placeholder="150" />
        <NumberField name="originalPrice" label="Original price" min={0} placeholder="180" />
        <FormField
          name="freeShipping"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className="flex min-h-4 items-center text-xs">Free shipping</FormLabel>
              <FormControl>
                <div className="flex h-9 items-center justify-between rounded-lg border border-border bg-muted/20 px-3">
                  <span className="text-xs text-muted-foreground">Offer free shipping</span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </div>
              </FormControl>
              <FormDescription className="text-[11px]">Applied to this listing when enabled.</FormDescription>
            </FormItem>
          )}
        />
        <TextField name="city" label="City" placeholder="e.g. Manila" />
        <TextField name="location" label="Location" placeholder="e.g. Pasig, NCR" />
      </div>
    );
  }

  return (
    <MediaReviewSection
      mode={mode}
      partId={partId}
      context={context}
      initialMedia={initialMedia}
      stagedImages={stagedImages}
      onStagedImagesChange={onStagedImagesChange}
    />
  );
}

export function PartMultiStepForm({
  mode,
  context,
  partId,
  defaults,
  backHref,
  viewHref,
  allBrands,
  initialSelected,
  navigatedModelId,
  vehicleLabel,
  initialMedia = [],
  initialStep = 1,
}: PartMultiStepFormProps) {
  const initialValues = {
    ...defaults,
    compatibleModelIds: defaults.compatibleModelIds.length > 0
      ? defaults.compatibleModelIds
      : [navigatedModelId],
  };
  const [activeStep, setActiveStep] = useState<StepId>(initialStep);
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

  function onInvalid(errors: typeof form.formState.errors) {
    const firstInvalidField = Object.keys(errors)[0] as keyof PartFormValues | undefined;
    if (!firstInvalidField) return;
    const invalidStep = STEPS.find((step) => STEP_FIELDS[step.id].includes(firstInvalidField));
    if (invalidStep) setActiveStep(invalidStep.id);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        noValidate
      >
        <div className="space-y-3">
          <header className="flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-primary" render={<Link href={backHref} aria-label="Back to Parts" />} />}>
                <ArrowLeftIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="right">Back to Parts</TooltipContent>
            </Tooltip>
            <h1 className="shrink-0 text-xl font-semibold tracking-[-0.03em] text-foreground">
              {mode === "create" ? "Create Part Listing" : "Edit Part Listing"}
            </h1>
            {mode === "edit" && partId && (
              <>
                <span className="text-border" aria-hidden="true">•</span>
                <span className="text-muted-foreground">{partId}</span>
                <span className="text-border" aria-hidden="true">•</span>
                <span className="text-[11px] text-muted-foreground">
                  Update part information, compatibility, and pricing.
                </span>
              </>
            )}
            {mode === "create" && (
              <>
                <span className="text-border" aria-hidden="true">•</span>
                <span className="text-[11px] text-muted-foreground">
                  Add a new compatible part listing to your marketplace presentation data.
                </span>
              </>
            )}
            <div className="flex gap-1.5 ml-auto">
              {viewHref ? (
                <Button type="button" variant="outline" size="sm" render={<Link href={viewHref} />}>
                  <ExternalLinkIcon /> View
                </Button>
              ) : null}
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
                {mode === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </header>

          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(350px,1fr)]">
            <div className="min-w-0 space-y-3">
              <FormTabs activeStep={activeStep} onStepChange={setActiveStep} />

              {STEPS.filter((section) => section.id === activeStep).map((section) => {
                const SectionIcon = section.icon;
                return (
                  <Card key={section.id} className="min-w-0 gap-0 rounded-lg py-0 shadow-sm">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                          <SectionIcon className="size-4" />
                        </span>
                        <div>
                          <CardTitle className="text-[15px] font-semibold">{section.title}</CardTitle>
                          <CardDescription className="mt-0.5 text-[11px]">{section.cardDescription}</CardDescription>
                        </div>
                      </div>
                      <div className="p-4">
<FormStep
  step={section.id}
  mode={mode}
  partId={partId}
  context={context}
  allBrands={allBrands}
  initialSelected={initialSelected}
  navigatedModelId={navigatedModelId}
  vehicleLabel={vehicleLabel}
  initialMedia={initialMedia}
  stagedImages={stagedImages}
  onStagedImagesChange={setStagedImages}
/>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <aside className="lg:sticky lg:top-20 lg:self-start">
              <PartListingCard values={values} vehicleLabel={vehicleLabel} media={initialMedia} stagedImages={stagedImages} preview />
            </aside>
          </div>
        </div>
      </form>
    </Form>
  );
}