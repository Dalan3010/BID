/**
 * Port: web search used to ground the coach's real-world answers.
 *
 * Some questions of the arranque are about the world, not about the idea: who
 * sells the inputs, which route reaches the customers, where a premises is
 * available. The coach cannot answer those from the conversation, so it asks
 * for a search and cites the links (S3).
 *
 * Same rule as the other ports: the application knows the shape, not the
 * vendor. Two implementations are expected — a live one behind an API key and
 * a scripted one for the demo — so swapping providers is one file.
 *
 * @see docs/arquitectura.md, "Un puerto, dos implementaciones"
 */
export interface WebSearch {
  /**
   * Searches the web for `query` and returns a short list of results.
   *
   * A query with nothing useful returns an empty list, not an error: "no
   * encontré nada" is a valid answer the coach can say.
   */
  search(query: string): Promise<readonly SearchResult[]>;
}

/** One result of the search, ready to be cited. */
export interface SearchResult {
  /** The title of the page. */
  readonly title: string;
  /** Where the data comes from. The coach cites this link. */
  readonly url: string;
  /** The relevant excerpt of the page. */
  readonly snippet: string;
}
