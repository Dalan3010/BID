import { eq, inArray, or } from "drizzle-orm";

import type { IdeaGraph, IdeaNode, NodeType } from "@bid/core";
import type { DemoBook } from "../../application/ports/demo-book";
import type { Database } from "./client";
import { ideaVersions, ideas, nodes } from "./schema";

/**
 * Public demo credentials.
 *
 * They are documented on purpose: the live presentation logs in with one click,
 * without typing anything. The password is created by Better Auth itself, so the
 * hash comes from the library and not from a copy of its algorithm.
 */
export const DEMO_CREDENTIALS = {
  name: "Cuenta demo",
  email: "demo@bid.local",
  password: "demo1234",
} as const;

export const DEMO_IDEA = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Café de especialidad por suscripción para oficinas",
  summary:
    "Suscripción semanal de café recién tostado para oficinas pequeñas, con molienda ajustada al método de preparación de cada equipo.",
} as const;

/**
 * The rest of the demo book.
 *
 * The dashboard is the first thing the jury sees: it has to look like a
 * working book, not like a single row. These ideas are here so the ledger has
 * enough rows to show its rhythm, and so the agenda has something to say.
 */
export const DEMO_BOOK = [
  {
    id: "00000000-0000-4000-8000-000000000002",
    title: "Tuppers reutilizables para restaurantes",
    summary:
      "Recogida y lavado de tuppers reutilizables para restaurantes de comida para llevar.",
    nodes: {
      problem:
        "Los restaurantes de comida para llevar acumulan tuppers de un solo uso que después van a la basura.",
      segment:
        "Restaurantes de comida para llevar con entre 50 y 300 pedidos diarios en zonas urbanas.",
    },
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    title: "Clases de yoga online por horarios",
    summary:
      "Yoga en directo a las siete de la mañana para gente que no llega al estudio antes de trabajar.",
    nodes: {
      problem:
        "Las personas que quieren hacer yoga antes de trabajar no encuentran clases a las seis o siete de la mañana cerca de su casa.",
      segment:
        "Empleados de oficina de 25 a 45 años en ciudades grandes que empiezan la jornada temprano.",
    },
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    title: "Organizador de viajes en familia",
    summary:
      "Un lugar donde la familia organiza fechas, costos y quién lleva qué.",
    nodes: {},
  },
] as const;

/** One validated sentence per canonical dimension. */
const DEMO_NODES: Readonly<Record<NodeType, string>> = {
  problem:
    "Las oficinas pequeñas no tienen café de calidad, y comprar grano fresco cada semana requiere un tiempo que nadie en la oficina tiene.",
  segment:
    "Oficinas de 10 a 50 personas en zonas céntricas que ya compran café de especialidad para sus empleados.",
  value_proposition:
    "Café de especialidad recién tostado, entregado cada lunes con la molienda ajustada al método de cada oficina.",
  solution:
    "Suscripción semanal con entrega programada, molienda a medida y una guía breve de preparación para el equipo.",
  channels:
    "Venta directa desde el sitio web y alianzas con administradores de edificios corporativos.",
  revenue:
    "Suscripción mensual por oficina, más venta puntual de equipamiento y accesorios.",
  costs:
    "Grano verde, tueste, logística de última milla y packaging compostable.",
  competition:
    "Cafeterías de especialidad cercanas, máquinas de cápsulas y distribuidores mayoristas de café industrial.",
  metrics:
    "Retención mensual de suscripciones, consumo por oficina y margen por entrega.",
  risks:
    "Dependencia de un único tostador y variación estacional en la calidad del grano.",
};

/** Every fixed id of the book, so a restore can claim them back. */
const DEMO_IDEA_IDS = [DEMO_IDEA.id, ...DEMO_BOOK.map((entry) => entry.id)];

/**
 * The seeded book, restored through Drizzle.
 *
 * The seed script and the reset endpoint (RF-73) both go through here, so the
 * book the jury starts from and the book a reset brings back are the same.
 */
export class DrizzleDemoBook implements DemoBook {
  readonly ownerEmail = DEMO_CREDENTIALS.email;

  constructor(private readonly database: Database) {}

  async restore(ownerId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      // Everything the walkthrough created goes: new ideas, messages, nodes
      // and versions all hang from the owner's ideas and cascade with them.
      // The book's fixed ids go too, whoever holds them: they are the demo by
      // definition, and leaving them would make the inserts below collide.
      await tx
        .delete(ideas)
        .where(or(eq(ideas.ownerId, ownerId), inArray(ideas.id, DEMO_IDEA_IDS)));

      await tx.insert(ideas).values({ ...DEMO_IDEA, ownerId });

      const inserted = await tx
        .insert(nodes)
        .values(
          (Object.keys(DEMO_NODES) as NodeType[]).map((type) => ({
            ideaId: DEMO_IDEA.id,
            type,
            content: DEMO_NODES[type],
            source: "confirmed" as const,
          })),
        )
        .returning();

      const seededGraph: IdeaGraph = {
        ideaId: DEMO_IDEA.id,
        nodes: inserted.map(toIdeaNode),
      };

      await tx.insert(ideaVersions).values({
        ideaId: DEMO_IDEA.id,
        version: 1,
        graph: seededGraph,
      });

      // The rest of the book. Each idea keeps a couple of confirmed
      // dimensions and leaves the rest open, so the dashboard shows both a
      // finished row and rows with work pending.
      for (const entry of DEMO_BOOK) {
        await tx.insert(ideas).values({
          id: entry.id,
          ownerId,
          title: entry.title,
          summary: entry.summary,
        });

        const confirmed = Object.entries(entry.nodes) as [NodeType, string][];

        if (confirmed.length > 0) {
          await tx.insert(nodes).values(
            confirmed.map(([type, content]) => ({
              ideaId: entry.id,
              type,
              content,
              source: "confirmed" as const,
            })),
          );
        }
      }
    });
  }
}

function toIdeaNode(row: typeof nodes.$inferSelect): IdeaNode {
  return {
    id: row.id,
    ideaId: row.ideaId,
    type: row.type,
    content: row.content,
    source: row.source,
    messageId: row.messageId,
    confidence: row.confidence,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
