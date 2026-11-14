/**
 * Reads a plain-text streamed response.
 *
 * `POST /api/ideas/:id/messages` answers `text/plain` in chunks. This decodes
 * them as UTF-8 (a multi-byte character may be split across two chunks, which
 * `TextDecoder` with `stream: true` handles) and reports the accumulated text
 * after every chunk.
 *
 * @returns the complete text once the stream ends.
 */
export async function readTextStream(
  response: Response,
  onText: (text: string) => void,
): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    onText(text);
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      onText(text);
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  onText(text);
  return text;
}
