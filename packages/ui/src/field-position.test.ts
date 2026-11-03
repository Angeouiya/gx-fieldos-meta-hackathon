import { describe, expect, it, vi } from "vitest";
import { getFieldPosition } from "./field-position";

const point = { coords: { latitude: 5.35, longitude: -4.01, accuracy: 42 } } as GeolocationPosition;
const error = (code: number) => ({ code }) as GeolocationPositionError;

describe("GX-FIELD-GPS-001", () => {
  it("retains the device accuracy when precise location is available", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => success(point));
    await expect(getFieldPosition({ getCurrentPosition } as unknown as Geolocation)).resolves.toEqual({
      position: { latitude: 5.35, longitude: -4.01, accuracy: 42 }, approximate: false,
    });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it("retries without high accuracy when the precise fix is unavailable", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback, failure: PositionErrorCallback, _options?: PositionOptions) => {
      if (getCurrentPosition.mock.calls.length === 1) failure(error(2));
      else success(point);
    });
    await expect(getFieldPosition({ getCurrentPosition } as unknown as Geolocation)).resolves.toEqual({
      position: { latitude: 5.35, longitude: -4.01, accuracy: 42 }, approximate: true,
    });
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(getCurrentPosition.mock.calls[1]?.[2]).toEqual({ enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 });
  });

  it("does not retry after a denied permission", async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, failure: PositionErrorCallback) => failure(error(1)));
    await expect(getFieldPosition({ getCurrentPosition } as unknown as Geolocation)).rejects.toThrow("Localisation refusée");
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it("reports a timeout without inventing coordinates", async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, failure: PositionErrorCallback) => failure(error(3)));
    await expect(getFieldPosition({ getCurrentPosition } as unknown as Geolocation)).rejects.toThrow("dépassé le délai");
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });
});
