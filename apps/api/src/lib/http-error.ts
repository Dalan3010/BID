/**
 * An error the transport knows how to answer.
 *
 * The application layer raises domain errors; this is the HTTP one. Keeping
 * them apart is what lets the use cases run unchanged behind any transport.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function unauthorized(): HttpError {
  return new HttpError(401, "No hay sesión.");
}

export function notFound(message: string): HttpError {
  return new HttpError(404, message);
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, message);
}
