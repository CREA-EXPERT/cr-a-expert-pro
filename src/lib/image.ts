/**
 * Préparation des photos avant téléversement, côté navigateur :
 * orientation EXIF corrigée, redimensionnement et compression légère.
 * Les PDF ne sont jamais transformés.
 */

export const COTE_MAX = 2500;
const QUALITE = 0.85;

export function estImageFichier(fichier: File) {
  return /^image\/(jpeg|png)$/.test(fichier.type) || /\.(jpe?g|png)$/i.test(fichier.name);
}

/**
 * Retourne une version optimisée de l'image (JPEG), ou le fichier d'origine
 * si ce n'est pas une image ou si le navigateur ne sait pas la traiter.
 */
export async function preparerImage(fichier: File): Promise<File> {
  if (!estImageFichier(fichier)) return fichier;
  if (typeof document === "undefined") return fichier;

  try {
    const bitmap = await creerBitmap(fichier);
    const ratio = Math.min(1, COTE_MAX / Math.max(bitmap.width, bitmap.height));
    const largeur = Math.round(bitmap.width * ratio);
    const hauteur = Math.round(bitmap.height * ratio);

    const toile = document.createElement("canvas");
    toile.width = largeur;
    toile.height = hauteur;
    const ctx = toile.getContext("2d");
    if (!ctx) return fichier;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, largeur, hauteur);
    ctx.drawImage(bitmap, 0, 0, largeur, hauteur);
    if ("close" in bitmap) (bitmap as ImageBitmap).close?.();

    const blob = await new Promise<Blob | null>((r) => toile.toBlob(r, "image/jpeg", QUALITE));
    if (!blob || blob.size === 0) return fichier;
    if (blob.size >= fichier.size && ratio === 1) return fichier;

    const nom = fichier.name.replace(/\.(jpe?g|png)$/i, "") + ".jpg";
    return new File([blob], nom, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return fichier;
  }
}

async function creerBitmap(fichier: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // « from-image » applique l'orientation EXIF déclarée par l'appareil photo.
      return await createImageBitmap(fichier, { imageOrientation: "from-image" });
    } catch {
      /* repli sur <img> ci-dessous */
    }
  }
  const url = URL.createObjectURL(fichier);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image illisible"));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
