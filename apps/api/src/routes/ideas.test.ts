import { beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "../app";
import { InMemoryIdeaRepository } from "../application/testing/in-memory-idea-repository";

/**
 * The authoring, history and idea CRUD surface.
 *
 * Everything runs through `app.request(...)`: the routes, the Zod schemas and
 * the domain error mapping are exercised end to end. The database is replaced
 * by the in-memory repository, so the suite is deterministic and needs no
 * Postgres.
 */

const OWNER = "user-1";
const OTHER_OWNER = "user-2";
const ORIGIN = "http://localhost:3000";

const harness = vi.hoisted(() => ({
  repository: undefined as unknown as InMemoryIdeaRepository,
}));

vi.mock("../lib/session", () => ({
  requireUser: async () => ({
    id: "user-1",
    name: "Ana",
    email: "ana@example.com",
    emailVerified: true,
  }),
  getCurrentUser: async () => null,
}));

vi.mock("../infrastructure/auth/auth", () => ({
  getAuth: () => ({
    api: { getSession: async () => null },
    handler: async () => new Response(null, { status: 404 }),
  }),
}));

vi.mock("../infrastructure/container", async () => {
  const [{ InMemoryIdeaRepository }, { InMemoryMessageRepository }] =
    await Promise.all([
      import("../application/testing/in-memory-idea-repository"),
      import("../application/testing/in-memory-message-repository"),
    ]);

  const messages = new InMemoryMessageRepository();

  function unused(name: string): () => never {
    return () => {
      throw new Error(`${name} is not used by these routes.`);
    };
  }

  return {
    ideaRepository: () => harness.repository,
    messageRepository: () => messages,
    coachModel: unused("coachModel"),
    extractor: unused("extractor"),
    usageQuota: unused("usageQuota"),
    demoBook: unused("demoBook"),
  };
});

interface NodePayload {
  readonly node: {
    readonly id: string;
    readonly ideaId: string;
    readonly type: string;
    readonly content: string;
    readonly source: string;
    readonly messageId: string | null;
    readonly confidence: number | null;
  };
}

interface IdeaPayload {
  readonly idea: {
    readonly id: string;
    readonly title: string;
    readonly summary: string;
  };
}

interface VersionsPayload {
  readonly versions: readonly {
    readonly version: number;
    readonly createdAt: string;
    readonly nodeCount: number;
  }[];
}

interface DiffPayload {
  readonly diff: {
    readonly added: readonly { readonly type: string }[];
    readonly modified: readonly unknown[];
    readonly removed: readonly { readonly type: string }[];
    readonly from: { readonly version: number } | null;
    readonly to: { readonly version: number };
  };
}

let repository: InMemoryIdeaRepository;

beforeEach(() => {
  repository = new InMemoryIdeaRepository();
  harness.repository = repository;
});

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function seedIdea(ownerId: string = OWNER) {
  return repository.create({
    ownerId,
    title: "Coffee subscription for offices",
    summary: "",
  });
}

function bodyRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify(body),
  };
}

function getRequest(): RequestInit {
  return { headers: { origin: ORIGIN } };
}

describe("POST /api/ideas/:id/nodes", () => {
  it("creates a manual node in an empty dimension and snapshots a version", async () => {
    const idea = await seedIdea();

    const response = await app.request(
      `/api/ideas/${idea.id}/nodes`,
      bodyRequest("POST", {
        type: "problem",
        content: "  Offices waste brewed coffee  ",
      }),
    );

    expect(response.status).toBe(201);

    const { node } = await readJson<NodePayload>(response);

    expect(node).toMatchObject({
      ideaId: idea.id,
      type: "problem",
      content: "Offices waste brewed coffee",
      source: "edited",
      messageId: null,
      confidence: null,
    });

    const graph = await repository.loadGraph(idea.id);
    expect(graph?.nodes).toHaveLength(1);
    expect(await repository.listVersions(idea.id)).toHaveLength(1);
  });

  it("rejects a dimension that already has content with 409", async () => {
    const idea = await seedIdea();
    await repository.addNode({
      ideaId: idea.id,
      type: "problem",
      content: "Already answered",
      source: "confirmed",
    });

    const response = await app.request(
      `/api/ideas/${idea.id}/nodes`,
      bodyRequest("POST", { type: "problem", content: "A second answer" }),
    );

    expect(response.status).toBe(409);
    expect(await readJson(response)).toEqual({
      error:
        "Esa dimensión ya tiene contenido o propuestas: editá el nodo existente o resolvé las propuestas.",
    });
  });

  it("rejects an unknown dimension with 400", async () => {
    const idea = await seedIdea();

    const response = await app.request(
      `/api/ideas/${idea.id}/nodes`,
      bodyRequest("POST", { type: "marketing", content: "Anything" }),
    );

    expect(response.status).toBe(400);
  });
});

