import { expect, test } from "vitest";
import { boundaryPoints, geoJsonPoints, parcelArea, type ParcelPoint } from "./parcel-geometry";

const square: ParcelPoint[] = [[-4, 5], [-3.999, 5], [-3.999, 5.001], [-4, 5.001]];

test("a closed parcel outline yields plausible area and perimeter", () => {
  const measured = parcelArea(square);
  expect(measured).not.toBeNull();
  expect(measured!.areaSqMeters).toBeGreaterThan(12_000);
  expect(measured!.areaSqMeters).toBeLessThan(13_000);
  expect(measured!.perimeterMeters).toBeGreaterThan(440);
  expect(measured!.perimeterMeters).toBeLessThan(450);
  expect(boundaryPoints({ type: "Polygon", coordinates: [[...square, square[0]]] })).toEqual(square);
});

test("crossing edges and unlocated points cannot establish parcel area", () => {
  expect(parcelArea([square[0]!, square[2]!, square[1]!, square[3]!])).toBeNull();
  expect(parcelArea([[NaN, 5], ...square.slice(1)])).toBeNull();
});

test("a single GeoJSON line can be imported as a closed boundary", () => {
  expect(geoJsonPoints({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "LineString", coordinates: square } }] })).toEqual(square);
  expect(geoJsonPoints({ type: "FeatureCollection", features: [{}, {}] })).toEqual([]);
});
