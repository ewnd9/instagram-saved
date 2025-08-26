import { Page } from "puppeteer";

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

  async extractSavedPosts(): Promise<PostData[]> {
    try {
      console.log("Extracting saved posts data...");

      const posts = await this.page.evaluate((): PostData[] => {
        const postElements = document.querySelectorAll(
          'article a[href*="/p/"]'
        );
        const extractedPosts: PostData[] = [];

        postElements.forEach((link) => {
          try {
            const anchorElement = link as HTMLAnchorElement;
            const postUrl = anchorElement.href;
            const postIdMatch = postUrl.match(/\/p\/([^\/]+)/);
            const postId = postIdMatch?.[1];

            if (postId) {
              const imgElement = anchorElement.querySelector(
                "img"
              ) as HTMLImageElement;
              const imageUrl = imgElement ? imgElement.src : null;

              extractedPosts.push({
                instagram_post_id: postId,
                post_url: postUrl,
                image_url: imageUrl,
              });
            }
          } catch (error) {
            console.error("Error extracting post:", error);
          }
        });

        return extractedPosts;
      });

      console.log(`Extracted ${posts.length} saved posts`);
      return posts;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to extract saved posts:", errorMessage);
      throw error;
    }
  }

  async getPostDetails(postUrl: string): Promise<PostDetails> {
    try {
      console.log(`Getting details for post: ${postUrl}`);

      await this.page.goto(postUrl, { waitUntil: "networkidle2" });
      await this.page.waitForSelector("article", { timeout: 10000 });

      const postDetails = await this.page.evaluate((): PostDetails => {
        try {
          const usernameElement = document.querySelector(
            'article header a[role="link"]'
          ) as HTMLElement;
          const username = usernameElement
            ? usernameElement.textContent?.trim() || null
            : null;

          const captionElement = document.querySelector(
            'article div[data-testid="post-caption"] span, article div:has(> span) span:first-child'
          ) as HTMLElement;
          const caption = captionElement
            ? captionElement.textContent?.trim() || null
            : null;

          const likesElement = document.querySelector(
            "section button span[title]"
          ) as HTMLElement;
          const likesText = likesElement
            ? likesElement.getAttribute("title") ||
              likesElement.textContent ||
              "0"
            : "0";
          const likesCount = parseInt(likesText.replace(/[^\d]/g, "")) || 0;

          const timeElement = document.querySelector(
            "article time"
          ) as HTMLTimeElement;
          const postDate = timeElement
            ? timeElement.getAttribute("datetime")
            : null;

          const commentsElements = document.querySelectorAll(
            'article ul[role="list"] li[role="menuitem"]'
          );
          const commentsCount = commentsElements.length;

          return {
            username,
            caption,
            likes_count: likesCount,
            comments_count: commentsCount,
            post_date: postDate ? new Date(postDate).toISOString() : null,
          };
        } catch (error) {
          console.error("Error extracting post details:", error);
          return {
            username: null,
            caption: null,
            likes_count: 0,
            comments_count: 0,
            post_date: null,
          };
        }
      });

      return postDetails;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to get post details for ${postUrl}:`, errorMessage);
      return {
        username: null,
        caption: null,
        likes_count: 0,
        comments_count: 0,
        post_date: null,
      };
    }
  }

  async scrapeAllSavedPosts(
    getDetailsForEach: boolean = false,
    maxScrolls: number = 10
  ): Promise<PostData[]> {
    try {
      await this.scrollToLoadPosts(maxScrolls);
      const posts = await this.extractSavedPosts();

      if (getDetailsForEach) {
        console.log("Getting detailed information for each post...");

        for (let i = 0; i < posts.length; i++) {
          const post = posts[i];
          console.log(
            `Processing post ${i + 1}/${posts.length}: ${
              post.instagram_post_id
            }`
          );

          const details = await this.getPostDetails(post.post_url);
          Object.assign(post, details);

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return posts;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to scrape saved posts:", errorMessage);
      throw error;
    }
  }
}

export default InstagramScraper;
