import type { Metadata } from "next";

import { WorkspaceView } from "@/components/workspace/workspace-view";

export const metadata: Metadata = { title: "Espacio de trabajo" };

/**
 * `/ideas/[id]` — conversation with the coach and the plan being built.
 *
 * `params` is a Promise in Next.js 16; it is awaited here and the id handed
 * to the client view, which loads everything from `GET /api/ideas/:id`.
 */
export default async function IdeaPage({ params }: PageProps<"/ideas/[id]">) {
  const { id } = await params;
  return <WorkspaceView ideaId={id} />;
}
