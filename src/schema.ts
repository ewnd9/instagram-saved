import { pgTable, serial, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const savedPosts = pgTable('saved_posts', {
  id: serial('id').primaryKey(),
  instagramPostId: varchar('instagram_post_id', { length: 255 }).unique().notNull(),
  username: varchar('username', { length: 255 }),
  caption: text('caption'),
  imageUrl: text('image_url'),
  postUrl: text('post_url').notNull(),
  likesCount: integer('likes_count').default(0),
  commentsCount: integer('comments_count').default(0),
  postDate: timestamp('post_date'),
  savedAt: timestamp('saved_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  usernameIdx: index('idx_saved_posts_username').on(table.username),
  savedAtIdx: index('idx_saved_posts_saved_at').on(table.savedAt),
  postDateIdx: index('idx_saved_posts_post_date').on(table.postDate)
}));

export type SavedPost = typeof savedPosts.$inferSelect;
export type NewSavedPost = typeof savedPosts.$inferInsert;