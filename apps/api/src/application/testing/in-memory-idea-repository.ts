import { randomUUID } from "node:crypto";

import type {
  Idea,
  IdeaRepository,
  IdeaVersion,
  IdeaVersionSummary,
  NewIdea,
  NewNode,
  NodePatch,
} from "../ports/idea-repository";
import type { IdeaGraph, IdeaNode } from "@bid/core";

/**
 * In-memory `IdeaRepository` for tests.
 *
 * It exists to prove that the use cases depend on the port and not on Postgres:
 * the same tests run without a database. It is deliberately simple — no
 * transactions, no ordering guarantees beyond insertion order.
 */
export class InMemoryIdeaRepository implements IdeaRepository {
  private readonly ideas = new Map<string, Idea>();
  private readonly nodes = new Map<string, IdeaNode[]>();
  private readonly versions = new Map<string, IdeaVersion[]>();

  private now(): string {
    return new Date().toISOString();
  }

  async create(input: NewIdea): Promise<Idea> {
    const timestamp = this.now();
    const idea: Idea = {
      id: randomUUID(),
      ownerId: input.ownerId,
      title: input.title,
      summary: input.summary,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.ideas.set(idea.id, idea);
    this.nodes.set(idea.id, []);

    return idea;
  }

  async findById(id: string): Promise<Idea | null> {
    return this.ideas.get(id) ?? null;
  }

  async listByOwner(ownerId: string): Promise<Idea[]> {
    return [...this.ideas.values()].filter((idea) => idea.ownerId === ownerId);
  }

  async loadGraph(ideaId: string): Promise<IdeaGraph | null> {
    if (!this.ideas.has(ideaId)) {
      return null;
    }

    return { ideaId, nodes: [...(this.nodes.get(ideaId) ?? [])] };
  }

  async findNode(ideaId: string, nodeId: string): Promise<IdeaNode | null> {
    return (
      (this.nodes.get(ideaId) ?? []).find((node) => node.id === nodeId) ?? null
    );
  }

  async addNode(input: NewNode): Promise<IdeaNode> {
    const timestamp = this.now();
    const node: IdeaNode = {
      id: randomUUID(),
      ideaId: input.ideaId,
      type: input.type,
      content: input.content,
      source: input.source,
      messageId: input.messageId ?? null,
      confidence: input.confidence ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const list = this.nodes.get(input.ideaId) ?? [];
    list.push(node);
    this.nodes.set(input.ideaId, list);

    return node;
  }

  async updateNode(
    ideaId: string,
    nodeId: string,
    patch: NodePatch,
  ): Promise<IdeaNode | null> {
    const list = this.nodes.get(ideaId) ?? [];
    const index = list.findIndex((node) => node.id === nodeId);
    if (index === -1) {
      return null;
    }

    const current = list[index];
    const updated: IdeaNode = {
      ...current,
      content: patch.content ?? current.content,
      source: patch.source ?? current.source,
      confidence:
        patch.confidence === undefined ? current.confidence : patch.confidence,
      updatedAt: this.now(),
    };

    list[index] = updated;
    return updated;
  }

  async removeNode(ideaId: string, nodeId: string): Promise<boolean> {
    const list = this.nodes.get(ideaId) ?? [];
    const index = list.findIndex((node) => node.id === nodeId);
    if (index === -1) {
      return false;
    }

    list.splice(index, 1);
    return true;
  }

  async saveVersion(ideaId: string): Promise<IdeaVersionSummary | null> {
    const graph = await this.loadGraph(ideaId);
    if (!graph) {
      return null;
    }

    const list = this.versions.get(ideaId) ?? [];
    const snapshot: IdeaVersion = {
      version: list.length + 1,
      createdAt: this.now(),
      graph,
    };

    list.push(snapshot);
    this.versions.set(ideaId, list);

    return {
      version: snapshot.version,
      createdAt: snapshot.createdAt,
      nodeCount: snapshot.graph.nodes.length,
    };
  }

  async listVersions(ideaId: string): Promise<IdeaVersionSummary[]> {
    return [...(this.versions.get(ideaId) ?? [])]
      .reverse()
      .map((snapshot) => ({
        version: snapshot.version,
        createdAt: snapshot.createdAt,
        nodeCount: snapshot.graph.nodes.length,
      }));
  }

  async loadVersions(ideaId: string): Promise<IdeaVersion[]> {
    return [...(this.versions.get(ideaId) ?? [])].reverse();
  }
}
