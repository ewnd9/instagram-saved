import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, sql, count, desc } from "drizzle-orm";
import { savedPosts, type SavedPost, type NewSavedPost } from "./schema";

interface Post {
  instagram_post_id: string;
  username?: string | null;
  caption?: string | null;
  image_url?: string | null;
  post_url: string;
  likes_count?: number;
  comments_count?: number;
  post_date?: string | null;
}

interface PostResult {
  id: number;
  instagram_post_id: string;
}

interface DatabaseStats {
  total_posts: number;
  unique_users: number;
  top_users: Array<{
    username: string;
    post_count: string;
  }>;
}

class Database {
  private pool: Pool;
  private db: ReturnType<typeof drizzle>;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
    });
    this.db = drizzle(this.pool);
  }

  async connect(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      console.log("Connected to PostgreSQL database");
      client.release();
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to connect to database:", errorMessage);
      throw error;
    }
  }

  async insertPost(post: Post): Promise<PostResult> {
    try {
      const newPost: NewSavedPost = {
        instagramPostId: post.instagram_post_id,
        username: post.username || null,
        caption: post.caption || null,
        imageUrl: post.image_url || null,
        postUrl: post.post_url,
        likesCount: post.likes_count || 0,
        commentsCount: post.comments_count || 0,
        postDate: post.post_date ? new Date(post.post_date) : null,
      };

      const result = await this.db
        .insert(savedPosts)
        .values(newPost)
        .onConflictDoUpdate({
          target: savedPosts.instagramPostId,
          set: {
            username: sql`excluded.username`,
            caption: sql`excluded.caption`,
            imageUrl: sql`excluded.image_url`,
            postUrl: sql`excluded.post_url`,
            likesCount: sql`excluded.likes_count`,
            commentsCount: sql`excluded.comments_count`,
            postDate: sql`excluded.post_date`,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        })
        .returning({
          id: savedPosts.id,
          instagramPostId: savedPosts.instagramPostId,
        });

      return { id: result[0].id, instagram_post_id: result[0].instagramPostId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Failed to insert post ${post.instagram_post_id}:`,
        errorMessage
      );
      throw error;
    }
  }

  async insertBulkPosts(posts: Post[]): Promise<PostResult[]> {
    console.log(`Inserting ${posts.length} posts to database...`);

    const results: PostResult[] = [];
    for (const post of posts) {
      try {
        const result = await this.insertPost(post);
        results.push(result);
        console.log(`✓ Inserted/Updated post: ${post.instagram_post_id}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `✗ Failed to insert post ${post.instagram_post_id}:`,
          errorMessage
        );
      }
    }

    console.log(
      `Successfully processed ${results.length}/${posts.length} posts`
    );
    return results;
  }

  async getAllSavedPosts(): Promise<SavedPost[]> {
    try {
      return await this.db
        .select()
        .from(savedPosts)
        .orderBy(desc(savedPosts.savedAt));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to fetch saved posts:", errorMessage);
      throw error;
    }
  }

  async getPostsByUsername(username: string): Promise<SavedPost[]> {
    try {
      return await this.db
        .select()
        .from(savedPosts)
        .where(eq(savedPosts.username, username))
        .orderBy(desc(savedPosts.savedAt));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Failed to fetch posts by username ${username}:`,
        errorMessage
      );
      throw error;
    }
  }

  async getStats(): Promise<DatabaseStats> {
    try {
      const [totalResult, usersResult, topUsersResult] = await Promise.all([
        this.db.select({ count: count() }).from(savedPosts),
        this.db
          .select({ count: count(sql`DISTINCT ${savedPosts.username}`) })
          .from(savedPosts),
        this.db
          .select({
            username: savedPosts.username,
            post_count: count(savedPosts.id),
          })
          .from(savedPosts)
          .groupBy(savedPosts.username)
          .orderBy(desc(count(savedPosts.id)))
          .limit(10),
      ]);

      return {
        total_posts: totalResult[0].count,
        unique_users: usersResult[0].count,
        top_users: topUsersResult.map((row) => ({
          username: row.username || "",
          post_count: row.post_count.toString(),
        })),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to fetch stats:", errorMessage);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    console.log("Database connection closed");
  }
}

export default Database;
