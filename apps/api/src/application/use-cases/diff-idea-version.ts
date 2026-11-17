import { diffGraphs, type GraphDiff } from "@bid/core";
import { IdeaNotFoundError, InvalidIdeaError, VersionNotFoundError } from "../errors";
import type {
  IdeaRepository,
  IdeaVersion,
  IdeaVersionSummary,
} from "../ports/idea-repository";

export interface DiffIdeaVersionInput {
  readonly ideaId: string;
  readonly ownerId: string;
  readonly version: number;
  readonly against?: number;
}

/** A graph diff plus the summaries of the versions it compares. */
export interface VersionDiff extends GraphDiff {
  readonly from: IdeaVersionSummary | null;
  readonly to: IdeaVersionSummary;
}

/**
 * Compares a version against another one of the same idea.
 *
 * `against` defaults to the immediately previous version. Version 1 has no
 * history behind it, so every node shows up as added. An explicit `against`
 * must be a positive integer smaller than the version being compared.
 */
export async function diffIdeaVersion(
  repository: IdeaRepository,
  input: DiffIdeaVersionInput,
): Promise<VersionDiff> {
  const idea = await repository.findById(input.ideaId);

  if (!idea || idea.ownerId !== input.ownerId) {
    throw new IdeaNotFoundError(input.ideaId);
  }

  const to = await repository.findVersion(input.ideaId, input.version);

  if (!to) {
    throw new VersionNotFoundError(input.ideaId, input.version);
  }

  const against = input.against ?? input.version - 1;

  if (input.against !== undefined) {
    if (!Number.isInteger(against) || against < 1 || against >= input.version) {
      throw new InvalidIdeaError(
        "La versión contra la que comparás no es válida.",
      );
    }
  }

  if (against < 1) {
    return {
      ...diffGraphs(null, to.graph),
      from: null,
      to: summaryOf(to),
    };
  }

  const previous = await repository.findVersion(input.ideaId, against);

  if (!previous) {
    throw new VersionNotFoundError(input.ideaId, against);
  }

  return {
    ...diffGraphs(previous.graph, to.graph),
    from: summaryOf(previous),
    to: summaryOf(to),
  };
}

function summaryOf(version: IdeaVersion): IdeaVersionSummary {
  return {
    version: version.version,
    createdAt: version.createdAt,
    nodeCount: version.graph.nodes.length,
  };
}
