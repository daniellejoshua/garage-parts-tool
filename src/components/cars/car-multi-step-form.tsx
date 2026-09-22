"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftIcon,
  CarFrontIcon,
  DollarSignIcon,
  ExternalLinkIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  SaveIcon,
} from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { DropZone } from "@/components/ui/drop-zone";
import { ImageGallery } from "@/components/media/image-gallery";
import {
  StagedImagePicker,
  uploadStagedImages,
  type StagedImage,
} from "@/components/media/staged-image-picker";
import { CarListingCard } from "@/components/cars/car-listing-card";
import {
  createCar,
  updateCar,
  type CarNavContext,
} from "@/lib/server/car-actions";
import type { MediaRow } from "@/lib/server/media-queries";
import { carEditPath, carViewPath } from "@/lib/car-routes";
import { carFormSchema, type CarFormValues } from "@/lib/validations/car";

type StepId = 1 | 2 | 3 | 4;

interface CarMultiStepFormProps {
  mode: "create" | "edit";
  context: CarNavContext;
  carId?: string;
  defaults: CarFormValues;
  backHref: string;
  viewHref?: string;
  initialMedia?: MediaRow[];
  initialStep?: StepId;
}

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
    cardDescription: "Start with the main details of your vehicle listing.",
    icon: FileTextIcon,
  },
  {
    id: 2,
    title: "Vehicle details",
    description: "Specifications",
    cardDescription: "Add the key specifications buyers need to identify the vehicle.",
    icon: CarFrontIcon,
  },
  {
    id: 3,
    title: "Pricing & location",
    description: "Price and availability",
    cardDescription: "Set the listing price, location, and availability dates.",
    icon: DollarSignIcon,
  },
  {
    id: 4,
    title: "Media & review",
    description: "Photos and final review",
    cardDescription: "Add final notes, review the preview, and manage listing photos.",
    icon: ImageIcon,
  },
];

