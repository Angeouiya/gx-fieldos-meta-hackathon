import { afterEach, expect, test, vi } from "vitest";
import { imageData } from "./image-data";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("a mobile browser without createImageBitmap can prepare a camera photo", async () => {
  vi.stubGlobal("createImageBitmap", undefined);
  class FakeImage {
    naturalWidth = 1200;
    naturalHeight = 900;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) { queueMicrotask(() => this.onload?.()); }
  }
  vi.stubGlobal("Image", FakeImage);
  const revoked = vi.fn();
  const NativeURL = URL;
  vi.stubGlobal("URL", class extends NativeURL {
    static createObjectURL() { return "blob:photo"; }
    static revokeObjectURL(value: string) { revoked(value); }
  });
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,AA==");

  const prepared = await imageData(new File(["photo"], "culture.heic", { type: "image/heic" }));
  expect(prepared).toBe("data:image/jpeg;base64,AA==");
  expect(drawImage).toHaveBeenCalledOnce();
  expect(revoked).toHaveBeenCalledWith("blob:photo");
});

test("photo size is bounded before decoding", async () => {
  await expect(imageData(new File([new Uint8Array(10_000_001)], "large.jpg", { type: "image/jpeg" })))
    .rejects.toThrow("10 Mo maximum");
});
