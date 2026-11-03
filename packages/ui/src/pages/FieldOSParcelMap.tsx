import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { GeoJSONSource, Map as LibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { boundaryPoints, type ParcelPoint } from "../parcel-geometry";

type Position = { longitude: number; latitude: number; accuracy: number };
type Inspection = { id: string; title: string; latitude: number | null; longitude: number | null };

function features(points: ParcelPoint[]): FeatureCollection {
  const ring = points.length >= 3 ? [...points, points[0]!] : [];
  return { type: "FeatureCollection", features: [
    ...(ring.length ? [{ type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [ring] } }] : []),
    ...(points.length >= 2 ? [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: ring.length ? ring : points } }] : []),
    ...points.map((point, index) => ({ type: "Feature" as const, properties: { number: index + 1 }, geometry: { type: "Point" as const, coordinates: point } })),
  ] };
}

function fit(map: LibreMap, points: ParcelPoint[]) {
  if (points.length === 1) { map.jumpTo({ center: points[0], zoom: 16 }); return; }
  if (points.length < 2) return;
  map.fitBounds([
    [Math.min(...points.map((point) => point[0])), Math.min(...points.map((point) => point[1]))],
    [Math.max(...points.map((point) => point[0])), Math.max(...points.map((point) => point[1]))],
  ], { padding: 55, maxZoom: 17, duration: 0 });
}

