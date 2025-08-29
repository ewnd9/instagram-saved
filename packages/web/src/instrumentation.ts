import 'reflect-metadata';
import { WorkersService } from '~/server/queue/workers';
import { container } from './server/di/container';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const workersService = container.resolve(WorkersService);

    try {
      await workersService.startWorkers();
      console.log('Queue workers started via instrumentation');
    } catch (error) {
      console.error('Failed to start queue workers via instrumentation:', error);
    }
  }
}
