# Instagram Saved Posts Scraper

A TypeScript application that scrapes Instagram saved posts and stores them in PostgreSQL using Puppeteer.

## Getting Started

### Prerequisites
- Node.js 22 or higher
- PostgreSQL database
- Instagram account credentials

### Installation
```bash
yarn install
```

### Configuration
Create a `.env` file with your database and Instagram credentials:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/database
INSTAGRAM_USERNAME=your_username
INSTAGRAM_PASSWORD=your_password
```

### Running the Application

**Development mode (with browser visible):**
```bash
yarn dev
```

**Production mode (headless):**
```bash
yarn start
```

**Scrape saved posts:**
```bash
yarn scrape
```

**Scrape with detailed information:**
```bash
yarn scrape:details
```

### Development

**Build the project:**
```bash
yarn build
```

**Watch for changes:**
```bash
yarn watch
```
