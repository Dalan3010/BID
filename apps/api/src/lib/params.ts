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

/**
 * A path parameter that must be a positive integer.
 *
 * Versions are numbered from 1; `0`, a negative number or a word is a
 * transport problem, not a missing row, so it answers 400 instead of 404.
 */
export function requiredIntParam(context: Context, name: string): number {
  return positiveInt(requiredParam(context, name), name);
}

/** An optional query string that, when present, must be a positive integer. */
export function optionalIntQuery(
  context: Context,
  name: string,
): number | undefined {
  const value = context.req.query(name);

  if (value === undefined) {
    return undefined;
  }

  return positiveInt(value, name);
}

function positiveInt(value: string, name: string): number {
  if (!/^\d+$/.test(value)) {
    throw badRequest(`El parámetro ${name} debe ser un entero positivo.`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw badRequest(`El parámetro ${name} debe ser un entero positivo.`);
  }

  return parsed;
}
