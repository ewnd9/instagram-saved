import dotenv from "dotenv";
dotenv.config();

import { validateCoreEnv } from "./env";
import * as Schema from "./schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, sql, count, desc } from "drizzle-orm";

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main() {
  const env = validateCoreEnv();
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });
  const db = drizzle<typeof Schema>(pool);
  const client = await pool.connect();
  console.log(await client.query("select 1"));
  console.log(await db.execute("select 1"));
}
