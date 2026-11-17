import type {
  Idea,
  IdeaGraph,
  IdeaNode,
  NodeSource,
  NodeType,
} from "@bid/core";

/**
 * Port: persistence of the idea aggregate.
 *
 * `application/` declares what it needs; `infrastructure/` decides how. Nothing
 * here mentions Postgres, Drizzle or SQL — a test can implement this interface
 * in memory and the use cases keep working unchanged.
 *
 * @see docs/arquitectura.md, "Capas"
 */

/**
 * The idea without its nodes. It is part of the domain, so the client can name
 * the same type instead of keeping a copy that drifts.
 */
export type { Idea };

/** Summary of a stored snapshot. The graph itself is not needed to list them. */
export interface IdeaVersionSummary {
  readonly version: number;
  readonly createdAt: string;
  readonly nodeCount: number;
}

/** Full snapshot, used by the data export (RNF-07). */
export interface IdeaVersion {
  readonly version: number;
  readonly createdAt: string;
  readonly graph: IdeaGraph;
}

export interface NewIdea {
  readonly ownerId: string;
  readonly title: string;
  readonly summary: string;
}

export interface NewNode {
  readonly ideaId: string;
  readonly type: NodeType;
  readonly content: string;
  readonly source: NodeSource;
  readonly messageId?: string | null;
  readonly confidence?: number | null;
}

export interface NodePatch {
  readonly content?: string;
  readonly source?: NodeSource;
  readonly confidence?: number | null;
}

export interface IdeaPatch {
  readonly title?: string;
  readonly summary?: string;
}

export interface IdeaRepository {
  create(input: NewIdea): Promise<Idea>;

  findById(id: string): Promise<Idea | null>;

  listByOwner(ownerId: string): Promise<Idea[]>;

  /** Returns `null` when the idea does not exist. */
  updateIdea(ideaId: string, patch: IdeaPatch): Promise<Idea | null>;

  /** Returns whether an idea row was deleted. */
  deleteIdea(ideaId: string): Promise<boolean>;

  /** Returns `null` when the idea does not exist. */
  loadGraph(ideaId: string): Promise<IdeaGraph | null>;

  findNode(ideaId: string, nodeId: string): Promise<IdeaNode | null>;

  addNode(input: NewNode): Promise<IdeaNode>;

  /** Returns `null` when the node does not exist. */
  updateNode(
    ideaId: string,
    nodeId: string,
    patch: NodePatch,
  ): Promise<IdeaNode | null>;

  removeNode(ideaId: string, nodeId: string): Promise<boolean>;

  /** Snapshots the current graph and returns the new version. */
  saveVersion(ideaId: string): Promise<IdeaVersionSummary | null>;

  listVersions(ideaId: string): Promise<IdeaVersionSummary[]>;

  /** Full snapshots, newest first. Used by the account data export. */
  loadVersions(ideaId: string): Promise<IdeaVersion[]>;

  /** Returns `null` when the idea or the version does not exist. */
  findVersion(ideaId: string, version: number): Promise<IdeaVersion | null>;

  /** Newest version by number, or `null` when there is none. */
  findLatestVersion(ideaId: string): Promise<IdeaVersion | null>;
}
