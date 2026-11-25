import { DEMO_CREDENTIALS } from "../db/demo-book";

/**
 * The public demo account.
 *
 * Its credentials are on the sign-in page, so the account is shared by every
 * visitor and has to stay read-only: renaming it, moving it to another email,
 * replacing its password or deleting it would break the demo for everybody
 * else. The profile UI hides those actions and the API refuses them, because
 * hiding a button is not a permission.
 */
export const DEMO_ACCOUNT_EMAIL = DEMO_CREDENTIALS.email;

export function isDemoAccount(email: string): boolean {
  return email.trim().toLowerCase() === DEMO_ACCOUNT_EMAIL;
}
