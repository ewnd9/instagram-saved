import PgBoss from "pg-boss";
import { env } from "~/env";
import { setupDatabase } from "./setup";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForPgBoss = globalThis as unknown as {
  bossInstance: PgBoss | null;
};

export async function getBoss(): Promise<PgBoss> {
  if (!globalForPgBoss.bossInstance) {
    console.log("initializing pg boss " + Date.now());

    // Setup database extensions first
    await setupDatabase();

    globalForPgBoss.bossInstance = new PgBoss({
      connectionString: env.DATABASE_URL,
      schema: "pgboss",
    });

    globalForPgBoss.bossInstance.on("error", (error) => {
      console.error("PgBoss error:", error);
    });

    await globalForPgBoss.bossInstance.start();
    console.log("PgBoss started successfully");
  }

  return globalForPgBoss.bossInstance;
}

export async function closeBoss(): Promise<void> {
  if (globalForPgBoss.bossInstance) {
    await globalForPgBoss.bossInstance.stop();
    globalForPgBoss.bossInstance = null;
    console.log("PgBoss stopped");
  }
}

export { PgBoss };
export type { JobOptions, Job } from "pg-boss";
