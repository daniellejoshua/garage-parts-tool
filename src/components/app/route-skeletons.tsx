import { Skeleton } from "@/components/ui/skeleton";

export function TrailSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export function HeadingSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <TrailSkeleton />
      <HeadingSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ListingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <TrailSkeleton />
      <HeadingSkeleton />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}