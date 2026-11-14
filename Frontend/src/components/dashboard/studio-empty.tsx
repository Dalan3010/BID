import Image from "next/image";

import { ArrowIcon, Button } from "@/components/ui/button";

/**
 * The studio before the first idea: a quiet photograph and one invitation.
 * No sample projects are invented to fill the space.
 */
export function StudioEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid overflow-hidden border border-line md:grid-cols-2">
      <div className="relative min-h-60 md:min-h-[26rem]">
        <Image
          src="/images/forest.jpg"
          alt=""
          fill
          sizes="(min-width: 768px) 45vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-transparent to-ink-950/60" />
      </div>
      <div className="flex flex-col justify-center gap-6 p-8 md:p-12">
        <p className="eyebrow text-bronze">Tu primer proyecto</p>
        <h2 className="font-serif text-title text-paper sm:text-4xl">
          Tu estudio está en silencio.
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-mist">
          Empieza por un nombre provisional. El coach te acompañará a definir el problema, a
          quién le hablas y cómo podría sostenerse.
        </p>
        <div>
          <Button onClick={onCreate} size="lg">
            Crear mi primera idea
            <ArrowIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
