import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CarFrontIcon, WrenchIcon } from "lucide-react";
import { MODULES } from "@/lib/modules";
import { PageHeading } from "@/components/app/page-heading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Overview",
};

const MODULE_CARDS = [
  {
    module: MODULES.cars,
    icon: CarFrontIcon,
    summary: "Manage individual car listings against brand and model.",
    eyebrow: "Whole vehicles",
  },
  {
    module: MODULES.parts,
    icon: WrenchIcon,
    summary: "Manage individual part listings against brand and model.",
    eyebrow: "Compatible inventory",
  },
];

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-8 sm:px-8 sm:py-10">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-primary" />
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            Garage &amp; Parts
          </p>
          <PageHeading
            title="Marketplace administration"
            description="Manage car and compatible parts listings through the shared vehicle catalog."
          />
        </div>
      </section>
      <div className="grid gap-5 sm:grid-cols-2">
        {MODULE_CARDS.map(({ module, icon: Icon, summary, eyebrow }) => (
          <Link
            key={module.slug}
            href={module.brandsPath}
            className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/35 group-hover:shadow-sm">
              <CardHeader className="gap-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{eyebrow}</span>
                </div>
                <CardTitle className="text-lg font-semibold">{module.label}</CardTitle>
                <CardDescription>{summary}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-1.5 text-sm font-medium text-primary">
                Browse brands
                <ArrowRightIcon className="size-4 shrink-0 transition-transform group-hover:translate-x-1" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Vehicle brands and models are managed through the shared GAP Marketplace reference catalog.
      </p>
    </div>
  );
}
