CREATE TABLE "saved_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"instagram_post_id" varchar(255) NOT NULL,
	"username" varchar(255),
	"caption" text,
	"image_url" text,
	"post_url" text NOT NULL,
	"likes_count" integer DEFAULT 0,
	"comments_count" integer DEFAULT 0,
	"post_date" timestamp,
	"saved_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "saved_posts_instagram_post_id_unique" UNIQUE("instagram_post_id")
);
--> statement-breakpoint
CREATE INDEX "idx_saved_posts_username" ON "saved_posts" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_saved_posts_saved_at" ON "saved_posts" USING btree ("saved_at");--> statement-breakpoint
CREATE INDEX "idx_saved_posts_post_date" ON "saved_posts" USING btree ("post_date");