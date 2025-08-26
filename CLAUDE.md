## Main points

- use yarn
- use typescript
- write tests
- never cast to `any` or `unknown`

## Quality Assurance

- Only run `yarn typecheck`, never `yarn build` (it's slow)

## Preferred libraries

- `axios` for web requests
- `zod` to validate data

## Conventions

- Always use `kebab-case`, even for React components

## Project Structure

This is a yarn workspace monorepo with two packages:

### `packages/cli/` - Instagram Scraper CLI

- Scrapes Instagram saved collections using Playwright
- Exports data to JSON files with schema validation
- Can upload scraped data to web API
- Usage: `yarn cli:scrape` or `yarn cli:upload`

### `packages/web/` - Next.js Web Application

- T3 stack: Next.js + tRPC + Drizzle + PostgreSQL
- Displays Instagram collections in responsive UI
- REST API endpoints for importing collection data
- Database schema for collections and posts with relations
