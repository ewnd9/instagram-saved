import 'reflect-metadata';
import './server/di/container';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startWorkers } = await import('~/server/queue/workers');

    try {
      await startWorkers();
      console.log('Queue workers started via instrumentation');
    } catch (error) {
      console.error('Failed to start queue workers via instrumentation:', error);
    }
  }
}
