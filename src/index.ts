import dotenv from "dotenv";
dotenv.config();

import { validateEnv, type Env } from "./env";
import InstagramAuth from "./auth";
import InstagramScraper from "./scraper";
import Database from "./database";

interface ScrapeOptions {
  getDetails?: boolean;
  maxScrolls?: number;
}

interface DatabaseStats {
  total_posts: number;
  unique_users: number;
  top_users: Array<{
    username: string;
    post_count: string;
  }>;
}

class InstagramSavedPostsScraper {
  private auth: InstagramAuth | null = null;
  private scraper: InstagramScraper | null = null;
  private database: Database | null = null;
  public env: Env;

  constructor() {
    this.env = validateEnv();
  }

  async initialize(): Promise<void> {
    console.log("🚀 Initializing Instagram Saved Posts Scraper...");

    this.database = new Database(this.env.DATABASE_URL);
    await this.database.connect();

    this.auth = new InstagramAuth(
      this.env.INSTAGRAM_USERNAME,
      this.env.INSTAGRAM_PASSWORD,
      this.env.HEADLESS
    );

    await this.auth.initBrowser();
    this.scraper = new InstagramScraper(this.auth.page!);

    console.log("✅ Initialization complete");
  }

  async scrapeAndStore(options: ScrapeOptions = {}): Promise<void> {
    const { getDetails = false, maxScrolls = 10 } = options;

    try {
      console.log("🔐 Logging in to Instagram...");
      await this.auth!.login();

      console.log("📂 Navigating to saved posts...");
      await this.auth!.navigateToSavedPosts();

      console.log("🔍 Scraping saved posts...");
      const posts = await this.scraper!.scrapeAllSavedPosts(
        getDetails,
        maxScrolls
      );

      if (posts.length === 0) {
        console.log("⚠️ No saved posts found");
        return;
      }

      console.log("💾 Storing posts to database...");
      const results = await this.database!.insertBulkPosts(posts);

      console.log("📊 Getting database stats...");
      const stats: DatabaseStats = await this.database!.getStats();

      console.log("\n✅ Scraping completed successfully!");
      console.log(`📈 Stats:`);
      console.log(`   - Posts processed this run: ${posts.length}`);
      console.log(`   - Posts stored/updated: ${results.length}`);
      console.log(`   - Total posts in database: ${stats.total_posts}`);
      console.log(`   - Unique users: ${stats.unique_users}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Scraping failed:", errorMessage);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up...");

    if (this.auth) {
      await this.auth.closeBrowser();
    }

    if (this.database) {
      await this.database.close();
    }

    console.log("✅ Cleanup complete");
  }

  async run(options: ScrapeOptions = {}): Promise<void> {
    try {
      await this.initialize();
      await this.scrapeAndStore(options);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("💥 Application failed:", errorMessage);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const getDetails = args.includes("--details") || args.includes("-d");
  const scrollsArg = args.find((arg) => arg.startsWith("--scrolls="));
  const maxScrolls = scrollsArg ? parseInt(scrollsArg.split("=")[1]) : 10;

  const scraper = new InstagramSavedPostsScraper();

  console.log("🎯 Configuration:");
  console.log(`   - Get post details: ${getDetails ? "Yes" : "No"}`);
  console.log(`   - Max scrolls: ${maxScrolls}`);
  console.log(`   - Headless mode: ${scraper.env.HEADLESS}`);
  console.log("");

  await scraper.run({
    getDetails,
    maxScrolls,
  });
}

if (require.main === module) {
  main().catch((error) => {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("💥 Unhandled error:", errorMessage);
    process.exit(1);
  });
}

export default InstagramSavedPostsScraper;
