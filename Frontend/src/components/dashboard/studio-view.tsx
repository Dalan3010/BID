"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CinematicPhoto } from "@/components/motion/cinematic-photo";
import { Reveal } from "@/components/motion/reveal";
import { RevealHeadline } from "@/components/motion/reveal-headline";
import { useCinematicEntrance } from "@/components/motion/use-cinematic-entrance";
import { useShortcut } from "@/components/shortcuts/use-shortcut";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingStatus, Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { ApiError, errorMessage, listIdeas, type IdeaProgress } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { firstName, plural } from "@/lib/format";
import { countByStage, filterIdeas, type IdeaStage } from "@/lib/ideas-filter";

import { IdeaEntry } from "./idea-entry";
import { IdeaFilters } from "./idea-filters";
import { NewIdeaDialog } from "./new-idea-dialog";
import { StudioEmpty } from "./studio-empty";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; ideas: IdeaProgress[] };

/**
 * `/dashboard` — the studio.
 *
 * An editorial header over a photograph, then the user's ideas as a numbered
 * index. Everything shown comes from `GET /api/ideas`; nothing is invented.
 */
export function StudioView() {
  const router = useRouter();
  const { data: session } = useSession();
  const root = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<IdeaStage | "all">("all");
  const searchInput = useRef<HTMLInputElement>(null);

  // Shortcuts (see `lib/shortcuts.ts`): "/" searches, "n" starts a new idea.
  useShortcut({ key: "/" }, () => searchInput.current?.focus());
  useShortcut({ key: "n" }, () => setCreating(true));

  useCinematicEntrance(root);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setState({ status: "loading" });
      try {
        const ideas = await listIdeas(signal);
        // Most recently touched first: the studio opens on what is alive.
        ideas.sort((a, b) => b.idea.updatedAt.localeCompare(a.idea.updatedAt));
        setState({ status: "ready", ideas });
      } catch (caught) {
        if (signal?.aborted) return;
        if (caught instanceof ApiError && caught.isUnauthorized) {
          router.replace("/sign-in?next=/dashboard");
          return;
        }
        setState({ status: "error", message: errorMessage(caught) });
      }
    },
    [router],
  );

  useEffect(() => {
    const controller = new AbortController();
    // Data loading is an external sync: it starts on mount and is aborted on unmount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const name = firstName(session?.user.name);
  const ideas = useMemo(() => (state.status === "ready" ? state.ideas : []), [state]);
  const visible = useMemo(() => filterIdeas(ideas, query, stage), [ideas, query, stage]);
  const counts = useMemo(() => countByStage(ideas), [ideas]);

  return (
    <div ref={root} className="flex flex-1 flex-col">
      {/* Editorial header */}
      <section data-enter="backdrop" className="relative isolate overflow-hidden border-b border-line">
        <CinematicPhoto src="/images/cliffs.jpg" priority />
        <div className="relative mx-auto flex max-w-studio flex-col gap-10 px-gutter pt-16 pb-12 md:pt-24 md:pb-16">
          <p data-enter="lede" className="eyebrow flex items-center gap-4 text-mist">
            <span aria-hidden="true" className="h-px w-10 bg-bronze" />
            {name ? `Hola, ${name}` : "Tu estudio"}
          </p>
          <RevealHeadline
            as="h1"
            text="Las ideas merecen un lugar donde *convertirse en algo real.*"
            className="max-w-[20ch] text-headline font-light text-paper"
          />
          <div className="flex flex-col gap-6 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p data-enter="lede" className="text-sm text-mist" aria-live="polite">
              {state.status === "ready"
                ? ideas.length === 0
                  ? "Aún no tienes ideas en tu estudio."
                  : `${plural(ideas.length, "idea", "ideas")} en tu estudio.`
                : " "}
            </p>
            <div data-enter="action">
              <Button onClick={() => setCreating(true)} size="lg" className="w-full sm:w-auto">
                <span aria-hidden="true" className="text-lg leading-none">+</span>
                Nueva idea
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Index of ideas */}
      <section aria-labelledby="ideas-title" className="mx-auto w-full max-w-studio flex-1 px-gutter py-14 md:py-20">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="ideas-title" className="eyebrow text-stone">
            Proyectos
          </h2>
          <span className="eyebrow text-stone">Progreso · Agenda</span>
        </div>

        {state.status === "loading" ? <StudioSkeleton /> : null}

        {state.status === "error" ? (
          <Alert
            tone="error"
            title="No pudimos cargar tus ideas"
            action={
              <Button variant="secondary" size="sm" onClick={() => load()}>
                Reintentar
              </Button>
            }
          >
            {state.message}
          </Alert>
        ) : null}

        {state.status === "ready" && ideas.length === 0 ? (
          <Reveal className="border-t border-line pt-10">
            <StudioEmpty onCreate={() => setCreating(true)} />
          </Reveal>
        ) : null}

        {state.status === "ready" && ideas.length > 0 ? (
          <>
            <IdeaFilters
              query={query}
              onQueryChange={setQuery}
              stage={stage}
              onStageChange={setStage}
              counts={counts}
              inputRef={searchInput}
            />
            <p role="status" className="sr-only">
              {plural(visible.length, "idea encontrada", "ideas encontradas")}
            </p>
            {visible.length > 0 ? (
              // `deps` uses the total, not the filtered list: re-animating the
              // whole list on every keystroke would be noise.
              <Reveal as="ol" className="border-t border-line" deps={[ideas.length]}>
                {visible.map((entry, index) => (
                  <IdeaEntry key={entry.idea.id} entry={entry} index={index} />
                ))}
              </Reveal>
            ) : (
              <div className="flex flex-col items-start gap-4 border-t border-line py-14">
                <p className="font-serif text-2xl text-paper">Ninguna idea coincide.</p>
                <p className="text-sm text-stone">Prueba con otras palabras o cambia el filtro.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setStage("all");
                  }}
                >
                  Quitar filtros
                </Button>
              </div>
            )}
          </>
        ) : null}
      </section>

      <NewIdeaDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function StudioSkeleton() {
  return (
    <div className="border-t border-line">
      <LoadingStatus label="Cargando tus ideas…" />
      {[0, 1].map((row) => (
        <div key={row} className="grid gap-6 border-b border-line py-10 md:grid-cols-12 md:gap-8">
          <Skeleton className="aspect-[4/3] md:col-span-4 lg:col-span-3" />
          <div className="flex flex-col gap-4 md:col-span-5">
            <Skeleton className="h-8 w-2/3" />
            <SkeletonText lines={3} />
          </div>
          <div className="flex flex-col gap-4 md:col-span-3 lg:col-span-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-px w-full" />
            <SkeletonText lines={2} />
          </div>
        </div>
      ))}
    </div>
  );
}
