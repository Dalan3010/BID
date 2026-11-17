/**
 * Material samples for idea thumbnails.
 *
 * Ideas have no image of their own (the API stores none). Instead of repeating
 * the studio's photographs, each idea wears a material swatch: one of four
 * technical textures, chosen deterministically from its id so the same idea
 * always shows the same sample, on every device.
 */

/** The textures a swatch can wear. Order is part of the distribution. */
export const THUMBNAIL_MATERIALS = ["dots", "rules", "grid", "diagonal"] as const;

export type ThumbnailMaterial = (typeof THUMBNAIL_MATERIALS)[number];

/** Short editorial label engraved under the monogram. */
export const MATERIAL_LABEL: Record<ThumbnailMaterial, string> = {
  dots: "PUNTO",
  rules: "PAUTA",
  grid: "RETÍCULA",
  diagonal: "DIAGONAL",
};

/** FNV-flavoured hash: small, stable and dependency-free. */
function hash(id: string): number {
  let value = 0;
  for (let index = 0; index < id.length; index += 1) {
    value = (value * 31 + id.charCodeAt(index)) >>> 0;
  }
  return value;
}

/** The material sample an id wears, stable across renders and devices. */
export function materialFor(id: string): ThumbnailMaterial {
  return THUMBNAIL_MATERIALS[hash(id) % THUMBNAIL_MATERIALS.length];
}

/**
 * The first letter or digit of a title, uppercase: the swatch seal. Skips
 * punctuation and quotation marks (`«óptica»` reads as `Ó`) and falls back to a
 * middot for titles with nothing typographic in them.
 */
export function monogramFor(title: string): string {
  const first = Array.from(title.trim()).find((char) => /[\p{L}\p{N}]/u.test(char));
  return first ? first.toLocaleUpperCase("es") : "·";
}