export function FieldOSParcelMap({ projectId, boundary, draftPoints, drawing, pickingScan, compact = false, position, inspections, onAddPoint, onPickScan, onSelectInspection, english = true }: {
  projectId: string; boundary: unknown; draftPoints: ParcelPoint[]; drawing: boolean; pickingScan: boolean; compact?: boolean; position: Position | null;
  inspections: Inspection[]; onAddPoint: (point: ParcelPoint) => void; onPickScan: (point: ParcelPoint) => void; onSelectInspection: (id: string) => void;
  english?: boolean;
}) {
  const t = (en: string, fr: string) => english ? en : fr;
  const node = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const actionRef = useRef({ drawing, pickingScan, onAddPoint, onPickScan, onSelectInspection });
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const savedPoints = useMemo(() => boundaryPoints(boundary), [boundary]);
  useEffect(() => { actionRef.current = { drawing, pickingScan, onAddPoint, onPickScan, onSelectInspection }; }, [drawing, pickingScan, onAddPoint, onPickScan, onSelectInspection]);

  useEffect(() => {
    if (!node.current) return;
    let active = true;
    let map: LibreMap | null = null;
    const timeout = window.setTimeout(() => { if (active) setUnavailable(true); }, 20_000);
    void import("maplibre-gl").then(({ Map, NavigationControl, AttributionControl, setWorkerUrl }) => {
      if (!active || !node.current) return;
      setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
      map = new Map({ container: node.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [0, 15], zoom: 2, attributionControl: false,
        locale: english ? undefined : { "NavigationControl.ZoomIn": "Zoom avant", "NavigationControl.ZoomOut": "Zoom arrière", "AttributionControl.ToggleAttribution": "Afficher les attributions" },
      });
      mapRef.current = map;
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new AttributionControl({ compact: true }), "bottom-right");
      map.on("load", () => {
        if (!active || !map) return;
        window.clearTimeout(timeout);
        for (const id of ["saved", "draft", "position", "inspections"]) {
          map.addSource(id, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        }
        map.addLayer({ id: "saved-fill", type: "fill", source: "saved", paint: { "fill-color": "#1b6944", "fill-opacity": .17 } });
        map.addLayer({ id: "saved-line", type: "line", source: "saved", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": "#1b6944", "line-width": 3 } });
        map.addLayer({ id: "draft-fill", type: "fill", source: "draft", paint: { "fill-color": "#df7d2e", "fill-opacity": .18 } });
        map.addLayer({ id: "draft-line", type: "line", source: "draft", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": "#d06424", "line-width": 3, "line-dasharray": [2, 1] } });
        map.addLayer({ id: "draft-points", type: "circle", source: "draft", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 6, "circle-color": "white", "circle-stroke-color": "#d06424", "circle-stroke-width": 2 } });
        map.addLayer({ id: "position-point", type: "circle", source: "position", paint: { "circle-radius": 8, "circle-color": "#2870df", "circle-stroke-color": "white", "circle-stroke-width": 2 } });
        map.addLayer({ id: "inspection-points", type: "circle", source: "inspections", paint: { "circle-radius": 9, "circle-color": "#8b3f8b", "circle-stroke-color": "white", "circle-stroke-width": 2 } });
        map.addLayer({ id: "inspection-numbers", type: "symbol", source: "inspections", layout: { "text-field": ["get", "number"], "text-size": 11, "text-allow-overlap": true }, paint: { "text-color": "white" } });
        setReady(true);
      });
      map.on("click", (event) => {
        const action = actionRef.current;
        if (action.drawing) { action.onAddPoint([event.lngLat.lng, event.lngLat.lat]); return; }
        if (action.pickingScan) { action.onPickScan([event.lngLat.lng, event.lngLat.lat]); return; }
        const hit = map?.queryRenderedFeatures(event.point, { layers: ["inspection-points"] })[0];
        if (typeof hit?.properties?.id === "string") action.onSelectInspection(hit.properties.id);
      });
      map.on("error", () => { if (active) setUnavailable(true); });
    }).catch(() => { if (active) setUnavailable(true); });
    return () => { active = false; window.clearTimeout(timeout); map?.remove(); mapRef.current = null; setReady(false); };
  }, [projectId, english]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("saved") as GeoJSONSource).setData(features(savedPoints));
    (map.getSource("draft") as GeoJSONSource).setData(features(draftPoints));
    const location: FeatureCollection = { type: "FeatureCollection", features: position ? [
      { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [position.longitude, position.latitude] } },
    ] : [] };
    (map.getSource("position") as GeoJSONSource).setData(location);
    const scans: FeatureCollection = { type: "FeatureCollection", features: inspections.filter((item) => item.latitude !== null && item.longitude !== null)
      .map((item, index) => ({ type: "Feature", properties: { id: item.id, title: item.title, number: String(index + 1) },
        geometry: { type: "Point", coordinates: [item.longitude!, item.latitude!] } })) };
    (map.getSource("inspections") as GeoJSONSource).setData(scans);
  }, [ready, savedPoints, draftPoints, position, inspections]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const locations = inspections.flatMap((item) => item.latitude !== null && item.longitude !== null
      ? [[item.longitude, item.latitude] as ParcelPoint] : []);
    fit(map, savedPoints.length ? savedPoints : locations.length ? locations : position ? [[position.longitude, position.latitude]] : []);
  }, [ready, projectId, savedPoints, inspections, position]);

  useEffect(() => {
    if (!ready || drawing || !draftPoints.length) return;
    const map = mapRef.current;
    if (map) fit(map, draftPoints);
  }, [ready, drawing, draftPoints]);

  return <div className="gx-fieldos-map-wrap">
    <div ref={node} className="gx-fieldos-map" style={{ minHeight: compact ? 270 : 360, height: compact ? 270 : "min(48vh, 490px)" }} role="application" aria-label={t("Parcel map with boundary and scan points", "Carte de la parcelle avec contour et points de scan")} />
    {!ready && <div className="gx-fieldos-map-loading">{unavailable ? t("Map unavailable. You can still enter an area or import GeoJSON.", "Carte indisponible. Vous pouvez toujours saisir une surface ou importer un GeoJSON.") : t("Loading parcel map…", "Chargement de la carte…")}</div>}
    {ready && (savedPoints.length || draftPoints.length) ? <button type="button" className="gx-fieldos-map-fit" onClick={() => mapRef.current && fit(mapRef.current, draftPoints.length ? draftPoints : savedPoints)}>{t("Show boundary", "Afficher le contour")}</button> : null}
    <p className="gx-fieldos-map-legend">{t("Green: saved boundary · orange: draft · blue: GPS · purple: scans", "Vert : contour enregistré · orange : brouillon · bleu : GPS · violet : scans")}</p>
  </div>;
}
