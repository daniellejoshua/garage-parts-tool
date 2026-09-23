import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export function PageHeading({
  title,
  description,
  aside,
  backHref,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  backHref?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {backHref && (
          <Tooltip>
            <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-primary" render={<Link href={backHref} aria-label="Back" />} />}>
              <ArrowLeftIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="right">Back</TooltipContent>
          </Tooltip>
        )}
        <div className="min-w-0 space-y-1.5">
          <h1 className="font-heading text-[28px] leading-tight font-semibold tracking-[-0.02em] sm:text-[32px]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {aside ? <div className="flex shrink-0 flex-wrap items-center gap-2">{aside}</div> : null}
    </div>
  );
}
