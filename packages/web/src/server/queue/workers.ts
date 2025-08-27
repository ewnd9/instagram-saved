import { handleParseInstagramPost } from './handlers/parse-instagram-post';
import { getBoss } from './index';
import { JOB_TYPES } from './jobs';

export async function startWorkers(): Promise<void> {
  const boss = await getBoss();

  // Prevent multiple worker registrations
  if (process.env.WORKERS_STARTED === 'true') {
    console.log('Workers already started, skipping...');
    return;
  }

  process.env.WORKERS_STARTED = 'true';

  // Parse Instagram post worker
  await boss.createQueue(JOB_TYPES.PARSE_INSTAGRAM_POST);
  await boss.work(JOB_TYPES.PARSE_INSTAGRAM_POST, handleParseInstagramPost);

  console.log('Instagram post parser worker started successfully');
}

export async function stopWorkers(): Promise<void> {
  const boss = await getBoss();
  await boss.stop();
  console.log('All queue workers stopped');
}
