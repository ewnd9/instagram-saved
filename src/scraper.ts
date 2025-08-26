import { Page } from "@playwright/test";

interface PostData {
  instagram_post_id: string;
  post_url: string;
  image_url: string | null;
  username?: string | null;
  caption?: string | null;
  likes_count?: number;
  comments_count?: number;
  post_date?: string | null;
}

interface SavedCollection {
  user: string;
  name: string;
  id: string;
  url: string;
}

interface PostDetails {
  username: string | null;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  post_date: string | null;
}

class InstagramScraper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async scrollToLoadPosts(maxScrolls: number = 10): Promise<void> {
    console.log("Scrolling to load more posts...");

    for (let i = 0; i < maxScrolls; i++) {
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const newHeight = await this.page.evaluate("document.body.scrollHeight");
      console.log(`Scroll ${i + 1}/${maxScrolls} - Page height: ${newHeight}`);
    }

    await this.page.evaluate(() => {
      window.scrollTo(0, 0);
    });
  }

  async extractSavedPosts(): Promise<SavedCollection[]> {
    try {
      console.log("Extracting saved post collections...");

      const collections = await this.page.evaluate((): SavedCollection[] => {
        const collectionElements = document.querySelectorAll(
          'a[href*="/saved/"]'
        );
        const extractedCollections: SavedCollection[] = [];

        collectionElements.forEach((link) => {
          try {
            const anchorElement = link as HTMLAnchorElement;
            const collectionUrl = anchorElement.href;
            const collectionMatch = collectionUrl.match(/\/([^\/]+)\/saved\/([^\/]+)\/([^\/]+)/);
            
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
            console.error("Error extracting collection:", error);
          }
        });

        return extractedCollections;
      });

      console.log(`Extracted ${collections.length} saved post collections`);
      return collections;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to extract saved post collections:", errorMessage);
      throw error;
    }
  }

  async scrapeAllSavedPosts(maxScrolls: number = 10): Promise<SavedCollection[]> {
    try {
      await this.scrollToLoadPosts(maxScrolls);
      const collections = await this.extractSavedPosts();

      return collections;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to scrape saved post collections:", errorMessage);
      throw error;
    }
  }
}

export default InstagramScraper;
