"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CarFrontIcon,
  LayoutDashboardIcon,
  WrenchIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  {
    title: "Overview",
    url: "/",
    icon: LayoutDashboardIcon,
    match: (pathname: string) => pathname === "/",
  },
  {
    title: "Cars",
    url: "/cars/brands",
    icon: CarFrontIcon,
    match: (pathname: string) => pathname.startsWith("/cars"),
  },
  {
    title: "Car Parts",
    url: "/parts/brands",
    icon: WrenchIcon,
    match: (pathname: string) => pathname.startsWith("/parts"),
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/" />}>
              <div className="flex aspect-square size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="font-heading text-xs font-semibold">GAP</span>
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="font-heading truncate font-semibold text-sm">
                  Marketplace
                </span>
                <span className="text-[10px] text-muted-foreground">Admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const active = item.match(pathname);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      render={<Link href={item.url} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}