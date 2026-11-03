/** Google Maps URLs open directions without a Maps Platform API key. */
export function fieldDirectionsUrl(latitude: number | null, longitude: number | null): string | null {
  if (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", `${latitude.toFixed(6)},${longitude.toFixed(6)}`);
  return url.toString();
}
