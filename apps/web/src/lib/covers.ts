/**
 * Editorial covers for ideas.
 *
 * Ideas have no image of their own (the API stores none), so each one gets a
 * photograph from the studio's set, chosen deterministically from its id: the
 * same idea always wears the same cover, on every device.
 */
const COVERS = [
  "/images/peak.jpg",
  "/images/valley.jpg",
  "/images/cliffs.jpg",
  "/images/forest.jpg",
  "/images/summit.jpg",
  "/images/ridge.jpg",
] as const;

/** A stable cover path for an id. */
export function coverFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return COVERS[hash % COVERS.length];
}
