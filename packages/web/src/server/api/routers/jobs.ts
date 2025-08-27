import type PgBoss from 'pg-boss';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { conn } from '~/server/db';
import { getBoss } from '~/server/queue';

const JobStateSchema = z.enum(['created', 'retry', 'active', 'completed', 'cancelled', 'failed']);

// const JobSchema = z.object({
//   id: z.string(),
//   name: z.string(),
//   data: z.any(),
//   state: JobStateSchema,
//   retry_count: z.number().nullable(),
//   retry_limit: z.number().nullable(),
//   start_after: z.date().nullable(),
//   started_on: z.date().nullable(),
//   completed_on: z.date().nullable(),
//   created_on: z.date(),
//   updated_on: z.date(),
// });

// Type for jobs returned from raw SQL queries (based on actual pg-boss schema)
interface DbJob {
  id: string;
  name: string;
  priority: number;
  data: unknown;
  state: 'created' | 'retry' | 'active' | 'completed' | 'cancelled' | 'failed';
  retry_limit: number;
  retry_count: number;
  retry_delay: number;
  retry_backoff: boolean;
  start_after: Date;
  started_on: Date | null;
  singleton_key: string | null;
  singleton_on: Date | null;
  expire_in: string; // interval
  created_on: Date;
  completed_on: Date | null;
  keep_until: Date;
  output: unknown | null;
  dead_letter: string | null;
  policy: string | null;
}

interface ActiveDbJob {
  id: string;
  name: string;
  data: unknown;
  started_on: Date | null;
  created_on: Date;
}

export const jobsRouter = createTRPCRouter({
  // Get job statistics by state
  getStats: publicProcedure.query(async () => {
    const boss = await getBoss();
    // countStates is not in the official types, but it exists on the instance
    const stats = await (boss as any).countStates();

    const byState = Object.entries(stats)
      .filter(([key]) => !['queues', 'all'].includes(key))
      .map(([state, count]) => ({
        state,
        count: count as number,
      }));

    return {
      byState,
      total: stats.all as number,
    };
  }),

  // Get recent jobs
  getRecentJobs: publicProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        state: JobStateSchema.optional(),
      }),
    )
    .query(async ({ input }) => {
      const jobs: DbJob[] = input.state
        ? await conn`
            SELECT
              id,
              name,
              data,
              state,
              retry_count,
              retry_limit,
              start_after,
              started_on,
              completed_on,
              created_on
            FROM pgboss.job
            WHERE state = ${input.state}
            ORDER BY created_on DESC
            LIMIT ${input.limit}
          `
        : await conn`
            SELECT
              id,
              name,
              data,
              state,
              retry_count,
              retry_limit,
              start_after,
              started_on,
              completed_on,
              created_on
            FROM pgboss.job
            ORDER BY created_on DESC
            LIMIT ${input.limit}
          `;

      return jobs.map((job) => ({
        id: job.id,
        name: job.name,
        data: typeof job.data === 'string' ? JSON.parse(job.data) : job.data,
        state: job.state,
        retry_count: job.retry_count,
        retry_limit: job.retry_limit,
        start_after: job.start_after,
        started_on: job.started_on,
        completed_on: job.completed_on,
        created_on: job.created_on,
        updated_on: job.created_on, // Use created_on as fallback for updated_on
      }));
    }),

  // Get failed jobs with details
  getFailedJobs: publicProcedure.input(z.object({ limit: z.number().default(25) })).query(async ({ input }) => {
    const jobs: DbJob[] = await conn`
        SELECT
          id,
          name,
          data,
          state,
          retry_count,
          retry_limit,
          output,
          created_on,
          completed_on
        FROM pgboss.job
        WHERE state = 'failed'
        ORDER BY completed_on DESC
        LIMIT ${input.limit}
      `;

    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: typeof job.data === 'string' ? JSON.parse(job.data) : job.data,
      state: job.state,
      retry_count: job.retry_count,
      retry_limit: job.retry_limit,
      created_on: job.created_on,
      completed_on: job.completed_on,
      output: typeof job.output === 'string' ? JSON.parse(job.output) : job.output,
    }));
  }),

  // Get active/running jobs
  getActiveJobs: publicProcedure.query(async () => {
    const jobs: ActiveDbJob[] = await conn`
      SELECT
        id,
        name,
        data,
        started_on,
        created_on
      FROM pgboss.job
      WHERE state = 'active'
      ORDER BY started_on DESC
    `;

    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: typeof job.data === 'string' ? JSON.parse(job.data) : job.data,
      started_on: job.started_on,
      created_on: job.created_on,
    }));
  }),

  // Cancel a job
  cancelJob: publicProcedure.input(z.object({ id: z.string(), name: z.string() })).mutation(async ({ input }) => {
    const boss = await getBoss();
    await boss.cancel(input.name, input.id);
    return { success: true };
  }),

  // Retry a failed job
  retryJob: publicProcedure.input(z.object({ id: z.string(), name: z.string() })).mutation(async ({ input }) => {
    const boss = await getBoss();
    await boss.retry(input.name, input.id);
    return { success: true };
  }),

  // Get queue information
  getQueues: publicProcedure.query(async () => {
    const boss = await getBoss();
    const queues = await boss.getQueues();

    return queues.map((queue: PgBoss.QueueResult) => ({
      name: queue.name,
      policy: queue.policy,
      retry_limit: queue.retryLimit,
      retry_delay: queue.retryDelay,
      retry_backoff: queue.retryBackoff,
      expire_in: queue.expireInSeconds,
      retention_minutes: queue.retentionMinutes,
      created_on: queue.createdOn,
      updated_on: queue.updatedOn,
    }));
  }),
});
