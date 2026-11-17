import type { NodeSource } from "@bid/core";

/**
 * Errors the application layer raises.
 *
 * They are distinct classes so a transport (a route handler, a CLI script) can
 * map each one to the right status code without parsing messages.
 */

export class IdeaNotFoundError extends Error {
  readonly ideaId: string;

  constructor(ideaId: string) {
    super(`Idea not found: ${ideaId}`);
    this.name = "IdeaNotFoundError";
    this.ideaId = ideaId;
  }
}

export class NodeNotFoundError extends Error {
  readonly nodeId: string;

  constructor(nodeId: string) {
    super(`Node not found: ${nodeId}`);
    this.name = "NodeNotFoundError";
    this.nodeId = nodeId;
  }
}

export class InvalidIdeaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidIdeaError";
  }
}

export class InvalidNodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidNodeError";
  }
}

export class SourceTransitionError extends Error {
  readonly from: NodeSource;
  readonly to: NodeSource;

  constructor(from: NodeSource, to: NodeSource) {
    super(`Cannot change provenance from "${from}" to "${to}"`);
    this.name = "SourceTransitionError";
    this.from = from;
    this.to = to;
  }
}

export class NodeNotEditableError extends Error {
  readonly source: NodeSource;

  constructor(source: NodeSource) {
    super(
      `A node with provenance "${source}" cannot be edited directly. Confirm it first.`,
    );
    this.name = "NodeNotEditableError";
    this.source = source;
  }
}

/**
 * Raised when an account other than the public demo asks to reset the demo.
 *
 * The reset deletes ideas: a real account must never reach it, even by
 * calling the endpoint by hand.
 */
export class NotDemoAccountError extends Error {
  constructor() {
    super("Only the demo account can be reset.");
    this.name = "NotDemoAccountError";
  }
}
