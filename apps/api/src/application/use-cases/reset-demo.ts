import { NotDemoAccountError } from "../errors";
import type { DemoBook } from "../ports/demo-book";

/**
 * Restores the seeded demo book (RF-73).
 *
 * The guard lives here, not in the route, so it holds no matter who calls it:
 * only the demo account may reset, and it only ever resets its own ideas.
 */
export async function resetDemo(
  user: { readonly id: string; readonly email: string },
  demoBook: DemoBook,
): Promise<void> {
  if (user.email.toLowerCase() !== demoBook.ownerEmail.toLowerCase()) {
    throw new NotDemoAccountError();
  }

  await demoBook.restore(user.id);
}
