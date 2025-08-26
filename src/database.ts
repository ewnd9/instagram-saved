import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

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

    constructor(config: DatabaseConfig) {
        this.pool = new Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            password: config.password
        });
    }

    async connect(): Promise<boolean> {
        try {
            const client = await this.pool.connect();
            console.log('Connected to PostgreSQL database');
            client.release();
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to connect to database:', errorMessage);
            throw error;
        }
    }

    async createTables(): Promise<void> {
        const client = await this.pool.connect();
        try {
            const schemaPath = path.join(__dirname, '..', 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            await client.query(schema);
            console.log('Database tables created/verified successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to create tables:', errorMessage);
            throw error;
        } finally {
            client.release();
        }
    }

    async insertPost(post: Post): Promise<PostResult> {
        const client = await this.pool.connect();
        try {
            const query = `
                INSERT INTO saved_posts (
                    instagram_post_id, username, caption, image_url, 
                    post_url, likes_count, comments_count, post_date
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (instagram_post_id) 
                DO UPDATE SET
                    username = EXCLUDED.username,
                    caption = EXCLUDED.caption,
                    image_url = EXCLUDED.image_url,
                    post_url = EXCLUDED.post_url,
                    likes_count = EXCLUDED.likes_count,
                    comments_count = EXCLUDED.comments_count,
                    post_date = EXCLUDED.post_date,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, instagram_post_id
            `;

            const values = [
                post.instagram_post_id,
                post.username || null,
                post.caption || null,
                post.image_url || null,
                post.post_url,
                post.likes_count || 0,
                post.comments_count || 0,
                post.post_date ? new Date(post.post_date) : null
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Failed to insert post ${post.instagram_post_id}:`, errorMessage);
            throw error;
        } finally {
            client.release();
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
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`✗ Failed to insert post ${post.instagram_post_id}:`, errorMessage);
            }
        }

        console.log(`Successfully processed ${results.length}/${posts.length} posts`);
        return results;
    }

    async getAllSavedPosts(): Promise<any[]> {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT * FROM saved_posts 
                ORDER BY saved_at DESC
            `;
            const result = await client.query(query);
            return result.rows;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to fetch saved posts:', errorMessage);
            throw error;
        } finally {
            client.release();
        }
    }

    async getPostsByUsername(username: string): Promise<any[]> {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT * FROM saved_posts 
                WHERE username = $1
                ORDER BY saved_at DESC
            `;
            const result = await client.query(query, [username]);
            return result.rows;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Failed to fetch posts by username ${username}:`, errorMessage);
            throw error;
        } finally {
            client.release();
        }
    }

    async getStats(): Promise<DatabaseStats> {
        const client = await this.pool.connect();
        try {
            const queries = [
                'SELECT COUNT(*) as total_posts FROM saved_posts',
                'SELECT COUNT(DISTINCT username) as unique_users FROM saved_posts',
                'SELECT username, COUNT(*) as post_count FROM saved_posts GROUP BY username ORDER BY post_count DESC LIMIT 10'
            ];

            const [totalResult, usersResult, topUsersResult] = await Promise.all(
                queries.map(query => client.query(query))
            );

            return {
                total_posts: parseInt(totalResult.rows[0].total_posts),
                unique_users: parseInt(usersResult.rows[0].unique_users),
                top_users: topUsersResult.rows
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to fetch stats:', errorMessage);
            throw error;
        } finally {
            client.release();
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
        console.log('Database connection closed');
    }
}

export default Database;