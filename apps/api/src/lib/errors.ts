import {
  DimensionNotEmptyError,
  IdeaNotFoundError,
  NotDemoAccountError,
  NotAProposalError,
  InvalidIdeaError,
  InvalidNodeError,
  NodeNotEditableError,
  NodeNotFoundError,
  SourceTransitionError,
  VersionNotFoundError,
} from "../application/errors";

/**
 * Maps a domain error to an HTTP status.
 *
 * The mapping lives here and not in the use cases: the application does not
 * know what a status code is.
 */
export function statusFor(error: unknown): number | null {
  if (error instanceof NotDemoAccountError) return 403;
  if (error instanceof IdeaNotFoundError) return 404;
  if (error instanceof NodeNotFoundError) return 404;
  if (error instanceof NodeNotEditableError) return 409;
  if (error instanceof SourceTransitionError) return 409;
  if (error instanceof DimensionNotEmptyError) return 409;
  if (error instanceof NotAProposalError) return 409;
  if (error instanceof VersionNotFoundError) return 404;
  if (error instanceof InvalidIdeaError) return 400;
  if (error instanceof InvalidNodeError) return 400;

  return null;
}
