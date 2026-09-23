import type { Metadata } from "next";
import { Trail } from "@/components/app/trail";
import { CarListingsTable } from "@/components/cars/car-listings-table";
import { findAllCars } from "@/lib/server/car-queries";
import { serializeCar } from "@/lib/server/serialize-car";

export const metadata: Metadata = {
  title: "All car listings",
};

export const dynamic = "force-dynamic";

export default async function AllCarListingsPage() {
  const cars = (await findAllCars()).map(serializeCar);

  return (
    <div className="flex flex-col gap-4">
      <Trail items={[{ label: "Vehicle Catalog", href: "/" }, { label: "All car listings" }]} />
      <CarListingsTable cars={cars} exportScope="car" />
    </div>
  );
}
