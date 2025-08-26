const { Pool } = require('pg');

class Database {
    constructor(config) {
        this.pool = new Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            password: config.password
        });
    }

    async connect() {
        try {
            const client = await this.pool.connect();
            console.log('Connected to PostgreSQL database');
            client.release();
            return true;
        } catch (error) {
            console.error('Failed to connect to database:', error.message);
            throw error;
        }
    }

    async createTables() {
        const client = await this.pool.connect();
        try {
            const fs = require('fs');
            const path = require('path');
            
            const schemaPath = path.join(__dirname, '..', 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            await client.query(schema);
            console.log('Database tables created/verified successfully');
        } catch (error) {
            console.error('Failed to create tables:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    async insertPost(post) {
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
                post.username,
                post.caption,
                post.image_url,
                post.post_url,
                post.likes_count || 0,
                post.comments_count || 0,
                post.post_date ? new Date(post.post_date) : null
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error(`Failed to insert post ${post.instagram_post_id}:`, error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    async insertBulkPosts(posts) {
        console.log(`Inserting ${posts.length} posts to database...`);
        
        const results = [];
        for (const post of posts) {
            try {
                const result = await this.insertPost(post);
                results.push(result);
                console.log(`✓ Inserted/Updated post: ${post.instagram_post_id}`);
            } catch (error) {
                console.error(`✗ Failed to insert post ${post.instagram_post_id}:`, error.message);
            }
        }

        console.log(`Successfully processed ${results.length}/${posts.length} posts`);
        return results;
    }

    async getAllSavedPosts() {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT * FROM saved_posts 
                ORDER BY saved_at DESC
            `;
            const result = await client.query(query);
            return result.rows;
        } catch (error) {
            console.error('Failed to fetch saved posts:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    async getPostsByUsername(username) {
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
            console.error(`Failed to fetch posts by username ${username}:`, error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    async getStats() {
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
            console.error('Failed to fetch stats:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    async close() {
        await this.pool.end();
        console.log('Database connection closed');
    }
}

module.exports = Database;