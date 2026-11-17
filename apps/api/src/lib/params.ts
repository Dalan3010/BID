import type { Context } from "hono";

import { badRequest } from "./http-error";

/**
 * A path parameter that must be there.
 *
 * Hono types `param()` as possibly undefined because the route pattern is not
 * part of the type. The pattern guarantees it, but the check keeps the rest of
 * the code free of `!`.
 */
export function requiredParam(context: Context, name: string): string {
  const value = context.req.param(name);

  if (!value) {
    throw badRequest(`Falta el parámetro ${name}.`);
  }

  return value;
}
