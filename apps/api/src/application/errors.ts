import type { NodeSource, NodeType } from "@bid/core";

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
 * Raised when manual authoring is attempted on a dimension that already has
 * validated nodes or pending proposals.
 *
 * Manual authoring only fills empty dimensions: a dimension with content is
 * edited, and a dimension with proposals is resolved first.
 */
export class DimensionNotEmptyError extends Error {
  readonly ideaId: string;
  readonly dimension: NodeType;

  constructor(ideaId: string, dimension: NodeType) {
    super(
      `Dimension "${dimension}" of idea ${ideaId} already has content or proposals`,
    );
    this.name = "DimensionNotEmptyError";
    this.ideaId = ideaId;
    this.dimension = dimension;
  }
}

/**
 * Raised when a node is resolved as a proposal but it is not pending anymore.
 *
 * Proposals are `inferred` nodes: once confirmed, edited or rejected, they can
 * no longer be resolved as if they still were a question.
 */
export class NotAProposalError extends Error {
  readonly nodeId: string;

  constructor(nodeId: string) {
    super(`Node is not a pending proposal: ${nodeId}`);
    this.name = "NotAProposalError";
    this.nodeId = nodeId;
  }
}

/** Raised when a requested version does not exist for the idea. */
export class VersionNotFoundError extends Error {
  readonly ideaId: string;
  readonly version: number;

  constructor(ideaId: string, version: number) {
    super(`Version not found: idea ${ideaId}, version ${version}`);
    this.name = "VersionNotFoundError";
    this.ideaId = ideaId;
    this.version = version;
  }
}

/** Raised when a requested arranque step does not exist for the idea. */
export class StepNotFoundError extends Error {
  readonly ideaId: string;
  readonly stepId: string;

  constructor(ideaId: string, stepId: string) {
    super(`Step not found: idea ${ideaId}, step ${stepId}`);
    this.name = "StepNotFoundError";
    this.ideaId = ideaId;
    this.stepId = stepId;
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
