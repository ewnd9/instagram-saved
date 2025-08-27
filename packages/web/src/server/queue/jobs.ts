import type { JobOptions } from 'pg-boss';
import { getBoss } from './index';

export const JOB_TYPES = {
  PARSE_INSTAGRAM_POST: 'parse-instagram-post',
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export interface ParseInstagramPostPayload {
  url: string;
  collectionId: string;
  postId?: string;
}

export async function addJob<T extends object>(
  jobType: JobType,
  payload: T,
  options?: JobOptions,
): Promise<string | null> {
  const boss = await getBoss();
  const jobId = await boss.send(jobType, payload, {
    retryLimit: 3,
    retryDelay: 5000,
    ...options,
  });

  console.log(`Added job ${jobType} with ID: ${jobId}`);
  return jobId;
}

export async function scheduleRecurringJob(
  jobType: JobType,
  cron: string,
  payload?: object,
  options?: JobOptions,
): Promise<void> {
  const boss = await getBoss();

  await boss.schedule(jobType, cron, payload, {
    retryLimit: 2,
    ...options,
  });

  console.log(`Scheduled recurring job ${jobType} with cron: ${cron}`);
}
