import { cn } from "@/lib/cn";
import {
  MATERIAL_LABEL,
  materialFor,
  monogramFor,
  type ThumbnailMaterial,
} from "@/lib/project-thumbnail";

/** The CSS sample each material wears (see `globals.css`). */
const TEXTURE: Record<ThumbnailMaterial, string> = {
  dots: "material-dots",
  rules: "material-rules",
  grid: "material-grid",
  diagonal: "material-diagonal",
};

/**
 * A project thumbnail, as a material sample rather than a photograph.
 *
 * Ideas carry no image, so the swatch shows what the idea is made of: a deep
 * recessed well (`shadow-clay-inset`), one of four low-contrast textures, a
 * top light that gives it volume, and an editorial seal — the title's monogram
 * over the material name — that warms up when the card is hovered or focused.
 *
 * Purely decorative: the title and the data next to it already say everything,
 * so the whole block is hidden from assistive technology.
 */
export function ProjectThumbnail({
  id,
  title,
  className,
}: {
  id: string;
  title: string;
  className?: string;
}) {
  const material = materialFor(id);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex aspect-[4/3] w-full overflow-hidden rounded-clay-sm border border-black/40 bg-ink-950 shadow-clay-inset",
        className,
      )}
    >
      {/* Material sample: lifts its contrast with the card. */}
      <div
        className={cn(
          "absolute inset-0 opacity-60 transition-opacity duration-700 ease-[var(--ease-studio)] group-hover:opacity-90 group-focus-visible:opacity-90",
          TEXTURE[material],
        )}
      />

      {/* Top light: the recess catches a single source from above. */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-paper/[0.07]" />

      {/* Hairline frame: the cut edge of a physical swatch. */}
      <div className="absolute inset-3 rounded-xs ring-1 ring-paper/[0.06]" />

      {/* Editorial seal. */}
      <div className="relative m-auto flex flex-col items-center gap-2">
        <span className="font-serif text-4xl leading-none italic text-stone transition-colors duration-500 group-hover:text-mist">
          {monogramFor(title)}
        </span>
        <span className="eyebrow flex items-center gap-2 text-[0.5625rem] text-stone/60 transition-colors duration-500 group-hover:text-stone">
          <span className="h-px w-3 bg-bronze/50" />
          {MATERIAL_LABEL[material]}
        </span>
      </div>
    </div>
  );
}
