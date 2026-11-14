import Image from "next/image";

import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

/** Any unknown route. */
export default function NotFound() {
  return (
    <main id="contenido" className="relative isolate flex min-h-dvh flex-1 flex-col">
      <Image src="/images/forest.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover" />
      <div className="scrim absolute inset-0 -z-10" />
      <div className="px-gutter py-6">
        <Logo />
      </div>
      <div className="mx-auto flex w-full max-w-studio flex-1 flex-col justify-end gap-8 px-gutter pb-20">
        <p className="eyebrow text-mist">404</p>
        <h1 className="max-w-[16ch] text-headline font-light text-paper">
          Este camino <span className="font-serif italic">no lleva</span> a ninguna parte.
        </h1>
        <div>
          <ButtonLink href="/" variant="secondary">
            Volver al inicio
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
