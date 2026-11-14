#!/usr/bin/env node
/**
 * BID — local API mock for previewing the UI.
 *
 * This is NOT a backend. It has no database, no real authentication and no AI:
 * it answers the contract the client already speaks (`Frontend/src/lib/api.ts`
 * and Better Auth's routes) with in-memory fixtures, so every screen can be
 * reviewed without the real API.
 *
 * Run it next to the client:
 *
 *   pnpm mock:api        # this server on :3001
 *   pnpm dev             # the client on :3000
 *
 * or both at once with `pnpm ui`.
 *
 * Anything that depends on real behaviour is simulated: any email/password
 * signs in, the coach replies from a script, and state resets when the process
 * restarts (or when the profile screen calls `POST /api/demo/reset`).
 */

import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_API_PORT ?? 3001);
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const DEMO_USER = {
  id: "user_demo",
  name: "Dana Ríos",
  email: "demo@bid.local",
  emailVerified: true,
  image: null,
  createdAt: "2026-10-02T09:12:00.000Z",
  updatedAt: "2026-11-10T18:30:00.000Z",
};

const NOW = "2026-11-12T10:00:00.000Z";

/** A node the human validated. Only these close a dimension in the domain. */
function validated(id, ideaId, type, content, messageId = null) {
  return {
    id,
    ideaId,
    type,
    content,
    source: "confirmed",
    messageId,
    confidence: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

/** An AI proposal the user has not decided on yet. */
function proposed(id, ideaId, type, content, confidence = 0.74) {
  return {
    id,
    ideaId,
    type,
    content,
    source: "inferred",
    messageId: null,
    confidence,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function seed() {
  const ideas = [
    {
      id: "idea_panaderia",
      title: "Panadería de masa madre a domicilio",
      summary:
        "Suscripción semanal de panes de fermentación lenta para barrios con poca oferta artesanal.",
    },
    {
      id: "idea_vet",
      title: "Turnos para veterinarias independientes",
      summary: "Agenda compartida y recordatorios por WhatsApp para clínicas de una sola sede.",
    },
  ].map((idea, index) => ({
    ...idea,
    ownerId: DEMO_USER.id,
    createdAt: index === 0 ? "2026-10-14T08:00:00.000Z" : "2026-10-28T08:00:00.000Z",
    updatedAt: index === 0 ? "2026-11-11T19:20:00.000Z" : "2026-11-06T12:05:00.000Z",
  }));

  const nodes = [
    // Panadería: 7 of 10 validated, one dimension under review.
    validated("n_pan_1", "idea_panaderia", "problem", "El barrio solo tiene pan industrial: llega blando y dura un día.", "m_pan_1"),
    validated("n_pan_2", "idea_panaderia", "segment", "Familias de 30-45 años en barrios residenciales, con poco tiempo para comprar a diario.", "m_pan_2"),
    validated("n_pan_3", "idea_panaderia", "value_proposition", "Pan de masa madre real, entregado el mismo día que sale del horno.", "m_pan_3"),
    validated("n_pan_4", "idea_panaderia", "solution", "Suscripción semanal con dos hornadas fijas y reparto en bicicleta.", "m_pan_4"),
    validated("n_pan_5", "idea_panaderia", "channels", "Instagram local, boca a boca y una parada fija los sábados.", "m_pan_5"),
    validated("n_pan_6", "idea_panaderia", "revenue", "Suscripción de 18 €/mes por hogar; el pan suelto, 4,50 €.", "m_pan_6"),
    validated("n_pan_7", "idea_panaderia", "risks", "Un horno caído un viernes deja a 40 hogares sin entrega.", "m_pan_7"),
    proposed("n_pan_8", "idea_panaderia", "costs", "Harina ecológica, energía del horno y reparto rondan los 3,20 € por hogar y hornada.", 0.71),
    proposed("n_pan_9", "idea_panaderia", "costs", "Un local compartido añadiría 350 € fijos al mes.", 0.58),

    // Veterinaria: 3 of 10, the rest open.
    validated("n_vet_1", "idea_vet", "problem", "Las clínicas pequeñas pierden turnos porque agendan por WhatsApp a mano.", null),
    validated("n_vet_2", "idea_vet", "segment", "Veterinarias de una sola sede con dos o tres profesionales.", null),
    validated("n_vet_3", "idea_vet", "value_proposition", "Agenda que el dueño de la mascota llena solo, sin llamadas.", null),
  ];

  const messages = [
    {
      id: "m_pan_1",
      ideaId: "idea_panaderia",
      role: "assistant",
      content:
        "Empecemos por el problema. No el que imaginas, el que tu cliente siente esta semana: ¿qué le pasa hoy cuando quiere pan de verdad?",
      createdAt: "2026-10-14T08:02:00.000Z",
    },
    {
      id: "m_pan_2",
      ideaId: "idea_panaderia",
      role: "user",
      content: "En mi barrio solo hay pan de supermercado y hay que ir en coche al centro para algo bueno.",
      createdAt: "2026-10-14T08:05:00.000Z",
    },
    {
      id: "m_pan_3",
      ideaId: "idea_panaderia",
      role: "assistant",
      content:
        "Ahí está la tensión: calidad contra tiempo. Ahora acota quién lo vive con más urgencia. ¿Familias, oficinas, restaurantes?",
      createdAt: "2026-10-14T08:06:00.000Z",
    },
    {
      id: "m_pan_4",
      ideaId: "idea_panaderia",
      role: "user",
      content: "Familias del barrio que ya compran cosas orgánicas y no tienen tiempo de ir al centro.",
      createdAt: "2026-10-14T09:40:00.000Z",
    },
    {
      id: "m_pan_5",
      ideaId: "idea_panaderia",
      role: "assistant",
      content:
        "Bien. Antes de seguir, dime qué pasa si un viernes el horno falla: los riesgos definen si esto aguanta o no.",
      createdAt: "2026-11-11T19:20:00.000Z",
    },
  ];

  return { signedIn: false, user: { ...DEMO_USER }, ideas, nodes, messages };
}

let state = seed();

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "http://localhost:3000";
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "origin",
  };
}

function sendJson(res, status, body, extra = {}) {
  const payload = body === null ? "null" : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    ...res.cors,
    ...extra,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
  });
}

