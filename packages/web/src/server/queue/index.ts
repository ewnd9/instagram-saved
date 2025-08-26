import PgBoss from "pg-boss";
import { env } from "~/env";

let bossInstance: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (!bossInstance) {
    bossInstance = new PgBoss({
      connectionString: env.DATABASE_URL,
      schema: "pgboss",
    });

    bossInstance.on("error", (error) => {
      console.error("PgBoss error:", error);
    });

    await bossInstance.start();
    console.log("PgBoss started successfully");
  }

  return bossInstance;
}

export async function closeBoss(): Promise<void> {
  if (bossInstance) {
    await bossInstance.stop();
    bossInstance = null;
    console.log("PgBoss stopped");
  }
}

export { PgBoss };
export type { JobOptions, Job } from "pg-boss";