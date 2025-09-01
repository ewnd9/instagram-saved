import { singleton } from 'tsyringe';
import { type Database, db } from '~/server/db';

@singleton()
export class DatabaseService implements Disposable {
  private readonly database: Database;

  constructor() {
    this.database = db;
  }

  async [Symbol.dispose](): Promise<void> {
    await this.database.$client.end();
  }

  get db(): Database {
    return this.database;
  }
}
