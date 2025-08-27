import 'reflect-metadata';
import { container } from 'tsyringe';

// Import classes to ensure decorators are processed
import '~/server/features/database/database-service';
import '~/server/features/collections/collections-service';
import '~/server/features/jobs/jobs-service';
import '~/server/features/posts/posts-service';
import '~/server/features/collections/collections-router';
import '~/server/features/jobs/jobs-router';
import '~/server/features/posts/posts-router';

export { container };
