import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Page } from '@playwright/test';

interface CollectionPost {
  id: string;
  url: string;
}

interface SavedCollection {
  user: string;
  name: string;
  id: string;
  url: string;
  posts: CollectionPost[];
}

class InstagramScraper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private async saveCollectionsToFile(collections: SavedCollection[], filename: string = 'saved.json'): Promise<void> {
    try {
      const outputPath = path.resolve(filename);
      await fs.writeFile(outputPath, JSON.stringify(collections, null, 2));
      console.log(`💾 Progress saved to ${filename} (${collections.length} collections)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to save progress to ${filename}:`, errorMessage);
    }
  }

  async scrollToLoadPosts(maxScrolls: number = 10): Promise<void> {
    console.log('Scrolling to load more posts...');

    for (let i = 0; i < maxScrolls; i++) {
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const newHeight = await this.page.evaluate('document.body.scrollHeight');
      console.log(`Scroll ${i + 1}/${maxScrolls} - Page height: ${newHeight}`);
    }

    await this.page.evaluate(() => {
      window.scrollTo(0, 0);
    });
  }

  async extractPostsFromCollection(collectionUrl: string): Promise<CollectionPost[]> {
    try {
      console.log(`Navigating to collection: ${collectionUrl}`);
      await this.page.goto(collectionUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForSelector('article', { timeout: 10000 });

      // Scroll to load posts in this collection
      await this.scrollToLoadPosts(5);

      const posts = await this.page.evaluate((): CollectionPost[] => {
        const postElements = document.querySelectorAll('article a[href*="/p/"]');
        const extractedPosts: CollectionPost[] = [];

        postElements.forEach((link) => {
          try {
            const anchorElement = link as HTMLAnchorElement;
            const postUrl = anchorElement.href;
            const postIdMatch = postUrl.match(/\/p\/([^/]+)/);
            const postId = postIdMatch?.[1];

            if (postId) {
              extractedPosts.push({
                id: postId,
                url: postUrl,
              });
            }
          } catch (error) {
            console.error('Error extracting post from collection:', error);
          }
        });

        return extractedPosts;
      });

      console.log(`Extracted ${posts.length} posts from collection`);
      return posts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to extract posts from collection ${collectionUrl}:`, errorMessage);
      return [];
    }
  }

  async extractSavedPosts(): Promise<SavedCollection[]> {
    try {
      console.log('Extracting saved post collections...');

      const collections = await this.page.evaluate((): Omit<SavedCollection, 'posts'>[] => {
        const collectionElements = document.querySelectorAll('a[href*="/saved/"]');
        const extractedCollections: Omit<SavedCollection, 'posts'>[] = [];

        collectionElements.forEach((link) => {
          try {
            const anchorElement = link as HTMLAnchorElement;
            const collectionUrl = anchorElement.href;
            const collectionMatch = collectionUrl.match(/\/([^/]+)\/saved\/([^/]+)\/([^/]+)/);

            if (collectionMatch) {
              const [, user, name, id] = collectionMatch;

              extractedCollections.push({
                user,
                name,
                id,
                url: collectionUrl,
              });
            }
          } catch (error) {
            console.error('Error extracting collection:', error);
          }
        });

        return extractedCollections;
      });

      console.log(`Found ${collections.length} saved post collections`);

      // Now crawl each collection to get its posts
      const collectionsWithPosts: SavedCollection[] = [];

      for (let i = 0; i < collections.length; i++) {
        const collection = collections[i];
        console.log(`Crawling collection ${i + 1}/${collections.length}: ${collection.name}`);

        const posts = await this.extractPostsFromCollection(collection.url);

        const collectionWithPosts = {
          ...collection,
          posts,
        };

        collectionsWithPosts.push(collectionWithPosts);

        // Save progress after each collection
        await this.saveCollectionsToFile(collectionsWithPosts);

        // Add delay between collections to be respectful
        if (i < collections.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      console.log(`Successfully crawled all ${collectionsWithPosts.length} collections`);
      return collectionsWithPosts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to extract saved post collections:', errorMessage);
      throw error;
    }
  }

  async scrapeAllSavedPosts(maxScrolls: number = 10): Promise<SavedCollection[]> {
    try {
      await this.scrollToLoadPosts(maxScrolls);
      const collections = await this.extractSavedPosts();

      return collections;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to scrape saved post collections:', errorMessage);
      throw error;
    }
  }
}

export default InstagramScraper;
