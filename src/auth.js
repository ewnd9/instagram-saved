const puppeteer = require('puppeteer');

class InstagramAuth {
    constructor(username, password, headless = true) {
        this.username = username;
        this.password = password;
        this.headless = headless;
        this.browser = null;
        this.page = null;
    }

    async initBrowser() {
        this.browser = await puppeteer.launch({
            headless: this.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }

    async login() {
        try {
            console.log('Navigating to Instagram login page...');
            await this.page.goto('https://www.instagram.com/accounts/login/', {
                waitUntil: 'networkidle2'
            });

            await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });
            
            console.log('Entering credentials...');
            await this.page.type('input[name="username"]', this.username, { delay: 100 });
            await this.page.type('input[name="password"]', this.password, { delay: 100 });

            await this.page.click('button[type="submit"]');
            
            console.log('Waiting for login to complete...');
            await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

            const currentUrl = this.page.url();
            
            if (currentUrl.includes('/accounts/login/') || currentUrl.includes('/challenge/')) {
                throw new Error('Login failed - check credentials or handle 2FA manually');
            }

            if (currentUrl.includes('/accounts/onetap/')) {
                await this.page.click('button[type="button"]');
                await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
            }

            console.log('Successfully logged in to Instagram');
            return true;
        } catch (error) {
            console.error('Login failed:', error.message);
            throw error;
        }
    }

    async navigateToSavedPosts() {
        try {
            console.log('Navigating to saved posts...');
            await this.page.goto(`https://www.instagram.com/${this.username}/saved/`, {
                waitUntil: 'networkidle2'
            });

            await this.page.waitForSelector('article', { timeout: 10000 });
            console.log('Successfully navigated to saved posts');
            return true;
        } catch (error) {
            console.error('Failed to navigate to saved posts:', error.message);
            throw error;
        }
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

module.exports = InstagramAuth;