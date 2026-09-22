export function partListingsPath(brandSlug: string, modelSlug: string): string {
  return `/parts/brands/${brandSlug}/models/${modelSlug}/listings`;
}

export function partNewPath(brandSlug: string, modelSlug: string): string {
  return `${partListingsPath(brandSlug, modelSlug)}/new`;
}

export function partViewPath(
  brandSlug: string,
  modelSlug: string,
  partId: string,
): string {
  return `${partListingsPath(brandSlug, modelSlug)}/${partId}`;
}

export function partEditPath(
  brandSlug: string,
  modelSlug: string,
  partId: string,
): string {
  return `${partViewPath(brandSlug, modelSlug, partId)}/edit`;
}