function sessionBody() {
  const now = new Date().toISOString();
  return {
    session: {
      id: "session_mock",
      userId: state.user.id,
      token: "mock-token",
      expiresAt: "2027-11-12T10:00:00.000Z",
      createdAt: now,
      updatedAt: now,
      ipAddress: "127.0.0.1",
      userAgent: "mock",
    },
    user: state.user,
  };
}

const NODE_TYPES = [
  "problem",
  "segment",
  "value_proposition",
  "solution",
  "channels",
  "revenue",
  "costs",
  "competition",
  "metrics",
  "risks",
];

function graphOf(ideaId) {
  return { ideaId, nodes: state.nodes.filter((node) => node.ideaId === ideaId) };
}

function messagesOf(ideaId) {
  return state.messages.filter((message) => message.ideaId === ideaId);
}

function gapsOf(ideaId) {
  const nodes = state.nodes.filter((node) => node.ideaId === ideaId);
  return NODE_TYPES.flatMap((type) => {
    const ofType = nodes.filter((node) => node.type === type);
    if (ofType.some((node) => node.source !== "inferred")) return [];
    return [{ type, hasProposals: ofType.length > 0 }];
  });
}

function progressOf(idea) {
  const graph = graphOf(idea.id);
  const filled = NODE_TYPES.filter((type) =>
    graph.nodes.some((node) => node.type === type && node.source !== "inferred"),
  ).length;

  return {
    idea,
    completion: filled / NODE_TYPES.length,
    gaps: gapsOf(idea.id).length,
    nodeCount: graph.nodes.length,
    agenda: gapsOf(idea.id),
  };
}

const COACH_REPLY = (idea) => {
  const next = gapsOf(idea.id)[0];
  const focus = next
    ? {
        costs: "los costos reales de una unidad",
        competition: "quién más resuelve esto y por qué elegirte",
        metrics: "cómo sabrás en 30 días si está funcionando",
        problem: "el problema exacto",
        segment: "para quién es y para quién no",
        value_proposition: "qué prometes en una frase",
        solution: "cómo lo entregas",
        channels: "dónde te encuentran",
        revenue: "cómo entra el dinero",
        risks: "qué te tumba si sale mal",
      }[next.type]
    : "el siguiente paso del plan";

  return `Tomo nota. Antes de avanzar, aterricemos ${focus}: ¿qué número o hecho concreto lo demuestra? Si no puedes medirlo, todavía es una intención.`;
};

/* -------------------------------------------------------------------------- */
/* Routes                                                                     */
/* -------------------------------------------------------------------------- */

