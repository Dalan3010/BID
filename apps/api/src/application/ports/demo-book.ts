/**
 * The seeded demo book (RF-70, RF-73).
 *
 * The demo account is public: its credentials are on the sign-in page. That is
 * why restoring its book is a port of its own and not a general "delete my
 * data" operation: the only thing it can ever rebuild is the demo account.
 */
export interface DemoBook {
  /** Email of the public demo account. Only that account may restore. */
  readonly ownerEmail: string;

  /**
   * Replaces every idea of `ownerId` with the seeded book.
   *
   * Conversations, nodes and versions go with their ideas, so the walkthrough
   * can be repeated from the same starting point.
   */
  restore(ownerId: string): Promise<void>;
}