const STEP_FIELDS: Record<StepId, Array<keyof CarFormValues>> = {
  1: ["title", "sellerId", "brand", "model", "status", "condition", "tag"],
  2: ["year", "mileageKm", "bodyStyle", "fuelType", "transmission", "color", "vin"],
  3: ["price", "originalPrice", "rating", "inspectionScore", "city", "location", "publishedAt", "soldAt"],
  4: ["description"],
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
  readOnly,
  description,
  className,
}: {
  name: keyof CarFormValues;
  label: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
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
              readOnly={readOnly}
              className={cn("h-9 rounded-md text-xs", readOnly && "bg-muted/60 text-muted-foreground")}
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
  max,
  step = "0.01",
  placeholder,
}: {
  name: keyof CarFormValues;
  label: string;
  required?: boolean;
  min?: number;
  max?: number;
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
              max={max}
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

function DateTimeField({ name, label }: { name: "publishedAt" | "soldAt"; label: string }) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className="gap-1.5">
          <FormLabel className="flex min-h-4 items-center text-xs">{label}</FormLabel>
          <FormControl>
            <Input
              type="datetime-local"
              className="h-9 rounded-md text-xs"
              value={field.value ?? ""}
              onChange={(event) => field.onChange(event.target.value || null)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function MediaReviewSection({
  mode,
  carId,
  context,
  initialMedia,
  stagedImages,
  onStagedImagesChange,
}: {
  mode: "create" | "edit";
  carId?: string;
  context: CarNavContext;
  initialMedia: MediaRow[];
  stagedImages: StagedImage[];
  onStagedImagesChange: (images: StagedImage[]) => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <FormField
        name="description"
        render={({ field }) => (
          <FormItem className="gap-1.5">
            <FormLabel className="text-xs">Description</FormLabel>
            <FormControl>
              <Textarea
                rows={2}
                className="rounded-md"
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Details about the vehicle"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {mode === "edit" && carId ? (
        <div className="space-y-3">
          <ImageGallery
            key={initialMedia.map((item) => item.id).join("-")}
            parentType="car"
            parentId={carId}
            brandSlug={context.brandSlug}
            modelSlug={context.modelSlug}
            initialMedia={initialMedia}
            editable
            compact
            onUpdate={() => router.refresh()}
          />
          <DropZone
            parentType="car"
            parentId={carId}
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
      )}
    </div>
  );
}

function FormStep({
  step,
  mode,
  carId,
  context,
  initialMedia,
  stagedImages,
  onStagedImagesChange,
}: {
  step: StepId;
  mode: "create" | "edit";
  carId?: string;
  context: CarNavContext;
  initialMedia: MediaRow[];
  stagedImages: StagedImage[];
  onStagedImagesChange: (images: StagedImage[]) => void;
}) {
  if (step === 1) {
    return (
      <div className="grid items-start gap-x-4 gap-y-3 sm:grid-cols-2 sm:[&>*]:min-w-0">
        <TextField name="title" label="Title" required placeholder="e.g. 2020 Toyota Vios 1.3 E" />
        <NumberField name="sellerId" label="Seller ID" required min={1} step="1" placeholder="Internal seller ID" />
        <TextField name="brand" label="Vehicle brand" required readOnly description="Taken from the catalog route." />
        <TextField name="model" label="Vehicle model" required readOnly description="Taken from the catalog route." />
        <TextField name="status" label="Status" required placeholder="e.g. available, sold, reserved" />
        <TextField name="condition" label="Condition" placeholder="e.g. used" />
        <TextField name="tag" label="Tag" placeholder="e.g. as-is, negotiable" className="sm:col-span-2" />
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="grid items-start gap-x-4 gap-y-3 sm:grid-cols-2 sm:[&>*]:min-w-0">
        <NumberField name="year" label="Year" required min={1900} max={2100} step="1" placeholder="2020" />
        <NumberField name="mileageKm" label="Mileage (km)" required min={0} max={2_147_483_647} step="1" placeholder="50000" />
        <TextField name="bodyStyle" label="Body style" placeholder="e.g. sedan" />
        <TextField name="fuelType" label="Fuel type" placeholder="e.g. gasoline" />
        <TextField name="transmission" label="Transmission" placeholder="e.g. automatic" />
        <TextField name="color" label="Color" placeholder="e.g. pearl white" />
        <TextField name="vin" label="VIN" placeholder="Optional vehicle identification number" className="sm:col-span-2" />
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="grid items-start gap-x-4 gap-y-3 sm:grid-cols-2 sm:[&>*]:min-w-0">
        <NumberField name="price" label="Price" required min={0.01} placeholder="25000" />
        <NumberField name="originalPrice" label="Original price" min={0} max={1_000_000_000} placeholder="30000" />
        <NumberField name="rating" label="Rating" min={0} max={10} step="0.1" placeholder="4.5" />
        <NumberField name="inspectionScore" label="Inspection score" min={0} max={2_147_483_647} step="1" placeholder="85" />
        <TextField name="city" label="City" placeholder="e.g. Manila" />
        <TextField name="location" label="Location" placeholder="e.g. Pasig, NCR" />
        <DateTimeField name="publishedAt" label="Published date" />
        <DateTimeField name="soldAt" label="Sold date" />
      </div>
    );
  }

  return (
    <MediaReviewSection
      mode={mode}
      carId={carId}
      context={context}
      initialMedia={initialMedia}
      stagedImages={stagedImages}
      onStagedImagesChange={onStagedImagesChange}
    />
  );
}

export function CarMultiStepForm({
  mode,
  context,
  carId,
  defaults,
  backHref,
  viewHref,
  initialMedia = [],
  initialStep = 1,
}: CarMultiStepFormProps) {
  const [activeStep, setActiveStep] = useState<StepId>(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const router = useRouter();
  const form = useForm<CarFormValues>({
    resolver: zodResolver(carFormSchema) as unknown as Resolver<CarFormValues>,
    defaultValues: defaults,
  });
  const values = useWatch({ control: form.control }) as CarFormValues;

  function moveToStep(step: StepId) {
    setActiveStep(step);
  }

  async function onSubmit(input: CarFormValues) {
    setIsSubmitting(true);
    const result = mode === "create"
      ? await createCar(context, input)
      : await updateCar(context, carId as string, input);

    if (!result.ok) {
      setIsSubmitting(false);
      toast.error(result.error);
      return;
    }

    if (mode === "create" && result.id) {
      try {
        await uploadStagedImages({
          files: stagedImages.map((image) => image.file),
          parentType: "car",
          parentId: result.id,
          brandSlug: context.brandSlug,
          modelSlug: context.modelSlug,
        });
        router.push(carViewPath(context.brandSlug, context.modelSlug, result.id));
      } catch (error) {
        toast.error(
          `The listing was created, but an image upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        router.push(carEditPath(context.brandSlug, context.modelSlug, result.id));
      }
      router.refresh();
    }
  }

  function onInvalid(errors: typeof form.formState.errors) {
    const firstInvalidField = Object.keys(errors)[0] as keyof CarFormValues | undefined;
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
              <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-primary" render={<Link href={backHref} aria-label="Back to Cars" />} />}>
                <ArrowLeftIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="right">Back to Cars</TooltipContent>
            </Tooltip>
            <h1 className="shrink-0 text-xl font-semibold tracking-[-0.03em] text-foreground">
              {mode === "create" ? "Create Car Listing" : "Edit Car Listing"}
            </h1>
            {mode === "edit" && carId && (
              <>
                <span className="text-border" aria-hidden="true">•</span>
                <span className="text-muted-foreground">{carId}</span>
                <span className="text-border" aria-hidden="true">•</span>
                <span className="text-[11px] text-muted-foreground">
                  Update vehicle information, pricing, and images.
                </span>
              </>
            )}
            {mode === "create" && (
              <>
                <span className="text-border" aria-hidden="true">•</span>
                <span className="text-[11px] text-muted-foreground">
                  Add a new vehicle listing to your marketplace presentation data.
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
              <FormTabs activeStep={activeStep} onStepChange={moveToStep} />

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
                          carId={carId}
                          context={context}
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
              <CarListingCard values={values} media={initialMedia} stagedImages={stagedImages} preview />
            </aside>
          </div>
        </div>
      </form>
    </Form>
  );
}
