"use client";

import { completionRatio } from "@bid/core";
import { animate } from "animejs";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";

import { useCinematicEntrance } from "@/components/motion/use-cinematic-entrance";
import { useShortcut } from "@/components/shortcuts/use-shortcut";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { LoadingStatus, Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { welcomeTopics, type WelcomeTopic } from "@/lib/dimensions";
import { pendingProposals } from "@/lib/graph";
import { toPercent } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";
import { hasSeenTour, markTourSeen } from "@/lib/onboarding";

import { ArranquePanel } from "./arranque-panel";
import { ArranqueStrip } from "./arranque-strip";
import { Composer } from "./composer";
import { Conversation } from "./conversation";
import { messageAnchor } from "./message-entry";
import { PlanPanel } from "./plan-panel";
import { ProposalTray } from "./proposal-tray";
import { useOnline } from "./use-online";
import { useArranqueSteps } from "./use-arranque-steps";
import { WorkspaceTour } from "./workspace-tour";
import { useWorkspace } from "./use-workspace";

const TRAY_ID = "propuestas";

type Pane = "conversation" | "plan";

/**
 * `/ideas/[id]` — the workspace, the heart of BID.
 *
 * Desktop: two complementary spaces side by side — the conversation (the
 * protagonist, wide) and the plan (a lateral panel that scrolls on its own).
 * Mobile and tablet: one space at a time, switched with tabs that keep both
 * mounted, so the transcript, the draft and the scroll position survive.
 */
export function WorkspaceView({ ideaId }: { ideaId: string }) {
  const workspace = useWorkspace(ideaId);
  const { load, idea, nodes, messages, phase } = workspace;
  const [pane, setPane] = useState<Pane>("conversation");
  /** Sentence start chosen in the coach's welcome, handed to the composer. */
  const [seed, setSeed] = useState<{ text: string; at: number } | null>(null);
  /** Bumped by "Revisar" in the plan so the proposals tray unfolds. */
  const [trayRequest, setTrayRequest] = useState<number | undefined>(undefined);
  const root = useRef<HTMLDivElement>(null);
  const offline = !useOnline();
  // First visit in this browser → the guided tour (the view renders only in
  // the browser, so reading storage in the initializer is safe).
  const [touring, setTouring] = useState(() => !hasSeenTour());
  const showPane = useCallback((next: Pane) => setPane(next), []);

  useCinematicEntrance(root, [load.status === "ready"]);

  /** Shows a pane (mobile) and moves focus into it (any screen). */
  function switchPane(next: Pane) {
    setPane(next);
    requestAnimationFrame(() => {
      const target =
        next === "conversation"
          ? document.getElementById("composer")
          : document.getElementById("pane-plan");
      target?.focus({ preventScroll: next === "plan" });
    });
  }

  /**
   * Brings the arranque into view from the strip above the composer.
   *
   * On a narrow screen the steps live in the other pane, so the pane has to
   * change; on a wide one both panes are already visible and switching panes
   * does nothing at all — which is why the button looked dead. Scrolling to the
   * section is what the person asked for, in both layouts.
   */
  function revealArranque() {
    showPane("plan");
    requestAnimationFrame(() => {
      document
        .getElementById("arranque-title")
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  // Shortcuts (see `lib/shortcuts.ts`). Alt+digit also works while typing,
  // because it is not text.
  const ready = load.status === "ready";
  useShortcut({ key: "/" }, () => document.getElementById("composer")?.focus(), { enabled: ready });
  useShortcut({ code: "Digit1", alt: true }, () => switchPane("conversation"), {
    enabled: ready,
    whileTyping: true,
  });
  useShortcut({ code: "Digit2", alt: true }, () => switchPane("plan"), {
    enabled: ready,
    whileTyping: true,
  });


  // Traceability (RF-52): a node's `messageId` points at the message it came
  // from. The jump is offered only when that message is in the loaded history.
  const messageIds = useMemo(() => new Set(messages.map((message) => message.id)), [messages]);
  const traceAction = useCallback(
    (messageId: string | null) =>
      messageId && messageIds.has(messageId)
        ? () => {
            setPane("conversation");
            revealMessage(messageId);
          }
        : undefined,
    [messageIds],
  );

  const proposals = useMemo(() => pendingProposals(nodes), [nodes]);
  const topics = useMemo(() => welcomeTopics(nodes), [nodes]);

  function pickTopic(topic: WelcomeTopic) {
    setSeed({ text: topic.starter, at: Date.now() });
  }
  const percent = idea ? toPercent(completionRatio({ ideaId: idea.id, nodes })) : 0;

  // The arranque state is owned here, not inside the panel: the chat and the
  // step list have to read the same steps, or the person sees one "current
  // step" in the conversation and another in the panel. It loads only once the
  // plan is complete (the accompaniment stage).
  const arranque = useArranqueSteps(ideaId, { enabled: percent === 100 });

  function reviewProposals() {
    setPane("conversation");
    setTrayRequest(Date.now());
    // Wait for the pane to be visible before moving focus to the tray.
    requestAnimationFrame(() => {
      const tray = document.getElementById(TRAY_ID);
      tray?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      tray?.focus({ preventScroll: true });
    });
  }

  if (load.status === "loading") return <WorkspaceSkeleton />;

  if (load.status === "not-found") {
    return (
      <CenteredMessage
        title="No encontramos esa idea"
        body="Puede que se haya eliminado o que pertenezca a otra cuenta."
      />
    );
  }

  if (load.status === "error" || !idea) {
    return (
      <CenteredMessage
        title="No pudimos abrir esta idea"
        body={load.status === "error" ? load.message : "Inténtalo de nuevo en un momento."}
        action={
          <Button variant="secondary" onClick={workspace.retryLoad}>
            Reintentar
          </Button>
        }
      />
    );
  }

  return (
    <div ref={root} className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col print:h-auto">
      {/* Header */}
      <div data-enter="block" className="border-b border-line">
        <div className="flex items-center gap-4 px-gutter py-4 lg:px-10">
          <Link
            href="/dashboard"
            className="eyebrow -ml-1 inline-flex min-h-11 shrink-0 items-center gap-2 px-1 text-stone transition-colors hover:text-paper print:hidden"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Estudio</span>
            <span className="sr-only sm:hidden">Volver al estudio</span>
          </Link>
          <span aria-hidden="true" className="h-5 w-px shrink-0 bg-line-strong print:hidden" />
          <h1 className="min-w-0 flex-1 truncate font-serif text-xl text-paper sm:text-2xl">
            {idea.title}
          </h1>
          <button
            type="button"
            onClick={() => setTouring(true)}
            className="eyebrow inline-flex min-h-11 shrink-0 items-center px-2 text-stone transition-colors hover:text-paper print:hidden"
          >
            Guía
          </button>
          <div className="hidden w-44 shrink-0 flex-col gap-2 md:flex">
            <span className="eyebrow flex justify-between text-stone">
              Plan <span className="text-paper">{percent}%</span>
            </span>
            <ProgressBar value={percent} label="Plan validado" />
          </div>
        </div>

        {/* Pane switch: mobile and tablet only */}
        <div role="tablist" aria-label="Espacios de trabajo" className="grid grid-cols-2 lg:hidden print:hidden">
          <PaneTab id="conversation" current={pane} onSelect={setPane}>
            Conversación
          </PaneTab>
          <PaneTab id="plan" current={pane} onSelect={setPane}>
            Plan · {percent}%
            {proposals.length > 0 ? (
              <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-amber text-[0.625rem] font-semibold text-ink-950">
                {proposals.length}
              </span>
            ) : null}
          </PaneTab>
        </div>
      </div>

      {touring ? (
        <WorkspaceTour
          onShowPane={showPane}
          onFinish={() => {
            markTourSeen();
            setTouring(false);
          }}
        />
      ) : null}

      {/* Two spaces */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] xl:grid-cols-[minmax(0,1fr)_32rem] print:block">
        <section
          id="pane-conversation"
          role="tabpanel"
          aria-labelledby="tab-conversation"
          className={cn(
            "min-h-0 flex-col print:hidden",
            pane === "conversation" ? "flex" : "hidden lg:flex",
          )}
        >
          <Conversation
            messages={messages}
            phase={phase}
            ideaTitle={idea.title}
            topics={topics}
            onPickTopic={pickTopic}
          />

          <div className="flex flex-col gap-3 pt-3">
            {offline ? (
              <div className="px-gutter lg:px-10">
                <Alert tone="warning" title="Sin conexión">
                  Puedes seguir escribiendo: tu borrador se conserva y podrás enviarlo cuando vuelva
                  la conexión.
                </Alert>
              </div>
            ) : null}

            {workspace.quotaNotice ? (
              <div className="px-gutter lg:px-10">
                <Alert
                  tone="warning"
                  title="Límite de análisis alcanzado"
                  action={
                    <Button variant="ghost" size="sm" onClick={workspace.dismissQuotaNotice}>
                      Entendido
                    </Button>
                  }
                >
                  {workspace.quotaNotice}
                </Alert>
              </div>
            ) : null}

            {workspace.notice ? (
              <div className="px-gutter lg:px-10">
                <Alert
                  tone={workspace.notice.tone}
                  title={workspace.notice.title}
                  action={
                    <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                      {workspace.notice.retryContent ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={phase !== "idle" || offline}
                          onClick={() => void workspace.send(workspace.notice?.retryContent ?? "")}
                        >
                          Pedir otra respuesta
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" onClick={workspace.dismissNotice}>
                        Cerrar
                      </Button>
                    </div>
                  }
                >
                  {workspace.notice.message}
                </Alert>
              </div>
            ) : null}

            <ProposalTray
              id={TRAY_ID}
              proposals={proposals}
              requests={workspace.requests}
              freshIds={workspace.freshIds}
              onDecide={workspace.decide}
              openRequest={trayRequest}
              onTrace={traceAction}
              pendingDiscards={workspace.pendingDiscards}
              onDiscard={workspace.scheduleDiscard}
              onUndoDiscard={workspace.undoDiscard}
              bulk={workspace.bulk}
              onAcceptAll={() => void workspace.acceptAll(proposals)}
            />
          </div>

          {percent === 100 ? (
            <ArranqueStrip arranque={arranque} onShowPlan={revealArranque} />
          ) : null}

          <Composer
            ideaId={ideaId}
            phase={phase}
            onSend={workspace.send}
            seed={seed}
            offline={offline}
          />
        </section>

        <aside
          id="pane-plan"
          role="tabpanel"
          aria-labelledby="tab-plan"
          tabIndex={-1}
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain border-line focus:outline-none lg:border-l",
            "print:block print:overflow-visible print:border-0",
            pane === "plan" ? "block" : "hidden lg:block",
          )}
        >
          <PlanPanel
            idea={idea}
            nodes={nodes}
            highlight={workspace.highlight}
            onReview={reviewProposals}
            onTrace={traceAction}
            messages={messages}
          />

          {/* The arranque starts where the plan ends (S1): its steps are the
              accompaniment, and they never enter the plan above. */}
          {percent === 100 ? <ArranquePanel arranque={arranque} /> : null}
        </aside>
      </div>
    </div>
  );
}

/**
 * Scrolls to a message and marks it briefly: the bubble's border glows amber
 * and fades (Anime.js), and focus moves to the message so keyboard and
 * screen-reader users land there too. Runs on the next frame, after the
 * conversation pane has been made visible.
 */
function revealMessage(messageId: string) {
  requestAnimationFrame(() => {
    const article = document.getElementById(messageAnchor(messageId));
    if (!article) return;
    const reduced = prefersReducedMotion();
    article.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    article.focus({ preventScroll: true });
    const bubble = article.querySelector<HTMLElement>("[data-bubble]");
    if (!bubble || reduced) return;
    animate(bubble, {
      boxShadow: ["0 0 0 1px rgba(182,111,67,0.95)", "0 0 0 1px rgba(182,111,67,0)"],
      duration: 2600,
      ease: "inQuad",
      onComplete: () => bubble.style.removeProperty("box-shadow"),
    });
  });
}

function PaneTab({
  id,
  current,
  onSelect,
  children,
}: {
  id: Pane;
  current: Pane;
  onSelect: (pane: Pane) => void;
  children: React.ReactNode;
}) {
  const selected = id === current;
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={selected}
      aria-controls={`pane-${id}`}
      onClick={() => onSelect(id)}
      className={cn(
        "eyebrow relative flex h-12 items-center justify-center transition-colors",
        selected ? "text-paper" : "text-stone",
        "after:absolute after:inset-x-6 after:bottom-0 after:h-px after:bg-bronze after:transition-transform after:duration-500",
        selected ? "after:scale-x-100" : "after:scale-x-0",
      )}
    >
      {children}
    </button>
  );
}

function CenteredMessage({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-6 px-gutter py-24 sm:items-center sm:text-center">
      <h1 className="font-serif text-headline text-paper">{title}</h1>
      <p role="alert" className="max-w-md text-mist">
        {body}
      </p>
      <div className="flex gap-3">
        {action}
        <ButtonLink href="/dashboard" variant="ghost">
          Volver al estudio
        </ButtonLink>
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <LoadingStatus label="Abriendo el espacio de trabajo…" />
      <div className="flex items-center gap-4 border-b border-line px-gutter py-5 lg:px-10">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-7 w-64" />
      </div>
      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_30rem]">
        <div className="flex flex-col gap-8 px-gutter py-10 lg:px-10">
          {[0, 1, 2].map((row) => (
            <div key={row} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-6">
              <Skeleton className="h-3 w-12" />
              <SkeletonText lines={row === 1 ? 2 : 3} />
            </div>
          ))}
        </div>
        <div className="hidden flex-col gap-6 border-l border-line px-8 py-10 lg:flex">
          <Skeleton className="h-8 w-40" />
          {[0, 1, 2, 3].map((row) => (
            <SkeletonText key={row} lines={2} />
          ))}
        </div>
      </div>
    </div>
  );
}
