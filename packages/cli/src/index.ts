import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

import InstagramAuth from './auth';
import { type CliEnv, validateCliEnv } from './env';
import InstagramScraper from './scraper';
import SavedDataUploader from './uploader';

interface ScrapeOptions {
  getDetails?: boolean;
  maxScrolls?: number;
  outputFile?: string;
}

interface UploadOptions {
  filePath?: string;
  webUrl?: string;
  timeout?: number;
}

class InstagramSavedPostsCLI {
  private auth: InstagramAuth | null = null;
  private scraper: InstagramScraper | null = null;
  public env: CliEnv;

  constructor() {
    this.env = validateCliEnv();
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Instagram Saved Posts CLI...');

    this.auth = new InstagramAuth(this.env.INSTAGRAM_USERNAME, this.env.INSTAGRAM_PASSWORD, this.env.HEADLESS);

    await this.auth.initBrowser();
    this.scraper = new InstagramScraper(this.auth.page!);

    console.log('✅ Initialization complete');
  }

  async scrapeToFile(options: ScrapeOptions = {}): Promise<void> {
    const { maxScrolls = 10, outputFile = 'saved.json' } = options;

    try {
      console.log('🔐 Logging in to Instagram...');
      await this.auth!.login();

      console.log('📂 Navigating to saved posts...');
      await this.auth!.navigateToSavedPosts();

      console.log('🔍 Scraping saved posts...');
      const posts = await this.scraper!.scrapeAllSavedPosts(maxScrolls);

      if (posts.length === 0) {
        console.log('⚠️ No saved posts found');
        return;
      }

      console.log(`💾 Saving ${posts.length} posts to ${outputFile}...`);

      const outputPath = path.resolve(outputFile);
      await fs.writeFile(outputPath, JSON.stringify(posts, null, 2));

      console.log('\n✅ Scraping completed successfully!');
      console.log(`📁 Posts saved to: ${outputPath}`);
      console.log(`📊 Total posts scraped: ${posts.length}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Scraping failed:', errorMessage);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up...');

    if (this.auth) {
      await this.auth.closeBrowser();
    }

    console.log('✅ Cleanup complete');
  }

  async uploadSavedData(options: UploadOptions = {}): Promise<void> {
    const { filePath = 'saved.json', webUrl = this.env.WEB_API, timeout = 30000 } = options;

    try {
      console.log('📤 Upload Mode - Sending saved data to web API');

      const uploader = new SavedDataUploader(webUrl, timeout);

      // Test connection first
      const connected = await uploader.testConnection();
      if (!connected) {
        console.warn('⚠️ Connection test failed, but proceeding anyway...');
      }

      const result = await uploader.uploadSavedData({ filePath, timeout });

      if (!result.success) {
        console.error('💥 Upload failed:', result.message);
        if (result.error) {
          console.error('Error details:', result.error);
        }
        process.exit(1);
      }

      console.log('🎉 Upload completed successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('💥 Upload failed:', errorMessage);
      process.exit(1);
    }
  }

  async run(options: ScrapeOptions = {}): Promise<void> {
    try {
      await this.initialize();
      await this.scrapeToFile(options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('💥 CLI failed:', errorMessage);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Check for upload command
  const uploadMode = args.includes('upload') || args.includes('--upload');

  if (uploadMode) {
    // Upload mode - send existing data to web API
    const fileArg = args.find((arg) => arg.startsWith('--file='));
    const filePath = fileArg ? fileArg.split('=')[1] : 'saved.json';
    const cli = new InstagramSavedPostsCLI();
    const urlArg = args.find((arg) => arg.startsWith('--url='));
    const webUrl = urlArg ? urlArg.split('=')[1] : cli.env.WEB_API;
    const timeoutArg = args.find((arg) => arg.startsWith('--timeout='));
    const timeout = timeoutArg ? parseInt(timeoutArg.split('=')[1], 10) : 30000;

    console.log('🎯 Upload Configuration:');
    console.log(`   - File: ${filePath}`);
    console.log(`   - Web URL: ${webUrl}`);
    console.log(`   - Timeout: ${timeout}ms`);
    console.log('');

    await cli.uploadSavedData({ filePath, webUrl, timeout });
  } else {
    // Scrape mode (default behavior)
    const getDetails = args.includes('--details') || args.includes('-d');
    const scrollsArg = args.find((arg) => arg.startsWith('--scrolls='));
    const maxScrolls = scrollsArg ? parseInt(scrollsArg.split('=')[1], 10) : 10;
    const outputArg = args.find((arg) => arg.startsWith('--output='));
    const outputFile = outputArg ? outputArg.split('=')[1] : 'saved.json';

    const cli = new InstagramSavedPostsCLI();

    console.log('🎯 Scrape Configuration:');
    console.log(`   - Get post details: ${getDetails ? 'Yes' : 'No'}`);
    console.log(`   - Max scrolls: ${maxScrolls}`);
    console.log(`   - Output file: ${outputFile}`);
    console.log(`   - Headless mode: ${cli.env.HEADLESS}`);
    console.log('');

    await cli.run({
      getDetails,
      maxScrolls,
      outputFile,
    });
  }
}

if (require.main === module) {
  main().catch((error) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('💥 Unhandled error:', errorMessage);
    process.exit(1);
  });
}

export default InstagramSavedPostsCLI;