describe("PATCH /api/ideas/:id/nodes/:nodeId", () => {
  it("edits a confirmed node and snapshots a new version", async () => {
    const idea = await seedIdea();
    const confirmed = await repository.addNode({
      ideaId: idea.id,
      type: "segment",
      content: "Office managers",
      source: "confirmed",
    });

    const response = await app.request(
      `/api/ideas/${idea.id}/nodes/${confirmed.id}`,
      bodyRequest("PATCH", { content: "Office managers in Santiago" }),
    );

    expect(response.status).toBe(200);

    const { node } = await readJson<NodePayload>(response);

    expect(node).toMatchObject({
      id: confirmed.id,
      content: "Office managers in Santiago",
      source: "edited",
      confidence: null,
    });

    expect(await repository.listVersions(idea.id)).toHaveLength(1);
  });

  it("rejects editing an inferred node with 409", async () => {
    const idea = await seedIdea();
    const inferred = await repository.addNode({
      ideaId: idea.id,
      type: "risks",
      content: "A price war with the incumbent",
      source: "inferred",
      confidence: 0.6,
    });

    const response = await app.request(
      `/api/ideas/${idea.id}/nodes/${inferred.id}`,
      bodyRequest("PATCH", { content: "A price war" }),
    );

    expect(response.status).toBe(409);
    expect(await readJson(response)).toEqual({
      error: "Ese cambio no está permitido.",
    });
  });

  it("answers 404 for a node of another user's idea", async () => {
    const idea = await seedIdea(OTHER_OWNER);
    const node = await repository.addNode({
      ideaId: idea.id,
      type: "problem",
      content: "Not mine",
      source: "confirmed",
    });

    const response = await app.request(
      `/api/ideas/${idea.id}/nodes/${node.id}`,
      bodyRequest("PATCH", { content: "Still not mine" }),
    );

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/ideas/:id", () => {
  it("renames an idea without creating a version", async () => {
    const idea = await seedIdea();

    const response = await app.request(
      `/api/ideas/${idea.id}`,
      bodyRequest("PATCH", { title: "  Coffee for offices  " }),
    );

    expect(response.status).toBe(200);

    const { idea: updated } = await readJson<IdeaPayload>(response);

    expect(updated.title).toBe("Coffee for offices");
    expect(await repository.listVersions(idea.id)).toHaveLength(0);
  });

  it("rejects an empty patch with 400", async () => {
    const idea = await seedIdea();

    const response = await app.request(
      `/api/ideas/${idea.id}`,
      bodyRequest("PATCH", {}),
    );

    expect(response.status).toBe(400);
  });

  it("answers 404 for another user's idea", async () => {
    const idea = await seedIdea(OTHER_OWNER);

    const response = await app.request(
      `/api/ideas/${idea.id}`,
      bodyRequest("PATCH", { title: "Hijacked" }),
    );

    expect(response.status).toBe(404);
    expect((await repository.findById(idea.id))?.title).toBe(
      "Coffee subscription for offices",
    );
  });
});

describe("DELETE /api/ideas/:id", () => {
  it("deletes the idea and answers 404 the second time", async () => {
    const idea = await seedIdea();

    const first = await app.request(`/api/ideas/${idea.id}`, {
      method: "DELETE",
      headers: { origin: ORIGIN },
    });

    expect(first.status).toBe(204);
    expect(await first.text()).toBe("");
    expect(await repository.findById(idea.id)).toBeNull();

    const second = await app.request(`/api/ideas/${idea.id}`, {
      method: "DELETE",
      headers: { origin: ORIGIN },
    });

    expect(second.status).toBe(404);
    expect(await readJson(second)).toEqual({ error: "No encontramos eso." });
  });

  it("answers 404 for another user's idea and keeps it", async () => {
    const idea = await seedIdea(OTHER_OWNER);

    const response = await app.request(`/api/ideas/${idea.id}`, {
      method: "DELETE",
      headers: { origin: ORIGIN },
    });

    expect(response.status).toBe(404);
    expect(await repository.findById(idea.id)).not.toBeNull();
  });
});

describe("GET /api/ideas/:id/versions", () => {
  it("lists snapshots newest first", async () => {
    const idea = await seedIdea();

    await app.request(
      `/api/ideas/${idea.id}/nodes`,
      bodyRequest("POST", { type: "problem", content: "Offices waste coffee" }),
    );
    await app.request(
      `/api/ideas/${idea.id}/nodes`,
      bodyRequest("POST", { type: "segment", content: "Office managers" }),
    );

    const response = await app.request(
      `/api/ideas/${idea.id}/versions`,
      getRequest(),
    );

    expect(response.status).toBe(200);

    const { versions } = await readJson<VersionsPayload>(response);

    expect(versions.map((version) => version.version)).toEqual([2, 1]);
    expect(versions[0]?.nodeCount).toBe(2);
    expect(versions[1]?.nodeCount).toBe(1);
  });

  it("answers 404 for another user's idea", async () => {
    const idea = await seedIdea(OTHER_OWNER);

    const response = await app.request(
      `/api/ideas/${idea.id}/versions`,
      getRequest(),
    );

    expect(response.status).toBe(404);
  });
});

describe("GET /api/ideas/:id/versions/:version/diff", () => {
  it("diffs a version against the previous one", async () => {
    const idea = await seedIdea();

    await app.request(
      `/api/ideas/${idea.id}/nodes`,
      bodyRequest("POST", { type: "problem", content: "Offices waste coffee" }),
    );
    await app.request(
      `/api/ideas/${idea.id}/nodes`,
      bodyRequest("POST", { type: "segment", content: "Office managers" }),
    );

    const explicit = await app.request(
      `/api/ideas/${idea.id}/versions/2/diff?against=1`,
      getRequest(),
    );

    expect(explicit.status).toBe(200);

    const { diff } = await readJson<DiffPayload>(explicit);

    expect(diff.from?.version).toBe(1);
    expect(diff.to.version).toBe(2);
    expect(diff.added.map((node) => node.type)).toEqual(["segment"]);
    expect(diff.modified).toEqual([]);
    expect(diff.removed).toEqual([]);

    // Without `against`, the default is the immediately previous version.
    const implicit = await app.request(
      `/api/ideas/${idea.id}/versions/2/diff`,
      getRequest(),
    );

    expect(implicit.status).toBe(200);
    expect((await readJson<DiffPayload>(implicit)).diff.from?.version).toBe(1);
  });

  it("answers 400 for a malformed version or against", async () => {
    const idea = await seedIdea();

    const paths = [
      `/api/ideas/${idea.id}/versions/abc/diff`,
      `/api/ideas/${idea.id}/versions/0/diff`,
      `/api/ideas/${idea.id}/versions/1/diff?against=0`,
      `/api/ideas/${idea.id}/versions/1/diff?against=two`,
    ];

    for (const path of paths) {
      const response = await app.request(path, getRequest());

      expect(response.status, path).toBe(400);
    }
  });
});

describe("CORS", () => {
  it("advertises PATCH and DELETE on the preflight", async () => {
    const response = await app.request("/api/ideas/anything", {
      method: "OPTIONS",
      headers: {
        origin: ORIGIN,
        "access-control-request-method": "PATCH",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(response.headers.get("access-control-allow-credentials")).toBe(
      "true",
    );

    const methods = (
      response.headers.get("access-control-allow-methods") ?? ""
    ).split(",");

    expect(methods).toEqual(expect.arrayContaining(["PATCH", "DELETE"]));
  });
});
