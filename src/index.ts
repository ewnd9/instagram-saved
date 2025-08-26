import dotenv from "dotenv";
dotenv.config();

import { validateEnv, type Env } from "./env";
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
  private database: Database | null = null;
  public env: Env;

  constructor() {
    this.env = validateEnv();
  }

  async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up...");

    if (this.database) {
      await this.database.close();
    }

    console.log("✅ Cleanup complete");
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const scrollsArg = args.find((arg) => arg.startsWith("--scrolls="));
  const maxScrolls = scrollsArg ? parseInt(scrollsArg.split("=")[1]) : 10;

  const scraper = new InstagramSavedPostsScraper();

  console.log("🎯 Configuration:");
  console.log(`   - Max scrolls: ${maxScrolls}`);
  console.log(
    `   - Headless mode: ${scraper.env.HEADLESS} ${process.env.HEADLESS}`
  );
  console.log("");
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
