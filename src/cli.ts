import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
dotenv.config();

import { validateEnv, type Env } from "./env";
import InstagramAuth from "./auth";
import InstagramScraper from "./scraper";

interface ScrapeOptions {
  getDetails?: boolean;
  maxScrolls?: number;
  outputFile?: string;
}

class InstagramSavedPostsCLI {
  private auth: InstagramAuth | null = null;
  private scraper: InstagramScraper | null = null;
  public env: Env;

  constructor() {
    this.env = validateEnv();
  }

  async initialize(): Promise<void> {
    console.log("🚀 Initializing Instagram Saved Posts CLI...");

    this.auth = new InstagramAuth(
      this.env.INSTAGRAM_USERNAME,
      this.env.INSTAGRAM_PASSWORD,
      this.env.HEADLESS
    );

    await this.auth.initBrowser();
    this.scraper = new InstagramScraper(this.auth.page!);

    console.log("✅ Initialization complete");
  }

  async scrapeToFile(options: ScrapeOptions = {}): Promise<void> {
    const { maxScrolls = 10, outputFile = "saved.json" } = options;

    try {
      console.log("🔐 Logging in to Instagram...");
      await this.auth!.login();

      console.log("📂 Navigating to saved posts...");
      await this.auth!.navigateToSavedPosts();

      console.log("🔍 Scraping saved posts...");
      const posts = await this.scraper!.scrapeAllSavedPosts(maxScrolls);

      if (posts.length === 0) {
        console.log("⚠️ No saved posts found");
        return;
      }

      console.log(`💾 Saving ${posts.length} posts to ${outputFile}...`);

      const outputPath = path.resolve(outputFile);
      await fs.writeFile(outputPath, JSON.stringify(posts, null, 2));

      console.log("\n✅ Scraping completed successfully!");
      console.log(`📁 Posts saved to: ${outputPath}`);
      console.log(`📊 Total posts scraped: ${posts.length}`);
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

    console.log("✅ Cleanup complete");
  }

  async run(options: ScrapeOptions = {}): Promise<void> {
    try {
      await this.initialize();
      await this.scrapeToFile(options);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("💥 CLI failed:", errorMessage);
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
  const outputArg = args.find((arg) => arg.startsWith("--output="));
  const outputFile = outputArg ? outputArg.split("=")[1] : "saved.json";

  const cli = new InstagramSavedPostsCLI();

  console.log("🎯 Configuration:");
  console.log(`   - Get post details: ${getDetails ? "Yes" : "No"}`);
  console.log(`   - Max scrolls: ${maxScrolls}`);
  console.log(`   - Output file: ${outputFile}`);
  console.log(`   - Headless mode: ${cli.env.HEADLESS}`);
  console.log("");

  await cli.run({
    getDetails,
    maxScrolls,
    outputFile,
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

export default InstagramSavedPostsCLI;
