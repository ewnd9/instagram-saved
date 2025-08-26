import type { Config } from 'drizzle-kit';
import { validateEnv } from './src/env';

const env = validateEnv();

export default {
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL
  }
} satisfies Config;