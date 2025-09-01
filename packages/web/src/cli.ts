import 'reflect-metadata';

import { container } from 'tsyringe';
import { createCaller } from './server/api/root';
import { createInnerTRPCContext } from './server/api/trpc';
import { DatabaseService } from './server/db/database-service';

const trpc = createCaller(createInnerTRPCContext({}));
const collections = await trpc.collections.getAllCollections();
console.log(collections);

const databaseService = container.resolve(DatabaseService);
// @TODO: debug why not working
await container.dispose();
await databaseService.db.$client.end();
