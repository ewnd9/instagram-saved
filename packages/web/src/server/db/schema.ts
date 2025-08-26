// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { index, pgTableCreator } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `web_${name}`);

export const collections = createTable(
  "collection",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    user: d.varchar({ length: 255 }).notNull(),
    name: d.varchar({ length: 255 }).notNull(),
    url: d.text().notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("user_idx").on(t.user),
    index("name_idx").on(t.name),
  ]
);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.varchar({ length: 255 }).primaryKey(),
    url: d.text().notNull(),
    collectionId: d.varchar({ length: 255 }).notNull().references(() => collections.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("collection_idx").on(t.collectionId),
  ]
);

export const collectionsRelations = relations(collections, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  collection: one(collections, {
    fields: [posts.collectionId],
    references: [collections.id],
  }),
}));