async function handleAuth(req, res, url, origin) {
  const path = url.pathname;

  if (path === "/api/auth/get-session") {
    return sendJson(res, 200, state.signedIn ? sessionBody() : null);
  }

  if (path === "/api/auth/sign-in/email" && req.method === "POST") {
    const body = await readBody(req);
    state.signedIn = true;
    if (typeof body.email === "string" && body.email.trim()) {
      state.user = { ...state.user, email: body.email.trim() };
    }
    return sendJson(res, 200, {
      token: "mock-token",
      redirect: false,
      url: null,
      user: state.user,
    });
  }

  if (path === "/api/auth/sign-up/email" && req.method === "POST") {
    const body = await readBody(req);
    state.signedIn = true;
    state.user = {
      ...state.user,
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : state.user.name,
      email:
        typeof body.email === "string" && body.email.trim() ? body.email.trim() : state.user.email,
    };
    return sendJson(res, 200, { token: "mock-token", user: state.user });
  }

  if (path === "/api/auth/sign-out" && req.method === "POST") {
    state.signedIn = false;
    return sendJson(res, 200, { success: true });
  }

  if (path === "/api/auth/update-user" && req.method === "POST") {
    const body = await readBody(req);
    if (typeof body.name === "string" && body.name.trim()) {
      state.user = { ...state.user, name: body.name.trim() };
    }
    return sendJson(res, 200, { status: true, user: state.user });
  }

  if (path === "/api/auth/change-email" && req.method === "POST") {
    const body = await readBody(req);
    const email = typeof body.newEmail === "string" ? body.newEmail.trim() : state.user.email;
    state.user = { ...state.user, email };
    return sendJson(res, 200, { status: true, user: state.user });
  }

  if (path === "/api/auth/change-password" && req.method === "POST") {
    return sendJson(res, 200, { status: true });
  }

  if (path === "/api/auth/delete-user" && req.method === "POST") {
    state.signedIn = false;
    return sendJson(res, 200, { success: true });
  }

  if (path === "/api/auth/request-password-reset" && req.method === "POST") {
    return sendJson(res, 200, { status: true });
  }

  if (path === "/api/auth/reset-password" && req.method === "POST") {
    return sendJson(res, 200, { status: true });
  }

  // Any other Better Auth route answers a benign success: the UI only needs
  // the call to resolve while previewing.
  return sendJson(res, 200, { status: true, token: "mock-token" });
}

