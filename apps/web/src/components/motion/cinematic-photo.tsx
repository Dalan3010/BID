"use client";

import { animate, onScroll } from "animejs";
import Image from "next/image";
import { useRef } from "react";

import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

import { useAnimeScope } from "./use-anime-scope";

/**
 * A full-bleed photograph with the studio's treatment.
 *
 * - Entrance: the frame is marked `data-enter="photo"`, so the screen's
 *   cinematic entrance fades it in from a slight zoom.
 * - Drift: a very slow, almost imperceptible zoom (40 s, alternating).
 * - Parallax (optional): the image moves at a fraction of the scroll speed
 *   while its section crosses the viewport, through Anime.js `onScroll` sync.
 * - Light: a scrim grounds the text, and a faint warm glow sits in a corner.
 *
 * The image is decorative: `alt` defaults to empty so screen readers skip it.
 */
export function CinematicPhoto({
  src,
  alt = "",
  priority = false,
  parallax = false,
  className,
  imageClassName,
  scrim = true,
  sizes = "100vw",
}: {
  src: string;
  alt?: string;
  priority?: boolean;
  parallax?: boolean;
  className?: string;
  imageClassName?: string;
  scrim?: boolean;
  sizes?: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useAnimeScope(root, () => {
    const frame = root.current;
    const drift = frame?.querySelector<HTMLElement>("[data-drift]");
    const depth = frame?.querySelector<HTMLElement>("[data-depth]");
    if (!frame || !drift) return;

    animate(drift, {
      scale: [1, 1.06],
      duration: 40000,
      ease: EASE.drift,
      loop: true,
      alternate: true,
    });

    if (parallax && depth) {
      animate(depth, {
        y: ["0%", "14%"],
        ease: "linear",
        autoplay: onScroll({
          target: frame,
          // From the frame's top at the viewport's top until its bottom leaves.
          enter: "start start",
          leave: "start end",
          sync: 0.25,
        }),
      });
    }
  }, [parallax]);

  return (
    <div
      ref={root}
      aria-hidden={alt ? undefined : true}
      className={cn("absolute inset-0 overflow-hidden bg-ink-950", className)}
    >
      <div data-enter="photo" className="absolute inset-0">
        <div data-depth className="absolute -inset-y-[8%] inset-x-0 will-change-transform">
          <div data-drift className="absolute inset-0 will-change-transform">
            <Image
              src={src}
              alt={alt}
              fill
              priority={priority}
              sizes={sizes}
              className={cn("object-cover", imageClassName)}
            />
          </div>
        </div>
      </div>
      {scrim ? <div className="scrim absolute inset-0" /> : null}
      <div className="pointer-events-none absolute -bottom-1/4 -left-1/4 size-[70%] rounded-full bg-amber/[0.07] blur-3xl" />
    </div>
  );
}
