"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CarFrontIcon,
  LayoutDashboardIcon,
  MenuIcon,
  WrenchIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboardIcon,
    active: (pathname: string) => pathname === "/",
  },
  {
    label: "Cars",
    href: "/cars/brands",
    icon: CarFrontIcon,
    active: (pathname: string) => pathname.startsWith("/cars"),
  },
  {
    label: "Car Parts",
    href: "/parts/brands",
    icon: WrenchIcon,
    active: (pathname: string) => pathname.startsWith("/parts"),
  },
];

function Brand() {
  return (
    <Link
      href="/"
      className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="relative flex h-8 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-xs font-semibold tracking-[0.08em] text-primary-foreground">
        <span className="absolute inset-x-0 bottom-0 h-1 bg-gold" />
        GAP
      </span>
      <span className="hidden min-w-0 sm:block">
        <span className="block truncate text-sm font-semibold text-foreground">
          Marketplace Admin
        </span>
      </span>
    </Link>
  );
}

export function AppTopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90">
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-6 lg:gap-10">
          <Brand />
          <nav className="hidden h-14 items-stretch md:flex" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => {
              const active = item.active(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2 px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    active && "text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="md:hidden"
            render={<Button variant="outline" size="icon" aria-label="Open navigation" />}
          >
            <MenuIcon className="size-[18px]" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(320px,88vw)]">
            <SheetHeader className="border-b p-5">
              <SheetTitle>GAP Marketplace Admin</SheetTitle>
              <SheetDescription>Listing management</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3" aria-label="Mobile navigation">
              {NAV_ITEMS.map((item) => {
                const active = item.active(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active && "bg-primary/10 text-primary",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
