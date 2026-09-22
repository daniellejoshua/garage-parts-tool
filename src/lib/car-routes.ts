export function carListingsPath(brandSlug: string, modelSlug: string): string {
  return `/cars/brands/${brandSlug}/models/${modelSlug}/listings`;
}

export function carNewPath(brandSlug: string, modelSlug: string): string {
  return `${carListingsPath(brandSlug, modelSlug)}/new`;
}

export function carViewPath(
  brandSlug: string,
  modelSlug: string,
  carId: string,
): string {
  return `${carListingsPath(brandSlug, modelSlug)}/${carId}`;
}

export function carEditPath(
  brandSlug: string,
  modelSlug: string,
  carId: string,
): string {
  return `${carViewPath(brandSlug, modelSlug, carId)}/edit`;
}