import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  GENERIC_ERROR,
  NETWORK_ERROR,
  addArranqueSteps,
  createIdea,
  errorMessage,
  exportUrl,
  listArranqueSteps,
  requestExtraction,
  requestStepProposals,
  resetDemo,
  resolveProposal,
  sendMessage,
  updateArranqueStepStatus,
} from "./api";
import { API_URL } from "./config";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Stubs `fetch`; each call gets a fresh clone, since a body is read once. */
function mockFetch(response: Response) {
  const spy = vi.fn(async () => response.clone());
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("transport rules", () => {
  it("always sends the session cookie and never an owner id", async () => {
    const spy = mockFetch(json({ idea: { id: "1", title: "Café" } }, 201));

    await createIdea("Café");

    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${API_URL}/api/ideas`);
    expect(init.credentials).toBe("include");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ title: "Café" });
    expect(init.body).not.toContain("ownerId");
  });

  it("surfaces the API's own error message with its status", async () => {
    mockFetch(json({ error: "Cuerpo inválido." }, 400));

    const error = await createIdea("").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).message).toBe("Cuerpo inválido.");
  });

  it("falls back to a generic message when the error is not JSON", async () => {
    mockFetch(new Response("boom", { status: 500 }));

    const error = await createIdea("x").catch((caught: unknown) => caught);

    expect((error as ApiError).message).toBe(GENERIC_ERROR);
  });

  it("maps network failures to a readable sentence", () => {
    expect(errorMessage(new TypeError("Failed to fetch"))).toBe(NETWORK_ERROR);
  });
});

describe("sendMessage", () => {
  it("throws before any stream is read when the status is not OK", async () => {
    mockFetch(json({ error: "No pudimos responder en este momento." }, 502));

    const error = await sendMessage("idea", "hola").catch((caught: unknown) => caught);

    expect((error as ApiError).status).toBe(502);
  });

  it("returns the raw response so the caller can read the stream", async () => {
    mockFetch(new Response("Hola ", { status: 200 }));

    const response = await sendMessage("idea", "hola");

    expect(await response.text()).toBe("Hola ");
  });
});

describe("requestExtraction", () => {
  it("turns the 429 into an announced quota, not an error", async () => {
    mockFetch(
      json(
        { quotaReached: true, proposals: [], message: "Llegaste al límite de extracciones disponibles." },
        429,
      ),
    );

    await expect(requestExtraction("idea")).resolves.toEqual({
      kind: "quota",
      message: "Llegaste al límite de extracciones disponibles.",
    });
  });

  it("returns the proposals on success", async () => {
    const proposals = [{ id: "n1", type: "revenue", content: "Suscripción", confidence: 0.8 }];
    const spy = mockFetch(json({ quotaReached: false, proposals }));

    await expect(requestExtraction("idea")).resolves.toEqual({ kind: "ok", proposals });
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toBe("{}");
  });

  it("throws on a provider failure so the UI can show a soft notice", async () => {
    mockFetch(json({ error: "No pudimos extraer estructura." }, 502));

    await expect(requestExtraction("idea")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("resolveProposal", () => {
  it("sends content only for a correction", async () => {
    const spy = mockFetch(json({ source: "edited", node: { id: "n1" } }));

    await resolveProposal("idea", "n1", "correct", "Mi texto");
    await resolveProposal("idea", "n1", "accept");

    const bodies = spy.mock.calls.map((call) =>
      JSON.parse((call as unknown as [string, RequestInit])[1].body as string),
    );
    expect(bodies[0]).toEqual({ decision: "correct", content: "Mi texto" });
    expect(bodies[1]).toEqual({ decision: "accept" });
  });
});

describe("arranque steps", () => {
  const stored = {
    id: "s1",
    ideaId: "i1",
    title: "Buscar proveedores de café",
    detail: "Comparar al menos tres opciones.",
    status: "open",
    createdAt: "2026-11-01T10:00:00.000Z",
  };

  it("lists the steps of an idea, oldest first as delivered", async () => {
    const spy = mockFetch(json({ steps: [stored] }));

    await expect(listArranqueSteps("i1")).resolves.toEqual([stored]);

    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${API_URL}/api/ideas/i1/steps`);
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
  });

  it("stores the steps the person accepted, one POST", async () => {
    const spy = mockFetch(json({ steps: [stored] }, 201));

    await addArranqueSteps("i1", [
      { title: "Buscar proveedores de café", detail: "Comparar al menos tres opciones." },
    ]);

    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${API_URL}/api/ideas/i1/steps`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      steps: [{ title: "Buscar proveedores de café", detail: "Comparar al menos tres opciones." }],
    });
  });

  it("returns the coach's step proposals without storing anything", async () => {
    const spy = mockFetch(
      json({ proposals: [{ title: "Definir proveedores", detail: null }], quotaReached: false }),
    );

    await expect(requestStepProposals("i1")).resolves.toEqual({
      kind: "ok",
      proposals: [{ title: "Definir proveedores", detail: null }],
    });

    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${API_URL}/api/ideas/i1/steps/proposals`);
    expect(init.method).toBe("POST");
  });

  it("turns a reached quota into an announced limit, not an error", async () => {
    mockFetch(json({ proposals: [], quotaReached: true }));

    await expect(requestStepProposals("i1")).resolves.toEqual({ kind: "quota" });
  });

  it("throws the API's message when the proposals fail", async () => {
    mockFetch(json({ error: "No pudimos proponer pasos." }, 502));

    const error = await requestStepProposals("i1").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
    expect((error as ApiError).message).toBe("No pudimos proponer pasos.");
  });

  it("completes or reopens a step through PATCH", async () => {
    const spy = mockFetch(json({ step: { ...stored, status: "done" } }));

    const step = await updateArranqueStepStatus("i1", "s1", "done");

    expect(step.status).toBe("done");
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${API_URL}/api/ideas/i1/steps/s1`);
    expect(init.method).toBe("PATCH");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({ status: "done" });
  });
});

describe("account", () => {
  it("reports the 403 of a non-demo account", async () => {
    mockFetch(json({ error: "Solo la cuenta demo se puede reiniciar." }, 403));

    const error = await resetDemo().catch((caught: unknown) => caught);

    expect((error as ApiError).status).toBe(403);
  });

  it("exposes the export as a URL for a browser download", () => {
    expect(exportUrl()).toBe(`${API_URL}/api/account/export`);
  });
});
