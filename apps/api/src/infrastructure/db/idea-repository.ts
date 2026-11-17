import { and, asc, desc, eq, max, sql } from "drizzle-orm";

import type {
  Idea,
  IdeaPatch,
  IdeaRepository,
  IdeaVersion,
  IdeaVersionSummary,
  NewIdea,
  NewNode,
  NodePatch,
} from "../../application/ports/idea-repository";
import type { IdeaGraph, IdeaNode } from "@bid/core";
import { getDatabase, type Database } from "./client";
import { ideaVersions, ideas, nodes, type IdeaRow, type NodeRow } from "./schema";

/**
 * Postgres implementation of `IdeaRepository`.
 *
 * This is the only file that knows how the aggregate is laid out in tables. It
 * contains no business rule: provenance transitions are decided by the domain
 * and applied by the use cases.
 */

function toIdea(row: IdeaRow): Idea {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    summary: row.summary,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toIdeaNode(row: NodeRow): IdeaNode {
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

export class DrizzleIdeaRepository implements IdeaRepository {
  constructor(private readonly db: Database = getDatabase()) {}

  async create(input: NewIdea): Promise<Idea> {
    const [row] = await this.db
      .insert(ideas)
      .values({
        ownerId: input.ownerId,
        title: input.title,
        summary: input.summary,
      })
      .returning();

    return toIdea(row);
  }

  async findById(id: string): Promise<Idea | null> {
    const [row] = await this.db
      .select()
      .from(ideas)
      .where(eq(ideas.id, id))
      .limit(1);

    return row ? toIdea(row) : null;
  }

  async listByOwner(ownerId: string): Promise<Idea[]> {
    const rows = await this.db
      .select()
      .from(ideas)
      .where(eq(ideas.ownerId, ownerId))
      .orderBy(desc(ideas.updatedAt));

    return rows.map(toIdea);
  }

  async updateIdea(ideaId: string, patch: IdeaPatch): Promise<Idea | null> {
    const [row] = await this.db
      .update(ideas)
      .set({
        title: patch.title,
        summary: patch.summary,
        updatedAt: new Date(),
      })
      .where(eq(ideas.id, ideaId))
      .returning();

    return row ? toIdea(row) : null;
  }

  async deleteIdea(ideaId: string): Promise<boolean> {
    // Nodes, messages and versions all declare `onDelete: "cascade"`, so the
    // database removes the children with their idea.
    const deleted = await this.db
      .delete(ideas)
      .where(eq(ideas.id, ideaId))
      .returning({ id: ideas.id });

    return deleted.length > 0;
  }

  async loadGraph(ideaId: string): Promise<IdeaGraph | null> {
    const idea = await this.findById(ideaId);
    if (!idea) {
      return null;
    }

    const rows = await this.db
      .select()
      .from(nodes)
      .where(eq(nodes.ideaId, ideaId))
      .orderBy(asc(nodes.createdAt));

    return { ideaId, nodes: rows.map(toIdeaNode) };
  }

  async findNode(ideaId: string, nodeId: string): Promise<IdeaNode | null> {
    const [row] = await this.db
      .select()
      .from(nodes)
      .where(and(eq(nodes.ideaId, ideaId), eq(nodes.id, nodeId)))
      .limit(1);

    return row ? toIdeaNode(row) : null;
  }

  async addNode(input: NewNode): Promise<IdeaNode> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(nodes)
        .values({
          ideaId: input.ideaId,
          type: input.type,
          content: input.content,
          source: input.source,
          messageId: input.messageId ?? null,
          confidence: input.confidence ?? null,
        })
        .returning();

      // Inferred nodes arrive in bulk while a proposal is being built; they
      // must not make the idea look freshly edited.
      if (input.source !== "inferred") {
        await tx
          .update(ideas)
          .set({ updatedAt: new Date() })
          .where(eq(ideas.id, input.ideaId));
      }

      return toIdeaNode(row);
    });
  }

  async updateNode(
    ideaId: string,
    nodeId: string,
    patch: NodePatch,
  ): Promise<IdeaNode | null> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(nodes)
        .set({
          content: patch.content,
          source: patch.source,
          confidence: patch.confidence,
          updatedAt: new Date(),
        })
        .where(and(eq(nodes.ideaId, ideaId), eq(nodes.id, nodeId)))
        .returning();

      if (!row) {
        return null;
      }

      await tx
        .update(ideas)
        .set({ updatedAt: new Date() })
        .where(eq(ideas.id, ideaId));

      return toIdeaNode(row);
    });
  }

  async removeNode(ideaId: string, nodeId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const removed = await tx
        .delete(nodes)
        .where(and(eq(nodes.ideaId, ideaId), eq(nodes.id, nodeId)))
        .returning({ id: nodes.id });

      if (removed.length === 0) {
        return false;
      }

      await tx
        .update(ideas)
        .set({ updatedAt: new Date() })
        .where(eq(ideas.id, ideaId));

      return true;
    });
  }

  async saveVersion(ideaId: string): Promise<IdeaVersionSummary | null> {
    const graph = await this.loadGraph(ideaId);
    if (!graph) {
      return null;
    }

    const [current] = await this.db
      .select({ latest: max(ideaVersions.version) })
      .from(ideaVersions)
      .where(eq(ideaVersions.ideaId, ideaId));

    const version = Number(current?.latest ?? 0) + 1;

    const [row] = await this.db
      .insert(ideaVersions)
      .values({ ideaId, version, graph })
      .returning();

    return {
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      nodeCount: graph.nodes.length,
    };
  }

  async listVersions(ideaId: string): Promise<IdeaVersionSummary[]> {
    const rows = await this.db
      .select({
        version: ideaVersions.version,
        createdAt: ideaVersions.createdAt,
        nodeCount: sql<number>`jsonb_array_length(${ideaVersions.graph} -> 'nodes')`,
      })
      .from(ideaVersions)
      .where(eq(ideaVersions.ideaId, ideaId))
      .orderBy(desc(ideaVersions.version));

    return rows.map((row) => ({
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      nodeCount: Number(row.nodeCount),
    }));
  }

  async loadVersions(ideaId: string): Promise<IdeaVersion[]> {
    const rows = await this.db
      .select()
      .from(ideaVersions)
      .where(eq(ideaVersions.ideaId, ideaId))
      .orderBy(desc(ideaVersions.version));

    return rows.map((row) => ({
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      graph: row.graph,
    }));
  }

  async findVersion(
    ideaId: string,
    version: number,
  ): Promise<IdeaVersion | null> {
    const [row] = await this.db
      .select()
      .from(ideaVersions)
      .where(
        and(
          eq(ideaVersions.ideaId, ideaId),
          eq(ideaVersions.version, version),
        ),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      graph: row.graph,
    };
  }

  async findLatestVersion(ideaId: string): Promise<IdeaVersion | null> {
    const [row] = await this.db
      .select()
      .from(ideaVersions)
      .where(eq(ideaVersions.ideaId, ideaId))
      .orderBy(desc(ideaVersions.version))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      graph: row.graph,
    };
  }
}
