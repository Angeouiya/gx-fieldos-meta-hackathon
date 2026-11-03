const maxPhotoBytes = 10_000_000;
const maxEncodedLength = 350_000;

export async function imageData(file: File): Promise<string> {
  if (file.size > maxPhotoBytes || (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))) {
    throw new Error("Choisissez une photo de 10 Mo maximum (JPEG, PNG, WebP ou format pris en charge par votre appareil).");
  }

  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;
  let source: CanvasImageSource;
  let width: number;
  let height: number;
  try {
    if (typeof createImageBitmap === "function") {
      try { bitmap = await createImageBitmap(file); } catch { /* Some mobile browsers need the image element fallback. */ }
    }
    if (bitmap) {
      source = bitmap;
      width = bitmap.width;
      height = bitmap.height;
    } else {
      objectUrl = URL.createObjectURL(file);
      const photo = new Image();
      await new Promise<void>((resolve, reject) => {
        photo.onload = () => resolve();
        photo.onerror = () => reject(new Error("Cette photo ne peut pas être lue. Essayez le format JPEG ou PNG."));
        photo.src = objectUrl!;
      });
      source = photo;
      width = photo.naturalWidth;
      height = photo.naturalHeight;
    }
    if (!width || !height) throw new Error("Cette photo est vide ou endommagée.");

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Le traitement de cette photo est indisponible sur cet appareil.");
    for (const edge of [900, 700, 500, 350]) {
      const scale = Math.min(1, edge / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.76, 0.55, 0.38]) {
        const encoded = canvas.toDataURL("image/jpeg", quality);
        if (encoded.startsWith("data:image/jpeg;base64,") && encoded.length <= maxEncodedLength) return encoded;
      }
    }
    throw new Error("Cette photo reste trop volumineuse. Choisissez une photo plus simple.");
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
