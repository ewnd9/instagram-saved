require('dotenv').config();
const InstagramAuth = require('./src/auth');
const InstagramScraper = require('./src/scraper');
const Database = require('./src/database');

class InstagramSavedPostsScraper {
    constructor() {
        this.auth = null;
        this.scraper = null;
        this.database = null;
    }

    async initialize() {
        console.log('🚀 Initializing Instagram Saved Posts Scraper...');
        
        this.database = new Database({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        await this.database.connect();
        await this.database.createTables();

        this.auth = new InstagramAuth(
            process.env.INSTAGRAM_USERNAME,
            process.env.INSTAGRAM_PASSWORD,
            process.env.HEADLESS === 'true'
        );

        await this.auth.initBrowser();
        this.scraper = new InstagramScraper(this.auth.page);
        
        console.log('✅ Initialization complete');
    }

    async scrapeAndStore(options = {}) {
        const {
            getDetails = false,
            maxScrolls = 10
        } = options;

        try {
            console.log('🔐 Logging in to Instagram...');
            await this.auth.login();

            console.log('📂 Navigating to saved posts...');
            await this.auth.navigateToSavedPosts();

            console.log('🔍 Scraping saved posts...');
            const posts = await this.scraper.scrapeAllSavedPosts(getDetails, maxScrolls);

            if (posts.length === 0) {
                console.log('⚠️ No saved posts found');
                return;
            }

            console.log('💾 Storing posts to database...');
            const results = await this.database.insertBulkPosts(posts);

            console.log('📊 Getting database stats...');
            const stats = await this.database.getStats();

            console.log('\n✅ Scraping completed successfully!');
            console.log(`📈 Stats:`);
            console.log(`   - Posts processed this run: ${posts.length}`);
            console.log(`   - Posts stored/updated: ${results.length}`);
            console.log(`   - Total posts in database: ${stats.total_posts}`);
            console.log(`   - Unique users: ${stats.unique_users}`);

        } catch (error) {
            console.error('❌ Scraping failed:', error.message);
            throw error;
        }
    }

    async cleanup() {
        console.log('🧹 Cleaning up...');
        
        if (this.auth) {
            await this.auth.closeBrowser();
        }
        
        if (this.database) {
            await this.database.close();
        }
        
        console.log('✅ Cleanup complete');
    }

    async run(options = {}) {
        try {
            await this.initialize();
            await this.scrapeAndStore(options);
        } catch (error) {
            console.error('💥 Application failed:', error.message);
            process.exit(1);
        } finally {
            await this.cleanup();
        }
    }
}

async function main() {
    const requiredEnvVars = [
        'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
        'INSTAGRAM_USERNAME', 'INSTAGRAM_PASSWORD'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:');
        missingVars.forEach(varName => console.error(`   - ${varName}`));
        console.error('\nPlease create a .env file based on .env.example');
        process.exit(1);
    }

    const args = process.argv.slice(2);
    const getDetails = args.includes('--details') || args.includes('-d');
    const maxScrolls = parseInt(args.find(arg => arg.startsWith('--scrolls='))?.split('=')[1]) || 10;

    console.log('🎯 Configuration:');
    console.log(`   - Get post details: ${getDetails ? 'Yes' : 'No'}`);
    console.log(`   - Max scrolls: ${maxScrolls}`);
    console.log(`   - Headless mode: ${process.env.HEADLESS}`);
    console.log('');

    const scraper = new InstagramSavedPostsScraper();
    await scraper.run({
        getDetails,
        maxScrolls
    });
}

if (require.main === module) {
    main().catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = InstagramSavedPostsScraper;