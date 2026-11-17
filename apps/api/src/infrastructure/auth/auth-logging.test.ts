import { describe, expect, it, vi } from "vitest";

import { announceEmail } from "./auth";

/**
 * A reset token is a bearer credential: whoever reads it can reset the
 * password and take over the account. A server log is read by people, shipped
 * to aggregators and kept for a long time, so the token must not be there.
 *
 * These tests pin the redaction. They need no database: they only check what
 * the module would write to the log.
 */

describe("auth link logging", () => {
  it("never writes the reset token to the log by default", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    try {
      announceEmail(
        "password reset",
        "person@example.com",
        "http://localhost:3000/reset-password?token=super-secret-reset-token",
        "token",
      );

      const written = spy.mock.calls.map((call) => String(call[0])).join("\n");

      expect(written).not.toContain("super-secret-reset-token");
      expect(written).toContain("REDACTED");
      // The email is not a secret and it is what makes the log useful.
      expect(written).toContain("person@example.com");
    } finally {
      spy.mockRestore();
    }
  });

  it("never writes the email change confirmation token to the log", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    try {
      announceEmail(
        "email change",
        "person@example.com -> other@example.com",
        "http://localhost:3001/api/auth/change-email/confirm?token=super-secret-change-token",
        "token",
      );

      const written = spy.mock.calls.map((call) => String(call[0])).join("\n");

      expect(written).not.toContain("super-secret-change-token");
      expect(written).toContain("REDACTED");
    } finally {
      spy.mockRestore();
    }
  });

  it("keeps the rest of the link so the flow stays debuggable", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    try {
      announceEmail(
        "password reset",
        "person@example.com",
        "http://localhost:3000/reset-password?token=super-secret-reset-token&source=web",
        "token",
      );

      const written = String(spy.mock.calls[0]?.[0]);

      expect(written).toContain("/reset-password");
      expect(written).toContain("source=web");
    } finally {
      spy.mockRestore();
    }
  });

  it("never writes the email verification token to the log", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    try {
      announceEmail(
        "email verification",
        "person@example.com",
        "http://localhost:3001/api/auth/verify-email?token=super-secret-verify-token&callbackURL=http%3A%2F%2Flocalhost%3A3000%2Fprofile",
        "token",
      );

      const written = spy.mock.calls.map((call) => String(call[0])).join("\n");

      expect(written).not.toContain("super-secret-verify-token");
      expect(written).toContain("REDACTED");
    } finally {
      spy.mockRestore();
    }
  });

  it("writes the full link only when AUTH_LOG_SECRETS is explicitly enabled", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const previous = process.env.AUTH_LOG_SECRETS;

    try {
      process.env.AUTH_LOG_SECRETS = "1";

      announceEmail(
        "password reset",
        "person@example.com",
        "http://localhost:3000/reset-password?token=super-secret-reset-token",
        "token",
      );

      const written = spy.mock.calls.map((call) => String(call[0])).join("\n");

      // The development escape hatch still works: without it the flow would be
      // unusable while there is no mail provider.
      expect(written).toContain("super-secret-reset-token");
    } finally {
      if (previous === undefined) {
        delete process.env.AUTH_LOG_SECRETS;
      } else {
        process.env.AUTH_LOG_SECRETS = previous;
      }

      spy.mockRestore();
    }
  });
});