async function handleApi(req, res, url) {
  const path = url.pathname;

  if (!state.signedIn) {
    return sendJson(res, 401, { error: "Tu sesión caducó. Vuelve a entrar." });
  }

  if (path === "/api/ideas" && req.method === "GET") {
    return sendJson(res, 200, {
      ideas: state.ideas.map(progressOf),
    });
  }

  if (path === "/api/ideas" && req.method === "POST") {
    const body = await readBody(req);
    const title = String(body.title ?? "").trim();
    if (!title) return sendJson(res, 422, { error: "La idea necesita un título." });

    const now = new Date().toISOString();
    const idea = {
      id: `idea_${state.ideas.length + 1}_${Date.now().toString(36)}`,
      ownerId: state.user.id,
      title: title.slice(0, 120),
      summary: "",
      createdAt: now,
      updatedAt: now,
    };
    state.ideas = [idea, ...state.ideas];
    return sendJson(res, 201, { idea });
  }

  const ideaMatch = path.match(/^\/api\/ideas\/([^/]+)$/);
  if (ideaMatch && req.method === "GET") {
    const idea = state.ideas.find((item) => item.id === decodeURIComponent(ideaMatch[1]));
    if (!idea) return sendJson(res, 404, { error: "Esa idea no existe." });

    const graph = graphOf(idea.id);
    return sendJson(res, 200, {
      idea,
      graph,
      messages: messagesOf(idea.id),
      proposals: graph.nodes.filter((node) => node.source === "inferred"),
    });
  }

  const messageMatch = path.match(/^\/api\/ideas\/([^/]+)\/messages$/);
  if (messageMatch && req.method === "POST") {
    const idea = state.ideas.find((item) => item.id === decodeURIComponent(messageMatch[1]));
    if (!idea) return sendJson(res, 404, { error: "Esa idea no existe." });

    const body = await readBody(req);
    const content = String(body.content ?? "").trim();
    if (!content) return sendJson(res, 422, { error: "El mensaje está vacío." });

    const now = new Date().toISOString();
    state.messages.push({
      id: `m_${state.messages.length + 1}`,
      ideaId: idea.id,
      role: "user",
      content,
      createdAt: now,
    });

    // Plain text, chunked: this is what `readTextStream` consumes.
    res.writeHead(200, {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      ...res.cors,
    });

    const reply = COACH_REPLY(idea);
    try {
      for (const chunk of reply.match(/.{1,18}/gs) ?? []) {
        res.write(chunk);
        await sleep(35);
      }
      state.messages.push({
        id: `m_${state.messages.length + 1}`,
        ideaId: idea.id,
        role: "assistant",
        content: reply,
        createdAt: new Date().toISOString(),
      });
      res.end();
    } catch {
      // The browser aborted the stream (navigation or unmount): nothing to do.
      res.end();
    }
    return;
  }

  const extractionMatch = path.match(/^\/api\/ideas\/([^/]+)\/extractions$/);
  if (extractionMatch && req.method === "POST") {
    const idea = state.ideas.find((item) => item.id === decodeURIComponent(extractionMatch[1]));
    if (!idea) return sendJson(res, 404, { error: "Esa idea no existe." });

    const open = gapsOf(idea.id).filter((gap) => !gap.hasProposals).slice(0, 2);
    const proposals = open.map((gap, index) =>
      proposed(
        `n_prop_${Date.now().toString(36)}_${index}`,
        idea.id,
        gap.type,
        EXTRACTION_COPY[gap.type] ?? "Una propuesta por revisar.",
        0.6 + index * 0.09,
      ),
    );
    state.nodes.push(...proposals);

    return sendJson(res, 200, {
      proposals: proposals.map(({ id, type, content, confidence }) => ({
        id,
        type,
        content,
        confidence,
      })),
    });
  }

  const proposalMatch = path.match(/^\/api\/ideas\/([^/]+)\/proposals\/([^/]+)$/);
  if (proposalMatch && req.method === "POST") {
    const nodeId = decodeURIComponent(proposalMatch[2]);
    const node = state.nodes.find(
      (item) => item.id === nodeId && item.ideaId === decodeURIComponent(proposalMatch[1]),
    );
    if (!node) return sendJson(res, 404, { error: "Esa propuesta ya no está disponible." });

    const body = await readBody(req);
    const now = new Date().toISOString();

    if (body.decision === "discard") {
      state.nodes = state.nodes.filter((item) => item.id !== node.id);
      return sendJson(res, 200, { source: null, node: null });
    }

    const source = body.decision === "correct" ? "edited" : "confirmed";
    const content =
      body.decision === "correct" && typeof body.content === "string" && body.content.trim()
        ? body.content.trim()
        : node.content;

    Object.assign(node, { source, content, confidence: null, updatedAt: now });
    return sendJson(res, 200, { source, node });
  }

  if (path === "/api/demo/reset" && req.method === "POST") {
    state = seed();
    state.signedIn = true;
    return sendJson(res, 200, { ok: true });
  }

  if (path === "/api/account/export" && req.method === "GET") {
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        user: state.user,
        ideas: state.ideas.map((idea) => ({
          ...idea,
          graph: graphOf(idea.id),
          messages: messagesOf(idea.id),
        })),
      },
      null,
      2,
    );
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="bid-export.json"',
      ...res.cors,
    });
    return res.end(payload);
  }

  return sendJson(res, 404, { error: "Ruta no implementada en el mock." });
}

const EXTRACTION_COPY = {
  problem: "El cliente pierde una hora al día resolviendo esto a mano.",
  segment: "Familias de 30-45 años en barrios residenciales.",
  value_proposition: "Lo mismo que ya compra, pero hecho el mismo día.",
  solution: "Suscripción con dos entregas fijas por semana.",
  channels: "Instagram local y una parada fija los sábados.",
  revenue: "18 € al mes por hogar, cobrado por adelantado.",
  costs: "3,20 € por hogar y hornada entre insumos, energía y reparto.",
  competition: "La panadería del centro compite con precio, no con frescura.",
  metrics: "Retención a 8 semanas por encima del 70%.",
  risks: "Una avería del horno deja sin entrega a toda la cartera.",
};

/* -------------------------------------------------------------------------- */
/* Server                                                                     */
/* -------------------------------------------------------------------------- */

const server = createServer(async (req, res) => {
  const origin = req.headers.origin ?? "";
  res.cors = corsHeaders(origin);
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, res.cors);
    return res.end();
  }

  try {
    if (url.pathname.startsWith("/api/auth/")) {
      return await handleAuth(req, res, url, origin);
    }
    if (url.pathname.startsWith("/api/")) {
      return await handleApi(req, res, url);
    }
    return sendJson(res, 404, { error: "El mock solo sirve /api/*." });
  } catch (error) {
    console.error("[mock] error:", error);
    return sendJson(res, 500, { error: "Fallo interno del mock." });
  }
});

server.listen(PORT, () => {
  console.log(`[mock] BID API mock on http://localhost:${PORT}`);
  console.log("[mock] no database, no real auth, no AI — UI preview only");
  console.log("[mock] signed out: open http://localhost:3000 and use the demo button");
});
