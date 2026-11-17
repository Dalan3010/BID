import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { NODE_TYPES, type IdeaGraph } from "@bid/core";

/**
 * Database schema.
 *
 * Design decision (D7): the current state of an idea is stored **normalized**
 * (one row per node) while historical snapshots are stored **denormalized**
 * (`idea_versions.graph` as `jsonb`). Editing a node is then a single conditional
 * `UPDATE`, and the merge precedence rule of the domain can be enforced
 * atomically without rewriting a whole document.
 *
 * @see docs/arquitectura.md, "Persistencia"
 */

/**
 * The ten dimensions, taken straight from the domain so the database cannot
 * accept a value the application does not know about.
 */
export const nodeTypeEnum = pgEnum("node_type", NODE_TYPES);

/** Provenance of a node. See `NodeSource` in the domain. */
export const nodeSourceEnum = pgEnum("node_source", [
  "inferred",
  "confirmed",
  "edited",
]);

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

/**
 * Owner of ideas.
 *
 * The shape mirrors what Better Auth expects from its user model, so Phase 2 can
 * point Better Auth at this table instead of creating a second one. `id` is
 * `text` because Better Auth generates string identifiers.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Better Auth tables.
 *
 * Column names stay snake_case like the rest of the schema; the property names
 * are the ones Better Auth expects, which is what the Drizzle adapter reads.
 * `users` doubles as Better Auth's `user` model (see
 * `src/infrastructure/auth/auth.ts`), so there is a single source of identity.
 */

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    /** Hashed password for the credential provider. Never plaintext. */
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const ideas = pgTable(
  "ideas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("ideas_owner_id_idx").on(table.ownerId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_idea_created_idx").on(table.ideaId, table.createdAt),
  ],
);

export const nodes = pgTable(
  "nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    type: nodeTypeEnum("type").notNull(),
    content: text("content").notNull(),
    source: nodeSourceEnum("source").notNull().default("inferred"),
    /** Message that originated the node. Null when written by hand. */
    messageId: uuid("message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    /** Model confidence for `inferred` nodes. Null otherwise. */
    confidence: real("confidence"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("nodes_idea_type_idx").on(table.ideaId, table.type),
    index("nodes_idea_source_idx").on(table.ideaId, table.source),
  ],
);

/**
 * Immutable snapshot of a whole graph. Written only when the user validates a
 * change, never on every keystroke.
 */
export const ideaVersions = pgTable(
  "idea_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    graph: jsonb("graph").$type<IdeaGraph>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idea_versions_idea_version_idx").on(
      table.ideaId,
      table.version,
    ),
  ],
);

/** Row shape of each table, useful for repositories and tests. */
export type UserRow = typeof users.$inferSelect;
export type IdeaRow = typeof ideas.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
export type NodeRow = typeof nodes.$inferSelect;
export type IdeaVersionRow = typeof ideaVersions.$inferSelect;
