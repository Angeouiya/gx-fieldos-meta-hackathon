export type ParcelPoint = [longitude: number, latitude: number];
export type ParcelArea = { areaSqMeters: number; perimeterMeters: number };

const RADIUS_METERS = 6_371_008.8;
const radians = (degrees: number) => degrees * Math.PI / 180;

function intersects(a: ParcelPoint, b: ParcelPoint, c: ParcelPoint, d: ParcelPoint) {
  const cross = (p: ParcelPoint, q: ParcelPoint, r: ParcelPoint) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
}

export function distanceMeters(a: ParcelPoint, b: ParcelPoint) {
  const deltaLat = radians(b[1] - a[1]);
  const deltaLon = radians(b[0] - a[0]);
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(a[1])) * Math.cos(radians(b[1])) * Math.sin(deltaLon / 2) ** 2;
  return 2 * RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function parcelArea(points: ParcelPoint[]): ParcelArea | null {
  if (points.length < 3 || points.length > 1000 || points.some(([lon, lat]) =>
    !Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90)) return null;
  const ring = points[0]![0] === points.at(-1)?.[0] && points[0]![1] === points.at(-1)?.[1]
    ? points : [...points, points[0]!];
  if (ring.length < 4 || ring.length > 1001) return null;
  let sum = 0;
  let perimeterMeters = 0;
  for (let index = 0; index < ring.length - 1; index++) {
    const a = ring[index]!, b = ring[index + 1]!;
    if (a[0] === b[0] && a[1] === b[1] || Math.abs(a[0] - b[0]) > 180) return null;
    perimeterMeters += distanceMeters(a, b);
    sum += radians(b[0] - a[0]) * (2 + Math.sin(radians(a[1])) + Math.sin(radians(b[1])));
    for (let other = index + 2; other < ring.length - 1; other++) {
      if (index === 0 && other === ring.length - 2) continue;
      if (intersects(a, b, ring[other]!, ring[other + 1]!)) return null;
    }
  }
  const areaSqMeters = Math.abs(sum * RADIUS_METERS ** 2 / 2);
  return Number.isFinite(areaSqMeters) && areaSqMeters >= 1 && areaSqMeters <= 1_000_000_000
    ? { areaSqMeters, perimeterMeters } : null;
}

export function boundaryPoints(value: unknown): ParcelPoint[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const boundary = value as { type?: unknown; coordinates?: unknown };
  if (boundary.type !== "Polygon" || !Array.isArray(boundary.coordinates) || boundary.coordinates.length !== 1) return [];
  const ring = boundary.coordinates[0];
  if (!Array.isArray(ring)) return [];
  const points = ring.map((entry: unknown) => Array.isArray(entry) && entry.length === 2 &&
    typeof entry[0] === "number" && typeof entry[1] === "number" ? [entry[0], entry[1]] as ParcelPoint : null);
  if (points.some((entry) => entry === null)) return [];
  const valid = points as ParcelPoint[];
  return parcelArea(valid) ? valid.slice(0, -1) : [];
}

export function geoJsonPoints(value: unknown): ParcelPoint[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  let entry = value as Record<string, unknown>;
  if (entry.type === "FeatureCollection") {
    if (!Array.isArray(entry.features) || entry.features.length !== 1) return [];
    entry = entry.features[0] as Record<string, unknown>;
  }
  if (entry.type === "Feature") entry = entry.geometry as Record<string, unknown>;
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
  const source = entry.type === "Polygon" && Array.isArray(entry.coordinates) && entry.coordinates.length === 1
    ? entry.coordinates[0] : entry.type === "LineString" ? entry.coordinates : null;
  if (!Array.isArray(source)) return [];
  const points = source.map((item: unknown) => Array.isArray(item) && item.length === 2 &&
    typeof item[0] === "number" && typeof item[1] === "number" ? [item[0], item[1]] as ParcelPoint : null);
  if (points.some((item) => item === null)) return [];
  const valid = points as ParcelPoint[];
  return parcelArea(valid) ? valid[0]![0] === valid.at(-1)?.[0] && valid[0]![1] === valid.at(-1)?.[1]
    ? valid.slice(0, -1) : valid : [];
}
