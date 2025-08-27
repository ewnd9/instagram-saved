# Instagram Saved Posts Scraper

A TypeScript application that scrapes Instagram saved posts and stores them in PostgreSQL using Playwright.

## Deployment

For ready to use docker image see [`ghcr.io/ewnd9/instagram-saved/web`](https://github.com/ewnd9/instagram-saved/pkgs/container/instagram-saved%2Fweb)

## Development

### Configuration

Create a `.env` file with your database and Instagram credentials:

```env
# packages/cli/.env
INSTAGRAM_USERNAME=your_username
INSTAGRAM_PASSWORD=your_password
WEB_API=https://path-to-deployed-web-image
# packages/web/.env
DATABASE_URL=postgresql://username:password@localhost:5432/database
```

### Installation

```sh
$ yarn install
$ yarn playwright install chromium
```

### Usage

```sh
$ yarn cli:scrape # creates `saved.json` using Playwright and your username/password with all your collections metadata
$ yarn cli:upload # uploads metadata from `saved.json` to deployed WEB_API, where it's stored and processed further
```
