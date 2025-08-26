CREATE TABLE IF NOT EXISTS saved_posts (
    id SERIAL PRIMARY KEY,
    instagram_post_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    caption TEXT,
    image_url TEXT,
    post_url TEXT NOT NULL,
    likes_count INTEGER,
    comments_count INTEGER,
    post_date TIMESTAMP,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_username ON saved_posts(username);
CREATE INDEX IF NOT EXISTS idx_saved_posts_saved_at ON saved_posts(saved_at);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_date ON saved_posts(post_date);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_saved_posts_updated_at BEFORE UPDATE
ON saved_posts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();