import { chromium, Browser, Page } from "@playwright/test";

class InstagramAuth {
  private username: string;
  private password: string;
  private headless: boolean;
  public browser: Browser | null = null;
  public page: Page | null = null;

  constructor(username: string, password: string, headless: boolean = true) {
    this.username = username;
    this.password = password;
    this.headless = headless;
  }

  async initBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.headless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    this.page = await this.browser.newPage({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    });
    await this.page.setViewportSize({ width: 1920, height: 1080 });
  }

  async login(): Promise<boolean> {
    if (!this.page) {
      throw new Error("Browser not initialized. Call initBrowser() first.");
    }

    try {
      console.log("Navigating to Instagram login page...");
      await this.page.goto("https://www.instagram.com/accounts/login/", {
        waitUntil: "networkidle",
      });

      await this.page.waitForSelector('input[name="username"]', {
        timeout: 10000,
      });

      console.log("Entering credentials...");
      await this.page.fill('input[name="username"]', this.username);
      await this.page.type('input[name="username"]', this.username, {
        delay: 100,
      });
      await this.page.fill('input[name="password"]', this.password);
      await this.page.type('input[name="password"]', this.password, {
        delay: 100,
      });

      await this.page.click('button[type="submit"]');

      console.log("Waiting for login to complete...");
      await this.page.waitForURL(/^(?!.*\/accounts\/login\/).*$/, {
        timeout: 15000,
      });

      const currentUrl = this.page.url();

      if (
        currentUrl.includes("/accounts/login/") ||
        currentUrl.includes("/challenge/")
      ) {
        throw new Error(
          "Login failed - check credentials or handle 2FA manually"
        );
      }

      if (currentUrl.includes("/accounts/onetap/")) {
        await this.page.click('button[type="button"]');
        await this.page.waitForURL(/^(?!.*\/accounts\/onetap\/).*$/);
      }

      console.log("Successfully logged in to Instagram");
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Login failed:", errorMessage);
      throw error;
    }
  }

  async navigateToSavedPosts(): Promise<boolean> {
    if (!this.page) {
      throw new Error("Browser not initialized. Call initBrowser() first.");
    }

    try {
      console.log("Navigating to saved posts...");
      await this.page.goto(
        `https://www.instagram.com/${this.username}/saved/`,
        {
          waitUntil: "networkidle",
        }
      );

      await this.page.waitForSelector("article", { timeout: 10000 });
      console.log("Successfully navigated to saved posts");
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to navigate to saved posts:", errorMessage);
      throw error;
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export default InstagramAuth;
