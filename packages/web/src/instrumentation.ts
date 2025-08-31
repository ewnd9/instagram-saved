import 'reflect-metadata';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { container } = await import('./server/di/container');
    const { WorkersService } = await import('./server/queue/workers');
    const workersService = container.resolve(WorkersService);

    try {
      await workersService.startWorkers();
      console.log('Queue workers started via instrumentation');
    } catch (error) {
      console.error('Failed to start queue workers via instrumentation:', error);
    }
  }
}
