import type { Car } from "@prisma/client";
import type { CarFormValues } from "@/lib/validations/car";

export interface CarRow {
  id: string;
  sellerId: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  originalPrice: number | null;
  mileageKm: number;
  bodyStyle: string | null;
  fuelType: string | null;
  transmission: string | null;
  condition: string | null;
  tag: string | null;
  color: string | null;
  vin: string | null;
  description: string | null;
  city: string | null;
  location: string | null;
  status: string;
  rating: number | null;
  inspectionScore: number | null;
  publishedAt: Date | null;
  soldAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeCar(car: Car): CarRow {
  return {
    id: car.id.toString(),
    sellerId: car.sellerId.toString(),
    title: car.title,
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: Number(car.price),
    originalPrice:
      car.originalPrice === null ? null : Number(car.originalPrice),
    mileageKm: car.mileageKm,
    bodyStyle: car.bodyStyle,
    fuelType: car.fuelType,
    transmission: car.transmission,
    condition: car.condition,
    tag: car.tag,
    color: car.color,
    vin: car.vin,
    description: car.description,
    city: car.city,
    location: car.location,
    status: car.status,
    rating: car.rating === null ? null : Number(car.rating),
    inspectionScore: car.inspectionScore,
    publishedAt: car.publishedAt,
    soldAt: car.soldAt,
    createdAt: car.createdAt,
    updatedAt: car.updatedAt,
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

export function toDateTimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function carToFormDefaults(
  car: CarRow,
): CarFormValues {
  return {
    sellerId: Number(car.sellerId),
    title: car.title,
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: car.price,
    originalPrice: car.originalPrice,
    mileageKm: car.mileageKm,
    bodyStyle: car.bodyStyle,
    fuelType: car.fuelType,
    transmission: car.transmission,
    condition: car.condition as CarFormValues["condition"],
    tag: car.tag,
    color: car.color,
    vin: car.vin,
    description: car.description,
    city: car.city,
    location: car.location,
    status: car.status as CarFormValues["status"],
    rating: car.rating,
    inspectionScore: car.inspectionScore,
    publishedAt: car.publishedAt ? toDateTimeLocal(car.publishedAt) : null,
    soldAt: car.soldAt ? toDateTimeLocal(car.soldAt) : null,
  };
}