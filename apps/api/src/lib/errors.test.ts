import { describe, expect, it } from "vitest";

import {
  DimensionNotEmptyError,
  NotAProposalError,
  VersionNotFoundError,
} from "../application/errors";
import { statusFor } from "./errors";

/**
 * The domain-to-HTTP mapping.
 *
 * The application layer raises typed errors; this table decides the status.
 * Unknown errors must stay unmapped so the app can answer a generic 500
 * instead of turning an infrastructure failure into a 404.
 */
describe("statusFor", () => {
  it("maps a non-empty dimension to 409", () => {
    expect(statusFor(new DimensionNotEmptyError("idea-1", "problem"))).toBe(409);
  });

  it("maps a node that is not a pending proposal to 409", () => {
    expect(statusFor(new NotAProposalError("node-1"))).toBe(409);
  });

  it("maps a missing version to 404", () => {
    expect(statusFor(new VersionNotFoundError("idea-1", 3))).toBe(404);
  });

  it("leaves unknown errors unmapped", () => {
    expect(statusFor(new Error("boom"))).toBeNull();
  });
});
