import { describe, expect, it } from "vitest";

import { readTextStream } from "./stream";

function streamOf(chunks: Uint8Array[]): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(chunk));
        controller.close();
      },
    }),
  );
}

describe("readTextStream", () => {
  it("reports the accumulated text after each chunk", async () => {
    const encoder = new TextEncoder();
    const seen: string[] = [];

    const text = await readTextStream(
      streamOf([encoder.encode("Empecemos "), encoder.encode("por el problema.")]),
      (partial) => seen.push(partial),
    );

    expect(text).toBe("Empecemos por el problema.");
    expect(seen[0]).toBe("Empecemos ");
    expect(seen.at(-1)).toBe("Empecemos por el problema.");
  });

  it("decodes a multi-byte character split across chunks", async () => {
    const bytes = new TextEncoder().encode("¿Qué?");
    // "¿" is two bytes: split it in the middle.
    const text = await readTextStream(streamOf([bytes.slice(0, 1), bytes.slice(1)]), () => {});

    expect(text).toBe("¿Qué?");
  });
});
